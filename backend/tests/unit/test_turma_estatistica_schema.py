from decimal import Decimal
from types import SimpleNamespace

from app.api.schemas.turma import TurmaResponse


def _turma(estatistica=None):
    return SimpleNamespace(
        id=1, disciplina_id=7, semestre="2024.1", codigo_turma="01",
        horario=None, local=None, professores=[], estatistica=estatistica,
    )


def test_turma_sem_estatistica_retorna_none():
    assert TurmaResponse.model_validate(_turma()).estatistica is None


def test_estatistica_converte_decimal_para_float():
    est = SimpleNamespace(
        taxa_aprovacao=Decimal("75.00"), taxa_reprovacao_nota=Decimal("15.00"),
        taxa_reprovacao_falta=Decimal("5.00"), taxa_trancamento=Decimal("5.00"),
        status="VALIDADO",
    )
    r = TurmaResponse.model_validate(_turma(est))
    assert r.estatistica.taxa_aprovacao == 75.0
    assert isinstance(r.estatistica.taxa_aprovacao, float)
    assert r.estatistica.status == "VALIDADO"
