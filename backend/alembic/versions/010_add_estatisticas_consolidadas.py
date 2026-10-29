"""add_estatisticas_consolidadas"""
from alembic import op
import sqlalchemy as sa

revision = "010_estatisticas_consolidadas"
down_revision = "009_arquivos_conteudos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "estatisticas_consolidadas",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("turma_id", sa.Integer(), sa.ForeignKey("turmas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("semestre_referencia", sa.String(10), nullable=False),
        sa.Column("taxa_aprovacao", sa.Numeric(5, 2), nullable=False),
        sa.Column("taxa_reprovacao_nota", sa.Numeric(5, 2), nullable=False),
        sa.Column("taxa_reprovacao_falta", sa.Numeric(5, 2), nullable=False),
        sa.Column("taxa_trancamento", sa.Numeric(5, 2), nullable=False),
        sa.Column("status", sa.String(20), server_default="VALIDADO", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("turma_id", "semestre_referencia", name="uq_estatistica_turma_semestre"),
        sa.CheckConstraint("status IN ('VALIDADO')", name="chk_status_estatistica"),
        sa.CheckConstraint(
            "taxa_aprovacao >= 0 AND taxa_reprovacao_nota >= 0 "
            "AND taxa_reprovacao_falta >= 0 AND taxa_trancamento >= 0",
            name="chk_estatistica_taxas_positivas",
        ),
        sa.CheckConstraint(
            "(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00",
            name="chk_estatistica_soma_cem",
        ),
    )


def downgrade() -> None:
    op.drop_table("estatisticas_consolidadas")