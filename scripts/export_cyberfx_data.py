"""Export curated Expert Advisor data from the legacy CyberFX SQLite database.

The script reads ExpertAdvisor and Review tables, builds a portfolio-friendly JSON
payload, and writes it to demo/data/cyberfx_export.json so the Netlify demo can
visualize real trading research history.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "cyberfx" / "db.sqlite3"
OUTPUT_PATH = ROOT / "demo" / "data" / "cyberfx_export.json"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

@dataclass
class AdvisorRecord:
    ea_name: str
    category: str
    personal_review: str
    approved: bool
    last_updated: str
    review_count: int
    sample_reviews: List[str]


def _connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise SystemExit(f"SQLite database not found at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_advisors(limit: int = 50) -> List[AdvisorRecord]:
    with _connect() as conn:
        advisors = conn.execute(
            """
            SELECT id, ea_name, category, personal_review, approved, last_updated
            FROM cyberfx_expertadvisor
            WHERE personal_review IS NOT NULL AND personal_review <> ''
            ORDER BY last_updated DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        review_stmt = """
            SELECT comment
            FROM cyberfx_review
            WHERE advisor_id = ? AND comment IS NOT NULL AND comment <> ''
            ORDER BY posted_date DESC
            LIMIT 3
        """

        payload = []
        for row in advisors:
            reviews = [r[0] for r in conn.execute(review_stmt, (row["id"],)).fetchall()]
            review_count = conn.execute(
                "SELECT COUNT(*) FROM cyberfx_review WHERE advisor_id = ?",
                (row["id"],),
            ).fetchone()[0]

            payload.append(
                AdvisorRecord(
                    ea_name=row["ea_name"],
                    category=row["category"],
                    personal_review=row["personal_review"],
                    approved=bool(row["approved"]),
                    last_updated=row["last_updated"],
                    review_count=review_count,
                    sample_reviews=reviews,
                )
            )
    return payload


def build_summary() -> dict:
    with _connect() as conn:
        total_eas = conn.execute("SELECT COUNT(*) FROM cyberfx_expertadvisor").fetchone()[0]
        total_reviews = conn.execute("SELECT COUNT(*) FROM cyberfx_review").fetchone()[0]
        category_counts = conn.execute(
            "SELECT category, COUNT(*) FROM cyberfx_expertadvisor GROUP BY category"
        ).fetchall()
    return {
        "total_expert_advisors": total_eas,
        "total_reviews": total_reviews,
        "category_breakdown": {row[0]: row[1] for row in category_counts},
    }


def export(limit: int = 50) -> None:
    advisors = fetch_advisors(limit)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": build_summary(),
        "advisors": [asdict(a) for a in advisors],
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Exported {len(advisors)} advisors to {OUTPUT_PATH}")


if __name__ == "__main__":
    export()
