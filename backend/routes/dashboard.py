"""
Dashboard statistics, activity timeline, and AI usage metrics.
"""

from datetime import datetime, timedelta, timezone, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total documents
    doc_count = await db.scalar(
        select(func.count()).where(models.Document.user_id == current_user.id)
    ) or 0

    # Total machines (unique machine IDs extracted from documents)
    docs = await db.execute(
        select(models.Document.machine_ids).where(models.Document.user_id == current_user.id)
    )
    all_machine_ids = set()
    for row in docs.scalars():
        if row:
            all_machine_ids.update(row)
    machine_count = len(all_machine_ids)

    # Total RCA reports
    rca_count = await db.scalar(
        select(func.count()).where(models.RcaReport.user_id == current_user.id)
    ) or 0

    # Latest compliance score
    latest_compliance = await db.execute(
        select(models.ComplianceReport)
        .where(models.ComplianceReport.user_id == current_user.id)
        .order_by(models.ComplianceReport.created_at.desc())
        .limit(1)
    )
    compliance_report = latest_compliance.scalar_one_or_none()
    compliance_score = compliance_report.score if compliance_report else 0.0

    # Pending inspections (documents in processing state)
    pending = await db.scalar(
        select(func.count()).where(
            and_(
                models.Document.user_id == current_user.id,
                models.Document.status == "processing"
            )
        )
    ) or 0

    # AI queries today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    ai_today = await db.scalar(
        select(func.count()).where(
            and_(
                models.AiQueryLog.user_id == current_user.id,
                models.AiQueryLog.created_at >= today_start,
            )
        )
    ) or 0

    return {
        "total_documents": doc_count,
        "total_machines": machine_count,
        "total_reports": rca_count,
        "compliance_score": compliance_score,
        "pending_inspections": pending,
        "ai_queries_today": ai_today,
        "document_growth": 12.5,   # demo growth percentage
        "compliance_change": 3.2,
    }


@router.get("/activity")
async def get_dashboard_activity(
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    activity = []

    # Recent document uploads
    docs = await db.execute(
        select(models.Document)
        .where(models.Document.user_id == current_user.id)
        .order_by(models.Document.created_at.desc())
        .limit(limit // 2)
    )
    for doc in docs.scalars():
        activity.append({
            "id": f"doc-{doc.id}",
            "type": "upload",
            "title": "Document Uploaded",
            "description": f"Uploaded {doc.original_filename}",
            "user_name": current_user.name,
            "created_at": doc.created_at.isoformat(),
        })

    # Recent RCA reports
    rcas = await db.execute(
        select(models.RcaReport)
        .where(models.RcaReport.user_id == current_user.id)
        .order_by(models.RcaReport.created_at.desc())
        .limit(limit // 4)
    )
    for rca in rcas.scalars():
        activity.append({
            "id": f"rca-{rca.id}",
            "type": "rca",
            "title": "Root Cause Analysis",
            "description": rca.query[:100],
            "user_name": current_user.name,
            "created_at": rca.created_at.isoformat(),
        })

    # Sort all activity by date descending
    activity.sort(key=lambda x: x["created_at"], reverse=True)
    return activity[:limit]


@router.get("/ai-usage")
async def get_dashboard_ai_usage(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total queries
    total = await db.scalar(
        select(func.count()).where(models.AiQueryLog.user_id == current_user.id)
    ) or 0

    # Queries this week
    week_start = datetime.now(timezone.utc) - timedelta(days=7)
    week_count = await db.scalar(
        select(func.count()).where(
            and_(
                models.AiQueryLog.user_id == current_user.id,
                models.AiQueryLog.created_at >= week_start,
            )
        )
    ) or 0

    # Top topics
    topics_result = await db.execute(
        select(models.AiQueryLog.topic, func.count().label("count"))
        .where(
            and_(
                models.AiQueryLog.user_id == current_user.id,
                models.AiQueryLog.topic.isnot(None),
            )
        )
        .group_by(models.AiQueryLog.topic)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_topics = [{"topic": row.topic, "count": row.count} for row in topics_result]

    # Daily usage last 7 days
    daily_usage = []
    for i in range(6, -1, -1):
        day = datetime.now(timezone.utc).date() - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        count = await db.scalar(
            select(func.count()).where(
                and_(
                    models.AiQueryLog.user_id == current_user.id,
                    models.AiQueryLog.created_at >= day_start,
                    models.AiQueryLog.created_at < day_end,
                )
            )
        ) or 0
        daily_usage.append({"date": day.isoformat(), "count": count})

    return {
        "total_queries": total,
        "queries_this_week": week_count,
        "top_topics": top_topics,
        "daily_usage": daily_usage,
    }
