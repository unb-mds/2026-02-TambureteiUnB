from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from app.models.conteudo import Conteudo
from app.models.curadoria import Curadoria
from app.repositories.base import BaseRepository


class CuradoriaRepository(BaseRepository[Curadoria]):
    def __init__(self) -> None:
        super().__init__(Curadoria)

    def listar_pendentes(self, db: Session, pagina: int, tamanho: int) -> tuple[list[Conteudo], int]:
        filtros = (
            Conteudo.caminho_arquivo.isnot(None),
            Conteudo.status_curadoria == "PENDENTE",
            Conteudo.status_moderacao.in_(["ativo", "em_analise"]),
        )
        total = db.scalar(select(func.count()).select_from(Conteudo).where(*filtros)) or 0
        consulta = (select(Conteudo).options(joinedload(Conteudo.disciplina)).where(*filtros)
                    .order_by(Conteudo.created_at, Conteudo.id).offset((pagina - 1) * tamanho).limit(tamanho))
        return list(db.scalars(consulta)), total

    def obter_arquivo(self, db: Session, conteudo_id: int, bloquear: bool = False) -> Conteudo | None:
        consulta = select(Conteudo).where(Conteudo.id == conteudo_id, Conteudo.caminho_arquivo.isnot(None))
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return db.scalar(consulta)

    def registrar(self, db: Session, registro: Curadoria) -> None:
        db.add(registro)
        db.flush()
        db.refresh(registro)

    def historico(self, db: Session, conteudo_id: int) -> list[Curadoria]:
        return list(db.scalars(select(Curadoria).where(Curadoria.conteudo_id == conteudo_id).order_by(Curadoria.id)))


curadoria_repo = CuradoriaRepository()
