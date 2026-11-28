from app.core.config import settings
from app.models import Conteudo

PDF = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"
PDF_NOVO = b"%PDF-1.7\n1 0 obj\n<< /Novo true >>\nendobj\n%%EOF\n"


def _upload(client, disciplina_id, headers, titulo="Prova 1", content=PDF, nome="p1.pdf", mime="application/pdf"):
    return client.post(
        f"/cadeiras/{disciplina_id}/materiais",
        headers=headers,
        data={"titulo": titulo, "tipo": "PROVA_ANTIGA"},
        files={"arquivo": (nome, content, mime)},
    )


def test_aprovacao_gera_notificacao_e_permite_marcar_como_lida(client, disciplina, headers, admin_headers):
    enviado = _upload(client, disciplina.id, headers, titulo="Resumo Aprovado")
    assert enviado.status_code == 201
    material_id = enviado.json()["id"]

    decisao = client.patch(
        f"/moderacao/conteudos/{material_id}/curadoria",
        headers=admin_headers,
        json={"status": "APROVADO"},
    )
    assert decisao.status_code == 200

    res = client.get("/notificacoes", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["nao_lidas"] == 1
    assert len(body["items"]) == 1
    notif = body["items"][0]
    assert notif["tipo"] == "MATERIAL_APROVADO"
    assert "Resumo Aprovado" in notif["mensagem"]
    assert notif["lida"] is False

    lida = client.patch(f"/notificacoes/{notif['id']}/lida", headers=headers)
    assert lida.status_code == 200
    assert lida.json()["lida"] is True

    # Outro usuário não pode marcar notificação alheia
    assert client.patch(f"/notificacoes/{notif['id']}/lida", headers=admin_headers).status_code == 404

    res_after = client.get("/notificacoes", headers=headers)
    assert res_after.json()["nao_lidas"] == 0


def test_recusa_sem_excluir_arquivo_mantem_disco_notifica_e_permite_editar_reenviar(
    client, db, disciplina, headers, admin_headers
):
    enviado = _upload(client, disciplina.id, headers, titulo="WhatsApp Image 123")
    assert enviado.status_code == 201
    material_id = enviado.json()["id"]
    material_db = db.get(Conteudo, material_id)
    chave_original = material_db.caminho_arquivo
    assert (settings.MATERIALS_DIR / chave_original).exists()

    recusa = client.patch(
        f"/moderacao/conteudos/{material_id}/curadoria",
        headers=admin_headers,
        json={
            "status": "RECUSADO",
            "justificativa": "Coloque um título descritivo para a prova.",
            "excluir_arquivo": False,
        },
    )
    assert recusa.status_code == 200
    assert (settings.MATERIALS_DIR / chave_original).exists()

    notifs = client.get("/notificacoes", headers=headers).json()
    assert notifs["nao_lidas"] == 1
    assert notifs["items"][0]["tipo"] == "MATERIAL_RECUSADO"
    assert "editar e reenviar" in notifs["items"][0]["mensagem"]

    meus = client.get("/materiais/meus", headers=headers).json()
    meu = next(item for item in meus if item["id"] == material_id)
    assert meu["status_curadoria"] == "RECUSADO"
    assert meu["arquivo_disponivel"] is True

    # Outro usuário não pode reenviar
    outro = client.post(
        f"/materiais/{material_id}/reenviar",
        headers=admin_headers,
        data={"titulo": "Tentativa indevida"},
    )
    assert outro.status_code == 403

    # Autor edita título e reenvia mantendo o mesmo arquivo
    reenvio = client.post(
        f"/materiais/{material_id}/reenviar",
        headers=headers,
        data={"titulo": "Prova 1 2026.2", "tipo": "PROVA_ANTIGA"},
    )
    assert reenvio.status_code == 200, reenvio.text
    assert reenvio.json()["status_curadoria"] == "PENDENTE"
    assert reenvio.json()["titulo"] == "Prova 1 2026.2"

    # Volta para a fila de moderação e pode ser aprovado novamente
    fila = client.get("/moderacao/materiais", headers=admin_headers).json()
    assert any(item["id"] == material_id for item in fila["items"])

    aprovado = client.patch(
        f"/moderacao/conteudos/{material_id}/curadoria",
        headers=admin_headers,
        json={"status": "APROVADO"},
    )
    assert aprovado.status_code == 200

    # Marcar todas como lidas
    marcar_todas = client.post("/notificacoes/ler-todas", headers=headers)
    assert marcar_todas.status_code == 200
    assert marcar_todas.json()["marcadas"] == 2
    assert client.get("/notificacoes", headers=headers).json()["nao_lidas"] == 0


def test_recusa_com_excluir_arquivo_remove_disco_e_exige_novo_arquivo_para_reenvio(
    client, db, disciplina, headers, admin_headers
):
    enviado = _upload(client, disciplina.id, headers, titulo="Prova com matricula")
    assert enviado.status_code == 201
    material_id = enviado.json()["id"]
    material_db = db.get(Conteudo, material_id)
    chave_original = material_db.caminho_arquivo
    assert (settings.MATERIALS_DIR / chave_original).exists()

    recusa = client.patch(
        f"/moderacao/conteudos/{material_id}/curadoria",
        headers=admin_headers,
        json={
            "status": "RECUSADO",
            "justificativa": "Arquivo contém dados pessoais.",
            "excluir_arquivo": True,
        },
    )
    assert recusa.status_code == 200
    assert not (settings.MATERIALS_DIR / chave_original).exists()

    meus = client.get("/materiais/meus", headers=headers).json()
    meu = next(item for item in meus if item["id"] == material_id)
    assert meu["arquivo_disponivel"] is False

    # Tentar reenviar sem anexar novo arquivo falha com 422
    sem_arquivo = client.post(
        f"/materiais/{material_id}/reenviar",
        headers=headers,
        data={"titulo": "Prova sem dados pessoais"},
    )
    assert sem_arquivo.status_code == 422

    # Reenviar com novo arquivo limpo funciona
    com_arquivo = client.post(
        f"/materiais/{material_id}/reenviar",
        headers=headers,
        data={"titulo": "Prova sem dados pessoais", "tipo": "PROVA_ANTIGA"},
        files={"arquivo": ("p1_limpa.pdf", PDF_NOVO, "application/pdf")},
    )
    assert com_arquivo.status_code == 200, com_arquivo.text
    assert com_arquivo.json()["status_curadoria"] == "PENDENTE"
    assert com_arquivo.json()["tamanho_bytes"] == len(PDF_NOVO)
    db.expire_all()
    atualizado = db.get(Conteudo, material_id)
    assert atualizado.caminho_arquivo != chave_original
    assert (settings.MATERIALS_DIR / atualizado.caminho_arquivo).read_bytes() == PDF_NOVO
