from decimal import Decimal

import pytest
from sqlalchemy import inspect

from app.domain.quorum import GrupoValores
from app.models.disciplina import Disciplina
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.turma import Turma
from app.repositories.estatistica_repo import estatistica_repo

URL = "/catalogo/cadeiras/{}/estatisticas"


def _estatistica(db, disciplina, semestre, codigo, aprov, nota, falta, tranc):
    turma = Turma(disciplina_id=disciplina.id, codigo_turma=codigo, semestre=semestre)
    db.add(turma)
    db.flush()
    db.add(
        EstatisticaConsolidada(
            turma_id=turma.id,
            disciplina_id=disciplina.id,
            semestre_referencia=semestre,
            taxa_aprovacao=aprov,
            taxa_reprovacao_nota=nota,
            taxa_reprovacao_falta=falta,
            taxa_trancamento=tranc,
        )
    )
    db.commit()


@pytest.fixture
def serie(db, disciplina):
    """2022.2 e 2023.1 ficam propositalmente sem estatística."""
    _estatistica(db, disciplina, "2021.2", "01", 60, 20, 10, 10)
    _estatistica(db, disciplina, "2022.1", "01", 70, 20, 5, 5)
    _estatistica(db, disciplina, "2022.1", "02", 80, 10, 5, 5)
    _estatistica(db, disciplina, "2023.2", "01", 50, 30, 10, 10)
    _estatistica(db, disciplina, "2024.1", "01", 90, 5, 3, 2)
    _estatistica(db, disciplina, "2024.3", "01", 85, 5, 5, 5)
    _estatistica(db, disciplina, "2025.1", "01", 40, 40, 10, 10)
    return disciplina


@pytest.fixture
def outra_disciplina(db):
    d = Disciplina(slug="outra-teste", nome="Outra", codigo="FGA0001", departamento="FCTE")
    db.add(d)
    db.commit()
    db.refresh(d)
    _estatistica(db, d, "2022.1", "01", 10, 70, 10, 10)
    return d


def _semestres(resposta):
    return [s["semestre_referencia"] for s in resposta.json()["semestres"]]


class TestFiltroPorIntervalo:
    def test_filtra_intervalo_em_ordem_cronologica(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 2022, "ano_fim": 2024}, headers=headers)
        assert r.status_code == 200
        assert _semestres(r) == ["2022.1", "2023.2", "2024.1", "2024.3"]
        assert r.json()["ano_inicio"] == 2022
        assert r.json()["ano_fim"] == 2024

    def test_agrega_turmas_do_mesmo_semestre_pela_media(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 2022, "ano_fim": 2022}, headers=headers)
        (sem,) = r.json()["semestres"]
        assert sem["semestre_referencia"] == "2022.1"
        assert sem["total_turmas"] == 2
        assert sem["taxa_aprovacao"] == 75.0
        assert sem["taxa_reprovacao_nota"] == 15.0
        assert sem["taxa_reprovacao_falta"] == 5.0
        assert sem["taxa_trancamento"] == 5.0

    def test_semestres_sem_estatistica_sao_omitidos(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 2022, "ano_fim": 2023}, headers=headers)
        assert "2022.2" not in _semestres(r)
        assert "2023.1" not in _semestres(r)

    def test_so_ano_inicio_sem_limite_superior(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 2024}, headers=headers)
        assert _semestres(r) == ["2024.1", "2024.3", "2025.1"]

    def test_so_ano_fim_sem_limite_inferior(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_fim": 2022}, headers=headers)
        assert _semestres(r) == ["2021.2", "2022.1"]

    def test_sem_parametros_retorna_serie_completa(self, client, serie, headers):
        r = client.get(URL.format(serie.id), headers=headers)
        assert _semestres(r) == ["2021.2", "2022.1", "2023.2", "2024.1", "2024.3", "2025.1"]

    def test_nao_mistura_outra_disciplina(self, client, serie, outra_disciplina, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 2022, "ano_fim": 2022}, headers=headers)
        (sem,) = r.json()["semestres"]
        assert sem["total_turmas"] == 2

    def test_disciplina_sem_estatisticas_retorna_lista_vazia(self, client, disciplina, headers):
        r = client.get(URL.format(disciplina.id), headers=headers)
        assert r.status_code == 200
        assert r.json()["semestres"] == []


class TestErros:
    def test_ano_fim_menor_que_inicio_retorna_400(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 2024, "ano_fim": 2022}, headers=headers)
        assert r.status_code == 400
        assert "ano_fim" in r.json()["detail"]

    def test_disciplina_inexistente_retorna_404(self, client, headers):
        assert client.get(URL.format(999999), headers=headers).status_code == 404

    def test_ano_fora_da_faixa_retorna_422(self, client, serie, headers):
        r = client.get(URL.format(serie.id), params={"ano_inicio": 99}, headers=headers)
        assert r.status_code == 422

    def test_sem_autenticacao_retorna_401(self, client, serie):
        assert client.get(URL.format(serie.id)).status_code == 401


class TestPersistencia:
    def test_indice_composto_existe_na_ordem_correta(self, db):
        indices = inspect(db.connection()).get_indexes("estatisticas_consolidadas")
        alvo = next(i for i in indices if i["name"] == "ix_estatisticas_disciplina_semestre")
        assert alvo["column_names"] == ["disciplina_id", "semestre_referencia"]

    def test_salvar_preenche_disciplina_id_a_partir_da_turma(self, db, disciplina):
        turma = Turma(disciplina_id=disciplina.id, codigo_turma="09", semestre="2026.1")
        db.add(turma)
        db.commit()
        grupo = GrupoValores(
            taxa_aprovacao=Decimal("70.00"),
            taxa_reprovacao_nota=Decimal("20.00"),
            taxa_reprovacao_falta=Decimal("5.00"),
            taxa_trancamento=Decimal("5.00"),
            quantidade=3,
        )
        oficial = estatistica_repo.salvar(db, turma.id, "2026.1", grupo)
        assert oficial.disciplina_id == disciplina.id
