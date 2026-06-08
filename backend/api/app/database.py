from __future__ import annotations

from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def _create_engine_with_fallback():
    configured_url = settings.database_url
    engine = create_engine(configured_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            if configured_url.startswith("postgresql"):
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                connection.commit()
        return engine
    except SQLAlchemyError:
        if settings.env == "production":
            raise
        Path(".local").mkdir(exist_ok=True)
        return create_engine("sqlite:///.local/ai_study_notes.db", connect_args={"check_same_thread": False})


engine = _create_engine_with_fallback()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_database() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
