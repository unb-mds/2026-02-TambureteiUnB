"""widen_turma_horario_and_local

Revision ID: 004
Revises: 003
Create Date: 2026-09-25 20:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('turmas', 'horario',
                    existing_type=sa.String(length=50),
                    type_=sa.String(length=255),
                    existing_nullable=True)
    op.alter_column('turmas', 'local',
                    existing_type=sa.String(length=100),
                    type_=sa.String(length=255),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('turmas', 'local',
                    existing_type=sa.String(length=255),
                    type_=sa.String(length=100),
                    existing_nullable=True)
    op.alter_column('turmas', 'horario',
                    existing_type=sa.String(length=255),
                    type_=sa.String(length=50),
                    existing_nullable=True)
