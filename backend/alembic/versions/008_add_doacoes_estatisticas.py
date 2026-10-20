"""add_doacoes_estatisticas

Revision ID: 008
Revises: 007
Create Date: 2026-10-17 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'doacoes_estatisticas',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('turma_id', sa.Integer(), sa.ForeignKey('turmas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('semestre_referencia', sa.String(length=10), nullable=False),
        sa.Column('taxa_aprovacao', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('taxa_reprovacao_nota', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('taxa_reprovacao_falta', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('taxa_trancamento', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='PENDENTE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('usuario_id', 'turma_id', 'semestre_referencia', name='uq_usuario_turma_semestre_doacao'),
        sa.CheckConstraint('taxa_aprovacao >= 0 AND taxa_aprovacao <= 100', name='chk_taxa_aprovacao'),
        sa.CheckConstraint('taxa_reprovacao_nota >= 0 AND taxa_reprovacao_nota <= 100', name='chk_taxa_reprov_nota'),
        sa.CheckConstraint('taxa_reprovacao_falta >= 0 AND taxa_reprovacao_falta <= 100', name='chk_taxa_reprov_falta'),
        sa.CheckConstraint('taxa_trancamento >= 0 AND taxa_trancamento <= 100', name='chk_taxa_trancamento'),
        sa.CheckConstraint("status IN ('PENDENTE', 'CONSOLIDADA', 'DESCARTADA')", name='chk_status_doacao'),
        sa.CheckConstraint(
            '(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00',
            name='chk_soma_taxas_cem',
        ),
    )
    op.create_index('ix_doacoes_estatisticas_id', 'doacoes_estatisticas', ['id'])
    op.create_index('idx_doacoes_turma_status', 'doacoes_estatisticas', ['turma_id', 'status'])
    op.create_index('idx_doacoes_usuario', 'doacoes_estatisticas', ['usuario_id'])


def downgrade() -> None:
    op.drop_index('idx_doacoes_usuario', table_name='doacoes_estatisticas')
    op.drop_index('idx_doacoes_turma_status', table_name='doacoes_estatisticas')
    op.drop_index('ix_doacoes_estatisticas_id', table_name='doacoes_estatisticas')
    op.drop_table('doacoes_estatisticas')
