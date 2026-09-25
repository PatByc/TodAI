"""Application configuration for Desktop and Server deployment modes."""

from pathlib import Path

from platformdirs import user_data_path
from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings


def default_data_dir() -> Path:
    """Return the platform-native directory for TodAI's local application data."""
    return user_data_path("TodAI", "TodAI")


def sqlite_url(database_path: Path) -> str:
    """Build an async SQLAlchemy SQLite URL for an absolute filesystem path."""
    return f"sqlite+aiosqlite:///{database_path.resolve().as_posix()}"


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    data_dir: Path = Field(
        default_factory=default_data_dir,
        validation_alias=AliasChoices("TODAI_DATA_DIR", "DATA_DIR"),
    )
    database_url: str = ""
    app_env: str = "development"
    debug: bool = True
    openai_api_key: str | None = None
    embedding_provider: str = "none"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    completion_provider: str = "openai"
    completion_model: str = "gpt-5-mini"
    completion_max_output_tokens: int = 1_600
    context_compression: str = Field(
        default="headroom",
        validation_alias=AliasChoices(
            "TODAI_CONTEXT_COMPRESSION", "CONTEXT_COMPRESSION"
        ),
    )
    context_compression_min_tokens: int = 800
    context_history_max_chars: int = 12_000

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        """Use embedded SQLite unless an explicit Server database is configured."""
        self.data_dir = self.data_dir.expanduser().resolve()
        if not self.database_url:
            self.database_url = sqlite_url(self.data_dir / "todai.db")
        return self

    @property
    def database_backend(self) -> str:
        """Return the selected persistence backend name."""
        return "sqlite" if self.database_url.startswith("sqlite") else "postgresql"

    model_config = {
        "env_file": Path(__file__).resolve().parents[2] / ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
