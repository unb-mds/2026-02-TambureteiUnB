import pytest

from app.domain.dashboard import calcular_media, calcular_taxa_evasao


class TestCalcularTaxaEvasao:
    def test_aplica_formula_rn08(self):
        assert calcular_taxa_evasao(desvinculados=75, matriculados=500) == 15.0

    def test_arredonda_em_duas_casas(self):
        assert calcular_taxa_evasao(desvinculados=1, matriculados=3) == 33.33

    def test_sem_desvinculados_retorna_zero(self):
        assert calcular_taxa_evasao(desvinculados=0, matriculados=200) == 0.0

    def test_sem_matriculados_retorna_none(self):
        assert calcular_taxa_evasao(desvinculados=0, matriculados=0) is None

    def test_um_matriculado_e_calculado(self):
        assert calcular_taxa_evasao(desvinculados=1, matriculados=1) == 100.0

    def test_desvinculados_negativos_lancam_erro(self):
        with pytest.raises(ValueError, match="não podem ser negativas"):
            calcular_taxa_evasao(desvinculados=-1, matriculados=100)

    def test_matriculados_negativos_lancam_erro(self):
        with pytest.raises(ValueError, match="não podem ser negativas"):
            calcular_taxa_evasao(desvinculados=10, matriculados=-1)


class TestCalcularMedia:
    def test_media_simples(self):
        assert calcular_media([10.0, 20.0]) == 15.0

    def test_media_arredondada(self):
        assert calcular_media([1.0, 2.0, 2.0]) == 1.67

    def test_lista_com_um_valor(self):
        assert calcular_media([12.5]) == 12.5

    def test_lista_vazia_retorna_none(self):
        assert calcular_media([]) is None
