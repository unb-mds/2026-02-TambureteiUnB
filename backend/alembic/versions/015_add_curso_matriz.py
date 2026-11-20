"""add_curso_matriz

Revision ID: 015_add_curso_matriz
Revises: 014_widen_metricas_cursos_taxas
Create Date: 2026-11-20 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '015_add_curso_matriz'
down_revision: Union[str, None] = '014_widen_metricas_cursos_taxas'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cursos', sa.Column('matriz_curricular', sa.String(length=50), nullable=True))
    op.add_column('cursos', sa.Column('ano_vigencia', sa.String(length=20), nullable=True))
    op.add_column('cursos', sa.Column('total_creditos', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('cursos', 'total_creditos')
    op.drop_column('cursos', 'ano_vigencia')
    op.drop_column('cursos', 'matriz_curricular')
