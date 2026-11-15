from __future__ import annotations

import pytest

from app.core.security import create_access_token
from app.models.comentario import Comentario
from app.models.conteudo import Conteudo
from app.models.usuario import Usuario


@pytest.fixture()
def comentario_publicado(db, disciplina, student_user):
    comentario = Comentario(
        disciplina_id=disciplina.id,
        usuario_id=student_user.id,
        autor_alias="@estudante_fcte",
        topico_dificuldade="Ponteiros e Alocação Dinâmica",
        conteudo="Esse professor é incompetente e não explica a matéria.",
        status_moderacao="PUBLICADO",
    )
    db.add(comentario)
    db.commit()
    db.refresh(comentario)
    return comentario


@pytest.fixture()
def material_aprovado(db, disciplina, student_user):
    material = Conteudo(
        disciplina_id=disciplina.id,
        usuario_id=student_user.id,
        titulo="Prova 1 com gabarito vigente",
        tipo="ARQUIVO",
        caminho_arquivo="gabarito-vigente.pdf",
        formato="pdf",
        tamanho_bytes=2048,
        status_moderacao="ativo",
        status_curadoria="APROVADO",
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@pytest.fixture()
def moderador_headers(admin_user, db):
    admin_user.role = "MODERATOR"
    db.commit()
    return {"Authorization": f"Bearer {create_access_token({'sub': admin_user.email, 'role': 'MODERATOR'})}"}


@pytest.mark.parametrize(
    "metodo,rota,dados",
    [
        ("GET", "/moderacao/denuncias", None),
        ("PATCH", "/moderacao/denuncias/1", {"acao": "DESCARTAR_DENUNCIA"}),
    ],
)
def test_rotas_moderacao_denuncias_rejeitam_anonimo_e_estudante(client, student_headers, metodo, rota, dados):
    assert client.request(metodo, rota, json=dados).status_code == 401
    assert client.request(metodo, rota, headers=student_headers, json=dados).status_code == 403


def test_criacao_denuncia_exige_autenticacao_e_impede_duplicidade(
    client, comentario_publicado, headers
):
    sem_auth = client.post(
        "/comunidade/denuncias",
        json={
            "comentario_id": comentario_publicado.id,
            "categoria": "OFENSA_DOCENTE",
            "motivo": "Ataque pessoal contra o docente violando a RN04.",
        },
    )
    assert sem_auth.status_code == 401

    criada = client.post(
        "/comunidade/denuncias",
        headers=headers,
        json={
            "comentario_id": comentario_publicado.id,
            "categoria": "OFENSA_DOCENTE",
            "motivo": "Ataque pessoal contra o docente violando a RN04.",
        },
    )
    assert criada.status_code == 201, criada.text
    corpo = criada.json()
    assert corpo["status"] == "PENDENTE"
    assert corpo["tipo_alvo"] == "COMENTARIO"
    assert corpo["comentario_id"] == comentario_publicado.id
    assert corpo["categoria"] == "OFENSA_DOCENTE"
    assert corpo["total_denuncias_alvo"] == 1
    assert corpo["ocultado_automaticamente"] is False
    assert "usuario_id" not in corpo

    duplicada = client.post(
        f"/comentarios/{comentario_publicado.id}/denuncias",
        headers=headers,
        json={
            "categoria": "OFENSA_DOCENTE",
            "motivo": "Nova tentativa de denúncia pelo mesmo usuário.",
        },
    )
    assert duplicada.status_code == 409


def test_denuncia_alvo_inexistente_retorna_404(client, headers):
    r_com = client.post(
        "/comunidade/denuncias",
        headers=headers,
        json={
            "comentario_id": 999999,
            "categoria": "OFENSA_DOCENTE",
            "motivo": "Comentário que não existe no banco.",
        },
    )
    assert r_com.status_code == 404

    r_mat = client.post(
        "/comunidade/denuncias",
        headers=headers,
        json={
            "material_id": 999999,
            "categoria": "GABARITO_ATIVO",
            "motivo": "Material que não existe no banco.",
        },
    )
    assert r_mat.status_code == 404


def test_gatilho_automatico_oculta_comentario_apos_tres_denuncias_e_permite_descarte(
    client, db, disciplina, comentario_publicado, password_hash, moderador_headers
):
    for indice in range(1, 4):
        denunciante = Usuario(
            nome=f"Denunciante {indice}",
            email=f"denunciante{indice}@unb.br",
            password_hash=password_hash,
            role="STUDENT",
        )
        db.add(denunciante)
        db.commit()
        token = create_access_token({"sub": denunciante.email, "role": denunciante.role})
        resp = client.post(
            "/comunidade/denuncias",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "comentario_id": comentario_publicado.id,
                "categoria": "OFENSA_DOCENTE",
                "motivo": f"Relato sinalizado pela comunidade ({indice}/3).",
            },
        )
        assert resp.status_code == 201, resp.text
        if indice < 3:
            assert resp.json()["ocultado_automaticamente"] is False
        else:
            assert resp.json()["ocultado_automaticamente"] is True
            assert resp.json()["total_denuncias_alvo"] == 3

    db.refresh(comentario_publicado)
    assert comentario_publicado.status_moderacao == "PENDENTE"

    fila = client.get("/moderacao/denuncias?tipo=COMENTARIO", headers=moderador_headers)
    assert fila.status_code == 200, fila.text
    dados_fila = fila.json()
    assert dados_fila["total"] == 3
    item = dados_fila["items"][0]
    assert item["prioridade_rn04"] is True
    assert item["total_denuncias"] == 3
    assert item["alvo"]["autor_alias"] == "@estudante_fcte"
    assert item["alvo"]["disciplina"]["nome"] == disciplina.nome
    assert {"usuario_id", "email", "password_hash"}.isdisjoint(item)
    assert {"usuario_id", "email", "password_hash"}.isdisjoint(item["alvo"])

    decisao = client.patch(
        f"/moderacao/denuncias/{item['id']}",
        headers=moderador_headers,
        json={
            "acao": "DESCARTAR_DENUNCIA",
            "justificativa": "Denúncia improcedente após análise contextual.",
        },
    )
    assert decisao.status_code == 200, decisao.text
    resumo = decisao.json()
    assert resumo["acao"] == "DESCARTAR_DENUNCIA"
    assert resumo["status_denuncia"] == "DESCARTADA"
    assert resumo["status_moderacao_alvo"] == "PUBLICADO"
    assert resumo["denuncias_atualizadas"] == 3

    db.refresh(comentario_publicado)
    assert comentario_publicado.status_moderacao == "PUBLICADO"
    assert client.get("/moderacao/denuncias", headers=moderador_headers).json()["total"] == 0

    repetida = client.patch(
        f"/moderacao/denuncias/{item['id']}",
        headers=moderador_headers,
        json={"acao": "EXCLUIR_CONTEUDO"},
    )
    assert repetida.status_code == 409


def test_exclusao_de_comentario_e_material_denunciados(
    client, db, comentario_publicado, material_aprovado, headers, admin_headers
):
    r_com = client.post(
        "/comunidade/denuncias",
        headers=headers,
        json={
            "comentario_id": comentario_publicado.id,
            "categoria": "OFENSA_DOCENTE",
            "motivo": "Ofensa direta ao docente da matéria (RN04).",
        },
    )
    assert r_com.status_code == 201
    denuncia_com_id = r_com.json()["id"]

    r_mat = client.post(
        "/comunidade/denuncias",
        headers=headers,
        json={
            "material_id": material_aprovado.id,
            "categoria": "GABARITO_ATIVO",
            "motivo": "Material contém resolução de avaliação contínua vigente (RN05).",
        },
    )
    assert r_mat.status_code == 201
    denuncia_mat_id = r_mat.json()["id"]

    assert client.get("/moderacao/denuncias?tipo=MATERIAL", headers=admin_headers).json()["total"] == 1
    assert (
        client.get("/moderacao/denuncias?categoria=OFENSA_DOCENTE", headers=admin_headers).json()["total"]
        == 1
    )

    excluir_com = client.patch(
        f"/moderacao/denuncias/{denuncia_com_id}",
        headers=admin_headers,
        json={
            "acao": "EXCLUIR_CONTEUDO",
            "justificativa": "Conteúdo removido por violação da RN04.",
        },
    )
    assert excluir_com.status_code == 200, excluir_com.text
    assert excluir_com.json()["status_moderacao_alvo"] == "OCULTO"
    db.refresh(comentario_publicado)
    assert comentario_publicado.status_moderacao == "OCULTO"

    excluir_mat = client.patch(
        f"/moderacao/denuncias/{denuncia_mat_id}",
        headers=admin_headers,
        json={
            "acao": "EXCLUIR_CONTEUDO",
            "justificativa": "Gabarito vigente removido por violação da RN05.",
        },
    )
    assert excluir_mat.status_code == 200, excluir_mat.text
    assert excluir_mat.json()["status_moderacao_alvo"] == "excluido"
    db.refresh(material_aprovado)
    assert material_aprovado.status_moderacao == "excluido"
    assert material_aprovado.status_curadoria == "RECUSADO"
