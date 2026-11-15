import pytest

from app.models.curso import Curso
from app.models.metrica import MetricaCurso
from app.repositories.dashboard_repo import dashboard_repo


def test_root_retorna_status_online(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_obter_formacao_curso_inexistente_retorna_404(client, db):
    db.query(Curso).delete()
    db.commit()

    response = client.get("/dashboard/cursos/99999/formacao")
    assert response.status_code == 404
    assert response.json()["detail"] == "Curso não encontrado."


def test_obter_formacao_curso_slug_inexistente_retorna_404(client, db):
    db.query(Curso).delete()
    db.commit()

    response = client.get("/dashboard/cursos/curso-inexistente/formacao")
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


def test_obter_formacao_curso_por_slug_retorna_200(client, db):
    db.query(Curso).delete()
    curso = Curso(nome="Engenharia de Software", slug="engenharia-de-software")
    db.add(curso)
    db.flush()

    db.add(
        MetricaCurso(
            curso_id=curso.id,
            ano=2024,
            ingressantes=100,
            matriculados=480,
            concluintes=60,
            taxa_sucesso=60.0,
        )
    )
    db.commit()

    response = client.get("/dashboard/cursos/engenharia-de-software/formacao")
    assert response.status_code == 200
    data = response.json()
    assert data["curso_id"] == curso.id
    assert data["curso_slug"] == "engenharia-de-software"
    assert data["taxa_media_formacao"] == 60.0


@pytest.fixture()
def cenario_evasao(db):
    db.query(Curso).delete()
    software = Curso(nome="Engenharia de Software", slug="es-gama", campus="FCTE - Gama")
    energia = Curso(nome="Engenharia de Energia", slug="energia-gama", campus="FCTE - Gama")
    computacao = Curso(nome="Ciência da Computação", slug="cc-darcy", campus="Darcy Ribeiro")
    agronegocio = Curso(nome="Gestão do Agronegócio", slug="agro-fup", campus="FUP - Planaltina")
    db.add_all([software, energia, computacao, agronegocio])
    db.flush()

    db.add_all([
        MetricaCurso(curso_id=software.id, ano=2023, matriculados=400, desvinculados=40),
        MetricaCurso(curso_id=software.id, ano=2024, matriculados=500, desvinculados=75),
        MetricaCurso(curso_id=energia.id, ano=2024, matriculados=500, desvinculados=125),
        MetricaCurso(curso_id=computacao.id, ano=2024, matriculados=400, desvinculados=20),
    ])
    db.commit()
    dashboard_repo.atualizar_evasao_campus(db)


def test_listar_evasao_por_campus_retorna_comparativo_ordenado(client, cenario_evasao):
    response = client.get("/dashboard/campus/evasao")
    assert response.status_code == 200
    data = response.json()
    assert data["total_campi"] == 2
    assert [item["campus"] for item in data["campi"]] == ["FCTE - Gama", "Darcy Ribeiro"]

    gama = data["campi"][0]
    assert gama["matriculados"] == 1400
    assert gama["desvinculados"] == 240
    assert gama["taxa_evasao"] == 17.14
    assert gama["taxa_media_anual"] == 15.0

    darcy = data["campi"][1]
    assert darcy["taxa_evasao"] == 5.0
    assert darcy["taxa_media_anual"] == 5.0


def test_listar_evasao_por_campus_aplica_filtro(client, cenario_evasao):
    response = client.get("/dashboard/campus/evasao", params={"campus": "darcy"})
    assert response.status_code == 200
    data = response.json()
    assert data["total_campi"] == 1
    assert data["campi"][0]["campus"] == "Darcy Ribeiro"


def test_listar_evasao_por_campus_filtro_inexistente_retorna_404(client, cenario_evasao):
    response = client.get("/dashboard/campus/evasao", params={"campus": "Campus Inexistente"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Campus não encontrado."


def test_listar_evasao_por_campus_sem_metricas_retorna_lista_vazia(client, cenario_evasao):
    response = client.get("/dashboard/campus/evasao", params={"campus": "Planaltina"})
    assert response.status_code == 200
    assert response.json() == {"total_campi": 0, "campi": []}


def test_listar_evasao_por_campus_banco_vazio_retorna_lista_vazia(client, db):
    db.query(Curso).delete()
    db.commit()
    dashboard_repo.atualizar_evasao_campus(db)

    response = client.get("/dashboard/campus/evasao")
    assert response.status_code == 200
    assert response.json() == {"total_campi": 0, "campi": []}


def test_obter_evasao_campus_retorna_serie_historica(client, cenario_evasao):
    response = client.get("/dashboard/campus/Gama/evasao")
    assert response.status_code == 200
    data = response.json()
    assert data["campus"] == "FCTE - Gama"
    assert data["matriculados"] == 1400
    assert data["desvinculados"] == 240
    assert data["taxa_evasao"] == 17.14
    assert data["taxa_media_anual"] == 15.0
    assert [item["ano"] for item in data["serie_historica"]] == [2023, 2024]
    assert [item["total_cursos"] for item in data["serie_historica"]] == [1, 2]
    assert [item["taxa_evasao"] for item in data["serie_historica"]] == [10.0, 20.0]


def test_obter_evasao_campus_aceita_nome_completo(client, cenario_evasao):
    response = client.get("/dashboard/campus/FCTE - Gama/evasao")
    assert response.status_code == 200
    assert response.json()["campus"] == "FCTE - Gama"


def test_obter_evasao_campus_inexistente_retorna_404(client, cenario_evasao):
    response = client.get("/dashboard/campus/Inexistente/evasao")
    assert response.status_code == 404
    assert response.json()["detail"] == "Campus não encontrado."


def test_obter_evasao_campus_sem_metricas_retorna_404(client, cenario_evasao):
    response = client.get("/dashboard/campus/Planaltina/evasao")
    assert response.status_code == 404
    assert (
        response.json()["detail"]
        == "Campus não possui dados públicos suficientes para cálculo da taxa de evasão."
    )


def test_obter_evasao_campus_termo_ambiguo_retorna_400(client, cenario_evasao):
    response = client.get("/dashboard/campus/a/evasao")
    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Termo de campus ambíguo. Informe o nome completo do campus."
    )
