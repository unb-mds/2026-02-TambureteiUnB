"""add_turma_ocupacao_and_metricas_consolidadas

Revision ID: 003
Revises: 002
Create Date: 2026-09-25 18:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Adiciona campos de ocupação (capacidade e matriculados) na tabela turmas
    op.add_column('turmas', sa.Column('capacidade', sa.Integer(), nullable=True))
    op.add_column('turmas', sa.Column('matriculados', sa.Integer(), nullable=True))

    # 2. Cria tabela de metricas consolidadas da disciplina (RN07 - LGPD)
    op.create_table(
        'metricas_consolidadas',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('matriculados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('aprovados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reprovados_nota', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reprovados_falta', sa.Integer(), server_default='0', nullable=False),
        sa.Column('trancamentos', sa.Integer(), server_default='0', nullable=False),
        sa.Column('taxa_aprovacao_acumulada', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('total_turmas_suprimidas', sa.Integer(), server_default='0', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('disciplina_id', name='uq_metrica_consolidada_disciplina')
    )
    op.create_index('ix_metricas_consolidadas_disciplina_id', 'metricas_consolidadas', ['disciplina_id'])


def downgrade() -> None:
    op.drop_index('ix_metricas_consolidadas_disciplina_id', table_name='metricas_consolidadas')
    op.drop_table('metricas_consolidadas')
    op.drop_column('turmas', 'matriculados')
    op.drop_column('turmas', 'capacidade')
