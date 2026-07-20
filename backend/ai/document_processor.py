"""
Document processing pipeline:
1. Extract text from PDF/DOCX/TXT/XLSX using PyMuPDF + Tesseract OCR
2. Chunk text
3. Generate embeddings using sentence-transformers
4. Store embeddings in FAISS
5. Save chunk metadata to PostgreSQL
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/forgemind_uploads")
FAISS_DIR = os.getenv("FAISS_DIR", "/tmp/forgemind_faiss")
os.makedirs(FAISS_DIR, exist_ok=True)

CHUNK_SIZE = 500        # characters per chunk
CHUNK_OVERLAP = 50      # character overlap between chunks


def extract_text_from_pdf(file_path: str) -> tuple[str, int, bool]:
    """Extract text from PDF using PyMuPDF; fall back to Tesseract OCR."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        pages = []
        needs_ocr = False

        for page in doc:
            text = page.get_text()
            if len(text.strip()) < 30:
                # Likely a scanned page — use OCR
                needs_ocr = True
                try:
                    import pytesseract
                    from PIL import Image
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    text = pytesseract.image_to_string(img)
                except Exception as e:
                    logger.warning(f"OCR failed for page: {e}")
                    text = ""
            pages.append(text)

        full_text = "\n\n".join(pages)
        doc.close()
        return full_text, len(pages), needs_ocr
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return "", 0, False


def extract_text_from_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def extract_text_from_xlsx(file_path: str) -> str:
    try:
        import openpyxl
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        rows = []
        for sheet in wb.worksheets:
            for row in sheet.iter_rows(values_only=True):
                row_text = " | ".join(str(c) for c in row if c is not None)
                if row_text.strip():
                    rows.append(row_text)
        return "\n".join(rows)
    except Exception as e:
        logger.error(f"XLSX extraction error: {e}")
        return ""


def extract_text(file_path: str, file_type: str) -> tuple[str, int, bool]:
    """Extract text based on file type."""
    if file_type == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_type == "docx":
        return extract_text_from_docx(file_path), 0, False
    elif file_type in ("txt", "csv"):
        with open(file_path, "r", errors="ignore") as f:
            text = f.read()
        return text, 0, False
    elif file_type == "xlsx":
        return extract_text_from_xlsx(file_path), 0, False
    return "", 0, False


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


def extract_machine_ids(text: str) -> list[str]:
    """Extract machine/equipment IDs using simple regex patterns."""
    import re
    # Common patterns: Pump-A, Compressor-B, Motor_01, BOILER-123
    patterns = [
        r'\b(Pump|Compressor|Motor|Boiler|Generator|Valve|Fan|Turbine|Conveyor|Reactor)\s*[-_]?\s*([A-Z0-9]+)\b',
        r'\b[A-Z]{2,4}[-_]\d{2,5}\b',  # EQ-1234, MN-001
    ]
    found = set()
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                found.add(" ".join(match).upper().strip())
            else:
                found.add(match.upper().strip())
    return list(found)[:20]  # limit to 20


def get_or_create_faiss_index(user_id: str):
    """Load existing FAISS index for user, or create a new one."""
    import numpy as np
    try:
        import faiss
        index_path = os.path.join(FAISS_DIR, f"{user_id}.index")
        if os.path.exists(index_path):
            return faiss.read_index(index_path)
        # Create new flat L2 index (384 dims for all-MiniLM-L6-v2)
        return faiss.IndexFlatL2(384)
    except Exception as e:
        logger.error(f"FAISS error: {e}")
        return None


def save_faiss_index(user_id: str, index):
    """Persist FAISS index to disk."""
    try:
        import faiss
        index_path = os.path.join(FAISS_DIR, f"{user_id}.index")
        faiss.write_index(index, index_path)
    except Exception as e:
        logger.error(f"FAISS save error: {e}")


def get_embedding_model():
    """Load sentence-transformer model (cached)."""
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        logger.warning(f"SentenceTransformer not available: {e}")
        return None


async def process_document_background(doc_id: str, file_path: str, file_type: str):
    """
    Background task: extract text, build embeddings, update DB.
    Runs in a thread pool to avoid blocking the event loop.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _process_document_sync, doc_id, file_path, file_type)


def _process_document_sync(doc_id: str, file_path: str, file_type: str):
    """Synchronous document processing (run in thread pool)."""
    import asyncio
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import models as m

    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    sync_engine = create_engine(DATABASE_URL)
    Session = sessionmaker(sync_engine)

    with Session() as session:
        doc = session.get(m.Document, doc_id)
        if not doc:
            return

        try:
            # 1. Extract text
            text, page_count, needs_ocr = extract_text(file_path, file_type)
            if not text:
                doc.status = "error"
                session.commit()
                return

            # 2. Update document
            doc.extracted_text = text[:500000]  # cap at 500K chars
            doc.extracted_text_preview = text[:500].strip()
            doc.page_count = page_count or None
            doc.machine_ids = extract_machine_ids(text)
            doc.status = "ocr_needed" if needs_ocr else "ready"
            doc.processed_at = datetime.now(timezone.utc)

            # 3. Chunk text
            chunks = chunk_text(text)
            if not chunks:
                doc.status = "ready"
                session.commit()
                return

            # 4. Generate embeddings
            model = get_embedding_model()
            if model is None:
                # Store chunks without embeddings (graceful degradation)
                for i, chunk in enumerate(chunks[:200]):
                    emb = m.DocumentEmbedding(
                        document_id=doc_id,
                        chunk_index=i,
                        chunk_text=chunk,
                    )
                    session.add(emb)
                doc.status = "ready"
                session.commit()
                return

            embeddings = model.encode(chunks, show_progress_bar=False)

            # 5. Get/create FAISS index
            user_id = doc.user_id
            index = get_or_create_faiss_index(user_id)
            if index is None:
                doc.status = "ready"
                session.commit()
                return

            # Get current index size for offset
            faiss_offset = index.ntotal

            # Add to FAISS
            import numpy as np
            embeddings_np = np.array(embeddings, dtype="float32")
            index.add(embeddings_np)
            save_faiss_index(user_id, index)

            # 6. Save chunk metadata to DB
            for i, (chunk, _) in enumerate(zip(chunks[:200], embeddings)):
                emb = m.DocumentEmbedding(
                    document_id=doc_id,
                    chunk_index=i,
                    chunk_text=chunk,
                    faiss_index=faiss_offset + i,
                )
                session.add(emb)

            doc.status = "ready"
            session.commit()
            logger.info(f"Document {doc_id} processed: {len(chunks)} chunks, {page_count} pages")

        except Exception as e:
            logger.error(f"Processing error for {doc_id}: {e}")
            doc.status = "error"
            session.commit()
