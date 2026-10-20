import pytest
from app.models.turma import Turma


@pytest.fixture()
def turma_ativa(db, disciplina, professor_1):
    turma = Turma(
        disciplina_id=disciplina.id,
        semestre="2026.1",
        codigo_turma="01",
        horario="35M12",
        local="UED - Sala 102",
        professores=[professor_1],
    )
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return turma


class TestDoacaoEstatisticaEndpoint:
    def test_criar_doacao_com_sucesso(self, client, student_headers, student_user, turma_ativa):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": 72.5,
            "taxa_reprovacao_nota": 17.5,
            "taxa_reprovacao_falta": 6.0,
            "taxa_trancamento": 4.0,
        }
        response = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            headers=student_headers,
            json=payload,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["turma_id"] == turma_ativa.id
        assert data["usuario_id"] == str(student_user.id)
        assert data["semestre_referencia"] == "2026.1"
        assert data["taxa_aprovacao"] == 72.5
        assert data["taxa_reprovacao_nota"] == 17.5
        assert data["taxa_reprovacao_falta"] == 6.0
        assert data["taxa_trancamento"] == 4.0
        assert data["status"] == "PENDENTE"
        assert "created_at" in data

    def test_criar_doacao_turma_inexistente(self, client, student_headers):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": 70.0,
            "taxa_reprovacao_nota": 20.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
        }
        response = client.post(
            "/turmas/999999/doacoes",
            headers=student_headers,
            json=payload,
        )
        assert response.status_code == 404
        assert "Turma não encontrada" in response.json()["detail"]

    def test_criar_doacao_duplicada_mesmo_usuario_turma_semestre(
        self, client, student_headers, turma_ativa
    ):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": 75.0,
            "taxa_reprovacao_nota": 15.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
        }
        primeira = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            headers=student_headers,
            json=payload,
        )
        assert primeira.status_code == 201

        segunda = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            headers=student_headers,
            json=payload,
        )
        assert segunda.status_code == 409
        assert "já realizou uma doação" in segunda.json()["detail"]

    def test_criar_doacao_soma_diferente_de_cem(self, client, student_headers, turma_ativa):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": 50.0,
            "taxa_reprovacao_nota": 20.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
        }
        response = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            headers=student_headers,
            json=payload,
        )
        assert response.status_code == 422

    def test_criar_doacao_taxa_fora_do_intervalo(self, client, student_headers, turma_ativa):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": -10.0,
            "taxa_reprovacao_nota": 100.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
        }
        response = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            headers=student_headers,
            json=payload,
        )
        assert response.status_code == 422

    def test_criar_doacao_sem_autenticacao(self, client, turma_ativa):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": 70.0,
            "taxa_reprovacao_nota": 20.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
        }
        response = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            json=payload,
        )
        assert response.status_code == 401

    def test_criar_doacao_bloqueado_para_perfil_admin(
        self, client, admin_headers, turma_ativa
    ):
        payload = {
            "semestre_referencia": "2026.1",
            "taxa_aprovacao": 70.0,
            "taxa_reprovacao_nota": 20.0,
            "taxa_reprovacao_falta": 5.0,
            "taxa_trancamento": 5.0,
        }
        response = client.post(
            f"/turmas/{turma_ativa.id}/doacoes",
            headers=admin_headers,
            json=payload,
        )
        assert response.status_code == 403
        assert "STUDENT" in response.json()["detail"]
