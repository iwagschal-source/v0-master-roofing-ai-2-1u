"""
Sales Scanner - Simple keyword-based version (no LLM)
Populates data for dashboard development
"""

from google.cloud import bigquery
import json
import uuid
import logging
import re
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

PROJECT_ID = "master-roofing-intelligence"
bq_client = bigquery.Client(project=PROJECT_ID)

SALES_USERS = ["fkohn", "bshinde", "csufrin", "tkode", "srosman", "jfogel", "lathuru", "ahirsch"]

# Keyword patterns for classification
PATTERNS = {
    "RFP_RECEIVED": [r"invitation to bid", r"request for proposal", r"rfp", r"itb", r"please bid", r"looking for.*quote"],
    "PROPOSAL_SENT": [r"attached.*proposal", r"please find.*estimate", r"submitted.*bid", r"our proposal", r"quote attached"],
    "WON": [r"you.*won", r"awarded", r"contract signed", r"congratulations.*job", r"selected your", r"we.*going with.*master"],
    "LOST": [r"not selected", r"went with another", r"decided.*different", r"sorry.*inform", r"unfortunately"],
    "FOLLOW_UP": [r"following up", r"checking in", r"any update", r"status of", r"decision.*made"],
    "GC_RESPONSE": [r"re:.*proposal", r"re:.*bid", r"regarding your quote", r"questions.*proposal"],
}

def classify_by_keywords(subject: str, body: str) -> Optional[Dict]:
    """Simple keyword classification."""
    text = f"{subject} {body}".lower()

    for event_type, patterns in PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                # Extract project name (common patterns)
                project_match = re.search(r"(\d+\s+[a-zA-Z]+\s+(st|street|ave|avenue|rd|road|blvd|place|pl))", text, re.IGNORECASE)
                project_name = project_match.group(1) if project_match else None

                # Extract amount if present
                amount_match = re.search(r"\$([\d,]+)", text)
                amount = int(amount_match.group(1).replace(",", "")) if amount_match else None

                return {
                    "is_sales_event": True,
                    "event_type": event_type,
                    "project_name": project_name,
                    "gc_name": None,
                    "dollar_amount": amount,
                    "summary": subject[:100] if subject else "Sales event detected",
                    "urgency": "HIGH" if event_type in ["RFP_RECEIVED", "WON", "LOST"] else "MEDIUM"
                }

    return None

async def scan_emails(hours_back: int = 720) -> List[Dict]:
    """Scan emails for sales events."""
    events = []
    since = datetime.utcnow() - timedelta(hours=hours_back)

    for user in SALES_USERS:
        try:
            query = f'''
            SELECT message_id, subject, body_plain, from_email, date
            FROM `{PROJECT_ID}.mr_brain.{user}_emails_raw`
            WHERE date > @since
              AND (LOWER(subject) LIKE "%rfp%" OR LOWER(subject) LIKE "%proposal%"
                   OR LOWER(subject) LIKE "%bid%" OR LOWER(subject) LIKE "%quote%"
                   OR LOWER(subject) LIKE "%award%" OR LOWER(subject) LIKE "%won%"
                   OR LOWER(body_plain) LIKE "%invitation to bid%")
            ORDER BY date DESC
            LIMIT 100
            '''

            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("since", "TIMESTAMP", since)]
            )

            rows = list(bq_client.query(query, job_config=job_config).result())
            logger.info(f"Found {len(rows)} candidate emails for {user}")

            for row in rows:
                event = classify_by_keywords(row.subject or "", row.body_plain or "")

                if event:
                    event["source"] = "email"
                    event["source_id"] = row.message_id
                    event["user"] = user
                    event["date"] = str(row.date) if row.date else None
                    event["from_email"] = row.from_email
                    events.append(event)

        except Exception as e:
            if "not found" not in str(e).lower():
                logger.warning(f"Scan error for {user}: {str(e)[:80]}")

    return events

async def save_events(events: List[Dict]) -> int:
    """Save events to BigQuery."""
    if not events:
        return 0

    records = []
    for event in events:
        records.append({
            "event_id": str(uuid.uuid4()),
            "event_date": str(date.today()),
            "event_type": event.get("event_type", "UNKNOWN"),
            "source": event.get("source"),
            "project_name": event.get("project_name"),
            "gc_name": event.get("gc_name"),
            "summary": str(event.get("summary", ""))[:500],
            "dollar_amount": event.get("dollar_amount"),
            "assignee": event.get("user"),
            "urgency": event.get("urgency", "MEDIUM"),
            "raw_data": json.dumps(event)[:2000],
            "scanned_at": datetime.utcnow().isoformat()
        })

    table_ref = f"{PROJECT_ID}.ko_sales.daily_events"
    errors = bq_client.insert_rows_json(table_ref, records)

    if errors:
        logger.error(f"Insert errors: {errors}")
        return 0

    return len(records)

async def run_scan(hours_back: int = 720) -> Dict:
    """Run the sales scan."""
    logger.info(f"Starting keyword-based sales scan for last {hours_back} hours")

    events = await scan_emails(hours_back)
    logger.info(f"Found {len(events)} sales events via keywords")

    saved = await save_events(events)
    logger.info(f"Saved {saved} events to BigQuery")

    # Group by type
    by_type = {}
    for e in events:
        t = e.get("event_type", "UNKNOWN")
        by_type[t] = by_type.get(t, 0) + 1

    return {"events_found": saved, "by_type": by_type}

# FastAPI router
from fastapi import APIRouter, BackgroundTasks

router = APIRouter(prefix="/api/sales", tags=["Sales Intelligence"])

@router.post("/scan")
async def scan_now(background_tasks: BackgroundTasks, hours_back: int = 720):
    import asyncio
    background_tasks.add_task(lambda: asyncio.run(run_scan(hours_back)))
    return {"status": "started", "message": f"Scanning last {hours_back} hours (keyword mode)"}

@router.get("/events/today")
async def get_today_events():
    query = f'''SELECT * FROM `{PROJECT_ID}.ko_sales.daily_events`
               WHERE event_date = CURRENT_DATE() ORDER BY scanned_at DESC'''
    results = [dict(row) for row in bq_client.query(query).result()]
    return {"count": len(results), "events": results}

@router.get("/events/all")
async def get_all_events():
    query = f'''SELECT * FROM `{PROJECT_ID}.ko_sales.daily_events` ORDER BY scanned_at DESC LIMIT 500'''
    results = [dict(row) for row in bq_client.query(query).result()]
    return {"count": len(results), "events": results}

if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    result = asyncio.run(run_scan(720))
    print(f"Result: {result}")
