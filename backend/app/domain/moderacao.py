"""Regras puras de dominio para moderacao autonoma hibrida via LLM local (Ollama)."""
from dataclasses import dataclass
import json
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

LIMIAR_CONFIANCA_PADRAO: float = 0.80
MAX_CARACTERES_PDF: int = 3500

_REGEX_CPF_FORMATADO = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")  # pragma: no mutate
_REGEX_ONZE_DIGITOS = re.compile(r"(?<!\d)\d{11}(?!\d)")  # pragma: no mutate
_REGEX_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")  # pragma: no mutate
_REGEX_MATRICULA_BARRA = re.compile(r"\b(?:1[0-9]|2[0-9])/\d{7}\b")  # pragma: no mutate
_REGEX_MATRICULA_COMPACTA = re.compile(r"\b(?:1[5-9]|2[0-9])[012]\d{6}\b")  # pragma: no mutate

CategoriaViolacao = Literal[  # pragma: no mutate
    "LGPD_DADOS_PESSOAIS",  # pragma: no mutate
    "GABARITO_VIGENTE",  # pragma: no mutate
    "OFENSA_DIFAMACAO",  # pragma: no mutate
    "DIREITOS_AUTORAIS",  # pragma: no mutate
    "SPAM_IRRELEVANTE",  # pragma: no mutate
    "NENHUMA",  # pragma: no mutate
]

DecisaoIA = Literal["APROVAR", "REJEITAR", "REVISAO_HUMANA"]  # pragma: no mutate

PROMPT_SISTEMA_MODERACAO = (  # pragma: no mutate
    "Voce e o sistema de triagem academica do Tamburetei UnB (Universidade de Brasilia). "  # pragma: no mutate
    "Avalie se o comentario ou material de apoio enviado por estudantes respeita as regras de governanca (RN01, RN04, RN05 e RN06): "  # pragma: no mutate
    "1. LGPD_DADOS_PESSOAIS: proibido conter dados pessoais preenchidos de estudantes reais (nomes completos de alunos, "  # pragma: no mutate
    "numeros de matricula preenchidos, CPF, e-mails pessoais, telefones ou cabecalhos de provas identificados com dados de alunos). "  # pragma: no mutate
    "Atencao: o campo 'Apelido do autor' e apenas o nome publico da conta autenticada na plataforma e NUNCA viola a LGPD nem configura ofensa. "  # pragma: no mutate
    "Atencao: nome de professor no cabecalho oficial da prova/lista e campos em branco para preenchimento (ex.: 'Nome:', 'Nomes:', 'Matricula:') NAO violam LGPD. "  # pragma: no mutate
    "2. GABARITO_VIGENTE: proibido publicar resolucoes ou gabaritos de avaliacoes ainda vigentes. "  # pragma: no mutate
    "Atencao (RN05): enunciados de provas antigas, listas de exercicios sem gabarito, resumos conceituais e dicas de estudo sao PERMITIDOS. "  # pragma: no mutate
    "3. OFENSA_DIFAMACAO: proibido discurso de odio, xingamentos, assedio ou ataques pessoais a docentes e discentes. "  # pragma: no mutate
    "4. DIREITOS_AUTORAIS: proibido reproduzir livros inteiros protegidos por copyright. "  # pragma: no mutate
    "5. SPAM_IRRELEVANTE: proibido propaganda comercial, links maliciosos ou texto sem relacao academica. "  # pragma: no mutate
    "REGRA PADRAO: apenas escolha 'REJEITAR' se houver violacao explicita de uma das 5 regras acima. "  # pragma: no mutate
    "Se for um comentario respeitoso (elogio, relato de experiencia, dica de estudo, opiniao breve sobre a dificuldade da materia ou critica construtiva sem xingamentos nem dados pessoais) "  # pragma: no mutate
    "ou um material academico legitimo (enunciado de prova antiga, lista de exercicios, resumo autoral ou dica da disciplina sem dados pessoais de alunos nem gabarito vigente), "  # pragma: no mutate
    "escolha 'APROVAR' com categoria_violacao 'NENHUMA'. Na duvida entre aprovar e rejeitar, escolha 'REVISAO_HUMANA'. "  # pragma: no mutate
    "Responda estritamente em JSON valido conforme o schema solicitado, preenchendo todos os campos: "  # pragma: no mutate
    "decisao ('APROVAR', 'REJEITAR' ou 'REVISAO_HUMANA'), "  # pragma: no mutate
    "confianca (numero decimal entre 0.0 e 1.0, por exemplo 0.95; nunca use escala de 0 a 100), "  # pragma: no mutate
    "categoria_violacao ('NENHUMA' ao aprovar, ou uma das 5 categorias acima ao rejeitar/escalonar) "  # pragma: no mutate
    "e motivo (justificativa breve em portugues)."  # pragma: no mutate
)


class VereditoModIA(BaseModel):
    """Estrutura deterministica de saida exigida do modelo local no Ollama."""

    model_config = ConfigDict(extra="ignore")  # pragma: no mutate

    decisao: DecisaoIA
    confianca: float = Field(ge=0.0, le=1.0)
    categoria_violacao: CategoriaViolacao
    motivo: str = Field(min_length=1, max_length=1000)


@dataclass(frozen=True)
class TransicaoModeracao:
    """Resultado imutavel do calculo de transicao de estado de moderacao."""

    status_final: str
    status_moderacao_arquivo: str | None
    motivo_moderacao: str
    confianca_ia: float | None
    moderado_por: str | None
    registrar_curadoria_ia: bool


def validar_limiar_confianca(limiar: float) -> float:
    if isinstance(limiar, bool) or not isinstance(limiar, (int, float)):
        raise ValueError("O limiar de confianca deve ser numerico entre 0.0 e 1.0.")  # pragma: no mutate
    valor = float(limiar)
    if valor < 0.0 or valor > 1.0:
        raise ValueError("O limiar de confianca deve estar entre 0.0 e 1.0.")  # pragma: no mutate
    return valor


def truncar_texto_pdf(texto: str, limite: int = MAX_CARACTERES_PDF) -> str:
    if limite <= 0:
        raise ValueError("O limite de caracteres deve ser positivo.")  # pragma: no mutate
    limpo = " ".join((texto or "").split())
    if len(limpo) <= limite:
        return limpo
    return limpo[:limite].rstrip() + "..."


def _cpf_valido_digitos(digitos: str) -> bool:
    """Valida digitos verificadores de um CPF brasileiro de 11 digitos."""
    if len(digitos) != 11 or not digitos.isdigit() or len(set(digitos)) == 1:
        return False
    numeros = [int(ch) for ch in digitos]
    soma1 = sum(numeros[i] * (10 - i) for i in range(9))
    dv1 = (soma1 * 10) % 11
    dv1 = 0 if dv1 == 10 else dv1
    if numeros[9] != dv1:
        return False
    soma2 = sum(numeros[i] * (11 - i) for i in range(10))
    dv2 = (soma2 * 10) % 11
    dv2 = 0 if dv2 == 10 else dv2
    return numeros[10] == dv2


def detectar_dados_pessoais_rn01(texto: str | None) -> VereditoModIA | None:
    """Detecta deterministicamente dados pessoais sensiveis (RN01/LGPD): CPF, e-mail e matricula UnB."""
    conteudo = (texto or "").strip()
    if not conteudo:
        return None

    achados: list[str] = []
    if _REGEX_CPF_FORMATADO.search(conteudo) or any(
        _cpf_valido_digitos(m.group(0)) for m in _REGEX_ONZE_DIGITOS.finditer(conteudo)
    ):
        achados.append("CPF")  # pragma: no mutate

    if _REGEX_EMAIL.search(conteudo):
        achados.append("e-mail")  # pragma: no mutate

    if _REGEX_MATRICULA_BARRA.search(conteudo) or _REGEX_MATRICULA_COMPACTA.search(conteudo):
        achados.append("matricula UnB")  # pragma: no mutate

    if not achados:
        return None

    return VereditoModIA(
        decisao="REJEITAR",
        confianca=1.0,
        categoria_violacao="LGPD_DADOS_PESSOAIS",
        motivo=f"Deteccao deterministica RN01 (LGPD): possivel exposicao de {', '.join(achados)}."[:1000],  # pragma: no mutate
    )


def construir_prompt_comentario(
    conteudo: str,
    topico: str | None = None,
    autor_alias: str | None = None,
) -> list[dict[str, str]]:
    texto = (conteudo or "").strip()
    if not texto:
        raise ValueError("O conteudo do comentario nao pode ser vazio para triagem.")  # pragma: no mutate
    topico_str = (topico or "Geral").strip() or "Geral"  # pragma: no mutate
    alias_str = (autor_alias or "Estudante Anonimo").strip() or "Estudante Anonimo"  # pragma: no mutate
    mensagem_usuario = (  # pragma: no mutate
        f"Tipo de submissao: COMENTARIO ACADEMICO\n"
        f"Apelido do autor (nome publico permitido da conta do remetente; NAO avalie como violacao LGPD): {alias_str}\n"
        f"Topico de dificuldade: {topico_str}\n"
        f"Texto do comentario (avalie exclusivamente este texto quanto as 5 regras):\n{texto}"
    )
    return [{"role": "system", "content": PROMPT_SISTEMA_MODERACAO}, {"role": "user", "content": mensagem_usuario}]  # pragma: no mutate


def construir_prompt_material(
    titulo: str,
    tipo: str,
    formato: str,
    texto_extraido: str | None = None,
) -> list[dict[str, str]]:
    titulo_limpo = (titulo or "").strip()
    if not titulo_limpo:
        raise ValueError("O titulo do material nao pode ser vazio para triagem.")  # pragma: no mutate
    trecho = truncar_texto_pdf(texto_extraido or "")
    corpo_texto = trecho if trecho else "[Sem texto extraido; analise baseada em imagem/metadados]"  # pragma: no mutate
    mensagem_usuario = f"Tipo de submissao: MATERIAL DE APOIO ({tipo})\nFormato do arquivo: {formato.upper()}\nTitulo do material: {titulo_limpo}\nConteudo extraido do documento:\n{corpo_texto}"  # pragma: no mutate
    return [{"role": "system", "content": PROMPT_SISTEMA_MODERACAO}, {"role": "user", "content": mensagem_usuario}]  # pragma: no mutate


def interpretar_resposta_ollama(conteudo_json: str) -> VereditoModIA:
    if not conteudo_json or not conteudo_json.strip():
        raise ValueError("Resposta vazia recebida do servico Ollama.")  # pragma: no mutate
    try:
        dados = json.loads(conteudo_json)
    except json.JSONDecodeError as exc:
        raise ValueError("JSON malformado retornado pelo servico Ollama.") from exc  # pragma: no mutate
    if not isinstance(dados, dict):
        raise ValueError("O payload retornado pelo Ollama deve ser um objeto JSON.")  # pragma: no mutate
    if "motivo" in dados and isinstance(dados["motivo"], str):
        dados["motivo"] = dados["motivo"].strip()[:1000]  # pragma: no mutate
    try:
        return VereditoModIA.model_validate(dados)
    except ValidationError as exc:
        raise ValueError("Schema de veredito invalido retornado pelo Ollama.") from exc  # pragma: no mutate


def resolver_moderacao_comentario(
    veredito: VereditoModIA | None,
    limiar_confianca: float = LIMIAR_CONFIANCA_PADRAO,
    motivo_fallback: str | None = None,
) -> TransicaoModeracao:
    limiar = validar_limiar_confianca(limiar_confianca)
    if veredito is None:
        motivo = (  # pragma: no mutate
            (motivo_fallback or "").strip()  # pragma: no mutate
            or "Triagem automatica indisponivel — aguardando revisao de moderador."  # pragma: no mutate
        )
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo=None,
            motivo_moderacao=motivo[:1000],  # pragma: no mutate
            confianca_ia=None,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    motivo_limpo = veredito.motivo.strip()[:1000]  # pragma: no mutate
    if veredito.confianca < limiar or veredito.decisao == "REVISAO_HUMANA":
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo=None,
            motivo_moderacao=f"[Escalonado pela IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],  # pragma: no mutate
            confianca_ia=veredito.confianca,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "APROVAR" and veredito.categoria_violacao == "NENHUMA":
        return TransicaoModeracao(
            status_final="PUBLICADO",
            status_moderacao_arquivo=None,
            motivo_moderacao=motivo_limpo,  # pragma: no mutate
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "REJEITAR" and veredito.categoria_violacao != "NENHUMA":
        return TransicaoModeracao(
            status_final="OCULTO",
            status_moderacao_arquivo=None,
            motivo_moderacao=f"[{veredito.categoria_violacao}] {motivo_limpo}"[:1000],  # pragma: no mutate
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=False,
        )

    return TransicaoModeracao(
        status_final="PENDENTE",
        status_moderacao_arquivo=None,
        motivo_moderacao=f"[Inconsistencia IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],  # pragma: no mutate
        confianca_ia=veredito.confianca,
        moderado_por=None,
        registrar_curadoria_ia=False,
    )


def resolver_moderacao_material(
    veredito: VereditoModIA | None,
    limiar_confianca: float = LIMIAR_CONFIANCA_PADRAO,
    motivo_fallback: str | None = None,
) -> TransicaoModeracao:
    limiar = validar_limiar_confianca(limiar_confianca)
    if veredito is None:
        motivo = (  # pragma: no mutate
            (motivo_fallback or "").strip()  # pragma: no mutate
            or "Triagem automatica indisponivel — aguardando curadoria humana."  # pragma: no mutate
        )
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo="em_analise",
            motivo_moderacao=motivo[:1000],  # pragma: no mutate
            confianca_ia=None,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    motivo_limpo = veredito.motivo.strip()[:1000]  # pragma: no mutate
    if veredito.confianca < limiar or veredito.decisao == "REVISAO_HUMANA":
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo="em_analise",
            motivo_moderacao=f"[Escalonado pela IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],  # pragma: no mutate
            confianca_ia=veredito.confianca,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "APROVAR" and veredito.categoria_violacao == "NENHUMA":
        # Arquivos (PDF/imagem) nunca sao auto-publicados pela LLM local:
        # seguem para aprovacao humana com o parecer de pre-triagem anexado.
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo="em_analise",
            motivo_moderacao=f"[Pré-aprovado na triagem IA]: {motivo_limpo}"[:1000],  # pragma: no mutate
            confianca_ia=veredito.confianca,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "REJEITAR" and veredito.categoria_violacao != "NENHUMA":
        return TransicaoModeracao(
            status_final="RECUSADO",
            status_moderacao_arquivo="bloqueado",
            motivo_moderacao=f"[{veredito.categoria_violacao}] {motivo_limpo}"[:1000],  # pragma: no mutate
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=True,
        )

    return TransicaoModeracao(
        status_final="PENDENTE",
        status_moderacao_arquivo="em_analise",
        motivo_moderacao=f"[Inconsistencia IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],  # pragma: no mutate
        confianca_ia=veredito.confianca,
        moderado_por=None,
        registrar_curadoria_ia=False,
    )
