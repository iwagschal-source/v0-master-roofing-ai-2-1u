# WebSocket Streaming + Progressive Disclosure Implementation

> **PURPOSE**: This document enables any Claude instance to continue this implementation from any point. Read this fully before proceeding.

---

## Project Context

### What This Is
Master Roofing (MR) has a multi-agent AI system for their CEO. Currently, the chat interface:
- Sends a question
- Waits 5-15 seconds with no feedback
- Returns complete response

### What We're Building
Real-time streaming that shows the user:
- What phase the system is in
- What tools are being queried
- Results as they arrive
- Response text streaming token-by-token

This WebSocket infrastructure will later support voice I/O and avatar integration (HeyGen).

---

## System Architecture

### Current Flow (Blocking)
```
User → POST /v1/chat → Wait for all 5 phases → Return JSON
```

### Target Flow (Streaming)
```
User → WebSocket /ws/chat → Stream events per phase → Progressive UI
```

### The 5 Phases
| Phase | Name | What Happens |
|-------|------|--------------|
| 0 | Project Resolution | Gemini extracts project names → queries v_project_lookup → returns project_ids |
| 1 | Routing | Gemini decides which tools to call (claude_sql, vertex_search, hubspot, powerbi) |
| 2 | Tool Execution | Each tool runs filtered by project_ids |
| 3 | Merge | Gemini combines tool outputs into summary |
| 4 | CEO Response | OpenAI composes final human-friendly answer |

---

## Access Information

### Production VM
```bash
# Connect via gcloud (this works from the dev machine)
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="<command>"

# VM Details
Host: 34.95.128.208
Internal IP: 10.158.0.2
User: iwagschal
Backend Path: /home/muddassir/apps/multi-agent-mvp/backend
Port: 8000 (uvicorn with --reload)
HTTPS Port: 443 (nginx reverse proxy with SSL termination)
```

### HTTPS/WSS Configuration
The backend uses nginx as a reverse proxy with SSL termination:
- **HTTPS API**: `https://34.95.128.208`
- **WSS WebSocket**: `wss://34.95.128.208/ws/chat`
- **SSL Certificate**: Self-signed at `/etc/nginx/ssl/nginx.crt`
- **Nginx Config**: `/etc/nginx/sites-available/mr-api`

```nginx
# Key nginx config for WebSocket support
location /ws/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

### OpenAI Model Configuration
- **Model**: `gpt-5-mini` (configured in `/home/muddassir/apps/multi-agent-mvp/backend/.env`)
- To change model: Edit `OPENAI_MODEL` in `.env` and restart uvicorn

### Local Development Machine
```
/home/iwagschal/
├── MR_MULTI_AGENT_SYSTEM.md          # Full system documentation
├── DEPLOYMENT_GUIDE.md               # How to deploy changes
├── WEBSOCKET_STREAMING_IMPLEMENTATION.md  # THIS FILE
├── chief_agent_v2.py                 # Local copy of chief agent
├── gemini_orchestrator_v2.py         # Local copy of orchestrator
├── claude_sql_v2.py                  # Local copy of SQL agent
├── vertex_search_v2.py               # Local copy of doc search
├── hubspot_v2.py                     # Local copy of HubSpot tool
├── deploy.sh                         # Deployment script
└── v0-master-roofing-ai-2-1u/        # Frontend (Next.js on Vercel)
```

### File Mapping (Local → VM)
```
LOCAL (_v2.py)                    →  VM (.py)
─────────────────────────────────────────────────────────
gemini_orchestrator_v2.py         →  app/gemini_orchestrator.py
chief_agent_v2.py                 →  app/chief_agent.py
claude_sql_v2.py                  →  app/tools/claude_sql.py
vertex_search_v2.py               →  app/tools/vertex_search.py
hubspot_v2.py                     →  app/tools/hubspot.py
```

### Deployment
```bash
# From local machine
./deploy.sh

# Or manually via scp
scp /home/iwagschal/chief_agent_v2.py iwagschal@34.95.128.208:/home/muddassir/apps/multi-agent-mvp/backend/app/chief_agent.py
```

---

## Implementation Plan

### Phase 1: Backend WebSocket Foundation (3-4 hours)

#### Step 1.1: Add websockets dependency
**File:** VM `/home/muddassir/apps/multi-agent-mvp/backend/requirements.txt`
```
# Add this line
websockets>=12.0
```

Then on VM:
```bash
cd /home/muddassir/apps/multi-agent-mvp/backend
source .venv/bin/activate
pip install websockets
```

#### Step 1.2: Create WebSocket Manager
**File:** VM `/home/muddassir/apps/multi-agent-mvp/backend/app/ws_manager.py` (NEW)
```python
"""
WebSocket Connection Manager
Handles active connections and broadcasting events.
"""
from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for streaming chat."""

    def __init__(self):
        # session_id -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected: {session_id}")

    def disconnect(self, session_id: str):
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected: {session_id}")

    async def send_event(self, session_id: str, event: dict):
        """Send an event to a specific session."""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_json(event)
            except Exception as e:
                logger.error(f"Error sending to {session_id}: {e}")
                self.disconnect(session_id)

    async def send_phase_start(self, session_id: str, phase: str, message: str):
        """Send phase start event."""
        await self.send_event(session_id, {
            "type": "phase_start",
            "phase": phase,
            "message": message
        })

    async def send_phase_complete(self, session_id: str, phase: str, data: dict = None):
        """Send phase complete event."""
        await self.send_event(session_id, {
            "type": "phase_complete",
            "phase": phase,
            "data": data or {}
        })

    async def send_tool_start(self, session_id: str, tool: str):
        """Send tool execution start event."""
        await self.send_event(session_id, {
            "type": "tool_start",
            "tool": tool,
            "message": f"Querying {tool}..."
        })

    async def send_tool_complete(self, session_id: str, tool: str, summary: str):
        """Send tool execution complete event."""
        await self.send_event(session_id, {
            "type": "tool_complete",
            "tool": tool,
            "summary": summary
        })

    async def send_text_chunk(self, session_id: str, chunk: str):
        """Send a text chunk for streaming response."""
        await self.send_event(session_id, {
            "type": "text_chunk",
            "content": chunk
        })

    async def send_complete(self, session_id: str, sources: list = None):
        """Send response complete event."""
        await self.send_event(session_id, {
            "type": "response_complete",
            "sources": sources or []
        })

    async def send_error(self, session_id: str, error: str):
        """Send error event."""
        await self.send_event(session_id, {
            "type": "error",
            "message": error
        })


# Global instance
ws_manager = WebSocketManager()
```

#### Step 1.3: Add Event Types to Schemas
**File:** VM `/home/muddassir/apps/multi-agent-mvp/backend/app/schemas.py` (MODIFY)
```python
# Add to existing schemas.py
from enum import Enum

class WSEventType(str, Enum):
    CONNECTED = "connected"
    PHASE_START = "phase_start"
    PHASE_COMPLETE = "phase_complete"
    TOOL_START = "tool_start"
    TOOL_COMPLETE = "tool_complete"
    TEXT_CHUNK = "text_chunk"
    RESPONSE_COMPLETE = "response_complete"
    ERROR = "error"
```

#### Step 1.4: Add WebSocket Endpoint
**File:** VM `/home/muddassir/apps/multi-agent-mvp/backend/app/main.py` (MODIFY)

Add these imports at top:
```python
from fastapi import WebSocket, WebSocketDisconnect
from app.ws_manager import ws_manager
from app.chief_agent import run_chief_agent_streaming  # Will create in Phase 2
import uuid
```

Add this endpoint after the existing routes:
```python
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for streaming chat.

    Client sends: {"message": "user question", "session_id": "optional"}
    Server streams: Multiple events (phase_start, tool_complete, text_chunk, etc.)
    """
    session_id = str(uuid.uuid4())
    await ws_manager.connect(websocket, session_id)

    try:
        # Send connection confirmation
        await ws_manager.send_event(session_id, {
            "type": "connected",
            "session_id": session_id
        })

        while True:
            # Wait for message from client
            data = await websocket.receive_json()
            message = data.get("message", "")

            if not message.strip():
                await ws_manager.send_error(session_id, "Message cannot be empty")
                continue

            # Get optional context
            context = data.get("context")

            # Stream the response
            try:
                async for event in run_chief_agent_streaming(
                    user_message=message,
                    context=context,
                    session_id=session_id
                ):
                    await ws_manager.send_event(session_id, event)
            except Exception as e:
                logger.error(f"Streaming error: {e}", exc_info=True)
                await ws_manager.send_error(session_id, str(e))

    except WebSocketDisconnect:
        ws_manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        ws_manager.disconnect(session_id)
```

---

### Phase 2: Streaming Chief Agent (4-5 hours)

#### Step 2.1-2.5: Create Streaming Version
**File:** VM `/home/muddassir/apps/multi-agent-mvp/backend/app/chief_agent.py` (MODIFY)

Add this new function (keep existing `run_chief_agent` for backwards compatibility):

```python
async def run_chief_agent_streaming(
    user_message: str,
    context: Dict[str, Any] | None = None,
    conversation_history: List[Dict[str, str]] | None = None,
    session_id: str | None = None
):
    """
    Streaming version of chief agent - yields events at each phase.

    Yields events:
        {"type": "phase_start", "phase": "...", "message": "..."}
        {"type": "phase_complete", "phase": "...", "data": {...}}
        {"type": "tool_start", "tool": "..."}
        {"type": "tool_complete", "tool": "...", "summary": "..."}
        {"type": "text_chunk", "content": "..."}
        {"type": "response_complete", "sources": [...]}
    """
    sources: List[Dict[str, str]] = []

    try:
        # ============================================================
        # PHASE 0: PROJECT RESOLUTION
        # ============================================================
        yield {
            "type": "phase_start",
            "phase": "project_resolution",
            "message": "Identifying projects in your question..."
        }

        project_resolution = await gemini_orchestrator.resolve_projects(
            user_message=user_message
        )

        project_ids = project_resolution.get("project_ids", [])
        resolved_projects = project_resolution.get("resolved_projects", {})

        yield {
            "type": "phase_complete",
            "phase": "project_resolution",
            "data": {
                "found": len(project_ids),
                "projects": list(resolved_projects.keys()) if resolved_projects else []
            }
        }

        # ============================================================
        # PHASE 1: GEMINI ROUTING
        # ============================================================
        yield {
            "type": "phase_start",
            "phase": "routing",
            "message": "Analyzing your question..."
        }

        routing = await gemini_orchestrator.route_query(
            user_message=user_message,
            context=context,
            conversation_history=conversation_history,
            project_ids=project_ids
        )

        tools = routing.get("tools", [])
        tool_inputs = routing.get("tool_inputs", {})
        routing_reasoning = routing.get("reasoning", "")

        yield {
            "type": "phase_complete",
            "phase": "routing",
            "data": {
                "tools": tools,
                "reasoning": routing_reasoning
            }
        }

        # ============================================================
        # PHASE 2: TOOL EXECUTION (with per-tool events)
        # ============================================================
        gathered_data: Dict[str, Any] = {}
        inputs = tool_inputs or {}

        if "vertex_search" in tools:
            yield {"type": "tool_start", "tool": "vertex_search", "message": "Searching documents..."}
            try:
                query = inputs.get("vertex_search", user_message)
                response = await vertex_search.search(query, project_ids=project_ids)
                docs = response['result']
                gathered_data["documents"] = docs
                gathered_data['summary'] = response['summary']
                sources = build_sources_from_vertex(docs)
                yield {
                    "type": "tool_complete",
                    "tool": "vertex_search",
                    "summary": f"Found {len(docs)} documents"
                }
            except Exception as e:
                logger.error(f"vertex_search error: {e}")
                yield {"type": "tool_complete", "tool": "vertex_search", "summary": f"Error: {str(e)}"}
                gathered_data["documents"] = {"error": str(e)}

        if "claude_sql" in tools:
            yield {"type": "tool_start", "tool": "bigquery", "message": "Querying analytics..."}
            try:
                query = inputs.get("claude_sql", user_message)
                sql = await claude_sql.generate_sql(query, project_ids=project_ids)
                rows = await bigquery.run(sql)
                gathered_data["analytics"] = {"sql": sql, "results": rows}
                row_count = len(rows) if isinstance(rows, list) else 1
                yield {
                    "type": "tool_complete",
                    "tool": "bigquery",
                    "summary": f"Returned {row_count} row(s)"
                }
            except Exception as e:
                logger.error(f"claude_sql/bigquery error: {e}")
                yield {"type": "tool_complete", "tool": "bigquery", "summary": f"Error: {str(e)}"}
                gathered_data["analytics"] = {"error": str(e)}

        if "hubspot" in tools:
            yield {"type": "tool_start", "tool": "hubspot", "message": "Checking CRM..."}
            try:
                query = inputs.get("hubspot", user_message)
                crm = await hubspot.search(query, project_ids=project_ids)
                gathered_data["crm"] = crm
                yield {
                    "type": "tool_complete",
                    "tool": "hubspot",
                    "summary": "CRM data retrieved"
                }
            except Exception as e:
                logger.error(f"hubspot error: {e}")
                yield {"type": "tool_complete", "tool": "hubspot", "summary": f"Error: {str(e)}"}
                gathered_data["crm"] = {"error": str(e)}

        if "powerbi" in tools:
            yield {"type": "tool_start", "tool": "powerbi", "message": "Preparing visualization..."}
            try:
                bigquery_data = gathered_data.get("analytics")
                custom_view = await powerbi.generate_custom_view(user_message, bigquery_data)
                gathered_data["powerbi"] = custom_view
                yield {
                    "type": "tool_complete",
                    "tool": "powerbi",
                    "summary": "Visualization ready"
                }
            except Exception as e:
                logger.error(f"powerbi error: {e}")
                yield {"type": "tool_complete", "tool": "powerbi", "summary": f"Error: {str(e)}"}
                gathered_data["powerbi"] = {"error": str(e)}

        # ============================================================
        # PHASE 3: GEMINI MERGE
        # ============================================================
        yield {
            "type": "phase_start",
            "phase": "merge",
            "message": "Synthesizing findings..."
        }

        merged_data = await gemini_orchestrator.merge_results(
            gathered_data=gathered_data,
            user_message=user_message,
            routing=routing
        )

        yield {
            "type": "phase_complete",
            "phase": "merge",
            "data": {
                "insights_count": len(merged_data.get("insights", []))
            }
        }

        # ============================================================
        # PHASE 4: OPENAI CEO RESPONSE (STREAMING)
        # ============================================================
        yield {
            "type": "phase_start",
            "phase": "response",
            "message": "Composing answer..."
        }

        # Stream the response token by token
        async for chunk in stream_ceo_response(
            user_message=user_message,
            merged_data=merged_data,
            context=context,
            conversation_history=conversation_history,
            resolved_projects=resolved_projects
        ):
            yield {
                "type": "text_chunk",
                "content": chunk
            }

        # ============================================================
        # COMPLETE
        # ============================================================
        yield {
            "type": "response_complete",
            "sources": sources
        }

    except Exception as e:
        logger.error(f"Streaming chief agent error: {e}", exc_info=True)
        yield {
            "type": "error",
            "message": str(e)
        }


async def stream_ceo_response(
    user_message: str,
    merged_data: Dict[str, Any],
    context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    resolved_projects: Optional[Dict[str, Any]] = None
):
    """
    Stream OpenAI CEO response token by token.

    Yields: string chunks
    """
    has_context = bool(context and context.get("previous_visualization"))

    # Stub mode - yield all at once
    if settings.STUB_OPENAI:
        summary = merged_data.get("summary", "No summary available")
        insights = merged_data.get("insights", [])
        insights_text = "\n".join(f"- {i}" for i in insights) if insights else "No specific insights."

        stub_response = (
            f"[DEVELOPMENT MODE]\n\n"
            f"Your question: {user_message}\n\n"
            f"**Summary:** {summary}\n\n"
            f"**Insights:**\n{insights_text}"
        )

        # Simulate streaming by chunking
        words = stub_response.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
        return

    # Real OpenAI streaming
    try:
        context_info = ""
        if has_context:
            prev_viz = context["previous_visualization"]
            context_info = f"\n\nCONTEXT: User previously asked '{prev_viz.get('original_question')}' and saw a {prev_viz.get('type')} visualization."

        if resolved_projects:
            project_names = [p.get("project_name", k) for k, p in resolved_projects.items() if p.get("project_id")]
            if project_names:
                context_info += f"\n\nPROJECTS IN SCOPE: {', '.join(project_names)}"

        ceo_prompt = CEO_CONTEXT_RESPONSE_PROMPT if has_context else CEO_RESPONSE_PROMPT

        messages = [{"role": "system", "content": ceo_prompt}]

        if conversation_history:
            for msg in conversation_history[-8:]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"][:1000]
                })

        merged_str = json.dumps(merged_data, indent=2, default=str)
        messages.append({
            "role": "user",
            "content": f"CEO Question: {user_message}{context_info}\n\nMerged Data Summary:\n{merged_str}\n\nPlease provide a clear, helpful answer for the CEO."
        })

        # Stream with OpenAI
        stream = openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error(f"Error in streaming CEO response: {e}")
        yield f"I encountered an issue: {str(e)}"
```

---

### Phase 3: Frontend WebSocket Client (3-4 hours)

#### Step 3.1-3.4: Create WebSocket Hook
**File:** Local `/home/iwagschal/v0-master-roofing-ai-2-1u/hooks/useWebSocketChat.ts` (NEW)

```typescript
/**
 * useWebSocketChat Hook
 * Manages WebSocket connection for streaming chat with progressive disclosure.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

// Event types from backend
type WSEventType =
  | 'connected'
  | 'phase_start'
  | 'phase_complete'
  | 'tool_start'
  | 'tool_complete'
  | 'text_chunk'
  | 'response_complete'
  | 'error';

interface WSEvent {
  type: WSEventType;
  phase?: string;
  message?: string;
  data?: Record<string, any>;
  tool?: string;
  summary?: string;
  content?: string;
  sources?: Array<{ id: string; title: string; url: string; snippet?: string }>;
  session_id?: string;
}

interface Phase {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
  data?: Record<string, any>;
}

interface Tool {
  name: string;
  status: 'active' | 'complete' | 'error';
  summary?: string;
}

interface UseWebSocketChatReturn {
  // Connection state
  isConnected: boolean;
  sessionId: string | null;

  // Progress state
  phases: Phase[];
  currentPhase: string | null;
  tools: Tool[];

  // Response state
  streamingText: string;
  isComplete: boolean;
  sources: Array<{ id: string; title: string; url: string; snippet?: string }>;
  error: string | null;

  // Actions
  sendMessage: (message: string, context?: Record<string, any>) => void;
  reset: () => void;
  disconnect: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://34.95.128.208:8000/ws/chat';

const PHASE_ORDER = ['project_resolution', 'routing', 'merge', 'response'];
const PHASE_LABELS: Record<string, string> = {
  project_resolution: 'Identifying Projects',
  routing: 'Analyzing Question',
  merge: 'Synthesizing',
  response: 'Composing Answer'
};

export function useWebSocketChat(): UseWebSocketChatReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Progress state
  const [phases, setPhases] = useState<Phase[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);

  // Response state
  const [streamingText, setStreamingText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [sources, setSources] = useState<WSEvent['sources']>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize phases
  const initializePhases = useCallback(() => {
    setPhases(PHASE_ORDER.map(name => ({
      name,
      status: 'pending',
      message: PHASE_LABELS[name]
    })));
    setTools([]);
    setStreamingText('');
    setIsComplete(false);
    setSources([]);
    setError(null);
    setCurrentPhase(null);
  }, []);

  // Handle incoming events
  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'connected':
        setSessionId(event.session_id || null);
        break;

      case 'phase_start':
        if (event.phase) {
          setCurrentPhase(event.phase);
          setPhases(prev => prev.map(p =>
            p.name === event.phase
              ? { ...p, status: 'active', message: event.message || p.message }
              : p
          ));
        }
        break;

      case 'phase_complete':
        if (event.phase) {
          setPhases(prev => prev.map(p =>
            p.name === event.phase
              ? { ...p, status: 'complete', data: event.data }
              : p
          ));
        }
        break;

      case 'tool_start':
        if (event.tool) {
          setTools(prev => [...prev, {
            name: event.tool!,
            status: 'active'
          }]);
        }
        break;

      case 'tool_complete':
        if (event.tool) {
          setTools(prev => prev.map(t =>
            t.name === event.tool
              ? { ...t, status: 'complete', summary: event.summary }
              : t
          ));
        }
        break;

      case 'text_chunk':
        if (event.content) {
          setStreamingText(prev => prev + event.content);
        }
        break;

      case 'response_complete':
        setIsComplete(true);
        setSources(event.sources || []);
        setCurrentPhase(null);
        break;

      case 'error':
        setError(event.message || 'Unknown error');
        setCurrentPhase(null);
        break;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        handleEvent(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
    };

    wsRef.current = ws;
  }, [handleEvent]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  // Send message
  const sendMessage = useCallback((message: string, context?: Record<string, any>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected');
      return;
    }

    // Reset state for new message
    initializePhases();

    // Send message
    wsRef.current.send(JSON.stringify({
      message,
      context
    }));
  }, [initializePhases]);

  // Reset state
  const reset = useCallback(() => {
    initializePhases();
  }, [initializePhases]);

  // Disconnect
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return {
    isConnected,
    sessionId,
    phases,
    currentPhase,
    tools,
    streamingText,
    isComplete,
    sources,
    error,
    sendMessage,
    reset,
    disconnect
  };
}
```

---

### Phase 4: Progressive Disclosure UI (3-4 hours)

#### Step 4.1: Create Phase Tracker Component
**File:** Local `/home/iwagschal/v0-master-roofing-ai-2-1u/components/ko/phase-tracker.jsx` (NEW)

```jsx
"use client"

import { Check, Loader2, Circle } from "lucide-react"

const PHASE_ICONS = {
  project_resolution: "🔍",
  routing: "🧠",
  merge: "🔀",
  response: "💬"
}

const PHASE_LABELS = {
  project_resolution: "Identifying Projects",
  routing: "Analyzing Question",
  merge: "Synthesizing",
  response: "Composing Answer"
}

export function PhaseTracker({ phases, tools, currentPhase }) {
  if (!phases || phases.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      {phases.map((phase) => (
        <div key={phase.name} className="flex items-start gap-2">
          {/* Status Icon */}
          <div className="mt-0.5">
            {phase.status === 'complete' && (
              <Check className="w-4 h-4 text-green-500" />
            )}
            {phase.status === 'active' && (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            )}
            {phase.status === 'pending' && (
              <Circle className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>

          {/* Phase Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">{PHASE_ICONS[phase.name]}</span>
              <span className={`text-sm font-medium ${
                phase.status === 'active' ? 'text-primary' :
                phase.status === 'complete' ? 'text-foreground' :
                'text-muted-foreground'
              }`}>
                {PHASE_LABELS[phase.name] || phase.name}
              </span>
            </div>

            {/* Phase data summary */}
            {phase.status === 'complete' && phase.data && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {phase.name === 'project_resolution' && phase.data.projects?.length > 0 && (
                  <>Found: {phase.data.projects.join(', ')}</>
                )}
                {phase.name === 'routing' && phase.data.tools?.length > 0 && (
                  <>Using: {phase.data.tools.join(', ')}</>
                )}
              </p>
            )}

            {/* Tools under routing phase */}
            {phase.name === 'routing' && phase.status === 'complete' && tools.length > 0 && (
              <div className="mt-2 ml-2 space-y-1">
                {tools.map((tool) => (
                  <div key={tool.name} className="flex items-center gap-2">
                    {tool.status === 'complete' ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {tool.name}
                      {tool.summary && `: ${tool.summary}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### Step 4.2: Create Streaming Response Component
**File:** Local `/home/iwagschal/v0-master-roofing-ai-2-1u/components/ko/streaming-response.jsx` (NEW)

```jsx
"use client"

import { useEffect, useRef } from "react"

export function StreamingResponse({ text, isComplete, isActive }) {
  const containerRef = useRef(null)

  // Auto-scroll as text streams
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text])

  if (!text && !isActive) return null

  return (
    <div
      ref={containerRef}
      className="prose prose-sm dark:prose-invert max-w-none"
    >
      <p className="whitespace-pre-wrap">
        {text}
        {!isComplete && isActive && (
          <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse" />
        )}
      </p>
    </div>
  )
}
```

#### Step 4.3-4.4: Update ConversationPane and ChatShell
**File:** Local `/home/iwagschal/v0-master-roofing-ai-2-1u/components/ko/conversation-pane.jsx` (MODIFY)

Add imports:
```jsx
import { PhaseTracker } from "./phase-tracker"
import { StreamingResponse } from "./streaming-response"
```

Add to component props:
```jsx
export function ConversationPane({
  messages,
  onSubmit,
  isThinking,
  // NEW props for streaming
  phases,
  tools,
  currentPhase,
  streamingText,
  isStreamingComplete,
  // ... existing props
}) {
```

In the JSX, after messages map and before the input:
```jsx
{/* Streaming Progress */}
{phases && phases.length > 0 && !isStreamingComplete && (
  <div className="max-w-[80%] space-y-3">
    <PhaseTracker
      phases={phases}
      tools={tools}
      currentPhase={currentPhase}
    />
    {streamingText && (
      <div className="bg-card rounded-xl px-4 py-3 border border-border">
        <StreamingResponse
          text={streamingText}
          isComplete={isStreamingComplete}
          isActive={currentPhase === 'response'}
        />
      </div>
    )}
  </div>
)}
```

**File:** Local `/home/iwagschal/v0-master-roofing-ai-2-1u/components/ko/chat-shell.jsx` (MODIFY)

Replace useChat with useWebSocketChat:
```jsx
import { useWebSocketChat } from "@/hooks/useWebSocketChat"

// In component:
const {
  isConnected,
  phases,
  currentPhase,
  tools,
  streamingText,
  isComplete: isStreamingComplete,
  sources,
  error,
  sendMessage: wsSendMessage,
  reset: wsReset
} = useWebSocketChat()

// Modify submit function to use WebSocket
const submit = async (text) => {
  lastUserQuestionRef.current = text

  // Add user message immediately
  setMessages((prev) => [
    ...prev,
    {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date(),
    },
  ])

  setView("chat")
  setIsThinking(true)

  // Send via WebSocket
  wsSendMessage(text, followUpContext ? {
    previous_visualization: {
      type: followUpContext.type,
      data: followUpContext.chartData,
      original_question: followUpContext.originalQuestion,
    },
  } : undefined)
}

// Watch for streaming completion
useEffect(() => {
  if (isStreamingComplete && streamingText) {
    // Add completed response to messages
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? String(Date.now() + 1),
        role: "assistant",
        content: streamingText,
        sources: sources ?? [],
        timestamp: new Date(),
      },
    ])
    setIsThinking(false)
    wsReset()
  }
}, [isStreamingComplete, streamingText, sources])
```

Pass new props to ConversationPane:
```jsx
<ConversationPane
  {...props}
  messages={messages}
  isThinking={isThinking}
  onSubmit={submit}
  // NEW streaming props
  phases={isThinking ? phases : []}
  tools={tools}
  currentPhase={currentPhase}
  streamingText={streamingText}
  isStreamingComplete={isStreamingComplete}
/>
```

---

## Environment Variables

### Frontend `.env.local` (CURRENT PRODUCTION CONFIG)
```bash
# Backend API URL (HTTPS via nginx reverse proxy)
NEXT_PUBLIC_API_URL=https://34.95.128.208

# WebSocket URL for streaming chat (WSS via nginx reverse proxy)
NEXT_PUBLIC_WS_URL=wss://34.95.128.208/ws/chat
```

### Vercel Environment Variables
Since `.env.local` is gitignored, these must be set in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` = `https://34.95.128.208`
- `NEXT_PUBLIC_WS_URL` = `wss://34.95.128.208/ws/chat`

### Backend `.env` (on VM)
```bash
OPENAI_MODEL=gpt-5-mini
OPENAI_API_KEY=sk-proj-...
STUB_OPENAI=false
```

---

## Testing

### Test Backend WebSocket (WSS)
```bash
# Test via Python (run on VM)
python3 -c "
import asyncio
import websockets
import json

async def test():
    async with websockets.connect('wss://34.95.128.208/ws/chat', ssl=True) as ws:
        print('Connected!')
        msg = await ws.recv()
        print(f'Session: {json.loads(msg)}')
asyncio.run(test())
"
```

### Test Frontend (Dev Server on VM)
```bash
# SSH to VM and run:
cd /home/iwagschal/v0-master-roofing-ai-2-1u
npm run dev

# Access via browser:
http://34.95.128.208:3001
```

**Important**: Before testing in browser, visit `https://34.95.128.208` first to accept the self-signed SSL certificate.

### GCP Firewall Ports
Open ports for this setup:
- `80` - HTTP (redirects to HTTPS)
- `443` - HTTPS (nginx SSL termination)
- `3000` - Production Next.js
- `3001` - Dev Next.js server
- `8000` - Backend uvicorn (internal, proxied via nginx)

---

## Rollback Plan

If something breaks:
1. WebSocket endpoint is additive (doesn't break existing `/v1/chat`)
2. Frontend can fall back to `useChat` hook (keep it as backup)
3. Keep original `run_chief_agent` function (streaming version is separate)

---

## Progress Tracking

### ✅ IMPLEMENTATION COMPLETE (2026-01-01)

### Phase 1: Backend WebSocket Foundation
- [x] 1.1 Add websockets dependency
- [x] 1.2 Create ws_manager.py
- [x] 1.3 Add event types to schemas.py
- [x] 1.4 Add /ws/chat endpoint to main.py

### Phase 2: Streaming Chief Agent
- [x] 2.1-2.4 Create run_chief_agent_streaming function
- [x] 2.5 Create stream_ceo_response function
- [x] 2.6 Wire streaming agent to WebSocket endpoint

### Phase 3: Frontend WebSocket Client
- [x] 3.1 Create useWebSocketChat.ts hook
- [x] 3.2 Handle auto-reconnect
- [x] 3.3 Event state management

### Phase 4: Progressive Disclosure UI
- [x] 4.1 Create phase-tracker.jsx
- [x] 4.2 Create streaming-response.jsx
- [x] 4.3 Update conversation-pane.jsx
- [x] 4.4 Update chat-shell.jsx

### Phase 5: HTTPS/WSS Deployment
- [x] 5.1 Install nginx on VM
- [x] 5.2 Generate self-signed SSL certificate
- [x] 5.3 Configure nginx reverse proxy with WebSocket support
- [x] 5.4 Open ports 80, 443, 3001 in GCP firewall
- [x] 5.5 Update frontend .env.local to use WSS
- [x] 5.6 Upgrade OpenAI model to gpt-5-mini
- [x] 5.7 End-to-end browser testing - **WORKING!**

### Phase 6: Voice Recognition Integration (2026-01-01)
- [x] 6.1 Create voice module at `app/voice/` on VM
  - deepgram_stt.py - Streaming STT with Deepgram Nova-2
  - elevenlabs_tts.py - TTS with ElevenLabs Flash v2.5
  - voice_agent.py - Voice session management
  - __init__.py - Module exports
- [x] 6.2 Add /ws/voice endpoint to main.py
- [x] 6.3 Add /v1/tts endpoint for text-to-speech
- [x] 6.4 Configure Deepgram & ElevenLabs API keys in .env
- [x] 6.5 Create useVoiceWebSocket.ts hook (frontend)
- [x] 6.6 Create useAudioCapture.ts hook (frontend)
- [x] 6.7 Integrate voice into conversation-pane.jsx
- [x] 6.8 Add NEXT_PUBLIC_WS_VOICE_URL to Vercel env
- [x] 6.9 Update requirements.txt with deepgram-sdk & elevenlabs

### Phase 7: Voice Bug Fixes (2026-01-02)
- [x] 7.1 Fix HomeScreen using dummy mic handler (was just toggling local state)
  - Added real `useVoiceWebSocket` hook to home-screen.jsx
  - Added `VoiceIndicator` component for recording feedback
  - Voice now works from both HomeScreen and ConversationPane
- [x] 7.2 Fix AudioContext suspension issue
  - Added `audioContext.resume()` call for browser autoplay policy
- [x] 7.3 Fix side panel incorrectly opening during voice
  - Removed `koState === "thinking" || koState === "speaking"` from `isWorkspaceVisible`
  - Side panel now only opens for actual document/source viewing
- [x] 7.4 Clean up debug console.log statements for production

---

## Resuming Instructions for New Claude Instance

1. Read this file completely: `/home/iwagschal/WEBSOCKET_STREAMING_IMPLEMENTATION.md`
2. Read system context: `/home/iwagschal/MR_MULTI_AGENT_SYSTEM.md`
3. Check progress tracking above to see what's done
4. Access VM via: `gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="..."`
5. Continue from unchecked items

---

## Last Updated
2026-01-02 (Voice Bug Fixes Complete)

## Author
Claude (Opus 4.5) with Isaac Wagschal

## Summary of What's Running
- **Backend**: Uvicorn on port 8000 with WebSocket streaming at `/ws/chat` and `/ws/voice`
- **Nginx**: SSL termination on port 443, proxying to uvicorn
- **Frontend**: Vercel production at https://v0-master-roofing-ai-2-1u-iwagschal-2035s-projects.vercel.app
- **Model**: OpenAI `gpt-5-mini` for CEO responses
- **Streaming**: Full progressive disclosure with phases, tools, and token-by-token response
- **Voice**: Deepgram Nova-2 for STT, ElevenLabs Flash v2.5 for TTS

## Voice Feature Summary

### How Voice Works
1. User clicks mic button or holds Spacebar to start recording
2. Audio captured at 16kHz mono PCM via `useAudioCapture` hook
3. Audio chunks sent to `/ws/voice` WebSocket as base64
4. Backend streams audio to Deepgram for real-time transcription
5. Final transcript triggers 5-phase agent pipeline
6. Response streamed back with same events as text chat
7. TTS available via `/v1/tts` endpoint (on-demand)

### Voice Endpoints
- `wss://34.95.128.208/ws/voice` - Voice WebSocket
- `POST /v1/tts` - Text-to-Speech (returns MP3 stream)

### Voice Environment Variables
```bash
# VM .env
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=rachel
STUB_DEEPGRAM=false
STUB_ELEVENLABS=false

# Vercel
NEXT_PUBLIC_WS_VOICE_URL=wss://34.95.128.208/ws/voice
```
