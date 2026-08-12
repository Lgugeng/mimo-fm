# MiMo FM 代码审计报告

**审计日期:** Wednesday, August 12, 2026
**仓库:** https://github.com/Lgugeng/mimo-fm
**审查状态:** 增量审查 — 无新提交（与远程同步）
**技术栈:** Backend (FastAPI/Python 3.11), Frontend (React/TypeScript/Vite)
**提交 HEAD:** `92c4e36` — `fix: sync frontend token handling + clean up unused imports`

---

## 1. 审计结果总览

| 风险等级 | 数量 | 变化       |
|---------|------|------------|
| 高危    | 3    | ⬆️ +1      |
| 中危    | 5    | ⬆️ +2      |
| 低危    | 4    | ⬆️ +2      |

---

## 2. 本次审查状态

**本地提交数:** 0（与远程同步，无新变更）

**上次修复验证通过：**
- ✅ Token 加密函数已实现 (`db_models.py` Fernet)
- ✅ 环境变量强制校验 (`config.py` `Field(..., min_length=1)`)
- ✅ WebSocket 基础 token 认证 (`radio.py:100-102`)
- ✅ Bearer token 通过 Authorization Header 传递 (create_episode)
- ✅ API timeout 配置 (`mimo_llm.py:23`)
- ✅ 数据库连接池参数配置 (`database.py:8-14`)
- ✅ 前端 `RadioCreateRequest` 删除了 `access_token` 字段
- ✅ `PlaylistPage.tsx` 改用 `apiFetch` 而非旧式调用

**本次新发现:** 上轮修复后出现了新的 API 契约不一致问题 — 前端 `PlaylistPage.tsx` 调用 `createRadio` 时 token 参数传了 `undefined`，后端要求 `Authorization: Header(...)`，导致实际调用必然返回 401。

---

## 3. 详细问题清单

### 3.1 [高危] createRadio 调用未传递 Token — API 契约不一致

**文件位置:** `frontend/src/pages/PlaylistPage.tsx:41`

```typescript
// 当前代码 — token 参数传了 undefined
const episode = await apiFetch('/radio/create', undefined, {
    method: 'POST',
    body: JSON.stringify({ playlist_id: selectedPlaylist, ... }),
});
```

**问题:** 后端 `radio.py:38` 要求 `authorization: str = Header(...)`（必填），前端传 `undefined` 导致不发送 Authorization Header，请求必然 401 失败。

**整改:**

```typescript
const spotifyToken = localStorage.getItem('spotify_access_token') || '';
const episode = await apiFetch('/radio/create', spotifyToken, {
    method: 'POST',
    body: JSON.stringify({ playlist_id: selectedPlaylist, ... }),
});
```

### 3.2 [高危] Spotify OAuth Token 明文存储在 localStorage

**文件位置:** `frontend/src/pages/CallbackPage.tsx:24-29`

```typescript
localStorage.setItem('spotify_access_token', data.access_token);
localStorage.setItem('spotify_refresh_token', data.refresh_token);
```

**问题:** localStorage 中的 token 可被 XSS 直接读取。虽然已实现 `encrypt_token()/decrypt_token()` 在后端，但前端存储层面没有加密保护。refresh_token 尤其敏感 — 可长期替代 access_token。

**整改:**
- 短期: 使用 httpOnly cookie 而非 localStorage（需要后端配合设置 Set-Cookie）
- 中期: 实现前端 token 加密存储（如使用 SubtleCrypto API）
- 必须: 确保 `expires_in` 被跟踪，过期后刷新 token 而非长期持有

### 3.3 [高危] Spotify Token 通过 URL 参数传递（日志泄露风险）

**文件位置:**
- `frontend/src/api/spotify.ts:9` — `?access_token=${encodeURIComponent(accessToken)}`
- `frontend/src/api/spotify.ts:13` — 同上
- `backend/api/spotify.py:35` — `access_token: str = Query(...)`
- `backend/api/spotify.py:44` — `access_token: str = Query(...)`

**问题:** Token 出现在 URL 中会被记录在：Nginx access log、浏览器历史、代理服务器日志。这与上轮修复 radio 端口的方向相反。

**整改 (前端):**
```typescript
export async function getPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  return apiFetch('/spotify/playlists', accessToken); // token → Authorization Header
}
```

**整改 (后端):**
```python
@router.get("/playlists")
async def get_playlists(authorization: str = Header(...)) -> list[dict]:
    token = authorization.replace("Bearer ", "", 1)
    return spotify_service.get_user_playlists(token)
```

### 3.4 [中危] CORS 配置仍偏向开发环境

**文件位置:** `backend/main.py:27-33`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**问题:** `allow_credentials=True` + 宽松 origin 组合 = CSRF 风险。生产环境只有 localhost 不满足实际部署需求。

**整改:**
```python
is_prod = settings.DEBUG is False
origins = [os.getenv("FRONTEND_URL", "")] if is_prod else ["http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not is_prod,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.5 [中危] Chat / TTS API 无身份认证

**文件位置:**
- `backend/api/chat.py:15-47` — 无认证
- `backend/api/tts.py:18-84` — 无认证

**问题:** 任何人都可以调用 Chat API 消耗 LLM 配额，或调用 TTS 生成语音。没有 API Key 校验、无用户身份绑定、无速率限制。

**整改:** 添加统一认证依赖：
```python
from fastapi import Depends, Header, HTTPException

async def get_api_key(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing API key")
    token = authorization[7:]
    # validate token...
    return token

@router.post("/sync", response_model=ChatResponse)
async def chat_sync(req: ChatRequest, _: str = Depends(get_api_key)):
    ...
```

### 3.6 [中危] WebSocket 用户所有权验证 TODO 未完成

**文件位置:** `backend/api/radio.py:110-114`

```python
# TODO: Add user ownership check when episodes are associated with users
# user = await verify_user_token(token)
# if not user or episode.user_id != user.id:
#     await ws.close(code=4003, reason="Unauthorized")
#     return
```

**问题:** 知道 episode_id 和任意有效 token（≥10字符）即可流式播放他人的 episode。`verify_user_token` 函数也是 stub（仅检查长度）。

**整改:**
1. 实现真正的 token 校验（JWT 解码或 Spotify 用户信息 API）
2. 将 episode 存储关联 user_id
3. WebSocket 连接时校验 `episode.user_id == current_user.id`

### 3.7 [中危] RadioPage 使用硬编码 Mock Data

**文件位置:** `frontend/src/pages/RadioPage.tsx:14-28, 55`

```typescript
const mockEpisode: RadioEpisode = { /* 硬编码数据 */ };
// ...
const episode = mockEpisode; // 始终使用 mock
```

**问题:**
- `handleStartRadio` 用 `setTimeout` 模拟加载，不调用真实 API
- `mockEpisode` 的字段结构（`tracks[]`、`dj_narration[]`）与后端返回的 `RadioEpisode`（`segments[]`）不一致
- 旧字段 `description`、`created_at` 不在后端 schema 中

**整改:** 用 `useQuery` 从 `/api/radio/{id}` 获取真实数据，移除 mockEpisode。

### 3.8 [中危] `encrypt_token()` / `decrypt_token()` 已定义但未调用

**文件位置:** `backend/models/db_models.py:30-41`

**问题:** Fernet 加密函数已定义，但 `User` 表的 `access_token` / `refresh_token` 写入/读取路径中从未调用这些函数。Token 仍然明文存储在数据库。

**验证命令:** `grep -rn "encrypt_token\|decrypt_token" backend/ --include="*.py"` 仅返回定义行。

**整改:** 在保存 User 时调用 `encrypt_token()`，读取时调用 `decrypt_token()`。或改用 SQLAlchemy `TypeDecorator` 实现透明加解密。

### 3.9 [低危] 无速率限制

**文件位置:** 全局

**问题:** 所有 API 端点无速率限制。Chat API 可被频繁调用消耗 LLM 配额，TTS 可被用于批量生成。

**整改:** 添加 `slowapi` 或 `fastapi-limiter`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/sync", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat_sync(req: ChatRequest):
    ...
```

### 3.10 [低危] In-memory `_episodes` 存储未持久化

**文件位置:** `backend/api/radio.py:22`

```python
_episodes: Dict[str, RadioEpisode] = {}
```

**问题:** 服务重启后所有 episode 丢失。`db_models.Episode` 已定义但未被使用。

**整改:** 使用 `Episode` 模型替换内存字典，或将 episode 存入 Redis 作为缓存层。

### 3.11 [低危] Nginx `proxy_read_timeout` 过长

**文件位置:** `nginx.conf:28`

```nginx
proxy_read_timeout 86400s;  # 24小时
```

**问题:** 过长 timeout 可能导致僵尸连接占用后端资源。

**整改:** `proxy_read_timeout 3600s;`（1小时对于 SSE/WS 足够）

### 3.12 [低危] SQLite 默认路径与 Docker Volume 不一致

**文件位置:**
- `backend/config.py:18`: `DATABASE_URL: str = "sqlite+aiosqlite:///./mimofm.db"`
- `docker-compose.yml:13`: `volumes: - ./data:/app/data`

**问题:** 数据库文件 `mimofm.db` 创建在 `/app/mimofm.db`（WORKDIR），未持久化到挂载卷 `/app/data/`。容器重建后数据丢失。

**整改:** `DATABASE_URL=sqlite+aiosqlite:///./data/mimofm.db`

---

## 4. 安全架构总结

```
认证层:
  ❌ Chat/TTS 无认证
  ⚠️  Radio: Header 传递 (正确) 但前端调用缺 token
  ⚠️  Spotify: Query 参数传递 (不安全)
  ⚠️  WebSocket: 仅长度校验 (stub)

数据层:
  ⚠️  Token 加密函数存在但未调用 → 明文存储
  ❌  Episode 内存存储 → 重启丢失

传输层:
  ✅  Nginx 反向代理配置正确
  ✅  OpenAI client 有 timeout
  ✅  DB 连接池参数已配置

配置层:
  ✅  敏感环境变量 Field(..., min_length=1) 强制校验
  ⚠️  CORS 仅 localhost
  ❌  无速率限制
```

---

## 5. 整改优先级

| 优先级 | 问题 | 影响面 |
|--------|------|--------|
| P0 | createRadio 调用未传 token (3.1) | 功能完全不可用 |
| P0 | Spotify token URL 泄露 (3.3) | 安全风险 |
| P1 | Chat/TTS 无认证 (3.5) | 配额消耗 |
| P1 | encrypt_token 未调用 (3.8) | 安全合规 |
| P1 | localStorage 明文 token (3.2) | XSS 风险 |
| P2 | CORS 生产配置 (3.4) | 部署就绪 |
| P2 | WebSocket 所有权 (3.6) | 数据隔离 |
| P3 | Mock data (3.7) | 功能完整 |
| P3 | 速率限制 (3.9) | 防滥用 |
| P3 | 持久化存储 (3.10) | 数据可靠性 |

---

## 6. 已验证修复 (Previous Fixes)

| Issue | 状态 | 验证方式 |
|-------|------|----------|
| Token 加密函数实现 | ✅ | `db_models.py:30-41` Fernet |
| 环境变量强制校验 | ✅ | `config.py:13,19-20` Field(...) |
| WebSocket 基础认证 | ✅ | `radio.py:100-102` 长度校验 |
| Bearer Header 传递 | ✅ | `radio.py:38` Header(...) |
| API timeout | ✅ | `mimo_llm.py:23` httpx.Timeout |
| DB 连接池 | ✅ | `database.py:8-14` pool_size=10 |
| 前端 API 契约更新 | ✅ | `types/index.ts` 移除 access_token |
| 异常处理改进 | ✅ | `radio.py` 区分 401/403/500 |

---

*报告生成: Hermes Agent - miniprogram-code-audit v1.0*
*下次审计: 新提交触发或定时检查*
