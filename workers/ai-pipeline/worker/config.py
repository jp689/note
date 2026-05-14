from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    redis_queue: str = "study-documents"
    poll_seconds: int = 3
    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""


settings = WorkerSettings()

