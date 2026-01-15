"""
Sales Agent Test Harness
Feeds questions to the Sales Agent and collects responses for scoring.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    question_id: str
    question: str
    response: str
    timestamp: str
    response_time_ms: int
    elements_found: List[str]
    elements_missing: List[str]
    scores: Dict[str, float]
    total_score: float
    passed: bool
    feedback: str

@dataclass
class EvalRun:
    run_id: str
    timestamp: str
    results: List[TestResult]
    avg_score: float
    pass_rate: float
    recommendations: List[str]


# The 10 CEO questions to test
TEST_QUESTIONS = [
    {"id": "bid_volume", "question": "How much did we bid this month?"},
    {"id": "top_performer", "question": "Who's our top performer?"},
    {"id": "gc_focus", "question": "Which GCs should we focus on?"},
    {"id": "response_speed", "question": "Are we responding fast enough?"},
    {"id": "pipeline", "question": "What's in the pipeline?"},
    {"id": "slow_turnaround", "question": "Who's been slow on turnaround?"},
    {"id": "month_comparison", "question": "How are we doing vs last month?"},
    {"id": "stop_bidding", "question": "Which GCs should we stop bidding?"},
    {"id": "job_size", "question": "What's our average job size?"},
    {"id": "weekly_activity", "question": "How many RFPs this week?"},
]

# Alternative phrasings for robustness testing
QUESTION_VARIANTS = {
    "bid_volume": [
        "What's our bid volume this month?",
        "How many proposals did we send?",
        "Show me this month's bidding",
    ],
    "top_performer": [
        "Who's winning the most?",
        "Best salesperson?",
        "Sales leaderboard",
    ],
    "gc_focus": [
        "Best GCs to work with?",
        "Where should we focus efforts?",
        "Which GCs give us the best ROI?",
    ],
    "response_speed": [
        "How fast are we responding to RFPs?",
        "Turnaround time analysis",
        "Are we slow?",
    ],
    "pipeline": [
        "Pending proposals?",
        "What's awaiting decision?",
        "Show me the pipeline",
    ],
    "slow_turnaround": [
        "Who's the bottleneck?",
        "Slowest responders?",
        "Who's behind on turnaround?",
    ],
    "month_comparison": [
        "Compare to last month",
        "Month over month trend",
        "Are we up or down?",
    ],
    "stop_bidding": [
        "GCs wasting our time?",
        "Who should we drop?",
        "Low win rate GCs?",
    ],
    "job_size": [
        "Average deal size?",
        "What size jobs do we win?",
        "Typical job value?",
    ],
    "weekly_activity": [
        "What came in this week?",
        "Recent RFPs?",
        "Last 7 days activity?",
    ],
}


class SalesAgentTester:
    """Tests the Sales Agent responses."""

    def __init__(self, events: List[Dict], gc_metrics: Dict):
        self.events = events
        self.gc_metrics = gc_metrics
        self.results: List[TestResult] = []

    def call_agent(self, question: str) -> str:
        """
        Call the generateSalesResponse function.
        In production, this would call the actual API.
        For now, we import and call directly.
        """
        # Import the response generator
        # This simulates what the frontend does
        from sales_response_generator import generate_sales_response

        start = datetime.now()
        response = generate_sales_response(question, self.events, self.gc_metrics, None)
        elapsed = (datetime.now() - start).total_seconds() * 1000

        return response.get("text", ""), int(elapsed)

    def run_single_test(self, question_id: str, question: str, scorer) -> TestResult:
        """Run a single question test."""
        logger.info(f"Testing: {question}")

        try:
            response, response_time = self.call_agent(question)

            # Score the response
            score_result = scorer.score_response(question_id, question, response)

            result = TestResult(
                question_id=question_id,
                question=question,
                response=response,
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=response_time,
                elements_found=score_result["elements_found"],
                elements_missing=score_result["elements_missing"],
                scores=score_result["dimension_scores"],
                total_score=score_result["total_score"],
                passed=score_result["passed"],
                feedback=score_result["feedback"],
            )

        except Exception as e:
            logger.error(f"Test failed for {question_id}: {e}")
            result = TestResult(
                question_id=question_id,
                question=question,
                response=f"ERROR: {str(e)}",
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=0,
                elements_found=[],
                elements_missing=["all"],
                scores={},
                total_score=0,
                passed=False,
                feedback=f"Test execution failed: {str(e)}",
            )

        self.results.append(result)
        return result

    def run_full_evaluation(self, scorer) -> EvalRun:
        """Run all 10 questions and return evaluation results."""
        self.results = []

        for q in TEST_QUESTIONS:
            self.run_single_test(q["id"], q["question"], scorer)

        # Calculate aggregate metrics
        scores = [r.total_score for r in self.results]
        avg_score = sum(scores) / len(scores) if scores else 0
        pass_count = sum(1 for r in self.results if r.passed)
        pass_rate = pass_count / len(self.results) if self.results else 0

        # Generate recommendations
        recommendations = self._generate_recommendations()

        return EvalRun(
            run_id=datetime.utcnow().strftime("%Y%m%d_%H%M%S"),
            timestamp=datetime.utcnow().isoformat(),
            results=self.results,
            avg_score=round(avg_score, 1),
            pass_rate=round(pass_rate * 100, 1),
            recommendations=recommendations,
        )

    def _generate_recommendations(self) -> List[str]:
        """Generate improvement recommendations based on results."""
        recommendations = []

        for result in self.results:
            if not result.passed:
                if result.elements_missing:
                    recommendations.append(
                        f"[{result.question_id}] Add missing elements: {', '.join(result.elements_missing[:3])}"
                    )
                if result.scores.get("actionability", 100) < 70:
                    recommendations.append(
                        f"[{result.question_id}] Add actionable insights/recommendations"
                    )
                if result.scores.get("context", 100) < 70:
                    recommendations.append(
                        f"[{result.question_id}] Add benchmarks or comparisons"
                    )

        return recommendations[:10]  # Top 10 recommendations


def load_test_data() -> tuple:
    """Load test data - in production, fetch from BigQuery."""
    # Mock data for testing
    events = [
        {"event_id": "1", "event_type": "RFP_RECEIVED", "assignee": "fkohn", "scanned_at": "2024-01-10", "project_name": "123 Main St"},
        {"event_id": "2", "event_type": "PROPOSAL_SENT", "assignee": "fkohn", "scanned_at": "2024-01-12", "project_name": "123 Main St", "dollar_amount": 150000},
        {"event_id": "3", "event_type": "WON", "assignee": "fkohn", "scanned_at": "2024-01-15", "project_name": "123 Main St", "dollar_amount": 150000},
        {"event_id": "4", "event_type": "RFP_RECEIVED", "assignee": "bshinde", "scanned_at": "2024-01-08", "project_name": "456 Oak Ave"},
        {"event_id": "5", "event_type": "PROPOSAL_SENT", "assignee": "bshinde", "scanned_at": "2024-01-14", "project_name": "456 Oak Ave", "dollar_amount": 85000},
        {"event_id": "6", "event_type": "LOST", "assignee": "bshinde", "scanned_at": "2024-01-20", "project_name": "456 Oak Ave"},
    ]

    gc_metrics = {
        "fkohn": {"wins": 5, "losses": 2, "totalBids": 7, "winRate": 71, "avgTurnaround": 2, "proposals": 12},
        "bshinde": {"wins": 3, "losses": 4, "totalBids": 7, "winRate": 43, "avgTurnaround": 6, "proposals": 10},
        "csufrin": {"wins": 2, "losses": 5, "totalBids": 7, "winRate": 29, "avgTurnaround": 4, "proposals": 8},
    }

    return events, gc_metrics


if __name__ == "__main__":
    from scoring_agent import ScoringAgent

    # Load test data
    events, gc_metrics = load_test_data()

    # Initialize tester and scorer
    tester = SalesAgentTester(events, gc_metrics)
    scorer = ScoringAgent()

    # Run evaluation
    eval_run = tester.run_full_evaluation(scorer)

    # Print results
    print("\n" + "=" * 60)
    print(f"SALES AGENT EVALUATION - {eval_run.run_id}")
    print("=" * 60)
    print(f"Average Score: {eval_run.avg_score}/100")
    print(f"Pass Rate: {eval_run.pass_rate}%")
    print()

    for result in eval_run.results:
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.question_id}: {result.total_score}/100")
        if not result.passed:
            print(f"       Missing: {', '.join(result.elements_missing[:3])}")

    print()
    print("RECOMMENDATIONS:")
    for rec in eval_run.recommendations:
        print(f"  - {rec}")
