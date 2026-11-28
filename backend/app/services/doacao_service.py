from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.schemas.doacao import (
    DoacaoCreate,
    FilaPizzasModeracao,
    PizzaModeracaoDecisaoRequest,
    PizzaModeracaoDecisaoResponse,
    PizzaModeracaoItemResponse,
    PizzaModeracaoSemestreGrupo,
    _parse_taxa_decimal,
    _validar_soma_cem,
)
from app.api.schemas.historico import (
    TurmaStatusConsultaItem,
    TurmaStatusConsultaResponseItem,
)
from app.api.schemas.quorum import GrupoQuorum, QuorumProgressoResponse
from app.core.config import settings
from app.domain.materiais import (
    TIPOS_MIME,
    ArquivoMuitoGrande,
    ArquivoVazio,
    FormatoNaoSuportado,
)
from app.domain.semestre import semestre_valido
from app.models.disciplina import Disciplina
from app.models.doacao import DoacaoEstatistica
from app.models.usuario import Usuario
from app.repositories.doacao_repo import doacao_repo
from app.repositories.turma_repo import turma_repo
from app.domain.quorum import GrupoValores, escolher_vencedor
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.turma import Turma
from app.repositories.estatistica_repo import estatistica_repo
from app.services.armazenamento_material import ArmazenamentoMaterial
from app.services.notificacao_service import notificacao_service
from app.services.historico_importacao_service import (
    _limpar_nome_professor,
    _normalizar_codigo_turma,
    _parse_ano_semestre,
    historico_importacao_service,
)
from app.services.historico_parser_service import _normalizar_para_busca

MSG_SEMESTRE_INVALIDO = "O semestre deve seguir o padrão canônico da UnB (exemplo: 2026.1 ou 2026.2)."


class DoacaoService:
    # Mantém compatibilidade com os testes unitários existentes.
    _escolher_vencedor = staticmethod(escolher_vencedor)

    @staticmethod
    def _pizza_storage() -> ArmazenamentoMaterial:
        return ArmazenamentoMaterial(settings.PIZZAS_DIR, settings.MATERIAL_MAX_BYTES)

    @staticmethod
    def _validar_turma_semestre_duplicata(
        db: Session,
        turma_id: int,
        usuario_id: UUID,
        semestre_referencia: str,
    ) -> Turma:
        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

        if semestre_referencia != turma.semestre:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"O semestre da doação deve ser o mesmo da turma ({turma.semestre}).",
            )

        oficial = estatistica_repo.get_by_turma_e_semestre(db, turma_id, semestre_referencia)
        if (oficial is not None and oficial.origem == "DOACAO_QUORUM"
                and doacao_repo.tem_recusa(db, usuario_id, turma_id, semestre_referencia)):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Esta turma já possui estatística de pizza publicada.",
            )

        if doacao_repo.get_duplicada(db, usuario_id, turma_id, semestre_referencia):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Você já realizou uma doação de estatísticas para esta turma neste semestre.",
            )

        return turma

    def criar_doacao(
        self,
        db: Session,
        turma_id: int,
        usuario_id: UUID,
        dados: DoacaoCreate,
    ) -> DoacaoEstatistica:
        """Registra submissão manual (TEXTO) na fila de moderação humana, sem LLM."""
        self._validar_turma_semestre_duplicata(db, turma_id, usuario_id, dados.semestre_referencia)

        nova_doacao = DoacaoEstatistica(
            turma_id=turma_id,
            usuario_id=usuario_id,
            semestre_referencia=dados.semestre_referencia,
            taxa_aprovacao=dados.taxa_aprovacao,
            taxa_reprovacao_nota=dados.taxa_reprovacao_nota,
            taxa_reprovacao_falta=dados.taxa_reprovacao_falta,
            taxa_trancamento=dados.taxa_trancamento,
            tipo_envio="TEXTO",
            status="PENDENTE",
        )
        doacao_repo.adicionar(db, nova_doacao)
        db.commit()
        db.refresh(nova_doacao)
        return nova_doacao

    def criar_doacao_upload(
        self,
        db: Session,
        turma_id: int,
        usuario_id: UUID,
        semestre_referencia: str,
        arquivo: Optional[UploadFile] = None,
        taxa_aprovacao: Optional[str] = None,
        taxa_reprovacao_nota: Optional[str] = None,
        taxa_reprovacao_falta: Optional[str] = None,
        taxa_trancamento: Optional[str] = None,
    ) -> DoacaoEstatistica:
        """
        Registra submissão de gráfico de pizza (com print ou apenas texto manual)
        diretamente para a fila de moderação, sem intermediação de LLM.
        """
        semestre_limpo = (semestre_referencia or "").strip()
        if not semestre_valido(semestre_limpo):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=MSG_SEMESTRE_INVALIDO)

        self._validar_turma_semestre_duplicata(db, turma_id, usuario_id, semestre_limpo)

        brutos = (taxa_aprovacao, taxa_reprovacao_nota, taxa_reprovacao_falta, taxa_trancamento)
        algum_preenchido = any(v is not None and str(v).strip() != "" for v in brutos)
        todos_preenchidos = all(v is not None and str(v).strip() != "" for v in brutos)

        taxas_decimais: Optional[Tuple[Decimal, Decimal, Decimal, Decimal]] = None
        if algum_preenchido:
            if not todos_preenchidos:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Informe todos os 4 percentuais do gráfico ou deixe todos em branco ao enviar apenas a imagem.",
                )
            try:
                t_apr = _parse_taxa_decimal(taxa_aprovacao)
                t_rep = _parse_taxa_decimal(taxa_reprovacao_nota)
                t_falta = _parse_taxa_decimal(taxa_reprovacao_falta)
                t_tranc = _parse_taxa_decimal(taxa_trancamento)
                taxas_decimais = _validar_soma_cem(t_apr, t_rep, t_falta, t_tranc)
            except ValueError as exc:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

        tem_arquivo = arquivo is not None and bool((arquivo.filename or "").strip())
        storage = self._pizza_storage()
        imagem_chave: Optional[str] = None
        imagem_mime: Optional[str] = None

        if tem_arquivo and arquivo is not None:
            try:
                chave, formato, _ = storage.salvar(
                    arquivo.file,
                    arquivo.filename or "pizza.png",
                    arquivo.content_type or "",
                )
            except (ArquivoVazio, FormatoNaoSuportado) as exc:
                raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc
            except ArquivoMuitoGrande as exc:
                raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail=str(exc)) from exc

            if formato not in {"png", "jpg"}:
                try:
                    storage.remover(chave)
                except FileNotFoundError:
                    pass
                raise HTTPException(
                    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Envie apenas imagem PNG ou JPG do gráfico de pizza.",
                )

            imagem_chave = chave
            imagem_mime = TIPOS_MIME[formato]
            tipo_envio = "IMAGEM"
        else:
            if taxas_decimais is None:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Anexe a imagem do gráfico do SIGAA ou informe os 4 percentuais (somando 100%).",
                )
            tipo_envio = "TEXTO"

        nova_doacao = DoacaoEstatistica(
            turma_id=turma_id,
            usuario_id=usuario_id,
            semestre_referencia=semestre_limpo,
            taxa_aprovacao=taxas_decimais[0] if taxas_decimais else None,
            taxa_reprovacao_nota=taxas_decimais[1] if taxas_decimais else None,
            taxa_reprovacao_falta=taxas_decimais[2] if taxas_decimais else None,
            taxa_trancamento=taxas_decimais[3] if taxas_decimais else None,
            tipo_envio=tipo_envio,
            imagem_chave=imagem_chave,
            imagem_mime=imagem_mime,
            status="PENDENTE",
        )
        try:
            doacao_repo.adicionar(db, nova_doacao)
            db.commit()
            db.refresh(nova_doacao)
        except Exception:
            db.rollback()
            if imagem_chave:
                try:
                    storage.remover(imagem_chave)
                except FileNotFoundError:
                    pass
            raise
        return nova_doacao

    @staticmethod
    def _sincronizar_metricas_disciplina(db: Session, turma_id: int, semestre_referencia: str) -> None:
        if not isinstance(db, Session):
            return
        turma = turma_repo.get_by_id(db, turma_id)
        ano_sem = _parse_ano_semestre(semestre_referencia)
        if turma is not None and ano_sem is not None:
            historico_importacao_service._recalcular_metricas_disciplina(
                db, turma.disciplina_id, {ano_sem}
            )

    def avaliar_consenso(self, db: Session, turma_id: int, semestre_referencia: str) -> None:
        """
        Se já existe estatística oficial consolidada pelo quórum de pizza (DOACAO_QUORUM),
        ela fica congelada e apenas realinha o status das doações.
        Caso só exista estatística gerada por históricos (HISTORICO_SIGAA) ou nenhuma,
        o quórum da pizza prevalece e substitui os dados anteriores. O commit é de quem chama.
        """
        oficial = estatistica_repo.get_by_turma_e_semestre(db, turma_id, semestre_referencia)
        if oficial is not None and getattr(oficial, "origem", "DOACAO_QUORUM") == "DOACAO_QUORUM":
            doacao_repo.definir_consolidadas(db, turma_id, semestre_referencia, self._grupo_da_oficial(oficial))
            return

        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre_referencia)
        vencedor = escolher_vencedor(grupos, settings.QUORUM_MINIMO_DOACOES)
        if vencedor is not None:
            doacao_repo.definir_consolidadas(db, turma_id, semestre_referencia, vencedor)
            estatistica_repo.salvar(db, turma_id, semestre_referencia, vencedor)
            self._sincronizar_metricas_disciplina(db, turma_id, semestre_referencia)
        elif oficial is None:
            doacao_repo.definir_consolidadas(db, turma_id, semestre_referencia, None)

    def recalcular_oficial(
        self, db: Session, turma_id: int, semestre_referencia: Optional[str] = None
    ) -> EstatisticaConsolidada:
        """Ação administrativa: refaz a votação e substitui a oficial. Sem vencedor, não altera nada."""
        semestre = self._resolver_semestre(db, turma_id, semestre_referencia)
        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre)
        vencedor = escolher_vencedor(grupos, settings.QUORUM_MINIMO_DOACOES)
        if vencedor is None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Não é possível consolidar: nenhum grupo de doações atingiu o quórum mínimo sem empate.",
            )
        doacao_repo.definir_consolidadas(db, turma_id, semestre, vencedor)
        oficial = estatistica_repo.salvar(db, turma_id, semestre, vencedor)
        self._sincronizar_metricas_disciplina(db, turma_id, semestre)
        db.commit()
        db.refresh(oficial)
        return oficial

    def listar_consolidadas(
        self,
        db: Session,
        turma_id: Optional[int],
        disciplina_id: Optional[int],
        semestre_referencia: Optional[str],
        page: int,
        size: int,
    ) -> List[EstatisticaConsolidada]:
        if semestre_referencia is not None and not semestre_valido(semestre_referencia):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=MSG_SEMESTRE_INVALIDO)
        return estatistica_repo.listar(
            db, turma_id, disciplina_id, semestre_referencia, skip=(page - 1) * size, limit=size
        )

    def _resolver_semestre(self, db: Session, turma_id: int, semestre_referencia: Optional[str]) -> str:
        if semestre_referencia is not None and not semestre_valido(semestre_referencia):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=MSG_SEMESTRE_INVALIDO)
        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")
        return semestre_referencia or turma.semestre

    @staticmethod
    def _grupo_da_oficial(oficial: EstatisticaConsolidada) -> GrupoValores:
        return GrupoValores(
            taxa_aprovacao=oficial.taxa_aprovacao,
            taxa_reprovacao_nota=oficial.taxa_reprovacao_nota,
            taxa_reprovacao_falta=oficial.taxa_reprovacao_falta,
            taxa_trancamento=oficial.taxa_trancamento,
            quantidade=0,
        )

    def consultar_quorum(
        self,
        db: Session,
        turma_id: int,
        semestre_referencia: Optional[str] = None,
    ) -> QuorumProgressoResponse:
        if semestre_referencia is not None and not semestre_valido(semestre_referencia):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=MSG_SEMESTRE_INVALIDO)

        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

        semestre = semestre_referencia or turma.semestre
        quorum = settings.QUORUM_MINIMO_DOACOES
        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre)

        # "consolidado" reflete o estado persistido, não um recálculo em memória.
        grupos_resp: List[GrupoQuorum] = [
            GrupoQuorum(
                taxa_aprovacao=float(g.taxa_aprovacao),
                taxa_reprovacao_nota=float(g.taxa_reprovacao_nota),
                taxa_reprovacao_falta=float(g.taxa_reprovacao_falta),
                taxa_trancamento=float(g.taxa_trancamento),
                quantidade=g.quantidade,
                atingiu_quorum=g.quantidade >= quorum,
                consolidado=g.consolidadas > 0,
            )
            for g in grupos
        ]
        return QuorumProgressoResponse(
            turma_id=turma_id,
            semestre_referencia=semestre,
            quorum_minimo=quorum,
            consolidado=any(g.consolidado for g in grupos_resp),
            grupos=grupos_resp,
        )

    @staticmethod
    def _nomes_professores_normalizados(nomes: List[str]) -> Set[str]:
        resultado: Set[str] = set()
        for nome in nomes:
            limpo = _normalizar_para_busca(_limpar_nome_professor(nome))
            if limpo:
                resultado.add(limpo)
        return resultado

    def consultar_status_turmas_usuario(
        self,
        db: Session,
        usuario_id: UUID,
        itens: List[TurmaStatusConsultaItem],
    ) -> List[TurmaStatusConsultaResponseItem]:
        """
        Resolve o ID real de cada turma do histórico e informa em lote quais já possuem
        estatística consolidada por gráfico de pizza (DOACAO_QUORUM), por histórico (HISTORICO_SIGAA)
        ou doação já enviada pelo estudante atual.
        """
        if not itens:
            return []

        codigos = sorted({i.codigo.strip().upper() for i in itens if i.codigo and i.codigo.strip()})
        semestres = sorted({i.semestre.strip() for i in itens if i.semestre and i.semestre.strip()})

        disciplinas_por_codigo: Dict[str, Disciplina] = {}
        if codigos:
            for d in (
                db.query(Disciplina)
                .filter(func.upper(Disciplina.codigo).in_(codigos))
                .all()
            ):
                if d.codigo:
                    disciplinas_por_codigo[d.codigo.strip().upper()] = d

        disc_ids = [d.id for d in disciplinas_por_codigo.values()]
        turmas_por_disc_sem: Dict[Tuple[int, str], List[Turma]] = {}
        turma_ids: List[int] = []

        if disc_ids and semestres:
            turmas = (
                db.query(Turma)
                .options(selectinload(Turma.professores))
                .filter(
                    Turma.disciplina_id.in_(disc_ids),
                    Turma.semestre.in_(semestres),
                )
                .all()
            )
            for t in turmas:
                turma_ids.append(t.id)
                turmas_por_disc_sem.setdefault((t.disciplina_id, t.semestre), []).append(t)

        ec_por_chave: Dict[Tuple[int, str], EstatisticaConsolidada] = {}
        doacoes_usuario_chaves: Set[Tuple[int, str]] = set()

        if turma_ids and semestres:
            for ec in (
                db.query(EstatisticaConsolidada)
                .filter(
                    EstatisticaConsolidada.turma_id.in_(turma_ids),
                    EstatisticaConsolidada.semestre_referencia.in_(semestres),
                )
                .all()
            ):
                ec_por_chave[(ec.turma_id, ec.semestre_referencia)] = ec

            for doa in (
                db.query(DoacaoEstatistica)
                .filter(
                    DoacaoEstatistica.usuario_id == usuario_id,
                    DoacaoEstatistica.turma_id.in_(turma_ids),
                    DoacaoEstatistica.semestre_referencia.in_(semestres),
                    DoacaoEstatistica.status != "DESCARTADA",
                )
                .all()
            ):
                doacoes_usuario_chaves.add((doa.turma_id, doa.semestre_referencia))

        respostas: List[TurmaStatusConsultaResponseItem] = []
        for item in itens:
            cod_upper = (item.codigo or "").strip().upper()
            sem_limpo = (item.semestre or "").strip()
            turma_raw = (item.turma or "").strip().upper()
            turma_norm = _normalizar_codigo_turma(item.turma) or turma_raw

            disc = disciplinas_por_codigo.get(cod_upper)
            if disc is None:
                respostas.append(
                    TurmaStatusConsultaResponseItem(
                        codigo=cod_upper,
                        turma=item.turma,
                        semestre=sem_limpo,
                    )
                )
                continue

            candidatas = turmas_por_disc_sem.get((disc.id, sem_limpo), [])
            turma_match: Optional[Turma] = None

            # 1. Prioriza correspondencia pelo codigo normalizado da turma
            for cand in candidatas:
                cand_cod = (cand.codigo_turma or "").strip().upper()
                cand_norm = _normalizar_codigo_turma(cand.codigo_turma) or cand_cod
                if cand_cod == turma_raw or cand_norm == turma_norm:
                    turma_match = cand
                    break

            ja_possui_pizza = False
            ja_possui_historico = False
            ja_enviada_usuario = False

            if turma_match is not None:
                ec = ec_por_chave.get((turma_match.id, sem_limpo))
                if ec is not None:
                    if ec.origem == "DOACAO_QUORUM":
                        ja_possui_pizza = True
                    elif ec.origem == "HISTORICO_SIGAA" and not ec.amostragem_suprimida_lgpd:
                        ja_possui_historico = True
                ja_enviada_usuario = (turma_match.id, sem_limpo) in doacoes_usuario_chaves

            respostas.append(
                TurmaStatusConsultaResponseItem(
                    codigo=cod_upper,
                    turma=item.turma,
                    semestre=sem_limpo,
                    turma_id=turma_match.id if turma_match is not None else None,
                    ja_possui_pizza=ja_possui_pizza,
                    ja_possui_historico=ja_possui_historico,
                    ja_enviada_usuario=ja_enviada_usuario,
                )
            )

        return respostas

    def listar_pizzas_moderacao(self, db: Session) -> FilaPizzasModeracao:
        """
        Lista submissões pendentes de gráficos de pizza agrupadas por semestre (mais recente primeiro).
        - Envios com imagem são individuais e já elegíveis à revisão visual.
        - Envios manuais sem imagem são agrupados por valores idênticos na turma/semestre
          e recebem selo verde quando há pelo menos MIN_OUTROS_FORMULARIOS_IGUAIS_PIZZA outros iguais.
        """
        pendentes = (
            db.query(DoacaoEstatistica)
            .options(
                selectinload(DoacaoEstatistica.turma).selectinload(Turma.disciplina),
                selectinload(DoacaoEstatistica.turma).selectinload(Turma.professores),
            )
            .filter(DoacaoEstatistica.status == "PENDENTE")
            .order_by(DoacaoEstatistica.created_at.asc(), DoacaoEstatistica.id.asc())
            .all()
        )

        minimo_outros = settings.MIN_OUTROS_FORMULARIOS_IGUAIS_PIZZA
        itens_finais: List[PizzaModeracaoItemResponse] = []
        grupos_texto: Dict[Tuple, List[DoacaoEstatistica]] = {}

        for d in pendentes:
            if d.turma is None or d.turma.disciplina is None:
                continue
            if d.tipo_envio == "IMAGEM" or d.imagem_chave:
                disc = d.turma.disciplina
                itens_finais.append(
                    PizzaModeracaoItemResponse(
                        id=d.id,
                        turma_id=d.turma_id,
                        codigo_turma=d.turma.codigo_turma,
                        semestre_referencia=d.semestre_referencia,
                        disciplina_id=disc.id,
                        disciplina_codigo=disc.codigo or "",
                        disciplina_nome=disc.nome,
                        disciplina_slug=disc.slug,
                        professores=[p.nome for p in (d.turma.professores or [])],
                        tipo_envio="IMAGEM",
                        possui_imagem=bool(d.imagem_chave),
                        taxa_aprovacao=float(d.taxa_aprovacao) if d.taxa_aprovacao is not None else None,
                        taxa_reprovacao_nota=float(d.taxa_reprovacao_nota) if d.taxa_reprovacao_nota is not None else None,
                        taxa_reprovacao_falta=float(d.taxa_reprovacao_falta) if d.taxa_reprovacao_falta is not None else None,
                        taxa_trancamento=float(d.taxa_trancamento) if d.taxa_trancamento is not None else None,
                        quantidade_envios=1,
                        outros_iguais=0,
                        minimo_outros_iguais=minimo_outros,
                        selo_verde=True,
                        created_at=d.created_at,
                    )
                )
            else:
                chave_texto = (
                    d.turma_id,
                    d.semestre_referencia,
                    d.taxa_aprovacao,
                    d.taxa_reprovacao_nota,
                    d.taxa_reprovacao_falta,
                    d.taxa_trancamento,
                )
                grupos_texto.setdefault(chave_texto, []).append(d)

        for grupo in grupos_texto.values():
            rep = grupo[0]
            disc = rep.turma.disciplina
            total_envios = len(grupo)
            outros_iguais = max(0, total_envios - 1)
            itens_finais.append(
                PizzaModeracaoItemResponse(
                    id=rep.id,
                    turma_id=rep.turma_id,
                    codigo_turma=rep.turma.codigo_turma,
                    semestre_referencia=rep.semestre_referencia,
                    disciplina_id=disc.id,
                    disciplina_codigo=disc.codigo or "",
                    disciplina_nome=disc.nome,
                    disciplina_slug=disc.slug,
                    professores=[p.nome for p in (rep.turma.professores or [])],
                    tipo_envio="TEXTO",
                    possui_imagem=False,
                    taxa_aprovacao=float(rep.taxa_aprovacao) if rep.taxa_aprovacao is not None else None,
                    taxa_reprovacao_nota=float(rep.taxa_reprovacao_nota) if rep.taxa_reprovacao_nota is not None else None,
                    taxa_reprovacao_falta=float(rep.taxa_reprovacao_falta) if rep.taxa_reprovacao_falta is not None else None,
                    taxa_trancamento=float(rep.taxa_trancamento) if rep.taxa_trancamento is not None else None,
                    quantidade_envios=total_envios,
                    outros_iguais=outros_iguais,
                    minimo_outros_iguais=minimo_outros,
                    selo_verde=outros_iguais >= minimo_outros,
                    created_at=rep.created_at,
                )
            )

        por_semestre: Dict[str, List[PizzaModeracaoItemResponse]] = {}
        for item in itens_finais:
            por_semestre.setdefault(item.semestre_referencia, []).append(item)

        def _chave_ordenacao_semestre(sem: str) -> Tuple[int, int, str]:
            parsed = _parse_ano_semestre(sem)
            if parsed:
                return (parsed[0], parsed[1], sem)
            return (0, 0, sem)

        semestres_ordenados = sorted(
            por_semestre.keys(),
            key=_chave_ordenacao_semestre,
            reverse=True,
        )

        grupos_semestre: List[PizzaModeracaoSemestreGrupo] = []
        for sem in semestres_ordenados:
            itens_sem = sorted(
                por_semestre[sem],
                key=lambda x: (not x.selo_verde, -x.quantidade_envios, x.created_at, x.id),
            )
            grupos_semestre.append(
                PizzaModeracaoSemestreGrupo(
                    semestre=sem,
                    total=len(itens_sem),
                    itens=itens_sem,
                )
            )

        return FilaPizzasModeracao(
            grupos_semestre=grupos_semestre,
            total_itens=len(itens_finais),
            total_envios_pendentes=len(pendentes),
        )

    def obter_imagem_pizza(self, db: Session, doacao_id: int) -> Tuple[Path, str]:
        doacao = db.query(DoacaoEstatistica).filter(DoacaoEstatistica.id == doacao_id).first()
        if not doacao or not doacao.imagem_chave:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail="Imagem da submissão não encontrada.",
            )
        try:
            caminho = self._pizza_storage().localizar(doacao.imagem_chave)
        except FileNotFoundError as exc:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail="Arquivo de imagem indisponível.",
            ) from exc
        return caminho, doacao.imagem_mime or "image/png"

    def decidir_pizza_moderacao(
        self,
        db: Session,
        doacao_id: int,
        dados: PizzaModeracaoDecisaoRequest,
        moderador: Usuario,
    ) -> PizzaModeracaoDecisaoResponse:
        doacao = db.query(DoacaoEstatistica).filter(DoacaoEstatistica.id == doacao_id).first()
        if not doacao:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submissão de pizza não encontrada.")
        if doacao.status != "PENDENTE":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Esta submissão de pizza já foi avaliada por outro moderador.",
            )

        if doacao.tipo_envio == "IMAGEM" or doacao.imagem_chave:
            grupo_pendentes = [doacao]
            tipo_efetivo = "IMAGEM"
        else:
            grupo_pendentes = (
                db.query(DoacaoEstatistica)
                .filter(
                    DoacaoEstatistica.turma_id == doacao.turma_id,
                    DoacaoEstatistica.semestre_referencia == doacao.semestre_referencia,
                    DoacaoEstatistica.tipo_envio == "TEXTO",
                    DoacaoEstatistica.status == "PENDENTE",
                    DoacaoEstatistica.taxa_aprovacao == doacao.taxa_aprovacao,
                    DoacaoEstatistica.taxa_reprovacao_nota == doacao.taxa_reprovacao_nota,
                    DoacaoEstatistica.taxa_reprovacao_falta == doacao.taxa_reprovacao_falta,
                    DoacaoEstatistica.taxa_trancamento == doacao.taxa_trancamento,
                )
                .all()
            )
            tipo_efetivo = "TEXTO"

        agora = datetime.now(timezone.utc)
        justificativa = (dados.justificativa or "").strip() or None

        disciplina_nome_notif: Optional[str] = None
        disciplina_link_notif = "/perfil"
        if isinstance(db, Session):
            turma_ref = (
                db.query(Turma)
                .options(selectinload(Turma.disciplina))
                .filter(Turma.id == doacao.turma_id)
                .first()
            )
            if turma_ref is not None and turma_ref.disciplina is not None:
                disciplina_nome_notif = turma_ref.disciplina.nome
                disciplina_link_notif = f"/disciplinas/{turma_ref.disciplina.slug}"

        contexto_pizza = (
            f"{disciplina_nome_notif} ({doacao.semestre_referencia})"
            if disciplina_nome_notif
            else f"semestre {doacao.semestre_referencia}"
        )

        if dados.status == "DESCARTADA":
            for item in grupo_pendentes:
                item.status = "DESCARTADA"
                item.moderado_por_id = moderador.id
                item.moderado_em = agora
                item.justificativa_moderacao = justificativa
                if isinstance(db, Session):
                    motivo_txt = f" Motivo: {justificativa}" if justificativa else ""
                    notificacao_service.registrar(
                        db,
                        item.usuario_id,
                        tipo="PIZZA_RECUSADA",
                        titulo="Gráfico de aprovação recusado",
                        mensagem=f"Sua contribuição de taxas de {contexto_pizza} foi recusada pela moderação.{motivo_txt}",
                        link=disciplina_link_notif,
                    )
            db.commit()
            return PizzaModeracaoDecisaoResponse(
                id=doacao.id,
                turma_id=doacao.turma_id,
                semestre_referencia=doacao.semestre_referencia,
                status="DESCARTADA",
                tipo_envio=tipo_efetivo,
                doacoes_atualizadas=len(grupo_pendentes),
                moderado_por_id=moderador.id,
                moderado_em=agora,
                justificativa=justificativa,
            )

        # Aprovacao (CONSOLIDADA) — selo verde auxilia a visualizacao, mas moderador pode aprovar diretamente
        if tipo_efetivo == "TEXTO":
            t_apr = doacao.taxa_aprovacao
            t_rep = doacao.taxa_reprovacao_nota
            t_falta = doacao.taxa_reprovacao_falta
            t_tranc = doacao.taxa_trancamento
        else:
            t_apr = dados.taxa_aprovacao if dados.taxa_aprovacao is not None else doacao.taxa_aprovacao
            t_rep = dados.taxa_reprovacao_nota if dados.taxa_reprovacao_nota is not None else doacao.taxa_reprovacao_nota
            t_falta = dados.taxa_reprovacao_falta if dados.taxa_reprovacao_falta is not None else doacao.taxa_reprovacao_falta
            t_tranc = dados.taxa_trancamento if dados.taxa_trancamento is not None else doacao.taxa_trancamento

        if t_apr is None or t_rep is None or t_falta is None or t_tranc is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Informe os 4 percentuais do gráfico (somando 100%) para aprovar a submissão.",
            )

        t_apr, t_rep, t_falta, t_tranc = _validar_soma_cem(t_apr, t_rep, t_falta, t_tranc)

        if tipo_efetivo == "IMAGEM":
            doacao.taxa_aprovacao = t_apr
            doacao.taxa_reprovacao_nota = t_rep
            doacao.taxa_reprovacao_falta = t_falta
            doacao.taxa_trancamento = t_tranc

        grupo_vencedor = GrupoValores(
            taxa_aprovacao=t_apr,
            taxa_reprovacao_nota=t_rep,
            taxa_reprovacao_falta=t_falta,
            taxa_trancamento=t_tranc,
            quantidade=len(grupo_pendentes),
            consolidadas=len(grupo_pendentes),
        )
        estatistica_repo.salvar(db, doacao.turma_id, doacao.semestre_referencia, grupo_vencedor)

        ids_aprovados = {item.id for item in grupo_pendentes}
        for item in grupo_pendentes:
            item.status = "CONSOLIDADA"
            item.moderado_por_id = moderador.id
            item.moderado_em = agora
            item.justificativa_moderacao = justificativa
            if isinstance(db, Session):
                notificacao_service.registrar(
                    db,
                    item.usuario_id,
                    tipo="PIZZA_APROVADA",
                    titulo="Gráfico de aprovação aceito",
                    mensagem=f"Sua contribuição de taxas de {contexto_pizza} foi aprovada e já aparece na disciplina.",
                    link=disciplina_link_notif,
                )

        # Encerra submissoes concorrentes pendentes da mesma turma/semestre
        concorrentes = (
            db.query(DoacaoEstatistica)
            .filter(
                DoacaoEstatistica.turma_id == doacao.turma_id,
                DoacaoEstatistica.semestre_referencia == doacao.semestre_referencia,
                DoacaoEstatistica.status == "PENDENTE",
                ~DoacaoEstatistica.id.in_(ids_aprovados),
            )
            .all()
        )
        for conc in concorrentes:
            conc.status = "DESCARTADA"
            conc.moderado_por_id = moderador.id
            conc.moderado_em = agora
            conc.justificativa_moderacao = "Substituída por estatística oficial aprovada na moderação."
            if isinstance(db, Session):
                notificacao_service.registrar(
                    db,
                    conc.usuario_id,
                    tipo="PIZZA_RECUSADA",
                    titulo="Gráfico de aprovação encerrado",
                    mensagem=f"A estatística oficial de {contexto_pizza} já foi consolidada com outro envio aprovado.",
                    link=disciplina_link_notif,
                )

        self._sincronizar_metricas_disciplina(db, doacao.turma_id, doacao.semestre_referencia)
        db.commit()
        return PizzaModeracaoDecisaoResponse(
            id=doacao.id,
            turma_id=doacao.turma_id,
            semestre_referencia=doacao.semestre_referencia,
            status="CONSOLIDADA",
            tipo_envio=tipo_efetivo,
            doacoes_atualizadas=len(grupo_pendentes),
            moderado_por_id=moderador.id,
            moderado_em=agora,
            justificativa=justificativa,
        )


doacao_service = DoacaoService()