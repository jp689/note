from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Notification, User
from ..schemas import CamelModel
from ..security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationItem(CamelModel):
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    link: str | None = None
    created_at: str


class NotificationListResponse(CamelModel):
    items: list[NotificationItem]
    unread_count: int


class MarkReadRequest(CamelModel):
    notification_ids: list[str]


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NotificationListResponse:
    items = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(desc(Notification.created_at))
        .limit(50)
    ).all()
    unread_count = db.scalar(
        select(func.count(Notification.id))
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
    ) or 0
    return NotificationListResponse(
        items=[
            NotificationItem(
                id=n.id,
                type=n.type,
                title=n.title,
                message=n.message,
                is_read=n.is_read,
                link=n.link,
                created_at=n.created_at.isoformat(),
            )
            for n in items
        ],
        unread_count=unread_count,
    )


@router.post("/read")
def mark_notifications_read(
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not payload.notification_ids:
        return {"status": "ok"}
    items = db.scalars(
        select(Notification).where(
            Notification.id.in_(payload.notification_ids),
            Notification.user_id == user.id,
        )
    ).all()
    for item in items:
        item.is_read = True
    db.commit()
    return {"status": "ok"}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    items = db.scalars(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.is_read.is_(False),
        )
    ).all()
    for item in items:
        item.is_read = True
    db.commit()
    return {"status": "ok"}
