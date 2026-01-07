# KO Frontend - Cursor Introduction

## Project Overview

This is **KO (Chief Agent Officer)** - a multi-agent AI system for Master Roofing & Siding. The frontend is a Next.js app that provides a CEO-friendly interface for querying 20+ years of company data via natural language.

**Owner:** Isaac Wagschal, CEO of Master Roofing & Siding, Founder of A Eye Corp

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS
- **State:** React hooks (useState, useEffect, useContext)
- **API Client:** Custom fetch wrapper in `lib/api/`
- **Components:** Functional components in `components/ko/`

## Architecture

```
Frontend (this repo)          Backend (separate VM)
Next.js on Vercel      <-->   FastAPI at https://34.95.128.208
                              Location: mr-dev-box-01:/home/iwagschal/aeyecorp/
```

### Key Directories

```
app/                    # Next.js App Router pages
components/
  ko/                   # Main KO interface components
    home-screen.jsx     # Landing/home screen
    chat-interface.jsx  # Main chat UI with WebSocket
    reports-screen.jsx  # Power BI dashboards + CEO KPIs
    documents-screen.jsx # Document viewer
    side-panel.jsx      # Navigation panel
hooks/                  # Custom React hooks
lib/
  api/
    client.ts           # Base API client with error handling
    endpoints.ts        # All API endpoint definitions
    types.ts            # TypeScript types for API responses
```

## Backend API

Base URL: `https://34.95.128.208`

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/v1/chat` | POST | Send chat message |
| `/v1/sessions` | GET/POST | List/create sessions |
| `/v1/sessions/{id}` | GET/DELETE | Get/delete session |
| `/v1/powerbi/dashboards` | GET | List Power BI dashboards |
| `/v1/powerbi/ceo-kpis` | GET | CEO KPIs (velocity, stuck jobs, at-risk) |

### WebSocket

- **Chat:** `wss://34.95.128.208/ws/chat`
- **Voice:** `wss://34.95.128.208/ws/voice`

## API Client Usage

```typescript
import { apiClient } from "@/lib/api"

// Chat
await apiClient.chat.sendMessage({ message, session_id })

// Sessions
await apiClient.sessions.list()
await apiClient.sessions.create()
await apiClient.sessions.get(sessionId)

// Power BI
await apiClient.powerbi.listDashboards()
await apiClient.powerbi.getCeoKpis()
```

## Component Patterns

### State Management
Components use local state with useState. No global state library - keep it simple.

### API Calls
Always in useEffect or event handlers, never during render:
```jsx
useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.sessions.list()
      setData(response)
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [])
```

### Styling
Use Tailwind classes. Follow existing patterns in `components/ko/`.

## 5-Phase Agent Flow

When user sends a message, the backend processes it through 5 phases:

1. **Phase 0:** Gemini extracts project mentions, resolves to project_ids
2. **Phase 1:** Gemini routes to appropriate tools (SQL, Vertex, HubSpot, PowerBI)
3. **Phase 2:** Tools execute with project_id filters
4. **Phase 3:** Gemini merges tool outputs
5. **Phase 4:** OpenAI generates CEO-friendly response (2-3 sentences max)

The frontend shows phase progress in the chat interface.

## Current Features

- Chat with streaming responses (WebSocket)
- Voice input (Deepgram STT) and output (ElevenLabs TTS)
- CEO KPIs dashboard (velocity, stuck jobs, at-risk)
- Power BI dashboard gallery
- Session history
- Progressive disclosure of agent traces

## Code Conventions

1. **Keep it simple** - No over-engineering
2. **Use existing patterns** - Check similar components before creating new ones
3. **Tailwind for styling** - No CSS modules or styled-components
4. **TypeScript for API types** - But JSX components are fine
5. **No unnecessary abstractions** - Direct API calls are OK

## Deployment

```bash
# Deploy to Vercel (auto-deploys on push to main)
git add -A && git commit -m "message" && git push origin dev:main --force
```

## Testing Locally

```bash
npm run dev
# Frontend: http://localhost:3000
# Backend: https://34.95.128.208 (always use prod backend)
```

## Important Notes

- SSL cert is self-signed - browser will warn, accept it
- All data queries go through the backend agents - never query BigQuery directly from frontend
- CEO responses are intentionally brief (2-3 sentences)
- HubSpot is read-only - never create/update records without explicit approval

## Quick Reference

| Resource | Location |
|----------|----------|
| Frontend repo | This directory |
| Backend code | `mr-dev-box-01:/home/iwagschal/aeyecorp/` |
| BigQuery | `master-roofing-intelligence` project |
| Full docs | See `CLAUDE.md` in this repo |
