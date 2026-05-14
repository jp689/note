from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="API_", extra="ignore")

    app_name: str = "AI Study Notes API"
    env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    secret_key: str = "change-me"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_study_notes"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "study-notes"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""
    process_inline: bool = True


settings = Settings()

