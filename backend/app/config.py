"""Application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    database_url: str = "postgresql+asyncpg://todai:todai_dev@localhost:55432/todai"
    app_env: str = "development"
    debug: bool = True

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
