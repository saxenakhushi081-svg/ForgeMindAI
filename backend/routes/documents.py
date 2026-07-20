"""
Document management: upload, list, search, delete, reprocess.
"""

import os
import shutil
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from database import get_db
import models
from auth_utils import get_current_user
from ai.document_processor import process_document_background

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/forgemind_uploads")
ALLOWED_TYPES = {"pdf", "docx", "txt", "xlsx", "csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def get_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    return ext if ext in ALLOWED_TYPES else "txt"


def document_to_dict(doc: models.Document) -> dict:
    return {
        "id": doc.id,
        "filename": doc.filename,
        "original_filename": doc.original_filename,
        "file_type": doc.file_type,
        "size": doc.size,
        "status": doc.status,
        "category": doc.category,
        "extracted_text_preview": doc.extracted_text_preview,
        "page_count": doc.page_count,
        "machine_ids": doc.machine_ids or [],
        "created_at": doc.created_at.isoformat(),
        "processed_at": doc.processed_at.isoformat() if doc.processed_at else None,
    }


@router.get("")
async def list_documents(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(models.Document).where(models.Document.user_id == current_user.id)

    if search:
        query = query.where(
            or_(
                models.Document.original_filename.ilike(f"%{search}%"),
                models.Document.extracted_text_preview.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.where(models.Document.category == category)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    docs = await db.execute(
        query.order_by(models.Document.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    return {
        "items": [document_to_dict(d) for d in docs.scalars()],
        "total": total or 0,
        "page": page,
        "limit": limit,
    }


@router.post("/upload", status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    file_type = get_file_type(file.filename or "file.txt")
    safe_filename = f"{uuid.uuid4()}.{file_type}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save file to disk
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    doc = models.Document(
        user_id=current_user.id,
        filename=safe_filename,
        original_filename=file.filename or safe_filename,
        file_type=file_type,
        size=len(content),
        status="processing",
        category=category,
        file_path=file_path,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process in background (extract text, build embeddings)
    background_tasks.add_task(process_document_background, doc.id, file_path, file_type)

    return document_to_dict(doc)


@router.get("/search")
async def search_documents(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search across document chunks using FAISS."""
    from ai.rag_engine import semantic_search
    results = await semantic_search(q, current_user.id, limit, db)
    return results


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Document).where(
            models.Document.id == doc_id,
            models.Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return document_to_dict(doc)


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Document).where(
            models.Document.id == doc_id,
            models.Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    # Delete embeddings
    embeddings = await db.execute(
        select(models.DocumentEmbedding).where(models.DocumentEmbedding.document_id == doc_id)
    )
    for emb in embeddings.scalars():
        await db.delete(emb)

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully"}


@router.post("/{doc_id}/reprocess")
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Document).where(
            models.Document.id == doc_id,
            models.Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = "processing"
    await db.commit()

    background_tasks.add_task(process_document_background, doc.id, doc.file_path, doc.file_type)
    return {"message": "Document reprocessing started"}
