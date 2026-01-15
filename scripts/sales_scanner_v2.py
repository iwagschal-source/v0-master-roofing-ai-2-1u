"""
Sales Intelligence Scanner v2 - Fixed JSON parsing
"""

from google.cloud import bigquery
import google.generativeai as genai
import json
import uuid
import logging
import os
import re
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

PROJECT_ID = "master-roofing-intelligence"
bq_client = bigquery.Client(project=PROJECT_ID)
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
gemini = genai.GenerativeModel("gemini-2.0-flash-exp")

SALES_USERS = ["fkohn", "bshinde", "csufrin", "tkode", "srosman", "jfogel", "lathuru", "ahirsch"]

CLASSIFY_PROMPT = '''Classify this email for sales relevance. Return ONLY a JSON object, no other text.

EMAIL:
Subject: {subject}
From: {from_email}
Date: {date}
Body: {body}

Return this exact JSON format (no markdown, no explanation):
{{"is_sales_event":true,"event_type":"RFP_RECEIVED","project_name":"123 Main St","gc_name":"ABC Builders","summary":"New RFP received"}}

Event types: RFP_RECEIVED, PROPOSAL_SENT, FOLLOW_UP, WON, LOST, GC_RESPONSE, HOT_LEAD
If not sales related, return: {{"is_sales_event":false}}'''


def extract_json(text: str) -> Optional[Dict]:
    """Extract JSON from text with multiple fallback strategies."""
    if not text:
        return None

    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except:
        pass

    # Remove markdown code blocks
    if "```" in text:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except:
                pass

    # Find JSON object with regex
    match = re.search(r'\{[^{}]*"is_sales_event"[^{}]*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass

    # Try to find any valid JSON object
    for i, char in enumerate(text):
        if char == '{':
            depth = 0
            for j, c in enumerate(text[i:], i):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[i:j+1])
                        except:
                            break

    return None


async def classify_email(subject: str, from_email: str, date_str: str, body: str) -> Optional[Dict]:
    """Classify a single email."""
    if not body or len(body) < 20:
        return None

    prompt = CLASSIFY_PROMPT.format(
        subject=subject or "No subject",
        from_email=from_email or "Unknown",
        date=date_str,
        body=body[:1500]
    )

    try:
        response = gemini.generate_content(prompt)
        result = extract_json(response.text)

        if result and result.get("is_sales_event"):
            logger.info(f"Found event: {result.get('event_type')} - {result.get('summary', '')[:50]}")
            return result
        return None

    except Exception as e:
        logger.debug(f"Classification failed: {str(e)[:50]}")
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
                   OR LOWER(subject) LIKE "%award%" OR LOWER(subject) LIKE "%won%")
            ORDER BY date DESC
            LIMIT 50
            '''

            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("since", "TIMESTAMP", since)]
            )

            rows = list(bq_client.query(query, job_config=job_config).result())
            logger.info(f"Found {len(rows)} candidate emails for {user}")

            for row in rows:
                event = await classify_email(
                    subject=row.subject,
                    from_email=row.from_email,
                    date_str=str(row.date),
                    body=row.body_plain or ""
                )

                if event:
                    event["source"] = "email"
                    event["source_id"] = row.message_id
                    event["user"] = user
                    event["date"] = row.date
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
    logger.info(f"Starting sales scan for last {hours_back} hours")

    events = await scan_emails(hours_back)
    saved = await save_events(events)

    logger.info(f"Scan complete: {saved} events saved")

    return {"events_found": saved, "events": events}


# For testing
if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    result = asyncio.run(run_scan(720))
    print(f"Result: {result}")
