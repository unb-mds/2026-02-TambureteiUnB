import pytest

from app.models.conteudo import Conteudo


@pytest.fixture
def materiais_publicos(db, disciplina, student_user):
    for i in range(25):
        db.add(
            Conteudo(
                disciplina_id=disciplina.id,
                usuario_id=student_user.id,
                titulo="Resumo antigo" if i == 0 else f"Material recente {i}",
                tipo="RESUMO" if i % 2 == 0 else "DICA",
                caminho_arquivo=f"arquivo-{i}.pdf",
                formato="pdf",
                tamanho_bytes=64,
                status_curadoria="APROVADO",
                status_moderacao="ativo",
            )
        )
    db.add(
        Conteudo(
            disciplina_id=disciplina.id,
            usuario_id=student_user.id,
            titulo="Arquivo de outra categoria",
            tipo="ARQUIVO",
            caminho_arquivo="outro.pdf",
            formato="pdf",
            tamanho_bytes=64,
            status_curadoria="APROVADO",
            status_moderacao="ativo",
        )
    )
    db.add(
        Conteudo(
            disciplina_id=disciplina.id,
            usuario_id=student_user.id,
            titulo="Resumo pendente",
            tipo="RESUMO",
            caminho_arquivo="pendente.pdf",
            formato="pdf",
            tamanho_bytes=64,
            status_curadoria="PENDENTE",
            status_moderacao="ativo",
        )
    )
    db.commit()


def test_categoria_pagina_e_pesquisa_em_toda_a_base(client, disciplina, materiais_publicos):
    url = f"/cadeiras/{disciplina.id}/materiais"
    filtros = [("tipos", "RESUMO"), ("tipos", "DICA")]
    primeira = client.get(url, params=filtros)
    segunda = client.get(url, params=filtros + [("pagina", "2")])
    assert primeira.status_code == segunda.status_code == 200
    p1, p2 = primeira.json(), segunda.json()
    assert p1["total"] == p2["total"] == 25
    assert len(p1["items"]) == 20
    assert len(p2["items"]) == 5
    assert not ({item["id"] for item in p1["items"]} & {item["id"] for item in p2["items"]})
    pesquisa = client.get(url, params=filtros + [("titulo", "antigo")]).json()
    assert pesquisa["total"] == 1
    assert pesquisa["items"][0]["titulo"] == "Resumo antigo"
    assert client.get(url, params={"tipo": "DICA"}).json()["total"] == 12


@pytest.mark.parametrize("parametros", [{"tipos": ["INVALIDO"]}, {"tipo": "ARQUIVO", "tipos": ["DICA"]}])
def test_filtro_invalido_retorna_422(client, disciplina, parametros):
    resposta = client.get(f"/cadeiras/{disciplina.id}/materiais", params=parametros)
    assert resposta.status_code == 422
