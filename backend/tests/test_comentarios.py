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
    assert response.status_code == 200
    data = response.json()
    assert data["conteudo"] == "Gostei da disciplina"
    assert data["status_moderacao"] == "PUBLICADO"
    assert data["disciplina_id"] == disciplina.id


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
