from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace


class MigrationRecorder:
    def __init__(self) -> None:
        self.tables: dict[str, set[str]] = {}
        self.added_columns: dict[str, set[str]] = {}
        self.dropped_columns: dict[str, set[str]] = {}

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

    def add_column(self, table_name: str, column: object, **kwargs: object) -> None:
        name = getattr(column, "name", None)
        if isinstance(name, str):
            self.added_columns.setdefault(table_name, set()).add(name)

    def drop_column(self, table_name: str, column_name: str, **kwargs: object) -> None:
        self.dropped_columns.setdefault(table_name, set()).add(column_name)


def load_migration(filename: str, module_name: str, monkeypatch):
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "migrations"
        / "versions"
        / filename
    )
    spec = importlib.util.spec_from_file_location(module_name, migration_path)
    assert spec is not None
    assert spec.loader is not None
    monkeypatch.setitem(sys.modules, "alembic", SimpleNamespace(op=None))
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration


def test_initial_migration_matches_current_user_notification_schema(monkeypatch) -> None:
    migration = load_migration("20260524_0001_initial_schema.py", "initial_schema_migration", monkeypatch)
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


def test_analysis_v2_migration_adds_learning_metadata(monkeypatch) -> None:
    migration = load_migration("20260608_0002_analysis_v2.py", "analysis_v2_migration", monkeypatch)
    recorder = MigrationRecorder()
    monkeypatch.setattr(migration, "op", recorder)

    migration.upgrade()

    assert "analysis_version" in recorder.added_columns["documents"]
    assert "details" in recorder.added_columns["knowledge_nodes"]
