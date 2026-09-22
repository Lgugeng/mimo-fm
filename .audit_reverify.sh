#!/usr/bin/env bash
# MiMo FM incremental audit re-verification (17 open issues)
cd /opt/data/workspace/mimo-fm

echo "### 3.1 PlaylistPage token (expect undefined in apiFetch /radio/create) ###"
grep -n "radio/create" frontend/src/pages/PlaylistPage.tsx
echo
echo "### 3.2 Spotify access_token as Query (backend api/spotify.py) ###"
grep -n "access_token" backend/api/spotify.py
echo "### 3.2b Spotify access_token in URL (frontend api/spotify.ts) ###"
grep -n "access_token" frontend/src/api/spotify.ts
echo
echo "### 3.3 encrypt/decrypt token call sites (expect 0 excluding defs) ###"
grep -rn "encrypt_token\|decrypt_token" backend/ | grep -v "def encrypt\|def decrypt"
echo "call-site-count=$(grep -rn 'encrypt_token\|decrypt_token' backend/ | grep -v 'def encrypt\|def decrypt' | wc -l)"
echo
echo "### 3.4 WebSocket token via Query (radio.py) ###"
grep -n "token.*Query\|Query.*token" backend/api/radio.py
echo
echo "### 3.5 localStorage plaintext tokens (CallbackPage) ###"
grep -n "localStorage.setItem" frontend/src/pages/CallbackPage.tsx
echo
echo "### 3.6 mockEpisode in RadioPage (count) ###"
grep -c "mockEpisode" frontend/src/pages/RadioPage.tsx
echo
echo "### 3.7 status_code=502 count (expect 8) ###"
echo "fifty02-count=$(grep -rn 'status_code=502' backend/ | wc -l)"
grep -rn "status_code=502" backend/
echo
echo "### 3.8 CORS config in main.py ###"
grep -n "allow_origins\|allow_credentials" backend/main.py
echo
echo "### 3.9 _episodes memory dict in radio.py (lines) ###"
grep -n "_episodes" backend/api/radio.py
echo
echo "### 3.10 WS ownership TODO / commented verify (radio.py 105-120) ###"
sed -n '105,120p' backend/api/radio.py
echo
echo "### 3.11 TTS timeout (expect 0 in mimo_tts.py; LLM has 1) ###"
echo "tts-timeout-count=$(grep -c 'timeout' backend/services/mimo_tts.py)"
echo "llm-httpxTimeout-count=$(grep -c 'httpx.Timeout' backend/services/mimo_llm.py)"
echo
echo "### 3.12 radio.ts requesting /radio/episodes (backend has no such endpoint) ###"
grep -n "radio/episodes" frontend/src/api/radio.ts
echo "backend-endpoint-radio-episodes=$(grep -rn 'episodes' backend/api/radio.py | wc -l)"
echo
echo "### 3.13 tts.ts FormData (frontend) vs base64 JSON (backend) ###"
grep -n "FormData" frontend/src/api/tts.ts
echo
echo "### 3.14 requirements.txt loose >= versions (count) ###"
echo "req-gte-count=$(grep -c '>=' backend/requirements.txt)"
echo
echo "### 3.15 Dockerfile USER directive (expect 0/0) ###"
echo "backend-user=$(grep -c '^USER' Dockerfile.backend) frontend-user=$(grep -c '^USER' Dockerfile.frontend)"
echo
echo "### 3.16 .env.example DEBUG default (expect DEBUG=true) ###"
grep -n "DEBUG" .env.example
echo
echo "### 3.17 nginx client_max_body_size / limit_req (expect 0) ###"
echo "nginx-bodysize=$(grep -c 'client_max_body_size' nginx.conf) nginx-limitreq=$(grep -c 'limit_req' nginx.conf)"
echo
echo "### VERIFIED-FIX checks (should remain fixed) ###"
echo "createRadio Bearer extract (radio.py Authorization header):"
grep -n "Authorization\|authorization" backend/api/radio.py | head -5
echo "DB pool config (database.py):"
grep -n "pool_size\|max_overflow\|pre_ping\|pool_recycle" backend/database.py
echo "apiFetch Bearer support (client.ts):"
grep -n "Authorization\|Bearer" frontend/src/api/client.ts
echo "RadioEpisode segments schema (schemas.py):"
grep -n "segments" backend/models/schemas.py | head -3
