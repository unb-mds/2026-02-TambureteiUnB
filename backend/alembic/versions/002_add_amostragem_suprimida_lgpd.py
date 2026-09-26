"""add_amostragem_suprimida_lgpd

Revision ID: 002
Revises: 001
Create Date: 2026-09-25 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'metricas_academicas',
        sa.Column('amostragem_suprimida_lgpd', sa.Boolean(), server_default='false', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('metricas_academicas', 'amostragem_suprimida_lgpd')
