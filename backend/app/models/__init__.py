"""SQLAlchemy models for TodAI entities.

All models are imported here so Alembic can discover them via Base.metadata.
"""

from .agent_proposal import AgentProposal
from .ai_setting import AISetting
from .api_usage_cost import APIUsageCost
from .audit_log import AuditLog
from .backup_setting import BackupSetting
from .base import Base, SoftDeleteMixin, TimestampMixin
from .efficiency_metric import EfficiencyMetric
from .idea import Idea, IdeaState
from .inbox_item import InboxItem
from .note import Note
from .planning import GoalPeriod, PlannedBlock, Routine, RoutineCompletion, TimeGoal
from .project import Project, ProjectStatus
from .search_chunk import SearchChunk
from .tag import EntityTag, Tag
from .task import Task, TaskRecurrence, TaskStatus
from .time_tracking import TimeCategory, TimeEntry, TimeStream

__all__ = [
    "AISetting",
    "APIUsageCost",
    "AgentProposal",
    "AuditLog",
    "Base",
    "BackupSetting",
    "EfficiencyMetric",
    "EntityTag",
    "GoalPeriod",
    "Idea",
    "IdeaState",
    "InboxItem",
    "Note",
    "PlannedBlock",
    "Project",
    "ProjectStatus",
    "Routine",
    "RoutineCompletion",
    "SearchChunk",
    "SoftDeleteMixin",
    "Tag",
    "Task",
    "TaskRecurrence",
    "TaskStatus",
    "TimeCategory",
    "TimeEntry",
    "TimeGoal",
    "TimeStream",
    "TimestampMixin",
]
