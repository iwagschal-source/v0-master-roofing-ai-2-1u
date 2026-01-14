# Network Events Documentation

## Overview

Network events enable real-time visualization of agent-to-agent communication on the Network Map. When agents call each other, events are broadcast via WebSocket to show:
- **Blue animations**: Request flowing from source to target
- **Green animations**: Response returning from target to source

## Agent Registry

### All 13 Agents + User

| ID | Name | Type | Has Emit Hooks |
|----|------|------|----------------|
| `USER` | User (Isaac) | Human | N/A (source only) |
| `CAO-GEM-001` | Gemini Orchestrator | Orchestrator | ✅ Yes |
| `CAO-CEO-001` | CEO Response Agent | Worker | ✅ Yes |
| `CAO-SQL-001` | Claude SQL Agent | Worker | ✅ Yes |
| `CAO-VTX-001` | Vertex Search Agent | Worker | ✅ Yes |
| `CAO-HUB-001` | HubSpot CRM Agent | Worker | ✅ Yes |
| `CAO-PBI-001` | Power BI Dashboard Agent | Worker | ✅ Yes |
| `CAO-AUD-001` | System Auditor | Monitor | ❌ Not called in main flow |
| `CAO-PRIME-001` | KO Prime | Super Agent | ❌ Separate endpoint |
| `CAO-TES-*` | Test Agents | Factory | ❌ Dynamic |
| `CAO-EMA-*` | Email Drafters | Factory | ❌ Dynamic |
| `CAO-NEW-*` | Factory Agents | Factory | ❌ Dynamic |

## Current Connections (with emit hooks)

```
USER ─────────────> CAO-GEM-001 (Gemini Orchestrator)
                         │
                         ├──> CAO-VTX-001 (Vertex Search)
                         ├──> CAO-SQL-001 (Claude SQL)
                         ├──> CAO-HUB-001 (HubSpot)
                         ├──> CAO-PBI-001 (Power BI)
                         │
                         └──> CAO-CEO-001 (CEO Response)
```

## How to Add Network Events to a New Agent

### 1. Import the Network Manager

At the top of your agent file or where the agent is called:

```python
from app.network_events import get_network_manager
```

### 2. Emit Call Start (before calling the agent)

```python
nm = get_network_manager()
call_id = await nm.emit_call_start(
    source_id="CAO-GEM-001",      # Who is making the call
    target_id="CAO-NEW-AGENT",    # Who is being called
    call_type="query"             # Type: query, search, compose, visualization
)
await nm.emit_agent_status("CAO-NEW-AGENT", "busy", "Working on request...")
```

### 3. Execute the Agent Call

```python
result = await new_agent.execute(query)
```

### 4. Emit Call End (after agent returns)

```python
await nm.emit_call_end(call_id, success=True)
await nm.emit_agent_status("CAO-NEW-AGENT", "live", "Ready")
```

### 5. Handle Errors

```python
try:
    result = await new_agent.execute(query)
    await nm.emit_call_end(call_id, success=True)
    await nm.emit_agent_status("CAO-NEW-AGENT", "live", "Ready")
except Exception as e:
    await nm.emit_call_end(call_id, success=False)
    await nm.emit_agent_status("CAO-NEW-AGENT", "error", str(e))
    raise
```

## Complete Example

Adding a new "Email Drafter" agent to the orchestrator:

```python
elif tool == "email_drafter":
    log_email(f"Drafting email...")
    nm = get_network_manager()
    call_id = await nm.emit_call_start("CAO-GEM-001", "CAO-EMA-001", "compose")
    await nm.emit_agent_status("CAO-EMA-001", "busy", "Drafting email...")

    try:
        draft = await email_drafter.compose(user_message, context)
        await nm.emit_call_end(call_id, success=True)
        await nm.emit_agent_status("CAO-EMA-001", "live", "Ready")
        gathered_data["email_draft"] = draft
        traces.append({"tool": "email_drafter", "status": "success"})
    except Exception as e:
        await nm.emit_call_end(call_id, success=False)
        await nm.emit_agent_status("CAO-EMA-001", "error", str(e))
        traces.append({"tool": "email_drafter", "status": "error", "error": str(e)})
```

## WebSocket Events

### Event Types

| Event | Direction | Description |
|-------|-----------|-------------|
| `call_start` | Backend → Frontend | Agent call initiated |
| `call_end` | Backend → Frontend | Agent call completed |
| `agent_status` | Backend → Frontend | Agent status changed |

### Event Payloads

**call_start:**
```json
{
  "type": "call_start",
  "call_id": "CAO-GEM-001->CAO-HUB-001-1705123456.789",
  "source": "CAO-GEM-001",
  "target": "CAO-HUB-001",
  "call_type": "query",
  "timestamp": "2026-01-14T12:00:00.000Z"
}
```

**call_end:**
```json
{
  "type": "call_end",
  "call_id": "CAO-GEM-001->CAO-HUB-001-1705123456.789",
  "success": true,
  "timestamp": "2026-01-14T12:00:03.000Z"
}
```

**agent_status:**
```json
{
  "type": "agent_status",
  "agent_id": "CAO-HUB-001",
  "status": "busy",
  "message": "Querying CRM...",
  "timestamp": "2026-01-14T12:00:00.000Z"
}
```

## Frontend Integration

The Network Map (`agent-network-map-screen.jsx`) automatically:
1. Connects to `/ws/network` WebSocket endpoint
2. Listens for `call_start`, `call_end`, `agent_status` events
3. Shows blue animation for active calls
4. Shows green animation for returning data (1.5s after call_end)
5. Highlights busy agents with orange border

## Agent ID Convention

```
CAO-{TYPE}-{UNIQUE_ID}

Types:
- GEM: Gemini/Orchestrator
- CEO: CEO Response
- SQL: SQL Generation
- VTX: Vertex Search
- HUB: HubSpot CRM
- PBI: Power BI
- AUD: Auditor
- PRIME: KO Prime
- EMA: Email
- TES: Test
- NEW: Factory-created
```

## Files to Modify

When adding a new agent with network events:

1. **Backend** (`aeyecorp/app/chief_agent.py`):
   - Add emit hooks in `run_chief_agent_streaming()` tool execution section

2. **Frontend** (`v0-master-roofing-ai-2-1u/data/agent-data.js`):
   - Add agent definition with position coordinates
   - Add connection definitions

3. **API** (if new endpoint):
   - Ensure `/ws/network` broadcasts are received

## Troubleshooting

### Animation not showing?
1. Check browser console for WebSocket connection
2. Verify agent ID matches exactly (case-sensitive)
3. Check backend logs for `Network: SOURCE -> TARGET (start)`

### Wrong animation direction?
- Source is always the caller, target is always the callee
- Return animation uses same source/target but animates reverse

### Agent not in Network Map?
- Add position in `data/agent-data.js` positions object
- Ensure agent ID is in the `agents` array
