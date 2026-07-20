"""
Knowledge graph: extract entities and relationships from documents.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()


@router.get("")
async def get_knowledge_graph(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entities = await db.execute(
        select(models.KnowledgeEntity).where(models.KnowledgeEntity.user_id == current_user.id)
    )
    entity_list = entities.scalars().all()

    relations = await db.execute(
        select(models.KnowledgeRelation).where(models.KnowledgeRelation.user_id == current_user.id)
    )
    relation_list = relations.scalars().all()

    nodes = [
        {
            "id": e.id,
            "label": e.label,
            "type": e.entity_type,
            "properties": e.properties or {},
            "document_ids": e.document_ids or [],
        }
        for e in entity_list
    ]

    edges = [
        {
            "id": r.id,
            "source": r.source_id,
            "target": r.target_id,
            "relationship": r.relationship,
            "weight": r.weight,
        }
        for r in relation_list
    ]

    return {"nodes": nodes, "edges": edges}


@router.post("/extract")
async def extract_knowledge_graph(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger re-extraction of knowledge graph from all user documents."""
    from ai.knowledge_extractor import extract_knowledge_from_user_docs
    import asyncio

    # Fire and forget
    asyncio.create_task(extract_knowledge_from_user_docs(current_user.id, db))
    return {"message": "Knowledge graph extraction started"}


@router.get("/entities")
async def list_knowledge_entities(
    entity_type: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(models.KnowledgeEntity).where(models.KnowledgeEntity.user_id == current_user.id)
    if entity_type:
        query = query.where(models.KnowledgeEntity.entity_type == entity_type)

    result = await db.execute(query.order_by(models.KnowledgeEntity.mention_count.desc()))
    entities = result.scalars().all()

    return [
        {
            "id": e.id,
            "label": e.label,
            "type": e.entity_type,
            "mention_count": e.mention_count,
            "first_seen": e.first_seen.isoformat(),
        }
        for e in entities
    ]
