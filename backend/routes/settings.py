"""
User settings routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()


class UserSettingsInput(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    email_alerts: Optional[bool] = None
    gemini_api_key: Optional[str] = None


def settings_to_dict(s: models.UserSettings) -> dict:
    return {
        "theme": s.theme,
        "language": s.language,
        "notifications_enabled": s.notifications_enabled,
        "email_alerts": s.email_alerts,
        "gemini_api_key": "***" if s.gemini_api_key else None,  # mask key
        "two_factor_enabled": s.two_factor_enabled,
    }


@router.get("")
async def get_settings(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.UserSettings).where(models.UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = models.UserSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings_to_dict(settings)


@router.put("")
async def update_settings(
    body: UserSettingsInput,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.UserSettings).where(models.UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = models.UserSettings(user_id=current_user.id)
        db.add(settings)

    if body.theme is not None:
        settings.theme = body.theme
    if body.language is not None:
        settings.language = body.language
    if body.notifications_enabled is not None:
        settings.notifications_enabled = body.notifications_enabled
    if body.email_alerts is not None:
        settings.email_alerts = body.email_alerts
    if body.gemini_api_key is not None:
        settings.gemini_api_key = body.gemini_api_key

    await db.commit()
    await db.refresh(settings)
    return settings_to_dict(settings)
