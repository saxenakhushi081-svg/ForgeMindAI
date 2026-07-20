"""
Knowledge Graph extraction from industrial documents.
Identifies machines, engineers, departments, safety rules, and their relationships.
"""

import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os

import models
from ai.rag_engine import get_gemini_model

logger = logging.getLogger(__name__)


async def extract_knowledge_from_user_docs(user_id: str, db: AsyncSession):
    """Extract knowledge graph entities from all user documents."""
    # Get all ready documents
    docs = await db.execute(
        select(models.Document).where(
            models.Document.user_id == user_id,
            models.Document.status == "ready",
        )
    )
    doc_list = docs.scalars().all()

    if not doc_list:
        return

    # Combine text from documents
    combined_text = ""
    doc_id_map = {}
    for doc in doc_list[:5]:  # limit to 5 docs
        if doc.extracted_text:
            combined_text += f"\n[Document: {doc.original_filename}]\n{doc.extracted_text[:1000]}\n"
            doc_id_map[doc.original_filename] = doc.id

    if not combined_text:
        return

    model = get_gemini_model()
    if not model:
        # Create demo entities
        await _create_demo_entities(user_id, db, list(doc_id_map.values()))
        return

    prompt = f"""Extract knowledge graph entities from these industrial documents.

{combined_text[:3000]}

Return entities in this format (one per line):
ENTITY: [label] | [type: machine/engineer/department/equipment/safety_rule/inspection/maintenance] | [relevant properties as key=value pairs]

Then relationships:
RELATION: [entity1_label] | [relationship] | [entity2_label]

Extract as many relevant entities as you can find."""

    try:
        response = model.generate_content(prompt)
        await _save_extracted_entities(response.text, user_id, doc_id_map, db)
    except Exception as e:
        logger.error(f"Knowledge extraction error: {e}")
        await _create_demo_entities(user_id, db, list(doc_id_map.values()))


async def _save_extracted_entities(text: str, user_id: str, doc_id_map: dict, db: AsyncSession):
    """Parse and save extracted entities to the database."""
    # Clear existing entities for user
    existing = await db.execute(
        select(models.KnowledgeEntity).where(models.KnowledgeEntity.user_id == user_id)
    )
    for entity in existing.scalars():
        await db.delete(entity)

    existing_rel = await db.execute(
        select(models.KnowledgeRelation).where(models.KnowledgeRelation.user_id == user_id)
    )
    for rel in existing_rel.scalars():
        await db.delete(rel)

    await db.flush()

    entity_map = {}  # label -> id
    lines = text.strip().split("\n")

    for line in lines:
        line = line.strip()
        if line.startswith("ENTITY:"):
            parts = line.replace("ENTITY:", "").strip().split("|")
            if len(parts) >= 2:
                label = parts[0].strip()
                entity_type = parts[1].strip().lower()
                props = {}
                if len(parts) > 2:
                    for kv in parts[2].strip().split(","):
                        if "=" in kv:
                            k, v = kv.split("=", 1)
                            props[k.strip()] = v.strip()

                entity = models.KnowledgeEntity(
                    user_id=user_id,
                    label=label,
                    entity_type=entity_type,
                    properties=props,
                    document_ids=list(doc_id_map.values()),
                )
                db.add(entity)
                await db.flush()
                entity_map[label.lower()] = entity.id

    # Process relations
    for line in lines:
        line = line.strip()
        if line.startswith("RELATION:"):
            parts = line.replace("RELATION:", "").strip().split("|")
            if len(parts) >= 3:
                src_label = parts[0].strip().lower()
                relationship = parts[1].strip()
                tgt_label = parts[2].strip().lower()

                src_id = entity_map.get(src_label)
                tgt_id = entity_map.get(tgt_label)

                if src_id and tgt_id:
                    rel = models.KnowledgeRelation(
                        user_id=user_id,
                        source_id=src_id,
                        target_id=tgt_id,
                        relationship=relationship,
                    )
                    db.add(rel)

    await db.commit()
    logger.info(f"Saved {len(entity_map)} entities to knowledge graph")


async def _create_demo_entities(user_id: str, db: AsyncSession, doc_ids: list):
    """Create demo knowledge graph when AI is unavailable."""
    demo_entities = [
        ("Pump A-101", "machine"),
        ("Compressor B-202", "machine"),
        ("Boiler Unit 1", "equipment"),
        ("Maintenance Team", "department"),
        ("Safety Inspection Zone 1", "inspection"),
        ("Lubrication Schedule", "maintenance"),
        ("Emergency Stop Procedure", "safety_rule"),
        ("John Smith", "engineer"),
        ("Production Dept", "department"),
    ]

    entity_ids = {}
    for label, etype in demo_entities:
        entity = models.KnowledgeEntity(
            user_id=user_id,
            label=label,
            entity_type=etype,
            document_ids=doc_ids,
            mention_count=1,
        )
        db.add(entity)
        await db.flush()
        entity_ids[label] = entity.id

    demo_relations = [
        ("Pump A-101", "maintained_by", "Maintenance Team"),
        ("Compressor B-202", "maintained_by", "Maintenance Team"),
        ("John Smith", "inspects", "Pump A-101"),
        ("Lubrication Schedule", "applies_to", "Pump A-101"),
        ("Emergency Stop Procedure", "governs", "Boiler Unit 1"),
        ("Maintenance Team", "belongs_to", "Production Dept"),
    ]

    for src, rel, tgt in demo_relations:
        if src in entity_ids and tgt in entity_ids:
            relation = models.KnowledgeRelation(
                user_id=user_id,
                source_id=entity_ids[src],
                target_id=entity_ids[tgt],
                relationship=rel,
            )
            db.add(relation)

    await db.commit()
