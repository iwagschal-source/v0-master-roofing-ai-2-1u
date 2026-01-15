"""
Sales Agent Scoring Agent
Evaluates Sales Agent responses against defined metrics.
Uses both rule-based scoring and LLM-based evaluation.
"""

import re
import logging
from typing import Dict, List, Tuple
from dataclasses import dataclass

from metrics import QUESTION_CRITERIA, WEIGHTS, PASS_THRESHOLD

logger = logging.getLogger(__name__)


@dataclass
class ScoreResult:
    total_score: float
    dimension_scores: Dict[str, float]
    elements_found: List[str]
    elements_missing: List[str]
    passed: bool
    feedback: str


class ScoringAgent:
    """Scores Sales Agent responses against defined criteria."""

    def __init__(self, use_llm: bool = False):
        self.use_llm = use_llm
        self.element_patterns = self._build_element_patterns()

    def _build_element_patterns(self) -> Dict[str, Dict[str, List[str]]]:
        """Build regex patterns to detect required elements in responses."""
        return {
            "bid_volume": {
                "proposal_count": [r"proposals?\s*sent[:\s]*(\d+)", r"(\d+)\s*proposals?"],
                "total_value": [r"total\s*(bid\s*)?value[:\s]*\$[\d,]+", r"\$[\d,]+\s*total"],
                "avg_bid_size": [r"avg|average\s*(bid\s*)?size[:\s]*\$[\d,]+"],
                "month_comparison": [r"vs\s*last\s*month", r"was\s*\d+", r"compared"],
            },
            "top_performer": {
                "ranked_list": [r"🥇|🥈|🥉|\d+\.", r"ranked|#\d"],
                "win_count": [r"(\d+)\s*wins?", r"wins?[:\s]*(\d+)"],
                "proposal_count": [r"(\d+)\s*proposals?"],
                "won_value": [r"\$[\d,]+[kK]?\s*won", r"won\s*\$[\d,]+"],
            },
            "gc_focus": {
                "ranked_gc_list": [r"\d+\.\s*\w+", r"focus\s*on"],
                "win_rate_per_gc": [r"win\s*rate[:\s]*\d+%", r"\d+%\s*win"],
                "volume_per_gc": [r"bids?[:\s]*\d+", r"\d+\s*bids?"],
                "roi_score": [r"roi|best\s*roi", r"score"],
            },
            "response_speed": {
                "company_avg_turnaround": [r"average[:\s]*\d+\s*days?", r"company\s*avg"],
                "fastest_person": [r"fastest[:\s]*\w+", r"\w+\s*at\s*\d+\s*days?"],
                "slowest_person": [r"slowest[:\s]*\w+"],
                "benchmark_comparison": [r"✅|⚠️|🔴", r"under\s*\d+\s*days?", r"competitive"],
            },
            "pipeline": {
                "pending_count": [r"pending[:\s]*\d+", r"\d+\s*pending"],
                "pending_value": [r"(total\s*)?(value|worth)[:\s]*\$[\d,]+"],
                "project_list": [r"•\s*\w+", r"projects?[:\s]"],
            },
            "slow_turnaround": {
                "ranked_by_slowness": [r"🔴|⚠️|✅", r"slowest"],
                "days_per_person": [r"\w+[:\s]*\d+\s*days?"],
                "status_indicators": [r"🔴|⚠️|✅", r"red|yellow|green"],
            },
            "month_comparison": {
                "rfp_comparison": [r"rfps?[:\s]*\d+\s*[↑↓→]", r"rfps?\s*(received)?[:\s]*\d+"],
                "proposal_comparison": [r"proposals?[:\s]*\d+\s*[↑↓→]"],
                "win_comparison": [r"wins?[:\s]*\d+\s*[↑↓→]"],
                "trend_arrows": [r"[↑↓→]", r"up|down|same"],
            },
            "stop_bidding": {
                "low_winrate_gcs": [r"🔴", r"low\s*win|consider\s*drop"],
                "bid_count_filter": [r"\d+\s*bids?", r"3\+\s*bids?|bids?\s*required"],
                "specific_rates": [r"\d+%\s*win\s*rate", r"win\s*rate[:\s]*\d+%|\d+%.*bids"],
            },
            "job_size": {
                "avg_won_size": [r"avg\s*(won)?\s*(job)?[:\s]*\$[\d,]+"],
                "avg_bid_size": [r"avg\s*bid[:\s]*\$[\d,]+"],
                "largest_job": [r"largest[:\s]", r"biggest"],
            },
            "weekly_activity": {
                "rfp_count_7days": [r"(new\s*)?rfps?[:\s]*\d+", r"\d+\s*(new\s*)?rfps?"],
                "proposal_count_7days": [r"proposals?\s*sent[:\s]*\d+"],
                "win_count_7days": [r"wins?[:\s]*\d+"],
                "recent_rfp_list": [r"•\s*\w+", r"recent\s*rfps?"],
            },
        }

    def _check_element(self, response: str, patterns: List[str]) -> bool:
        """Check if any pattern matches in the response."""
        response_lower = response.lower()
        for pattern in patterns:
            if re.search(pattern, response_lower, re.IGNORECASE):
                return True
        return False

    def _score_completeness(self, question_id: str, response: str) -> Tuple[float, List[str], List[str]]:
        """Score how many required elements are present."""
        if question_id not in self.element_patterns:
            return 50.0, [], ["unknown_question_type"]

        patterns = self.element_patterns[question_id]
        found = []
        missing = []

        for element, element_patterns in patterns.items():
            if self._check_element(response, element_patterns):
                found.append(element)
            else:
                missing.append(element)

        if not patterns:
            return 50.0, found, missing

        score = (len(found) / len(patterns)) * 100
        return score, found, missing

    def _score_accuracy(self, question_id: str, response: str) -> float:
        """
        Score accuracy of data/calculations.
        In production, this would verify against actual data.
        For now, check for presence of numbers and consistency.
        """
        # Check for numbers (should have data)
        numbers = re.findall(r'\d+', response)
        if not numbers:
            return 30.0  # No data = low accuracy score

        # Check for dollar amounts
        has_dollars = bool(re.search(r'\$[\d,]+', response))

        # Check for percentages
        has_percentages = bool(re.search(r'\d+%', response))

        # Check for dates/time references
        has_time_context = bool(re.search(r'days?|month|week|last', response, re.IGNORECASE))

        score = 50.0  # Base score
        if has_dollars:
            score += 15
        if has_percentages:
            score += 15
        if has_time_context:
            score += 10
        if len(numbers) >= 3:
            score += 10

        return min(100, score)

    def _score_actionability(self, response: str) -> float:
        """Score how actionable the insights are."""
        actionable_indicators = [
            r"💡",                          # Tip icon
            r"recommend|suggest|should|consider",
            r"focus\s*on",
            r"target|goal",
            r"✅|⚠️|🔴",                   # Status indicators
            r"top\s*\d+|best|worst",
            r"action|priority",
        ]

        matches = sum(1 for pattern in actionable_indicators
                     if re.search(pattern, response, re.IGNORECASE))

        # Score based on matches (0-3+ indicators)
        if matches >= 3:
            return 100.0
        elif matches == 2:
            return 80.0
        elif matches == 1:
            return 60.0
        else:
            return 40.0

    def _score_context(self, response: str) -> float:
        """Score presence of context/benchmarks."""
        context_indicators = [
            r"vs\s*(last|previous)",        # Comparison
            r"was\s*\d+",                   # Historical
            r"[↑↓→]",                       # Trend arrows
            r"benchmark|target|goal",
            r"industry|standard|competitive",
            r"compared|comparison",
            r"better|worse|same",
        ]

        matches = sum(1 for pattern in context_indicators
                     if re.search(pattern, response, re.IGNORECASE))

        if matches >= 3:
            return 100.0
        elif matches == 2:
            return 75.0
        elif matches == 1:
            return 50.0
        else:
            return 25.0

    def _score_formatting(self, response: str) -> float:
        """Score readability and formatting."""
        score = 50.0  # Base

        # Has markdown formatting
        if re.search(r'\*\*.*\*\*', response):
            score += 15

        # Has bullet points or numbered lists
        if re.search(r'[•\-]\s|\d+\.', response):
            score += 15

        # Has line breaks (not a wall of text)
        if response.count('\n') >= 2:
            score += 10

        # Reasonable length (not too short, not too long)
        word_count = len(response.split())
        if 30 <= word_count <= 200:
            score += 10

        return min(100, score)

    def score_response(self, question_id: str, question: str, response: str) -> Dict:
        """Score a response across all dimensions."""

        # Score each dimension
        completeness, found, missing = self._score_completeness(question_id, response)
        accuracy = self._score_accuracy(question_id, response)
        actionability = self._score_actionability(response)
        context = self._score_context(response)
        formatting = self._score_formatting(response)

        dimension_scores = {
            "completeness": completeness,
            "accuracy": accuracy,
            "actionability": actionability,
            "context": context,
            "formatting": formatting,
        }

        # Calculate weighted total
        total = sum(
            dimension_scores[dim] * WEIGHTS[dim]
            for dim in WEIGHTS
        )

        passed = total >= PASS_THRESHOLD

        # Generate feedback
        feedback = self._generate_feedback(dimension_scores, found, missing, passed)

        return {
            "total_score": round(total, 1),
            "dimension_scores": {k: round(v, 1) for k, v in dimension_scores.items()},
            "elements_found": found,
            "elements_missing": missing,
            "passed": passed,
            "feedback": feedback,
        }

    def _generate_feedback(self, scores: Dict, found: List, missing: List, passed: bool) -> str:
        """Generate actionable feedback."""
        feedback_parts = []

        if not passed:
            # Identify weakest areas
            weakest = min(scores, key=scores.get)
            feedback_parts.append(f"Weakest: {weakest} ({scores[weakest]:.0f}/100)")

            if missing:
                feedback_parts.append(f"Missing: {', '.join(missing[:3])}")

        if scores["actionability"] < 70:
            feedback_parts.append("Add recommendations/suggestions")

        if scores["context"] < 70:
            feedback_parts.append("Add comparisons/benchmarks")

        if passed and not feedback_parts:
            feedback_parts.append("Good response - all criteria met")

        return "; ".join(feedback_parts)


class LLMScoringAgent(ScoringAgent):
    """Extended scoring agent that uses LLM for nuanced evaluation."""

    def __init__(self, model: str = "gemini-2.0-flash"):
        super().__init__(use_llm=True)
        self.model = model

    async def score_with_llm(self, question_id: str, question: str, response: str) -> Dict:
        """Use LLM to score response quality."""
        # Get rule-based scores first
        base_scores = self.score_response(question_id, question, response)

        # TODO: Add LLM-based evaluation for nuanced feedback
        # This would call Gemini/Claude to evaluate:
        # - Is the response actually helpful to a CEO?
        # - Are there any misleading statements?
        # - Is the tone appropriate?

        return base_scores


if __name__ == "__main__":
    # Test the scorer
    scorer = ScoringAgent()

    test_response = """**This Month's Bidding Activity:**

Proposals Sent: 15
Total Bid Value: $2,450,000
Avg Bid Size: $163,333

vs Last Month: +3 proposals

💡 On track for Q1 targets."""

    result = scorer.score_response("bid_volume", "How much did we bid this month?", test_response)

    print("Score Result:")
    print(f"  Total: {result['total_score']}/100")
    print(f"  Passed: {result['passed']}")
    print(f"  Dimensions: {result['dimension_scores']}")
    print(f"  Found: {result['elements_found']}")
    print(f"  Missing: {result['elements_missing']}")
    print(f"  Feedback: {result['feedback']}")
