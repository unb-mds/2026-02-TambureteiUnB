from app.core.database import Base
from app.models.curso import Curso, CursoDisciplina
from app.models.disciplina import Disciplina
from app.models.usuario import Usuario
from app.models.metrica import MetricaAcademica
from app.models.situacao import SituacaoDisciplina

__all__ = [
    "Base",
    "Curso",
    "CursoDisciplina",
    "Disciplina",
    "Usuario",
    "MetricaAcademica",
    "SituacaoDisciplina"
]
