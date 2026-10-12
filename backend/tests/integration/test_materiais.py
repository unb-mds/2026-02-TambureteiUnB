from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from jose import jwt
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.security import ALGORITHM, SECRET_KEY, create_access_token
from app.models import Disciplina, Material
from app.repositories.material_repo import material_repo
from app.services.armazenamento_material import ArmazenamentoMaterial

PDF = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"


def upload(client, disciplina_id, headers, titulo="Resumo", content=PDF, nome="resumo.pdf", mime="application/pdf"):
    return client.post(
        f"/cadeiras/{disciplina_id}/materiais", headers=headers, data={"titulo": titulo},
        files={"arquivo": (nome, content, mime)},
    )


def test_upload_listagem_download_com_login_real(client, db, disciplina, usuario):
    login = client.post("/auth/login", json={"email": usuario.email, "senha": "SenhaDeTeste123!"})
    assert login.status_code == 200
    headers = {"Authorization": "Bearer " + login.json()["access_token"]}
    enviado = upload(client, disciplina.id, headers, titulo="  Resumo de cálculo  ")
    assert enviado.status_code == 201, enviado.text
    payload = enviado.json()
    assert payload["titulo"] == "Resumo de cálculo"
    assert payload["status_moderacao"] == "ativo"
    assert payload["tamanho_bytes"] == len(PDF)
    assert {"usuario_id", "caminho_arquivo", "email", "password_hash"}.isdisjoint(payload)
    material = db.get(Material, payload["id"])
    assert material.usuario_id == usuario.id
    assert not material.caminho_arquivo.startswith("/")
    assert (settings.MATERIALS_DIR / material.caminho_arquivo).read_bytes() == PDF
    lista = client.get(f"/cadeiras/{disciplina.id}/materiais")
    assert lista.status_code == 200
    assert lista.json()["items"][0]["id"] == material.id
    baixado = client.get(f"/materiais/{material.id}/download", headers=headers)
    assert baixado.status_code == 200
    assert baixado.content == PDF
    assert baixado.headers["content-type"] == "application/pdf"
    assert "attachment" in baixado.headers["content-disposition"]
    assert baixado.headers["x-content-type-options"] == "nosniff"
    assert baixado.headers["cache-control"] == "private, no-store"


@pytest.mark.parametrize("nome,mime,content", [
    ("foto.PNG", "image/png", b"\x89PNG\r\n\x1a\nconteudo"),
    ("foto.jpg", "image/jpeg", b"\xff\xd8\xffconteudo"),
    ("foto.jpeg", "image/jpeg", b"\xff\xd8\xffconteudo"),
])
def test_upload_imagens(client, disciplina, headers, nome, mime, content):
    response = upload(client, disciplina.id, headers, content=content, nome=nome, mime=mime)
    assert response.status_code == 201
    result = client.get(f"/materiais/{response.json()['id']}/download", headers=headers)
    assert result.content == content
    assert result.headers["content-type"] == mime


@pytest.mark.parametrize("token", [None, "invalido", "expirado", "sem_usuario"])
def test_upload_e_download_exigem_token_valido(client, disciplina, usuario, token):
    if token == "expirado":
        token = jwt.encode({"sub": usuario.email, "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}, SECRET_KEY, algorithm=ALGORITHM)
    elif token == "sem_usuario":
        token = create_access_token({"sub": "ausente@example.com"})
    headers = {} if token is None else {"Authorization": f"Bearer {token}"}
    assert upload(client, disciplina.id, headers).status_code == 401
    assert client.get("/materiais/1/download", headers=headers).status_code == 401


@pytest.mark.parametrize("role", ["ADMIN", "MODERATOR"])
def test_apenas_perfil_aluno(client, db, disciplina, usuario, headers, role):
    # Mesmo que o token contenha STUDENT, usa o perfil atual persistido no banco.
    usuario.role = role
    db.commit()
    assert upload(client, disciplina.id, headers).status_code == 403
    assert client.get("/materiais/1/download", headers=headers).status_code == 403


def test_conta_desativada_preserva_material_e_bloqueia_download(client, db, disciplina, usuario, headers):
    response = upload(client, disciplina.id, headers)
    material_id = response.json()["id"]
    assert client.delete("/auth/me", headers=headers).status_code == 200
    assert db.get(Material, material_id) is not None
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["total"] == 1
    assert client.get(f"/materiais/{material_id}/download", headers=headers).status_code == 401


@pytest.mark.parametrize("nome,mime,content,status", [
    ("resumo.txt", "text/plain", b"texto", 415),
    ("falso.pdf", "application/pdf", b"<html>arquivo</html>", 415),
    ("resumo.pdf", "image/png", PDF, 415),
    ("vazio.pdf", "application/pdf", b"", 400),
])
def test_rejeita_arquivos_invalidos_sem_residuos(client, db, disciplina, headers, nome, mime, content, status):
    response = upload(client, disciplina.id, headers, nome=nome, mime=mime, content=content)
    assert response.status_code == status
    assert db.scalar(select(func.count()).select_from(Material)) == 0
    assert not list(settings.MATERIALS_DIR.glob("*"))


def test_limite_de_5mib(client, db, disciplina, headers):
    tamanho = 5 * 1024 * 1024
    content = b"%PDF-" + b"x" * (tamanho - 5)
    assert upload(client, disciplina.id, headers, content=content).status_code == 201
    assert upload(client, disciplina.id, headers, content=content + b"x").status_code == 413
    assert db.scalar(select(func.count()).select_from(Material)) == 1
    assert len(list(settings.MATERIALS_DIR.iterdir())) == 1


@pytest.mark.parametrize("titulo", ["   ", "x" * 201])
def test_titulo_invalido(client, disciplina, headers, titulo):
    response = upload(client, disciplina.id, headers, titulo=titulo)
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "O título deve conter entre 1 e 200 caracteres."
    assert not list(settings.MATERIALS_DIR.glob("*"))


def test_cadeira_inexistente_e_lista_vazia(client, disciplina, headers):
    assert upload(client, 999999, headers).status_code == 404
    assert client.get("/cadeiras/999999/materiais").status_code == 404
    response = client.get(f"/cadeiras/{disciplina.id}/materiais")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "pagina": 1, "tamanho_pagina": 20}


def test_filtro_paginacao_e_moderacao(client, db, disciplina, headers):
    ids = []
    for titulo in ["Resumo A", "RESUMO B", "Outro", "100%_literal", "Resumo oculto"]:
        ids.append(upload(client, disciplina.id, headers, titulo=titulo).json()["id"])
    db.get(Material, ids[-1]).status_moderacao = "em_analise"
    outra = Disciplina(nome="Outra", slug="outra")
    db.add(outra)
    db.commit()
    upload(client, outra.id, headers, titulo="Resumo de outra cadeira")
    url = f"/cadeiras/{disciplina.id}/materiais"
    primeira = client.get(url, params={"titulo": "resumo", "tamanho_pagina": 1}).json()
    segunda = client.get(url, params={"titulo": "resumo", "tamanho_pagina": 1, "pagina": 2}).json()
    assert primeira["total"] == segunda["total"] == 2
    assert primeira["items"][0]["id"] == ids[1]
    assert segunda["items"][0]["id"] == ids[0]
    assert client.get(url, params={"titulo": "%_"}).json()["total"] == 1
    assert client.get(url, params={"pagina": 100}).json()["items"] == []


@pytest.mark.parametrize("parametros", [{"pagina": 0}, {"tamanho_pagina": 0}, {"tamanho_pagina": 101}, {"titulo": "x" * 201}])
def test_paginacao_invalida(client, disciplina, parametros):
    assert client.get(f"/cadeiras/{disciplina.id}/materiais", params=parametros).status_code == 422


@pytest.mark.parametrize("estado,esperado", [("em_analise", 403), ("bloqueado", 403), ("excluido", 404)])
def test_download_respeita_moderacao(client, db, disciplina, headers, estado, esperado):
    material_id = upload(client, disciplina.id, headers).json()["id"]
    db.get(Material, material_id).status_moderacao = estado
    db.commit()
    assert client.get(f"/materiais/{material_id}/download", headers=headers).status_code == esperado
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["items"] == []


def test_download_inexistente_arquivo_ausente_e_caminho_invalido(client, db, disciplina, headers):
    assert client.get("/materiais/999999/download", headers=headers).status_code == 404
    material_id = upload(client, disciplina.id, headers).json()["id"]
    material = db.get(Material, material_id)
    (settings.MATERIALS_DIR / material.caminho_arquivo).unlink()
    assert client.get(f"/materiais/{material_id}/download", headers=headers).status_code == 404
    material.caminho_arquivo = "../.env"
    db.commit()
    assert client.get(f"/materiais/{material_id}/download", headers=headers).status_code == 404


def test_nomes_iguais_nao_sobrescrevem(client, db, disciplina, headers):
    primeiro = upload(client, disciplina.id, headers, nome="../../resumo.pdf").json()["id"]
    segundo = upload(client, disciplina.id, headers, nome="../../resumo.pdf").json()["id"]
    assert db.get(Material, primeiro).caminho_arquivo != db.get(Material, segundo).caminho_arquivo
    assert len(list(settings.MATERIALS_DIR.iterdir())) == 2


def test_falha_de_banco_remove_arquivo(client, db, disciplina, headers):
    with patch.object(material_repo, "adicionar", side_effect=SQLAlchemyError("falha simulada")):
        assert upload(client, disciplina.id, headers).status_code == 503
    assert list(settings.MATERIALS_DIR.iterdir()) == []
    assert db.scalar(select(func.count()).select_from(Material)) == 0


def test_falha_de_commit_remove_arquivo(client, db, disciplina, headers):
    with patch.object(db, "commit", side_effect=SQLAlchemyError("falha simulada")):
        assert upload(client, disciplina.id, headers).status_code == 503
    assert list(settings.MATERIALS_DIR.iterdir()) == []
    assert db.scalar(select(func.count()).select_from(Material)) == 0


def test_falha_de_disco_nao_grava_metadados(client, db, disciplina, headers):
    with patch.object(ArmazenamentoMaterial, "salvar", side_effect=OSError("falha simulada")):
        assert upload(client, disciplina.id, headers).status_code == 503
    assert db.scalar(select(func.count()).select_from(Material)) == 0


def test_schema_openapi(client):
    schema = client.get("/api/v1/openapi.json").json()
    upload_schema = schema["paths"]["/cadeiras/{id}/materiais"]["post"]
    assert "multipart/form-data" in upload_schema["requestBody"]["content"]
    assert upload_schema["security"]
    assert schema["paths"]["/materiais/{id}/download"]["get"]["security"]
    assert "security" not in schema["paths"]["/cadeiras/{id}/materiais"]["get"]
