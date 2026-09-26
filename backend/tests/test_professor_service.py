class TestListarProfessores:
    def test_listar_professores(self, client, professor_1, professor_2):
        response = client.get("/professores")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2
        assert "items" in data

    def test_buscar_professor_por_nome(self, client, professor_1):
        response = client.get(f"/professores?nome={professor_1.nome}")
        assert response.status_code == 200
        nomes = [p["nome"] for p in response.json()["items"]]
        assert professor_1.nome in nomes

    def test_buscar_professor_sem_resultado(self, client):
        response = client.get("/professores?nome=zzzznaoexiste")
        assert response.status_code == 200
        assert response.json()["items"] == []
        assert response.json()["total"] == 0

    def test_paginacao_parametros_invalidos(self, client):
        assert client.get("/professores?page=0").status_code == 422
        assert client.get("/professores?size=0").status_code == 422
        assert client.get("/professores?size=101").status_code == 422


class TestObterProfessor:
    def test_obter_professor_com_turmas(self, client, admin_headers, disciplina, professor_1):
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
        response = client.get(f"/professores/{professor_1.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["turmas"]) == 1
        assert data["turmas"][0]["disciplina"]["id"] == disciplina.id

    def test_obter_professor_sem_turmas(self, client, professor_2):
        response = client.get(f"/professores/{professor_2.id}")
        assert response.status_code == 200
        assert response.json()["turmas"] == []

    def test_obter_professor_inexistente(self, client):
        response = client.get("/professores/999999")
        assert response.status_code == 404