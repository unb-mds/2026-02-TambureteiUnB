from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.turma import TurmaCreate
from app.models.turma import Turma
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.professor_repo import professor_repo
from app.repositories.turma_repo import turma_repo


class TurmaService:
    def criar_turma(self, db: Session, dados: TurmaCreate) -> Turma:
        # 1. Disciplina precisa existir
        if not disciplina_repo.get_by_id(db, dados.disciplina_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

        # 2. Todos os professores informados precisam existir
        ids = dados.professores_ids
        professores = professor_repo.get_by_ids(db, ids)
        if len(professores) != len(ids):
            faltando = sorted(set(ids) - {p.id for p in professores})
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail=f"Professor(es) não encontrado(s): {faltando}",
            )

        # 3. Não pode haver turma duplicada (mesma disciplina, código e semestre)
        if turma_repo.get_duplicada(db, dados.disciplina_id, dados.codigo_turma, dados.semestre):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Já existe uma turma com esse código nessa disciplina e semestre.",
            )

        # 4. Instanciação e persistência
        nova_turma = Turma(
            disciplina_id=dados.disciplina_id,
            semestre=dados.semestre,
            codigo_turma=dados.codigo_turma,
            horario=dados.horario,
            local=dados.local,
            professores=professores,
        )
        return turma_repo.create(db, nova_turma)

    def listar_por_disciplina(self, db: Session, disciplina_id: int, semestre: Optional[str] = None) -> List[Turma]:
        if not disciplina_repo.get_by_id(db, disciplina_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")
        return turma_repo.get_by_disciplina(db, disciplina_id, semestre)

    def obter_por_id(self, db: Session, turma_id: int) -> Turma:
        turma = turma_repo.get_turma_com_professores(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")
        return turma


turma_service = TurmaService()