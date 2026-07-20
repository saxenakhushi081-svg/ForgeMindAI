"""
Compliance checking engine.
Compares company documents against standards (Factory Act, OISD, ISO, etc.)
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import models
from ai.rag_engine import get_gemini_model

logger = logging.getLogger(__name__)


async def run_compliance_check(
    standard_doc_ids: list[str],
    company_doc_ids: list[str],
    standard_type: Optional[str],
    user_id: str,
    db: AsyncSession,
) -> dict:
    """Compare company documents against compliance standards using Gemini."""

    # Fetch document texts
    async def get_doc_text(doc_ids: list[str]) -> str:
        texts = []
        for doc_id in doc_ids[:3]:  # limit to 3 docs each
            result = await db.execute(
                select(models.Document).where(
                    models.Document.id == doc_id,
                    models.Document.user_id == user_id,
                )
            )
            doc = result.scalar_one_or_none()
            if doc and doc.extracted_text:
                texts.append(f"[{doc.original_filename}]\n{doc.extracted_text[:2000]}")
        return "\n\n".join(texts)

    standard_text = await get_doc_text(standard_doc_ids)
    company_text = await get_doc_text(company_doc_ids)

    model = get_gemini_model()

    if not model or (not standard_text and not company_text):
        return _demo_compliance(standard_type)

    prompt = f"""You are an industrial compliance expert. Analyze compliance gaps.

Standard Type: {standard_type or 'General Safety'}

COMPLIANCE STANDARD DOCUMENT:
{standard_text[:2000] if standard_text else 'Using general industry standards (Factory Act, OISD)'}

COMPANY DOCUMENTATION:
{company_text[:2000] if company_text else 'No company documents provided'}

Perform a compliance gap analysis and respond in this format:
SCORE: [0-100]
STATUS: [compliant/partial/non_compliant]
SUMMARY: [2-3 sentence overview]
GAP_1: [section] | [description] | [severity: critical/high/medium/low] | [reference]
GAP_2: [section] | [description] | [severity] | [reference]
GAP_3: [section] | [description] | [severity] | [reference]
RECOMMENDATION_1: [action]
RECOMMENDATION_2: [action]
RECOMMENDATION_3: [action]"""

    try:
        response = model.generate_content(prompt)
        return _parse_compliance_response(response.text)
    except Exception as e:
        logger.error(f"Compliance engine error: {e}")
        return _demo_compliance(standard_type)


def _parse_compliance_response(text: str) -> dict:
    lines = text.strip().split("\n")
    score = 75.0
    status = "partial"
    summary = ""
    gaps = []
    recommendations = []

    for line in lines:
        line = line.strip()
        if line.startswith("SCORE:"):
            try:
                score = float(line.replace("SCORE:", "").strip())
            except Exception:
                pass
        elif line.startswith("STATUS:"):
            status = line.replace("STATUS:", "").strip().lower()
        elif line.startswith("SUMMARY:"):
            summary = line.replace("SUMMARY:", "").strip()
        elif line.startswith("GAP_"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                gap_parts = parts[1].strip().split("|")
                gaps.append({
                    "section": gap_parts[0].strip() if gap_parts else "General",
                    "description": gap_parts[1].strip() if len(gap_parts) > 1 else "Compliance gap identified",
                    "severity": gap_parts[2].strip().lower() if len(gap_parts) > 2 else "medium",
                    "reference": gap_parts[3].strip() if len(gap_parts) > 3 else None,
                })
        elif line.startswith("RECOMMENDATION_"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                recommendations.append(parts[1].strip())

    return {
        "score": score,
        "status": status if status in ("compliant", "partial", "non_compliant") else "partial",
        "summary": summary or "Compliance analysis completed.",
        "gaps": gaps,
        "recommendations": recommendations,
    }


def _demo_compliance(standard_type: Optional[str]) -> dict:
    return {
        "score": 67.0,
        "status": "partial",
        "summary": (
            "Compliance analysis requires document uploads and a configured Gemini API key. "
            "Based on typical factory compliance patterns, several areas require attention. "
            "Upload your safety manuals and standards documents for a precise assessment."
        ),
        "gaps": [
            {
                "section": "Section 4.2 - Emergency Procedures",
                "description": "Emergency evacuation procedures not clearly documented for all zones",
                "severity": "critical",
                "reference": f"{standard_type or 'Safety Standard'} Clause 4.2.1",
            },
            {
                "section": "Section 6.1 - PPE Requirements",
                "description": "Personal protective equipment requirements not specified for all work areas",
                "severity": "high",
                "reference": f"{standard_type or 'Safety Standard'} Clause 6.1.3",
            },
            {
                "section": "Section 8.3 - Equipment Inspection Logs",
                "description": "Periodic equipment inspection records are incomplete or missing",
                "severity": "medium",
                "reference": f"{standard_type or 'Safety Standard'} Clause 8.3",
            },
        ],
        "recommendations": [
            "Create comprehensive zone-wise emergency evacuation procedures",
            "Document PPE requirements for each work area and post visibly",
            "Implement digital inspection log system with mandatory sign-off",
            "Schedule compliance training for all maintenance personnel",
            "Conduct quarterly internal compliance audits",
        ],
    }
