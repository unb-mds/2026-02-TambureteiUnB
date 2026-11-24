"""limpar_professores_poluidos

Revision ID: 020_limpar_professores_poluidos
Revises: 019_add_historico_amostras
Create Date: 2026-11-24 19:00:00.000000

"""
from typing import Dict, Optional, Sequence, Set, Union
import re
import unicodedata

from alembic import op
import sqlalchemy as sa


revision: str = "020_limpar_professores_poluidos"
down_revision: Union[str, None] = "019_add_historico_amostras"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RE_TITULO_INICIO = re.compile(
    r"^(?:(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+)+",
    re.IGNORECASE,
)
RE_TITULO_MEIO = re.compile(
    r"\b(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+",
    re.IGNORECASE,
)


def _normalizar(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto or "")
    sem_acentos = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", sem_acentos).strip().lower()


def _limpar_nome(nome_bruto: str, nome_disciplina: Optional[str]) -> str:
    nome = " ".join((nome_bruto or "").split()).strip(" ,;-:")
    if not nome:
        return ""
    if nome_disciplina:
        tokens_disc = _normalizar(nome_disciplina).split()
        tokens_orig = nome.split()
        if tokens_disc and len(tokens_orig) > len(tokens_disc):
            tokens_norm = [_normalizar(t) for t in tokens_orig]
            if tokens_norm[: len(tokens_disc)] == tokens_disc:
                nome = " ".join(tokens_orig[len(tokens_disc) :]).strip(" ,;-:")
    match_meio = RE_TITULO_MEIO.search(nome)
    if match_meio and match_meio.start() > 0:
        nome = nome[match_meio.start() :].strip()
    nome = RE_TITULO_INICIO.sub("", nome).strip(" ,;-:")
    nome = " ".join(nome.split()).strip()[:150]
    if nome.isupper():
        nome = nome.title()
    return nome


def upgrade() -> None:
    conn = op.get_bind()

    professores_rows = conn.execute(
        sa.text("SELECT id, nome FROM professores ORDER BY id ASC")
    ).fetchall()
    prof_por_norm: Dict[str, int] = {}
    for pid, pnome in professores_rows:
        chave = _normalizar(pnome)
        if chave and chave not in prof_por_norm:
            prof_por_norm[chave] = pid

    vinculos = conn.execute(
        sa.text(
            """
            SELECT tp.turma_id, tp.professor_id, p.nome AS prof_nome, d.nome AS disc_nome
            FROM turmas_professores tp
            JOIN professores p ON p.id = tp.professor_id
            JOIN turmas t ON t.id = tp.turma_id
            JOIN disciplinas d ON d.id = t.disciplina_id
            """
        )
    ).fetchall()

    poluidos_ids: Set[int] = set()
    for turma_id, prof_id, prof_nome, disc_nome in vinculos:
        limpo = _limpar_nome(prof_nome, disc_nome)
        if not limpo or limpo == prof_nome:
            continue

        chave_limpa = _normalizar(limpo)
        alvo_id = prof_por_norm.get(chave_limpa)

        if alvo_id is not None and alvo_id != prof_id:
            existe_vinculo = conn.execute(
                sa.text(
                    "SELECT 1 FROM turmas_professores "
                    "WHERE turma_id = :tid AND professor_id = :pid"
                ),
                {"tid": turma_id, "pid": alvo_id},
            ).first()
            if not existe_vinculo:
                conn.execute(
                    sa.text(
                        "INSERT INTO turmas_professores (turma_id, professor_id) "
                        "VALUES (:tid, :pid)"
                    ),
                    {"tid": turma_id, "pid": alvo_id},
                )
            conn.execute(
                sa.text(
                    "DELETE FROM turmas_professores "
                    "WHERE turma_id = :tid AND professor_id = :pid"
                ),
                {"tid": turma_id, "pid": prof_id},
            )
            poluidos_ids.add(prof_id)
        else:
            conn.execute(
                sa.text("UPDATE professores SET nome = :nome WHERE id = :pid"),
                {"nome": limpo, "pid": prof_id},
            )
            prof_por_norm[chave_limpa] = prof_id

    for pid in poluidos_ids:
        ainda_usado = conn.execute(
            sa.text("SELECT 1 FROM turmas_professores WHERE professor_id = :pid LIMIT 1"),
            {"pid": pid},
        ).first()
        if not ainda_usado:
            conn.execute(
                sa.text("DELETE FROM professores WHERE id = :pid"),
                {"pid": pid},
            )


def downgrade() -> None:
    pass
