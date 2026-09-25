"""User-editable application settings contracts."""

from pydantic import BaseModel


class AISettingsUpdate(BaseModel):
    context_compression_enabled: bool


class AISettingsResponse(AISettingsUpdate):
    compression_provider: str
    minimum_tokens: int
