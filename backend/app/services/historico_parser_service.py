from dataclasses import dataclass
import io
import re
import unicodedata
from typing import List, Optional, Tuple

from pypdf import PdfReader

from app.api.schemas.historico import (
    HistoricoCargaHoraria,
    HistoricoCargaItem,
    HistoricoComponenteItem,
    HistoricoDadosAcademicos,
    HistoricoPendenteItem,
)

SITUACOES_CONCLUIDAS = {
    "APR",
    "REP",
    "REPF",
    "REPMF",
    "TRANC",
    "CANC",
    "DISP",
    "CUMP",
}
SITUACOES_CURSANDO = {"MATR"}
TODAS_SITUACOES = SITUACOES_CONCLUIDAS | SITUACOES_CURSANDO | {"--"}
SIMBOLOS_NATUREZA = {"*", "#", "e", "&", "@", "§", "%"}
SITUACOES_CONTABILIZAVEIS_APROVADAS = {"APR", "CUMP", "DISP"}

RE_PERIODO_INICIO = re.compile(r"^\s*(\d{4}\.\d)\b")
RE_CODIGO_DISCIPLINA = re.compile(r"\b([A-Z]{2,5}\d{3,5})\b")
RE_COMPONENTE_INLINE = re.compile(
    r"^\s*(\d{4}\.\d)\s+"
    r"(?:([*#e&@§%])\s+)?"
    r"([A-Z]{2,5}\d{3,5})\s+"
    r"(.+?)\s+"
    r"(\d{1,3})\s+"
    r"([A-Z0-9-]+)\s+"
    r"([\d.,]+|--)\s+"
    r"(SS|MS|MM|MI|II|SR|-{1,3})\s+"
    r"(APR|REP|REPF|REPMF|TRANC|MATR|CANC|DISP|CUMP|--)\s*$"
)
RE_LINHA_COLUNAS_FIM = re.compile(
    r"(?:^|\s)(?:([*#e&@§%])\s+)?"
    r"([A-Z]{2,5}\d{3,5})\s+"
    r"(\d{1,3})\s+"
    r"([A-Z0-9-]+)\s+"
    r"([\d.,]+|--)\s+"
    r"(SS|MS|MM|MI|II|SR|-{1,3})\s+"
    r"(APR|REP|REPF|REPMF|TRANC|MATR|CANC|DISP|CUMP|--)\s*$"
)
RE_DOCENTE_CH = re.compile(r"\(\d+h\)")
RE_DOCENTE_CH_FIM = re.compile(r"\(\d+h\)\s*$")
RE_DOCENTE_CH_CONTINUA = re.compile(r"\(\d+h\)\s*,\s*$")
RE_DOCENTE_SEGMENTO = re.compile(r"(.+?)\s*\(\d+h\)")
RE_METRICAS_FIM_GENERICA = re.compile(
    r"(?:^|\s)(\d{1,3})\s+"
    r"([A-Z0-9-]+)\s+"
    r"([\d.,]+|--)\s+"
    r"(SS|MS|MM|MI|II|SR|-{1,3})\s+"
    r"(APR|REP|REPF|REPMF|TRANC|MATR|CANC|DISP|CUMP|--)\s*$"
)
RE_COMPONENTE_INLINE_SEM_NOME = re.compile(
    r"^\s*(\d{4}\.\d)\s+"
    r"(?:([*#e&@§%])\s+)?"
    r"(?:([A-Z]{2,5}\d{3,5})\s+)?"
    r"(\d{1,3})\s+"
    r"([A-Z0-9-]+)\s+"
    r"([\d.,]+|--)\s+"
    r"(SS|MS|MM|MI|II|SR|-{1,3})\s+"
    r"(APR|REP|REPF|REPMF|TRANC|MATR|CANC|DISP|CUMP|--)\s*$"
)
RE_CODIGO_PREFIXO_LINHA = re.compile(
    r"^\s*(?:([*#e&@§%])\s+)?([A-Z]{2,5}\d{3,5})\b"
)
RE_PENDENTE = re.compile(
    r"^\s*([A-Z]{2,5}\d{3,5})\s+(.+?)\s+(?:(Matriculado)\s+)?(\d{1,3})\s*h\s*$",
    re.IGNORECASE,
)
RE_MATRICULA = re.compile(r"Matr[íi]cula:\s*(\d{6,15})", re.IGNORECASE)
RE_CODIGO_VERIFICACAO = re.compile(
    r"c[óo]digo de verifica[çc][ãa]o:\s*([a-f0-9]{8,32})",
    re.IGNORECASE,
)
RE_DATA_EMISSAO = re.compile(
    r"Hist[óo]rico Escolar\s*-\s*Emitido em:\s*(\d{2}/\d{2}/\d{4}\s+[àa]s\s+\d{2}:\d{2})",
    re.IGNORECASE,
)
RE_CABECALHO_PAGINA = re.compile(
    r"^(SIGAA\s*-|UnB\s*-|Universidade de Bras[íi]lia\s*$|DEG\s*-|SAA\s*-|"
    r"Decanato de Ensino|Secretaria de Administra[çc][ãa]o|"
    r"Campus Darcy|Credenciada conforme|na se[çc][ãa]o 01|"
    r"Hist[óo]rico Escolar\s*-|Nome:\s|Matr[íi]cula:\s*\d|Curso:\s|Curr[íi]culo:\s|"
    r"Status:\s|Ano\s*/\s*Per[íi]odo Letivo Inicial:\s|Per[íi]odo Letivo Atual:\s|"
    r"Prazo para Conclus[ãa]o|Ano/Per[íi]odo|Letivo\s+Componente|"
    r"Para verificar a autenticidade|e o c[óo]digo de verifica[çc][ãa]o:|P[áa]gina\s+\d+\s+de\s+\d+)",
    re.IGNORECASE,
)


class HistoricoParserError(ValueError):
    """Erro de validação estrutural ou de leitura do PDF de Histórico Escolar."""


@dataclass
class HistoricoExtraido:
    matricula: str
    dados_academicos: HistoricoDadosAcademicos
    carga_horaria: HistoricoCargaHoraria
    cursadas: List[HistoricoComponenteItem]
    cursando: List[HistoricoComponenteItem]
    pendentes: List[HistoricoPendenteItem]


def _normalizar_para_busca(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto or "")
    sem_acentos = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", sem_acentos).strip().lower()


def _parse_float_ptbr(valor: str) -> Optional[float]:
    bruto = (valor or "").strip()
    if not bruto or bruto in {"-", "--", "---"}:
        return None
    try:
        return float(bruto.replace(",", "."))
    except ValueError:
        return None


def _extrair_texto_pdf(pdf_bytes: bytes) -> Tuple[str, str]:
    """
    Extrai o texto de todas as páginas do PDF em memória.
    Retorna uma tupla (texto_layout, texto_padrao) para suportar diferentes ordenações.
    """
    if not pdf_bytes or not pdf_bytes.lstrip().startswith(b"%PDF-"):
        raise HistoricoParserError("O arquivo enviado não é um PDF válido.")

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise HistoricoParserError("Não foi possível ler o arquivo PDF enviado.") from exc

    if not reader.pages:
        raise HistoricoParserError("O arquivo PDF enviado não possui páginas.")

    paginas_layout: List[str] = []
    paginas_padrao: List[str] = []

    for page in reader.pages:
        try:
            texto_layout = page.extract_text(extraction_mode="layout") or ""
        except Exception:
            texto_layout = ""
        try:
            texto_padrao = page.extract_text() or ""
        except Exception:
            texto_padrao = ""

        paginas_layout.append(texto_layout)
        paginas_padrao.append(texto_padrao)

    return "\n".join(paginas_layout), "\n".join(paginas_padrao)


def _validar_estrutura_oficial(texto_completo: str) -> Tuple[str, Optional[str], str]:
    """
    Valida marcadores oficiais do Histórico Escolar do SIGAA/UnB.
    Retorna (matricula, data_emissao, codigo_verificacao).
    """
    norm = _normalizar_para_busca(texto_completo)

    marcadores_obrigatorios = [
        ("sigaa", "Cabeçalho oficial do SIGAA ausente no documento."),
        ("universidade de brasilia", "Identificação oficial da UnB ausente no documento."),
        ("historico escolar", "Título oficial de Histórico Escolar ausente."),
        ("sig.unb.br/sigaa/documentos", "URL oficial de verificação do SIGAA ausente."),
        (
            "componentes curriculares cursados/cursando",
            "Seção de Componentes Curriculares Cursados/Cursando ausente.",
        ),
    ]
    for marcador, mensagem in marcadores_obrigatorios:
        if marcador not in norm:
            raise HistoricoParserError(
                f"Documento não reconhecido como Histórico Escolar oficial da UnB: {mensagem}"
            )

    match_codigo = RE_CODIGO_VERIFICACAO.search(texto_completo)
    if not match_codigo:
        raise HistoricoParserError(
            "Código de verificação de autenticidade do SIGAA não encontrado no rodapé."
        )

    match_matricula = RE_MATRICULA.search(texto_completo)
    if not match_matricula:
        raise HistoricoParserError(
            "Número de matrícula do discente não encontrado no histórico."
        )

    match_emissao = RE_DATA_EMISSAO.search(texto_completo)
    data_emissao = " ".join(match_emissao.group(1).split()) if match_emissao else None

    return (
        match_matricula.group(1).strip(),
        data_emissao,
        match_codigo.group(1).strip().lower(),
    )


def _extrair_campo_regex(texto: str, padrao: str) -> Optional[str]:
    match = re.search(padrao, texto, re.IGNORECASE | re.MULTILINE)
    if not match:
        return None
    valor = " ".join(match.group(1).split()).strip()
    return valor if valor and valor != "-" else None


def _extrair_dados_academicos(
    texto_layout: str,
    texto_padrao: str,
    data_emissao: Optional[str],
    codigo_verificacao: str,
) -> HistoricoDadosAcademicos:
    fonte = texto_layout if texto_layout.strip() else texto_padrao

    curso = _extrair_campo_regex(
        fonte,
        r"Curso:\s*([A-ZÀ-Ú0-9\s/().-]+?)(?:\s{2,}|\n|$)",
    )
    if not curso:
        curso = _extrair_campo_regex(
            texto_padrao,
            r"([A-ZÀ-Ú\s/]+/(?:FCTE|DARCY|FCE|FUP|[A-Z]{2,5})\s*-\s*[A-ZÀ-Ú\s/-]+)",
        )

    status = _extrair_campo_regex(
        fonte,
        r"Status:\s*(ATIVO|CONCLU[ÍI]DO|FORMADO|TRANCADO|CANCELADO|INATIVO)\b",
    )
    curriculo = _extrair_campo_regex(
        fonte,
        r"Curr[íi]culo:\s*([0-9]+/[0-9]+\s*-\s*\d{4}\.\d)",
    )
    if not curriculo:
        curriculo = _extrair_campo_regex(
            texto_padrao, r"(\d{3,6}/\d+\s*-\s*\d{4}\.\d)"
        )

    periodo_inicial = _extrair_campo_regex(
        fonte,
        r"Ano\s*/\s*Per[íi]odo Letivo Inicial:\s*(\d{4}\.\d)",
    )
    periodo_atual_str = _extrair_campo_regex(
        fonte,
        r"Per[íi]odo Letivo Atual:\s*(\d{1,2})\b",
    )
    prazo_conclusao = _extrair_campo_regex(
        fonte,
        r"Prazo para Conclus[ãa]o[^:]*:\s*(\d{4}\.\d\s*/\s*\d{4}\.\d)",
    )
    if not prazo_conclusao:
        prazo_conclusao = _extrair_campo_regex(
            texto_padrao, r"(\d{4}\.\d\s*/\s*\d{4}\.\d)"
        )

    ira_str = _extrair_campo_regex(fonte, r"\bIRA:\s*([\d.,]+)")
    mp_str = _extrair_campo_regex(fonte, r"\bMP:\s*([\d.,]+)")

    return HistoricoDadosAcademicos(
        curso=curso,
        curriculo=curriculo,
        status=status.upper() if status else None,
        periodo_inicial=periodo_inicial,
        periodo_atual=int(periodo_atual_str) if periodo_atual_str else None,
        prazo_conclusao=prazo_conclusao,
        ira=_parse_float_ptbr(ira_str or ""),
        mp=_parse_float_ptbr(mp_str or ""),
        data_emissao=data_emissao,
        codigo_verificacao=codigo_verificacao,
    )


def _extrair_carga_horaria(texto_layout: str, texto_padrao: str) -> HistoricoCargaHoraria:
    resultado = HistoricoCargaHoraria()
    for fonte in (texto_layout, texto_padrao):
        secao = re.search(
            r"Carga Hor[áa]ria Integralizada/Pendente(.*?)"
            r"(?:Carga Hor[áa]ria Extensionista|Componentes Curriculares|$)",
            fonte,
            re.IGNORECASE | re.DOTALL,
        )
        if not secao:
            continue
        bloco = secao.group(1)
        for chave, rotulo in (
            ("exigido", "Exigido"),
            ("integralizado", "Integralizado"),
            ("pendente", "Pendente"),
        ):
            m = re.search(
                rf"{rotulo}\s+(\d+)\s*h\s+(\d+)\s*h\s+(\d+)\s*h\s+(\d+)\s*h",
                bloco,
                re.IGNORECASE,
            )
            if m:
                setattr(
                    resultado,
                    chave,
                    HistoricoCargaItem(
                        obrigatorias=int(m.group(1)),
                        optativas=int(m.group(2)),
                        complementares=int(m.group(3)),
                        total=int(m.group(4)),
                    ),
                )
        if resultado.exigido.total > 0 or resultado.integralizado.total > 0:
            break
    return resultado


RE_TITULO_DOCENTE = re.compile(
    r"\b(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+",
    re.UNICODE,
)


def _linha_tem_docente_ch(txt: str) -> bool:
    return bool(RE_DOCENTE_CH.search(txt))


def _linha_termina_docente_completo(txt: str) -> bool:
    return bool(RE_DOCENTE_CH_FIM.search(txt))


def _linha_continua_docente(txt: str) -> bool:
    return bool(RE_DOCENTE_CH_CONTINUA.search(txt))


def _linha_inicia_com_titulo_docente(txt: str) -> bool:
    return bool(RE_TITULO_DOCENTE.match(txt))


def _linha_tem_codigo_disciplina(txt: str) -> bool:
    return bool(RE_CODIGO_PREFIXO_LINHA.match(txt))


def _extrair_professores_e_nome(
    linhas_texto: List[str],
) -> Tuple[str, List[str]]:
    """Separa nome da disciplina e lista de docentes preservando a ordem das linhas."""
    partes_nome: List[str] = []
    linhas_docentes: List[str] = []
    aguardando_fim_docente = False

    for raw in linhas_texto:
        linha = " ".join(raw.split()).strip()
        if not linha:
            continue

        tem_ch = _linha_tem_docente_ch(linha)
        match_titulo = RE_TITULO_DOCENTE.search(linha)

        if aguardando_fim_docente:
            linhas_docentes.append(linha)
            aguardando_fim_docente = not _linha_termina_docente_completo(
                linha
            ) or _linha_continua_docente(linha)
            continue

        if tem_ch:
            if match_titulo and match_titulo.start() > 0:
                prefixo_nome = linha[: match_titulo.start()].strip(" ,")
                if prefixo_nome:
                    partes_nome.append(prefixo_nome)
                linhas_docentes.append(linha[match_titulo.start() :].strip())
            else:
                linhas_docentes.append(linha)
            aguardando_fim_docente = _linha_continua_docente(linha)
            continue

        if match_titulo and match_titulo.start() == 0:
            linhas_docentes.append(linha)
            aguardando_fim_docente = True
            continue

        partes_nome.append(linha)

    professores: List[str] = []
    if linhas_docentes:
        texto_docentes = " ".join(linhas_docentes)
        for match in RE_DOCENTE_SEGMENTO.finditer(texto_docentes):
            docente = " ".join(match.group(1).split()).strip(" ,;-")
            if docente and docente not in professores:
                professores.append(docente)

    nome_limpo = " ".join(" ".join(partes_nome).split()).strip(" ,")
    return nome_limpo, professores


def _parse_bloco_componente(
    semestre: str,
    linhas_bloco: List[str],
    prefixo_orfao: Optional[List[str]] = None,
) -> Optional[HistoricoComponenteItem]:
    if not linhas_bloco:
        return None

    prefixos_limpos = [
        l.strip()
        for l in (prefixo_orfao or [])
        if l.strip() and not RE_CABECALHO_PAGINA.match(l.strip())
    ]

    texto_bloco = "\n".join(linhas_bloco)
    if "ENADE" in texto_bloco and not RE_CODIGO_DISCIPLINA.search(
        texto_bloco.replace("ENADE", "")
    ):
        return None

    # Caso 1: Formato layout inline (colunas na mesma linha inicial)
    primeira = linhas_bloco[0].strip()
    m_inline = RE_COMPONENTE_INLINE.match(primeira)
    if m_inline:
        simbolo = m_inline.group(2)
        codigo = m_inline.group(3)
        parte_nome = m_inline.group(4).strip()
        ch = int(m_inline.group(5))
        turma = m_inline.group(6).strip()
        freq = _parse_float_ptbr(m_inline.group(7))
        mencao = m_inline.group(8).strip()
        situacao = m_inline.group(9).strip()

        linhas_extras = prefixos_limpos + [parte_nome] + [
            l.strip()
            for l in linhas_bloco[1:]
            if l.strip() and not RE_CABECALHO_PAGINA.match(l.strip())
        ]
        nome, professores = _extrair_professores_e_nome(linhas_extras)
        return HistoricoComponenteItem(
            semestre=semestre,
            codigo=codigo,
            nome=nome or parte_nome,
            professores=professores,
            ch=ch,
            turma=None if turma == "--" else turma,
            frequencia=freq,
            mencao=None if mencao.startswith("-") else mencao,
            situacao=situacao,
            natureza_simbolo=simbolo,
        )

    # Caso 2: Formato empilhado (código + métricas ao final do bloco ou no meio)
    linhas_limpas: List[str] = list(prefixos_limpos)
    for idx, linha in enumerate(linhas_bloco):
        txt = linha.strip()
        if not txt or RE_CABECALHO_PAGINA.match(txt):
            continue
        if idx == 0:
            txt = RE_PERIODO_INICIO.sub("", txt).strip()
        if txt:
            linhas_limpas.append(txt)

    linha_metrica_idx = None
    m_fim = None
    for idx, txt in enumerate(linhas_limpas):
        m = RE_LINHA_COLUNAS_FIM.search(txt)
        if m:
            linha_metrica_idx = idx
            m_fim = m
            break

    if m_fim is not None and linha_metrica_idx is not None:
        simbolo = m_fim.group(1)
        codigo = m_fim.group(2)
        ch = int(m_fim.group(3))
        turma = m_fim.group(4).strip()
        freq = _parse_float_ptbr(m_fim.group(5))
        mencao = m_fim.group(6).strip()
        situacao = m_fim.group(7).strip()

        prefixo_metrica = RE_LINHA_COLUNAS_FIM.sub("", linhas_limpas[linha_metrica_idx]).strip()
        linhas_desc = (
            linhas_limpas[:linha_metrica_idx]
            + ([prefixo_metrica] if prefixo_metrica else [])
            + linhas_limpas[linha_metrica_idx + 1 :]
        )
    else:
        # Fallback: métricas sem código na mesma linha (código ficou em linha separada)
        m_gen = None
        for idx, txt in enumerate(linhas_limpas):
            m = RE_METRICAS_FIM_GENERICA.search(txt)
            if m:
                linha_metrica_idx = idx
                m_gen = m
                break
        if m_gen is None or linha_metrica_idx is None:
            return None

        simbolo = None
        codigo = None
        ch = int(m_gen.group(1))
        turma = m_gen.group(2).strip()
        freq = _parse_float_ptbr(m_gen.group(3))
        mencao = m_gen.group(4).strip()
        situacao = m_gen.group(5).strip()

        prefixo_metrica = RE_METRICAS_FIM_GENERICA.sub("", linhas_limpas[linha_metrica_idx]).strip()
        linhas_candidatas = (
            linhas_limpas[:linha_metrica_idx]
            + ([prefixo_metrica] if prefixo_metrica else [])
            + linhas_limpas[linha_metrica_idx + 1 :]
        )
        linhas_desc = []
        for cand in linhas_candidatas:
            if codigo is None:
                m_cod = RE_CODIGO_PREFIXO_LINHA.match(cand) or RE_CODIGO_DISCIPLINA.search(cand)
                if m_cod:
                    if m_cod.lastindex == 2:
                        simbolo = simbolo or m_cod.group(1)
                        codigo = m_cod.group(2)
                        restante = RE_CODIGO_PREFIXO_LINHA.sub("", cand, count=1).strip()
                    else:
                        codigo = m_cod.group(1)
                        restante = RE_CODIGO_DISCIPLINA.sub("", cand, count=1).strip()
                    if restante:
                        linhas_desc.append(restante)
                    continue
            linhas_desc.append(cand)

        if not codigo:
            return None

    nome, professores = _extrair_professores_e_nome(linhas_desc)

    if not nome or codigo == "ENADE":
        return None

    return HistoricoComponenteItem(
        semestre=semestre,
        codigo=codigo,
        nome=nome,
        professores=professores,
        ch=ch,
        turma=None if turma == "--" else turma,
        frequencia=freq,
        mencao=None if mencao.startswith("-") else mencao,
        situacao=situacao,
        natureza_simbolo=simbolo,
    )


def _extrair_componentes_de_texto(texto: str) -> List[HistoricoComponenteItem]:
    itens: List[HistoricoComponenteItem] = []
    em_secao = False
    semestre_atual: Optional[str] = None
    bloco_atual: List[str] = []
    prefixo_bloco_atual: List[str] = []
    linhas_pendentes_proximo: List[str] = []
    bloco_tem_codigo = False
    bloco_tem_metricas = False
    bloco_pos_docente = False
    aguardando_fim_docente = False

    def _fechar_bloco():
        nonlocal semestre_atual, bloco_atual, prefixo_bloco_atual
        nonlocal bloco_tem_codigo, bloco_tem_metricas, bloco_pos_docente, aguardando_fim_docente
        if semestre_atual and bloco_atual:
            item = _parse_bloco_componente(semestre_atual, bloco_atual, prefixo_bloco_atual)
            if item is not None:
                itens.append(item)
        semestre_atual = None
        bloco_atual = []
        prefixo_bloco_atual = []
        bloco_tem_codigo = False
        bloco_tem_metricas = False
        bloco_pos_docente = False
        aguardando_fim_docente = False

    for linha in texto.splitlines():
        txt = linha.strip()
        norm = _normalizar_para_busca(txt)

        if "componentes curriculares cursados/cursando" in norm:
            em_secao = True
            continue

        if em_secao and (
            norm.startswith("legenda")
            or "carga horaria integralizada" in norm
            or "componentes curriculares obrigatorios pendentes" in norm
        ):
            _fechar_bloco()
            linhas_pendentes_proximo = []
            em_secao = False
            continue

        if not em_secao or not txt or RE_CABECALHO_PAGINA.match(txt):
            continue

        m_periodo = RE_PERIODO_INICIO.match(txt)
        if m_periodo:
            # Se a nova linha abriu com código/métricas mas sem nome inline,
            # resgata eventuais linhas órfãs não-docentes no fim do bloco anterior.
            if (
                RE_COMPONENTE_INLINE_SEM_NOME.match(txt)
                and bloco_tem_metricas
                and len(bloco_atual) > 1
                and not linhas_pendentes_proximo
            ):
                while len(bloco_atual) > 1:
                    ultima = bloco_atual[-1]
                    if (
                        _linha_tem_docente_ch(ultima)
                        or _linha_inicia_com_titulo_docente(ultima)
                        or RE_COMPONENTE_INLINE.match(ultima)
                        or RE_LINHA_COLUNAS_FIM.search(ultima)
                    ):
                        break
                    linhas_pendentes_proximo.insert(0, bloco_atual.pop())

            _fechar_bloco()
            semestre_atual = m_periodo.group(1)
            prefixo_bloco_atual = list(linhas_pendentes_proximo)
            linhas_pendentes_proximo = []
            bloco_atual = [txt]
            sem_periodo = RE_PERIODO_INICIO.sub("", txt).strip()
            bloco_tem_codigo = bool(
                RE_CODIGO_DISCIPLINA.search(sem_periodo)
                or any(RE_CODIGO_DISCIPLINA.search(p) for p in prefixo_bloco_atual)
            )
            bloco_tem_metricas = bool(
                RE_COMPONENTE_INLINE.match(txt)
                or RE_COMPONENTE_INLINE_SEM_NOME.match(txt)
                or RE_LINHA_COLUNAS_FIM.search(txt)
            )
            continue

        if semestre_atual is None:
            linhas_pendentes_proximo.append(txt)
            continue

        if linhas_pendentes_proximo:
            linhas_pendentes_proximo.append(txt)
            continue

        eh_docente = (
            aguardando_fim_docente
            or _linha_tem_docente_ch(txt)
            or _linha_inicia_com_titulo_docente(txt)
        )
        if eh_docente:
            bloco_atual.append(txt)
            if _linha_termina_docente_completo(txt):
                bloco_pos_docente = True
                aguardando_fim_docente = False
            elif _linha_continua_docente(txt) or _linha_inicia_com_titulo_docente(txt):
                aguardando_fim_docente = True
            else:
                aguardando_fim_docente = True
            continue

        if bloco_pos_docente:
            linhas_pendentes_proximo.append(txt)
            continue

        if bloco_tem_codigo and _linha_tem_codigo_disciplina(txt):
            linhas_pendentes_proximo.append(txt)
            continue

        bloco_atual.append(txt)
        if RE_CODIGO_DISCIPLINA.search(txt):
            bloco_tem_codigo = True
        if RE_LINHA_COLUNAS_FIM.search(txt) or RE_METRICAS_FIM_GENERICA.search(txt):
            bloco_tem_metricas = True

    _fechar_bloco()
    return itens


def _extrair_pendentes(texto_layout: str, texto_padrao: str) -> List[HistoricoPendenteItem]:
    pendentes: List[HistoricoPendenteItem] = []
    vistos = set()

    for fonte in (texto_layout, texto_padrao):
        em_secao = False
        for linha in fonte.splitlines():
            txt = linha.strip()
            norm = _normalizar_para_busca(txt)

            if "componentes curriculares obrigatorios pendentes" in norm:
                em_secao = True
                continue

            if em_secao and (
                norm.startswith("observacoes")
                or norm.startswith("atencao, agora o historico")
                or "carga horaria" in norm
            ):
                em_secao = False
                continue

            if not em_secao or not txt or RE_CABECALHO_PAGINA.match(txt):
                continue

            m = RE_PENDENTE.match(txt)
            if m:
                codigo = m.group(1).upper()
                nome = " ".join(m.group(2).split()).strip()
                matriculado = bool(m.group(3))
                ch = int(m.group(4))
                if codigo != "ENADE" and codigo not in vistos:
                    vistos.add(codigo)
                    pendentes.append(
                        HistoricoPendenteItem(
                            codigo=codigo,
                            nome=nome,
                            ch=ch,
                            matriculado=matriculado,
                        )
                    )
        if pendentes:
            break

    return pendentes


def _validar_consistencia(
    componentes: List[HistoricoComponenteItem],
    carga_horaria: HistoricoCargaHoraria,
) -> None:
    if not componentes:
        raise HistoricoParserError(
            "Nenhum componente curricular válido foi encontrado no histórico."
        )

    integralizado_total = carga_horaria.integralizado.total
    if integralizado_total > 0:
        soma_ch_aprovada = sum(
            c.ch for c in componentes if c.situacao in SITUACOES_CONTABILIZAVEIS_APROVADAS
        )
        complementares = carga_horaria.integralizado.complementares
        # Tolera variação pequena por atividades complementares/extensionistas avulsas
        if soma_ch_aprovada > integralizado_total + 180:
            raise HistoricoParserError(
                "Inconsistência detectada: a soma das disciplinas aprovadas excede a carga horária integralizada."
            )
        if soma_ch_aprovada + complementares + 180 < integralizado_total:
            raise HistoricoParserError(
                "Inconsistência detectada entre as disciplinas aprovadas e a carga horária integralizada."
            )


def parse_historico_pdf(pdf_bytes: bytes) -> HistoricoExtraido:
    """
    Faz o parsing em memória de um Histórico Escolar oficial do SIGAA (UnB),
    validando estrutura, código de verificação e consistência de carga horária.
    """
    texto_layout, texto_padrao = _extrair_texto_pdf(pdf_bytes)
    texto_combinado = f"{texto_layout}\n{texto_padrao}"

    matricula, data_emissao, codigo_verificacao = _validar_estrutura_oficial(texto_combinado)
    dados_academicos = _extrair_dados_academicos(
        texto_layout, texto_padrao, data_emissao, codigo_verificacao
    )
    carga_horaria = _extrair_carga_horaria(texto_layout, texto_padrao)

    comp_layout = _extrair_componentes_de_texto(texto_layout)
    comp_padrao = (
        _extrair_componentes_de_texto(texto_padrao)
        if texto_padrao != texto_layout
        else []
    )
    componentes = comp_padrao if len(comp_padrao) > len(comp_layout) else comp_layout

    _validar_consistencia(componentes, carga_horaria)
    pendentes = _extrair_pendentes(texto_layout, texto_padrao)

    cursadas = [c for c in componentes if c.situacao not in SITUACOES_CURSANDO]
    cursando = [c for c in componentes if c.situacao in SITUACOES_CURSANDO]

    return HistoricoExtraido(
        matricula=matricula,
        dados_academicos=dados_academicos,
        carga_horaria=carga_horaria,
        cursadas=cursadas,
        cursando=cursando,
        pendentes=pendentes,
    )
