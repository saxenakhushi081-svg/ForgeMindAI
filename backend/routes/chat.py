"""
AI Chat routes: sessions, messages, export, suggested questions.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
import models
from auth_utils import get_current_user
from ai.rag_engine import answer_question

router = APIRouter()


class ChatSessionInput(BaseModel):
    title: Optional[str] = None


class ChatMessageInput(BaseModel):
    content: str
    language: str = "en"


def session_to_dict(session: models.ChatSession, message_count: int = 0, last_message: str | None = None) -> dict:
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "message_count": message_count,
        "last_message": last_message,
    }


def message_to_dict(msg: models.ChatMessage) -> dict:
    return {
        "id": msg.id,
        "session_id": msg.session_id,
        "role": msg.role,
        "content": msg.content,
        "sources": msg.sources or [],
        "confidence_score": msg.confidence_score,
        "created_at": msg.created_at.isoformat(),
    }


@router.get("/sessions")
async def list_chat_sessions(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ChatSession)
        .where(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()

    output = []
    for session in sessions:
        msgs = await db.execute(
            select(func.count()).where(models.ChatMessage.session_id == session.id)
        )
        count = msgs.scalar() or 0

        last_msg = await db.execute(
            select(models.ChatMessage)
            .where(models.ChatMessage.session_id == session.id)
            .order_by(models.ChatMessage.created_at.desc())
            .limit(1)
        )
        last = last_msg.scalar_one_or_none()
        output.append(session_to_dict(session, count, last.content[:100] if last else None))

    return output


@router.post("/sessions", status_code=201)
async def create_chat_session(
    body: ChatSessionInput,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = models.ChatSession(
        user_id=current_user.id,
        title=body.title or "New Chat",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session_to_dict(session, 0, None)


@router.get("/sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ChatSession).where(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session_to_dict(session)


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ChatSession).where(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Not found")

    # Delete messages
    msgs = await db.execute(
        select(models.ChatMessage).where(models.ChatMessage.session_id == session_id)
    )
    for msg in msgs.scalars():
        await db.delete(msg)

    await db.delete(session)
    await db.commit()
    return {"message": "Chat session deleted"}


@router.get("/sessions/{session_id}/messages")
async def get_chat_messages(
    session_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session belongs to user
    session = await db.execute(
        select(models.ChatSession).where(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
    )
    if not session.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(models.ChatMessage)
        .where(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.asc())
    )
    return [message_to_dict(m) for m in result.scalars()]


@router.post("/sessions/{session_id}/messages")
async def send_chat_message(
    session_id: str,
    body: ChatMessageInput,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session
    session_result = await db.execute(
        select(models.ChatSession).where(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = models.ChatMessage(
        session_id=session_id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()

    # Auto-name session from first message
    if session.title == "New Chat":
        session.title = body.content[:60]
    session.updated_at = datetime.now(timezone.utc)

    # Log AI query
    db.add(models.AiQueryLog(
        user_id=current_user.id,
        query_type="chat",
        topic=None,
    ))

    # Get AI response via RAG
    ai_result = await answer_question(
        question=body.content,
        user_id=current_user.id,
        language=body.language,
        db=db,
    )

    # Save assistant message
    assistant_msg = models.ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_result["answer"],
        sources=ai_result.get("sources", []),
        confidence_score=ai_result.get("confidence_score"),
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return message_to_dict(assistant_msg)


@router.post("/sessions/{session_id}/export")
async def export_chat_session(
    session_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.ChatMessage)
        .where(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    lines = [f"# ForgeMind AI Chat Export\n"]
    for msg in messages:
        prefix = "You" if msg.role == "user" else "ForgeMind AI"
        lines.append(f"**{prefix}:** {msg.content}\n")
        if msg.sources:
            lines.append("*Sources: " + ", ".join(s.get("filename", "") for s in msg.sources) + "*\n")

    return {
        "export_text": "\n".join(lines),
        "filename": f"forgemind_chat_{session_id[:8]}.md",
    }


@router.get("/suggested-questions")
async def get_suggested_questions(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return suggested questions based on the user's uploaded documents."""
    # Check if user has documents
    doc_count = await db.scalar(
        select(func.count()).where(models.Document.user_id == current_user.id)
    ) or 0

    if doc_count == 0:
        return [
            "What is the maintenance schedule for Pump A?",
            "Why did Compressor B fail last month?",
            "What are the safety requirements for the boiler room?",
            "Show me the compliance gaps in our factory documentation.",
            "What equipment needs inspection this week?",
        ]

    # Fetch a sample of document content for context
    docs = await db.execute(
        select(models.Document)
        .where(
            models.Document.user_id == current_user.id,
            models.Document.status == "ready",
        )
        .limit(3)
    )
    doc_list = docs.scalars().all()

    context_pieces = [d.extracted_text_preview for d in doc_list if d.extracted_text_preview]

    from ai.rag_engine import generate_suggested_questions
    questions = await generate_suggested_questions(context_pieces)
    return questions
