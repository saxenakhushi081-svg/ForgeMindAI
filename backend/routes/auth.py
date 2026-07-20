"""
Authentication routes: signup, login, refresh, logout, forgot-password.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
import models
from auth_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)

router = APIRouter()


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class SignUpInput(BaseModel):
    name: str
    email: str
    password: str
    company: str | None = None


class LoginInput(BaseModel):
    email: str
    password: str


class RefreshTokenInput(BaseModel):
    refresh_token: str


class ForgotPasswordInput(BaseModel):
    email: str


def user_to_dict(user: models.User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "company": user.company,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat(),
    }


# ─── Routes ───────────────────────────────────────────────────────────────────
@router.post("/signup", status_code=201)
async def sign_up(body: SignUpInput, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(models.User).where(models.User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=body.email,
        name=body.name,
        company=body.company,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()

    # Create default settings for the user
    settings = models.UserSettings(user_id=user.id)
    db.add(settings)

    # Welcome notification
    notif = models.Notification(
        user_id=user.id,
        notification_type="system",
        title="Welcome to ForgeMind AI",
        message="Start by uploading your first industrial document.",
    )
    db.add(notif)
    await db.commit()

    return {
        "access_token": create_access_token(user.id, user.email),
        "refresh_token": create_refresh_token(user.id),
        "user": user_to_dict(user),
    }


@router.post("/login")
async def login(body: LoginInput, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "access_token": create_access_token(user.id, user.email),
        "refresh_token": create_refresh_token(user.id),
        "user": user_to_dict(user),
    }


@router.post("/refresh")
async def refresh_token(body: RefreshTokenInput, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "access_token": create_access_token(user.id, user.email),
        "refresh_token": create_refresh_token(user.id),
        "user": user_to_dict(user),
    }


@router.post("/logout")
async def logout():
    # JWT is stateless; client should discard token
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordInput):
    # In production: send reset email via SMTP/SendGrid
    # For hackathon: acknowledge the request
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.get("/me")
async def get_current_user_route(current_user: models.User = Depends(get_current_user)):
    return user_to_dict(current_user)
