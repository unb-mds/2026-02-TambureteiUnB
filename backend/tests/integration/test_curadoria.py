from unittest.mock import patch

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.core.security import create_access_token
from app.models import Conteudo, Curadoria
from app.repositories.curadoria_repo import curadoria_repo

PDF = b"%PDF-1.7 arquivo pendente"


@pytest.fixture()
def pendente(client, disciplina, headers):
    r = client.post(f"/cadeiras/{disciplina.id}/materiais", headers=headers,
                    data={"titulo": "Revisar arquivo"}, files={"arquivo": ("arquivo.pdf", PDF, "application/pdf")})
    assert r.status_code == 201, r.text
    assert r.json()["status_curadoria"] == "PENDENTE"
    return r.json()["id"]


@pytest.fixture()
def moderador_headers(admin_user, db):
    admin_user.role = "MODERATOR"
    db.commit()
    return {"Authorization": "Bearer " + create_access_token({"sub": admin_user.email})}


@pytest.mark.parametrize("metodo,rota,dados", [
    ("GET", "/moderacao/materiais", None),
    ("GET", "/moderacao/materiais/1/download", None),
    ("GET", "/moderacao/conteudos/1/historico", None),
    ("PATCH", "/moderacao/conteudos/1/curadoria", {"status": "APROVADO"}),
])
def test_endpoints_rejeitam_anonimo_e_estudante(client, headers, metodo, rota, dados):
    for auth, esperado in [({}, 401), (headers, 403)]:
        assert client.request(metodo, rota, headers=auth, json=dados).status_code == esperado


@pytest.mark.parametrize("perfil", ["ADMIN", "MODERATOR"])
def test_aprovacao_publica_registra_autoria_e_bloqueia_nova_decisao(client, db, pendente, disciplina, headers, admin_headers, admin_user, perfil):
    admin_user.role = perfil
    db.commit()
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["total"] == 0
    assert client.get(f"/materiais/{pendente}/download", headers=headers).status_code == 403
    fila = client.get("/moderacao/materiais", headers=admin_headers)
    assert fila.status_code == 200, fila.text
    item = fila.json()["items"][0]
    assert item["disciplina"]["nome"] == disciplina.nome
    assert {"usuario_id", "caminho_arquivo", "password_hash", "email"}.isdisjoint(item)
    arquivo = client.get(f"/moderacao/materiais/{pendente}/download", headers=admin_headers)
    assert arquivo.content == PDF
    assert arquivo.headers["cache-control"] == "private, no-store"
    assert "attachment" in arquivo.headers["content-disposition"]
    decisao = client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "APROVADO"})
    assert decisao.status_code == 200, decisao.text
    assert decisao.json()["moderador_id"] == str(admin_user.id)
    assert decisao.json()["perfil_moderador"] == perfil
    assert decisao.json()["status_anterior"] == "PENDENTE"
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["total"] == 1
    assert client.get(f"/materiais/{pendente}/download", headers=headers).content == PDF
    assert client.get("/moderacao/materiais", headers=admin_headers).json()["total"] == 0
    assert client.get(f"/moderacao/materiais/{pendente}/download", headers=admin_headers).status_code == 409
    repetida = client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "RECUSADO", "justificativa": "Outro parecer"})
    assert repetida.status_code == 409
    assert db.scalar(select(func.count()).select_from(Curadoria)) == 1
    historico = client.get(f"/moderacao/conteudos/{pendente}/historico", headers=admin_headers).json()
    assert len(historico) == 1 and historico[0]["id"] == decisao.json()["id"]


def test_recusa_exige_motivo_e_nao_publica(client, db, pendente, disciplina, headers, moderador_headers):
    r = client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=moderador_headers,
                     json={"status": "RECUSADO", "justificativa": "  Avaliação ainda vigente.  "})
    assert r.status_code == 200, r.text
    assert r.json()["justificativa"] == "Avaliação ainda vigente."
    assert db.get(Conteudo, pendente).status_curadoria == "RECUSADO"
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["items"] == []
    assert client.get(f"/materiais/{pendente}/download", headers=headers).status_code == 403


@pytest.mark.parametrize("dados", [
    {"status": "RECUSADO"}, {"status": "RECUSADO", "justificativa": "   "},
    {"status": "APROVADO", "justificativa": "x" * 1001}, {"status": "PENDENTE"},
    {"status": "APROVADO", "moderador_id": "forjado"},
])
def test_decisao_invalida_nao_modifica_estado(client, db, pendente, admin_headers, dados):
    r = client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json=dados)
    assert r.status_code == 422
    assert db.get(Conteudo, pendente).status_curadoria == "PENDENTE"
    assert db.scalar(select(func.count()).select_from(Curadoria)) == 0


def test_revogacao_de_perfil_e_conta_inativa(client, db, pendente, admin_user, admin_headers):
    admin_user.role = "STUDENT"
    db.commit()
    assert client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "APROVADO"}).status_code == 403
    admin_user.role = "ADMIN"
    admin_user.is_active = False
    db.commit()
    assert client.get("/moderacao/materiais", headers=admin_headers).status_code in {400, 401}


@pytest.mark.parametrize("falha", ["registro", "commit"])
def test_falha_de_auditoria_reverte_decisao(client, db, pendente, admin_headers, falha):
    alvo, nome = (curadoria_repo, "registrar") if falha == "registro" else (db, "commit")
    with patch.object(alvo, nome, side_effect=SQLAlchemyError("Falha simulada")):
        assert client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "APROVADO"}).status_code == 503
    assert db.get(Conteudo, pendente).status_curadoria == "PENDENTE"
    assert db.scalar(select(func.count()).select_from(Curadoria)) == 0


def test_fila_paginada_nao_inclui_links_ou_arquivos_excluidos(client, db, pendente, disciplina, admin_headers):
    db.add(Conteudo(disciplina_id=disciplina.id, titulo="Link pendente", tipo="LINK_UTIL", url_origem="https://unb.br"))
    db.commit()
    assert client.get("/moderacao/materiais?tamanho_pagina=1", headers=admin_headers).json()["total"] == 1
    assert client.get("/moderacao/materiais?pagina=2&tamanho_pagina=1", headers=admin_headers).json()["items"] == []
    assert client.get("/moderacao/materiais?pagina=0", headers=admin_headers).status_code == 422
    db.get(Conteudo, pendente).status_moderacao = "excluido"
    db.commit()
    assert client.get("/moderacao/materiais", headers=admin_headers).json()["total"] == 0
    assert client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "APROVADO"}).status_code == 404


def test_download_pendente_com_arquivo_ausente_e_inexistente(client, db, pendente, admin_headers):
    db.get(Conteudo, pendente).caminho_arquivo = "../arquivo.pdf"
    db.commit()
    assert client.get(f"/moderacao/materiais/{pendente}/download", headers=admin_headers).status_code == 404
    assert client.get("/moderacao/conteudos/2147483647/historico", headers=admin_headers).status_code == 404


def test_material_bloqueado_nao_pode_ser_aprovado(client, db, pendente, admin_headers):
    db.get(Conteudo, pendente).status_moderacao = "bloqueado"
    db.commit()
    assert client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "APROVADO"}).status_code == 409
    assert db.scalar(select(func.count()).select_from(Curadoria)) == 0


def test_duas_decisoes_concorrentes_registram_apenas_uma(engine, tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from uuid import uuid4
    from fastapi import HTTPException
    from sqlalchemy import text
    from sqlalchemy.orm import Session
    from app.models import Disciplina, Usuario
    from app.api.schemas.curadoria import DecisaoCuradoria
    from app.services.curadoria_service import CuradoriaService
    from app.services.armazenamento_material import ArmazenamentoMaterial

    with Session(engine) as db:
        moderador = Usuario(nome="Moderador concorrente", email=f"{uuid4()}@example.com", password_hash="nao-usado", role="ADMIN")
        disciplina = Disciplina(nome="Concorrencia", slug=str(uuid4()))
        db.add_all([moderador, disciplina])
        db.flush()
        conteudo = Conteudo(disciplina_id=disciplina.id, titulo="Concorrente", tipo="ARQUIVO", caminho_arquivo="concorrente.pdf", formato="pdf", tamanho_bytes=10, status_moderacao="ativo")
        db.add(conteudo)
        db.commit()
        conteudo_id, moderador_id, disciplina_id = conteudo.id, moderador.id, disciplina.id
    barreira = Barrier(2)
    def decidir():
        with Session(engine) as db:
            autor = db.get(Usuario, moderador_id)
            barreira.wait(timeout=10)
            servico = CuradoriaService(ArmazenamentoMaterial(tmp_path, 100))
            try:
                servico.decidir(db, conteudo_id, DecisaoCuradoria(status="APROVADO"), autor)
                return 200
            except HTTPException as error:
                return error.status_code
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            respostas = list(executor.map(lambda _: decidir(), range(2)))
        assert sorted(respostas) == [200, 409]
        from alembic import command
        from alembic.config import Config
        from app.core.config import Settings
        url = engine.url.render_as_string(hide_password=False)
        with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
            with pytest.raises(RuntimeError, match="Downgrade bloqueado"):
                command.downgrade(Config("alembic.ini"), "009_arquivos_conteudos")
        with engine.connect() as connection:
            assert connection.scalar(select(func.count()).select_from(Curadoria).where(Curadoria.conteudo_id == conteudo_id)) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM curadorias WHERE conteudo_id = :id"), {"id": conteudo_id})
            connection.execute(text("DELETE FROM disciplinas WHERE id = :id"), {"id": disciplina_id})
            connection.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": moderador_id})


def test_aprovacao_de_material_em_analise_libera_publicacao(client, db, pendente, disciplina, admin_headers):
    db.get(Conteudo, pendente).status_moderacao = "em_analise"
    db.commit()
    r = client.patch(f"/moderacao/conteudos/{pendente}/curadoria", headers=admin_headers, json={"status": "APROVADO"})
    assert r.status_code == 200
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["total"] == 1
