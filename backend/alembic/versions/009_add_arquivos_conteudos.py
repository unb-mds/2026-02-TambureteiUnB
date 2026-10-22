"""Estende conteudos para arquivos privados sem alterar os links existentes."""
from alembic import op
import sqlalchemy as sa

revision = "009_arquivos_conteudos"
down_revision = "008"
branch_labels = None
depends_on = None

TIPOS_ANTIGOS = "tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA')"
TIPOS = "tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA', 'ARQUIVO')"
CHECKS = {
    "chk_origem_conteudo": (
        "(caminho_arquivo IS NOT NULL AND url_origem IS NULL "
        "AND caminho_arquivo IS NOT NULL AND formato IS NOT NULL "
        "AND tamanho_bytes IS NOT NULL AND status_moderacao IS NOT NULL) "
        "OR (tipo <> 'ARQUIVO' AND url_origem IS NOT NULL "
        "AND caminho_arquivo IS NULL AND formato IS NULL "
        "AND tamanho_bytes IS NULL AND status_moderacao IS NULL)"
    ),
    "chk_conteudo_formato": "formato IS NULL OR formato IN ('pdf', 'png', 'jpg')",
    "chk_conteudo_tamanho": "tamanho_bytes IS NULL OR tamanho_bytes > 0",
    "chk_conteudo_titulo": "length(trim(titulo)) > 0",
    "chk_conteudo_moderacao": "status_moderacao IS NULL OR status_moderacao IN ('ativo', 'em_analise', 'bloqueado', 'excluido')",
}


def upgrade() -> None:
    # O bootstrap antigo usava nome automatico, enquanto Alembic usava nome explicito.
    names = {c["name"] for c in sa.inspect(op.get_bind()).get_check_constraints("conteudos")}
    name = "chk_tipo_conteudo" if "chk_tipo_conteudo" in names else "conteudos_tipo_check"
    op.drop_constraint(name, "conteudos", type_="check")
    op.create_check_constraint("chk_tipo_conteudo", "conteudos", TIPOS)
    op.alter_column("conteudos", "url_origem", existing_type=sa.Text(), nullable=True)
    for column in [
        sa.Column("caminho_arquivo", sa.String(64)),
        sa.Column("formato", sa.String(3)),
        sa.Column("tamanho_bytes", sa.Integer()),
        sa.Column("status_moderacao", sa.String(20)),
    ]:
        op.add_column("conteudos", column)
    op.create_unique_constraint("uq_conteudos_caminho_arquivo", "conteudos", ["caminho_arquivo"])
    for name, expression in CHECKS.items():
        op.create_check_constraint(name, "conteudos", expression)
    op.create_index("ix_conteudos_arquivos_disciplina_status", "conteudos", ["disciplina_id", "tipo", "status_curadoria", "status_moderacao", "id"])


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT 1 FROM conteudos WHERE caminho_arquivo IS NOT NULL OR tipo = 'ARQUIVO')")):
        raise RuntimeError("Downgrade bloqueado: preserve ou exporte os arquivos antes de remover seus metadados.")
    op.drop_index("ix_conteudos_arquivos_disciplina_status", table_name="conteudos")
    for name in CHECKS:
        op.drop_constraint(name, "conteudos", type_="check")
    op.drop_constraint("uq_conteudos_caminho_arquivo", "conteudos", type_="unique")
    for name in ["status_moderacao", "tamanho_bytes", "formato", "caminho_arquivo"]:
        op.drop_column("conteudos", name)
    op.alter_column("conteudos", "url_origem", existing_type=sa.Text(), nullable=False)
    op.drop_constraint("chk_tipo_conteudo", "conteudos", type_="check")
    op.create_check_constraint("chk_tipo_conteudo", "conteudos", TIPOS_ANTIGOS)
