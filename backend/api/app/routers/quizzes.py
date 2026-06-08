from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import QuizSession as QuizSessionModel, User
from ..schemas import GenerateQuizRequest, QuizSession, SubmitQuizRequest, SubmitQuizResponse
from ..security import get_current_user
from ..services.pipeline import generate_quiz, quiz_to_schema, submit_quiz

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


@router.post("/generate", response_model=QuizSession)
def create_quiz(
    payload: GenerateQuizRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizSession:
    try:
        return generate_quiz(db, user, payload)
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found") from error


@router.get("/{quiz_id}", response_model=QuizSession)
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizSession:
    quiz = db.scalar(
        select(QuizSessionModel)
        .options(selectinload(QuizSessionModel.questions))
        .where(QuizSessionModel.id == quiz_id, QuizSessionModel.user_id == user.id)
    )
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz_to_schema(quiz)


@router.post("/{quiz_id}/submit", response_model=SubmitQuizResponse)
def score_quiz(
    quiz_id: str,
    payload: SubmitQuizRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmitQuizResponse:
    try:
        score, report = submit_quiz(db, user, quiz_id, payload)
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found") from error

    return SubmitQuizResponse(
        attempt_id=report.id,
        score=score,
        status="needs_review",
    )
