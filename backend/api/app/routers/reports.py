from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import FeedbackReport, ReviewQueueItem as ReviewQueueItemModel, User
from ..schemas import AttemptReport, ReviewQueueItem
from ..security import get_current_user
from ..services.pipeline import report_to_schema, review_to_schema

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports/latest", response_model=AttemptReport | None)
def get_latest_report(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AttemptReport | None:
    report = db.scalar(
        select(FeedbackReport).where(FeedbackReport.user_id == user.id).order_by(desc(FeedbackReport.created_at))
    )
    return report_to_schema(report) if report else None


@router.get("/reports/{attempt_id}", response_model=AttemptReport)
def get_report(
    attempt_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AttemptReport:
    report = db.scalar(
        select(FeedbackReport).where(FeedbackReport.id == attempt_id, FeedbackReport.user_id == user.id)
    )
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report_to_schema(report)


@router.get("/review-queue", response_model=list[ReviewQueueItem])
def get_review_queue(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ReviewQueueItem]:
    items = db.scalars(
        select(ReviewQueueItemModel)
        .where(ReviewQueueItemModel.user_id == user.id, ReviewQueueItemModel.status == "pending")
        .order_by(desc(ReviewQueueItemModel.created_at))
    ).all()
    return [review_to_schema(item) for item in items]


@router.post("/review-queue/{knowledge_node_id}/complete", response_model=ReviewQueueItem)
def complete_review_item(
    knowledge_node_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewQueueItem:
    item = db.scalar(
        select(ReviewQueueItemModel)
        .where(
            ReviewQueueItemModel.user_id == user.id,
            ReviewQueueItemModel.knowledge_node_id == knowledge_node_id,
            ReviewQueueItemModel.status == "pending",
        )
        .order_by(desc(ReviewQueueItemModel.created_at))
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review item not found")
    item.status = "done"
    db.commit()
    db.refresh(item)
    return review_to_schema(item)
