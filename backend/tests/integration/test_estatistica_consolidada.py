import pytest

from app.api.schemas.doacao import DoacaoCreate
from app.core.config import settings
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.turma import Turma
from app.models.usuario import Usuario
from app.services.doacao_service import doacao_service

A = dict(aprov=70, nota=20, falta=5, tranc=5)
B = dict(aprov=60, nota=30, falta=5, tranc=5)
RECALCULAR = "/estatisticas-consolidadas/turmas/{}/recalcular"


@pytest.fixture
def turma(db, disciplina, professor_1):
    t = Turma(disciplina_id=disciplina.id, codigo_turma="01", semestre="2026.1", professores=[professor_1])
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def _doar(db, turma, n, aprov, nota, falta, tranc):
    u = Usuario(nome=f"Aluno {n}", email=f"aluno{n}.oficial@unb.br", password_hash="hash", role="STUDENT")
    db.add(u)
    db.commit()
    db.refresh(u)
    dados = DoacaoCreate(
        semestre_referencia="2026.1",
        taxa_aprovacao=aprov,
        taxa_reprovacao_nota=nota,
        taxa_reprovacao_falta=falta,
        taxa_trancamento=tranc,
    )
    return doacao_service.criar_doacao(db, turma.id, u.id, dados)


def _oficiais(db, turma):
    return db.query(EstatisticaConsolidada).filter_by(turma_id=turma.id).all()


class TestConsolidacaoAutomatica:
    def test_quorum_atingido_grava_oficial_validada(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        _doar(db, turma, 1, **A)
        assert _oficiais(db, turma) == []
        _doar(db, turma, 2, **A)
        (oficial,) = _oficiais(db, turma)
        assert float(oficial.taxa_aprovacao) == 70.0
        assert oficial.status == "VALIDADO"
        assert oficial.semestre_referencia == "2026.1"

    def test_oficial_nao_e_sobrescrita_por_outro_grupo(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4, 5):
            _doar(db, turma, n, **B)
        (oficial,) = _oficiais(db, turma)
        assert float(oficial.taxa_aprovacao) == 70.0


class TestRecalculoAdministrativo:
    def test_admin_substitui_a_oficial(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4, 5):
            _doar(db, turma, n, **B)
        r = client.post(RECALCULAR.format(turma.id), headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["taxa_aprovacao"] == 60.0
        assert r.json()["status"] == "VALIDADO"
        assert len(_oficiais(db, turma)) == 1

    def test_sem_quorum_retorna_409(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 3)
        _doar(db, turma, 1, **A)
        r = client.post(RECALCULAR.format(turma.id), headers=admin_headers)
        assert r.status_code == 409
        assert "quórum" in r.json()["detail"]
        assert _oficiais(db, turma) == []

    def test_empate_retorna_409_e_preserva_a_oficial(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4):
            _doar(db, turma, n, **B)
        r = client.post(RECALCULAR.format(turma.id), headers=admin_headers)
        assert r.status_code == 409
        (oficial,) = _oficiais(db, turma)
        assert float(oficial.taxa_aprovacao) == 70.0

    def test_estudante_recebe_403(self, client, turma, student_headers):
        assert client.post(RECALCULAR.format(turma.id), headers=student_headers).status_code == 403

    def test_sem_autenticacao_retorna_401(self, client, turma):
        assert client.post(RECALCULAR.format(turma.id)).status_code == 401

    def test_turma_inexistente_retorna_404(self, client, admin_headers):
        assert client.post(RECALCULAR.format(999999), headers=admin_headers).status_code == 404

    def test_semestre_invalido_retorna_422(self, client, turma, admin_headers):
        r = client.post(RECALCULAR.format(turma.id) + "?semestre=invalido", headers=admin_headers)
        assert r.status_code == 422


class TestListagem:
    def test_lista_publica_sem_dados_de_usuario(self, client, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        r = client.get("/estatisticas-consolidadas", params={"turma_id": turma.id})
        assert r.status_code == 200
        (item,) = r.json()
        assert item["taxa_aprovacao"] == 70.0
        assert "usuario_id" not in item

    def test_semestre_invalido_retorna_422(self, client):
        assert client.get("/estatisticas-consolidadas?semestre=invalido").status_code == 422