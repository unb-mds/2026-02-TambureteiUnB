from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy import CheckConstraint, UniqueConstraint

from app.api.schemas.estatistica_consolidada import EstatisticaConsolidadaResponse
from app.core.config import settings
from app.domain.quorum import GrupoValores
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.services import doacao_service as modulo
from app.services.doacao_service import DoacaoService


def _grupo(qtd, aprov="70.00", nota="20.00", falta="5.00", tranc="5.00"):
    return GrupoValores(
        taxa_aprovacao=Decimal(aprov),
        taxa_reprovacao_nota=Decimal(nota),
        taxa_reprovacao_falta=Decimal(falta),
        taxa_trancamento=Decimal(tranc),
        quantidade=qtd,
    )


def _oficial(**kw):
    base = dict(
        id=1,
        turma_id=10,
        semestre_referencia="2026.1",
        taxa_aprovacao=Decimal("70.00"),
        taxa_reprovacao_nota=Decimal("20.00"),
        taxa_reprovacao_falta=Decimal("5.00"),
        taxa_trancamento=Decimal("5.00"),
        status="VALIDADO",
        created_at=datetime(2026, 10, 29, tzinfo=timezone.utc),
        updated_at=datetime(2026, 10, 29, tzinfo=timezone.utc),
    )
    base.update(kw)
    return SimpleNamespace(**base)


@pytest.fixture
def repos(monkeypatch):
    """Troca os repositórios do service por mocks (sem banco)."""
    doacao = MagicMock()
    estatistica = MagicMock()
    turma = MagicMock()
    turma.get_by_id.return_value = SimpleNamespace(id=10, semestre="2026.1")
    estatistica.get_by_turma_e_semestre.return_value = None
    monkeypatch.setattr(modulo, "doacao_repo", doacao)
    monkeypatch.setattr(modulo, "estatistica_repo", estatistica)
    monkeypatch.setattr(modulo, "turma_repo", turma)
    monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 3)
    return SimpleNamespace(doacao=doacao, estatistica=estatistica, turma=turma)


class TestAvaliarConsenso:
    def test_sem_oficial_e_com_vencedor_grava_a_oficial(self, repos):
        db = MagicMock()
        vencedor = _grupo(3)
        repos.doacao.agrupar_por_valores.return_value = [vencedor, _grupo(1, aprov="60.00", nota="30.00")]

        DoacaoService().avaliar_consenso(db, 10, "2026.1")

        repos.doacao.definir_consolidadas.assert_called_once_with(db, 10, "2026.1", vencedor)
        repos.estatistica.salvar.assert_called_once_with(db, 10, "2026.1", vencedor)

    def test_sem_oficial_e_sem_quorum_nao_grava_nada(self, repos):
        db = MagicMock()
        repos.doacao.agrupar_por_valores.return_value = [_grupo(2)]

        DoacaoService().avaliar_consenso(db, 10, "2026.1")

        repos.doacao.definir_consolidadas.assert_called_once_with(db, 10, "2026.1", None)
        repos.estatistica.salvar.assert_not_called()

    def test_empate_no_topo_nao_grava(self, repos):
        db = MagicMock()
        repos.doacao.agrupar_por_valores.return_value = [_grupo(3), _grupo(3, aprov="60.00", nota="30.00")]

        DoacaoService().avaliar_consenso(db, 10, "2026.1")

        repos.estatistica.salvar.assert_not_called()

    def test_com_oficial_congela_e_nao_reavalia_os_grupos(self, repos):
        db = MagicMock()
        repos.estatistica.get_by_turma_e_semestre.return_value = _oficial()

        DoacaoService().avaliar_consenso(db, 10, "2026.1")

        repos.doacao.agrupar_por_valores.assert_not_called()
        repos.estatistica.salvar.assert_not_called()
        _, args, _ = repos.doacao.definir_consolidadas.mock_calls[0]
        grupo_usado = args[3]
        assert grupo_usado.taxa_aprovacao == Decimal("70.00")
        assert grupo_usado.taxa_trancamento == Decimal("5.00")


class TestRecalcularOficial:
    def test_com_vencedor_substitui_e_faz_commit(self, repos):
        db = MagicMock()
        vencedor = _grupo(4)
        repos.doacao.agrupar_por_valores.return_value = [vencedor]
        salva = _oficial()
        repos.estatistica.salvar.return_value = salva

        resultado = DoacaoService().recalcular_oficial(db, 10, None)

        assert resultado is salva
        repos.doacao.definir_consolidadas.assert_called_once_with(db, 10, "2026.1", vencedor)
        repos.estatistica.salvar.assert_called_once_with(db, 10, "2026.1", vencedor)
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(salva)

    def test_sem_quorum_retorna_409_sem_alterar_nada(self, repos):
        db = MagicMock()
        repos.doacao.agrupar_por_valores.return_value = [_grupo(1)]

        with pytest.raises(HTTPException) as exc:
            DoacaoService().recalcular_oficial(db, 10, None)

        assert exc.value.status_code == 409
        assert "quórum" in exc.value.detail
        repos.estatistica.salvar.assert_not_called()
        repos.doacao.definir_consolidadas.assert_not_called()
        db.commit.assert_not_called()

    def test_empate_retorna_409(self, repos):
        db = MagicMock()
        repos.doacao.agrupar_por_valores.return_value = [_grupo(3), _grupo(3, aprov="60.00", nota="30.00")]

        with pytest.raises(HTTPException) as exc:
            DoacaoService().recalcular_oficial(db, 10, None)

        assert exc.value.status_code == 409
        db.commit.assert_not_called()

    def test_usa_o_semestre_informado(self, repos):
        db = MagicMock()
        repos.doacao.agrupar_por_valores.return_value = [_grupo(3)]
        repos.estatistica.salvar.return_value = _oficial()

        DoacaoService().recalcular_oficial(db, 10, "2025.2")

        repos.doacao.agrupar_por_valores.assert_called_once_with(db, 10, "2025.2")

    def test_respeita_o_quorum_configurado(self, repos, monkeypatch):
        db = MagicMock()
        repos.doacao.agrupar_por_valores.return_value = [_grupo(2)]
        repos.estatistica.salvar.return_value = _oficial()
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)

        DoacaoService().recalcular_oficial(db, 10, None)

        repos.estatistica.salvar.assert_called_once()


class TestResolverSemestre:
    def test_padrao_e_o_semestre_da_turma(self, repos):
        assert DoacaoService()._resolver_semestre(MagicMock(), 10, None) == "2026.1"

    def test_semestre_informado_tem_prioridade(self, repos):
        assert DoacaoService()._resolver_semestre(MagicMock(), 10, "2025.2") == "2025.2"

    def test_semestre_invalido_retorna_422_sem_consultar_a_turma(self, repos):
        with pytest.raises(HTTPException) as exc:
            DoacaoService()._resolver_semestre(MagicMock(), 10, "invalido")
        assert exc.value.status_code == 422
        assert "padrão canônico da UnB" in exc.value.detail
        repos.turma.get_by_id.assert_not_called()

    def test_turma_inexistente_retorna_404(self, repos):
        repos.turma.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            DoacaoService()._resolver_semestre(MagicMock(), 999, None)
        assert exc.value.status_code == 404


class TestListarConsolidadas:
    def test_calcula_skip_e_limit_da_paginacao(self, repos):
        db = MagicMock()
        DoacaoService().listar_consolidadas(db, 1, 2, "2026.1", page=3, size=10)
        repos.estatistica.listar.assert_called_once_with(db, 1, 2, "2026.1", skip=20, limit=10)

    def test_primeira_pagina_tem_skip_zero(self, repos):
        db = MagicMock()
        DoacaoService().listar_consolidadas(db, None, None, None, page=1, size=20)
        repos.estatistica.listar.assert_called_once_with(db, None, None, None, skip=0, limit=20)

    def test_semestre_invalido_retorna_422(self, repos):
        with pytest.raises(HTTPException) as exc:
            DoacaoService().listar_consolidadas(MagicMock(), None, None, "2026-1", page=1, size=20)
        assert exc.value.status_code == 422
        repos.estatistica.listar.assert_not_called()


class TestGrupoDaOficial:
    def test_converte_as_quatro_taxas(self):
        g = DoacaoService._grupo_da_oficial(_oficial())
        assert isinstance(g, GrupoValores)
        assert (g.taxa_aprovacao, g.taxa_reprovacao_nota) == (Decimal("70.00"), Decimal("20.00"))
        assert (g.taxa_reprovacao_falta, g.taxa_trancamento) == (Decimal("5.00"), Decimal("5.00"))


class TestModeloEstatisticaConsolidada:
    def test_nome_da_tabela(self):
        assert EstatisticaConsolidada.__tablename__ == "estatisticas_consolidadas"

    def test_unica_por_turma_e_semestre(self):
        uniques = [c for c in EstatisticaConsolidada.__table__.constraints if isinstance(c, UniqueConstraint)]
        assert any(
            c.name == "uq_estatistica_turma_semestre"
            and {col.name for col in c.columns} == {"turma_id", "semestre_referencia"}
            for c in uniques
        )

    def test_checks_do_banco_existem(self):
        nomes = {c.name for c in EstatisticaConsolidada.__table__.constraints if isinstance(c, CheckConstraint)}
        assert {"chk_status_estatistica", "chk_estatistica_taxas_positivas", "chk_estatistica_soma_cem"} <= nomes

    def test_status_padrao_validado(self):
        assert EstatisticaConsolidada.__table__.c.status.default.arg == "VALIDADO"

    def test_sem_coluna_de_usuario(self):
        # RN01: a estatística oficial é agregada e anônima.
        assert "usuario_id" not in EstatisticaConsolidada.__table__.c


class TestSchemaEstatisticaConsolidada:
    def test_converte_decimal_do_orm_para_float(self):
        r = EstatisticaConsolidadaResponse.model_validate(_oficial())
        assert r.taxa_aprovacao == 70.0
        assert isinstance(r.taxa_aprovacao, float)
        assert r.status == "VALIDADO"

    def test_nao_expoe_usuario(self):
        assert "usuario_id" not in EstatisticaConsolidadaResponse.model_fields

    def test_campos_obrigatorios(self):
        with pytest.raises(Exception):
            EstatisticaConsolidadaResponse.model_validate(SimpleNamespace(id=1))