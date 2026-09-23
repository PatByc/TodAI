"""SQLAlchemy models for TodAI entities.

All models are imported here so Alembic can discover them via Base.metadata.
"""

from .audit_log import AuditLog
from .agent_proposal import AgentProposal
from .base import Base, SoftDeleteMixin, TimestampMixin
from .idea import Idea, IdeaState
from .inbox_item import InboxItem
from .note import Note
from .project import Project, ProjectStatus
from .search_chunk import SearchChunk
from .tag import EntityTag, Tag
from .task import Task, TaskStatus

__all__ = [
    "AuditLog",
    "AgentProposal",
    "Base",
    "EntityTag",
    "Idea",
    "IdeaState",
    "InboxItem",
    "Note",
    "Project",
    "ProjectStatus",
    "SearchChunk",
    "SoftDeleteMixin",
    "Tag",
    "Task",
    "TaskStatus",
    "TimestampMixin",
]
