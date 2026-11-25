from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.api.schemas.relato_bug import DecisaoRelatoBug, FilaRelatosBugs, RelatoBugCreate, RelatoBugResponse
from app.models.relato_bug import RelatoBug
from app.models.usuario import Usuario
from app.repositories.relato_bug_repo import relato_bug_repo


class RelatoBugService:
    def criar(self, db: Session, dados: RelatoBugCreate, usuario: Usuario):
        relato = RelatoBug(usuario_id=usuario.id, **dados.model_dump())
        relato_bug_repo.adicionar(db, relato)
        db.commit()
        db.refresh(relato)
        return relato

    def listar(self, db: Session, pagina: int, tamanho: int):
        items, total = relato_bug_repo.pendentes(db, pagina, tamanho)
        return FilaRelatosBugs(
            items=[RelatoBugResponse.model_validate(item) for item in items],
            total=total,
            pagina=pagina,
            tamanho_pagina=tamanho,
        )

    def decidir(self, db: Session, relato_id: int, dados: DecisaoRelatoBug, moderador: Usuario):
        relato = relato_bug_repo.para_decisao(db, relato_id)
        if relato is None:
            raise HTTPException(404, "Relato de problema não encontrado.")
        if relato.status != "PENDENTE":
            raise HTTPException(409, "Este relato já foi avaliado. Atualize a fila.")
        relato.status = dados.status
        relato.justificativa = dados.justificativa
        relato.moderador_id = moderador.id
        relato.resolvido_em = datetime.now(timezone.utc)
        db.commit()
        db.refresh(relato)
        return relato


relato_bug_service = RelatoBugService()
