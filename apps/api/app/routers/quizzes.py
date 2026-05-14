from fastapi import APIRouter, HTTPException, status

from ..schemas import GenerateQuizRequest, QuizSession, SubmitQuizRequest, SubmitQuizResponse
from ..services.pipeline import generate_quiz, submit_quiz
from ..store import store

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


@router.post("/generate", response_model=QuizSession)
def create_quiz(payload: GenerateQuizRequest) -> QuizSession:
    try:
        return generate_quiz(store, payload)
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found") from error


@router.get("/{quiz_id}", response_model=QuizSession)
def get_quiz(quiz_id: str) -> QuizSession:
    quiz = store.get_quiz(quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


@router.post("/{quiz_id}/submit", response_model=SubmitQuizResponse)
def score_quiz(quiz_id: str, payload: SubmitQuizRequest) -> SubmitQuizResponse:
    try:
        score, report = submit_quiz(store, quiz_id, payload)
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found") from error

    return SubmitQuizResponse(
        attempt_id=report.id,
        score=score,
        status="needs_review" if any(q.type == "short_answer" for q in store.get_quiz(quiz_id).questions) else "scored",
    )

