from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import AuthRequest, AuthResponse, RegisterRequest
from ..security import create_access_token, hash_password, verify_password
from ..services.pipeline import user_to_profile

router = APIRouter(prefix="/api/auth", tags=["auth"])

AUTH_RATE_LIMIT = 10
AUTH_RATE_WINDOW_SECONDS = 60
_auth_attempts: dict[str, deque[float]] = defaultdict(deque)
_auth_attempts_lock = Lock()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _check_auth_rate_limit(request: Request, email: str) -> None:
    key = f"{_client_ip(request)}:{email.strip().lower()}"
    now = monotonic()
    with _auth_attempts_lock:
        attempts = _auth_attempts[key]
        while attempts and now - attempts[0] > AUTH_RATE_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= AUTH_RATE_LIMIT:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many authentication attempts")
        attempts.append(now)


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    _check_auth_rate_limit(request, payload.email)
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    user = User(
        id=f"user-{uuid4().hex[:10]}",
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=user_to_profile(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    _check_auth_rate_limit(request, payload.email)
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return AuthResponse(access_token=create_access_token(user.id), user=user_to_profile(user))
