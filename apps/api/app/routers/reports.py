from fastapi import APIRouter, HTTPException, status

from ..schemas import AttemptReport, ReviewQueueItem
from ..store import store

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports/{attempt_id}", response_model=AttemptReport)
def get_report(attempt_id: str) -> AttemptReport:
    report = store.get_report(attempt_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.get("/review-queue", response_model=list[ReviewQueueItem])
def get_review_queue() -> list[ReviewQueueItem]:
    return store.get_review_queue()

