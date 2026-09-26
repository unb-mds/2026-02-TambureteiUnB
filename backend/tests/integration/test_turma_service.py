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