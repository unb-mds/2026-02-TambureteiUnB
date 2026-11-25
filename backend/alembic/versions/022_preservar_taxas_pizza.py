"""Preserva percentuais SIGAA dentro da tolerância sem reescrever as parcelas."""
from alembic import op
import sqlalchemy as sa

revision = "022_preservar_taxas_pizza"
down_revision = "021_add_pizza_moderacao_imagem"
branch_labels = None
depends_on = None

SUM = "(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento)"
IMAGE = "(tipo_envio = 'IMAGEM' AND imagem_chave IS NOT NULL AND taxa_aprovacao IS NULL AND taxa_reprovacao_nota IS NULL AND taxa_reprovacao_falta IS NULL AND taxa_trancamento IS NULL)"
COMPLETE = "taxa_aprovacao IS NOT NULL AND taxa_reprovacao_nota IS NOT NULL AND taxa_reprovacao_falta IS NOT NULL AND taxa_trancamento IS NOT NULL"


def _replace_checks(sum_condition):
    op.drop_constraint("chk_soma_taxas_cem", "doacoes_estatisticas", type_="check")
    op.create_check_constraint("chk_soma_taxas_cem", "doacoes_estatisticas", f"{IMAGE} OR ({COMPLETE} AND {sum_condition})")
    op.drop_constraint("chk_estatistica_soma_cem", "estatisticas_consolidadas", type_="check")
    op.create_check_constraint("chk_estatistica_soma_cem", "estatisticas_consolidadas", sum_condition)


def upgrade():
    _replace_checks(f"{SUM} BETWEEN 99.80 AND 100.20")


def downgrade():
    # Não altera notas originais para tornar um downgrade possível.
    for table in ("doacoes_estatisticas", "estatisticas_consolidadas"):
        incompatible = op.get_bind().execute(sa.text(f"SELECT EXISTS (SELECT 1 FROM {table} WHERE {SUM} <> 100.00)")).scalar()
        if incompatible:
            raise RuntimeError("Downgrade bloqueado: existem percentuais originais cuja soma difere de 100%. Nenhum valor será ajustado automaticamente.")
    _replace_checks(f"{SUM} = 100.00")
