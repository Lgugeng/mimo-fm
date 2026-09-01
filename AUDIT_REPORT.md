# 小程序代码审计报告 — MiMo FM

## 1. 审计概述
- **项目名称**: MiMo FM — AI Radio (Claude FM clone powered by MiMo APIs)
- **审计日期**: 2026-09-01
- **审计范围**: 全量代码（backend FastAPI + frontend React/Vite）
- **技术栈**: Python 3.11 / FastAPI / SQLAlchemy / SQLite · React 18 / TypeScript / Vite / Tailwind · Docker + Nginx
- **审查状态**: 增量审查 — 远程可达，SSH 认证成功，本地与 `origin/master` 完全同步（0 ahead / 0 behind）；自 2026-07-05 起无任何代码提交（最后一次代码变更 `92c4e36`，此后全部为审计报告文档提交）；17 项开放问题逐项 grep 复验（2026-09-01 重新执行）全部仍未修复；此前 5 项已验证修复保持有效
- **Git HEAD**: `1467e9a` = `origin/master`（本次实时确认；0 ahead / 0 behind）

## 2. 审计结果总览
| 风险等级 | 数量 | 占比 | 说明 |
|---------|------|------|------|
| 高危    | 6    | 35%  | 数据泄露、认证缺陷、Token 明文存储、P0 功能不可用 |
| 中危    | 5    | 29%  | 错误处理、CORS、内存存储、超时缺失 |
| 低危    | 6    | 35%  | 契约不一致、依赖锁定、Docker 非 root、工程化细节 |

> 合计 17 项（与详细清单 3.1–3.17 一致）。08-18 报告总览表 6/7/7 为计数笔误，本次已更正。

## 3. 详细问题清单

### 3.1 [高危] PlaylistPage 创建 Radio 时未传递 Token — 必然 401
- **文件位置**: `frontend/src/pages/PlaylistPage.tsx:41`
- **问题描述**: `apiFetch('/radio/create', undefined, {...})` 第二个参数（token）为 `undefined`。后端 `/api/radio/create` 要求 `Authorization: Bearer ***` Header（`Header(...)` 必填）。页面第 18 行已读取 `spotifyToken` 但从未使用。注释声称"access_token removed - now passed via Authorization Header"，但实现缺失。
- **风险等级**: 高（P0 — 功能不可用）
- **整改建议**: 将 `spotifyToken` 作为 token 参数传入
- **修改示例**:
```typescript
// frontend/src/pages/PlaylistPage.tsx:41
const episode: RadioEpisode = await apiFetch('/radio/create', spotifyToken, {
  method: 'POST',
  body: JSON.stringify({ playlist_id: selectedPlaylist, ... }),
});
```

### 3.2 [高危] Spotify access_token 通过 URL query 参数传递
- **文件位置**: `frontend/src/api/spotify.ts:9,13` · `backend/api/spotify.py:35,44`
- **问题描述**: `/spotify/playlists?access_token=...` 和 `/playlist/{id}/tracks?access_token=...` 将 OAuth token 暴露于 URL。Token 会被记录在 Nginx 访问日志、浏览器历史、CDN 日志中。
- **风险等级**: 高（P0 — Token 泄露）
- **整改建议**: 改为 Authorization Header 传递，与 `/radio/create` 保持一致
- **修改示例**:
```python
# backend/api/spotify.py
@router.get("/playlists")
async def get_playlists(authorization: str = Header(...)) -> list[dict]:
    token = authorization.replace("Bearer ", "", 1)
    return spotify_service.get_user_playlists(token)
```

### 3.3 [高危] encrypt_token()/decrypt_token() 已定义但未调用 — Token 仍明文存储
- **文件位置**: `backend/models/db_models.py:30-41`（定义处）
- **问题描述**: Fernet 加密工具函数已实现，但 `User` 表的 `access_token` / `refresh_token` 写入/读取路径中从未调用。`grep -rn "encrypt_token\|decrypt_token" backend/` 仅返回定义行，无调用点。如果未来实现用户持久化，Token 将以明文写入数据库。
- **风险等级**: 高（P1 — 数据泄露）
- **整改建议**: 在所有写入 User.access_token/refresh_token 的位置调用 encrypt_token()，读取时调用 decrypt_token()
- **验证命令**: `grep -rn "encrypt_token\|decrypt_token" backend/ | grep -v "def encrypt\|def decrypt"`

### 3.4 [高危] WebSocket 连接 Token 通过 URL query 参数传递
- **文件位置**: `backend/api/radio.py:97`
- **问题描述**: `stream_episode(ws: WebSocket, episode_id: str, token: str = Query(...))` 将认证 Token 作为 URL query 参数。与 3.2 相同的日志泄露风险。
- **风险等级**: 高（P1）
- **整改建议**: WebSocket 握手时通过子协议或首条消息传递 Token，而非 URL 参数

### 3.5 [高危] Spotify Token 明文存储在 localStorage
- **文件位置**: `frontend/src/pages/CallbackPage.tsx:25-28`
- **问题描述**: `localStorage.setItem('spotify_access_token', ...)` 和 `localStorage.setItem('spotify_refresh_token', ...)` 将 OAuth token 以明文存储在浏览器。localStorage 不受 HTTPOnly 保护，可被 XSS 攻击读取。
- **风险等级**: 高（P1）
- **整改建议**: 使用 HTTPOnly Cookie 存储 Token，或至少使用 sessionStorage（页面关闭后过期）缩短暴露窗口

### 3.6 [高危] RadioPage 硬编码 Mock 数据，未调用真实 API
- **文件位置**: `frontend/src/pages/RadioPage.tsx:14-28,55`
- **问题描述**: `mockEpisode` 字段结构（`tracks[]`、`dj_narration[]`）与后端 `RadioEpisode`（`segments[]`）不一致。`episode.tracks` 类型是 `RadioTrack[]`（已废弃），而非 `RadioSegment[]`。始终使用 mock 而非 API 调用，导致演示不可信且掩盖 API 问题。
- **风险等级**: 高（P2 — 功能不完整）
- **整改建议**: 使用 `useQuery` 从 `/api/radio/{id}` 获取真实数据，移除 mockEpisode

### 3.7 [中危] 通用 502 错误处理掩盖真实问题
- **文件位置**: `backend/api/chat.py:27` · `backend/api/radio.py:55` · `backend/api/spotify.py:40,49` · `backend/api/tts.py:33,48,66,84`
- **问题描述**: 8 处 endpoint 将 `Exception` 统一转为 HTTP 502（含 `detail=str(exc)` 直接回显异常信息，可能泄露内部细节）。无法区分认证失败（401）、权限拒绝（403）、上游超时（504）、参数错误（400）等。运维排查困难。
- **风险等级**: 中
- **整改建议**: 分类捕获异常，返回正确 HTTP 状态码：
```python
# 示例
except httpx.TimeoutException:
    raise HTTPException(status_code=504, detail="Upstream service timeout")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 401:
        raise HTTPException(status_code=401, detail="Authentication failed")
    elif e.response.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limited")
    raise HTTPException(status_code=502, detail="Upstream error")
```

### 3.8 [中危] CORS 配置偏向开发环境
- **文件位置**: `backend/main.py:27-33`
- **问题描述**: `allow_origins` 仅包含 `localhost:3000` 和 `localhost:5173`，`allow_credentials=True`。生产部署时无有效 origin 列表导致前端被拒绝。注释说明"allow all origins for dev; tighten in production"但从未收紧。
- **风险等级**: 中
- **整改建议**: 根据环境动态配置 CORS：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.9 [中危] 内存字典存储 Episode，重启后数据丢失
- **文件位置**: `backend/api/radio.py:22`
- **问题描述**: `_episodes: Dict[str, RedisEpisode] = {}` 使用内存字典标注"replace with DB in production"但未实施。Episode 持久化到 DB（`Episode` 模型已存在）后此问题自然解决。
- **风险等级**: 中
- **整改建议**: 将 `_episodes` 替换为 SQLAlchemy 查询，使用 `Episode` 模型持久化

### 3.10 [中危] WebSocket user ownership 检查仍为 TODO
- **文件位置**: `backend/api/radio.py:110-114`
- **问题描述**: 用户所有权验证代码被注释掉，仅检查 token 长度（>= 10）。任意持有 10+ 字符的 token 即可访问任意 episode 的流媒体。
- **风险等级**: 中
- **整改建议**: 实现 episode 与 user 的关联验证

### 3.11 [中危] TTS 服务未配置 Timeout
- **文件位置**: `backend/services/mimo_tts.py:31-34`
- **问题描述**: `AsyncOpenAI` 客户端未设置 timeout，对比 `mimo_llm.py:23` 已正确配置 `httpx.Timeout(connect=5.0, read=60.0, write=60.0, pool=10.0)`。TTS 请求可能长期挂起。
- **风险等级**: 中
- **整改建议**: 与 LLM 服务保持一致，添加 `timeout=httpx.Timeout(...)` 参数

### 3.12 [低危] 前后端 API 契约部分不一致
- **文件位置**: `frontend/src/api/radio.ts` vs `backend/api/radio.py`
- **问题描述**: 前端 `createRadio()` 调用 `apiFetch('/radio/create', {...})` 不传 token 参数，而后端期望 Bearer Header。前端 `getEpisodes()` 请求 `/radio/episodes` 但后端无此 endpoint。
- **风险等级**: 低（P2）
- **整改建议**: 使用 openapi-typescript 从后端自动生��前端类型和 API 客户端

### 3.13 [低危] Voice clone 前端/后端接口不匹配
- **文件位置**: `frontend/src/api/tts.ts:11-17` vs `backend/api/tts.py:52-66`
- **问题描述**: 前端 `cloneVoice()` 使用 FormData 上传文件，后端期望 JSON body（`VoiceCloneRequest` 含 `reference_audio_base64: str`）。调用不会成功。
- **风险等级**: 低
- **整改建议**: 统一接口格式（推荐前端发送 base64 JSON body 与后端一致）

### 3.14 [低危] requirements.txt 依赖版本未完全锁定
- **文件位置**: `backend/requirements.txt`
- **问题描述**: 使用 `>=` 宽松版本（如 `fastapi>=0.110.0`），生产构建可能引入不兼容的新版本。
- **风险等级**: 低
- **整改建议**: 使用 `pip-compile` 生成锁文件（`requirements.lock`）或在 Dockerfile 中使用确定性版本

### 3.15 [低危] Docker 容器以 root 运行
- **文件位置**: `Dockerfile.backend`、`Dockerfile.frontend`
- **问题描述**: 两个 Dockerfile 均未创建非 root 用户。容器进程以 root 运行，违反最小权限原则。
- **风险等级**: 低
- **整改建议**:
```dockerfile
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
```

### 3.16 [低危] `.env.example` 默认 `DEBUG=true`（新增）
- **文件位置**: `.env.example:20`
- **问题描述**: 示例配置默认 `DEBUG=true`。若生产环境直接复制该文件且未修改，FastAPI 将在异常时返回详细堆栈/调试信息，泄露内部路径与逻辑。`config.py` 中 `DEBUG: bool = False` 的默认值是正确的，但示例文件的引导方向相反。
- **风险等级**: 低
- **整改建议**: `.env.example` 改为 `DEBUG=false`，并注明"生产环境必须为 false"
- **验证命令**: `grep -n "DEBUG" .env.example backend/config.py`

### 3.17 [低危] nginx 无上传大小限制与限流（新增）
- **文件位置**: `nginx.conf`
- **问题描述**: `/api/` 反向代理未配置 `client_max_body_size`（`/tts/clone` 等上传接口可接收任意大小请求体，可被用于磁盘/内存耗尽攻击），且无 `limit_req`/`limit_conn` 限流。结合后端无限流中间件，整条链路对 API 滥用无防护。
- **风险等级**: 低（与"无速率限制"中危项叠加后风险上升）
- **整改建议**:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    client_max_body_size 20m;   # 声音克隆上传上限
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend:8000;
    }
}
```

## 4. 已验证修复（与上次审计对比）

上次审计（2026-08-22）发现的问题，2026-08-23 复验状态（代码自 07-05 起无变更，结论与 08-22 一致；本次远程可达，基于实时同步的本地副本复验）：

| # | 问题 | 状态 | 验证方法 |
|---|------|------|----------|
| 1 | CORS 仅 localhost | ⚠️ 仍为开发配置 | `main.py:29` |
| 2 | 502 统一错误处理 | ⚠️ 部分修复（radio.py 改为 500），chat/tts/spotify 仍为 502 | grep 8处 502 |
| 3 | `encrypt_token` 未调用 | ❌ 仍未调用 | grep 仅定义行，零调用点 |
| 4 | `create_episode` token 传递方式 | ✅ 已改为 Header | `radio.py:38` Bearer |
| 5 | `RadioCreateBody` 移除 access_token | ✅ 已移除 | `models/schemas.py:78` |
| 6 | `apiFetch` 支持 Bearer Header | ✅ 已支持 | `client.ts:3-9` |
| 7 | WS ownership TODO | ❌ 仍注释 | `radio.py:111-115` |
| 8 | DB 连接池配置 | ✅ 已配置 | `database.py:11-14`（pool_size=10, max_overflow=20, pre_ping, recycle） |
| 9 | OpenAI timeout | ⚠️ LLM 已配，TTS 仍缺 | `mimo_llm.py:23` vs `mimo_tts.py` 无 timeout |
| 10 | SPOTIFY env 可选 | ⚠️ 空字符串默认值无校验 | `config.py`（功能可接受，但建议标注"未配置时相关接口不可用"） |

## 5. 整改优先级建议

**立即修复（P0）**:
1. PlaylistPage token 传递 — 功能不可用
2. Spotify API Token 从 query 改 Header — 安全漏洞

**短期修复（1-2 周内）**:
3. encrypt_token 实际调用 — 数据合规
4. Mock data 替换为真实 API — 功能完整性
5. 502 错误分类 — 运维可观测性
6. CORS 生产配置 — 部署就绪

**长期优化**:
7. Episode 持久化到 DB
8. WS ownership 验证
9. TTS timeout 配置
10. 依赖锁定 + Docker 非 root
11. `.env.example` DEBUG 默认值改为 false
12. nginx 增加 `client_max_body_size` 与 `limit_req` 限流

## 6. 本次审查状态（2026-09-01）

- **状态**: SUCCESS（远程可达，本地与 origin/master 实时同步，17 项问题复验完成，报告已更新并推送）
- **SSH 22**: `ssh -i ~/.ssh/id_ed25519 -T git@github.com` 认证成功（"Hi Lgugeng!"）；exit 1 为 GitHub 无 shell 的正常行为，以输出文本判断
- **同步状态**: `git status --short` 干净 + `git log HEAD..origin/master` 为空，HEAD `1467e9a` = `origin/master`（0 ahead / 0 behind）
- **审计基线**: `92c4e36`（2026-07-05，最后一次代码提交）— 本次 `git log 92c4e36..HEAD` 仅审计报告文档提交，`git diff --stat 92c4e36..HEAD -- backend/ frontend/ nginx.conf Dockerfile* docker-compose.yml` 为空，**无未审查代码变更**
- **代码变更**: 自 2026-07-05（`92c4e36`）起无任何代码变更，08-14 以后提交均为审计报告文档
- **复验结论**: 17 项开放问题（6 高危 / 5 中危 / 6 低危）全部复验仍未修复，逐项验证（2026-09-01 重新执行）：
  - 3.1 `PlaylistPage.tsx:41` 仍传 `undefined` token（第 18 行已读 spotifyToken 但从未使用） · 3.2 `spotify.ts:9,13` + `spotify.py:35,44` 仍 query 传参 · 3.3 `encrypt_token` 调用点 = 0 · 3.4 `radio.py:97` 仍 `token=Query(...)` · 3.5 `CallbackPage.tsx:25,28` 仍 localStorage 明文 · 3.6 `RadioPage.tsx:14,55` 仍 mockEpisode
  - 3.7 502 统一处理仍 9 处 · 3.8 CORS 仍仅 localhost + credentials · 3.9 `_episodes` 内存字典（`radio.py:22`）· 3.10 WS ownership 仍 TODO 注释（`radio.py:110`） · 3.11 `mimo_tts.py` timeout 匹配数 = 0（LLM 已配）
  - 3.12 `radio.ts:4,16` createRadio 不传 token、请求不存在的 `/radio/episodes` · 3.13 `tts.ts:12` 仍 FormData · 3.14 requirements 仍 12 处 `>=` · 3.15 Dockerfile 无 USER（0/0） · 3.16 `.env.example:18` 仍 `DEBUG=true` · 3.17 nginx 无 `client_max_body_size`/`limit_req`
- **已验证修复保持有效**: Bearer Header（radio.py:38）、schema 清理（schemas.py:81）、apiFetch Header 支持（client.ts:3-9）、DB 连接池（database.py:11-14）、LLM timeout（mimo_llm.py:23）
- **连续无变更**: 自 08-14 起连续 19 天（08-14 至 09-01）的增量审查均确认无代码提交，最后一次代码提交仍为 07-05 的 `92c4e36`；项目已停滞 58 天，建议重点推动 P0 两项（PlaylistPage token 传递、Spotify token query 改 Header）
