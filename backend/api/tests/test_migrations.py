from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace


class MigrationRecorder:
    def __init__(self) -> None:
        self.tables: dict[str, set[str]] = {}

    def get_bind(self) -> SimpleNamespace:
        return SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))

    def execute(self, statement: str) -> None:
        return None

    def create_table(self, name: str, *elements: object, **kwargs: object) -> None:
        self.tables[name] = {
            element.name
            for element in elements
            if hasattr(element, "name") and isinstance(element.name, str)
        }

    def create_index(self, *args: object, **kwargs: object) -> None:
        return None


def test_initial_migration_matches_current_user_and_notification_schema(monkeypatch) -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "migrations"
        / "versions"
        / "20260524_0001_initial_schema.py"
    )
    spec = importlib.util.spec_from_file_location("initial_schema_migration", migration_path)
    assert spec is not None
    assert spec.loader is not None
    monkeypatch.setitem(sys.modules, "alembic", SimpleNamespace(op=None))
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    recorder = MigrationRecorder()
    monkeypatch.setattr(migration, "op", recorder)

    migration.upgrade()

    assert {"is_admin", "is_active"}.issubset(recorder.tables["users"])
    assert "notifications" in recorder.tables
    assert {
        "id",
        "user_id",
        "type",
        "title",
        "message",
        "is_read",
        "link",
        "created_at",
    }.issubset(recorder.tables["notifications"])
