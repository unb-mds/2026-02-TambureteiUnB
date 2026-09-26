import pytest
from pydantic import ValidationError
from app.api.schemas.turma import TurmaCreate


class TestTurmaCreateSchema:
    def test_turma_valida(self):
        turma = TurmaCreate(
            disciplina_id=1,
            semestre="2026.1",
            codigo_turma="01",
            professores_ids=[1, 2],
        )
        assert turma.semestre == "2026.1"
        assert turma.codigo_turma == "01"
        assert turma.professores_ids == [1, 2]

    def test_semestre_formato_invalido(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="abc",
                codigo_turma="01",
                professores_ids=[1],
            )
        assert "O semestre deve seguir o padrão canônico da UnB" in str(exc.value)

    def test_semestre_periodo_invalido(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="2026.5",
                codigo_turma="01",
                professores_ids=[1],
            )
        assert "O semestre deve seguir o padrão canônico da UnB" in str(exc.value)

    def test_semestre_ano_incompleto(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="26.1",
                codigo_turma="01",
                professores_ids=[1],
            )
        assert "O semestre deve seguir o padrão canônico da UnB" in str(exc.value)

    def test_codigo_turma_vazio(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="2026.1",
                codigo_turma="",
                professores_ids=[1],
            )
        assert "O código da turma não pode ser vazio." in str(exc.value)

    def test_codigo_turma_remove_espacos_duplicados(self):
        turma = TurmaCreate(
            disciplina_id=1,
            semestre="2026.1",
            codigo_turma="  T   99  ",
            professores_ids=[1],
        )
        assert turma.codigo_turma == "T 99"

    def test_professores_ids_vazio(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="2026.1",
                codigo_turma="01",
                professores_ids=[],
            )
        assert "Informe ao menos um professor responsável pela turma." in str(exc.value)

    def test_professores_ids_com_valor_nao_positivo(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="2026.1",
                codigo_turma="01",
                professores_ids=[1, -2],
            )
        assert "Os IDs de professor devem ser números inteiros positivos." in str(exc.value)

    def test_professores_ids_zero(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="2026.1",
                codigo_turma="01",
                professores_ids=[0],
            )
        assert "Os IDs de professor devem ser números inteiros positivos." in str(exc.value)

    def test_professores_ids_duplicados(self):
        with pytest.raises(ValidationError) as exc:
            TurmaCreate(
                disciplina_id=1,
                semestre="2026.1",
                codigo_turma="01",
                professores_ids=[1, 1],
            )
        assert "A lista de professores não pode conter IDs repetidos." in str(exc.value)