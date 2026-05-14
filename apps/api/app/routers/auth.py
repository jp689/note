from fastapi import APIRouter, HTTPException, status

from ..schemas import AuthRequest, AuthResponse, RegisterRequest
from ..store import store

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> AuthResponse:
    if payload.email in store.users:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    return store.register(payload.email, payload.full_name, payload.password)


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthRequest) -> AuthResponse:
    response = store.login(payload.email, payload.password)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return response

