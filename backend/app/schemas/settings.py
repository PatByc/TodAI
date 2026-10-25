"""User-editable application settings contracts."""

from datetime import time

from pydantic import BaseModel, model_validator


class AISettingsUpdate(BaseModel):
    context_compression_enabled: bool


class AISettingsResponse(AISettingsUpdate):
    compression_provider: str
    minimum_tokens: int


class MorningSettingsUpdate(BaseModel):
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def valid_window(self) -> "MorningSettingsUpdate":
        if self.start_time >= self.end_time:
            raise ValueError("Morning must end after it starts")
        return self


class MorningSettingsResponse(MorningSettingsUpdate):
    pass


class EveningSettingsUpdate(BaseModel):
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def valid_window(self) -> "EveningSettingsUpdate":
        if self.start_time >= self.end_time:
            raise ValueError("Evening must end after it starts")
        return self


class EveningSettingsResponse(EveningSettingsUpdate):
    pass
