from app.models.curso import Curso
from app.models.metrica import MetricaCurso


def test_obter_formacao_curso_inexistente_retorna_404(client, db):
    db.query(Curso).delete()
    db.commit()

    response = client.get("/dashboard/cursos/99999/formacao")
    assert response.status_code == 404
    assert response.json()["detail"] == "Curso não encontrado."


def test_obter_formacao_curso_sem_dados_suficientes_retorna_404(client, db):
    db.query(Curso).delete()
    curso = Curso(nome="Engenharia de Software", slug="engenharia-de-software")
    db.add(curso)
    db.commit()

    response = client.get(f"/dashboard/cursos/{curso.id}/formacao")
    assert response.status_code == 404
    assert (
        response.json()["detail"]
        == "Curso não possui dados públicos suficientes para cálculo da taxa de formação."
    )


def test_obter_formacao_curso_lista_cronologica_e_taxa_media(client, db):
    db.query(Curso).delete()
    curso = Curso(nome="Engenharia de Software", slug="engenharia-de-software")
    db.add(curso)
    db.flush()

    db.add_all([
        MetricaCurso(
            curso_id=curso.id,
            ano=2024,
            ingressantes=100,
            matriculados=480,
            concluintes=60,
            taxa_sucesso=60.0,
        ),
        MetricaCurso(
            curso_id=curso.id,
            ano=2022,
            ingressantes=100,
            matriculados=420,
            concluintes=40,
            taxa_sucesso=None,
        ),
        MetricaCurso(
            curso_id=curso.id,
            ano=2023,
            ingressantes=100,
            matriculados=450,
            concluintes=50,
            taxa_sucesso=50.0,
        ),
    ])
    db.commit()

    response = client.get(f"/dashboard/cursos/{curso.id}/formacao")
    assert response.status_code == 200
    data = response.json()
    assert data["curso_id"] == curso.id
    assert data["curso_nome"] == "Engenharia de Software"
    assert data["curso_slug"] == "engenharia-de-software"
    assert data["taxa_media_formacao"] == 50.0
    assert [item["ano"] for item in data["serie_historica"]] == [2022, 2023, 2024]
    assert [item["taxa_formacao"] for item in data["serie_historica"]] == [40.0, 50.0, 60.0]
