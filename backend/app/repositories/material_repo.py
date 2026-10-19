from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.conteudo import Conteudo
from app.repositories.base import BaseRepository


class MaterialRepository(BaseRepository[Conteudo]):
    def __init__(self) -> None:
        super().__init__(Conteudo)

    def get_by_id(self, db: Session, material_id: int) -> Conteudo | None:
        return db.scalar(select(Conteudo).where(Conteudo.id == material_id, Conteudo.tipo == "ARQUIVO"))

    def adicionar(self, db: Session, material: Conteudo) -> None:
        """A transação é concluída pelo serviço junto ao armazenamento do arquivo."""
        db.add(material)
        db.flush()
        db.refresh(material)

    def listar_ativos(
        self, db: Session, disciplina_id: int, titulo: str | None, pagina: int, tamanho_pagina: int
    ) -> tuple[list[Conteudo], int]:
        filtros = [
            Conteudo.disciplina_id == disciplina_id,
            Conteudo.tipo == "ARQUIVO",
            Conteudo.status_curadoria == "APROVADO",
            Conteudo.status_moderacao == "ativo",
        ]
        if titulo:
            filtros.append(Conteudo.titulo.icontains(titulo, autoescape=True))
        total = db.scalar(select(func.count()).select_from(Conteudo).where(*filtros)) or 0
        consulta = (
            select(Conteudo).where(*filtros).order_by(Conteudo.id.desc())
            .offset((pagina - 1) * tamanho_pagina).limit(tamanho_pagina)
        )
        return list(db.scalars(consulta)), total


material_repo = MaterialRepository()
