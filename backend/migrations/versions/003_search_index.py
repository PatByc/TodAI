"""rebuildable hybrid search index

Revision ID: c3d5e7f9a1b3
Revises: a2c4e6f8b0d2
Create Date: 2026-09-21 10:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3d5e7f9a1b3"
down_revision: Union[str, Sequence[str], None] = "a2c4e6f8b0d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    embedding_type = sa.JSON(none_as_null=True).with_variant(
        postgresql.JSONB(), "postgresql"
    )

    op.create_table(
        "search_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("section", sa.String(100), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("tags", json_type, nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("embedding", embedding_type, nullable=True),
        sa.Column("embedding_model", sa.String(100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("entity_type", "entity_id", "chunk_index"),
    )
    op.create_index(
        "idx_search_chunks_entity", "search_chunks", ["entity_type", "entity_id"]
    )
    op.create_index("idx_search_chunks_project", "search_chunks", ["project_id"])
    op.create_index("idx_search_chunks_hash", "search_chunks", ["content_hash"])

    if is_postgres:
        op.execute(
            sa.text("""
            ALTER TABLE search_chunks ADD COLUMN search_document tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(content, '')), 'B') ||
                setweight(to_tsvector('simple', coalesce(tags::text, '')), 'C')
            ) STORED
        """)
        )
        op.execute(
            sa.text(
                "CREATE INDEX idx_search_chunks_fts ON search_chunks "
                "USING gin(search_document)"
            )
        )
        has_vector = bool(
            bind.scalar(
                sa.text(
                    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector')"
                )
            )
        )
        if has_vector:
            op.execute(
                sa.text(
                    "ALTER TABLE search_chunks ADD COLUMN embedding_vector vector(1536)"
                )
            )
            op.execute(
                sa.text("""
                CREATE FUNCTION todai_sync_search_embedding() RETURNS trigger AS $$
                BEGIN
                    NEW.embedding_vector = CASE
                        WHEN NEW.embedding IS NULL THEN NULL
                        ELSE NEW.embedding::text::vector
                    END;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """)
            )
            op.execute(
                sa.text("""
                CREATE TRIGGER search_chunks_embedding_sync
                BEFORE INSERT OR UPDATE OF embedding ON search_chunks
                FOR EACH ROW EXECUTE FUNCTION todai_sync_search_embedding()
            """)
            )
            op.execute(
                sa.text("""
                CREATE INDEX idx_search_chunks_embedding_hnsw ON search_chunks
                USING hnsw (embedding_vector vector_cosine_ops)
                WHERE embedding_vector IS NOT NULL
            """)
            )
        return

    op.execute(
        sa.text("""
        CREATE VIRTUAL TABLE search_chunks_fts USING fts5(
            title, content, tags, content='search_chunks', content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TRIGGER search_chunks_fts_insert AFTER INSERT ON search_chunks BEGIN
            INSERT INTO search_chunks_fts(rowid, title, content, tags)
            VALUES (new.id, new.title, new.content, json_extract(new.tags, '$'));
        END
    """)
    )
    op.execute(
        sa.text("""
        CREATE TRIGGER search_chunks_fts_delete AFTER DELETE ON search_chunks BEGIN
            INSERT INTO search_chunks_fts(
                search_chunks_fts, rowid, title, content, tags
            ) VALUES (
                'delete', old.id, old.title, old.content,
                json_extract(old.tags, '$')
            );
        END
    """)
    )
    op.execute(
        sa.text("""
        CREATE TRIGGER search_chunks_fts_update AFTER UPDATE ON search_chunks BEGIN
            INSERT INTO search_chunks_fts(
                search_chunks_fts, rowid, title, content, tags
            ) VALUES (
                'delete', old.id, old.title, old.content,
                json_extract(old.tags, '$')
            );
            INSERT INTO search_chunks_fts(rowid, title, content, tags)
            VALUES (new.id, new.title, new.content, json_extract(new.tags, '$'));
        END
    """)
    )
    op.execute(
        sa.text("""
        CREATE VIRTUAL TABLE search_chunk_vectors USING vec0(
            chunk_id INTEGER PRIMARY KEY,
            embedding float[1536] distance_metric=cosine
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TRIGGER search_chunk_vectors_insert AFTER INSERT ON search_chunks
        WHEN new.embedding IS NOT NULL BEGIN
            INSERT INTO search_chunk_vectors(chunk_id, embedding)
            VALUES (new.id, json(new.embedding));
        END
    """)
    )
    op.execute(
        sa.text("""
        CREATE TRIGGER search_chunk_vectors_delete AFTER DELETE ON search_chunks
        WHEN old.embedding IS NOT NULL BEGIN
            DELETE FROM search_chunk_vectors WHERE chunk_id = old.id;
        END
    """)
    )
    op.execute(
        sa.text("""
        CREATE TRIGGER search_chunk_vectors_update
        AFTER UPDATE OF embedding ON search_chunks BEGIN
            DELETE FROM search_chunk_vectors WHERE chunk_id = old.id;
            INSERT INTO search_chunk_vectors(chunk_id, embedding)
            SELECT new.id, json(new.embedding) WHERE new.embedding IS NOT NULL;
        END
    """)
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        op.execute(sa.text("DROP TRIGGER IF EXISTS search_chunk_vectors_update"))
        op.execute(sa.text("DROP TRIGGER IF EXISTS search_chunk_vectors_delete"))
        op.execute(sa.text("DROP TRIGGER IF EXISTS search_chunk_vectors_insert"))
        op.execute(sa.text("DROP TABLE IF EXISTS search_chunk_vectors"))
        op.execute(sa.text("DROP TRIGGER IF EXISTS search_chunks_fts_update"))
        op.execute(sa.text("DROP TRIGGER IF EXISTS search_chunks_fts_delete"))
        op.execute(sa.text("DROP TRIGGER IF EXISTS search_chunks_fts_insert"))
        op.execute(sa.text("DROP TABLE IF EXISTS search_chunks_fts"))
    op.drop_table("search_chunks")
    if op.get_bind().dialect.name == "postgresql":
        op.execute(sa.text("DROP FUNCTION IF EXISTS todai_sync_search_embedding()"))
