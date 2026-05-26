# 🔍 MiMo FM — Comprehensive Code Audit Report

**Date:** 2026-05-26  
**Auditor:** Hermes Agent (Automated)  
**Project:** MiMo FM — AI Private Radio Station  
**Scope:** Full codebase audit (backend, frontend, infrastructure)

---

## Executive Summary

The MiMo FM project is a well-structured full-stack application combining Python FastAPI backend with React/TypeScript frontend. The architecture is clean and the code is readable. However, the audit uncovered **several critical frontend-backend API contract mismatches** that would prevent the application from functioning, along with security concerns around CORS configuration and token handling. Many of the critical/high issues have been fixed directly in the codebase (see [Fixes Applied](#fixes-applied) section).

**Findings Summary:**
| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟠 High | 10 |
| 🟡 Medium | 14 |
| 🟢 Low | 8 |

---

## 🔴 Critical Issues

### C-1: Frontend-Backend Chat API Contract Mismatch
**File:** `frontend/src/hooks/useVoiceChat.ts`, `frontend/src/api/chat.ts`, `backend/api/chat.py`  
**Status:** ✅ Fixed

The frontend `ChatRequest` type sends `{ message: string }` but the backend `ChatRequest` schema expects `{ messages: ChatMessage[] }` (an array of role/content objects). This means **all chat functionality is completely broken** — requests would be rejected with a 422 validation error.

**Fix Applied:** Updated `useVoiceChat.ts` to accumulate conversation history into a `messages` array matching the backend schema. Updated `sendMessage()` to accept the correct shape.

---

### C-2: Frontend-Backend TTS API Contract Mismatch
**File:** `frontend/src/api/tts.ts`, `frontend/src/pages/ChatPage.tsx`, `frontend/src/pages/VoiceStudioPage.tsx`  
**Status:** ✅ Fixed

The frontend sends `{ text, voice_id, speed, pitch }` but the backend expects `{ text, voice_description, voice, audio_format }`. Additionally, the frontend expects `{ audio_url: string }` in the response but the backend returns `{ audio_base64: string, format: string }`. **All TTS functionality is completely broken.**

**Fix Applied:** Updated `synthesizeSpeech()` function signature and response handling. Updated `ChatPage.handleSpeak()` and `VoiceStudioPage.handlePreview()` to decode base64 audio into data URLs.

---

### C-3: Frontend-Backend Radio Create API Contract Mismatch
**File:** `frontend/src/api/radio.ts`, `frontend/src/types/index.ts`, `backend/api/radio.py`  
**Status:** ✅ Fixed

Three problems:
1. Frontend sends request body JSON but backend expects query parameters
2. Frontend sends `{ playlist_id, dj_voice_id, style, greeting }` but backend expects `{ playlist_id, access_token, voice_description, voice }`
3. The `access_token` field is entirely missing from the frontend type

**Fix Applied:** Created `RadioCreateBody` Pydantic schema for backend. Updated `RadioCreateRequest` TypeScript interface. Backend now accepts request body instead of query params.

---

### C-4: Spotify Callback Token Not Persisted
**File:** `frontend/src/pages/CallbackPage.tsx`, `frontend/src/pages/PlaylistPage.tsx`  
**Status:** ✅ Fixed

After Spotify OAuth callback, the backend returns `access_token` and `refresh_token`, but the frontend `CallbackPage` discards the response entirely (`.then(() => navigate(...))`). The `PlaylistPage` then tries to call `/spotify/playlists` without any access token, causing all playlist operations to fail with a 422 error.

**Fix Applied:** `CallbackPage` now stores tokens in `localStorage`. `PlaylistPage` reads the stored token and passes it to the API. Query is disabled when no token is available.

---

### C-5: CORS Misconfiguration — Wildcard Origins with Credentials
**File:** `backend/main.py`  
**Status:** ✅ Fixed

`allow_origins=["*"]` combined with `allow_credentials=True` is a security anti-pattern. Per the Fetch specification, browsers reject `Access-Control-Allow-Origin: *` when `credentials: include` is set. This means:
- Authenticated cross-origin requests silently fail
- If browsers didn't enforce this, it would be an XSS escalation vector

**Fix Applied:** Changed `allow_origins` to explicit localhost origins for development. Production deployments should use environment-specific origins.

---

## 🟠 High Issues

### H-1: Spotify Playlist Tracks URL Mismatch
**File:** `frontend/src/api/spotify.ts`, `backend/api/spotify.py`  
**Status:** ✅ Fixed

Frontend calls `/spotify/playlists/{id}/tracks` (plural) but backend route is `/spotify/playlist/{id}/tracks` (singular). All playlist track fetches return 404.

**Fix Applied:** Corrected frontend URL to `/spotify/playlist/${playlistId}/tracks`.

---

### H-2: Spotify Playlists Endpoint Missing Access Token
**File:** `frontend/src/api/spotify.ts`, `backend/api/spotify.py`  
**Status:** ✅ Fixed

Backend `/spotify/playlists` requires `access_token` as a query parameter, but the frontend `getPlaylists()` function takes no arguments and passes no token.

**Fix Applied:** `getPlaylists()` now accepts `accessToken` parameter and appends it as query param.

---

### H-3: SECRET_KEY Has Insecure Default
**File:** `backend/config.py`  
**Status:** ✅ Fixed

`SECRET_KEY: str = "change-me-in-production"` — if deployment uses the default, session tokens and any HMAC operations are trivially forgeable.

**Fix Applied:** Changed default to empty string `""`. Application should validate this is set at startup.

---

### H-4: Docker Healthcheck Uses curl (Not Available in Image)
**File:** `docker-compose.yml`  
**Status:** ✅ Fixed

The healthcheck uses `curl` but `python:3.11-slim` does not include curl. Docker healthchecks would silently fail, preventing proper container orchestration.

**Fix Applied:** Changed to use Python's built-in `urllib.request.urlopen()`.

---

### H-5: Spotify OAuth Missing CSRF State Parameter
**File:** `backend/services/spotify.py`, `backend/api/spotify.py`

The Spotify OAuth flow does not generate or validate a `state` parameter, making it vulnerable to CSRF attacks. An attacker could initiate an OAuth flow and trick a user into linking the attacker's Spotify account.

**Recommendation:** Generate a random state token, store it in session, validate on callback.

---

### H-6: Access Tokens Passed in URL Query Parameters
**File:** `backend/api/spotify.py` (multiple endpoints)

Spotify access tokens are passed as query parameters (`?access_token=...`). Query parameters are:
- Logged in server access logs
- Stored in browser history
- Visible in proxy/CDN logs
- Cached by intermediate systems

**Recommendation:** Move to `Authorization` header or POST body for all token-bearing endpoints.

---

### H-7: In-Memory Episode Storage (Data Loss on Restart)
**File:** `backend/api/radio.py`

Episodes are stored in a module-level `dict`: `_episodes: Dict[str, RadioEpisode] = {}`. All episodes are lost on server restart or redeployment. The code comment acknowledges this: *"In-memory episode store (replace with DB in production)"*.

**Recommendation:** Persist episodes to the SQLAlchemy database using the existing `Episode` model.

---

### H-8: Spotify Tokens Stored in Plaintext in Database
**File:** `backend/models/db_models.py`

The `User` model stores `access_token` and `refresh_token` as plaintext `String(512)` columns. If the database is compromised, all linked Spotify accounts are immediately accessible.

**Recommendation:** Encrypt tokens at rest using application-level encryption (e.g., Fernet from `cryptography` package).

---

### H-9: Exception Details Leaked to Clients
**File:** `backend/api/*.py` (all error handlers)

All API error handlers use `raise HTTPException(status_code=502, detail=str(exc))`. This exposes internal exception messages (stack traces, API keys in error messages, database details) to the client.

**Recommendation:** Log full exceptions server-side, return sanitized messages to clients.

---

### H-10: No Input Length Validation on Chat Messages
**File:** `backend/models/schemas.py`, `backend/api/chat.py`

`ChatMessage.content` and `ChatRequest.messages` have no length limits. An attacker could send:
- An arbitrarily large message list (memory exhaustion)
- Extremely long message content (token/cost abuse)

**Recommendation:** Add `max_length` constraints on string fields and `max_length` on the messages list.

---

## 🟡 Medium Issues

### M-1: `datetime.utcnow()` Deprecated
**File:** `backend/models/db_models.py` (lines 26, 43, 57, 73)

`datetime.utcnow()` is deprecated since Python 3.12. Use `datetime.now(datetime.UTC)` or `func.now()` for server-side timestamps.

---

### M-2: Database Session Auto-Commits on All Requests
**File:** `backend/database.py`

The `get_db()` dependency commits after every request, including read-only GET requests. This is unnecessary overhead and could cause unexpected side effects.

---

### M-3: `get_db()` Missing `async` Generator Type Annotation
**File:** `backend/database.py` (line 17)

```python
async def get_db() -> AsyncSession:  # type: ignore[misc]
```

Should be `AsyncGenerator[AsyncSession, None]` with the `yield` pattern. The `type: ignore` comment suppresses a legitimate type error.

---

### M-4: WebSocket Manager Lock Contention in Broadcast
**File:** `backend/api/websocket.py`

`broadcast()` acquires the lock, copies connections, releases lock, then iterates. But `disconnect()` is called inside the iteration's `except` block, which also acquires the lock. While not a deadlock (lock is released first), it can cause connection state inconsistency.

---

### M-5: Spotify Playlist Tracks Not Paginated
**File:** `backend/services/spotify.py`

`get_playlist_tracks()` only fetches the first page of results (default 100 tracks). Large playlists will be truncated without warning.

---

### M-6: Module-Level Service Singletons Initialize at Import Time
**File:** `backend/services/*.py`

Services like `llm_service`, `tts_service`, `spotify_service` are instantiated at module import time. If `MIMO_API_KEY` is empty or invalid, the `AsyncOpenAI` client is created with bad config. No validation occurs.

---

### M-7: Frontend `RadioEpisode` Type Incompatible with Backend
**File:** `frontend/src/types/index.ts`

The frontend `RadioEpisode` type has `tracks: RadioTrack[]` and `dj_narration: NarrationSegment[]`, but the backend returns `segments: RadioSegment[]` with a different structure. The frontend `RadioPage` uses `mockEpisode` with the frontend type, masking this mismatch.

---

### M-8: `autoSpeak` Feature Not Wired Up
**File:** `frontend/src/pages/ChatPage.tsx`

The `autoSpeak` checkbox state is managed but never used. When `autoSpeak` is true, responses are not automatically spoken — `handleSpeak()` is never called on new messages.

---

### M-9: `VoiceRecorder` Component Not Used
**File:** `frontend/src/components/chat/VoiceRecorder.tsx`

The `VoiceRecorder` component is defined but never imported or rendered in any page. Dead code.

---

### M-10: Frontend `getConversations()` / `deleteConversation()` Call Non-Existent Endpoints
**File:** `frontend/src/api/chat.ts`

These functions call `/chat/history` and `/chat/{id}` which have no corresponding backend routes. They would return 404.

---

### M-11: Frontend `getVoices()` Calls Non-Existent Endpoint
**File:** `frontend/src/api/tts.ts`

`getVoices()` calls `/tts/voices` which has no backend route. Would return 404.

---

### M-12: Frontend `getEpisodes()` Calls Non-Existent Endpoint
**File:** `frontend/src/api/radio.ts`

`getEpisodes()` calls `/radio/episodes` which has no backend route. Would return 404.

---

### M-13: `VoiceStudioPage` Clone Sends File Upload to Wrong Endpoint Format
**File:** `frontend/src/pages/VoiceStudioPage.tsx`, `frontend/src/api/tts.ts`

`cloneVoice()` uses `apiUpload()` (FormData/multipart) but the backend `/tts/clone` endpoint expects a JSON `VoiceCloneRequest` body with `reference_audio_base64` (base64 string), not a file upload. The frontend should convert the file to base64 before sending.

---

### M-14: `useRadioStream` Decodes JSON Audio Chunks as AudioData
**File:** `frontend/src/hooks/useRadioStream.ts`

The `connectRadioStream` function sets `ws.binaryType = 'arraybuffer'`, but the backend sends JSON text messages with base64-encoded audio. The frontend's `onAudio` handler tries to `decodeAudioData` on what might be text/JSON data, causing decode failures.

---

## 🟢 Low Issues

### L-1: Docker Compose `version` Key Deprecated
**File:** `docker-compose.yml`

The `version: "3.8"` key is deprecated in modern Docker Compose (v2+) and is ignored. Can be removed.

---

### L-2: `noUnusedLocals` / `noUnusedParameters` Disabled
**File:** `frontend/tsconfig.json`

Both are set to `false`, allowing dead code to accumulate without TypeScript warnings.

---

### L-3: README References Wrong Clone URL
**File:** `README.md`

References `https://github.com/your-username/mimo-fm.git` instead of the actual repository URL.

---

### L-4: `_estimate_wav_duration_ms` Assumes Fixed Header Size
**File:** `backend/services/radio_engine.py`

Hardcodes 44-byte WAV header skip. WAV files can have variable header sizes (e.g., with extra metadata chunks). Should use the `wave` module to parse properly.

---

### L-5: No `.env` Validation at Startup
**File:** `backend/config.py`

If `MIMO_API_KEY` is empty, the application starts successfully but all API calls fail silently or with unhelpful errors. Should validate required settings at startup.

---

### L-6: Frontend `SpotifyTrack` Type Mismatch with Backend
**File:** `frontend/src/types/index.ts`

Frontend `SpotifyTrack` has `artist: string` (singular) but backend returns `artists: List[str]` (plural array). Also `album_art` exists in frontend but not backend.

---

### L-7: `WaveformVisualizer` Canvas Size Not Responsive
**File:** `frontend/src/components/WaveformVisualizer.tsx`

Canvas uses fixed pixel sizes (`width={small ? 40 : 200}`) with CSS `w-full` class for non-small mode. This can cause blurry rendering on high-DPI displays. Should use `devicePixelRatio`.

---

### L-8: No `robots.txt` or Security Headers
**Files:** `nginx.conf`

No security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.) are configured in nginx. No `robots.txt` is served.

---

## Fixes Applied

The following critical and high issues were **directly fixed in the code**:

| # | Issue | File(s) Modified |
|---|-------|-----------------|
| C-1 | Chat API contract mismatch | `frontend/src/api/chat.ts`, `frontend/src/hooks/useVoiceChat.ts` |
| C-2 | TTS API contract mismatch | `frontend/src/api/tts.ts`, `frontend/src/pages/ChatPage.tsx`, `frontend/src/pages/VoiceStudioPage.tsx` |
| C-3 | Radio create API contract mismatch | `backend/api/radio.py`, `backend/models/schemas.py`, `frontend/src/types/index.ts` |
| C-4 | Spotify callback token not persisted | `frontend/src/pages/CallbackPage.tsx`, `frontend/src/pages/PlaylistPage.tsx` |
| C-5 | CORS wildcard + credentials | `backend/main.py` |
| H-1 | Spotify playlist tracks URL mismatch | `frontend/src/api/spotify.ts` |
| H-2 | Spotify playlists missing access token | `frontend/src/api/spotify.ts`, `frontend/src/pages/PlaylistPage.tsx` |
| H-3 | SECRET_KEY insecure default | `backend/config.py` |
| H-4 | Docker healthcheck curl not available | `docker-compose.yml` |
| - | Audio play() promise rejection handling | `frontend/src/hooks/useAudioPlayer.ts` |
| - | Howler volume stale closure fix | `frontend/src/contexts/AudioContext.tsx` |
| - | ChatPage send message cleanup | `frontend/src/pages/ChatPage.tsx` |

---

## Architecture Observations

### Strengths
- Clean separation of concerns (services, API routes, models)
- Proper async/await patterns throughout
- Good use of Pydantic for request/response validation
- Well-structured frontend with custom hooks and context pattern
- Docker multi-stage builds for frontend
- SSE streaming for chat responses

### Areas for Improvement
- Add comprehensive API integration tests
- Implement proper error boundaries in React
- Add OpenTelemetry/structured logging
- Consider using React Query for all API calls (currently mixed with raw fetch)
- Add TypeScript strict mode checks (`noUnusedLocals`, `noUnusedParameters`)
- Implement proper state management for Spotify auth (not just localStorage)
- Add rate limiting middleware to backend
- Add health/readiness probes for production Kubernetes deployment

---

*End of Audit Report*
