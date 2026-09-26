"""widen_departamento_columns

Revision ID: 005
Revises: 004
Create Date: 2026-09-26 04:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('professores', 'departamento',
                    existing_type=sa.String(length=100),
                    type_=sa.String(length=255),
                    existing_nullable=True)
    op.alter_column('disciplinas', 'departamento',
                    existing_type=sa.String(length=100),
                    type_=sa.String(length=255),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('disciplinas', 'departamento',
                    existing_type=sa.String(length=255),
                    type_=sa.String(length=100),
                    existing_nullable=True)
    op.alter_column('professores', 'departamento',
                    existing_type=sa.String(length=255),
                    type_=sa.String(length=100),
                    existing_nullable=True)
