"""
Sales Agent Evaluation Metrics
Defines what makes a good answer for each CEO question.
"""

# Scoring weights
WEIGHTS = {
    "completeness": 0.25,    # Does it answer all parts?
    "accuracy": 0.25,        # Are calculations/data correct?
    "actionability": 0.20,   # Does it suggest what to do?
    "context": 0.15,         # Does it provide benchmarks/comparisons?
    "formatting": 0.15,      # Is it readable and clear?
}

# Minimum acceptable score (0-100)
PASS_THRESHOLD = 75

# Each question's expected elements
QUESTION_CRITERIA = {
    "bid_volume": {
        "question": "How much did we bid this month?",
        "required_elements": [
            "proposal_count",           # Number of proposals sent
            "total_value",              # Total $ value of bids
            "avg_bid_size",             # Average bid amount
            "month_comparison",         # vs last month
        ],
        "actionable_insights": [
            "trend_direction",          # Up/down vs last month
            "pacing_indicator",         # On track for targets?
        ],
        "data_sources": ["PROPOSAL_SENT events", "dollar_amount field"],
    },

    "top_performer": {
        "question": "Who's our top performer?",
        "required_elements": [
            "ranked_list",              # Ordered by performance
            "win_count",                # Number of wins per person
            "proposal_count",           # Volume of proposals
            "won_value",                # Total $ won
        ],
        "actionable_insights": [
            "clear_leader",             # Who's #1?
            "performance_gap",          # Gap between top and others
        ],
        "data_sources": ["WON events by assignee", "PROPOSAL_SENT by assignee"],
    },

    "gc_focus": {
        "question": "Which GCs should we focus on?",
        "required_elements": [
            "ranked_gc_list",           # GCs ordered by ROI
            "win_rate_per_gc",          # Win % for each
            "volume_per_gc",            # Number of bids
            "roi_score",                # Combined metric
        ],
        "actionable_insights": [
            "top_3_recommendation",     # Clear "focus on these"
            "volume_threshold",         # Only GCs with enough data
        ],
        "data_sources": ["WON/LOST by gc_name", "bid counts"],
    },

    "response_speed": {
        "question": "Are we responding fast enough?",
        "required_elements": [
            "company_avg_turnaround",   # Overall average days
            "fastest_person",           # Best turnaround
            "slowest_person",           # Worst turnaround
            "benchmark_comparison",     # vs industry standard (3 days)
        ],
        "actionable_insights": [
            "status_indicator",         # Green/yellow/red
            "specific_recommendation",  # What to improve
        ],
        "data_sources": ["RFP_RECEIVED to PROPOSAL_SENT timing"],
    },

    "pipeline": {
        "question": "What's in the pipeline?",
        "required_elements": [
            "pending_count",            # Number of pending proposals
            "pending_value",            # Total $ awaiting decision
            "project_list",             # Names of pending projects
        ],
        "actionable_insights": [
            "oldest_pending",           # Which have been waiting longest
            "follow_up_needed",         # Suggest follow-ups
        ],
        "data_sources": ["PROPOSAL_SENT without WON/LOST"],
    },

    "slow_turnaround": {
        "question": "Who's been slow on turnaround?",
        "required_elements": [
            "ranked_by_slowness",       # Slowest first
            "days_per_person",          # Avg turnaround each
            "status_indicators",        # Red/yellow/green
        ],
        "actionable_insights": [
            "target_benchmark",         # "Under 3 days is goal"
            "who_needs_help",           # Specific people to address
        ],
        "data_sources": ["RFP to Proposal timing by assignee"],
    },

    "month_comparison": {
        "question": "How are we doing vs last month?",
        "required_elements": [
            "rfp_comparison",           # This month vs last
            "proposal_comparison",      # This month vs last
            "win_comparison",           # This month vs last
            "trend_arrows",             # Visual up/down indicators
        ],
        "actionable_insights": [
            "overall_trend",            # Better/worse/same
            "concern_areas",            # What's declining
        ],
        "data_sources": ["Events grouped by month"],
    },

    "stop_bidding": {
        "question": "Which GCs should we stop bidding?",
        "required_elements": [
            "low_winrate_gcs",          # GCs with <15% win rate
            "bid_count_filter",         # Only those with 3+ bids
            "specific_rates",           # Exact win % per GC
        ],
        "actionable_insights": [
            "clear_recommendation",     # "Consider dropping X"
            "threshold_explanation",    # Why 15% is the cutoff
        ],
        "data_sources": ["WON/LOST by gc_name with minimum samples"],
    },

    "job_size": {
        "question": "What's our average job size?",
        "required_elements": [
            "avg_won_size",             # Average of won jobs
            "avg_bid_size",             # Average of all bids
            "largest_job",              # Biggest single deal
        ],
        "actionable_insights": [
            "size_trend",               # Getting bigger/smaller?
            "sweet_spot",               # Optimal job size range
        ],
        "data_sources": ["dollar_amount from WON and PROPOSAL_SENT"],
    },

    "weekly_activity": {
        "question": "How many RFPs this week?",
        "required_elements": [
            "rfp_count_7days",          # New RFPs in 7 days
            "proposal_count_7days",     # Proposals sent
            "win_count_7days",          # Recent wins
            "recent_rfp_list",          # Names of new RFPs
        ],
        "actionable_insights": [
            "activity_level",           # Busy/slow week
            "immediate_action",         # What needs attention now
        ],
        "data_sources": ["Events from last 7 days"],
    },
}

# Test data scenarios
TEST_SCENARIOS = {
    "healthy_pipeline": {
        "description": "Normal business with good data",
        "expected_scores": {"min": 80, "target": 90},
    },
    "sparse_data": {
        "description": "Limited historical data",
        "expected_scores": {"min": 60, "target": 75},
    },
    "no_wins": {
        "description": "No won/lost events yet",
        "expected_scores": {"min": 50, "target": 70},
    },
}
