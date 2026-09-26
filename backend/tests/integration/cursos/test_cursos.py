from app.models.curso import Curso


def test_cursos_vazios_e_inexistentes(client):
    assert client.get("/cursos").json() == []
    response = client.get("/cursos/inexistente")
    assert response.status_code == 404
    assert response.json()["detail"] == "Curso não encontrado."


def test_cursos_retornam_dados_persistidos(client, db):
    db.add_all([
        Curso(nome="Software", slug="software"),
        Curso(nome="Aeroespacial", slug="aeroespacial", codigo_mec="42"),
    ])
    db.commit()
    response = client.get("/cursos")
    assert response.status_code == 200
    assert [curso["slug"] for curso in response.json()] == ["aeroespacial", "software"]
    detalhe = client.get("/cursos/software")
    assert detalhe.status_code == 200
    assert detalhe.json()["nome"] == "Software"
    assert detalhe.json()["codigo_mec"] is None
    assert detalhe.json()["modalidade"] is None
