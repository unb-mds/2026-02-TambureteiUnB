import pytest
from app.models.turma import Turma

class TestCriarTurma:
    def test_criar_turma_com_sucesso(self, client, admin_headers, disciplina, professor_1, professor_2):
        response = client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id, professor_2.id],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["codigo_turma"] == "T1"
        assert len(data["professores"]) == 2

    def test_criar_turma_disciplina_inexistente(self, client, admin_headers, professor_1):
        response = client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": 999999,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id],
            },
        )
        assert response.status_code == 404
        assert "Disciplina não encontrada" in response.json()["detail"]

    def test_criar_turma_professor_inexistente(self, client, admin_headers, disciplina, professor_1):
        response = client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id, 999999],
            },
        )
        assert response.status_code == 404
        assert "Professor" in response.json()["detail"]

    def test_criar_turma_duplicada(self, client, admin_headers, disciplina, professor_1):
        payload = {
            "disciplina_id": disciplina.id,
            "semestre": "2026.1",
            "codigo_turma": "T1",
            "professores_ids": [professor_1.id],
        }
        primeira = client.post("/turmas", headers=admin_headers, json=payload)
        assert primeira.status_code == 201

        segunda = client.post("/turmas", headers=admin_headers, json=payload)
        assert segunda.status_code == 409

    def test_criar_turma_sem_token(self, client, disciplina, professor_1):
        response = client.post(
            "/turmas",
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id],
            },
        )
        assert response.status_code == 401

    def test_criar_turma_sem_permissao_admin(self, client, student_headers, disciplina, professor_1):
        response = client.post(
            "/turmas",
            headers=student_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id],
            },
        )
        assert response.status_code == 403


class TestListarTurmas:
    def test_listar_turmas_da_disciplina(self, client, admin_headers, disciplina, professor_1):
        client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id],
            },
        )
        response = client.get(f"/turmas?disciplina_id={disciplina.id}")
        assert response.status_code == 200
        codigos = [t["codigo_turma"] for t in response.json()]
        assert "T1" in codigos

    def test_listar_turmas_disciplina_inexistente(self, client):
        response = client.get("/turmas?disciplina_id=999999")
        assert response.status_code == 404

    def test_turma_com_dois_professores_aparece_uma_vez(self, client, admin_headers, disciplina, professor_1, professor_2):
        client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id, professor_2.id],
            },
        )
        response = client.get(f"/turmas?disciplina_id={disciplina.id}")
        turmas_t1 = [t for t in response.json() if t["codigo_turma"] == "T1"]
        assert len(turmas_t1) == 1
        assert len(turmas_t1[0]["professores"]) == 2

    def test_listar_turmas_por_slug(self, client, admin_headers, disciplina, professor_1):
        client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T_SLUG",
                "professores_ids": [professor_1.id],
            },
        )
        response = client.get(f"/turmas?disciplina_slug={disciplina.slug}")
        assert response.status_code == 200
        codigos = [t["codigo_turma"] for t in response.json()]
        assert "T_SLUG" in codigos

    def test_listar_turmas_slug_inexistente(self, client):
        response = client.get("/turmas?disciplina_slug=slug-que-nao-existe")
        assert response.status_code == 404

    def test_listar_turmas_sem_parametros_retorna_400(self, client):
        response = client.get("/turmas")
        assert response.status_code == 400


class TestObterTurma:
    def test_obter_turma_existente(self, client, admin_headers, disciplina, professor_1):
        criada = client.post(
            "/turmas",
            headers=admin_headers,
            json={
                "disciplina_id": disciplina.id,
                "semestre": "2026.1",
                "codigo_turma": "T1",
                "professores_ids": [professor_1.id],
            },
        ).json()

        response = client.get(f"/turmas/{criada['id']}")
        assert response.status_code == 200
        assert response.json()["codigo_turma"] == "T1"

    def test_obter_turma_inexistente(self, client):
        response = client.get("/turmas/999999")
        assert response.status_code == 404

@pytest.mark.parametrize("capacidade,matriculados", [(45, 38), (45, 0), (None, None), (45, None), (None, 12), (0, 0), (30, 38)])
def test_ocupacao_persistida_na_listagem_e_detalhe(client, db, disciplina, professor_1, professor_2, capacidade, matriculados):
    turma = Turma(disciplina_id=disciplina.id, codigo_turma="OC", semestre="2026.1",
                  capacidade=capacidade, matriculados=matriculados, professores=[professor_1, professor_2])
    db.add(turma)
    db.commit()
    for consulta in (f"disciplina_id={disciplina.id}", f"disciplina_slug={disciplina.slug}"):
        resposta = client.get(f"/turmas?{consulta}")
        assert resposta.status_code == 200
        registros = [item for item in resposta.json() if item["id"] == turma.id]
        assert len(registros) == 1
        assert registros[0]["capacidade"] == capacidade
        assert registros[0]["matriculados"] == matriculados
        assert len(registros[0]["professores"]) == 2
    detalhe = client.get(f"/turmas/{turma.id}")
    assert detalhe.status_code == 200
    assert detalhe.json()["capacidade"] == capacidade
    assert detalhe.json()["matriculados"] == matriculados


def test_criacao_de_turma_nao_inventa_ocupacao(client, admin_headers, disciplina, professor_1):
    resposta = client.post("/turmas", headers=admin_headers, json={
        "disciplina_id": disciplina.id, "semestre": "2026.1", "codigo_turma": "NOVA", "professores_ids": [professor_1.id],
    })
    assert resposta.status_code == 201
    assert resposta.json()["capacidade"] is None
    assert resposta.json()["matriculados"] is None
