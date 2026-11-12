"""Registra decisoes de curadoria sem alterar arquivos ja publicados."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "010_curadorias"
down_revision = "009_arquivos_conteudos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "curadorias",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("conteudo_id", sa.BigInteger(), sa.ForeignKey("conteudos.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("moderador_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("perfil_moderador", sa.String(20), nullable=False),
        sa.Column("status_anterior", sa.String(20), nullable=False),
        sa.Column("status_novo", sa.String(20), nullable=False),
        sa.Column("justificativa", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("perfil_moderador IN ('MODERATOR', 'ADMIN')", name="chk_curadoria_perfil"),
        sa.CheckConstraint("status_anterior = 'PENDENTE'", name="chk_curadoria_anterior"),
        sa.CheckConstraint("status_novo IN ('APROVADO', 'RECUSADO')", name="chk_curadoria_novo"),
        sa.CheckConstraint("justificativa IS NULL OR length(justificativa) <= 1000", name="chk_curadoria_justificativa"),
        sa.CheckConstraint("status_novo <> 'RECUSADO' OR (justificativa IS NOT NULL AND length(trim(justificativa)) > 0)", name="chk_curadoria_recusa"),
    )


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT 1 FROM curadorias)")):
        raise RuntimeError("Downgrade bloqueado: preserve o historico de curadoria antes de remover a tabela.")
    op.drop_table("curadorias")
