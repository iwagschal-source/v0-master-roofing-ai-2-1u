"""
FastAPI endpoints for the Python Auditor (CAO-AUD-001).

Add these routes to the main FastAPI app.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import json

from python_auditor import PythonAuditor, AuditResult, AuditStatus

router = APIRouter(prefix="/api/audit", tags=["audit"])

# Global auditor instance
_auditor: Optional[PythonAuditor] = None


def get_auditor() -> PythonAuditor:
    """Get or create auditor instance."""
    global _auditor
    if _auditor is None:
        _auditor = PythonAuditor()
    return _auditor


class AuditSessionRequest(BaseModel):
    session_id: str


class AuditBatchRequest(BaseModel):
    limit: int = 100


class AuditResponse(BaseModel):
    session_id: str
    agent_id: str
    truth_score: float
    status: str
    actions: List[str]
    escalated: bool
    escalation_reason: Optional[str] = None


class BatchAuditResponse(BaseModel):
    total_audited: int
    passed: int
    warnings: int
    failed: int
    escalated: int
    results: List[AuditResponse]


class PauseRulesResponse(BaseModel):
    rules: List[dict]
    total: int


@router.get("/health")
async def audit_health():
    """Check auditor health."""
    try:
        auditor = get_auditor()
        return {
            "status": "healthy",
            "auditor_id": "CAO-AUD-001",
            "rules_loaded": len(auditor.pause_rules),
            "baselines_loaded": len(auditor.agent_baselines),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/session", response_model=AuditResponse)
async def audit_session(request: AuditSessionRequest):
    """Audit a specific session."""
    auditor = get_auditor()

    session = auditor.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    result = auditor.audit_session(session)

    return AuditResponse(
        session_id=result.session_id,
        agent_id=result.agent_id,
        truth_score=result.scores.truth_score,
        status=result.status.value,
        actions=result.actions_taken,
        escalated=result.escalate_to_llm,
        escalation_reason=result.escalation_reason,
    )


@router.post("/batch", response_model=BatchAuditResponse)
async def audit_batch(request: AuditBatchRequest):
    """Audit all pending sessions."""
    auditor = get_auditor()

    results = auditor.run_batch(request.limit)

    responses = [
        AuditResponse(
            session_id=r.session_id,
            agent_id=r.agent_id,
            truth_score=r.scores.truth_score,
            status=r.status.value,
            actions=r.actions_taken,
            escalated=r.escalate_to_llm,
            escalation_reason=r.escalation_reason,
        )
        for r in results
    ]

    return BatchAuditResponse(
        total_audited=len(results),
        passed=sum(1 for r in results if r.status == AuditStatus.PASSED),
        warnings=sum(1 for r in results if r.status == AuditStatus.WARNING),
        failed=sum(1 for r in results if r.status == AuditStatus.FAILED),
        escalated=sum(1 for r in results if r.escalate_to_llm),
        results=responses,
    )


@router.post("/batch/background")
async def audit_batch_background(
    request: AuditBatchRequest,
    background_tasks: BackgroundTasks
):
    """Run batch audit in background."""
    auditor = get_auditor()

    background_tasks.add_task(auditor.run_batch, request.limit)

    return {"status": "started", "message": f"Auditing up to {request.limit} sessions in background"}


@router.get("/rules", response_model=PauseRulesResponse)
async def get_pause_rules():
    """Get all active pause rules."""
    auditor = get_auditor()

    return PauseRulesResponse(
        rules=auditor.pause_rules,
        total=len(auditor.pause_rules),
    )


@router.get("/pending")
async def get_pending_sessions(limit: int = 20):
    """Get sessions pending audit."""
    auditor = get_auditor()
    sessions = auditor.get_pending_sessions(limit)

    return {
        "pending_count": len(sessions),
        "sessions": [
            {
                "session_id": s["session_id"],
                "agent_id": s["agent_id"],
                "started_at": s.get("started_at"),
                "message_count": s.get("message_count"),
            }
            for s in sessions
        ]
    }


@router.get("/agents/health")
async def get_agent_health():
    """Get health status of all agents from v_agent_health_dashboard."""
    auditor = get_auditor()

    query = """
    SELECT *
    FROM `master-roofing-intelligence.ko_audit.v_agent_health_dashboard`
    ORDER BY avg_truth_score ASC
    """
    results = auditor.client.query(query).result()

    return {
        "agents": [dict(row) for row in results]
    }


@router.get("/agents/requiring-action")
async def get_agents_requiring_action():
    """Get agents that require immediate action (pause/alert)."""
    auditor = get_auditor()

    query = """
    SELECT *
    FROM `master-roofing-intelligence.ko_audit.v_agents_requiring_action`
    ORDER BY priority ASC
    """
    results = auditor.client.query(query).result()

    return {
        "agents_requiring_action": [dict(row) for row in results]
    }


@router.post("/agent/{agent_id}/pause")
async def pause_agent(agent_id: str, reason: str = "Manual pause via API"):
    """Manually pause an agent."""
    auditor = get_auditor()
    auditor.pause_agent(agent_id, reason)

    return {"status": "paused", "agent_id": agent_id, "reason": reason}


@router.post("/agent/{agent_id}/resume")
async def resume_agent(agent_id: str):
    """Resume a paused agent."""
    auditor = get_auditor()

    query = """
    UPDATE `master-roofing-intelligence.ko_audit.agent_registry`
    SET
        status = 'active',
        paused_reason = NULL,
        paused_at = NULL
    WHERE agent_id = @agent_id
    """
    from google.cloud import bigquery
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id),
        ]
    )
    auditor.client.query(query, job_config=job_config).result()

    return {"status": "resumed", "agent_id": agent_id}


# Hook to call after each agent session ends
async def on_session_complete(session_id: str):
    """
    Called automatically when an agent session ends.
    Triggers immediate audit.
    """
    auditor = get_auditor()
    session = auditor.get_session(session_id)

    if session:
        result = auditor.audit_session(session)
        return result

    return None
