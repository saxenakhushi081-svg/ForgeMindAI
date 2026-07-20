"""
Database configuration using SQLAlchemy async engine.
"""

import os
import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase


# ─── Connection URL ───────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Convert postgres:// → postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg does not accept sslmode as a query param — strip it and use connect_args
connect_args = {}
if "sslmode=require" in DATABASE_URL:
    DATABASE_URL = re.sub(r"[?&]sslmode=require", "", DATABASE_URL)
    DATABASE_URL = re.sub(r"[?&]$", "", DATABASE_URL)
    connect_args["ssl"] = "require"
elif "sslmode=" in DATABASE_URL:
    DATABASE_URL = re.sub(r"[?&]sslmode=[^&]*", "", DATABASE_URL)
    DATABASE_URL = re.sub(r"[?&]$", "", DATABASE_URL)

# ─── Engine & Session ─────────────────────────────────────────────────────────
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
