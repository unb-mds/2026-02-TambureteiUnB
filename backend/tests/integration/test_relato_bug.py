import pytest

PAYLOAD = {
    "titulo": "Falha ao baixar grade",
    "descricao": "Ao clicar em baixar, o arquivo não é gerado.",
    "pagina": "/minha-grade",
}


def test_relato_enviado_listado_e_resolvido(client, student_headers, admin_headers):
    assert client.get("/moderacao/bugs", headers=admin_headers).json()["total"] == 0
    response = client.post("/relatos-bugs", headers=student_headers, json=PAYLOAD)
    assert response.status_code == 201
    item = response.json()
    assert item["status"] == "PENDENTE"
    assert item["pagina"] == "/minha-grade"
    assert "usuario_id" not in item
    queue = client.get("/moderacao/bugs", headers=admin_headers).json()
    assert queue["total"] == 1
    assert queue["items"][0]["descricao"] == PAYLOAD["descricao"]
    url = f"/moderacao/bugs/{item['id']}"
    assert client.patch(url, headers=student_headers, json={"status": "RESOLVIDO"}).status_code == 403
    result = client.patch(
        url, headers=admin_headers, json={"status": "RESOLVIDO", "justificativa": "Correção validada."}
    )
    assert result.status_code == 200
    assert result.json()["resolvido_em"] is not None
    assert client.patch(url, headers=admin_headers, json={"status": "DESCARTADO"}).status_code == 409
    assert client.get("/moderacao/bugs", headers=admin_headers).json()["total"] == 0
    assert (
        client.patch("/moderacao/bugs/99999999", headers=admin_headers, json={"status": "RESOLVIDO"}).status_code == 404
    )


def test_permissoes_relato(client, student_headers):
    assert client.post("/relatos-bugs", json=PAYLOAD).status_code == 401
    assert client.get("/moderacao/bugs", headers=student_headers).status_code == 403
    assert client.get("/moderacao/bugs").status_code == 401


@pytest.mark.parametrize(
    "field,value",
    [("titulo", "  "), ("descricao", "curto"), ("pagina", "https://site.com"), ("pagina", "/perfil?token=segredo")],
)
def test_relato_invalido(client, student_headers, field, value):
    assert client.post("/relatos-bugs", headers=student_headers, json={**PAYLOAD, field: value}).status_code == 422


def test_paginacao_e_descarte(client, student_headers, admin_headers):
    for index in range(3):
        assert (
            client.post(
                "/relatos-bugs", headers=student_headers, json={**PAYLOAD, "titulo": f"Problema numero {index}"}
            ).status_code
            == 201
        )
    response = client.get("/moderacao/bugs?pagina=2&tamanho_pagina=2", headers=admin_headers).json()
    assert response["total"] == 3
    assert len(response["items"]) == 1
    item = response["items"][0]
    result = client.patch(
        f"/moderacao/bugs/{item['id']}",
        headers=admin_headers,
        json={"status": "DESCARTADO", "justificativa": "Relato duplicado."},
    )
    assert result.status_code == 200
    assert result.json()["justificativa"] == "Relato duplicado."
    assert client.get("/moderacao/bugs?pagina=0", headers=admin_headers).status_code == 422
