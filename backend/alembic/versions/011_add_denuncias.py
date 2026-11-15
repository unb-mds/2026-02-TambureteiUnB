"""Cria tabela de denuncias para revisao de comentarios e materiais (RN04/US 5.3)."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "011_denuncias"
down_revision = "010_curadorias"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "denuncias",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("comentario_id", sa.BigInteger(), sa.ForeignKey("comentarios.id", ondelete="CASCADE"), nullable=True),
        sa.Column("conteudo_id", sa.BigInteger(), sa.ForeignKey("conteudos.id", ondelete="CASCADE"), nullable=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("categoria", sa.String(40), nullable=False, server_default="OFENSA_DOCENTE"),
        sa.Column("motivo", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDENTE"),
        sa.Column("moderador_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("perfil_moderador", sa.String(20), nullable=True),
        sa.Column("justificativa_decisao", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "(comentario_id IS NOT NULL AND conteudo_id IS NULL) OR (comentario_id IS NULL AND conteudo_id IS NOT NULL)",
            name="chk_denuncia_alvo_unico",
        ),
        sa.CheckConstraint(
            "categoria IN ('OFENSA_DOCENTE', 'CONTEUDO_IMPROPRIO', 'GABARITO_ATIVO', 'SPAM', 'OUTRO')",
            name="chk_denuncia_categoria",
        ),
        sa.CheckConstraint(
            "status IN ('PENDENTE', 'DESCARTADA', 'PROCEDENTE')",
            name="chk_denuncia_status",
        ),
        sa.CheckConstraint(
            "length(trim(motivo)) >= 5 AND length(motivo) <= 1000",
            name="chk_denuncia_motivo",
        ),
        sa.CheckConstraint(
            "justificativa_decisao IS NULL OR length(justificativa_decisao) <= 1000",
            name="chk_denuncia_justificativa",
        ),
        sa.UniqueConstraint("usuario_id", "comentario_id", name="uq_denuncia_usuario_comentario"),
        sa.UniqueConstraint("usuario_id", "conteudo_id", name="uq_denuncia_usuario_conteudo"),
    )
    op.create_index("ix_denuncias_comentario_id", "denuncias", ["comentario_id"])
    op.create_index("ix_denuncias_conteudo_id", "denuncias", ["conteudo_id"])
    op.create_index("ix_denuncias_usuario_id", "denuncias", ["usuario_id"])
    op.create_index("ix_denuncias_status", "denuncias", ["status"])
    op.create_index("ix_denuncias_status_created_at", "denuncias", ["status", "created_at", "id"])


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT 1 FROM denuncias)")):
        raise RuntimeError("Downgrade bloqueado: preserve o historico de denuncias antes de remover a tabela.")
    op.drop_index("ix_denuncias_status_created_at", table_name="denuncias")
    op.drop_index("ix_denuncias_status", table_name="denuncias")
    op.drop_index("ix_denuncias_usuario_id", table_name="denuncias")
    op.drop_index("ix_denuncias_conteudo_id", table_name="denuncias")
    op.drop_index("ix_denuncias_comentario_id", table_name="denuncias")
    op.drop_table("denuncias")
