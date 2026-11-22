"""widen_turma_horario_to_text

Revision ID: 013
Revises: 012
Create Date: 2026-11-18 01:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '016_widen_turma_horario_to_text'
down_revision: Union[str, None] = '015_moderacao_ia'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('turmas', 'horario',
                    existing_type=sa.String(length=255),
                    type_=sa.Text(),
                    existing_nullable=True)
    op.alter_column('turmas', 'local',
                    existing_type=sa.String(length=255),
                    type_=sa.Text(),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('turmas', 'local',
                    existing_type=sa.Text(),
                    type_=sa.String(length=255),
                    existing_nullable=True)
    op.alter_column('turmas', 'horario',
                    existing_type=sa.Text(),
                    type_=sa.String(length=255),
                    existing_nullable=True)
