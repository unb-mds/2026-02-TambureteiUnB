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
RE_DOCENTE_PARTE = re.compile(
    r"(?:(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+)?[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s.'-]{2,}?\(\d+h\)",
    re.UNICODE,
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
    r"^(SIGAA\s*-|UnB\s*-|DEG\s*-|SAA\s*-|Campus Darcy|Credenciada conforme|na se[çc][ãa]o 01|"
    r"Hist[óo]rico Escolar\s*-|Nome:\s|Ano/Per[íi]odo|Letivo\s+Componente|"
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


def _extrair_professores_e_nome(
    linhas_texto: List[str],
) -> Tuple[str, List[str]]:
    """Separa nome da disciplina e lista de docentes a partir das linhas internas do bloco."""
    texto_unido = " ".join(l.strip() for l in linhas_texto if l.strip())
    professores: List[str] = []
    partes_nome_preservadas: List[str] = []

    for match in RE_DOCENTE_PARTE.finditer(texto_unido):
        docente_raw = " ".join(match.group(0).split()).strip(" ,")
        docente_sem_ch = re.sub(r"\s*\(\d+h\)\s*$", "", docente_raw).strip()
        titulo_match = RE_TITULO_DOCENTE.search(docente_sem_ch)
        if titulo_match and titulo_match.start() > 0:
            prefixo = docente_sem_ch[: titulo_match.start()].strip()
            if prefixo:
                partes_nome_preservadas.append(prefixo)
            docente_sem_ch = docente_sem_ch[titulo_match.start() :].strip()
        if docente_sem_ch and docente_sem_ch not in professores:
            professores.append(docente_sem_ch)

    nome_limpo = RE_DOCENTE_PARTE.sub("", texto_unido)
    nome_limpo = re.sub(r"\(\d+h\)", "", nome_limpo)
    if partes_nome_preservadas:
        nome_limpo = " ".join([nome_limpo, *partes_nome_preservadas])
    nome_limpo = " ".join(nome_limpo.replace(",", " ").split()).strip()
    return nome_limpo, professores


def _parse_bloco_componente(
    semestre: str, linhas_bloco: List[str]
) -> Optional[HistoricoComponenteItem]:
    if not linhas_bloco:
        return None

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

        linhas_extras = [parte_nome] + [
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
    linhas_limpas: List[str] = []
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

    if m_fim is None or linha_metrica_idx is None:
        return None

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

    def _fechar_bloco():
        nonlocal semestre_atual, bloco_atual
        if semestre_atual and bloco_atual:
            item = _parse_bloco_componente(semestre_atual, bloco_atual)
            if item is not None:
                itens.append(item)
        semestre_atual = None
        bloco_atual = []

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
            em_secao = False
            continue

        if not em_secao or not txt or RE_CABECALHO_PAGINA.match(txt):
            continue

        m_periodo = RE_PERIODO_INICIO.match(txt)
        if m_periodo:
            _fechar_bloco()
            semestre_atual = m_periodo.group(1)
            bloco_atual = [txt]
        elif semestre_atual is not None:
            bloco_atual.append(txt)

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
