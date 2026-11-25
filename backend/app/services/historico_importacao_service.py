from decimal import Decimal, ROUND_HALF_UP
import hashlib
import re
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.schemas.historico import (
    HistoricoComponenteItem,
    HistoricoContribuicaoResumo,
    HistoricoImportacaoResponse,
)
from app.core.config import settings
from app.models.amostra_historico import AmostraHistorico
from app.models.disciplina import Disciplina
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.metrica import MetricaAcademica, MetricaConsolidada
from app.models.professor import Professor
from app.models.turma import Turma
from app.services.historico_parser_service import (
    HistoricoExtraido,
    _normalizar_para_busca,
    parse_historico_pdf,
)

MAPA_DESFECHO = {
    "APR": "APR",
    "REP": "REP_NOTA",
    "REPF": "REP_FALTA",
    "REPMF": "REP_FALTA",
    "TRANC": "TRANC",
}

MENCOES_VALIDAS = {"SS", "MS", "MM", "MI", "II", "SR"}
RE_TITULO_DOCENTE = re.compile(
    r"^(?:(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+)+",
    re.IGNORECASE,
)
RE_TITULO_DOCENTE_MEIO = re.compile(
    r"\b(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+",
    re.IGNORECASE,
)


def _remover_prefixo_disciplina(texto: str, nome_disciplina: Optional[str]) -> str:
    """Remove o nome da disciplina caso tenha vindo colado no início do nome do docente."""
    if not texto or not nome_disciplina:
        return texto
    tokens_disc = _normalizar_para_busca(nome_disciplina).split()
    tokens_orig = texto.split()
    if not tokens_disc or len(tokens_orig) <= len(tokens_disc):
        return texto
    tokens_norm = [_normalizar_para_busca(t) for t in tokens_orig]
    if tokens_norm[: len(tokens_disc)] == tokens_disc:
        return " ".join(tokens_orig[len(tokens_disc) :]).strip(" ,;-:")
    return texto


def _limpar_nome_professor(
    nome_bruto: str, nome_disciplina: Optional[str] = None
) -> str:
    nome = " ".join((nome_bruto or "").split()).strip(" ,;-:")
    if not nome:
        return ""

    nome = _remover_prefixo_disciplina(nome, nome_disciplina)

    # Caso ainda haja prefixo residual seguido de título acadêmico (ex: "OBJETOS Dr. FULANO")
    match_meio = RE_TITULO_DOCENTE_MEIO.search(nome)
    if match_meio and match_meio.start() > 0:
        nome = nome[match_meio.start() :].strip()

    nome = RE_TITULO_DOCENTE.sub("", nome).strip(" ,;-:")
    nome = " ".join(nome.split()).strip()[:150]
    if nome.isupper():
        nome = nome.title()
    return nome


def _sanear_nome_disciplina_por_catalogo(
    nome_extraido: str, nome_catalogo: Optional[str]
) -> str:
    """Remove ruído de outra disciplina caso o nome oficial do catálogo apareça englobado."""
    if not nome_catalogo:
        return nome_extraido
    norm_ext = _normalizar_para_busca(nome_extraido)
    norm_cat = _normalizar_para_busca(nome_catalogo)
    if not norm_cat or norm_ext == norm_cat:
        return nome_extraido
    if len(norm_ext) > len(norm_cat) and re.search(
        rf"(?<!\w){re.escape(norm_cat)}(?!\w)", norm_ext
    ):
        return " ".join(nome_catalogo.split()).strip().upper()
    return nome_extraido


def _normalizar_codigo_turma(turma_bruta: Optional[str]) -> Optional[str]:
    if not turma_bruta:
        return None
    limpo = turma_bruta.strip().upper()
    if not limpo or limpo in {"-", "--", "---"}:
        return None
    if limpo.isdigit():
        return limpo.zfill(2)[:10]
    return limpo[:10]


def _gerar_dedup_hash(matricula: str, codigo: str, semestre: str) -> str:
    chave_dedup = settings.HISTORICO_DEDUP_SECRET or settings.SECRET_KEY
    payload = f"{chave_dedup}:{matricula.strip()}:{codigo.strip().upper()}:{semestre.strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _calcular_taxas_cem_porcento(
    apr: int, rep_nota: int, rep_falta: int, tranc: int
) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
    """
    Calcula 4 percentuais com 2 casas decimais cuja soma é exatamente 100.00,
    atendendo à CheckConstraint chk_estatistica_soma_cem.
    """
    contagens = [apr, rep_nota, rep_falta, tranc]
    total = sum(contagens)
    if total <= 0:
        return (
            Decimal("0.00"),
            Decimal("0.00"),
            Decimal("0.00"),
            Decimal("100.00"),
        )

    brutos = [
        (Decimal(c * 100) / Decimal(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        for c in contagens
    ]
    diferenca = Decimal("100.00") - sum(brutos)
    if diferenca != Decimal("0.00"):
        idx_maior = max(range(4), key=lambda i: contagens[i])
        brutos[idx_maior] = (brutos[idx_maior] + diferenca).quantize(Decimal("0.01"))
    return brutos[0], brutos[1], brutos[2], brutos[3]


def _parse_ano_semestre(semestre: str) -> Optional[Tuple[int, int]]:
    match = re.match(r"^(\d{4})\.([1-4])$", (semestre or "").strip())
    if not match:
        return None
    ano = int(match.group(1))
    sem_num = 1 if int(match.group(2)) == 1 else 2
    return ano, sem_num


class HistoricoImportacaoService:
    """Processa upload de Histórico Escolar SIGAA em memória e consolida amostras anonimizadas."""

    def _resolver_ou_criar_turma(
        self,
        db: Session,
        disciplina: Disciplina,
        codigo_turma: str,
        semestre: str,
        nomes_professores: List[str],
    ) -> Turma:
        turma = (
            db.query(Turma)
            .filter(
                Turma.disciplina_id == disciplina.id,
                Turma.codigo_turma == codigo_turma,
                Turma.semestre == semestre,
            )
            .first()
        )
        if turma is None:
            turma = Turma(
                disciplina_id=disciplina.id,
                codigo_turma=codigo_turma,
                semestre=semestre,
            )
            db.add(turma)
            db.flush()

        for nome_raw in nomes_professores:
            nome_limpo = _limpar_nome_professor(nome_raw, disciplina.nome)
            if not nome_limpo:
                continue
            chave_limpa = _normalizar_para_busca(nome_limpo)
            prof = (
                db.query(Professor)
                .filter(func.lower(Professor.nome) == nome_limpo.lower())
                .first()
            )
            if prof is None:
                prof = Professor(
                    nome=nome_limpo,
                    departamento=disciplina.departamento,
                )
                db.add(prof)
                db.flush()

            # Remove eventuais vínculos antigos poluídos correspondentes ao mesmo docente
            for prof_existente in list(turma.professores):
                if prof_existente.id == prof.id:
                    continue
                existente_limpo = _limpar_nome_professor(
                    prof_existente.nome, disciplina.nome
                )
                if (
                    existente_limpo != prof_existente.nome
                    and _normalizar_para_busca(existente_limpo) == chave_limpa
                ):
                    turma.professores.remove(prof_existente)

            if prof not in turma.professores:
                turma.professores.append(prof)

        return turma

    def _recalcular_estatistica_turma(
        self, db: Session, turma_id: int, disciplina_id: int, semestre: str
    ) -> bool:
        """
        Recalcula `estatisticas_consolidadas` para a turma/semestre a partir
        das amostras reais. Retorna True se atingiu o limiar LGPD.
        """
        amostras = (
            db.query(AmostraHistorico)
            .filter(
                AmostraHistorico.turma_id == turma_id,
                AmostraHistorico.semestre == semestre,
            )
            .all()
        )
        if not amostras:
            return False

        apr = sum(1 for a in amostras if a.desfecho == "APR")
        rep_nota = sum(1 for a in amostras if a.desfecho == "REP_NOTA")
        rep_falta = sum(1 for a in amostras if a.desfecho == "REP_FALTA")
        tranc = sum(1 for a in amostras if a.desfecho == "TRANC")
        total = len(amostras)

        t_apr, t_rep_n, t_rep_f, t_tranc = _calcular_taxas_cem_porcento(
            apr, rep_nota, rep_falta, tranc
        )
        suprimida = total < settings.HISTORICO_MIN_AMOSTRAS

        ec = (
            db.query(EstatisticaConsolidada)
            .filter(
                EstatisticaConsolidada.turma_id == turma_id,
                EstatisticaConsolidada.semestre_referencia == semestre,
            )
            .first()
        )
        if ec is None:
            ec = EstatisticaConsolidada(
                turma_id=turma_id,
                disciplina_id=disciplina_id,
                semestre_referencia=semestre,
            )
            db.add(ec)
        elif ec.origem == "DOACAO_QUORUM":
            # Preserva estatísticas já validadas pelo fluxo manual de quórum
            return not ec.amostragem_suprimida_lgpd

        ec.taxa_aprovacao = t_apr
        ec.taxa_reprovacao_nota = t_rep_n
        ec.taxa_reprovacao_falta = t_rep_f
        ec.taxa_trancamento = t_tranc
        ec.total_amostras = total
        ec.origem = "HISTORICO_SIGAA"
        ec.qtd_ss = sum(1 for a in amostras if a.mencao == "SS")
        ec.qtd_ms = sum(1 for a in amostras if a.mencao == "MS")
        ec.qtd_mm = sum(1 for a in amostras if a.mencao == "MM")
        ec.qtd_mi = sum(1 for a in amostras if a.mencao == "MI")
        ec.qtd_ii = sum(1 for a in amostras if a.mencao == "II")
        ec.qtd_sr = sum(1 for a in amostras if a.mencao == "SR")
        ec.amostragem_suprimida_lgpd = suprimida
        ec.status = "VALIDADO"
        db.flush()
        return not suprimida

    @staticmethod
    def _contagens_da_pizza(ec: EstatisticaConsolidada, base_matriculados: int) -> Tuple[int, int, int, int, int]:
        """Converte percentuais oficiais de uma pizza em contagens inteiras somando exatamente base_matriculados."""
        total = max(1, base_matriculados)
        brutos = [
            float(ec.taxa_aprovacao),
            float(ec.taxa_reprovacao_nota),
            float(ec.taxa_reprovacao_falta),
            float(ec.taxa_trancamento),
        ]
        contagens = [int(round((b * total) / 100.0)) for b in brutos]
        diferenca = total - sum(contagens)
        if diferenca != 0:
            idx_maior = max(range(4), key=lambda i: brutos[i])
            contagens[idx_maior] = max(0, contagens[idx_maior] + diferenca)
        return sum(contagens), contagens[0], contagens[1], contagens[2], contagens[3]

    def _recalcular_metricas_disciplina(
        self, db: Session, disciplina_id: int, periodos_afetados: Set[Tuple[int, int]]
    ) -> None:
        """
        Recalcula `metricas_academicas` (por ano/semestre) e `metricas_consolidadas`.
        Quando uma turma/semestre possui estatística aprovada por gráfico de pizza
        (`DOACAO_QUORUM`), ela substitui integralmente as amostras de histórico dessa turma.
        """
        pizzas = (
            db.query(EstatisticaConsolidada)
            .options(selectinload(EstatisticaConsolidada.turma))
            .filter(
                EstatisticaConsolidada.disciplina_id == disciplina_id,
                EstatisticaConsolidada.origem == "DOACAO_QUORUM",
                EstatisticaConsolidada.amostragem_suprimida_lgpd.is_(False),
            )
            .all()
        )
        chaves_pizza: Set[Tuple[int, str]] = {
            (p.turma_id, p.semestre_referencia) for p in pizzas
        }
        pizzas_por_periodo: Dict[Tuple[int, int], List[EstatisticaConsolidada]] = {}
        for p in pizzas:
            chave = _parse_ano_semestre(p.semestre_referencia)
            if chave is not None:
                pizzas_por_periodo.setdefault(chave, []).append(p)

        amostras_disc = (
            db.query(AmostraHistorico)
            .filter(AmostraHistorico.disciplina_id == disciplina_id)
            .all()
        )
        por_periodo: Dict[Tuple[int, int], List[AmostraHistorico]] = {}
        for a in amostras_disc:
            if a.turma_id is not None and (a.turma_id, a.semestre) in chaves_pizza:
                continue
            chave = _parse_ano_semestre(a.semestre)
            if chave is not None:
                por_periodo.setdefault(chave, []).append(a)

        for ano, sem_num in periodos_afetados:
            grupo = por_periodo.get((ano, sem_num), [])
            pizzas_grupo = pizzas_por_periodo.get((ano, sem_num), [])
            if not grupo and not pizzas_grupo:
                continue

            apr = sum(1 for a in grupo if a.desfecho == "APR")
            rep_nota = sum(1 for a in grupo if a.desfecho == "REP_NOTA")
            rep_falta = sum(1 for a in grupo if a.desfecho == "REP_FALTA")
            tranc = sum(1 for a in grupo if a.desfecho == "TRANC")
            total = len(grupo)

            for p in pizzas_grupo:
                base_turma = (
                    p.turma.matriculados
                    if (p.turma is not None and p.turma.matriculados and p.turma.matriculados > 0)
                    else 100
                )
                t_p, a_p, rn_p, rf_p, tr_p = self._contagens_da_pizza(p, base_turma)
                total += t_p
                apr += a_p
                rep_nota += rn_p
                rep_falta += rf_p
                tranc += tr_p

            suprimida = (not pizzas_grupo) and (total < settings.HISTORICO_MIN_AMOSTRAS)
            if pizzas_grupo and not grupo and len(pizzas_grupo) == 1:
                taxa = Decimal(str(pizzas_grupo[0].taxa_aprovacao)).quantize(Decimal("0.01"))
            else:
                taxa = (
                    (Decimal(apr * 100) / Decimal(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    if not suprimida and total > 0
                    else None
                )

            ma = (
                db.query(MetricaAcademica)
                .filter(
                    MetricaAcademica.disciplina_id == disciplina_id,
                    MetricaAcademica.ano == ano,
                    MetricaAcademica.semestre == sem_num,
                )
                .first()
            )
            if ma is None:
                ma = MetricaAcademica(
                    disciplina_id=disciplina_id,
                    ano=ano,
                    semestre=sem_num,
                )
                db.add(ma)

            ma.matriculados = total
            ma.aprovados = apr
            ma.reprovados_nota = rep_nota
            ma.reprovados_falta = rep_falta
            ma.trancamentos = tranc
            ma.taxa_aprovacao = taxa
            ma.amostragem_suprimida_lgpd = suprimida

        db.flush()

        # Recalcula consolidado geral da disciplina
        todas_metricas = (
            db.query(MetricaAcademica)
            .filter(MetricaAcademica.disciplina_id == disciplina_id)
            .all()
        )
        if not todas_metricas:
            return

        mat_total = sum(m.matriculados for m in todas_metricas)
        apr_total = sum(m.aprovados for m in todas_metricas)
        rep_n_total = sum(m.reprovados_nota for m in todas_metricas)
        rep_f_total = sum(m.reprovados_falta for m in todas_metricas)
        tranc_total = sum(m.trancamentos for m in todas_metricas)
        suprimidas = sum(1 for m in todas_metricas if m.amostragem_suprimida_lgpd)
        if len(todas_metricas) == 1 and not todas_metricas[0].amostragem_suprimida_lgpd and todas_metricas[0].taxa_aprovacao is not None:
            taxa_acumulada = todas_metricas[0].taxa_aprovacao
        else:
            taxa_acumulada = (
                (Decimal(apr_total * 100) / Decimal(mat_total)).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                if mat_total >= settings.HISTORICO_MIN_AMOSTRAS
                else None
            )

        mc = (
            db.query(MetricaConsolidada)
            .filter(MetricaConsolidada.disciplina_id == disciplina_id)
            .first()
        )
        if mc is None:
            mc = MetricaConsolidada(disciplina_id=disciplina_id)
            db.add(mc)

        mc.matriculados = mat_total
        mc.aprovados = apr_total
        mc.reprovados_nota = rep_n_total
        mc.reprovados_falta = rep_f_total
        mc.trancamentos = tranc_total
        mc.taxa_aprovacao_acumulada = taxa_acumulada
        mc.total_turmas_suprimidas = suprimidas
        db.flush()

    def processar_upload(self, db: Session, pdf_bytes: bytes) -> HistoricoImportacaoResponse:
        """
        Executa parsing do PDF em memória, registra novas amostras anonimizadas
        e consolida as estatísticas de turmas e disciplinas afetadas.
        """
        extraido: HistoricoExtraido = parse_historico_pdf(pdf_bytes)

        codigos_unicos = sorted(
            {c.codigo.upper() for c in (extraido.cursadas + extraido.cursando) if c.codigo}
        )
        disciplinas_por_codigo: Dict[str, Disciplina] = {}
        if codigos_unicos:
            disciplinas_encontradas = (
                db.query(Disciplina)
                .filter(func.upper(Disciplina.codigo).in_(codigos_unicos))
                .all()
            )
            disciplinas_por_codigo = {
                d.codigo.upper(): d for d in disciplinas_encontradas if d.codigo
            }

        for item in extraido.cursadas + extraido.cursando:
            disc_cat = disciplinas_por_codigo.get(item.codigo.upper())
            if disc_cat is not None:
                item.nome = _sanear_nome_disciplina_por_catalogo(item.nome, disc_cat.nome)

        elegiveis: List[HistoricoComponenteItem] = [
            c
            for c in extraido.cursadas
            if c.situacao in MAPA_DESFECHO and _parse_ano_semestre(c.semestre) is not None
        ]

        novas = 0
        duplicadas = 0
        nao_encontradas: List[str] = []
        hashes_na_sessao: Set[str] = set()
        turmas_afetadas: Dict[Tuple[int, int, str], bool] = {}
        disciplinas_afetadas: Dict[int, Set[Tuple[int, int]]] = {}

        for item in elegiveis:
            # Registrar o vínculo de cada turma independe da deduplicação da amostra.
            disciplina = disciplinas_por_codigo.get(item.codigo.upper())
            if not disciplina:
                if item.codigo not in nao_encontradas:
                    nao_encontradas.append(item.codigo)
                continue

            cod_turma = _normalizar_codigo_turma(item.turma)
            turma_id: Optional[int] = None
            if cod_turma is not None:
                turma = self._resolver_ou_criar_turma(
                    db, disciplina, cod_turma, item.semestre, item.professores
                )
                turma_id = turma.id

            dedup_hash = _gerar_dedup_hash(extraido.matricula, item.codigo, item.semestre)
            if dedup_hash in hashes_na_sessao:
                duplicadas += 1
                continue

            ja_existe = (
                db.query(AmostraHistorico.id)
                .filter(AmostraHistorico.dedup_hash == dedup_hash)
                .first()
            )
            if ja_existe:
                hashes_na_sessao.add(dedup_hash)
                duplicadas += 1
                continue

            mencao = item.mencao if item.mencao in MENCOES_VALIDAS else None
            amostra = AmostraHistorico(
                dedup_hash=dedup_hash,
                disciplina_id=disciplina.id,
                turma_id=turma_id,
                codigo_turma=cod_turma or "--",
                semestre=item.semestre,
                desfecho=MAPA_DESFECHO[item.situacao],
                mencao=mencao,
            )
            db.add(amostra)
            hashes_na_sessao.add(dedup_hash)
            novas += 1

            if turma_id is not None:
                turmas_afetadas[(turma_id, disciplina.id, item.semestre)] = True

            ano_sem = _parse_ano_semestre(item.semestre)
            if ano_sem is not None:
                disciplinas_afetadas.setdefault(disciplina.id, set()).add(ano_sem)

        db.flush()

        liberadas_lgpd = 0
        for turma_id, disciplina_id, semestre in turmas_afetadas:
            if self._recalcular_estatistica_turma(db, turma_id, disciplina_id, semestre):
                liberadas_lgpd += 1

        for disciplina_id, periodos in disciplinas_afetadas.items():
            self._recalcular_metricas_disciplina(db, disciplina_id, periodos)

        db.commit()

        # Enriquece componentes em andamento (MATR) com slug, horário e local reais do banco
        for item in extraido.cursando:
            disc_db = (
                db.query(Disciplina)
                .filter(func.upper(Disciplina.codigo) == item.codigo.upper())
                .first()
            )
            if disc_db is not None:
                item.slug = disc_db.slug

            cod_turma = _normalizar_codigo_turma(item.turma)
            if not cod_turma or disc_db is None:
                continue
            turma_db = (
                db.query(Turma)
                .filter(
                    Turma.disciplina_id == disc_db.id,
                    Turma.codigo_turma == cod_turma,
                    Turma.semestre == item.semestre,
                )
                .first()
            )
            if turma_db is not None:
                item.horario = turma_db.horario
                item.local = turma_db.local
                if not item.professores and turma_db.professores:
                    item.professores = [p.nome for p in turma_db.professores]

        return HistoricoImportacaoResponse(
            autenticidade_estrutural_valida=True,
            dados_academicos=extraido.dados_academicos,
            carga_horaria=extraido.carga_horaria,
            cursadas=extraido.cursadas,
            cursando=extraido.cursando,
            pendentes=extraido.pendentes,
            contribuicao=HistoricoContribuicaoResumo(
                total_elegiveis=len(elegiveis),
                novas_contribuicoes=novas,
                duplicadas_ignoradas=duplicadas,
                disciplinas_nao_encontradas=nao_encontradas,
                turmas_atualizadas=len(turmas_afetadas),
                turmas_liberadas_lgpd=liberadas_lgpd,
                minimo_amostras_lgpd=settings.HISTORICO_MIN_AMOSTRAS,
            ),
        )


historico_importacao_service = HistoricoImportacaoService()
