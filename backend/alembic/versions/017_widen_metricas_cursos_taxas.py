"""widen_metricas_cursos_taxas

Revision ID: 014_widen_metricas_cursos_taxas
Revises: 013_widen_turma_horario_to_text
Create Date: 2026-11-18 02:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '017_widen_metricas_cursos_taxas'
down_revision: Union[str, None] = '016_widen_turma_horario_to_text'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('metricas_cursos', 'taxa_sucesso',
                    existing_type=sa.Numeric(5, 2),
                    type_=sa.Numeric(8, 2),
                    existing_nullable=True)
    op.alter_column('metricas_cursos', 'taxa_evasao',
                    existing_type=sa.Numeric(5, 2),
                    type_=sa.Numeric(8, 2),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('metricas_cursos', 'taxa_evasao',
                    existing_type=sa.Numeric(8, 2),
                    type_=sa.Numeric(5, 2),
                    existing_nullable=True)
    op.alter_column('metricas_cursos', 'taxa_sucesso',
                    existing_type=sa.Numeric(8, 2),
                    type_=sa.Numeric(5, 2),
                    existing_nullable=True)
