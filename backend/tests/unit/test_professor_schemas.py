import pytest
from pydantic import ValidationError
from app.api.schemas.professor import ProfessorResumo, ProfessorDetalhe, TurmaDoProfessor, DisciplinaNaTurma


class TestProfessorResumoSchema:
    def test_professor_resumo_valido(self):
        professor = ProfessorResumo(id=1, nome="Carla Rocha", departamento="FGA/FCTE")
        assert professor.nome == "Carla Rocha"

    def test_professor_resumo_sem_departamento(self):
        professor = ProfessorResumo(id=1, nome="Carla Rocha")
        assert professor.departamento is None

    def test_professor_resumo_sem_nome_falha(self):
        with pytest.raises(ValidationError):
            ProfessorResumo(id=1)


class TestProfessorDetalheSchema:
    def test_professor_detalhe_com_turmas(self):
        disciplina = DisciplinaNaTurma(id=1, codigo="FGA0168", nome="MDS", slug="mds")
        turma = TurmaDoProfessor(id=1, codigo_turma="01", semestre="2026.1", disciplina=disciplina)
        professor = ProfessorDetalhe(id=1, nome="Carla Rocha", turmas=[turma])
        assert len(professor.turmas) == 1
        assert professor.turmas[0].disciplina.nome == "MDS"

    def test_professor_detalhe_sem_turmas(self):
        professor = ProfessorDetalhe(id=1, nome="Carla Rocha")
        assert professor.turmas == []