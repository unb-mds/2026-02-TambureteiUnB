from app.repositories.base import BaseRepository
from app.repositories.disciplina_repo import disciplina_repo, DisciplinaRepository
from app.repositories.professor_repo import professor_repo, ProfessorRepository
from app.repositories.turma_repo import turma_repo, TurmaRepository
from app.repositories.metricas_repo import metricas_repo, MetricasRepository
from app.repositories.usuario_repo import usuario_repo, UsuarioRepository
from app.repositories.conteudo_repo import conteudo_repo, ConteudoRepository
from app.repositories.situacao_repo import situacao_repo, SituacaoRepository

__all__ = [
    "BaseRepository",
    "disciplina_repo",
    "DisciplinaRepository",
    "professor_repo",
    "ProfessorRepository",
    "turma_repo",
    "TurmaRepository",
    "metricas_repo",
    "MetricasRepository",
    "usuario_repo",
    "UsuarioRepository",
    "conteudo_repo",
    "ConteudoRepository",
    "situacao_repo",
    "SituacaoRepository"
]
