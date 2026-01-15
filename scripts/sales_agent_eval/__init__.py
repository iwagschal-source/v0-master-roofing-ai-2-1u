"""
Sales Agent Evaluation Framework
Tests and scores the 10 CEO questions for quality.
"""

from .metrics import QUESTION_CRITERIA, WEIGHTS, PASS_THRESHOLD
from .scoring_agent import ScoringAgent
from .eval_runner import SalesAgentEvaluator

__all__ = [
    "QUESTION_CRITERIA",
    "WEIGHTS",
    "PASS_THRESHOLD",
    "ScoringAgent",
    "SalesAgentEvaluator",
]
