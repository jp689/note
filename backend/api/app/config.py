from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def resolve_env_file(module_file: Path) -> Path:
    resolved = module_file.resolve()
    for parent in resolved.parents:
        if (parent / ".env").exists():
            return parent / ".env"
    for parent in resolved.parents:
        if (parent / "package.json").exists():
            return parent / ".env"
    for parent in resolved.parents:
        if (parent / "pyproject.toml").exists() or (parent / "alembic.ini").exists():
            return parent / ".env"
    return Path.cwd() / ".env"


ENV_FILE = resolve_env_file(Path(__file__))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_prefix="API_", extra="ignore")

    app_name: str = "AI Study Notes API"
    env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"
    secret_key: str = "change-me"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_study_notes"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "study-notes"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    openai_base_url: str = Field(
        "https://api.openai.com/v1",
        validation_alias=AliasChoices("API_OPENAI_BASE_URL", "OPENAI_BASE_URL"),
    )
    openai_api_key: str = Field(
        "",
        validation_alias=AliasChoices("API_OPENAI_API_KEY", "OPENAI_API_KEY"),
    )
    deepseek_base_url: str = Field(
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
        validation_alias=AliasChoices("API_DEEPSEEK_BASE_URL", "AI_BASE_URL", "DEEPSEEK_BASE_URL"),
    )
    deepseek_api_key: str = Field(
        "",
        validation_alias=AliasChoices("API_DEEPSEEK_API_KEY", "AI_API_KEY", "DEEPSEEK_API_KEY"),
    )
    deepseek_model: str = Field(
        "deepseek-v3",
        validation_alias=AliasChoices("API_DEEPSEEK_MODEL", "AI_MODEL_ID", "DEEPSEEK_MODEL"),
    )
    paddleocr_api_url: str = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
    paddleocr_token: str = Field(
        "",
        validation_alias=AliasChoices("API_PADDLEOCR_TOKEN", "OCR_ACCESS_TOKEN", "PADDLEOCR_TOKEN"),
    )
    paddleocr_model: str = "PaddleOCR-VL-1.5"
    paddleocr_poll_interval: int = 5
    paddleocr_max_poll_attempts: int = 120
    process_inline: bool = False
    seed_demo: bool = True
    auto_create_tables: bool = True
    max_upload_bytes: int = 30 * 1024 * 1024
    worker_redis_queue: str = "study-documents"
    worker_internal_token: str = "dev-worker-token"
    local_storage_dir: str = ".local/storage"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        self.env = self.env.lower()
        if self.env != "production":
            return self

        unsafe: list[str] = []
        cors_origins = self.cors_origin_list
        if not cors_origins or "*" in cors_origins:
            unsafe.append("API_CORS_ORIGINS")
        if not self.secret_key or self.secret_key == "change-me" or len(self.secret_key) < 32:
            unsafe.append("API_SECRET_KEY")
        if (
            not self.worker_internal_token
            or self.worker_internal_token == "dev-worker-token"
            or len(self.worker_internal_token) < 32
        ):
            unsafe.append("API_WORKER_INTERNAL_TOKEN")
        if "postgres:postgres@" in self.database_url:
            unsafe.append("API_DATABASE_URL")
        if self.s3_access_key == "minioadmin" or self.s3_secret_key == "minioadmin":
            unsafe.append("API_S3_ACCESS_KEY/API_S3_SECRET_KEY")
        if self.auto_create_tables:
            unsafe.append("API_AUTO_CREATE_TABLES")
        if self.max_upload_bytes <= 0:
            unsafe.append("API_MAX_UPLOAD_BYTES")

        if unsafe:
            joined = ", ".join(unsafe)
            raise ValueError(f"Unsafe production configuration: replace default or invalid values for {joined}")

        return self


settings = Settings()
