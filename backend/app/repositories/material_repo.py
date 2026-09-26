from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.material import Material
from app.repositories.base import BaseRepository


class MaterialRepository(BaseRepository[Material]):
    def __init__(self) -> None:
        super().__init__(Material)

    def get_by_id(self, db: Session, material_id: int) -> Material | None:
        return db.get(Material, material_id)

    def adicionar(self, db: Session, material: Material) -> None:
        """A transação é concluída pelo serviço junto ao armazenamento do arquivo."""
        db.add(material)
        db.flush()
        db.refresh(material)

    def listar_ativos(
        self, db: Session, disciplina_id: int, titulo: str | None, pagina: int, tamanho_pagina: int
    ) -> tuple[list[Material], int]:
        filtros = [Material.disciplina_id == disciplina_id, Material.status_moderacao == "ativo"]
        if titulo:
            filtros.append(Material.titulo.icontains(titulo, autoescape=True))
        total = db.scalar(select(func.count()).select_from(Material).where(*filtros)) or 0
        consulta = (
            select(Material).where(*filtros).order_by(Material.id.desc())
            .offset((pagina - 1) * tamanho_pagina).limit(tamanho_pagina)
        )
        return list(db.scalars(consulta)), total


material_repo = MaterialRepository()
