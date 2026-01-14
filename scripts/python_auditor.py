#!/usr/bin/env python3
"""
CAO-AUD-001: Python Auditor
Deterministic agent that audits all agent sessions.

Responsibilities:
1. Calculate truth scores from session metrics
2. Apply threshold rules from agent_pause_rules
3. Log scores to ko_audit.agent_scores
4. Create audit_events for warnings/pauses/alerts
5. Escalate to LLM Auditor (CAO-LLM-A5289A) when needed
6. Update agent_registry status for paused agents

Run modes:
- Single session: python python_auditor.py --session-id <id>
- Batch (pending): python python_auditor.py --batch
- Continuous: python python_auditor.py --daemon
"""

import argparse
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from enum import Enum

from google.cloud import bigquery

# Configuration
PROJECT_ID = "master-roofing-intelligence"
DATASET = "ko_audit"
AUDITOR_ID = "CAO-AUD-001"
LLM_AUDITOR_ID = "CAO-LLM-A5289A"

# Scoring weights (must sum to 100)
SCORING_WEIGHTS = {
    "accuracy": 30,      # Did it answer correctly?
    "completeness": 20,  # Did it answer the full question?
    "latency": 15,       # Response time within acceptable range?
    "error_rate": 15,    # Did it throw errors?
    "citation": 10,      # Did it cite sources?
    "format": 10,        # Did output match expected schema?
}

# Latency thresholds (milliseconds)
LATENCY_THRESHOLDS = {
    "excellent": 1000,   # < 1s
    "good": 2000,        # < 2s
    "acceptable": 5000,  # < 5s
    "slow": 10000,       # < 10s
    # > 10s = poor
}

# Escalation triggers
ESCALATION_TRIGGERS = {
    "session_length": 8,      # Messages
    "score_drop": 15,         # Points below baseline
    "random_sample_rate": 0.05,  # 5% random sampling
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("CAO-AUD-001")


class AuditStatus(Enum):
    PENDING = "pending"
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"
    ESCALATED = "escalated"


class ActionType(Enum):
    LOG = "log"
    WARN = "warn"
    ALERT = "alert"
    PAUSE = "pause"
    DISABLE = "disable"


@dataclass
class SessionMetrics:
    """Metrics extracted from a session for scoring."""
    session_id: str
    agent_id: str
    message_count: int
    user_messages: int
    agent_messages: int
    tool_calls: int
    errors_count: int
    retries_count: int
    avg_response_time_ms: float
    total_tokens_in: int
    total_tokens_out: int
    duration_seconds: int
    has_citations: bool = False
    format_valid: bool = True


@dataclass
class AuditScore:
    """Calculated audit scores for a session."""
    truth_score: float
    accuracy_score: float
    completeness_score: float
    latency_score: float
    error_rate_score: float
    citation_score: float
    format_score: float

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


@dataclass
class AuditResult:
    """Complete audit result for a session."""
    session_id: str
    agent_id: str
    scores: AuditScore
    status: AuditStatus
    triggered_rules: List[Dict]
    actions_taken: List[str]
    escalate_to_llm: bool
    escalation_reason: Optional[str]


class PythonAuditor:
    """
    Deterministic Python Auditor for agent sessions.
    """

    def __init__(self):
        self.client = bigquery.Client(project=PROJECT_ID)
        self.pause_rules = self._load_pause_rules()
        self.agent_baselines = self._load_agent_baselines()

    def _load_pause_rules(self) -> List[Dict]:
        """Load active pause rules from BigQuery."""
        query = f"""
        SELECT *
        FROM `{PROJECT_ID}.{DATASET}.agent_pause_rules`
        WHERE enabled = TRUE
        ORDER BY
            CASE severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                ELSE 4
            END
        """
        results = self.client.query(query).result()
        return [dict(row) for row in results]

    def _load_agent_baselines(self) -> Dict[str, float]:
        """Load 30-day baseline scores per agent."""
        query = f"""
        SELECT
            agent_id,
            AVG(score_value) as baseline_score
        FROM `{PROJECT_ID}.{DATASET}.agent_scores`
        WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
            AND score_type = 'truth_score'
        GROUP BY agent_id
        """
        results = self.client.query(query).result()
        return {row.agent_id: row.baseline_score for row in results}

    def get_pending_sessions(self, limit: int = 100) -> List[Dict]:
        """Get sessions pending audit."""
        query = f"""
        SELECT *
        FROM `{PROJECT_ID}.{DATASET}.agent_sessions`
        WHERE audit_status = 'pending'
            AND ended_at IS NOT NULL
        ORDER BY ended_at ASC
        LIMIT {limit}
        """
        results = self.client.query(query).result()
        return [dict(row) for row in results]

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get a specific session by ID."""
        query = f"""
        SELECT *
        FROM `{PROJECT_ID}.{DATASET}.agent_sessions`
        WHERE session_id = @session_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("session_id", "STRING", session_id)
            ]
        )
        results = self.client.query(query, job_config=job_config).result()
        rows = list(results)
        return dict(rows[0]) if rows else None

    def extract_metrics(self, session: Dict) -> SessionMetrics:
        """Extract metrics from session data."""
        return SessionMetrics(
            session_id=session["session_id"],
            agent_id=session["agent_id"],
            message_count=session.get("message_count", 0) or 0,
            user_messages=session.get("user_messages", 0) or 0,
            agent_messages=session.get("agent_messages", 0) or 0,
            tool_calls=session.get("tool_calls", 0) or 0,
            errors_count=session.get("errors_count", 0) or 0,
            retries_count=session.get("retries_count", 0) or 0,
            avg_response_time_ms=session.get("avg_response_time_ms", 0) or 0,
            total_tokens_in=session.get("total_tokens_in", 0) or 0,
            total_tokens_out=session.get("total_tokens_out", 0) or 0,
            duration_seconds=session.get("duration_seconds", 0) or 0,
            has_citations=bool(session.get("data_sources_accessed")),
            format_valid=True,  # TODO: Implement format validation
        )

    def calculate_scores(self, metrics: SessionMetrics) -> AuditScore:
        """Calculate all component scores and truth score."""

        # Accuracy score (based on error rate and retries)
        if metrics.message_count > 0:
            error_rate = metrics.errors_count / metrics.message_count
            retry_rate = metrics.retries_count / metrics.message_count
        else:
            error_rate = 0
            retry_rate = 0

        # Lower error rate = higher accuracy
        accuracy_score = max(0, 100 - (error_rate * 200) - (retry_rate * 50))

        # Completeness score (based on response ratio)
        if metrics.user_messages > 0:
            response_ratio = metrics.agent_messages / metrics.user_messages
            completeness_score = min(100, response_ratio * 100)
        else:
            completeness_score = 100

        # Latency score
        latency = metrics.avg_response_time_ms
        if latency <= LATENCY_THRESHOLDS["excellent"]:
            latency_score = 100
        elif latency <= LATENCY_THRESHOLDS["good"]:
            latency_score = 90
        elif latency <= LATENCY_THRESHOLDS["acceptable"]:
            latency_score = 75
        elif latency <= LATENCY_THRESHOLDS["slow"]:
            latency_score = 50
        else:
            latency_score = 25

        # Error rate score (inverse of error rate)
        error_rate_score = max(0, 100 - (error_rate * 500))

        # Citation score
        citation_score = 100 if metrics.has_citations else 50

        # Format score
        format_score = 100 if metrics.format_valid else 60

        # Calculate weighted truth score
        truth_score = (
            (accuracy_score * SCORING_WEIGHTS["accuracy"] / 100) +
            (completeness_score * SCORING_WEIGHTS["completeness"] / 100) +
            (latency_score * SCORING_WEIGHTS["latency"] / 100) +
            (error_rate_score * SCORING_WEIGHTS["error_rate"] / 100) +
            (citation_score * SCORING_WEIGHTS["citation"] / 100) +
            (format_score * SCORING_WEIGHTS["format"] / 100)
        )

        return AuditScore(
            truth_score=round(truth_score, 2),
            accuracy_score=round(accuracy_score, 2),
            completeness_score=round(completeness_score, 2),
            latency_score=round(latency_score, 2),
            error_rate_score=round(error_rate_score, 2),
            citation_score=round(citation_score, 2),
            format_score=round(format_score, 2),
        )

    def check_rules(self, metrics: SessionMetrics, scores: AuditScore) -> List[Dict]:
        """Check which pause rules are triggered."""
        triggered = []

        # Calculate error rate for rule checking
        error_rate = (metrics.errors_count / metrics.message_count
                      if metrics.message_count > 0 else 0)

        for rule in self.pause_rules:
            metric_name = rule["metric"]
            operator = rule["operator"]
            threshold = rule["threshold_value"]

            # Get actual value based on metric
            if metric_name == "truth_score":
                actual = scores.truth_score
            elif metric_name == "accuracy_score":
                actual = scores.accuracy_score
            elif metric_name == "error_rate":
                actual = error_rate
            elif metric_name == "latency_ms":
                actual = metrics.avg_response_time_ms
            else:
                continue

            # Check if rule is triggered
            triggered_flag = False
            if operator == "lt" and actual < threshold:
                triggered_flag = True
            elif operator == "lte" and actual <= threshold:
                triggered_flag = True
            elif operator == "gt" and actual > threshold:
                triggered_flag = True
            elif operator == "gte" and actual >= threshold:
                triggered_flag = True
            elif operator == "eq" and actual == threshold:
                triggered_flag = True

            if triggered_flag:
                triggered.append({
                    **rule,
                    "actual_value": actual,
                })

        return triggered

    def should_escalate_to_llm(self, metrics: SessionMetrics, scores: AuditScore) -> tuple[bool, Optional[str]]:
        """Determine if session should be escalated to LLM Auditor."""

        # Check session length
        if metrics.message_count > ESCALATION_TRIGGERS["session_length"]:
            return True, "session_length"

        # Check score drop from baseline
        baseline = self.agent_baselines.get(metrics.agent_id, 85)
        if baseline - scores.truth_score > ESCALATION_TRIGGERS["score_drop"]:
            return True, "score_drop"

        # Random sampling
        import random
        if random.random() < ESCALATION_TRIGGERS["random_sample_rate"]:
            return True, "random_sample"

        return False, None

    def log_score(self, session_id: str, agent_id: str, scores: AuditScore):
        """Log scores to agent_scores table."""
        score_id = f"SCORE-{uuid.uuid4().hex[:8].upper()}"

        rows = [{
            "score_id": score_id,
            "agent_id": agent_id,
            "scored_by": AUDITOR_ID,
            "score_type": "truth_score",
            "score_value": scores.truth_score,
            "score_context": json.dumps({
                "session_id": session_id,
                "component_scores": scores.to_dict()
            }),
            "sample_size": 1,
            "evaluation_criteria": "automated_metrics",
        }]

        table_ref = f"{PROJECT_ID}.{DATASET}.agent_scores"
        errors = self.client.insert_rows_json(table_ref, rows)
        if errors:
            logger.error(f"Failed to log score: {errors}")
        else:
            logger.info(f"Logged score {scores.truth_score} for session {session_id}")

    def create_audit_event(
        self,
        agent_id: str,
        session_id: str,
        event_type: str,
        rule: Dict,
        scores: AuditScore
    ):
        """Create an audit event for warnings/pauses/alerts."""
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"

        rows = [{
            "event_id": event_id,
            "event_type": event_type,
            "agent_id": agent_id,
            "session_id": session_id,
            "trigger_reason": rule["rule_name"],
            "trigger_value": rule["actual_value"],
            "threshold_value": rule["threshold_value"],
            "truth_score": scores.truth_score,
            "accuracy_score": scores.accuracy_score,
            "latency_score": scores.latency_score,
            "error_rate": None,  # TODO: Add error rate
            "action_taken": rule["action"],
            "escalated_to": LLM_AUDITOR_ID if event_type == "escalate" else None,
            "created_by": AUDITOR_ID,
        }]

        table_ref = f"{PROJECT_ID}.{DATASET}.audit_events"
        errors = self.client.insert_rows_json(table_ref, rows)
        if errors:
            logger.error(f"Failed to create audit event: {errors}")
        else:
            logger.info(f"Created {event_type} event for agent {agent_id}")

    def pause_agent(self, agent_id: str, reason: str):
        """Pause an agent by updating agent_registry."""
        query = f"""
        UPDATE `{PROJECT_ID}.{DATASET}.agent_registry`
        SET
            status = 'paused',
            paused_reason = @reason,
            paused_at = CURRENT_TIMESTAMP()
        WHERE agent_id = @agent_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id),
                bigquery.ScalarQueryParameter("reason", "STRING", reason),
            ]
        )
        self.client.query(query, job_config=job_config).result()
        logger.warning(f"PAUSED agent {agent_id}: {reason}")

    def disable_agent(self, agent_id: str, reason: str):
        """Disable an agent by updating agent_registry."""
        query = f"""
        UPDATE `{PROJECT_ID}.{DATASET}.agent_registry`
        SET
            status = 'disabled',
            blocked_reason = @reason,
            paused_at = CURRENT_TIMESTAMP()
        WHERE agent_id = @agent_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("agent_id", "STRING", agent_id),
                bigquery.ScalarQueryParameter("reason", "STRING", reason),
            ]
        )
        self.client.query(query, job_config=job_config).result()
        logger.critical(f"DISABLED agent {agent_id}: {reason}")

    def update_session_audit_status(
        self,
        session_id: str,
        scores: AuditScore,
        status: AuditStatus,
        escalated: bool = False,
        llm_report_id: Optional[str] = None
    ):
        """Update session with audit results."""
        query = f"""
        UPDATE `{PROJECT_ID}.{DATASET}.agent_sessions`
        SET
            truth_score = @truth_score,
            accuracy_score = @accuracy_score,
            completeness_score = @completeness_score,
            latency_score = @latency_score,
            format_score = @format_score,
            audit_status = @audit_status,
            audited_at = CURRENT_TIMESTAMP(),
            audited_by = @auditor_id,
            escalated_to_llm = @escalated,
            llm_report_id = @llm_report_id,
            updated_at = CURRENT_TIMESTAMP()
        WHERE session_id = @session_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("session_id", "STRING", session_id),
                bigquery.ScalarQueryParameter("truth_score", "FLOAT64", scores.truth_score),
                bigquery.ScalarQueryParameter("accuracy_score", "FLOAT64", scores.accuracy_score),
                bigquery.ScalarQueryParameter("completeness_score", "FLOAT64", scores.completeness_score),
                bigquery.ScalarQueryParameter("latency_score", "FLOAT64", scores.latency_score),
                bigquery.ScalarQueryParameter("format_score", "FLOAT64", scores.format_score),
                bigquery.ScalarQueryParameter("audit_status", "STRING", status.value),
                bigquery.ScalarQueryParameter("auditor_id", "STRING", AUDITOR_ID),
                bigquery.ScalarQueryParameter("escalated", "BOOL", escalated),
                bigquery.ScalarQueryParameter("llm_report_id", "STRING", llm_report_id),
            ]
        )
        self.client.query(query, job_config=job_config).result()

    def send_notification(self, channels: List[str], users: List[str], message: str):
        """Send notifications via configured channels."""
        # TODO: Implement actual notification sending
        # For now, just log
        logger.info(f"NOTIFICATION [{channels}] to {users}: {message}")

    def audit_session(self, session: Dict) -> AuditResult:
        """
        Main audit function for a single session.

        Returns AuditResult with scores, status, and actions taken.
        """
        session_id = session["session_id"]
        agent_id = session["agent_id"]

        logger.info(f"Auditing session {session_id} for agent {agent_id}")

        # Extract metrics
        metrics = self.extract_metrics(session)

        # Calculate scores
        scores = self.calculate_scores(metrics)
        logger.info(f"Scores: truth={scores.truth_score}, accuracy={scores.accuracy_score}")

        # Check rules
        triggered_rules = self.check_rules(metrics, scores)
        actions_taken = []

        # Determine status based on score
        if scores.truth_score >= 80:
            status = AuditStatus.PASSED
        elif scores.truth_score >= 60:
            status = AuditStatus.WARNING
        else:
            status = AuditStatus.FAILED

        # Process triggered rules (in priority order)
        for rule in triggered_rules:
            action = rule["action"]

            if action == ActionType.DISABLE.value:
                self.disable_agent(agent_id, rule["rule_name"])
                self.create_audit_event(agent_id, session_id, "disable", rule, scores)
                self.send_notification(
                    rule.get("notify_channels", []),
                    rule.get("notify_users", []),
                    f"AGENT DISABLED: {agent_id} - {rule['rule_name']}"
                )
                actions_taken.append(f"disabled:{rule['rule_id']}")
                status = AuditStatus.FAILED
                break  # Stop after disable

            elif action == ActionType.PAUSE.value:
                self.pause_agent(agent_id, rule["rule_name"])
                self.create_audit_event(agent_id, session_id, "pause", rule, scores)
                self.send_notification(
                    rule.get("notify_channels", []),
                    rule.get("notify_users", []),
                    f"AGENT PAUSED: {agent_id} - {rule['rule_name']}"
                )
                actions_taken.append(f"paused:{rule['rule_id']}")
                status = AuditStatus.FAILED

            elif action == ActionType.ALERT.value:
                self.create_audit_event(agent_id, session_id, "alert", rule, scores)
                self.send_notification(
                    rule.get("notify_channels", []),
                    rule.get("notify_users", []),
                    f"AGENT ALERT: {agent_id} - {rule['rule_name']} (score: {scores.truth_score})"
                )
                actions_taken.append(f"alerted:{rule['rule_id']}")

            elif action == ActionType.WARN.value:
                self.create_audit_event(agent_id, session_id, "warning", rule, scores)
                actions_taken.append(f"warned:{rule['rule_id']}")

            else:  # log
                actions_taken.append(f"logged:{rule['rule_id']}")

        # Check if should escalate to LLM
        escalate, escalation_reason = self.should_escalate_to_llm(metrics, scores)

        if escalate:
            status = AuditStatus.ESCALATED
            self.create_audit_event(
                agent_id, session_id, "escalate",
                {"rule_name": escalation_reason, "actual_value": None,
                 "threshold_value": None, "action": "escalate"},
                scores
            )
            actions_taken.append(f"escalated:{escalation_reason}")
            logger.info(f"Escalated session {session_id} to LLM Auditor: {escalation_reason}")

        # Log score
        self.log_score(session_id, agent_id, scores)

        # Update session
        self.update_session_audit_status(session_id, scores, status, escalate)

        return AuditResult(
            session_id=session_id,
            agent_id=agent_id,
            scores=scores,
            status=status,
            triggered_rules=triggered_rules,
            actions_taken=actions_taken,
            escalate_to_llm=escalate,
            escalation_reason=escalation_reason,
        )

    def run_batch(self, limit: int = 100) -> List[AuditResult]:
        """Audit all pending sessions."""
        sessions = self.get_pending_sessions(limit)
        logger.info(f"Found {len(sessions)} pending sessions to audit")

        results = []
        for session in sessions:
            try:
                result = self.audit_session(session)
                results.append(result)
            except Exception as e:
                logger.error(f"Error auditing session {session['session_id']}: {e}")

        # Summary
        passed = sum(1 for r in results if r.status == AuditStatus.PASSED)
        warned = sum(1 for r in results if r.status == AuditStatus.WARNING)
        failed = sum(1 for r in results if r.status == AuditStatus.FAILED)
        escalated = sum(1 for r in results if r.escalate_to_llm)

        logger.info(f"Batch complete: {passed} passed, {warned} warnings, {failed} failed, {escalated} escalated")

        return results

    def run_daemon(self, interval_seconds: int = 60):
        """Run continuously, checking for new sessions."""
        logger.info(f"Starting daemon mode, checking every {interval_seconds}s")

        while True:
            try:
                results = self.run_batch()
                if not results:
                    logger.debug("No pending sessions")
            except Exception as e:
                logger.error(f"Daemon error: {e}")

            time.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description="CAO-AUD-001: Python Auditor")
    parser.add_argument("--session-id", help="Audit a specific session")
    parser.add_argument("--batch", action="store_true", help="Audit all pending sessions")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=60, help="Daemon check interval (seconds)")
    parser.add_argument("--limit", type=int, default=100, help="Max sessions per batch")

    args = parser.parse_args()

    auditor = PythonAuditor()

    if args.session_id:
        session = auditor.get_session(args.session_id)
        if session:
            result = auditor.audit_session(session)
            print(json.dumps({
                "session_id": result.session_id,
                "agent_id": result.agent_id,
                "truth_score": result.scores.truth_score,
                "status": result.status.value,
                "actions": result.actions_taken,
                "escalated": result.escalate_to_llm,
            }, indent=2))
        else:
            print(f"Session {args.session_id} not found")

    elif args.daemon:
        auditor.run_daemon(args.interval)

    else:  # Default to batch
        results = auditor.run_batch(args.limit)
        print(f"Audited {len(results)} sessions")


if __name__ == "__main__":
    main()
