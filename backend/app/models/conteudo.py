from sqlalchemy import Column, Integer, BigInteger, String, Text, ForeignKey, DateTime, func, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Conteudo(Base):
    __tablename__ = "conteudos"

    id = Column(BigInteger, primary_key=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    turma_id = Column(Integer, ForeignKey("turmas.id", ondelete="SET NULL"), nullable=True, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    tipo = Column(String(30), nullable=False, index=True) # Inclui ARQUIVO para armazenamento privado
    url_origem = Column(Text, nullable=True)
    caminho_arquivo = Column(String(64), nullable=True, unique=True)
    formato = Column(String(3), nullable=True)
    tamanho_bytes = Column(Integer, nullable=True)
    status_moderacao = Column(String(20), nullable=True)
    semestre = Column(String(10), nullable=True) # Ex: '2024.1'
    status_curadoria = Column(String(20), default="PENDENTE", nullable=False, index=True) # 'PENDENTE', 'APROVADO', 'RECUSADO'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    disciplina = relationship("Disciplina", back_populates="conteudos")
    turma = relationship("Turma", back_populates="conteudos")
    usuario = relationship("Usuario", back_populates="conteudos")

    __table_args__ = (
        CheckConstraint("tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA', 'ARQUIVO')", name="chk_tipo_conteudo"),
        CheckConstraint("status_curadoria IN ('PENDENTE', 'APROVADO', 'RECUSADO')", name="chk_status_curadoria"),
        CheckConstraint(
            "(tipo = 'ARQUIVO' AND url_origem IS NULL "
            "AND caminho_arquivo IS NOT NULL AND formato IS NOT NULL "
            "AND tamanho_bytes IS NOT NULL AND status_moderacao IS NOT NULL) "
            "OR (tipo <> 'ARQUIVO' AND url_origem IS NOT NULL "
            "AND caminho_arquivo IS NULL AND formato IS NULL "
            "AND tamanho_bytes IS NULL AND status_moderacao IS NULL)",
            name="chk_origem_conteudo",
        ),
        CheckConstraint("formato IS NULL OR formato IN ('pdf', 'png', 'jpg')", name="chk_conteudo_formato"),
        CheckConstraint("tamanho_bytes IS NULL OR tamanho_bytes > 0", name="chk_conteudo_tamanho"),
        CheckConstraint("tipo <> 'ARQUIVO' OR length(trim(titulo)) > 0", name="chk_conteudo_titulo"),
        CheckConstraint("status_moderacao IS NULL OR status_moderacao IN ('ativo', 'em_analise', 'bloqueado', 'excluido')", name="chk_conteudo_moderacao"),
        Index(
            "ix_conteudos_arquivos_disciplina_status", "disciplina_id", "tipo",
            "status_curadoria", "status_moderacao", "id",
        )
    )

    def __repr__(self):
        return f"<Conteudo(id={self.id}, titulo='{self.titulo}', tipo='{self.tipo}')>"
