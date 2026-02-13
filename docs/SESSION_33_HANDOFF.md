# Session 33 Handoff

**Date:** 2026-02-12
**Branch:** `feature/workbook-rebuild`
**Last commit:** `727c3e7 merge: feature/cleanup — Phase 0B/0C dead code removal + consolidation`

---

## What We Did

### 1. Reviewed BTX Route
- File: `app/api/ko/takeoff/[projectId]/btx/route.js` (116 lines)
- Proxies to Python backend at `http://136.111.252.120:8000`
- Two endpoints:
  - **POST** — Generates per-floor BTX files via `/bluebeam/generate-btx-per-floor`, returns zip
  - **GET** — Checks readiness (has selectedItems + columns?)

### 2. Started Python Backend (aeyecorp)
- Location: `/home/iwagschal/aeyecorp`
- Start script: `./start.sh` → `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- **Server was NOT running** — started it manually
- No systemd service or Docker setup — must be started manually each time
- Health check confirmed: `curl http://136.111.252.120:8000/health` → healthy
- All integrations running (no stubs): OpenAI, Anthropic, GCP, HubSpot, PowerBI, Gemini
- Bluebeam endpoint confirmed reachable: `/bluebeam/generate-btx-per-floor` (POST only, 405 on GET = correct)

### 3. Backend Architecture (aeyecorp/app/main.py — 799 lines)
- FastAPI app: "Chief Agent API"
- Registered routers: Model Arena, Faigy Trainer, Agent API, **Bluebeam**, Takeoff, Agent Factory
- Bluebeam router: `from app.bluebeam.api import router as bluebeam_router`
- WebSocket endpoints: `/ws/chat`, `/ws/network`, `/ws/voice`
- Port 8000 (via start.sh), NOT port 443 (dead code in `__main__`)

---

## Server Status at End of Session
- **Python backend (aeyecorp):** RUNNING on port 8000 (background process, will stop if terminal closes)
- **Next.js app:** Not started this session

---

## Next Session TODO
- [ ] Consider setting up systemd service for aeyecorp so it auto-starts
- [ ] Test actual BTX generation end-to-end (POST with real project config)
- [ ] Review `app/bluebeam/api.py` for full Bluebeam endpoint inventory
- [ ] Continue template update work (6 code spots — see MEMORY.md)

---

## Key Paths
| What | Path |
|------|------|
| Next.js app | `~/v0-master-roofing-ai-2-1u` |
| Python backend | `~/aeyecorp` |
| Backend start | `~/aeyecorp/start.sh` |
| BTX route (Next.js) | `app/api/ko/takeoff/[projectId]/btx/route.js` |
| Bluebeam router (Python) | `aeyecorp/app/bluebeam/api.py` |
| Backend main | `aeyecorp/app/main.py` |
| Template audit | `~/proposal-library-extraction/TEMPLATE_CHANGE_AUDIT.md` |
| Architecture Bible | `~/v0-master-roofing-ai-2-1u/docs/` |
