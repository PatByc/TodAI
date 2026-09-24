"""Schemas for entity state-transition history."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class StateTransitionResponse(BaseModel):
    """A normalized state change derived from the audit log."""

    id: int
    entity_type: str
    entity_id: int
    entity_title: str
    field: str
    old_value: Any = None
    new_value: Any = None
    created_at: datetime
