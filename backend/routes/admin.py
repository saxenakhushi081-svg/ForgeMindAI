"""
Admin routes: user management, analytics, document oversight.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
import models
from auth_utils import get_current_user, get_admin_user
from routes.auth import user_to_dict
from routes.documents import document_to_dict

router = APIRouter()


@router.get("/users")
async def admin_list_users(
    admin: models.User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.User).order_by(models.User.created_at.desc())
    )
    return [user_to_dict(u) for u in result.scalars()]


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    admin: models.User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}


@router.get("/analytics")
async def admin_get_analytics(
    admin: models.User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = await db.scalar(select(func.count()).select_from(models.User)) or 0
    total_documents = await db.scalar(select(func.count()).select_from(models.Document)) or 0
    total_queries = await db.scalar(select(func.count()).select_from(models.AiQueryLog)) or 0

    # Storage used (sum of document sizes in bytes -> MB)
    storage_bytes = await db.scalar(select(func.sum(models.Document.size))) or 0
    storage_mb = storage_bytes / (1024 * 1024)

    # Daily signups last 7 days
    from datetime import datetime, timedelta, timezone
    daily_signups = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        count = await db.scalar(
            select(func.count()).where(
                models.User.created_at >= day_start,
                models.User.created_at < day_end,
            )
        ) or 0
        daily_signups.append({"date": day.isoformat(), "count": count})

    # Document categories
    cat_result = await db.execute(
        select(models.Document.category, func.count().label("count"))
        .where(models.Document.category.isnot(None))
        .group_by(models.Document.category)
        .order_by(func.count().desc())
    )
    document_categories = [{"topic": row.category, "count": row.count} for row in cat_result]

    return {
        "total_users": total_users,
        "total_documents": total_documents,
        "total_queries": total_queries,
        "storage_used_mb": round(storage_mb, 2),
        "daily_signups": daily_signups,
        "document_categories": document_categories,
    }


@router.get("/documents")
async def admin_list_documents(
    admin: models.User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Document).order_by(models.Document.created_at.desc()).limit(200)
    )
    return [document_to_dict(d) for d in result.scalars()]
