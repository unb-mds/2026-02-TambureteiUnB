"""initial_schema

Revision ID: 001
Revises: 
Create Date: 2026-09-04 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabela usuarios
    op.create_table(
        'usuarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='STUDENT', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_usuarios_email', 'usuarios', ['email'], unique=True)

    # 2. Tabela cursos
    op.create_table(
        'cursos',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('codigo_mec', sa.String(length=20), nullable=True),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('campus', sa.String(length=100), server_default='FCTE - Gama', nullable=False),
        sa.Column('grau', sa.String(length=50), server_default='Bacharelado', nullable=True),
        sa.Column('turno', sa.String(length=50), server_default='Diurno', nullable=True),
        sa.Column('slug', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_cursos_slug', 'cursos', ['slug'], unique=True)
    op.create_index('ix_cursos_codigo_mec', 'cursos', ['codigo_mec'], unique=True)

    # 3. Tabela disciplinas
    op.create_table(
        'disciplinas',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('codigo', sa.String(length=30), nullable=True),
        sa.Column('slug', sa.String(length=150), nullable=False),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('departamento', sa.String(length=100), nullable=True),
        sa.Column('creditos', sa.Integer(), nullable=True),
        sa.Column('carga_horaria', sa.Integer(), nullable=True),
        sa.Column('ementa', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_disciplinas_slug', 'disciplinas', ['slug'], unique=True)
    op.create_index('ix_disciplinas_codigo', 'disciplinas', ['codigo'])

    # 4. Tabela cursos_disciplinas
    op.create_table(
        'cursos_disciplinas',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('curso_id', sa.Integer(), sa.ForeignKey('cursos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('periodo_sugerido', sa.Integer(), nullable=True),
        sa.Column('is_obrigatoria', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('curso_id', 'disciplina_id', name='uq_curso_disciplina')
    )
    op.create_index('ix_cursos_disciplinas_curso', 'cursos_disciplinas', ['curso_id'])
    op.create_index('ix_cursos_disciplinas_disciplina', 'cursos_disciplinas', ['disciplina_id'])

    # 5. Tabela professores
    op.create_table(
        'professores',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('departamento', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_professores_nome', 'professores', ['nome'])

    # 6. Tabela turmas
    op.create_table(
        'turmas',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('codigo_turma', sa.String(length=10), nullable=False),
        sa.Column('semestre', sa.String(length=10), nullable=False),
        sa.Column('horario', sa.String(length=50), nullable=True),
        sa.Column('local', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('disciplina_id', 'codigo_turma', 'semestre', name='uq_disciplina_turma_semestre')
    )
    op.create_index('ix_turmas_disciplina_id', 'turmas', ['disciplina_id'])
    op.create_index('ix_turmas_semestre', 'turmas', ['semestre'])

    # 7. Tabela associativa turmas_professores (N:N)
    op.create_table(
        'turmas_professores',
        sa.Column('turma_id', sa.Integer(), sa.ForeignKey('turmas.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('professor_id', sa.Integer(), sa.ForeignKey('professores.id', ondelete='CASCADE'), primary_key=True),
    )

    # 8. Tabela metricas_academicas
    op.create_table(
        'metricas_academicas',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ano', sa.Integer(), nullable=False),
        sa.Column('semestre', sa.Integer(), nullable=False),
        sa.Column('matriculados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('aprovados', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reprovados_nota', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reprovados_falta', sa.Integer(), server_default='0', nullable=False),
        sa.Column('trancamentos', sa.Integer(), server_default='0', nullable=False),
        sa.Column('taxa_aprovacao', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('disciplina_id', 'ano', 'semestre', name='uq_disciplina_ano_semestre'),
        sa.CheckConstraint('semestre IN (1, 2)', name='chk_semestre_valido')
    )
    op.create_index('ix_metricas_disciplina_ano', 'metricas_academicas', ['disciplina_id', 'ano'])

    # 9. Tabela situacoes_disciplinas
    op.create_table(
        'situacoes_disciplinas',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('situacao', sa.String(length=20), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('usuario_id', 'disciplina_id', name='uq_usuario_disciplina_situacao'),
        sa.CheckConstraint("situacao IN ('APROVADO', 'REPROVADO_NOTA', 'REPROVADO_FALTA', 'TRANCOU')", name='chk_situacao_valida')
    )
    op.create_index('ix_situacoes_disciplina', 'situacoes_disciplinas', ['disciplina_id'])

    # 10. Tabela conteudos
    op.create_table(
        'conteudos',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('turma_id', sa.Integer(), sa.ForeignKey('turmas.id', ondelete='SET NULL'), nullable=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('titulo', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('tipo', sa.String(length=30), nullable=False),
        sa.Column('url_origem', sa.Text(), nullable=False),
        sa.Column('semestre', sa.String(length=10), nullable=True),
        sa.Column('status_curadoria', sa.String(length=20), server_default='PENDENTE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA')", name='chk_tipo_conteudo'),
        sa.CheckConstraint("status_curadoria IN ('PENDENTE', 'APROVADO', 'RECUSADO')", name='chk_status_curadoria')
    )
    op.create_index('ix_conteudos_disciplina_tipo', 'conteudos', ['disciplina_id', 'tipo', 'status_curadoria'])
    op.create_index('ix_conteudos_turma_id', 'conteudos', ['turma_id'])

    # 11. Tabela comentarios
    op.create_table(
        'comentarios',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('disciplina_id', sa.Integer(), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('turma_id', sa.Integer(), sa.ForeignKey('turmas.id', ondelete='SET NULL'), nullable=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('autor_alias', sa.String(length=50), server_default='Estudante Anônimo', nullable=False),
        sa.Column('topico_dificuldade', sa.String(length=150), nullable=True),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('parent_id', sa.BigInteger(), sa.ForeignKey('comentarios.id', ondelete='CASCADE'), nullable=True),
        sa.Column('status_moderacao', sa.String(length=20), server_default='PUBLICADO', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("status_moderacao IN ('PUBLICADO', 'PENDENTE', 'OCULTO')", name='chk_status_moderacao')
    )
    op.create_index('ix_comentarios_disciplina', 'comentarios', ['disciplina_id'])
    op.create_index('ix_comentarios_turma_id', 'comentarios', ['turma_id'])
    op.create_index('ix_comentarios_parent', 'comentarios', ['parent_id'])

    # 12. Tabela votos_uteis
    op.create_table(
        'votos_uteis',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_type', sa.String(length=20), nullable=False),
        sa.Column('target_id', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('usuario_id', 'target_type', 'target_id', name='uq_usuario_target_voto'),
        sa.CheckConstraint("target_type IN ('CONTEUDO', 'COMENTARIO')", name='chk_target_type_valido')
    )
    op.create_index('ix_votos_target', 'votos_uteis', ['target_type', 'target_id'])


def downgrade() -> None:
    op.drop_table('votos_uteis')
    op.drop_table('comentarios')
    op.drop_table('conteudos')
    op.drop_table('situacoes_disciplinas')
    op.drop_table('metricas_academicas')
    op.drop_table('turmas_professores')
    op.drop_table('turmas')
    op.drop_table('professores')
    op.drop_table('cursos_disciplinas')
    op.drop_table('disciplinas')
    op.drop_table('cursos')
    op.drop_table('usuarios')
