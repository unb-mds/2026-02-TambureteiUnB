"""add_disciplina_id_e_indice_serie_historica_estatisticas"""
from alembic import op
import sqlalchemy as sa

revision = "013_estat_disciplina_semestre"
down_revision = "012_estatisticas_consolidadas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Coluna nullable para permitir o backfill das linhas existentes.
    op.add_column(
        "estatisticas_consolidadas",
        sa.Column("disciplina_id", sa.Integer(), nullable=True),
    )
    # 2. Backfill: a disciplina vem da turma de cada estatistica.
    op.execute(
        """
        UPDATE estatisticas_consolidadas AS ec
        SET disciplina_id = t.disciplina_id
        FROM turmas AS t
        WHERE t.id = ec.turma_id
        """
    )
    # 3. Agora pode ser obrigatoria.
    op.alter_column("estatisticas_consolidadas", "disciplina_id", nullable=False)
    op.create_foreign_key(
        "fk_estatisticas_consolidadas_disciplina",
        "estatisticas_consolidadas",
        "disciplinas",
        ["disciplina_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # 4. Indice composto: igualdade em disciplina_id, intervalo em semestre_referencia.
    op.create_index(
        "ix_estatisticas_disciplina_semestre",
        "estatisticas_consolidadas",
        ["disciplina_id", "semestre_referencia"],
    )


def downgrade() -> None:
    op.drop_index("ix_estatisticas_disciplina_semestre", table_name="estatisticas_consolidadas")
    op.drop_constraint(
        "fk_estatisticas_consolidadas_disciplina", "estatisticas_consolidadas", type_="foreignkey"
    )
    op.drop_column("estatisticas_consolidadas", "disciplina_id")
