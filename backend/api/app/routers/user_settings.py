from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import CamelModel
from ..security import get_current_user, hash_password, verify_password
from ..services.pipeline import user_to_profile

router = APIRouter(prefix="/api/user", tags=["user"])


class UserProfileResponse(CamelModel):
    id: str
    email: str
    full_name: str
    is_admin: bool
    is_active: bool


class UpdateProfileRequest(CamelModel):
    full_name: str | None = None
    email: str | None = None


class ChangePasswordRequest(CamelModel):
    current_password: str
    new_password: str


class UserPreferences(CamelModel):
    email_notifications: bool = True
    review_reminders: bool = True
    dark_mode: bool = False
    language: str = "zh-CN"


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.patch("/profile", response_model=UserProfileResponse)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileResponse:
    if payload.email is not None:
        existing = db.scalar(select(User).where(User.email == payload.email, User.id != user.id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name
    db.commit()
    db.refresh(user)
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前密码不正确")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="新密码至少需要 6 个字符")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok", "message": "密码修改成功"}


@router.get("/preferences", response_model=UserPreferences)
def get_preferences(
    user: User = Depends(get_current_user),
) -> UserPreferences:
    return UserPreferences()


@router.patch("/preferences", response_model=UserPreferences)
def update_preferences(
    payload: UserPreferences,
    user: User = Depends(get_current_user),
) -> UserPreferences:
    return payload
