from worker.config import resolve_env_file


def test_resolve_env_file_uses_monorepo_root_when_package_json_exists(tmp_path) -> None:
    root = tmp_path / "repo"
    module_file = root / "integration" / "ai-pipeline" / "worker" / "config.py"
    module_file.parent.mkdir(parents=True)
    module_file.write_text("", encoding="utf-8")
    (root / "package.json").write_text("{}", encoding="utf-8")

    assert resolve_env_file(module_file) == root / ".env"


def test_resolve_env_file_uses_python_project_root_inside_container(tmp_path) -> None:
    app_root = tmp_path / "app"
    module_file = app_root / "worker" / "config.py"
    module_file.parent.mkdir(parents=True)
    module_file.write_text("", encoding="utf-8")
    (app_root / "pyproject.toml").write_text("", encoding="utf-8")

    assert resolve_env_file(module_file) == app_root / ".env"
