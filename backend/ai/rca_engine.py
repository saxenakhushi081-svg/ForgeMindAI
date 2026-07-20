"""
Root Cause Analysis Engine.
Uses RAG to search maintenance history and generate structured RCA reports.
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import models
from ai.rag_engine import retrieve_relevant_chunks, get_gemini_model

logger = logging.getLogger(__name__)


async def run_root_cause_analysis(
    query: str,
    machine_id: Optional[str],
    user_id: str,
    db: AsyncSession,
) -> dict:
    """
    RCA Pipeline:
    1. Retrieve maintenance history chunks from FAISS
    2. Search for similar past incidents
    3. Ask Gemini to analyze and produce structured RCA
    """
    # 1. Retrieve relevant context
    search_query = f"failure root cause {machine_id or ''} {query}"
    chunks = await retrieve_relevant_chunks(search_query, user_id, db, top_k=8)

    context_text = "\n---\n".join(c["chunk_text"] for c in chunks)
    sources = []
    seen = set()
    for chunk in chunks:
        if chunk["document_id"] not in seen:
            seen.add(chunk["document_id"])
            sources.append({
                "document_id": chunk["document_id"],
                "filename": chunk["filename"],
                "excerpt": chunk["chunk_text"][:200],
                "page_number": chunk.get("page_number"),
            })

    # 2. Generate RCA with Gemini
    model = get_gemini_model()

    rca_prompt = f"""You are an expert industrial failure analyst. Perform a comprehensive Root Cause Analysis.

Equipment/Machine: {machine_id or 'Not specified'}
Issue/Query: {query}

Document Context:
{context_text[:3000] if context_text else 'No documents uploaded yet.'}

Provide a structured RCA with:
1. SUMMARY: 2-3 sentence executive summary
2. ROOT_CAUSES: List 3 potential root causes with confidence (0-1) and category (mechanical/electrical/operational/environmental/human_error)
3. SIMILAR_INCIDENTS: Any similar past incidents found in documents
4. RECOMMENDATIONS: 5 specific corrective actions

Format your response as:
SUMMARY: [text]
ROOT_CAUSE_1: [cause] | [confidence] | [category]
ROOT_CAUSE_2: [cause] | [confidence] | [category]  
ROOT_CAUSE_3: [cause] | [confidence] | [category]
INCIDENT_1: [description] | [date if found] | [resolution]
RECOMMENDATION_1: [action]
RECOMMENDATION_2: [action]
RECOMMENDATION_3: [action]
RECOMMENDATION_4: [action]
RECOMMENDATION_5: [action]"""

    if model is None:
        # Fallback demo RCA when Gemini unavailable
        return _demo_rca(query, machine_id, sources)

    try:
        response = model.generate_content(rca_prompt)
        return _parse_rca_response(response.text, sources)
    except Exception as e:
        logger.error(f"RCA Gemini error: {e}")
        return _demo_rca(query, machine_id, sources)


def _parse_rca_response(text: str, sources: list) -> dict:
    """Parse structured Gemini RCA response."""
    lines = text.strip().split("\n")
    summary = ""
    root_causes = []
    recommendations = []
    similar_incidents = []

    for line in lines:
        line = line.strip()
        if line.startswith("SUMMARY:"):
            summary = line.replace("SUMMARY:", "").strip()
        elif line.startswith("ROOT_CAUSE_"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                cause_parts = parts[1].strip().split("|")
                if len(cause_parts) >= 3:
                    try:
                        root_causes.append({
                            "cause": cause_parts[0].strip(),
                            "confidence": float(cause_parts[1].strip()),
                            "category": cause_parts[2].strip().lower().replace(" ", "_"),
                        })
                    except Exception:
                        root_causes.append({
                            "cause": cause_parts[0].strip(),
                            "confidence": 0.7,
                            "category": "mechanical",
                        })
        elif line.startswith("INCIDENT_"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                inc_parts = parts[1].strip().split("|")
                similar_incidents.append({
                    "description": inc_parts[0].strip() if inc_parts else "",
                    "date": inc_parts[1].strip() if len(inc_parts) > 1 else None,
                    "resolution": inc_parts[2].strip() if len(inc_parts) > 2 else "See documentation",
                })
        elif line.startswith("RECOMMENDATION_"):
            parts = line.split(":", 1)
            if len(parts) > 1:
                recommendations.append(parts[1].strip())

    if not summary:
        summary = text[:300]

    return {
        "summary": summary,
        "root_causes": root_causes or [
            {"cause": "Insufficient information to determine root cause", "confidence": 0.3, "category": "operational"}
        ],
        "recommendations": recommendations or ["Review maintenance logs", "Inspect equipment thoroughly"],
        "similar_incidents": similar_incidents,
        "sources": sources,
    }


def _demo_rca(query: str, machine_id: Optional[str], sources: list) -> dict:
    """Demo RCA when AI is not configured."""
    return {
        "summary": (
            f"Analysis initiated for: '{query}'. "
            "Configure your Gemini API key in Settings to enable full AI-powered root cause analysis. "
            "Upload maintenance logs and inspection reports for more accurate results."
        ),
        "root_causes": [
            {"cause": "Mechanical wear and fatigue", "confidence": 0.72, "category": "mechanical"},
            {"cause": "Inadequate lubrication schedule", "confidence": 0.65, "category": "operational"},
            {"cause": "Environmental stress (temperature/vibration)", "confidence": 0.48, "category": "environmental"},
        ],
        "recommendations": [
            "Inspect bearings and seals for wear",
            "Review and update lubrication schedule",
            "Install vibration monitoring sensors",
            "Conduct thermal imaging inspection",
            "Update preventive maintenance checklist",
        ],
        "similar_incidents": [
            {
                "description": "Similar failure pattern reported in Q3 maintenance logs",
                "date": None,
                "resolution": "Component replacement and schedule update",
            }
        ],
        "sources": sources,
    }
