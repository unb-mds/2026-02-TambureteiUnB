"""adiciona tabela de notificacoes de curadoria e moderacao para usuarios

Revision ID: 024_add_notificacoes
Revises: 023_add_comentario_updated_at
Create Date: 2026-11-27 20:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "024_add_notificacoes"
down_revision: Union[str, None] = "023_add_comentario_updated_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notificacoes",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("usuario_id", sa.UUID(), nullable=False),
        sa.Column("tipo", sa.String(length=40), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("link", sa.String(length=300), nullable=True),
        sa.Column("lida", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notificacoes_id", "notificacoes", ["id"], unique=False)
    op.create_index("ix_notificacoes_usuario_id", "notificacoes", ["usuario_id"], unique=False)
    op.create_index(
        "ix_notificacoes_usuario_lida_created",
        "notificacoes",
        ["usuario_id", "lida", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notificacoes_usuario_lida_created", table_name="notificacoes")
    op.drop_index("ix_notificacoes_usuario_id", table_name="notificacoes")
    op.drop_index("ix_notificacoes_id", table_name="notificacoes")
    op.drop_table("notificacoes")
