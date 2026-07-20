"""
Notification routes.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()


def notif_to_dict(n: models.Notification) -> dict:
    return {
        "id": n.id,
        "type": n.notification_type,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "link": n.link,
        "created_at": n.created_at.isoformat(),
    }


@router.get("")
async def list_notifications(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Notification)
        .where(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(50)
    )
    return [notif_to_dict(n) for n in result.scalars()]


@router.put("/{notif_id}/read")
async def mark_notification_read(
    notif_id: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Notification).where(
            models.Notification.id == notif_id,
            models.Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif_to_dict(notif)


@router.put("/read-all")
async def mark_all_notifications_read(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(models.Notification)
        .where(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}
