# Multi-Agent Backend Deployment Guide

## Access Tokens (KEEP SECURE)

| Service | Token | Purpose |
|---------|-------|---------|
| **GitHub PAT** | `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` | Push to GitHub repo |
| **Vercel Token** | `d0WR4GGv4kamiirHKX3Vv6yC` | Deploy to Vercel |

---

## Target Environment

| Property | Value |
|----------|-------|
| VM Host | `34.95.128.208` |
| VM User | `iwagschal` |
| Internal IP | `10.158.0.2` |
| Backend Path | `/home/iwagschal/aeyecorp` |
| Service Port | `8000` (uvicorn) |
| HTTPS Port | `443` (nginx reverse proxy) |
| Python Env | `/home/iwagschal/aeyecorp/.venv` |
| Frontend Repo | `iwagschal-source/v0-master-roofing-ai-2-1u` |
| Vercel Project | `v0-master-roofing-ai-2-1u` |

---

## Quick Reference URLs

| Service | URL |
|---------|-----|
| **Vercel Production** | https://v0-master-roofing-ai-2-1u-iwagschal-2035s-projects.vercel.app |
| **Backend API (HTTPS)** | https://34.95.128.208 |
| **WebSocket Chat (WSS)** | wss://34.95.128.208/ws/chat |
| **WebSocket Voice (WSS)** | wss://34.95.128.208/ws/voice |
| **TTS Endpoint** | POST https://34.95.128.208/v1/tts |
| **Backend API (HTTP)** | http://34.95.128.208:8000 |
| **Vercel Dashboard** | https://vercel.com/iwagschal-2035s-projects/v0-master-roofing-ai-2-1u |

---

## SSH Access to VM

**IMPORTANT**: Direct SSH fails. Use gcloud instead:

```bash
# ❌ This FAILS:
ssh iwagschal@34.95.128.208

# ✅ This WORKS:
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b

# Run commands directly:
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="<command>"
```

---

## Frontend Deployment (Vercel)

### Method 1: Push to GitHub (Triggers Auto-Deploy)

```bash
cd /home/iwagschal/v0-master-roofing-ai-2-1u

# Configure git remote with token
git remote set-url origin https://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@github.com/iwagschal-source/v0-master-roofing-ai-2-1u.git

# Push to main (Vercel deploys from main)
git push origin dev:main --force
```

### Method 2: Vercel API (Bypasses Git Author Issues)

If CLI deploy fails with "Git author must have access", use API:

```bash
# Deploy to Production via API
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer d0WR4GGv4kamiirHKX3Vv6yC" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "v0-master-roofing-ai-2-1u",
    "gitSource": {
      "type": "github",
      "repoId": "1115142135",
      "ref": "main"
    },
    "target": "production"
  }'
```

### Method 3: Vercel CLI

```bash
cd /home/iwagschal/v0-master-roofing-ai-2-1u

# Link project (first time only)
npx vercel link --yes --token d0WR4GGv4kamiirHKX3Vv6yC

# Deploy
npx vercel --prod --token d0WR4GGv4kamiirHKX3Vv6yC
```

### Vercel Environment Variables

```bash
# Set env vars
echo "https://34.95.128.208" | npx vercel env add NEXT_PUBLIC_API_URL production --token d0WR4GGv4kamiirHKX3Vv6yC
echo "wss://34.95.128.208/ws/chat" | npx vercel env add NEXT_PUBLIC_WS_URL production --token d0WR4GGv4kamiirHKX3Vv6yC
echo "wss://34.95.128.208/ws/voice" | npx vercel env add NEXT_PUBLIC_WS_VOICE_URL production --token d0WR4GGv4kamiirHKX3Vv6yC

# List env vars
npx vercel env ls --token d0WR4GGv4kamiirHKX3Vv6yC
```

---

## Backend Deployment (VM)

### Restart Uvicorn Backend

```bash
# Get current PID
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="ps aux | grep uvicorn | grep -v grep"

# Kill and restart (replace PID)
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="sudo kill <PID>; sleep 2; cd /home/iwagschal/aeyecorp && sudo -u iwagschal bash -c 'source .venv/bin/activate && nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 >/dev/null 2>&1 &'"
```

### Update Backend .env

```bash
# View current config
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="cat /home/iwagschal/aeyecorp/.env"

# Update OpenAI model
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="sed -i 's/OPENAI_MODEL=.*/OPENAI_MODEL=gpt-5-mini/' /home/iwagschal/aeyecorp/.env"
```

### HTTPS/SSL Configuration (Nginx)

Backend uses nginx for SSL termination:

```bash
# View nginx config
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="cat /etc/nginx/sites-available/mr-api"

# Restart nginx
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="sudo systemctl restart nginx"

# Check nginx status
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="sudo systemctl status nginx"
```

SSL cert location: `/etc/nginx/ssl/nginx.crt` (self-signed)

---

## Common Errors & Solutions

### Error: "pnpm install exited with 1" on Vercel

**Cause:** Conflicting lockfiles (pnpm-lock.yaml + package-lock.json)

**Solution:**
```bash
# Remove pnpm lockfile
rm pnpm-lock.yaml

# Add vercel.json to force npm
cat > vercel.json << 'EOF'
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
EOF

# Commit and push
git add -A && git commit -m "Fix: force npm install" && git push origin dev:main --force
```

### Error: "Git author must have access to team"

**Cause:** Vercel CLI checks git author against team members

**Solution:** Use Vercel API instead of CLI (see Method 2 above)

### Error: "Not connected to server" in browser

**Cause:** Browser rejects self-signed SSL certificate for WebSocket

**Solution:**
1. Open new tab: https://34.95.128.208
2. Click "Advanced" → "Proceed to 34.95.128.208 (unsafe)"
3. Refresh the app

### Error: "Write access to repository not granted" (git push)

**Cause:** Git remote URL doesn't have token

**Solution:**
```bash
git remote set-url origin https://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@github.com/iwagschal-source/v0-master-roofing-ai-2-1u.git
git push origin dev
```

### Error: Main and dev branches diverged

**Cause:** Different development histories

**Solution:**
```bash
# Force push dev to main (overwrites main)
git push origin dev:main --force
```

### Error: Vercel deploys from wrong branch

**Cause:** Vercel production branch set to `main` but changes on `dev`

**Solution:** Either:
1. Change Vercel settings: Project → Settings → Git → Production Branch → `dev`
2. Or force push dev to main: `git push origin dev:main --force`

### Error: SSH "Permission denied"

**Cause:** Direct SSH not configured

**Solution:** Use gcloud instead:
```bash
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b
```

### Error: Can't kill uvicorn process (permission denied)

**Cause:** Process owned by `iwagschal` user

**Solution:** Use sudo:
```bash
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="sudo kill <PID>"
```

---

## GCP Firewall Ports

| Port | Purpose | Rule Name |
|------|---------|-----------|
| 22 | SSH | allow-ssh-dev-only |
| 80 | HTTP (redirects to HTTPS) | default-allow-http |
| 443 | HTTPS (nginx SSL) | default-allow-https |
| 3000 | Next.js production | allow-frontend-3000 |
| 3001 | Next.js dev server | allow-frontend-3001 |
| 8000 | Uvicorn backend | allow-8000 |

Open new port:
```bash
gcloud compute firewall-rules create allow-port-XXXX --allow=tcp:XXXX
```

---

## File Locations

### Frontend (Local: `/home/iwagschal/v0-master-roofing-ai-2-1u/`)

| File | Purpose |
|------|---------|
| `hooks/useWebSocketChat.ts` | WebSocket streaming hook (text) |
| `hooks/useVoiceWebSocket.ts` | WebSocket voice hook |
| `hooks/useAudioCapture.ts` | Microphone audio capture |
| `components/ko/phase-tracker.jsx` | Progressive disclosure UI |
| `components/ko/streaming-response.jsx` | Streaming text display |
| `components/ko/voice-indicator.jsx` | Recording indicator UI |
| `components/ko/voice-toggle.jsx` | Voice mode toggle button |
| `components/ko/chat-shell.jsx` | Main chat container |
| `components/ko/conversation-pane.jsx` | Chat UI with voice integration |
| `.env.local` | Local env vars (gitignored) |
| `vercel.json` | Vercel build config |

### Backend (VM: `/home/iwagschal/aeyecorp/`)

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app + WebSocket endpoints |
| `app/chief_agent.py` | Orchestration + streaming |
| `app/ws_manager.py` | WebSocket connection manager |
| `app/gemini_orchestrator.py` | Gemini routing |
| `app/tools/claude_sql.py` | SQL agent |
| `app/voice/__init__.py` | Voice module exports |
| `app/voice/deepgram_stt.py` | Deepgram STT client |
| `app/voice/elevenlabs_tts.py` | ElevenLabs TTS client |
| `app/voice/voice_agent.py` | Voice session manager |
| `.env` | Backend config (API keys, model) |

### Nginx Config (VM)

| File | Purpose |
|------|---------|
| `/etc/nginx/sites-available/mr-api` | Reverse proxy config |
| `/etc/nginx/ssl/nginx.crt` | SSL certificate |
| `/etc/nginx/ssl/nginx.key` | SSL private key |

---

## Verification Commands

### Check Backend Health
```bash
curl -sk https://34.95.128.208/
# Expected: {"message":"Chief Agent API","version":"1.0.0",...}
```

### Check WebSocket
```bash
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="python3 -c \"
import asyncio, websockets, json
async def test():
    async with websockets.connect('wss://34.95.128.208/ws/chat', ssl=True) as ws:
        msg = await ws.recv()
        print('Connected:', json.loads(msg))
asyncio.run(test())
\""
```

### Check Vercel Deployments
```bash
npx vercel ls --token d0WR4GGv4kamiirHKX3Vv6yC
```

### Check Uvicorn Process
```bash
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="ps aux | grep uvicorn"
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                         │
│  v0-master-roofing-ai-2-1u-iwagschal-2035s-projects.vercel.app │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WSS (wss://34.95.128.208/ws/chat)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Port 443)                          │
│  SSL Termination + WebSocket Upgrade                         │
│  /etc/nginx/sites-available/mr-api                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (localhost:8000)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    UVICORN (Port 8000)                       │
│  /home/iwagschal/aeyecorp               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Phase 0: Project Resolution (Gemini)                │    │
│  │ Phase 1: Query Routing (Gemini)                     │    │
│  │ Phase 2: Tool Execution (Claude SQL, Vertex, etc)   │    │
│  │ Phase 3: Result Merge (Gemini)                      │    │
│  │ Phase 4: CEO Response (OpenAI gpt-5-mini)           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Checklist

### Before Deploying Frontend:
- [ ] All changes committed to dev branch
- [ ] vercel.json exists with npm install command
- [ ] No pnpm-lock.yaml in repo
- [ ] Env vars set in Vercel (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_WS_VOICE_URL)

### Before Deploying Backend:
- [ ] .env has correct OPENAI_MODEL
- [ ] Uvicorn running with --reload
- [ ] Nginx running and configured
- [ ] Port 443 open in GCP firewall

### After Deployment:
- [ ] Accept SSL cert at https://34.95.128.208 in browser
- [ ] Test WebSocket connection
- [ ] Test chat with a question

---

## Last Updated
2026-01-02

## Current Configuration
- **OpenAI Model**: gpt-5-mini
- **Frontend Branch**: main (synced with dev)
- **SSL**: Self-signed certificate (users must accept)
- **WebSocket**: Streaming enabled with progressive disclosure
- **Voice STT**: Deepgram Nova-2 (STUB_DEEPGRAM=false)
- **Voice TTS**: ElevenLabs Flash v2.5 (STUB_ELEVENLABS=false)

## Bug Fixes Log (2026-01-02)

### Voice Recognition Fixes
1. **HomeScreen dummy mic handler** - HomeScreen was using a fake mic toggle that only changed local state. Fixed by adding real `useVoiceWebSocket` hook.
2. **AudioContext suspension** - Browser autoplay policy was blocking audio. Fixed by calling `audioContext.resume()` before recording.
3. **Side panel opening during voice** - KOStage panel was incorrectly appearing when voice activated. Fixed by removing `koState` from `isWorkspaceVisible` condition in `page.jsx`.

### Files Modified
- `components/ko/home-screen.jsx` - Added voice WebSocket integration
- `hooks/useAudioCapture.ts` - Added AudioContext resume
- `app/page.jsx` - Fixed side panel visibility logic
