# MiMo FM Code Audit Report

**Audit Date:** Wednesday, July 01, 2026  
**Scope:** Backend (Python/FastAPI), Frontend (TypeScript/Vue)  

## Executive Summary

| Severity | Count | Action Required       |
|----------|-------|----------------------|
| Critical | 5     | Block release        |
| High     | 4     | Fix before production |
| Medium   | 3     | Address in sprint    |

---

## Critical Issues (Must Fix)

### C1: Plaintext Token Storage in Database
**File:** `backend/models/db_models.py:24-25`  
**Risk:** Full account takeover if DB is compromised.

**Fix Required:** Encrypt tokens using Fernet/AES before storage.

```python
from cryptography.fernet import Fernet

class User(Base):
    # Add encryption key to settings
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
    
def encrypt_token(token: str) -> str:
    f = Fernet(settings.ENCRYPTION_KEY)
    return f.encrypt(token.encode()).decode()

def decrypt_token(enc_token: str) -> str:
    f = Fernet(settings.ENCRYPTION_KEY)
    return f.decrypt(enc_token.encode()).decode()
```

---

### C2: Sensitive Environment Variables Not Validated
**File:** `backend/config.py:9-15`  
**Risk:** Empty/missing API keys not caught at startup.

**Fix Required:** Use Pydantic Field for required validation.

```python
from pydantic import Field, ValidationError

class Settings(BaseSettings):
    MIMO_API_KEY: str = Field(..., min_length=1)
    SECRET_KEY: str = Field(..., min_length=1)
    
    @model_validator(mode='after')
    def validate_required_fields(cls, values):
        if not values.MIMO_API_KEY:
            raise ValueError("MIMO_API_KEY is required")
        return values
```

---

### C3: WebSocket Connection No Authentication
**File:** `backend/api/radio.py:60-65`  
**Risk:** Any user can stream any episode.

**Fix Required:** Validate user ownership before allowing connection.

```python
@router.websocket("/{episode_id}/stream")
async def stream_episode(
    ws: WebSocket, 
    episode_id: str,
    token: str = Query(...)  # Get from query or header
):
    # Verify token and check user owns this episode
    if not await verify_user_owns_episode(token, episode_id):
        await ws.close(code=4003, reason="Unauthorized")
        return
```

---

### C4: Token Passed via Body/Query Instead of Bearer Header
**File:** `backend/api/radio.py:26`, `models/schemas.py:81`  
**Risk:** Token logged in server logs, proxy logs.

**Fix Required:** Move token to Authorization header.

```python
# RadioCreateBody no longer has access_token field
async def create_episode(
    body: RadioCreateBody, 
    authorization: str = Header(...)
):
    token = authorization.replace("Bearer ", "")
    tracks = spotify_service.get_playlist_tracks(token, body.playlist_id)
```

---

### C5: Overly Broad Error Handling Returns 502 for Everything
**File:** `backend/api/radio.py`, `api/chat.py`  
**Risk:** Cannot distinguish auth errors from infrastructure errors.

**Fix Required:** Classify exceptions and return appropriate status codes.

```python
try:
    tracks = spotify_service.get_playlist_tracks(...)
except UnauthorizedError:
    raise HTTPException(401, "Invalid token")
except PermissionDeniedError:
    raise HTTPException(403, "Playlist not accessible")  
except Exception as e:
    logging.error(f"Unexpected error: {e}")
    raise HTTPException(500, "Internal server error")
```

---

## High Priority Issues

### H1: Frontend/Backend Type Mismatch
**Files:** `frontend/src/types/index.ts`, `backend/models/schemas.py`  
The RadioEpisode structures don't align. Fix TypeScript types to match Pydantic schemas.

### H2: Missing Database Indexes
**File:** `backend/models/db_models.py`  
Add indexes on foreign key columns for better query performance.

### H3: No API Rate Limiting
**File:** `backend/main.py`  
Implement rate limiting using fastapi-limiter to prevent abuse.

### H4: Missing Connection Pool Configuration
**File:** `backend/database.py:8`  
Configure pool_size, max_overflow, pool_pre_ping for production readiness.

---

## Medium Priority Issues

- **M1:** No API timeout configuration on OpenAI/httpx clients
- **M2:** CORS allow_credentials with multiple origins (review production config)
- **M3:** In-memory _episodes dict as temporary storage needs DB integration check

---

## Recommendations

1. Use `openapi-typescript` to generate TypeScript types from Pydantic schemas automatically
2. Add structured logging for audit trails
3. Implement proper health checks for all external dependencies
4. Consider using secrets management (Vault, AWS Secrets Manager) for production
5. Add input validation middleware to sanitize all incoming requests
