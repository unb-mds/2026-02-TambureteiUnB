"""add_pizza_moderacao_imagem

Revision ID: 021_add_pizza_moderacao_imagem
Revises: 020_limpar_professores_poluidos
Create Date: 2026-11-24 22:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "021_add_pizza_moderacao_imagem"
down_revision: Union[str, None] = "020_limpar_professores_poluidos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "doacoes_estatisticas",
        sa.Column("tipo_envio", sa.String(length=20), server_default="TEXTO", nullable=False),
    )
    op.add_column(
        "doacoes_estatisticas",
        sa.Column("imagem_chave", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "doacoes_estatisticas",
        sa.Column("imagem_mime", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "doacoes_estatisticas",
        sa.Column("moderado_por_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "doacoes_estatisticas",
        sa.Column("moderado_em", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "doacoes_estatisticas",
        sa.Column("justificativa_moderacao", sa.Text(), nullable=True),
    )
    op.create_foreign_key(
        "fk_doacoes_moderador",
        "doacoes_estatisticas",
        "usuarios",
        ["moderado_por_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.alter_column("doacoes_estatisticas", "taxa_aprovacao", existing_type=sa.Numeric(5, 2), nullable=True)
    op.alter_column("doacoes_estatisticas", "taxa_reprovacao_nota", existing_type=sa.Numeric(5, 2), nullable=True)
    op.alter_column("doacoes_estatisticas", "taxa_reprovacao_falta", existing_type=sa.Numeric(5, 2), nullable=True)
    op.alter_column("doacoes_estatisticas", "taxa_trancamento", existing_type=sa.Numeric(5, 2), nullable=True)

    # Dropar constraints antigas com seguranca (caso existam)
    for cname in (
        "chk_taxa_aprovacao",
        "chk_taxa_reprov_nota",
        "chk_taxa_reprov_falta",
        "chk_taxa_trancamento",
        "chk_soma_taxas_cem",
    ):
        op.execute(f"ALTER TABLE doacoes_estatisticas DROP CONSTRAINT IF EXISTS {cname}")

    # Dropar tambem quaisquer constraints check inline autogeradas pelo PostgreSQL
    op.execute(
        """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'doacoes_estatisticas'::regclass
                  AND contype = 'c'
                  AND conname NOT IN (
                      'chk_taxa_aprovacao',
                      'chk_taxa_reprov_nota',
                      'chk_taxa_reprov_falta',
                      'chk_taxa_trancamento',
                      'chk_tipo_envio_doacao',
                      'chk_soma_taxas_cem'
                  )
            ) LOOP
                EXECUTE 'ALTER TABLE doacoes_estatisticas DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
            END LOOP;
        END $$;
        """
    )

    op.create_check_constraint(
        "chk_taxa_aprovacao",
        "doacoes_estatisticas",
        "taxa_aprovacao IS NULL OR (taxa_aprovacao >= 0 AND taxa_aprovacao <= 100)",
    )
    op.create_check_constraint(
        "chk_taxa_reprov_nota",
        "doacoes_estatisticas",
        "taxa_reprovacao_nota IS NULL OR (taxa_reprovacao_nota >= 0 AND taxa_reprovacao_nota <= 100)",
    )
    op.create_check_constraint(
        "chk_taxa_reprov_falta",
        "doacoes_estatisticas",
        "taxa_reprovacao_falta IS NULL OR (taxa_reprovacao_falta >= 0 AND taxa_reprovacao_falta <= 100)",
    )
    op.create_check_constraint(
        "chk_taxa_trancamento",
        "doacoes_estatisticas",
        "taxa_trancamento IS NULL OR (taxa_trancamento >= 0 AND taxa_trancamento <= 100)",
    )
    op.create_check_constraint(
        "chk_tipo_envio_doacao",
        "doacoes_estatisticas",
        "tipo_envio IN ('TEXTO', 'IMAGEM')",
    )
    op.create_check_constraint(
        "chk_soma_taxas_cem",
        "doacoes_estatisticas",
        "("
        "tipo_envio = 'IMAGEM' AND imagem_chave IS NOT NULL AND "
        "taxa_aprovacao IS NULL AND taxa_reprovacao_nota IS NULL AND "
        "taxa_reprovacao_falta IS NULL AND taxa_trancamento IS NULL"
        ") OR ("
        "taxa_aprovacao IS NOT NULL AND taxa_reprovacao_nota IS NOT NULL AND "
        "taxa_reprovacao_falta IS NOT NULL AND taxa_trancamento IS NOT NULL AND "
        "(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint("chk_soma_taxas_cem", "doacoes_estatisticas", type_="check")
    op.drop_constraint("chk_tipo_envio_doacao", "doacoes_estatisticas", type_="check")
    op.drop_constraint("chk_taxa_trancamento", "doacoes_estatisticas", type_="check")
    op.drop_constraint("chk_taxa_reprov_falta", "doacoes_estatisticas", type_="check")
    op.drop_constraint("chk_taxa_reprov_nota", "doacoes_estatisticas", type_="check")
    op.drop_constraint("chk_taxa_aprovacao", "doacoes_estatisticas", type_="check")

    op.execute(
        "DELETE FROM doacoes_estatisticas WHERE taxa_aprovacao IS NULL "
        "OR taxa_reprovacao_nota IS NULL OR taxa_reprovacao_falta IS NULL OR taxa_trancamento IS NULL"
    )

    op.alter_column("doacoes_estatisticas", "taxa_trancamento", existing_type=sa.Numeric(5, 2), nullable=False)
    op.alter_column("doacoes_estatisticas", "taxa_reprovacao_falta", existing_type=sa.Numeric(5, 2), nullable=False)
    op.alter_column("doacoes_estatisticas", "taxa_reprovacao_nota", existing_type=sa.Numeric(5, 2), nullable=False)
    op.alter_column("doacoes_estatisticas", "taxa_aprovacao", existing_type=sa.Numeric(5, 2), nullable=False)

    op.create_check_constraint("chk_taxa_aprovacao", "doacoes_estatisticas", "taxa_aprovacao >= 0 AND taxa_aprovacao <= 100")
    op.create_check_constraint("chk_taxa_reprov_nota", "doacoes_estatisticas", "taxa_reprovacao_nota >= 0 AND taxa_reprovacao_nota <= 100")
    op.create_check_constraint("chk_taxa_reprov_falta", "doacoes_estatisticas", "taxa_reprovacao_falta >= 0 AND taxa_reprovacao_falta <= 100")
    op.create_check_constraint("chk_taxa_trancamento", "doacoes_estatisticas", "taxa_trancamento >= 0 AND taxa_trancamento <= 100")
    op.create_check_constraint(
        "chk_soma_taxas_cem",
        "doacoes_estatisticas",
        "(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00",
    )

    op.drop_constraint("fk_doacoes_moderador", "doacoes_estatisticas", type_="foreignkey")
    op.drop_column("doacoes_estatisticas", "justificativa_moderacao")
    op.drop_column("doacoes_estatisticas", "moderado_em")
    op.drop_column("doacoes_estatisticas", "moderado_por_id")
    op.drop_column("doacoes_estatisticas", "imagem_mime")
    op.drop_column("doacoes_estatisticas", "imagem_chave")
    op.drop_column("doacoes_estatisticas", "tipo_envio")
