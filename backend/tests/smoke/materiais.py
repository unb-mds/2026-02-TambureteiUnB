"""Smoke HTTP em Compose isolado: enviar antes e conferir após recriar o backend."""
import os
import sys

import httpx

from app.core.database import SessionLocal
from app.models import Disciplina, Conteudo, Usuario
from app.core.security import get_password_hash

PDF = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"
EMAIL = "smoke.materiais@example.com"
SENHA = "SenhaDeTeste123!"
SLUG = "smoke-materiais-isolado"
TITULO = "Resumo smoke de materiais"


def executar(etapa: str) -> None:
    if os.getenv("MATERIAIS_SMOKE_TEST") != "1":
        raise SystemExit("Use apenas em Compose de teste isolado, com MATERIAIS_SMOKE_TEST=1.")
    with httpx.Client(base_url="http://localhost:8000", timeout=20) as client:
        assert client.get("/health").status_code == 200
        if etapa == "enviar":
            resposta = client.post("/auth/register", json={"nome": "Aluno Smoke", "email": EMAIL, "senha": SENHA})
            assert resposta.status_code in {201, 409}, resposta.text
        login = client.post("/auth/login", json={"email": EMAIL, "senha": SENHA})
        assert login.status_code == 200, login.text
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        with SessionLocal() as db:
            disciplina = db.query(Disciplina).filter_by(slug=SLUG).first()
            if etapa == "enviar":
                moderador = db.query(Usuario).filter_by(email="smoke.moderacao@example.com").first()
                if moderador is None:
                    db.add(Usuario(nome="Moderador Smoke", email="smoke.moderacao@example.com", role="MODERATOR", password_hash=get_password_hash(SENHA)))
                    db.commit()
                if disciplina is None:
                    disciplina = Disciplina(nome="Disciplina Smoke", slug=SLUG)
                    db.add(disciplina)
                    db.commit()
                resposta = client.post(
                    f"/cadeiras/{disciplina.id}/materiais", headers=headers,
                    data={"titulo": TITULO}, files={"arquivo": ("resumo.pdf", PDF, "application/pdf")},
                )
                assert resposta.status_code == 201, resposta.text
            assert disciplina is not None
            material = db.query(Conteudo).filter_by(disciplina_id=disciplina.id, titulo=TITULO).order_by(Conteudo.id.desc()).first()
            assert material is not None
            if etapa == "enviar":
                assert material.status_curadoria == "PENDENTE"
                assert client.get(f"/materiais/{material.id}/download", headers=headers).status_code == 403
                login_moderador = client.post("/auth/login", json={"email": "smoke.moderacao@example.com", "senha": SENHA})
                assert login_moderador.status_code == 200
                auth_moderador = {"Authorization": "Bearer " + login_moderador.json()["access_token"]}
                assert client.get(f"/moderacao/materiais/{material.id}/download", headers=auth_moderador).content == PDF
                decisao = client.patch(f"/moderacao/conteudos/{material.id}/curadoria", headers=auth_moderador, json={"status": "APROVADO"})
                assert decisao.status_code == 200, decisao.text
                historico = client.get(f"/moderacao/conteudos/{material.id}/historico", headers=auth_moderador)
                assert len(historico.json()) == 1
            lista = client.get(f"/cadeiras/{disciplina.id}/materiais").json()
            assert any(item["id"] == material.id for item in lista["items"])
            assert client.get(f"/materiais/{material.id}/download").status_code == 401
            resposta = client.get(f"/materiais/{material.id}/download", headers=headers)
            assert resposta.status_code == 200 and resposta.content == PDF
            assert "attachment" in resposta.headers["content-disposition"]
    print(f"Smoke materiais aprovado: {etapa}.")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"enviar", "conferir"}:
        raise SystemExit("Uso: PYTHONPATH=. python tests/smoke/materiais.py [enviar|conferir]")
    executar(sys.argv[1])
