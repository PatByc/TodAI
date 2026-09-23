"""Programmatic Alembic migration runner used during application startup."""

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def upgrade_database(database_url: str | None = None) -> None:
    """Upgrade the configured database to the latest schema revision."""
    target_url = database_url or settings.database_url
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.attributes["database_url"] = target_url
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", target_url.replace("%", "%%"))
    command.upgrade(config, "head")
