"""
RAG (Retrieval-Augmented Generation) Engine.
Retrieves relevant document chunks from FAISS, then sends to Gemini.
"""

import os
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import models

logger = logging.getLogger(__name__)

FAISS_DIR = os.getenv("FAISS_DIR", "/tmp/forgemind_faiss")
TOP_K = 5


def get_gemini_model():
    """Initialize Gemini generative model."""
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception as e:
        logger.warning(f"Gemini not available: {e}")
        return None


def get_embedding_model():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        return None


async def semantic_search(query: str, user_id: str, limit: int, db: AsyncSession) -> list[dict]:
    """Perform semantic search over user's documents using FAISS."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _semantic_search_sync, query, user_id, limit)


def _semantic_search_sync(query: str, user_id: str, limit: int) -> list[dict]:
    """Synchronous FAISS search."""
    try:
        import faiss
        import numpy as np
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        # Load FAISS index
        index_path = os.path.join(FAISS_DIR, f"{user_id}.index")
        if not os.path.exists(index_path):
            return []

        index = faiss.read_index(index_path)
        model = get_embedding_model()
        if model is None:
            return []

        # Encode query
        query_embedding = model.encode([query], show_progress_bar=False)
        query_np = np.array(query_embedding, dtype="float32")

        # Search FAISS
        distances, indices = index.search(query_np, min(limit * 2, index.ntotal))

        # Fetch chunk metadata from DB
        DATABASE_URL = os.getenv("DATABASE_URL", "")
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

        sync_engine = create_engine(DATABASE_URL)
        Session = sessionmaker(sync_engine)

        results = []
        with Session() as session:
            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0:
                    continue
                emb = session.query(models.DocumentEmbedding).filter(
                    models.DocumentEmbedding.faiss_index == int(idx)
                ).first()
                if emb:
                    doc = session.get(models.Document, emb.document_id)
                    if doc and doc.user_id == user_id:
                        score = float(1 / (1 + dist))  # convert distance to similarity
                        results.append({
                            "document_id": doc.id,
                            "filename": doc.original_filename,
                            "chunk_text": emb.chunk_text[:300],
                            "score": round(score, 4),
                            "page_number": emb.page_number,
                        })
                        if len(results) >= limit:
                            break

        return results
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        return []


async def retrieve_relevant_chunks(query: str, user_id: str, db: AsyncSession, top_k: int = TOP_K) -> list[dict]:
    """Retrieve top-K relevant chunks for RAG."""
    return await semantic_search(query, user_id, top_k, db)


async def answer_question(
    question: str,
    user_id: str,
    language: str = "en",
    db: AsyncSession = None,
) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant chunks from FAISS
    2. Build prompt with context
    3. Send to Gemini
    4. Return structured response with sources
    """
    # 1. Retrieve context
    chunks = await retrieve_relevant_chunks(question, user_id, db)

    context_text = ""
    sources = []
    seen_docs = set()

    for chunk in chunks:
        context_text += f"\n---\n{chunk['chunk_text']}\n"
        if chunk["document_id"] not in seen_docs:
            seen_docs.add(chunk["document_id"])
            sources.append({
                "document_id": chunk["document_id"],
                "filename": chunk["filename"],
                "excerpt": chunk["chunk_text"][:200],
                "page_number": chunk.get("page_number"),
            })

    # 2. Build prompt
    lang_instruction = "Please respond in Hindi." if language == "hi" else "Please respond in English."
    system_prompt = """You are ForgeMind AI, an expert industrial knowledge assistant. 
You help engineers, maintenance teams, and factory managers understand their equipment, 
perform root cause analysis, and ensure compliance with safety standards.
Be precise, technical, and cite sources when available.
Do not fabricate information not present in the context."""

    if context_text:
        prompt = f"""{system_prompt}

Context from uploaded documents:
{context_text}

Question: {question}

{lang_instruction}
Provide a detailed, accurate answer based on the document context. 
If information is not in the context, say so clearly.
At the end, provide a confidence score (0.0-1.0) on a new line as: CONFIDENCE: 0.X"""
    else:
        prompt = f"""{system_prompt}

No documents have been uploaded yet, or no relevant context was found.

Question: {question}

{lang_instruction}
Provide a general answer based on your industrial knowledge expertise.
Suggest the user upload relevant documents for more specific answers.
CONFIDENCE: 0.5"""

    # 3. Call Gemini
    model = get_gemini_model()
    if model is None:
        # Fallback response when Gemini is not configured
        return {
            "answer": (
                "ForgeMind AI requires a Gemini API key to generate AI responses. "
                "Please add your GEMINI_API_KEY in Settings → API Keys. "
                f"\n\nYour question was: *{question}*\n\n"
                "Once configured, I can search through your uploaded documents and provide "
                "detailed answers with source citations."
            ),
            "sources": sources,
            "confidence_score": 0.0,
        }

    try:
        response = model.generate_content(prompt)
        answer_text = response.text

        # Extract confidence score if present
        confidence = 0.75
        if "CONFIDENCE:" in answer_text:
            parts = answer_text.split("CONFIDENCE:")
            answer_text = parts[0].strip()
            try:
                confidence = float(parts[1].strip().split()[0])
            except Exception:
                pass

        return {
            "answer": answer_text,
            "sources": sources,
            "confidence_score": confidence,
        }
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return {
            "answer": f"AI service temporarily unavailable. Error: {str(e)[:200]}",
            "sources": sources,
            "confidence_score": 0.0,
        }


async def generate_suggested_questions(context_pieces: list[str]) -> list[str]:
    """Generate suggested questions based on document content."""
    if not context_pieces:
        return [
            "What is the maintenance schedule for critical equipment?",
            "Are there any compliance gaps in our safety documentation?",
            "Which machines have the most frequent failures?",
            "What are the safety procedures for high-pressure systems?",
            "Show me recent inspection records.",
        ]

    context = "\n".join(context_pieces[:3])
    model = get_gemini_model()
    if not model:
        return [
            "What maintenance actions are recommended?",
            "What safety procedures are documented?",
            "Which equipment requires immediate attention?",
            "What are the compliance requirements?",
            "Summarize the key findings in these documents.",
        ]

    try:
        prompt = f"""Based on this industrial document content, generate 5 relevant engineering questions a user might ask:

{context[:1000]}

Return exactly 5 questions, one per line, no numbering."""
        response = model.generate_content(prompt)
        lines = [l.strip() for l in response.text.strip().split("\n") if l.strip()]
        return lines[:5]
    except Exception:
        return [
            "What maintenance actions are recommended?",
            "What safety procedures apply?",
            "Which equipment needs attention?",
            "Are there compliance issues?",
            "Summarize the document findings.",
        ]
