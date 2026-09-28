from app.models.curso import Curso, CursoDisciplina
from app.models.disciplina import Disciplina
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


def test_curso_resumo_retorna_metricas_e_total_disciplinas(client, db):
    db.query(Curso).delete()
    db.query(Disciplina).delete()

    curso = Curso(
        nome="Engenharia de Software",
        slug="engenharia-de-software",
        campus="FGA",
        grau="Bacharelado",
        turno="Diurno",
    )
    db.add(curso)
    db.flush()

    d1 = Disciplina(codigo="FGA0158", slug="requisitos", nome="Requisitos de Software", creditos=4)
    d2 = Disciplina(codigo="FGA0138", slug="mds", nome="Métodos de Desenvolvimento de Software", creditos=4)
    db.add_all([d1, d2])
    db.flush()

    db.add_all([
        CursoDisciplina(curso_id=curso.id, disciplina_id=d1.id, periodo_sugerido=3, is_obrigatoria=True),
        CursoDisciplina(curso_id=curso.id, disciplina_id=d2.id, periodo_sugerido=4, is_obrigatoria=True),
    ])

    metrica = MetricaCurso(
        curso_id=curso.id,
        ano=2024,
        vagas_totais=120,
        inscritos_total=890,
        ingressantes=118,
        matriculados=485,
        concluintes=58,
        trancados=24,
        desvinculados=12,
        taxa_sucesso=49.15,
        taxa_evasao=2.47,
    )
    db.add(metrica)
    db.commit()

    response = client.get("/cursos")
    assert response.status_code == 200
    cursos = response.json()
    assert len(cursos) == 1
    c = cursos[0]
    assert c["nome"] == "Engenharia de Software"
    assert c["total_disciplinas"] == 2
    assert c["metricas_2024"] is not None
    assert c["metricas_2024"]["matriculados"] == 485
    assert c["metricas_2024"]["taxa_sucesso"] == 49.15
    assert c["metricas_2024"]["taxa_evasao"] == 2.47


