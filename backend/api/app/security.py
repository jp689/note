from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64url(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}")


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or _b64url(os.urandom(16))
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${_b64url(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt, digest = stored_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    return hmac.compare_digest(hash_password(password, salt), stored_hash)


def create_access_token(user_id: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int((datetime.now(UTC) + timedelta(days=7)).timestamp()),
        "jti": uuid4().hex,
    }
    head = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{head}.{body}".encode("ascii")
    signature = hmac.new(settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{head}.{body}.{_b64url(signature)}"


def decode_access_token(token: str) -> str | None:
    try:
        head, body, signature = token.split(".", 2)
        expected = hmac.new(
            settings.secret_key.encode("utf-8"),
            f"{head}.{body}".encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_unb64url(signature), expected):
            return None
        payload = json.loads(_unb64url(body))
        if int(payload["exp"]) < int(datetime.now(UTC).timestamp()):
            return None
        return str(payload["sub"])
    except Exception:
        return None


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user_id = decode_access_token(authorization.removeprefix("Bearer ").strip())
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


def require_worker_token(x_worker_token: str | None = Header(default=None)) -> None:
    if x_worker_token != settings.worker_internal_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid worker token")


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
