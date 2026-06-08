from pathlib import Path

from app.config import Settings, resolve_env_file


def test_resolve_env_file_uses_monorepo_root_when_package_json_exists(tmp_path) -> None:
    root = tmp_path / "repo"
    module_file = root / "backend" / "api" / "app" / "config.py"
    module_file.parent.mkdir(parents=True)
    module_file.write_text("", encoding="utf-8")
    (root / "package.json").write_text("{}", encoding="utf-8")

    assert resolve_env_file(module_file) == root / ".env"


def test_resolve_env_file_uses_python_project_root_inside_container(tmp_path) -> None:
    app_root = tmp_path / "app"
    module_file = app_root / "app" / "config.py"
    module_file.parent.mkdir(parents=True)
    module_file.write_text("", encoding="utf-8")
    (app_root / "pyproject.toml").write_text("", encoding="utf-8")

    assert resolve_env_file(module_file) == app_root / ".env"


def test_text_ai_settings_accept_short_ai_env_aliases(monkeypatch) -> None:
    monkeypatch.setenv("AI_BASE_URL", "https://example.test/v2")
    monkeypatch.setenv("AI_API_KEY", "text-key")
    monkeypatch.setenv("AI_MODEL_ID", "model-id")

    settings = Settings(_env_file=None)

    assert settings.deepseek_base_url == "https://example.test/v2"
    assert settings.deepseek_api_key == "text-key"
    assert settings.deepseek_model == "model-id"


def test_ocr_settings_accept_short_token_alias(monkeypatch) -> None:
    monkeypatch.setenv("OCR_ACCESS_TOKEN", "ocr-token")

    settings = Settings(_env_file=None)

    assert settings.paddleocr_token == "ocr-token"
