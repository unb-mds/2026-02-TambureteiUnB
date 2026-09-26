from urllib import response
from xmlrpc import client

from app.models.disciplina import Disciplina


def _criar_disciplina(db, codigo, slug, nome, departamento):
    d = Disciplina(codigo=codigo, slug=slug, nome=nome, departamento=departamento)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


class TestCatalogoCadeiras:
    def test_listar_catalogo_sem_filtro(self, client, db):
        _criar_disciplina(db, "FGA0001", "disc-a-teste", "Disciplina A Teste", "FGA/FCTE")
        _criar_disciplina(db, "MAT0001", "disc-b-teste", "Disciplina B Teste", "MAT")

        response = client.get("/catalogo/cadeiras")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2
        assert "items" in data

    def test_filtro_por_nome(self, client, db):
        _criar_disciplina(db, "FGA0002", "calculo-2-teste", "Cálculo 2 Teste", "MAT")
        _criar_disciplina(db, "FGA0003", "fisica-1-teste", "Física 1 Teste", "FIS")

        response = client.get("/catalogo/cadeiras?nome=Cálculo")
        assert response.status_code == 200
        nomes = [d["nome"] for d in response.json()["items"]]
        assert "Cálculo 2 Teste" in nomes
        assert "Física 1 Teste" not in nomes

    def test_filtro_por_nome_case_insensitive(self, client, db):
        _criar_disciplina(db, "FGA0004", "quimica-teste", "Química Geral Teste", "QUI")

        response = client.get("/catalogo/cadeiras?nome=QUÍMICA")
        assert response.status_code == 200
        nomes = [d["nome"] for d in response.json()["items"]]
        assert "Química Geral Teste" in nomes

    def test_filtro_por_codigo(self, client, db):
        _criar_disciplina(db, "XYZ0099", "materia-codigo-teste", "Matéria Código Teste", "XYZ")

        response = client.get("/catalogo/cadeiras?codigo=XYZ0099")
        assert response.status_code == 200
        codigos = [d["codigo"] for d in response.json()["items"]]
        assert "XYZ0099" in codigos

    def test_filtro_por_departamento(self, client, db):
        _criar_disciplina(db, "DEP0001", "materia-dep-teste", "Matéria Dep Teste", "DEPTESTE")

        response = client.get("/catalogo/cadeiras?departamento=DEPTESTE")
        assert response.status_code == 200
        deps = [d["departamento"] for d in response.json()["items"]]
        assert "DEPTESTE" in deps

    def test_busca_sem_resultado(self, client):
        response = client.get("/catalogo/cadeiras?nome=zzzznaoexiste")
        assert response.status_code == 200
        assert response.json()["items"] == []
        assert response.json()["total"] == 0
        assert response.json()["pages"] == 0

    def test_paginacao(self, client, db):
        for i in range(3):
            _criar_disciplina(db, f"PAG000{i}", f"disc-pag-{i}-teste", f"Disciplina Pag {i} Teste", "PAG")

        response = client.get("/catalogo/cadeiras?departamento=PAG&size=1&page=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 3
        assert data["pages"] == 3

    def test_pagina_alem_do_fim(self, client):
        response = client.get("/catalogo/cadeiras?page=999")
        assert response.status_code == 200
        assert response.json()["items"] == []

    def test_parametros_invalidos(self, client):
        assert client.get("/catalogo/cadeiras?page=0").status_code == 422
        assert client.get("/catalogo/cadeiras?size=0").status_code == 422
        assert client.get("/catalogo/cadeiras?size=101").status_code == 422