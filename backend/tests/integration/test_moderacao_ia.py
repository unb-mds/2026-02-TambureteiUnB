"""Testes de integracao da moderacao autonoma hibrida (Ollama mockado) e curadoria de comentarios."""
import json
from unittest.mock import MagicMock, patch

import httpx
import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models.comentario import Comentario
from app.models.conteudo import Conteudo
from app.models.curadoria import Curadoria
from app.services.moderacao_ia_service import (
    aplicar_triagem_comentario,
    aplicar_triagem_material,
)

PDF_BYTES = b"%PDF-1.7 material para triagem"
PNG_BYTES = b"\x89PNG\r\n\x1a\nconteudo visual"


def _mock_ollama_response(decisao: str, confianca: float, categoria: str, motivo: str):
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = {
        "message": {
            "content": json.dumps({
                "decisao": decisao,
                "confianca": confianca,
                "categoria_violacao": categoria,
                "motivo": motivo,
            })
        }
    }
    return mock_resp


def test_triagem_ia_aprova_comentario_automaticamente(client, db, disciplina, student_headers, monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
    r = client.post(
        "/comentarios",
        json={"disciplina_id": disciplina.id, "conteudo": "As listas de exercicios ajudam bastante na P1."},
        headers=student_headers,
    )
    assert r.status_code == 201
    comentario_id = r.json()["id"]

    with patch("app.services.moderacao_ia_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value.post.return_value = _mock_ollama_response(
            "APROVAR", 0.94, "NENHUMA", "Relato academico construtivo."
        )
        assert aplicar_triagem_comentario(db, comentario_id) is True

    comentario = db.get(Comentario, comentario_id)
    assert comentario.status_moderacao == "PUBLICADO"
    assert comentario.moderado_por == "IA"
    assert comentario.confianca_ia == pytest.approx(0.94)
    assert client.get(f"/cadeiras/{disciplina.id}/comentarios").json()["total"] == 1


def test_triagem_ia_oculta_comentario_ofensivo(client, db, disciplina, student_headers, monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
    r = client.post(
        "/comentarios",
        json={"disciplina_id": disciplina.id, "conteudo": "Comentario com ataque pessoal e dados sensiveis."},
        headers=student_headers,
    )
    comentario_id = r.json()["id"]

    with patch("app.services.moderacao_ia_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value.post.return_value = _mock_ollama_response(
            "REJEITAR", 0.91, "OFENSA_DIFAMACAO", "Ataque pessoal identificado."
        )
        assert aplicar_triagem_comentario(db, comentario_id) is True

    comentario = db.get(Comentario, comentario_id)
    assert comentario.status_moderacao == "OCULTO"
    assert comentario.moderado_por == "IA"
    assert "[OFENSA_DIFAMACAO]" in comentario.motivo_moderacao
    assert client.get(f"/cadeiras/{disciplina.id}/comentarios").json()["total"] == 0


def test_triagem_ia_escalona_comentario_quando_ollama_offline_e_permite_curadoria_humana(
    client, db, disciplina, student_headers, admin_headers, monkeypatch
):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
    r = client.post(
        "/comentarios",
        json={"disciplina_id": disciplina.id, "conteudo": "Relato aguardando analise quando Ollama falha."},
        headers=student_headers,
    )
    comentario_id = r.json()["id"]

    with patch("app.services.moderacao_ia_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value.post.side_effect = httpx.ConnectError("Ollama offline")
        assert aplicar_triagem_comentario(db, comentario_id) is True

    # Permanece PENDENTE na fila de moderacao humana
    assert client.get(f"/cadeiras/{disciplina.id}/comentarios").json()["total"] == 0
    fila = client.get("/moderacao/comentarios", headers=admin_headers)
    assert fila.status_code == 200
    assert fila.json()["total"] == 1
    item = fila.json()["items"][0]
    assert item["id"] == comentario_id
    assert {"usuario_id", "email", "password_hash"}.isdisjoint(item)

    # Moderador aprova manualmente
    decisao = client.patch(
        f"/moderacao/comentarios/{comentario_id}/curadoria",
        headers=admin_headers,
        json={"status": "PUBLICADO"},
    )
    assert decisao.status_code == 200
    assert decisao.json()["status_moderacao"] == "PUBLICADO"
    assert decisao.json()["moderado_por"] == "ADMIN"
    assert client.get(f"/cadeiras/{disciplina.id}/comentarios").json()["total"] == 1

    # Nova tentativa de curadoria no mesmo comentario retorna 409
    repetida = client.patch(
        f"/moderacao/comentarios/{comentario_id}/curadoria",
        headers=admin_headers,
        json={"status": "OCULTO", "justificativa": "Tarde demais"},
    )
    assert repetida.status_code == 409


def test_triagem_ia_material_aprova_e_recusa_com_auditoria(client, db, disciplina, headers, admin_headers, monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")

    # 1. Material aprovado pela IA
    r1 = client.post(
        f"/cadeiras/{disciplina.id}/materiais",
        headers=headers,
        data={"titulo": "Resumo Limites"},
        files={"arquivo": ("resumo.pdf", PDF_BYTES, "application/pdf")},
    )
    assert r1.status_code == 201
    id_aprovado = r1.json()["id"]

    with (
        patch("app.services.moderacao_ia_service.extrair_texto_pdf", return_value="Resumo de calculo diferencial."),
        patch("app.services.moderacao_ia_service.httpx.Client") as mock_client_cls,
    ):
        mock_client_cls.return_value.__enter__.return_value.post.return_value = _mock_ollama_response(
            "APROVAR", 0.96, "NENHUMA", "Resumo didatico sem dados pessoais."
        )
        assert aplicar_triagem_material(db, id_aprovado) is True

    mat_aprovado = db.get(Conteudo, id_aprovado)
    assert mat_aprovado.status_curadoria == "APROVADO"
    assert mat_aprovado.status_moderacao == "ativo"
    assert mat_aprovado.moderado_por == "IA"
    historico = client.get(f"/moderacao/conteudos/{id_aprovado}/historico", headers=admin_headers).json()
    assert len(historico) == 1
    assert historico[0]["perfil_moderador"] == "IA"
    assert historico[0]["moderador_id"] is None

    # 2. Material recusado pela IA por conter cabecalho identificado (RN01/RN06)
    r2 = client.post(
        f"/cadeiras/{disciplina.id}/materiais",
        headers=headers,
        data={"titulo": "Prova P1 Escaneada"},
        files={"arquivo": ("prova.pdf", PDF_BYTES, "application/pdf")},
    )
    id_recusado = r2.json()["id"]

    with (
        patch("app.services.moderacao_ia_service.extrair_texto_pdf", return_value="Aluno: Fulano Matricula: 221000000"),
        patch("app.services.moderacao_ia_service.httpx.Client") as mock_client_cls,
    ):
        mock_client_cls.return_value.__enter__.return_value.post.return_value = _mock_ollama_response(
            "REJEITAR", 0.98, "LGPD_DADOS_PESSOAIS", "Contem nome e matricula de discente."
        )
        assert aplicar_triagem_material(db, id_recusado) is True

    mat_recusado = db.get(Conteudo, id_recusado)
    assert mat_recusado.status_curadoria == "RECUSADO"
    assert mat_recusado.status_moderacao == "bloqueado"
    assert mat_recusado.moderado_por == "IA"
    # Download publico bloqueado (403), mas arquivo fisico preservado no disco
    assert client.get(f"/materiais/{id_recusado}/download", headers=headers).status_code == 403
    assert db.scalar(select(func.count()).select_from(Curadoria).where(Curadoria.conteudo_id == id_recusado)) == 1


def test_pdf_sem_texto_e_imagem_sem_modelo_visao_escalonam_para_humano(
    client, db, disciplina, headers, admin_headers, monkeypatch
):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setattr(settings, "OLLAMA_VISION_MODEL", "")

    r_pdf = client.post(
        f"/cadeiras/{disciplina.id}/materiais",
        headers=headers,
        data={"titulo": "PDF Escaneado"},
        files={"arquivo": ("scan.pdf", PDF_BYTES, "application/pdf")},
    )
    id_pdf = r_pdf.json()["id"]

    with patch("app.services.moderacao_ia_service.extrair_texto_pdf", return_value="   "):
        assert aplicar_triagem_material(db, id_pdf) is True

    r_png = client.post(
        f"/cadeiras/{disciplina.id}/materiais",
        headers=headers,
        data={"titulo": "Foto Quadro"},
        files={"arquivo": ("quadro.png", PNG_BYTES, "image/png")},
    )
    id_png = r_png.json()["id"]
    assert aplicar_triagem_material(db, id_png) is True

    fila = client.get("/moderacao/materiais", headers=admin_headers).json()
    assert fila["total"] == 2
    itens_por_id = {item["id"]: item for item in fila["items"]}
    assert "camada de texto" in itens_por_id[id_pdf]["motivo_moderacao"]
    assert itens_por_id[id_pdf]["confianca_ia"] == 0.0
    assert "modelo multimodal" in itens_por_id[id_png]["motivo_moderacao"]
    assert itens_por_id[id_png]["confianca_ia"] == 0.0
