"""add_metricas_cursos_and_curso_fields

Revision ID: 007
Revises: 006
Create Date: 2026-09-26 21:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Adiciona campos de metadados em cursos (modalidade, area_geral, area_especifica)
    op.add_column('cursos', sa.Column('modalidade', sa.String(length=50), nullable=True))
    op.add_column('cursos', sa.Column('area_geral', sa.String(length=100), nullable=True))
    op.add_column('cursos', sa.Column('area_especifica', sa.String(length=100), nullable=True))

    # 2. Cria tabela metricas_cursos
    op.create_table(
        'metricas_cursos',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('curso_id', sa.Integer(), sa.ForeignKey('cursos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ano', sa.Integer(), nullable=False),
        sa.Column('vagas_totais', sa.Integer(), server_default='0', nullable=False),
        sa.Column('inscritos_total', sa.Integer(), server_default='0', nullable=False),
        sa.Column('ingressantes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('matriculados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('concluintes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('trancados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('desvinculados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('taxa_sucesso', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('taxa_evasao', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('curso_id', 'ano', name='uq_curso_ano')
    )
    op.create_index('ix_metricas_cursos_id', 'metricas_cursos', ['id'])
    op.create_index('ix_metricas_cursos_curso_id', 'metricas_cursos', ['curso_id'])
    op.create_index('ix_metricas_cursos_ano', 'metricas_cursos', ['ano'])


def downgrade() -> None:
    op.drop_index('ix_metricas_cursos_ano', table_name='metricas_cursos')
    op.drop_index('ix_metricas_cursos_curso_id', table_name='metricas_cursos')
    op.drop_index('ix_metricas_cursos_id', table_name='metricas_cursos')
    op.drop_table('metricas_cursos')
    op.drop_column('cursos', 'area_especifica')
    op.drop_column('cursos', 'area_geral')
    op.drop_column('cursos', 'modalidade')
