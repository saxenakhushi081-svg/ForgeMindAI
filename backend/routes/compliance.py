"""
Compliance checking routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
import models
from auth_utils import get_current_user
from ai.compliance_engine import run_compliance_check

router = APIRouter()


class ComplianceCheckInput(BaseModel):
    standard_document_ids: list[str]
    company_document_ids: list[str]
    standard_type: Optional[str] = None


def report_to_dict(r: models.ComplianceReport) -> dict:
    return {
        "id": r.id,
        "standard_type": r.standard_type,
        "score": r.score,
        "status": r.status,
        "gaps": r.gaps or [],
        "recommendations": r.recommendations or [],
        "summary": r.summary,
        "created_at": r.created_at.isoformat(),
    }


@router.get("/reports")
async def list_compliance_reports(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ComplianceReport)
        .where(models.ComplianceReport.user_id == current_user.id)
        .order_by(models.ComplianceReport.created_at.desc())
    )
    return [report_to_dict(r) for r in result.scalars()]


@router.post("/check")
async def run_compliance(
    body: ComplianceCheckInput,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db.add(models.AiQueryLog(
        user_id=current_user.id,
        query_type="compliance",
        topic=body.standard_type,
    ))

    result = await run_compliance_check(
        standard_doc_ids=body.standard_document_ids,
        company_doc_ids=body.company_document_ids,
        standard_type=body.standard_type,
        user_id=current_user.id,
        db=db,
    )

    report = models.ComplianceReport(
        user_id=current_user.id,
        standard_type=body.standard_type,
        score=result["score"],
        status=result["status"],
        gaps=result["gaps"],
        recommendations=result["recommendations"],
        summary=result["summary"],
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return report_to_dict(report)


@router.get("/reports/{report_id}")
async def get_compliance_report(
    report_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ComplianceReport).where(
            models.ComplianceReport.id == report_id,
            models.ComplianceReport.user_id == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report_to_dict(report)


@router.delete("/reports/{report_id}")
async def delete_compliance_report(
    report_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ComplianceReport).where(
            models.ComplianceReport.id == report_id,
            models.ComplianceReport.user_id == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
    return {"message": "Compliance report deleted"}
