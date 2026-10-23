import pytest

from app.api.schemas.doacao import DoacaoCreate
from app.core.config import settings
from app.models.doacao import DoacaoEstatistica
from app.models.turma import Turma
from app.models.usuario import Usuario
from app.services.doacao_service import doacao_service

A = dict(aprov=70, nota=20, falta=5, tranc=5)
B = dict(aprov=60, nota=30, falta=5, tranc=5)


@pytest.fixture
def turma(db, disciplina, professor_1):
    t = Turma(disciplina_id=disciplina.id, codigo_turma="01", semestre="2026.1", professores=[professor_1])
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def _aluno(db, n):
    u = Usuario(nome=f"Aluno {n}", email=f"aluno{n}.quorum@unb.br", password_hash="hash", role="STUDENT")
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _doar(db, turma, n, aprov, nota, falta, tranc):
    dados = DoacaoCreate(
        semestre_referencia="2026.1",
        taxa_aprovacao=aprov,
        taxa_reprovacao_nota=nota,
        taxa_reprovacao_falta=falta,
        taxa_trancamento=tranc,
    )
    return doacao_service.criar_doacao(db, turma.id, _aluno(db, n).id, dados)


def _status_por_aprovacao(db, turma):
    doacoes = db.query(DoacaoEstatistica).filter_by(turma_id=turma.id).all()
    return sorted((float(d.taxa_aprovacao), d.status) for d in doacoes)


class TestMotorDeConsenso:
    def test_quorum_atingido_consolida_o_grupo(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 3)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        assert {s for _, s in _status_por_aprovacao(db, turma)} == {"PENDENTE"}

        ultima = _doar(db, turma, 3, **A)
        assert ultima.status == "CONSOLIDADA"
        assert {s for _, s in _status_por_aprovacao(db, turma)} == {"CONSOLIDADA"}

    def test_valores_diferentes_nao_somam(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 3)
        _doar(db, turma, 1, **A)
        _doar(db, turma, 2, **A)
        _doar(db, turma, 3, **B)
        _doar(db, turma, 4, **B)
        assert {s for _, s in _status_por_aprovacao(db, turma)} == {"PENDENTE"}

    def test_maior_grupo_vence_quando_dois_atingem_quorum(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2, 3):
            _doar(db, turma, n, **A)
        for n in (4, 5):
            _doar(db, turma, n, **B)
        assert _status_por_aprovacao(db, turma) == [
            (60.0, "PENDENTE"), (60.0, "PENDENTE"),
            (70.0, "CONSOLIDADA"), (70.0, "CONSOLIDADA"), (70.0, "CONSOLIDADA"),
        ]

    def test_empate_nao_consolida_ninguem(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4):
            _doar(db, turma, n, **B)
        assert {s for _, s in _status_por_aprovacao(db, turma)} == {"PENDENTE"}

    def test_rotina_recalcula_quando_outro_grupo_ultrapassa(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        assert {s for _, s in _status_por_aprovacao(db, turma)} == {"CONSOLIDADA"}

        for n in (3, 4, 5):
            _doar(db, turma, n, **B)
        assert _status_por_aprovacao(db, turma) == [
            (60.0, "CONSOLIDADA"), (60.0, "CONSOLIDADA"), (60.0, "CONSOLIDADA"),
            (70.0, "PENDENTE"), (70.0, "PENDENTE"),
        ]

    def test_doacoes_descartadas_sao_ignoradas(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        primeira = _doar(db, turma, 1, **A)
        primeira.status = "DESCARTADA"
        db.commit()
        _doar(db, turma, 2, **A)
        statuses = {d.status for d in db.query(DoacaoEstatistica).filter_by(turma_id=turma.id).all()}
        assert statuses == {"DESCARTADA", "PENDENTE"}


class TestProgressoDoQuorum:
    def test_admin_ve_progresso_por_valor(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 3)
        _doar(db, turma, 1, **A)
        _doar(db, turma, 2, **A)
        _doar(db, turma, 3, **B)

        response = client.get(f"/turmas/{turma.id}/doacoes/quorum", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["quorum_minimo"] == 3
        assert data["semestre_referencia"] == "2026.1"
        assert data["consolidado"] is False
        assert [g["quantidade"] for g in data["grupos"]] == [2, 1]
        assert data["grupos"][0]["taxa_aprovacao"] == 70.0
        assert data["grupos"][0]["atingiu_quorum"] is False

    def test_progresso_marca_grupo_consolidado(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        _doar(db, turma, 1, **A)
        _doar(db, turma, 2, **A)
        data = client.get(f"/turmas/{turma.id}/doacoes/quorum", headers=admin_headers).json()
        assert data["consolidado"] is True
        assert data["grupos"][0]["consolidado"] is True
        assert data["grupos"][0]["atingiu_quorum"] is True

    def test_turma_sem_doacoes_retorna_lista_vazia(self, client, turma, admin_headers):
        data = client.get(f"/turmas/{turma.id}/doacoes/quorum", headers=admin_headers).json()
        assert data["grupos"] == []
        assert data["consolidado"] is False

    def test_turma_inexistente_retorna_404(self, client, admin_headers):
        assert client.get("/turmas/999999/doacoes/quorum", headers=admin_headers).status_code == 404

    def test_estudante_recebe_403(self, client, turma, student_headers):
        assert client.get(f"/turmas/{turma.id}/doacoes/quorum", headers=student_headers).status_code == 403

    def test_sem_autenticacao_retorna_401(self, client, turma):
        assert client.get(f"/turmas/{turma.id}/doacoes/quorum").status_code == 401