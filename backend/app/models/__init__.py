"""SQLAlchemy models for TodAI entities.

All models are imported here so Alembic can discover them via Base.metadata.
"""

from .audit_log import AuditLog
from .base import Base, SoftDeleteMixin, TimestampMixin
from .idea import Idea, IdeaState
from .inbox_item import InboxItem
from .note import Note
from .project import Project, ProjectStatus
from .tag import EntityTag, Tag
from .task import Task, TaskStatus

__all__ = [
    "AuditLog",
    "Base",
    "EntityTag",
    "Idea",
    "IdeaState",
    "InboxItem",
    "Note",
    "Project",
    "ProjectStatus",
    "SoftDeleteMixin",
    "Tag",
    "Task",
    "TaskStatus",
    "TimestampMixin",
]
