"""Demonstra falhas da develop com dados locais, sem consultar ou alterar o banco."""
import json
import sys
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
APP_URL = "http://localhost:3006"
SCENARIOS = {
    "download": ("Download aponta para #", "Clique em Acessar material. A URL permanece na própria página, pois o href é #. O download real exige uma chamada autenticada a /materiais/{id}/download."),
    "comentario": ("Comentário aceita turma de outra disciplina", "O serviço real é executado com disciplina 10 e turma 99 pertencente à disciplina 20. Apenas os repositórios são simulados. Nenhum registro é salvo."),
    "historico": ("Histórico vazio mostra seis semestres fictícios", "A resposta da API contém metricas: []. Role até Evolução semestral: aparecem seis semestres com valores fixos."),
    "paginacao": ("Busca ignora materiais após os primeiros 20", "A API tem 21 materiais. Busque Resumo antigo: o item de ID 1 existe na página 2, mas a interface não o consulta e informa nenhum resultado."),
    "erro": ("Erro 503 é apresentado como lista vazia", "A API de materiais retorna HTTP 503. A interface informa que ainda não há materiais cadastrados, sem mostrar a falha."),
    "zero": ("Aprovação real de 0% aparece como Sem dados", "A API retorna dez matriculados, zero aprovados e taxa 0. O cartão Taxa de Aprovação exibe Sem dados."),
}


def reproduce_comment():
    from app.api.schemas.comentario import ComentarioCreate
    from app.services.comentario_service import comentario_service
    data = ComentarioCreate(disciplina_id=10, turma_id=99, conteudo="Relato de demonstração")
    with patch("app.services.comentario_service.disciplina_repo.get_by_id", return_value=SimpleNamespace(id=10)), patch("app.services.comentario_service.turma_repo.get_by_id", return_value=SimpleNamespace(id=99, disciplina_id=20)), patch("app.services.comentario_service.comentario_repo.create", side_effect=lambda db, obj: obj):
        result = comentario_service.criar_comentario(None, data, SimpleNamespace(id=uuid4()))
    return {"disciplina_do_comentario": result.disciplina_id, "turma_do_comentario": result.turma_id, "disciplina_real_da_turma": 20, "resultado_observado": "aceito pelo serviço", "resultado_esperado": "rejeitar a associação incompatível", "persistencia": "simulada; banco não acessado"}


def material(i):
    return {"id": i, "disciplina_id": 10, "titulo": "Resumo antigo" if i == 1 else f"Resumo recente {i}", "tipo": "RESUMO", "formato": "pdf", "tamanho_bytes": 100, "status_curadoria": "APROVADO", "status_moderacao": "PUBLICADO", "created_at": "2026-11-20T12:00:00Z"}


def discipline(slug):
    return {"id": 10, "codigo": "TEST0010", "nome": "Disciplina de demonstração", "slug": slug, "departamento": "FCTE", "creditos": 4, "carga_horaria": 60, "ementa": "", "pre_requisitos_itens": [], "equivalencias_itens": [], "cursos": [], "metricas": [], "metrica_consolidada": {"matriculados": 10, "aprovados": 0, "reprovados_nota": 10, "reprovados_falta": 0, "trancamentos": 0, "taxa_aprovacao_acumulada": 0, "total_turmas_suprimidas": 0}}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def send(self, data, status=200, content_type="application/json; charset=utf-8"):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode() if not isinstance(data, str) else data.encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", APP_URL)
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send({})

    def do_GET(self):
        parsed = urlsplit(self.path)
        path, query = parsed.path, parse_qs(parsed.query)
        if path == "/":
            case = query.get("caso", ["download"])[0]
            if case not in SCENARIOS:
                self.send({"detail": "Cenário não encontrado"}, 404)
                return
            title, explanation = SCENARIOS[case]
            links = "".join(f'<a href="/?caso={key}">{escape(value[0])}</a>' for key, value in SCENARIOS.items())
            if case == "comentario":
                content = f'<pre>{escape(json.dumps(reproduce_comment(),ensure_ascii=False,indent=2))}</pre><p><a href="/__demo/comentario" target="_blank">Ver resultado JSON do serviço</a></p>'
            else:
                slug = "auditoria-" + case
                api_path = f"/cadeiras/{slug}/materiais" if case in ("download", "paginacao", "erro") else f"/cadeiras/{slug}"
                content = f'<p><a href="{APP_URL}/disciplinas/{slug}" target="_blank">Abrir página real em outra aba</a> | <a href="{api_path}" target="_blank">Ver resposta da API de teste</a></p><iframe title="Página real do projeto com API simulada" src="{APP_URL}/disciplinas/{slug}"></iframe>'
            self.send(f'''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diagnóstico funcional — Tamburetei</title><style>body{{margin:0;background:#f4f3fa;color:#222;font:15px system-ui}}header,main{{padding:16px 24px}}header{{background:white}}nav{{display:flex;gap:8px;flex-wrap:wrap}}a{{color:#4331af}}nav a{{padding:8px;border:1px solid #ccc;border-radius:8px}}iframe{{width:100%;height:72vh;border:1px solid #bbb;border-radius:10px;background:white}}pre{{padding:20px;background:white;white-space:pre-wrap}}h1{{font-size:23px}}.notice{{font-weight:600}}</style><header><h1>Diagnóstico funcional do Tamburetei</h1><p class="notice">Ambiente de demonstração: interface real com API simulada. Nenhum banco é acessado. Estes cenários reproduzem bugs; não são correções.</p><nav>{links}</nav></header><main><h2>{escape(title)}</h2><p>{escape(explanation)}</p>{content}</main></html>''', content_type="text/html; charset=utf-8")
        elif path == "/__demo/comentario":
            self.send(reproduce_comment())
        elif path.startswith("/cadeiras/") and path.endswith("/materiais"):
            if "/auditoria-erro/" in path:
                self.send({"detail": "Armazenamento indisponível — falha 503 de demonstração"}, 503)
            else:
                page = int(query.get("pagina", [1])[0])
                size = int(query.get("tamanho_pagina", [20])[0])
                items = [material(i) for i in range(21, 0, -1)]
                term = query.get("titulo", [""])[0].casefold()
                items = [item for item in items if term in item["titulo"].casefold()]
                self.send({"items": items[(page - 1)*size:page*size], "total": len(items), "pagina": page, "tamanho_pagina": size})
        elif path.startswith("/cadeiras/") and "comentarios" not in path:
            self.send(discipline(path.rsplit("/", 1)[-1]))
        elif "comentarios" in path:
            self.send({"items": [], "total": 0, "page": 1, "size": 20, "pages": 0})
        elif path == "/turmas":
            self.send([])
        else:
            self.send({"detail": "Rota fora da demonstração"}, 404)


if __name__ == "__main__":
    print("Demonstração: http://localhost:18004", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 18004), Handler).serve_forever()
