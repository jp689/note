from pathlib import Path

from pydantic import model_validator
from pydantic import AliasChoices, Field
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
        if parent.joinpath("pyproject.toml").exists():
            return parent / ".env"
    return Path.cwd() / ".env"


ENV_FILE = resolve_env_file(Path(__file__))


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra="ignore")

    env: str = Field("development", validation_alias=AliasChoices("WORKER_ENV", "API_ENV", "ENV"))
    redis_url: str = Field("redis://localhost:6379/0", validation_alias=AliasChoices("REDIS_URL", "WORKER_REDIS_URL"))
    redis_queue: str = Field("study-documents", validation_alias=AliasChoices("REDIS_QUEUE", "WORKER_REDIS_QUEUE"))
    poll_seconds: int = Field(3, validation_alias=AliasChoices("POLL_SECONDS", "WORKER_POLL_SECONDS"))
    api_base_url: str = Field("http://api:8000", validation_alias=AliasChoices("API_BASE_URL", "WORKER_API_BASE_URL"))
    worker_internal_token: str = Field("dev-worker-token", validation_alias=AliasChoices("WORKER_INTERNAL_TOKEN", "API_WORKER_INTERNAL_TOKEN"))
    s3_endpoint: str = Field("http://minio:9000", validation_alias=AliasChoices("S3_ENDPOINT", "API_S3_ENDPOINT"))
    s3_bucket: str = Field("study-notes", validation_alias=AliasChoices("S3_BUCKET", "API_S3_BUCKET"))
    s3_access_key: str = Field("minioadmin", validation_alias=AliasChoices("S3_ACCESS_KEY", "API_S3_ACCESS_KEY"))
    s3_secret_key: str = Field("minioadmin", validation_alias=AliasChoices("S3_SECRET_KEY", "API_S3_SECRET_KEY"))
    local_storage_dir: str = Field(".local/storage", validation_alias=AliasChoices("LOCAL_STORAGE_DIR", "API_LOCAL_STORAGE_DIR"))
    openai_base_url: str = Field("https://api.openai.com/v1", validation_alias=AliasChoices("OPENAI_BASE_URL", "API_OPENAI_BASE_URL"))
    openai_api_key: str = Field("", validation_alias=AliasChoices("OPENAI_API_KEY", "API_OPENAI_API_KEY"))

    @model_validator(mode="after")
    def validate_production_settings(self) -> "WorkerSettings":
        self.env = self.env.lower()
        if self.env != "production":
            return self

        unsafe: list[str] = []
        if (
            not self.worker_internal_token
            or self.worker_internal_token == "dev-worker-token"
            or len(self.worker_internal_token) < 32
        ):
            unsafe.append("WORKER_INTERNAL_TOKEN")
        if self.s3_access_key == "minioadmin" or self.s3_secret_key == "minioadmin":
            unsafe.append("S3_ACCESS_KEY/S3_SECRET_KEY")

        if unsafe:
            joined = ", ".join(unsafe)
            raise ValueError(f"Unsafe production configuration: replace default or invalid values for {joined}")

        return self


settings = WorkerSettings()
