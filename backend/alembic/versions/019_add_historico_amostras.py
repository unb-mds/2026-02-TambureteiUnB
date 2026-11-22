"""add_historico_amostras

Revision ID: 019_add_historico_amostras
Revises: 018_add_curso_matriz
Create Date: 2026-11-22 00:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "019_add_historico_amostras"
down_revision: Union[str, None] = "018_add_curso_matriz"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "amostras_historico",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("dedup_hash", sa.String(length=64), nullable=False),
        sa.Column("disciplina_id", sa.Integer(), nullable=False),
        sa.Column("turma_id", sa.Integer(), nullable=True),
        sa.Column("codigo_turma", sa.String(length=10), nullable=False),
        sa.Column("semestre", sa.String(length=10), nullable=False),
        sa.Column("desfecho", sa.String(length=20), nullable=False),
        sa.Column("mencao", sa.String(length=5), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "desfecho IN ('APR', 'REP_NOTA', 'REP_FALTA', 'TRANC')",
            name="chk_amostra_desfecho",
        ),
        sa.CheckConstraint(
            "mencao IS NULL OR mencao IN ('SS', 'MS', 'MM', 'MI', 'II', 'SR')",
            name="chk_amostra_mencao",
        ),
        sa.ForeignKeyConstraint(["disciplina_id"], ["disciplinas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["turma_id"], ["turmas.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedup_hash", name="uq_amostras_historico_dedup_hash"),
    )
    op.create_index("ix_amostras_historico_id", "amostras_historico", ["id"], unique=False)
    op.create_index("ix_amostras_historico_dedup_hash", "amostras_historico", ["dedup_hash"], unique=True)
    op.create_index("ix_amostras_historico_disciplina_id", "amostras_historico", ["disciplina_id"], unique=False)
    op.create_index("ix_amostras_historico_turma_id", "amostras_historico", ["turma_id"], unique=False)
    op.create_index("ix_amostras_historico_semestre", "amostras_historico", ["semestre"], unique=False)

    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("total_amostras", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("origem", sa.String(length=30), server_default="DOACAO_QUORUM", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("qtd_ss", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("qtd_ms", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("qtd_mm", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("qtd_mi", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("qtd_ii", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("qtd_sr", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("amostragem_suprimida_lgpd", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("estatisticas_consolidadas", "amostragem_suprimida_lgpd")
    op.drop_column("estatisticas_consolidadas", "qtd_sr")
    op.drop_column("estatisticas_consolidadas", "qtd_ii")
    op.drop_column("estatisticas_consolidadas", "qtd_mi")
    op.drop_column("estatisticas_consolidadas", "qtd_mm")
    op.drop_column("estatisticas_consolidadas", "qtd_ms")
    op.drop_column("estatisticas_consolidadas", "qtd_ss")
    op.drop_column("estatisticas_consolidadas", "origem")
    op.drop_column("estatisticas_consolidadas", "total_amostras")

    op.drop_index("ix_amostras_historico_semestre", table_name="amostras_historico")
    op.drop_index("ix_amostras_historico_turma_id", table_name="amostras_historico")
    op.drop_index("ix_amostras_historico_disciplina_id", table_name="amostras_historico")
    op.drop_index("ix_amostras_historico_dedup_hash", table_name="amostras_historico")
    op.drop_index("ix_amostras_historico_id", table_name="amostras_historico")
    op.drop_table("amostras_historico")
