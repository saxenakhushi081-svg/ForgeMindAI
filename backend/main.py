"""
ForgeMind AI - FastAPI Backend Entry Point
Industrial Knowledge Intelligence Platform
"""

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routes import (
    auth, dashboard, documents, chat,
    knowledge_graph, rca, compliance,
    notifications, settings, admin
)

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ─── App Lifespan ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting ForgeMind AI backend...")
    # Create database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")
    yield
    logger.info("Shutting down ForgeMind AI backend...")


# ─── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="ForgeMind AI API",
    description="Industrial Knowledge Intelligence Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Uploads directory ────────────────────────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/forgemind_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── Routes ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router,           prefix=f"{API_PREFIX}/auth",           tags=["auth"])
app.include_router(dashboard.router,      prefix=f"{API_PREFIX}/dashboard",      tags=["dashboard"])
app.include_router(documents.router,      prefix=f"{API_PREFIX}/documents",      tags=["documents"])
app.include_router(chat.router,           prefix=f"{API_PREFIX}/chat",           tags=["chat"])
app.include_router(knowledge_graph.router,prefix=f"{API_PREFIX}/knowledge-graph",tags=["knowledge-graph"])
app.include_router(rca.router,            prefix=f"{API_PREFIX}/rca",            tags=["rca"])
app.include_router(compliance.router,     prefix=f"{API_PREFIX}/compliance",     tags=["compliance"])
app.include_router(notifications.router,  prefix=f"{API_PREFIX}/notifications",  tags=["notifications"])
app.include_router(settings.router,       prefix=f"{API_PREFIX}/settings",       tags=["settings"])
app.include_router(admin.router,          prefix=f"{API_PREFIX}/admin",          tags=["admin"])


@app.get("/api/healthz", tags=["health"])
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
