"""Adiciona metadados de moderacao por IA em conteudos, comentarios e curadorias."""
from alembic import op
import sqlalchemy as sa

revision = "011_moderacao_ia"
down_revision = "010_curadorias"
branch_labels = None
depends_on = None

CONFIANCA_CHECK = "confianca_ia IS NULL OR (confianca_ia >= 0.0 AND confianca_ia <= 1.0)"
MODERADO_POR_CHECK = "moderado_por IS NULL OR moderado_por IN ('IA', 'MODERATOR', 'ADMIN')"
CURADORIA_PERFIL_ANTIGO = "perfil_moderador IN ('MODERATOR', 'ADMIN')"
CURADORIA_PERFIL_NOVO = "perfil_moderador IN ('MODERATOR', 'ADMIN', 'IA')"


def upgrade() -> None:
    for tabela, prefixo in [("conteudos", "conteudo"), ("comentarios", "comentario")]:
        op.add_column(tabela, sa.Column("motivo_moderacao", sa.Text(), nullable=True))
        op.add_column(tabela, sa.Column("confianca_ia", sa.Float(), nullable=True))
        op.add_column(tabela, sa.Column("moderado_por", sa.String(20), nullable=True))
        op.create_check_constraint(f"chk_{prefixo}_confianca_ia", tabela, CONFIANCA_CHECK)
        op.create_check_constraint(f"chk_{prefixo}_moderado_por", tabela, MODERADO_POR_CHECK)

    op.drop_constraint("chk_curadoria_perfil", "curadorias", type_="check")
    op.create_check_constraint("chk_curadoria_perfil", "curadorias", CURADORIA_PERFIL_NOVO)


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT 1 FROM curadorias WHERE perfil_moderador = 'IA')")):
        raise RuntimeError("Downgrade bloqueado: preserve o historico de curadoria de IA antes de reverter a revisao.")

    op.drop_constraint("chk_curadoria_perfil", "curadorias", type_="check")
    op.create_check_constraint("chk_curadoria_perfil", "curadorias", CURADORIA_PERFIL_ANTIGO)

    for tabela, prefixo in [("comentarios", "comentario"), ("conteudos", "conteudo")]:
        op.drop_constraint(f"chk_{prefixo}_moderado_por", tabela, type_="check")
        op.drop_constraint(f"chk_{prefixo}_confianca_ia", tabela, type_="check")
        for coluna in ["moderado_por", "confianca_ia", "motivo_moderacao"]:
            op.drop_column(tabela, coluna)
