"""
Root Cause Analysis routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
import models
from auth_utils import get_current_user
from ai.rca_engine import run_root_cause_analysis

router = APIRouter()


class RcaInput(BaseModel):
    query: str
    machine_id: Optional[str] = None
    document_ids: list[str] = []


def report_to_dict(r: models.RcaReport) -> dict:
    return {
        "id": r.id,
        "query": r.query,
        "machine_id": r.machine_id,
        "summary": r.summary,
        "root_causes": r.root_causes or [],
        "recommendations": r.recommendations or [],
        "similar_incidents": r.similar_incidents or [],
        "sources": r.sources or [],
        "created_at": r.created_at.isoformat(),
    }


@router.post("/analyze")
async def analyze_root_cause(
    body: RcaInput,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Log query
    db.add(models.AiQueryLog(
        user_id=current_user.id,
        query_type="rca",
        topic=body.machine_id,
    ))

    result = await run_root_cause_analysis(
        query=body.query,
        machine_id=body.machine_id,
        user_id=current_user.id,
        db=db,
    )

    report = models.RcaReport(
        user_id=current_user.id,
        query=body.query,
        machine_id=body.machine_id,
        summary=result["summary"],
        root_causes=result["root_causes"],
        recommendations=result["recommendations"],
        similar_incidents=result.get("similar_incidents", []),
        sources=result.get("sources", []),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return report_to_dict(report)


@router.get("/history")
async def get_rca_history(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.RcaReport)
        .where(models.RcaReport.user_id == current_user.id)
        .order_by(models.RcaReport.created_at.desc())
    )
    return [report_to_dict(r) for r in result.scalars()]


@router.get("/{report_id}")
async def get_rca_report(
    report_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.RcaReport).where(
            models.RcaReport.id == report_id,
            models.RcaReport.user_id == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report_to_dict(report)
