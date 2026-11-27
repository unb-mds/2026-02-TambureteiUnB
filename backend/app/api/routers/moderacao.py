from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import require_role
from app.api.schemas.curadoria import (
    ComentarioPendente,
    DecisaoComentarioCuradoria,
    DecisaoCuradoria,
    FilaComentariosCuradoria,
    FilaCuradoria,
    RegistroCuradoria,
)
from app.api.schemas.material import MaterialResponse
from app.api.schemas.denuncia import (
    DecisaoDenuncia,
    FilaDenuncias,
    ResumoDecisaoDenuncia,
)
from app.api.schemas.doacao import (
    FilaPizzasModeracao,
    PizzaModeracaoDecisaoRequest,
    PizzaModeracaoDecisaoResponse,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.domain.materiais import TIPOS_MIME
from app.models.usuario import Usuario
from app.services.armazenamento_material import ArmazenamentoMaterial
from app.services.curadoria_service import CuradoriaService
from app.services.denuncia_service import denuncia_service
from app.services.doacao_service import doacao_service

router = APIRouter(prefix="/moderacao", tags=["Moderação"])
Moderador = Annotated[Usuario, Depends(require_role("MODERATOR", "ADMIN"))]
Banco = Annotated[Session, Depends(get_db)]
Identificador = Annotated[int, Path(gt=0)]


def get_curadoria_service() -> CuradoriaService:
    return CuradoriaService(ArmazenamentoMaterial(settings.MATERIALS_DIR, settings.MATERIAL_MAX_BYTES))


Servico = Annotated[CuradoriaService, Depends(get_curadoria_service)]


@router.get("/materiais", response_model=FilaCuradoria)
def fila(db: Banco, moderador: Moderador, servico: Servico,
         pagina: Annotated[int, Query(ge=1)] = 1,
         tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20):
    return servico.listar(db, pagina, tamanho_pagina)


@router.patch("/conteudos/{id}/curadoria", response_model=RegistroCuradoria)
def decidir(id: Identificador, dados: DecisaoCuradoria, db: Banco, moderador: Moderador, servico: Servico):
    return servico.decidir(db, id, dados, moderador)


@router.get("/conteudos/{id}/historico", response_model=list[RegistroCuradoria])
def historico(id: Identificador, db: Banco, moderador: Moderador, servico: Servico):
    return servico.historico(db, id)


@router.get("/materiais/{id}/download", response_class=FileResponse)
def baixar(id: Identificador, db: Banco, moderador: Moderador, servico: Servico):
    conteudo, caminho = servico.baixar(db, id)
    return FileResponse(caminho, media_type=TIPOS_MIME[conteudo.formato], filename=f"material-{conteudo.id}.{conteudo.formato}",
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"})


@router.put(
    "/materiais/{id}/arquivo",
    response_model=MaterialResponse,
    dependencies=[Depends(rate_limit("moderacao:replace_file", limit=20, window_seconds=15 * 60, by_user=True))],
)
def substituir_arquivo_material(
    id: Identificador,
    arquivo: Annotated[UploadFile, File(description="Arquivo editado (PDF, PNG ou JPG; máximo de 5 MiB).")],
    db: Banco,
    moderador: Moderador,
    servico: Servico,
    justificativa: Annotated[str | None, Form()] = None,
) -> MaterialResponse:
    """Permite ao moderador substituir o arquivo de um material (ex: remover nome/matrícula de prova antiga)."""
    return servico.substituir_arquivo(
        db,
        id,
        arquivo.file,
        arquivo.filename or "",
        arquivo.content_type or "",
        moderador,
        justificativa=justificativa,
    )


@router.get("/comentarios", response_model=FilaComentariosCuradoria)
def fila_comentarios(
    db: Banco,
    moderador: Moderador,
    servico: Servico,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return servico.listar_comentarios(db, pagina, tamanho_pagina)


@router.patch("/comentarios/{id}/curadoria", response_model=ComentarioPendente)
def decidir_comentario(
    id: Identificador,
    dados: DecisaoComentarioCuradoria,
    db: Banco,
    moderador: Moderador,
    servico: Servico,
):
    return servico.decidir_comentario(db, id, dados, moderador)


@router.get("/denuncias", response_model=FilaDenuncias)
def fila_denuncias(
    db: Banco,
    moderador: Moderador,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
    tipo: Annotated[str | None, Query()] = None,
    categoria: Annotated[str | None, Query()] = None,
    situacao: Annotated[str | None, Query()] = None,
) -> FilaDenuncias:
    return denuncia_service.listar_fila(db, pagina, tamanho_pagina, tipo, categoria, situacao)


@router.patch("/denuncias/{id}", response_model=ResumoDecisaoDenuncia)
def decidir_denuncia(
    id: Identificador,
    dados: DecisaoDenuncia,
    db: Banco,
    moderador: Moderador,
) -> ResumoDecisaoDenuncia:
    return denuncia_service.decidir(db, id, dados, moderador)


@router.get("/denuncias/{id}/arquivo", response_class=FileResponse)
def baixar_arquivo_denuncia(id: Identificador, db: Banco, moderador: Moderador):
    """Serve o arquivo de um material denunciado para inspeção da moderação."""
    armazenamento = ArmazenamentoMaterial(settings.MATERIALS_DIR, settings.MATERIAL_MAX_BYTES)
    conteudo, caminho = denuncia_service.obter_arquivo_denuncia(db, id, armazenamento)
    return FileResponse(
        caminho,
        media_type=TIPOS_MIME[conteudo.formato],
        filename=f"denuncia-material-{conteudo.id}.{conteudo.formato}",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


@router.get("/pizzas", response_model=FilaPizzasModeracao)
def fila_pizzas(db: Banco, moderador: Moderador) -> FilaPizzasModeracao:
    """Lista submissões de gráficos de pizza pendentes de aprovação humana, agrupadas por semestre."""
    return doacao_service.listar_pizzas_moderacao(db)


@router.get("/pizzas/{id}/imagem", response_class=FileResponse)
def imagem_pizza(id: Identificador, db: Banco, moderador: Moderador):
    """Serve o print anexado pelo estudante para conferência do moderador."""
    caminho, mime = doacao_service.obter_imagem_pizza(db, id)
    return FileResponse(
        caminho,
        media_type=mime,
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


@router.patch("/pizzas/{id}/decisao", response_model=PizzaModeracaoDecisaoResponse)
def decidir_pizza(
    id: Identificador,
    dados: PizzaModeracaoDecisaoRequest,
    db: Banco,
    moderador: Moderador,
) -> PizzaModeracaoDecisaoResponse:
    """Aprova ou descarta submissões de pizza sem intermediação de LLM."""
    return doacao_service.decidir_pizza_moderacao(db, id, dados, moderador)
