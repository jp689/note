from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from uuid import uuid4

from ..database import get_db
from ..models import Document, User
from ..schemas import CamelModel, UserProfile
from ..security import hash_password, require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUserUpdate(CamelModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminUserCreate(CamelModel):
    email: str
    full_name: str
    password: str
    is_admin: bool = False
    is_active: bool = True


class AdminUserUpdateProfile(CamelModel):
    email: str | None = None
    full_name: str | None = None
    password: str | None = None


class AdminUserListResponse(CamelModel):
    users: list[UserProfile]
    total: int
    page: int
    page_size: int


class AdminStatsResponse(CamelModel):
    total_users: int
    active_users: int
    admin_users: int
    total_documents: int


class AdminDetailedStatsResponse(CamelModel):
    total_users: int
    active_users: int
    admin_users: int
    total_documents: int
    documents_by_status: dict[str, int]
    recent_documents: list[dict[str, str]]
    recent_users: list[dict[str, str]]


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminStatsResponse:
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    admin_users = db.scalar(select(func.count(User.id)).where(User.is_admin.is_(True))) or 0
    total_documents = db.scalar(select(func.count(Document.id))) or 0
    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_documents=total_documents,
    )


@router.get("/stats/detailed", response_model=AdminDetailedStatsResponse)
def get_admin_detailed_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDetailedStatsResponse:
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    admin_users = db.scalar(select(func.count(User.id)).where(User.is_admin.is_(True))) or 0
    total_documents = db.scalar(select(func.count(Document.id))) or 0

    # Documents by status
    status_rows = db.scalars(
        select(Document.status, func.count(Document.id)).group_by(Document.status)
    ).all()
    documents_by_status: dict[str, int] = {}
    for row in status_rows:
        # row is a Row with (status, count)
        documents_by_status[row[0]] = row[1]

    # Recent documents (last 5)
    recent_docs = db.scalars(
        select(Document).order_by(Document.created_at.desc()).limit(5)
    ).all()
    recent_documents = [
        {"id": d.id, "title": d.title, "status": d.status, "createdAt": d.created_at.isoformat()}
        for d in recent_docs
    ]

    # Recent users (last 5)
    recent_users_db = db.scalars(
        select(User).order_by(User.created_at.desc()).limit(5)
    ).all()
    recent_users = [
        {"id": u.id, "email": u.email, "fullName": u.full_name, "createdAt": u.created_at.isoformat()}
        for u in recent_users_db
    ]

    return AdminDetailedStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_documents=total_documents,
        documents_by_status=documents_by_status,
        recent_documents=recent_documents,
        recent_users=recent_users,
    )


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    is_active: bool | None = Query(None),
    is_admin: bool | None = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        pattern = f"%{search}%"
        filter_cond = or_(User.email.ilike(pattern), User.full_name.ilike(pattern))
        query = query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
        count_query = count_query.where(User.is_active.is_(is_active))

    if is_admin is not None:
        query = query.where(User.is_admin.is_(is_admin))
        count_query = count_query.where(User.is_admin.is_(is_admin))

    total = db.scalar(count_query) or 0
    offset = (page - 1) * page_size
    users = db.scalars(query.order_by(User.created_at.desc()).offset(offset).limit(page_size)).all()

    return AdminUserListResponse(
        users=[
            UserProfile(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_admin=u.is_admin,
                is_active=u.is_active,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/users", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserProfile:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = User(
        id=f"user-{uuid4().hex[:10]}",
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.patch("/users/{user_id}", response_model=UserProfile)
def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserProfile:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify your own account")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.patch("/users/{user_id}/profile", response_model=UserProfile)
def update_user_profile(
    user_id: str,
    payload: AdminUserUpdateProfile,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserProfile:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email is not None:
        existing = db.scalar(select(User).where(User.email == payload.email, User.id != user_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()
