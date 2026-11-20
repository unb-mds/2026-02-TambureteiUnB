from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.turma import Turma


def _turma(db, disciplina, codigo, semestre="2024.1"):
    t = Turma(disciplina_id=disciplina.id, codigo_turma=codigo, semestre=semestre)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def _estatistica(db, turma, semestre=None, aprov=75, nota=15, falta=5, tranc=5):
    db.add(
        EstatisticaConsolidada(
            turma_id=turma.id,
            disciplina_id=turma.disciplina_id,
            semestre_referencia=semestre or turma.semestre,
            taxa_aprovacao=aprov,
            taxa_reprovacao_nota=nota,
            taxa_reprovacao_falta=falta,
            taxa_trancamento=tranc,
        )
    )
    db.commit()


def _por_codigo(resposta):
    return {t["codigo_turma"]: t for t in resposta.json()}


class TestListagemComEstatistica:
    def test_turma_com_estatistica_traz_as_taxas(self, client, db, disciplina):
        _estatistica(db, _turma(db, disciplina, "01"))
        r = client.get(f"/turmas?disciplina_id={disciplina.id}")
        assert r.status_code == 200
        est = _por_codigo(r)["01"]["estatistica"]
        assert est == {
            "taxa_aprovacao": 75.0,
            "taxa_reprovacao_nota": 15.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
            "status": "VALIDADO",
        }

    def test_turma_sem_estatistica_retorna_null(self, client, db, disciplina):
        _estatistica(db, _turma(db, disciplina, "01"))
        _turma(db, disciplina, "02")
        turmas = _por_codigo(client.get(f"/turmas?disciplina_id={disciplina.id}"))
        assert turmas["01"]["estatistica"] is not None
        assert turmas["02"]["estatistica"] is None

    def test_estatistica_de_outro_semestre_nao_aparece(self, client, db, disciplina):
        turma = _turma(db, disciplina, "01", semestre="2024.1")
        _estatistica(db, turma, semestre="2023.2")
        turmas = _por_codigo(client.get(f"/turmas?disciplina_id={disciplina.id}"))
        assert turmas["01"]["estatistica"] is None

    def test_acesso_publico_sem_token(self, client, db, disciplina):
        _turma(db, disciplina, "01")
        assert client.get(f"/turmas?disciplina_id={disciplina.id}").status_code == 200

    def test_disciplina_inexistente_retorna_404(self, client):
        assert client.get("/turmas?disciplina_id=999999").status_code == 404


class TestDetalheDaTurma:
    def test_obter_turma_inclui_estatistica(self, client, db, disciplina):
        turma = _turma(db, disciplina, "01")
        _estatistica(db, turma, aprov=60, nota=20, falta=10, tranc=10)
        r = client.get(f"/turmas/{turma.id}")
        assert r.status_code == 200
        assert r.json()["estatistica"]["taxa_aprovacao"] == 60.0
