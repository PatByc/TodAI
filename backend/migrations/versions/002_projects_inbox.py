"""projects and inbox items

Revision ID: a2c4e6f8b0d2
Revises: fba851d3ada8
Create Date: 2026-09-15 14:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a2c4e6f8b0d2'
down_revision: Union[str, Sequence[str], None] = 'fba851d3ada8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create projects and inbox_items tables, add project_id FK to entity tables."""
    # Create projects table
    op.create_table('projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('description', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('description_text', sa.Text(), nullable=True),
        sa.Column('goals', sa.Text(), nullable=True),
        sa.Column('current_focus', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', name='projectstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create inbox_items table
    op.create_table('inbox_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Add project_id FK column to notes, tasks, and ideas
    op.add_column('notes', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_notes_project_id', 'notes', 'projects',
        ['project_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('idx_notes_project_id', 'notes', ['project_id'])

    op.add_column('tasks', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_tasks_project_id', 'tasks', 'projects',
        ['project_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('idx_tasks_project_id', 'tasks', ['project_id'])

    op.add_column('ideas', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_ideas_project_id', 'ideas', 'projects',
        ['project_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('idx_ideas_project_id', 'ideas', ['project_id'])


def downgrade() -> None:
    """Drop project_id FK columns and new tables."""
    # Drop project_id FK and column from ideas
    op.drop_index('idx_ideas_project_id', table_name='ideas')
    op.drop_constraint('fk_ideas_project_id', 'ideas', type_='foreignkey')
    op.drop_column('ideas', 'project_id')

    # Drop project_id FK and column from tasks
    op.drop_index('idx_tasks_project_id', table_name='tasks')
    op.drop_constraint('fk_tasks_project_id', 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'project_id')

    # Drop project_id FK and column from notes
    op.drop_index('idx_notes_project_id', table_name='notes')
    op.drop_constraint('fk_notes_project_id', 'notes', type_='foreignkey')
    op.drop_column('notes', 'project_id')

    # Drop tables
    op.drop_table('inbox_items')
    op.drop_table('projects')

    # Drop the projectstatus enum type
    sa.Enum(name='projectstatus').drop(op.get_bind(), checkfirst=True)
