"""Links e arquivos compartilham entidade sem expor armazenamento privado."""
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.models import Conteudo
from app.repositories.conteudo_repo import conteudo_repo


def enviar(client, disciplina, headers):
    response = client.post(f"/cadeiras/{disciplina.id}/materiais", headers=headers,
                           data={"titulo": "Arquivo unificado"},
                           files={"arquivo": ("resumo.pdf", b"%PDF-1.7 conteudo", "application/pdf")})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_link_preservado_e_arquivo_na_mesma_entidade(client, db, disciplina, headers, admin_headers):
    link = Conteudo(disciplina_id=disciplina.id, titulo="Link existente", tipo="LINK_UTIL",
                   url_origem="https://unb.br", status_curadoria="APROVADO")
    db.add(link)
    db.commit()
    arquivo_id = enviar(client, disciplina, headers)
    arquivo = db.get(Conteudo, arquivo_id)
    assert arquivo.tipo == "ARQUIVO" and arquivo.url_origem is None
    assert arquivo.status_curadoria == "PENDENTE"
    assert client.patch(f"/moderacao/conteudos/{arquivo_id}/curadoria", headers=admin_headers, json={"status": "APROVADO"}).status_code == 200
    assert link.url_origem == "https://unb.br" and link.caminho_arquivo is None
    assert client.get(f"/materiais/{link.id}/download", headers=headers).status_code == 404
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["total"] == 1
    assert {c.id for c in conteudo_repo.get_aprovados_by_disciplina(db, disciplina.id)} == {link.id, arquivo_id}
    arquivo.status_moderacao = "bloqueado"
    db.commit()
    assert [c.id for c in conteudo_repo.get_aprovados_by_disciplina(db, disciplina.id)] == [link.id]


@pytest.mark.parametrize("curadoria", ["PENDENTE", "RECUSADO"])
def test_curadoria_bloqueia_arquivo(client, db, disciplina, headers, curadoria):
    arquivo_id = enviar(client, disciplina, headers)
    db.get(Conteudo, arquivo_id).status_curadoria = curadoria
    db.commit()
    assert client.get(f"/materiais/{arquivo_id}/download", headers=headers).status_code == 403
    assert client.get(f"/cadeiras/{disciplina.id}/materiais").json()["total"] == 0
    assert conteudo_repo.get_aprovados_by_disciplina(db, disciplina.id) == []


@pytest.mark.parametrize("tipo,url,caminho", [
    ("LINK_UTIL", None, None),
    ("LINK_UTIL", "https://unb.br", "chave.pdf"),
    ("ARQUIVO", "https://unb.br", None),
])
def test_banco_rejeita_origem_inconsistente(db, disciplina, tipo, url, caminho):
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(Conteudo(disciplina_id=disciplina.id, titulo="Origem invalida", tipo=tipo,
                        url_origem=url, caminho_arquivo=caminho))
        db.flush()


def test_downgrade_impede_perda_de_arquivo(engine):
    config = Config("alembic.ini")
    url = engine.url.render_as_string(hide_password=False)
    with engine.begin() as connection:
        disciplina_id = connection.scalar(text("INSERT INTO disciplinas (nome, slug) VALUES ('Preservar arquivo', 'preservar-arquivo') RETURNING id"))
        arquivo_id = connection.scalar(text("INSERT INTO conteudos (disciplina_id, titulo, tipo, caminho_arquivo, formato, tamanho_bytes, status_moderacao) VALUES (:id, 'Preservar', 'ARQUIVO', 'preservar.pdf', 'pdf', 10, 'ativo') RETURNING id"), {"id": disciplina_id})
    try:
        with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
            with pytest.raises(RuntimeError, match="Downgrade bloqueado"):
                command.downgrade(config, "008")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT caminho_arquivo FROM conteudos WHERE id = :id"), {"id": arquivo_id}) == "preservar.pdf"
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "010_curadorias"
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM disciplinas WHERE id = :id"), {"id": disciplina_id})


def test_upgrade_suporta_nome_de_constraint_do_bootstrap_antigo(engine):
    url = engine.url.render_as_string(hide_password=False)
    config = Config("alembic.ini")
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        try:
            command.downgrade(config, "008")
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE conteudos RENAME CONSTRAINT chk_tipo_conteudo TO conteudos_tipo_check"))
        finally:
            command.upgrade(config, "head")
    assert "chk_tipo_conteudo" in {c["name"] for c in inspect(engine).get_check_constraints("conteudos")}
