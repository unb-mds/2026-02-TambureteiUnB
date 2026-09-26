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

    def test_obter_disciplina_com_requisitos_e_natureza_cursos(self, client, db):
        from app.models.curso import Curso, CursoDisciplina

        req = Disciplina(
            codigo="TEST0025",
            slug="calculo-1-req",
            nome="Cálculo 1 Teste",
            departamento="MAT",
            creditos=6,
        )
        eq = Disciplina(
            codigo="TEST0053",
            slug="calculo-1-eq",
            nome="Cálculo 1 Equiv Teste",
            departamento="MAT",
            creditos=6,
        )
        disc = Disciplina(
            codigo="TEST0026",
            slug="calculo-2-hub",
            nome="Cálculo 2 Teste",
            departamento="MAT",
            creditos=6,
            carga_horaria=90,
            ementa="Integrais múltiplas e séries.",
            pre_requisitos="( ( TEST0025 ) )",
            equivalencias="( ( TEST0053 ) )",
        )
        curso = Curso(
            nome="Engenharia de Software",
            slug="eng-software-teste",
            campus="FCTE - Gama",
        )
        db.add_all([req, eq, disc, curso])
        db.commit()

        cd = CursoDisciplina(
            curso_id=curso.id,
            disciplina_id=disc.id,
            periodo_sugerido=2,
            is_obrigatoria=True,
            natureza="Obrigatoria",
        )
        db.add(cd)
        db.commit()

        resp = client.get("/cadeiras/calculo-2-hub")
        assert resp.status_code == 200
        data = resp.json()

        assert data["codigo"] == "TEST0026"
        assert data["nome"] == "Cálculo 2 Teste"
        assert data["ementa"] == "Integrais múltiplas e séries."
        assert data["pre_requisitos"] == "( ( TEST0025 ) )"
        assert len(data["pre_requisitos_itens"]) == 1
        assert data["pre_requisitos_itens"][0]["codigo"] == "TEST0025"
        assert data["pre_requisitos_itens"][0]["slug"] == "calculo-1-req"
        assert data["pre_requisitos_itens"][0]["nome"] == "Cálculo 1 Teste"

        assert len(data["equivalencias_itens"]) == 1
        assert data["equivalencias_itens"][0]["codigo"] == "TEST0053"
        assert data["equivalencias_itens"][0]["slug"] == "calculo-1-eq"

        assert len(data["cursos"]) == 1
        assert data["cursos"][0]["curso_slug"] == "eng-software-teste"
        assert data["cursos"][0]["natureza"] == "Obrigatoria"
        assert data["cursos"][0]["periodo_sugerido"] == 2
        assert data["cursos"][0]["is_obrigatoria"] is True

    def test_obter_disciplina_404(self, client):
        resp = client.get("/cadeiras/slug-totalmente-inexistente")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Disciplina não encontrada"

    def test_disciplina_service_obter_por_slug_direto(self, db):
        import pytest
        from fastapi import HTTPException
        from app.services.disciplina_service import disciplina_service

        _criar_disciplina(db, "SERV0001", "slug-serv-teste", "Disciplina Service Teste", "FCTE")
        res = disciplina_service.obter_por_slug(db, "slug-serv-teste")
        assert res.codigo == "SERV0001"
        assert res.nome == "Disciplina Service Teste"
        assert res.pre_requisitos_itens == []
        assert res.equivalencias_itens == []

        with pytest.raises(HTTPException) as exc_info:
            disciplina_service.obter_por_slug(db, "inexistente-1234")
        assert exc_info.value.status_code == 404

    def test_disciplina_service_listar_direto(self, db):
        from app.services.disciplina_service import disciplina_service

        _criar_disciplina(db, "SERV0002", "slug-serv-2", "Matéria Busca Service", "CIC")
        items = disciplina_service.listar(db, nome="Busca Service")
        assert len(items) >= 1
        assert any(d.codigo == "SERV0002" for d in items)