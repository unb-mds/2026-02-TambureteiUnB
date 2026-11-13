"""Cria a visao materializada de evasao agregada por campus (US 6.2.2, ADR 01)."""
from alembic import op

revision = "011_mv_evasao_campus"
down_revision = "010_curadorias"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE MATERIALIZED VIEW mv_evasao_campus AS
        SELECT
            c.campus AS campus,
            m.ano AS ano,
            COUNT(DISTINCT c.id)::integer AS total_cursos,
            COALESCE(SUM(m.matriculados), 0)::integer AS matriculados,
            COALESCE(SUM(m.desvinculados), 0)::integer AS desvinculados
        FROM cursos c
        JOIN metricas_cursos m ON m.curso_id = c.id
        GROUP BY c.campus, m.ano
        WITH DATA
        """
    )
    op.create_index(
        "ux_mv_evasao_campus_campus_ano",
        "mv_evasao_campus",
        ["campus", "ano"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ux_mv_evasao_campus_campus_ano", table_name="mv_evasao_campus")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_evasao_campus")
