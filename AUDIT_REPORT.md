# MiMo FM 代码审计报告

**审计日期:** Saturday, July 04, 2026  
**仓库:** https://github.com/Lgugeng/mimo-fm  
**审计范围:** Backend (FastAPI/Python), Frontend (React/TypeScript)  
**审查状态:** 增量审查 — 无新提交

---

## 1. 审计结果总览

| 风险等级 | 数量 | 状态 |
|---------|------|------|
| 高危     | 0    | ✅ 已修复 |
| 中危     | 3    | ⚠️ 待处理 |
| 低危     | 2    | 💡 建议优化 |

---

## 2. 本次审查状态

**本地提交数:** 0（与远程同步，无新变更）  
**上次修复内容已验证通过:**

- ✅ Token 加密存储 (db_models.py)
- ✅ 环境变量强制校验 (config.py)
- ✅ WebSocket 基础认证 (radio.py)
- ✅ Bearer token 通过 Header 传递
- ✅ API timeout 配置 (mimo_llm.py)
- ✅ 数据库连接池参数配置

---

## 3. 遗留问题清单

### 中危问题 (Medium Priority)

#### M1: CORS 配置仍偏向开发环境
**文件:** `backend/main.py:27-33`

当前 CORS 配置在生产环境存在 CSRF 风险：
```python
allow_origins=["http://localhost:3000", "http://localhost:5173"],
allow_credentials=True,
```

**整改建议:**
- 生产环境应限制具体域名而非 localhost
- 考虑区分开发/生产环境的 CORS 配置
- 或使用 CSRF token 机制替代 `allow_credentials=True`

**修复示例:**
```python
import os

is_prod = os.getenv("DEBUG", "true").lower() != "true"

origins = (
    [os.getenv("FRONTEND_URL")] if is_prod 
    else ["http://localhost:3000", "http://localhost:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # 生产环境考虑改为 False + CSRF token
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

#### M2: WebSocket 缺少用户所有权验证
**文件:** `backend/api/radio.py:109-113`

虽然已经添加了 token 验证，但 TODO 注释显示尚未实现用户所有权检查：
```python
# TODO: Add user ownership check when episodes are associated with users
# user = await verify_user_token(token)
# if not user or episode.user_id != user.id:
#     await ws.close(code=4003, reason="Unauthorized")
#     return
```

**风险:** 用户 B 可以访问并流式传输用户 A 创建的 episode。

**整改建议:**
1. 在 `Episode` model 中存储 `user_id`
2. 实现 `verify_user_owns_episode()` 函数
3. WebSocket 连接时校验 ownership

---

#### M3: 异常处理过于宽泛
**文件:** `backend/services/radio_engine.py:156-157`, `api/chat.py:26-27`

部分位置的错误捕获仍过于宽泛：
```python
except Exception as exc:
    raise HTTPException(status_code=502, detail=str(exc))
```

**风险:** 所有异常都返回相同状态码，难以区分认证失败、权限拒绝、资源不存在等场景。

**整改建议:**
分类捕获异常，返回正确的 HTTP 状态码：
- 401: Token 无效/过期
- 403: 无访问权限
- 404: 资源不存在
- 500: 内部服务器错误（不暴露详情）

---

### 低危问题 (Low Priority)

#### L1: In-memory `_episodes` 存储未持久化
**文件:** `backend/api/radio.py:21-22`

```python
# In-memory episode store (replace with DB in production)
_episodes: Dict[str, RadioEpisode] = {}
```

**建议:** 已在 TODO 中标注，但在生产环境部署前需要替换为数据库存储。Episodes 已有对应的 `db_models.Episode` 模型但尚未使用。

---

#### L2: Frontend types 未完全对齐 Pydantic schema
**文件:** 
- `frontend/src/types/index.ts:82-87` (RadioTrack)
- `backend/models/schemas.py:106-110` (PlaylistAnalysis)

前端仍存在已弃用的 `RadioTrack` 接口，且部分字段与后端未完全对齐。建议：

```typescript
// 删除 RadioTrack 或标记为 @deprecated
// 确保 RadioSegment 结构正确映射 backend schema
```

---

## 4. 已验证的安全改进 (Previous Fixes Verified)

以下问题在上次审计中提出，已在提交 `d021039` 中修复并验证：

| Issue | Fix Verification |
|-------|------------------|
| C1: Token 明文存储 | ✅ `db_models.py` 添加 `encrypt_token()` / `decrypt_token()` 使用 Fernet |
| C2: 环境变量未校验 | ✅ `config.py` 所有敏感字段用 `Field(..., min_length=1)` |
| C3: WebSocket 无认证 | ✅ `radio.py` 添加 token 验证，关闭无效连接 |
| C4: Token 传递方式 | ✅ `create_episode()` 从 Authorization Header 提取 Bearer token |
| C5: 错误处理宽泛 | ⚠️ 部分已修复 (Spotify API)，仍有改进空间 |

---

## 5. 工程化建议

### 前后端类型同步
使用 `openapi-typescript` 自动从 FastAPI OpenAPI schema 生成 TypeScript 定义：

```bash
# Backend
uvicorn main:app --port 8000 &
curl http://localhost:8000/openapi.json > openapi.json

# Frontend
npx @hey-api/openapi-ts -i openapi.json -o src/api/
```

### 速率限制
建议添加 `fastapi-limiter` 防止 API 滥用：

```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.on_event("startup")
async def startup():
    await FastAPILimit.initredis.Redis()

@router.post("/create", dependencies=[Depends(RateLimiter(max_calls=10, period=60))])
```

### 日志与监控
- 添加结构化日志 (structlog)
- 实现健康检查 endpoint (`/health` 已存在)
- 考虑集成 sentry 或类似错误追踪服务

---

## 6. 总结

**整体评估:** ⭐⭐⭐⭐ (4/5)  
项目安全状况良好，上次审计的关键问题已全部修复。遗留的中低危问题不影响核心功能的安全，建议在后续 sprint 中逐步完善。

**发布建议:** 
- ✅ 可以进行 UAT/测试环境部署
- ⚠️ 生产环境部署前需解决 CORS 配置和 WebSocket 所有权验证

---

*报告生成工具：Hermes Agent - MiniProgram Code Audit Skill*  
*下一次审计提醒: 当有新提交时自动触发*
