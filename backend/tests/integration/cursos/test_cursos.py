from app.models.curso import Curso
from app.models.metrica import MetricaCurso


def test_cursos_vazios_e_inexistentes(client, db):
    db.query(Curso).delete()
    assert client.get("/cursos").json() == []
    response = client.get("/cursos/inexistente")
    assert response.status_code == 404
    assert response.json()["detail"] == "Curso não encontrado."


def test_cursos_retornam_dados_persistidos(client, db):
    db.query(Curso).delete()
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


def test_curso_retorna_metadados_e_metricas_2024(client, db):
    db.query(Curso).delete()
    curso = Curso(
        nome="Engenharia de Software",
        slug="engenharia-de-software",
        codigo_mec="115999",
        modalidade="Presencial",
        area_geral="Ciências Exatas e Tecnológicas",
        area_especifica="Computação",
    )
    db.add(curso)
    db.flush()

    metrica_2024 = MetricaCurso(
        curso_id=curso.id,
        ano=2024,
        vagas_totais=120,
        inscritos_total=850,
        ingressantes=115,
        matriculados=480,
        concluintes=62,
        trancados=28,
        desvinculados=14,
    )
    db.add(metrica_2024)
    db.commit()

    detalhe = client.get("/cursos/engenharia-de-software")
    assert detalhe.status_code == 200
    data = detalhe.json()
    assert data["nome"] == "Engenharia de Software"
    assert data["codigo_mec"] == "115999"
    assert data["modalidade"] == "Presencial"
    assert data["area_geral"] == "Ciências Exatas e Tecnológicas"
    assert data["area_especifica"] == "Computação"
    assert data["metricas_2024"] is not None
    assert data["metricas_2024"]["vagas_totais"] == 120
    assert data["metricas_2024"]["inscritos_total"] == 850
    assert data["metricas_2024"]["ingressantes"] == 115
    assert data["metricas_2024"]["matriculados"] == 480
    assert data["metricas_2024"]["concluintes"] == 62
    assert data["metricas_2024"]["trancados"] == 28
    assert data["metricas_2024"]["desvinculados"] == 14

