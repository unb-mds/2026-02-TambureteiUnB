from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.repositories.base import BaseRepository

class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self):
        super().__init__(Usuario)

    def get_by_email(self, db: Session, email: str) -> Optional[Usuario]:
        return db.query(Usuario).filter(Usuario.email == email).first()

    def get_by_id(self, db: Session, id: UUID) -> Optional[Usuario]:
        return db.query(Usuario).filter(Usuario.id == id).first()

usuario_repo = UsuarioRepository()
