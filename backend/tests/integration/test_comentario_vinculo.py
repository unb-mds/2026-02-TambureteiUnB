import pytest
from sqlalchemy import func, select

from app.models.comentario import Comentario
from app.models.disciplina import Disciplina
from app.models.turma import Turma


@pytest.mark.parametrize("rota", ["direta", "cadeira", "listagem"])
def test_endpoint_rejeita_turma_de_outra_disciplina(client, db, disciplina, student_headers, rota):
    outra = Disciplina(codigo="OUT001", nome="Outra disciplina", slug="outra-disciplina-vinculo")
    db.add(outra)
    db.flush()
    turma = Turma(disciplina_id=outra.id, semestre="2026.1", codigo_turma="01")
    db.add(turma)
    db.commit()
    antes = db.scalar(select(func.count()).select_from(Comentario))
    if rota == "listagem":
        resposta = client.get(f"/cadeiras/{disciplina.id}/comentarios", params={"turma_id": turma.id})
    else:
        payload = {"turma_id": turma.id, "conteudo": "Relato válido"}
        caminho = f"/cadeiras/{disciplina.id}/comentarios"
        if rota == "direta":
            payload["disciplina_id"] = disciplina.id
            caminho = "/comentarios"
        resposta = client.post(caminho, json=payload, headers=student_headers)
    assert resposta.status_code == 422, resposta.text
    assert "não pertence" in resposta.json()["detail"]
    assert db.scalar(select(func.count()).select_from(Comentario)) == antes
