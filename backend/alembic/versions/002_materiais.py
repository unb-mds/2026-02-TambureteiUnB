"""Adiciona arquivos de apoio da Feature 5.2 sem alterar revisões existentes."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_materiais"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "materiais",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("disciplina_id", sa.Integer(), sa.ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("caminho_arquivo", sa.String(64), nullable=False),
        sa.Column("formato", sa.String(3), nullable=False),
        sa.Column("tamanho_bytes", sa.Integer(), nullable=False),
        sa.Column("status_moderacao", sa.String(20), server_default="ativo", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("caminho_arquivo"),
        sa.CheckConstraint("formato IN ('pdf', 'png', 'jpg')", name="chk_material_formato"),
        sa.CheckConstraint("tamanho_bytes > 0", name="chk_material_tamanho"),
        sa.CheckConstraint("length(trim(titulo)) > 0", name="chk_material_titulo"),
        sa.CheckConstraint("status_moderacao IN ('ativo', 'em_analise', 'bloqueado', 'excluido')", name="chk_material_status"),
    )
    op.create_index("ix_materiais_disciplina_status_id", "materiais", ["disciplina_id", "status_moderacao", "id"])
    op.create_index("ix_materiais_usuario_id", "materiais", ["usuario_id"])


def downgrade() -> None:
    op.drop_table("materiais")
