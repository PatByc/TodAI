"""SQLAlchemy models for TodAI entities.

All models are imported here so Alembic can discover them via Base.metadata.
"""

from .agent_proposal import AgentProposal
from .audit_log import AuditLog
from .base import Base, SoftDeleteMixin, TimestampMixin
from .idea import Idea, IdeaState
from .inbox_item import InboxItem
from .note import Note
from .planning import GoalPeriod, PlannedBlock, Routine, RoutineCompletion, TimeGoal
from .project import Project, ProjectStatus
from .search_chunk import SearchChunk
from .tag import EntityTag, Tag
from .task import Task, TaskStatus
from .time_tracking import TimeCategory, TimeEntry, TimeStream

__all__ = [
    "AgentProposal",
    "AuditLog",
    "Base",
    "EntityTag",
    "Idea",
    "IdeaState",
    "InboxItem",
    "Note",
    "PlannedBlock",
    "GoalPeriod",
    "Project",
    "ProjectStatus",
    "Routine",
    "RoutineCompletion",
    "SearchChunk",
    "SoftDeleteMixin",
    "Tag",
    "Task",
    "TaskStatus",
    "TimeCategory",
    "TimeEntry",
    "TimeGoal",
    "TimeStream",
    "TimestampMixin",
]
