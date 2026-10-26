from decimal import Decimal
import pytest
from pydantic import ValidationError

from app.api.schemas.doacao import DoacaoCreate


class TestDoacaoCreateSchema:
    def test_doacao_valida_inteiros(self):
        doacao = DoacaoCreate(
            semestre_referencia="2026.1",
            taxa_aprovacao=70,
            taxa_reprovacao_nota=18,
            taxa_reprovacao_falta=7,
            taxa_trancamento=5,
        )
        assert doacao.semestre_referencia == "2026.1"
        assert doacao.taxa_aprovacao == Decimal("70.00")
        assert doacao.taxa_reprovacao_nota == Decimal("18.00")
        assert doacao.taxa_reprovacao_falta == Decimal("7.00")
        assert doacao.taxa_trancamento == Decimal("5.00")

    def test_doacao_valida_decimais_com_precisao(self):
        doacao = DoacaoCreate(
            semestre_referencia="  2025.2 ",
            taxa_aprovacao=72.41,
            taxa_reprovacao_nota=17.24,
            taxa_reprovacao_falta=6.90,
            taxa_trancamento=3.45,
        )
        assert doacao.semestre_referencia == "2025.2"
        assert (
            doacao.taxa_aprovacao
            + doacao.taxa_reprovacao_nota
            + doacao.taxa_reprovacao_falta
            + doacao.taxa_trancamento
        ) == Decimal("100.00")

    def test_semestre_formato_invalido(self):
        with pytest.raises(ValidationError) as exc:
            DoacaoCreate(
                semestre_referencia="2026/1",
                taxa_aprovacao=70,
                taxa_reprovacao_nota=20,
                taxa_reprovacao_falta=5,
                taxa_trancamento=5,
            )
        assert "O semestre deve seguir o padrão canônico da UnB" in str(exc.value)

    def test_semestre_periodo_invalido(self):
        with pytest.raises(ValidationError) as exc:
            DoacaoCreate(
                semestre_referencia="2026.5",
                taxa_aprovacao=70,
                taxa_reprovacao_nota=20,
                taxa_reprovacao_falta=5,
                taxa_trancamento=5,
            )
        assert "O semestre deve seguir o padrão canônico da UnB" in str(exc.value)

    def test_taxa_negativa_rejeitada(self):
        with pytest.raises(ValidationError) as exc:
            DoacaoCreate(
                semestre_referencia="2026.1",
                taxa_aprovacao=-5,
                taxa_reprovacao_nota=95,
                taxa_reprovacao_falta=5,
                taxa_trancamento=5,
            )
        assert "intervalo permitido entre 0% e 100%" in str(exc.value)

    def test_taxa_maior_que_cem_rejeitada(self):
        with pytest.raises(ValidationError) as exc:
            DoacaoCreate(
                semestre_referencia="2026.1",
                taxa_aprovacao=105,
                taxa_reprovacao_nota=0,
                taxa_reprovacao_falta=0,
                taxa_trancamento=0,
            )
        assert "intervalo permitido entre 0% e 100%" in str(exc.value)

    def test_soma_menor_que_cem_rejeitada(self):
        with pytest.raises(ValidationError) as exc:
            DoacaoCreate(
                semestre_referencia="2026.1",
                taxa_aprovacao=60,
                taxa_reprovacao_nota=20,
                taxa_reprovacao_falta=5,
                taxa_trancamento=5,
            )
        assert "A soma das taxas deve ser exatamente 100%" in str(exc.value)

    def test_soma_maior_que_cem_rejeitada(self):
        with pytest.raises(ValidationError) as exc:
            DoacaoCreate(
                semestre_referencia="2026.1",
                taxa_aprovacao=80,
                taxa_reprovacao_nota=20,
                taxa_reprovacao_falta=5,
                taxa_trancamento=5,
            )
        assert "A soma das taxas deve ser exatamente 100%" in str(exc.value)
