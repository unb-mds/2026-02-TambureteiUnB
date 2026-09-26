from app.core.database import Base
from app.models.curso import Curso, CursoDisciplina
from app.models.disciplina import Disciplina
from app.models.professor import Professor
from app.models.turma import Turma, turmas_professores
from app.models.usuario import Usuario
from app.models.metrica import MetricaAcademica, MetricaConsolidada
from app.models.situacao import SituacaoDisciplina
from app.models.conteudo import Conteudo
from app.models.comentario import Comentario
from app.models.voto import VotoUtil
from app.models.material import Material

__all__ = [
    "Base",
    "Curso",
    "CursoDisciplina",
    "Disciplina",
    "Professor",
    "Turma",
    "turmas_professores",
    "Usuario",
    "MetricaAcademica",
    "MetricaConsolidada",
    "SituacaoDisciplina",
    "Conteudo",
    "Comentario",
    "VotoUtil",
    "Material"
]
