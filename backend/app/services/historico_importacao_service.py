from decimal import Decimal, ROUND_HALF_UP
import hashlib
import re
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

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
RE_TITULO_DOCENTE = re.compile(r"^(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+", re.IGNORECASE)


def _limpar_nome_professor(nome_bruto: str) -> str:
    nome = RE_TITULO_DOCENTE.sub("", (nome_bruto or "").strip())
    return " ".join(nome.split()).strip()[:150]


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
    payload = f"{settings.SECRET_KEY}:{matricula.strip()}:{codigo.strip().upper()}:{semestre.strip()}"
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
            nome_limpo = _limpar_nome_professor(nome_raw)
            if not nome_limpo:
                continue
            prof = (
                db.query(Professor)
                .filter(func.lower(Professor.nome) == nome_limpo.lower())
                .first()
            )
            if prof is None:
                prof = Professor(
                    nome=nome_limpo.title() if nome_limpo.isupper() else nome_limpo,
                    departamento=disciplina.departamento,
                )
                db.add(prof)
                db.flush()
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

    def _recalcular_metricas_disciplina(
        self, db: Session, disciplina_id: int, periodos_afetados: Set[Tuple[int, int]]
    ) -> None:
        """Recalcula `metricas_academicas` (por ano/semestre) e `metricas_consolidadas`."""
        amostras_disc = (
            db.query(AmostraHistorico)
            .filter(AmostraHistorico.disciplina_id == disciplina_id)
            .all()
        )
        por_periodo: Dict[Tuple[int, int], List[AmostraHistorico]] = {}
        for a in amostras_disc:
            chave = _parse_ano_semestre(a.semestre)
            if chave is not None:
                por_periodo.setdefault(chave, []).append(a)

        for ano, sem_num in periodos_afetados:
            grupo = por_periodo.get((ano, sem_num), [])
            if not grupo:
                continue

            total = len(grupo)
            apr = sum(1 for a in grupo if a.desfecho == "APR")
            rep_nota = sum(1 for a in grupo if a.desfecho == "REP_NOTA")
            rep_falta = sum(1 for a in grupo if a.desfecho == "REP_FALTA")
            tranc = sum(1 for a in grupo if a.desfecho == "TRANC")
            suprimida = total < settings.HISTORICO_MIN_AMOSTRAS
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

        elegiveis: List[HistoricoComponenteItem] = [
            c for c in extraido.cursadas if c.situacao in MAPA_DESFECHO
        ]

        novas = 0
        duplicadas = 0
        nao_encontradas: List[str] = []
        hashes_na_sessao: Set[str] = set()
        turmas_afetadas: Dict[Tuple[int, int, str], bool] = {}
        disciplinas_afetadas: Dict[int, Set[Tuple[int, int]]] = {}

        for item in elegiveis:
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

            disciplina = (
                db.query(Disciplina)
                .filter(func.upper(Disciplina.codigo) == item.codigo.upper())
                .first()
            )
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
