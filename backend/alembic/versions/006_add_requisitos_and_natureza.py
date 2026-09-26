"""add_requisitos_and_natureza

Revision ID: 006
Revises: 005
Create Date: 2026-09-26 05:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adiciona colunas de requisitos e equivalências na tabela disciplinas
    op.add_column('disciplinas', sa.Column('pre_requisitos', sa.Text(), nullable=True))
    op.add_column('disciplinas', sa.Column('co_requisitos', sa.Text(), nullable=True))
    op.add_column('disciplinas', sa.Column('equivalencias', sa.Text(), nullable=True))

    # Adiciona coluna natureza na tabela cursos_disciplinas
    op.add_column('cursos_disciplinas', sa.Column('natureza', sa.String(length=50), server_default='Obrigatoria', nullable=False))


def downgrade() -> None:
    op.drop_column('cursos_disciplinas', 'natureza')
    op.drop_column('disciplinas', 'equivalencias')
    op.drop_column('disciplinas', 'co_requisitos')
    op.drop_column('disciplinas', 'pre_requisitos')
