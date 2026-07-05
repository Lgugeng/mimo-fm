# MiMo FM 代码审计报告

**审计日期:** Sunday, July 05, 2026  
**仓库:** https://github.com/Lgugeng/mimo-fm  
**审查状态:** 增量审查 — 无新提交（与远程同步）  
**技术栈:** Backend (FastAPI/Python 3.13), Frontend (React/TypeScript/Vite)

---

## 1. 审计结果总览

| 风险等级 | 数量 | 状态     |
|---------|------|----------|
| 高危    | 0    | ✅ 已修复 |
| 中危    | 3    | ⚠️ 待处理 |
| 低危    | 2    | 💡 建议优化 |

---

## 2. 本次审查状态

**本地提交数:** 0（与远程同步，无新变更）  
**上次修复验证通过：**

- ✅ Token 加密存储 (db_models.py 使用 Fernet)
- ✅ 环境变量强制校验 (config.py 所有敏感字段用 `Field(..., min_length=1)`)
- ✅ WebSocket 基础 token 认证 (radio.py:100-102)
- ✅ Bearer token 通过 Authorization Header 传递
- ✅ API timeout 配置 (mimo_llm.py:23)
- ✅ 数据库连接池参数配置 (database.py:8-14)

---

## 3. 详细问题清单

### 3.1 [中危] CORS 配置仍偏向开发环境

**文件位置:** `backend/main.py:27-33`

当前 CORS 配置在生产环境存在 CSRF 风险：
```python
allow_origins=["http://localhost:3000", "http://localhost:5173"],
allow_credentials=True,
```

**风险:** 生产环境允许 localhost，且 `allow_credentials=True` + 宽松 origin 组合易受 CSRF 攻击。

**整改建议:**
- 区分开发/生产环境的 CORS 配置
- 生产环境限制具体域名并禁用 credentials 或使用 CSRF token

**修改示例:**
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
    allow_credentials=not is_prod,  # 生产环境考虑改为 False + CSRF token
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 3.2 [中危] WebSocket 缺少用户所有权验证

**文件位置:** `backend/api/radio.py:110-114`

虽然已添加 token 验证，但 TODO 注释显示尚未实现用户所有权检查：
```python
# TODO: Add user ownership check when episodes are associated with users
# user = await verify_user_token(token)
# if not user or episode.user_id != user.id:
#     await ws.close(code=4003, reason="Unauthorized")
#     return
```

**风险:** 用户 B 可以访问并流式传输用户 A 创建的 episode。

**整改建议:**
1. 在 `Episode` model 中存储 `user_id`（已完成，见 db_models.py:74-87）
2. 实现 `verify_user_owns_episode()` 函数
3. WebSocket 连接时校验 ownership

---

### 3.3 [中危] 异常处理分类不完整

**文件位置:** 
- `backend/api/chat.py:26-27`
- `backend/services/radio_engine.py:156-157`

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

**修改示例 (chat.py):**
```python
from pydantic import ValidationError
import httpx

@router.post("/sync", response_model=ChatResponse)
async def chat_sync(req: ChatRequest) -> ChatResponse:
    try:
        result = await llm_service.chat(...)
        return ChatResponse(**result)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="API key invalid")
        raise HTTPException(status_code=502, detail="External service error")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e}")
    except Exception as exc:
        import logging
        logging.error(f"Unexpected error: {exc}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

### 3.4 [低危] In-memory `_episodes` 存储未持久化

**文件位置:** `backend/api/radio.py:21-22`

```python
# In-memory episode store (replace with DB in production)
_episodes: Dict[str, RadioEpisode] = {}
```

**建议:** 已在 TODO 中标注，但在生产环境部署前需要替换为数据库存储。Episodes 已有对应的 `db_models.Episode` 模型但尚未使用。

---

### 3.5 [低危] Frontend types 包含冗余字段

**文件位置:** `frontend/src/types/index.ts:92`

```typescript
export interface RadioCreateRequest {
  playlist_id: string;
  access_token: string;  // Deprecated - now passed via Authorization header
  voice_description?: string;
  voice?: string;
}
```

**建议:** 删除 `access_token` 字段，避免前端误用。后端已通过 Header 传递 token (radio.py:38-45)。

---

## 4. 已验证的安全改进 (Previous Fixes Verified)

以下问题在上次审计中提出，已在提交 `d021039` 和 `45cc69f` 中修复并验证：

| Issue | Fix Verification |
|-------|------------------|
| Token 明文存储 | ✅ `db_models.py` 添加 `encrypt_token()` / `decrypt_token()` 使用 Fernet |
| 环境变量未校验 | ✅ `config.py` 所有敏感字段用 `Field(..., min_length=1)` + validator |
| WebSocket 无认证 | ✅ `radio.py:100-102` 添加 token 验证，关闭无效连接 |
| Token 传递方式 | ✅ `create_episode()` 从 Authorization Header 提取 Bearer token |
| API timeout | ✅ `mimo_llm.py:23` 配置 httpx Timeout (connect=5s, read=60s) |
| DB connection pool | ✅ `database.py:8-14` 显式配置 pool_size, max_overflow, pool_pre_ping |

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
    await FastAPILimit.init(redis.Redis())

@router.post("/create", dependencies=[Depends(RateLimiter(max_calls=10, period=60))])
```

### 日志与监控
- 添加结构化日志 (structlog)
- 实现健康检查 endpoint (`/health` 已存在 ✓)
- 考虑集成 sentry 或类似错误追踪服务

---

## 6. 总结

**整体评估:** ⭐⭐⭐⭐ (4/5)  

项目安全状况良好，上次审计的关键高危问题已全部修复。遗留的中低危问题不影响核心功能的安全，建议在后续 sprint 中逐步完善。

**发布建议:** 
- ✅ 可以进行 UAT/测试环境部署
- ⚠️ 生产环境部署前需解决 CORS 配置和 WebSocket 所有权验证

---

*报告生成工具：Hermes Agent - MiniProgram Code Audit Skill*  
*下一次审计提醒: 当有新提交时自动触发*
