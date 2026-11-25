from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.schemas.doacao import DoacaoCreate, DoacaoResponse
from app.api.schemas.turma import TurmaCreate, TurmaResponse
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.doacao_service import doacao_service
from app.services.turma_service import turma_service
from app.api.schemas.quorum import QuorumProgressoResponse

router = APIRouter(prefix="/turmas", tags=["Turmas"])


@router.post("", response_model=TurmaResponse, status_code=status.HTTP_201_CREATED)
def criar_turma(
    dados: TurmaCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role("ADMIN")),
):
    return turma_service.criar_turma(db, dados)


@router.get("", response_model=List[TurmaResponse])
def listar_turmas_da_disciplina(
    disciplina_id: Optional[int] = Query(None, description="ID da disciplina"),
    disciplina_slug: Optional[str] = Query(None, description="Slug da disciplina"),
    slug: Optional[str] = Query(None, description="Slug da disciplina (alias)"),
    semestre: Optional[str] = Query(None, description="Ex.: 2026.1"),
    db: Session = Depends(get_db),
):
    target_slug = disciplina_slug or slug
    return turma_service.listar_turmas(
        db,
        disciplina_id=disciplina_id,
        disciplina_slug=target_slug,
        semestre=semestre,
    )


@router.get("/semestres", response_model=List[str])
def listar_semestres_ofertados(db: Session = Depends(get_db)):
    return turma_service.listar_semestres(db)


@router.get("/{turma_id}", response_model=TurmaResponse)
def obter_turma(turma_id: int, db: Session = Depends(get_db)):
    return turma_service.obter_por_id(db, turma_id)


@router.post(
    "/{turma_id}/doacoes",
    response_model=DoacaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def doar_estatistica_turma(
    turma_id: int,
    dados: DoacaoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("STUDENT")),
):
    """
    Envia doação colaborativa de estatísticas de turma extraídas do SIGAA .
    Acessível exclusivamente por estudantes autenticados.
    """
    return doacao_service.criar_doacao(db, turma_id, current_user.id, dados)


@router.post(
    "/{turma_id}/doacoes/upload",
    response_model=DoacaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def doar_estatistica_turma_upload(
    turma_id: int,
    semestre_referencia: str = Form(..., description="Semestre letivo de referência"),
    taxa_aprovacao: Optional[str] = Form(None),
    taxa_reprovacao_nota: Optional[str] = Form(None),
    taxa_reprovacao_falta: Optional[str] = Form(None),
    taxa_trancamento: Optional[str] = Form(None),
    arquivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("STUDENT", "MODERATOR", "ADMIN")),
):
    """
    Submete estatísticas de turma (com imagem do SIGAA e/ou percentuais manuais)
    para aprovação na fila de moderação humana, sem LLM.
    """
    return doacao_service.criar_doacao_upload(
        db=db,
        turma_id=turma_id,
        usuario_id=current_user.id,
        semestre_referencia=semestre_referencia,
        arquivo=arquivo,
        taxa_aprovacao=taxa_aprovacao,
        taxa_reprovacao_nota=taxa_reprovacao_nota,
        taxa_reprovacao_falta=taxa_reprovacao_falta,
        taxa_trancamento=taxa_trancamento,
    )

@router.get("/{turma_id}/doacoes/quorum", response_model=QuorumProgressoResponse)
def consultar_quorum_turma(
    turma_id: int,
    semestre: Optional[str] = Query(None, description="Semestre de referência (padrão: semestre da turma)"),
    db: Session = Depends(get_db),
    _admin=Depends(require_role("ADMIN")),
):
    """Progresso do quórum de doações por valor . Somente administradores."""
    return doacao_service.consultar_quorum(db, turma_id, semestre)