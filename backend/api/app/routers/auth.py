from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import LoginLog, User
from ..schemas import AuthRequest, AuthResponse, RegisterRequest
from ..security import create_access_token, verify_password
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


def _write_login_log(
    db: Session,
    request: Request,
    email: str,
    *,
    user: User | None = None,
    success: bool,
    failure_reason: str | None = None,
) -> None:
    db.add(
        LoginLog(
            id=f"login-{uuid4().hex[:12]}",
            user_id=user.id if user else None,
            email=email,
            ip_address=_client_ip(request),
            success=success,
            failure_reason=failure_reason,
        )
    )
    db.commit()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    _check_auth_rate_limit(request, payload.email)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration is not open")


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    _check_auth_rate_limit(request, payload.email)
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        _write_login_log(db, request, payload.email, success=False, failure_reason="Invalid credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        _write_login_log(db, request, payload.email, user=user, success=False, failure_reason="Account is deactivated")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    _write_login_log(db, request, payload.email, user=user, success=True)
    return AuthResponse(access_token=create_access_token(user.id), user=user_to_profile(user))
