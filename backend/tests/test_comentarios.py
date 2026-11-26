import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.comentario import Comentario


@pytest.fixture
def turma(db: Session, disciplina):
    from app.models.turma import Turma
    turma = Turma(disciplina_id=disciplina.id, codigo_turma="01", semestre="2026.1")
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return turma


@pytest.fixture
def comentario_do_aluno(db: Session, student_user, disciplina):
    c = Comentario(
        usuario_id=student_user.id,
        disciplina_id=disciplina.id,
        conteudo="Ótima disciplina",
        status_moderacao="PUBLICADO"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@pytest.fixture
def comentario_de_outro(db: Session, admin_user, disciplina):
    c = Comentario(
        usuario_id=admin_user.id,
        disciplina_id=disciplina.id,
        conteudo="Comentário de outro",
        status_moderacao="PUBLICADO"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


# --- US 5.1.1: CRIAÇÃO ---

def test_criar_comentario_disciplina_com_sucesso(client: TestClient, student_headers, disciplina):
    payload = {"disciplina_id": disciplina.id, "conteudo": "Gostei da disciplina"}
    response = client.post("/comentarios", json=payload, headers=student_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["conteudo"] == "Gostei da disciplina"
    assert data["status_moderacao"] == "PUBLICADO"
    assert data["disciplina_id"] == disciplina.id


def test_criar_comentario_com_dado_pessoal_rn01_retorna_422(client: TestClient, student_headers, disciplina):
    payload = {"disciplina_id": disciplina.id, "conteudo": "Meu email eh aluno.teste@unb.br"}
    response = client.post("/comentarios", json=payload, headers=student_headers)
    assert response.status_code == 422


def test_criar_comentario_sem_disciplina_retorna_422(client: TestClient, student_headers, turma):
    payload = {"turma_id": turma.id, "conteudo": "Gostei da turma"}
    response = client.post("/comentarios", json=payload, headers=student_headers)
    assert response.status_code == 422


def test_criar_comentario_conteudo_vazio_retorna_422(client: TestClient, student_headers, disciplina):
    payload = {"disciplina_id": disciplina.id, "conteudo": "   "}
    response = client.post("/comentarios", json=payload, headers=student_headers)
    assert response.status_code == 422
    assert "conteudo_vazio" in str(response.json())


def test_criar_comentario_disciplina_inexistente_retorna_404(client: TestClient, student_headers):
    payload = {"disciplina_id": 9999, "conteudo": "Teste"}
    response = client.post("/comentarios", json=payload, headers=student_headers)
    assert response.status_code == 404


def test_criar_comentario_sem_autenticacao_retorna_401(client: TestClient, disciplina):
    payload = {"disciplina_id": disciplina.id, "conteudo": "Teste"}
    response = client.post("/comentarios", json=payload)
    assert response.status_code == 401


# --- US 5.1.2: LISTAGEM ---

def test_listar_comentarios_ativos(client: TestClient, disciplina, comentario_do_aluno):
    response = client.get(f"/cadeiras/{disciplina.id}/comentarios")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == comentario_do_aluno.id
    assert "usuario_id" not in data["items"][0]


def test_comentario_oculto_nao_aparece(client: TestClient, db: Session, disciplina, comentario_do_aluno):
    comentario_do_aluno.status_moderacao = "OCULTO"
    db.commit()
    response = client.get(f"/cadeiras/{disciplina.id}/comentarios")
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_paginacao(client: TestClient, db: Session, student_user, disciplina):
    for i in range(15):
        db.add(Comentario(usuario_id=student_user.id, disciplina_id=disciplina.id, conteudo=f"Comentario {i}", status_moderacao="PUBLICADO"))
    db.commit()

    response = client.get(f"/cadeiras/{disciplina.id}/comentarios?page=1&size=10")
    data = response.json()
    assert len(data["items"]) == 10
    assert data["total"] == 15
    assert data["pages"] == 2


def test_cadeira_sem_comentarios_retorna_lista_vazia(client: TestClient, disciplina):
    response = client.get(f"/cadeiras/{disciplina.id}/comentarios")
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_disciplina_inexistente_retorna_404(client: TestClient):
    response = client.get("/cadeiras/9999/comentarios")
    assert response.status_code == 404


# --- US 5.1.3: EDIÇÃO E EXCLUSÃO ---

def test_editar_proprio_comentario(client: TestClient, student_headers, comentario_do_aluno):
    response = client.patch(f"/comentarios/{comentario_do_aluno.id}", json={"conteudo": "Editado"}, headers=student_headers)
    assert response.status_code == 200
    assert response.json()["conteudo"] == "Editado"
    assert response.json()["status_moderacao"] == "PUBLICADO"


def test_editar_comentario_de_outro_retorna_403(client: TestClient, student_headers, comentario_de_outro):
    response = client.patch(f"/comentarios/{comentario_de_outro.id}", json={"conteudo": "Editado"}, headers=student_headers)
    assert response.status_code == 403


def test_editar_conteudo_vazio_retorna_422(client: TestClient, student_headers, comentario_do_aluno):
    response = client.patch(f"/comentarios/{comentario_do_aluno.id}", json={"conteudo": ""}, headers=student_headers)
    assert response.status_code == 422


def test_excluir_proprio_comentario(client: TestClient, db: Session, student_headers, comentario_do_aluno):
    response = client.delete(f"/comentarios/{comentario_do_aluno.id}", headers=student_headers)
    assert response.status_code == 204
    assert db.query(Comentario).filter_by(id=comentario_do_aluno.id).first() is None


def test_excluir_comentario_de_outro_retorna_403(client: TestClient, student_headers, comentario_de_outro):
    response = client.delete(f"/comentarios/{comentario_de_outro.id}", headers=student_headers)
    assert response.status_code == 403


def test_editar_sem_autenticacao_retorna_401(client: TestClient, comentario_do_aluno):
    response = client.patch(f"/comentarios/{comentario_do_aluno.id}", json={"conteudo": "Editado"})
    assert response.status_code == 401


def test_excluir_sem_autenticacao_retorna_401(client: TestClient, comentario_do_aluno):
    response = client.delete(f"/comentarios/{comentario_do_aluno.id}")
    assert response.status_code == 401


# --- DIFICULDADES E TÓPICOS CRÍTICOS (SPRINT 8) ---

def test_criar_e_listar_alertas_dificuldade_por_slug(client: TestClient, db: Session, student_headers, disciplina):
    payload = {
        "autor_alias": "Estudante Anônimo",
        "topico_dificuldade": "[CRITICO] Integrais Múltiplas",
        "conteudo": "Tópico com cobrança intensa na segunda avaliação.",
    }
    post_resp = client.post(
        f"/cadeiras/{disciplina.slug}/comentarios",
        json=payload,
        headers=student_headers,
    )
    assert post_resp.status_code == 201
    created = post_resp.json()
    assert created["topico_dificuldade"] == "[CRITICO] Integrais Múltiplas"
    assert created["disciplina_id"] == disciplina.id
    assert created["status_moderacao"] == "PUBLICADO"

    list_resp = client.get(
        f"/cadeiras/{disciplina.slug}/comentarios?apenas_dificuldades=true&topico=Integrais"
    )
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["items"][0]["topico_dificuldade"] == "[CRITICO] Integrais Múltiplas"


def test_alternar_voto_comentario_persiste_e_desfaz_rn03(
    client: TestClient, student_headers, disciplina, comentario_do_aluno
):
    sem_login = client.post(f"/comentarios/{comentario_do_aluno.id}/voto")
    assert sem_login.status_code == 401

    voto_on = client.post(
        f"/comentarios/{comentario_do_aluno.id}/voto", headers=student_headers
    )
    assert voto_on.status_code == 200
    assert voto_on.json() == {
        "comentario_id": comentario_do_aluno.id,
        "upvotes": 1,
        "liked_by_me": True,
    }

    listagem = client.get(
        f"/cadeiras/{disciplina.id}/comentarios", headers=student_headers
    )
    assert listagem.status_code == 200
    assert listagem.json()["items"][0]["upvotes"] == 1
    assert listagem.json()["items"][0]["liked_by_me"] is True

    voto_off = client.post(
        f"/comentarios/{comentario_do_aluno.id}/voto", headers=student_headers
    )
    assert voto_off.status_code == 200
    assert voto_off.json() == {
        "comentario_id": comentario_do_aluno.id,
        "upvotes": 0,
        "liked_by_me": False,
    }


def test_criar_comentario_forca_nome_usuario_real_em_vez_de_alias_falso(
    client: TestClient, student_headers, student_user, disciplina
):
    payload = {
        "disciplina_id": disciplina.id,
        "autor_alias": "@estudante_fcte",
        "conteudo": "Tentativa de enviar alias falso pelo payload.",
    }
    response = client.post("/comentarios", json=payload, headers=student_headers)
    assert response.status_code == 201
    assert response.json()["autor_alias"] == student_user.nome


def test_criar_comentario_cadeira_sem_autenticacao_retorna_401(client: TestClient, disciplina):
    payload = {
        "autor_alias": "Hacker",
        "conteudo": "Tentativa de comentar sem estar autenticado.",
    }
    response = client.post(f"/cadeiras/{disciplina.slug}/comentarios", json=payload)
    assert response.status_code == 401


def test_consultar_status_comentario_exibe_recusa_ao_autor_e_bloqueia_terceiros(
    client: TestClient, db: Session, student_headers, admin_headers, comentario_do_aluno, comentario_de_outro
):
    comentario_do_aluno.status_moderacao = "OCULTO"
    comentario_do_aluno.motivo_moderacao = "[OFENSA_DIFAMACAO] Conteúdo ofensivo."
    comentario_do_aluno.moderado_por = "IA"
    comentario_do_aluno.confianca_ia = 0.95
    db.commit()

    resp_autor = client.get(f"/comentarios/{comentario_do_aluno.id}/status", headers=student_headers)
    assert resp_autor.status_code == 200
    assert resp_autor.json() == {
        "id": comentario_do_aluno.id,
        "status_moderacao": "OCULTO",
        "motivo_moderacao": "[OFENSA_DIFAMACAO] Conteúdo ofensivo.",
        "moderado_por": "IA",
        "confianca_ia": 0.95,
    }

    resp_terceiro = client.get(f"/comentarios/{comentario_de_outro.id}/status", headers=student_headers)
    assert resp_terceiro.status_code == 403

    resp_admin = client.get(f"/comentarios/{comentario_do_aluno.id}/status", headers=admin_headers)
    assert resp_admin.status_code == 200

    resp_anon = client.get(f"/comentarios/{comentario_do_aluno.id}/status")
    assert resp_anon.status_code == 401

    resp_inexistente = client.get("/comentarios/99999/status", headers=student_headers)
    assert resp_inexistente.status_code == 404


def test_criar_resposta_preserva_parent_id_e_valida_disciplina(
    client: TestClient, db: Session, student_headers, disciplina, comentario_do_aluno
):
    from app.models.disciplina import Disciplina

    resp_ok = client.post(
        "/comentarios",
        json={
            "disciplina_id": disciplina.id,
            "parent_id": comentario_do_aluno.id,
            "conteudo": "Concordo com a dica sobre as listas!",
        },
        headers=student_headers,
    )
    assert resp_ok.status_code == 201, resp_ok.text
    assert resp_ok.json()["parent_id"] == comentario_do_aluno.id

    resp_inexistente = client.post(
        "/comentarios",
        json={
            "disciplina_id": disciplina.id,
            "parent_id": 999999,
            "conteudo": "Resposta para comentario inexistente.",
        },
        headers=student_headers,
    )
    assert resp_inexistente.status_code == 404

    outra = Disciplina(slug="outra-disciplina-parent", nome="Outra Disciplina", codigo="OUT999", departamento="FCTE")
    db.add(outra)
    db.commit()
    db.refresh(outra)
    resp_outra = client.post(
        "/comentarios",
        json={
            "disciplina_id": outra.id,
            "parent_id": comentario_do_aluno.id,
            "conteudo": "Resposta cruzando disciplinas.",
        },
        headers=student_headers,
    )
    assert resp_outra.status_code == 422


def test_is_mine_editado_topico_dificuldade_e_exclusao_por_moderador(
    client: TestClient, db: Session, student_headers, admin_headers, disciplina
):
    criado = client.post(
        f"/cadeiras/{disciplina.slug}/comentarios",
        headers=student_headers,
        json={
            "autor_alias": "Estudante Anônimo",
            "topico_dificuldade": "[ALTO] Limites",
            "conteudo": "Limites exige muita prática de exercícios.",
        },
    )
    assert criado.status_code == 201, criado.text
    cid = criado.json()["id"]
    assert criado.json()["is_mine"] is True
    assert criado.json()["editado"] is False

    # Dono vê is_mine=True mesmo sendo anônimo; admin e visitante veem is_mine=False
    lista_dono = client.get(f"/cadeiras/{disciplina.id}/comentarios", headers=student_headers).json()["items"][0]
    assert lista_dono["is_mine"] is True
    assert lista_dono["editado"] is False
    assert "usuario_id" not in lista_dono

    lista_outro = client.get(f"/cadeiras/{disciplina.id}/comentarios", headers=admin_headers).json()["items"][0]
    assert lista_outro["is_mine"] is False

    lista_anon = client.get(f"/cadeiras/{disciplina.id}/comentarios").json()["items"][0]
    assert lista_anon["is_mine"] is False

    # Dono edita texto, tópico e severidade (3b) e recebe editado=True
    editado = client.patch(
        f"/comentarios/{cid}",
        headers=student_headers,
        json={
            "conteudo": "Derivadas e limites exigem revisar base algébrica.",
            "topico_dificuldade": "[CRITICO] Derivadas",
        },
    )
    assert editado.status_code == 200, editado.text
    assert editado.json()["topico_dificuldade"] == "[CRITICO] Derivadas"
    assert editado.json()["editado"] is True
    assert editado.json()["updated_at"] is not None

    # Admin/Moderador pode apagar comentário de terceiro diretamente
    remocao = client.delete(f"/comentarios/{cid}", headers=admin_headers)
    assert remocao.status_code == 204
    assert db.get(Comentario, cid) is None


def test_excluir_dificuldades_separa_discussoes_de_relatos_na_ementa(
    client: TestClient, student_headers, disciplina
):
    c_geral = client.post(
        "/comentarios",
        headers=student_headers,
        json={"disciplina_id": disciplina.id, "conteudo": "Comentário geral sobre a disciplina."},
    )
    assert c_geral.status_code == 201
    c_dif = client.post(
        "/comentarios",
        headers=student_headers,
        json={
            "disciplina_id": disciplina.id,
            "topico_dificuldade": "[CRITICO] Limites",
            "conteudo": "Relato específico de dificuldade na ementa.",
        },
    )
    assert c_dif.status_code == 201

    apenas_discussoes = client.get(
        f"/cadeiras/{disciplina.id}/comentarios?excluir_dificuldades=true"
    ).json()
    assert apenas_discussoes["total"] == 1
    assert apenas_discussoes["items"][0]["id"] == c_geral.json()["id"]

    apenas_dificuldades = client.get(
        f"/cadeiras/{disciplina.id}/comentarios?apenas_dificuldades=true"
    ).json()
    assert apenas_dificuldades["total"] == 1
    assert apenas_dificuldades["items"][0]["id"] == c_dif.json()["id"]
