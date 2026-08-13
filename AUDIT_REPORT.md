# MiMo FM 代码审计报告 — 2026-08-13 增量审查

## 1. 审计概述
- **项目名称**: MiMo FM — AI Radio (Spotify + MiMo LLM/TTS)
- **审计日期**: 2026-08-13
- **审计范围**: 全维度代码审计（后端 FastAPI + 前端 React/TS + 配置）
- **技术栈**: Python 3.11/FastAPI/SQLAlchemy + React 18/TypeScript/Vite/Tailwind + Docker/Nginx + MiMo AI API + Spotify API
- **提交 HEAD**: `66cc33d` — `docs: update audit report — 2026-08-12 incremental review`
- **审查状态**: 与远程同步（无新提交），基于本地副本审计

## 2. 审计结果总览
| 风险等级 | 数量 | 占比 |
|---------|------|------|
| 高危    | 3    | 17%  |
| 中危    | 7    | 39%  |
| 低危    | 8    | 44%  |

## 3. 已验证修复（来自上轮审计）

| # | 问题 | 状态 |
|---|------|------|
| 1 | 环境变量强制校验（`Field(..., min_length=1)`） | ✅ 已修复 (`config.py:13,19,20`) |
| 2 | 数据库连接池配置 | ✅ 已修复 (`database.py:11-14`) |
| 3 | LLM client timeout | ✅ 已修复 (`mimo_llm.py:23`) |
| 4 | CORS 限制 localhost | ✅ 已修复 (`main.py:29`) |
| 5 | `DEBUG` 默认 `False` | ✅ 已修复 (`config.py:22`) |
| 6 | `RadioCreateBody` 移除 `access_token` | ✅ 已修复 (`schemas.py:78-83`) |
| 7 | `apiFetch` 支持 Bearer Header | ✅ 已修复 (`client.ts:6`) |
| 8 | `radio.py` 分类错误处理 | ✅ 已修复（401/403/500 区分） |
| 9 | `encrypt_token`/`decrypt_token` 函数定义 | ✅ 已定义 (`db_models.py:30-41`) |
| 10 | `verify_user_token` 函数存在 | ✅ 已定义（但仍是 stub） |

## 4. 详细问题清单

### 4.1 [高危] `createRadio` 调用未传 token — 功能完全不可用
- **文件位置**: `frontend/src/pages/PlaylistPage.tsx:41`、`frontend/src/api/radio.ts:4-9`
- **问题描述**: `apiFetch('/radio/create', undefined, {...})` 第二个参数为 `undefined`，后端要求 `Authorization: Bearer ...` Header，必然返回 401。上轮审计报告后仍未修复。
- **风险等级**: 高
- **影响**: 创建 radio episode 功能完全不可用
- **整改建议**:

```tsx
// frontend/src/pages/PlaylistPage.tsx:41
const spotifyToken = localStorage.getItem('spotify_access_token') || '';
// ...
const episode = await apiFetch('/radio/create', spotifyToken, {
  method: 'POST',
  body: JSON.stringify({...}),
});
```

```ts
// frontend/src/api/radio.ts:4-9
export async function createRadio(request: RadioCreateRequest, token: string): Promise<RadioEpisode> {
  return apiFetch('/radio/create', token, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
```

### 4.2 [高危] Spotify Token 通过 URL 参数传递 — 日志泄露风险
- **文件位置**: `frontend/src/api/spotify.ts:9-13`、`backend/api/spotify.py:35,44`
- **问题描述**: 前后端 `/spotify/playlists` 和 `/playlist/{id}/tracks` 均使用 `?access_token=...` query 参数。Token 会出现在 Nginx 访问日志、浏览器历史、服务端代理日志中。
- **风险等级**: 高
- **整改建议**: 后端改为 `Header` 接收，前端通过 `apiFetch` 的 token 参数传递：

```python
# backend/api/spotify.py
@router.get("/playlists")
async def get_playlists(authorization: str = Header(...)) -> list[dict]:
    token = authorization.replace("Bearer ", "", 1)
    return spotify_service.get_user_playlists(token)
```

```ts
// frontend/src/api/spotify.ts
export async function getPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  return apiFetch('/spotify/playlists', accessToken);
}
```

### 4.3 [高危] `encrypt_token()` / `decrypt_token()` 已定义但未调用 — Token 仍明文存储
- **文件位置**: `backend/models/db_models.py:30-41`
- **问题描述**: Fernet 加密函数已定义且可用，但 `User` 表的 `access_token` / `refresh_token` 写入/读取路径中从未调用。Token 仍然明文存储。
- **验证命令**: `grep -rn "encrypt_token\|decrypt_token" backend/ --include="*.py"` 仅返回定义行，无调用。
- **风险等级**: 高
- **整改建议**: 在 User 模型层使用 SQLAlchemy `TypeDecorator` 实现透明加解密，或在 CRUD 层显式调用。

### 4.4 [中危] `verify_user_token()` 是 Stub — 无实际身份验证
- **文件位置**: `backend/api/radio.py:25-32`
- **问题描述**: 函数仅检查 token 长度 `>=10`，返回 `None`，没有真正校验 Spotify 身份。任何 >=10 字符的字符串都被接受。
- **风险等级**: 中
- **整改建议**: 对接 Spotify `https://api.spotify.com/v1/me` 验证 token 有效性，或使用 JWT 签名验证。

### 4.5 [中危] WebSocket 用户所有权检查未完成
- **文件位置**: `backend/api/radio.py:110-114`
- **问题描述**: TODO 注释中的所有权验证代码仍然被注释掉。知道 `episode_id` + 任意 10+ 字符 token 即可流式播放他人的 episode。
- **风险等级**: 中
- **整改建议**: 实现 episode-user 关联后，取消注释并实现真正的 ownership 检查。

### 4.6 [中危] `_episodes` 内存字典未持久化
- **文件位置**: `backend/api/radio.py:22`
- **问题描述**: `Dict[str, RadioEpisode] = {}` 在服务重启后丢失所有 episode 数据。标注"replace with DB in production"但未实施。
- **风险等级**: 中
- **整改建议**: 将 episode 数据持久化到 Episode 表（已定义 ORM 模型但未使用）。

### 4.7 [中危] RadioPage 使用硬编码 Mock Data
- **文件位置**: `frontend/src/pages/RadioPage.tsx:14-28`
- **问题描述**: `mockEpisode` 字段结构（`tracks[]`、`dj_narration[]`）与后端 `RadioEpisode`（`segments[]`）不一致，且始终使用 mock 而非 API 调用。
- **风险等级**: 中
- **整改建议**: 使用 `useQuery` 从 `/api/radio/{id}` 获取真实数据，移除 mockEpisode。

### 4.8 [中危] Voice Clone 前后端 API 不匹配
- **文件位置**: `frontend/src/api/tts.ts:11-17` vs `backend/api/tts.py:52-66`
- **问题描述**: 前端使用 `FormData` (multipart/form-data) 上传音频文件，但后端期望 JSON body 中的 `reference_audio_base64` 字段。Content-Type 不匹配。
- **风险等级**: 中
- **整改建议**: 统一接口契约 — 前端先转 base64 再发 JSON，或后端接受文件上传。

### 4.9 [中危] `tts_service` 缺少 timeout 配置
- **文件位置**: `backend/services/mimo_tts.py:30-34`
- **问题描述**: `llm_service` 已配置 timeout (`mimo_llm.py:23`)，但 `tts_service` 的 `AsyncOpenAI` 实例未设置 timeout，可能导致长时间挂起。
- **风险等级**: 中
- **整改建议**:

```python
# backend/services/mimo_tts.py
from config import settings
import httpx

class MiMoTTSService:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.MIMO_API_KEY,
            base_url=settings.MIMO_BASE_URL,
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=60.0, pool=10.0),  # TTS 读超时更长
        )
```

### 5. 低危问题

#### 5.1 Chat/TTS 端点统一返回 502
- `backend/api/chat.py:27` — `HTTPException(status_code=502, detail=str(exc))`
- `backend/api/tts.py:33,48,66,84` — 全部返回 502
- **建议**: 区分 429（限流）、503（服务不可用）、500（内部错误），且不要在 detail 中暴露内部异常信息（`str(exc)` 可能泄露细节）。

#### 5.2 Chat 端点无输入校验/注入防护
- `backend/api/chat.py` — `ChatRequest` 允许任意 content，存在 prompt injection 风险。
- **建议**: 限制 messages 长度和数量，过滤可疑系统提示注入。

#### 5.3 Nginx 缺少 HTTPS 配置
- `nginx.conf` 仅监听 80 端口，无 SSL/TLS。
- **建议**: 生产环境添加 SSL 或在前端放置反向代理/Terminator 处理 HTTPS。

#### 5.4 Dockerfile 未使用非 root 用户
- `Dockerfile.backend:1` — `FROM python:3.11-slim` 以 root 运行
- **建议**: 添加 `RUN useradd -m appuser && USER appuser`

#### 5.5 Vite WebSocket 代理路径不匹配
- `vite.config.ts:18-21` 配置 `/ws` 代理，但实际 WebSocket 路径为 `/api/radio/{id}/stream`，已包含在 `/api` 代理中。`/ws` 代理是冗余的。

#### 5.6 Spotify OAuth callback 返回 token 给前端
- `backend/api/spotify.py:24-29` — callback 直接返回 `access_token` 和 `refresh_token` 到前端
- **建议**: refresh_token 不应返回给前端，应在服务端安全存储并使用。

#### 5.7 `settings.DEBUG` 与 `.env.example` 不一致
- `.env.example:18` 写 `DEBUG=true`，但 `config.py:22` 默认 `False`。如果用户复制 .env.example 到 .env，DEBUG 会覆盖为 true。
- **建议**: `.env.example` 改为 `DEBUG=false` 并添加注释说明。

#### 5.8 `SPOTIFY_REDIRECT_URI` 硬编码 localhost
- `backend/config.py:17` — `http://localhost:8000/api/spotify/callback`
- **建议**: 生产环境通过环境变量覆盖。

## 6. 整体评估

### 上轮修复进展
上轮审计的 10 项修复均已落地，代码质量有明显提升。环境校验、连接池、timeout、CORS 配置等基础设施层面已到位。

### 当前核心风险
1. **功能阻断** (`4.1`): `createRadio` 不传 token 导致核心流程完全不通，这是 P0 级功能缺陷
2. **Token 泄露** (`4.2`): Spotify token 通过 URL 传递，日志泄露风险未解决
3. **数据库明文** (`4.3`): 加密函数已就绪但未接入调用链路，属于"半成品修复"

### 推荐优先级
| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | `createRadio` 未传 token (4.1) | 核心功能不可用 |
| P0 | Spotify token URL 泄露 (4.2) | 安全合规风险 |
| P1 | `encrypt_token` 未调用 (4.3) | 数据库明文 |
| P1 | `verify_user_token` 是 stub (4.4) | 无实际认证 |
| P2 | WebSocket 所有权 (4.5) | 越权访问 |
| P2 | Mock data (4.7) | 演示不可信 |
| P2 | TTS timeout 缺失 (4.9) | 服务稳定性 |
| P3 | 其余低危项 | 工程化完善 |

## 7. 后续开发规范建议
1. **API 契约同步流程**: 后端 schema 变更后，grep 所有前端调用点并更新。建议使用 openapi-typescript 自动生成前端类型。
2. **Token 传递规范**: 统一使用 `Authorization: Bearer` Header，禁止 URL query/body 传递。
3. **加密闭环验证**: 定义加密函数后，必须编写测试用例验证 encrypt→decrypt 往返正确，并在 CRUD 层确认调用。
4. **Mock 数据隔离**: 使用条件编译或环境变量区分 mock/production 模式，禁止硬编码 mock 保留在生产代码中。
5. **错误处理分层**: 区分 HTTP 语义状态码（400/401/403/404/429/500/503），避免统一 502。
