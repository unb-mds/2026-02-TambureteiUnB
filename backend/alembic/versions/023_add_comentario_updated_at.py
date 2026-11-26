"""adiciona updated_at em comentarios para indicador de edicao

Revision ID: 023_add_comentario_updated_at
Revises: 325da4c00b26
Create Date: 2026-11-26 18:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "023_add_comentario_updated_at"
down_revision: Union[str, None] = "325da4c00b26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "comentarios",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("comentarios", "updated_at")
