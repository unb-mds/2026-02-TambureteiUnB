"""Regras puras de dominio para moderacao autonoma hibrida via LLM local (Ollama)."""
from dataclasses import dataclass
import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

LIMIAR_CONFIANCA_PADRAO: float = 0.80
MAX_CARACTERES_PDF: int = 8000

CategoriaViolacao = Literal[
    "LGPD_DADOS_PESSOAIS",
    "GABARITO_VIGENTE",
    "OFENSA_DIFAMACAO",
    "DIREITOS_AUTORAIS",
    "SPAM_IRRELEVANTE",
    "NENHUMA",
]

DecisaoIA = Literal["APROVAR", "REJEITAR", "REVISAO_HUMANA"]

PROMPT_SISTEMA_MODERACAO = (
    "Voce e o sistema de triagem academica do Tamburetei UnB (Universidade de Brasilia). "
    "Avalie se o conteudo enviado por estudantes respeita as regras de governanca (RN01 e RN06): "
    "1. LGPD_DADOS_PESSOAIS: proibido conter nomes completos de alunos, numeros de matricula, CPF, "
    "e-mails pessoais, telefones ou cabecalhos de provas identificando discentes. "
    "2. GABARITO_VIGENTE: proibido publicar resolucoes ou gabaritos de avaliacoes ainda vigentes. "
    "3. OFENSA_DIFAMACAO: proibido discurso de odio, xingamentos, assedio ou ataques pessoais a docentes e discentes. "
    "4. DIREITOS_AUTORAIS: proibido reproduzir livros inteiros protegidos por copyright. "
    "5. SPAM_IRRELEVANTE: proibido propaganda comercial, links maliciosos ou texto sem relacao academica. "
    "Responda estritamente em JSON valido conforme o schema solicitado."
)


class VereditoModIA(BaseModel):
    """Estrutura deterministica de saida exigida do modelo local no Ollama."""

    model_config = ConfigDict(extra="ignore")

    decisao: DecisaoIA
    confianca: float = Field(ge=0.0, le=1.0)
    categoria_violacao: CategoriaViolacao = "NENHUMA"
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
        raise ValueError("O limiar de confianca deve ser numerico entre 0.0 e 1.0.")
    valor = float(limiar)
    if valor < 0.0 or valor > 1.0:
        raise ValueError("O limiar de confianca deve estar entre 0.0 e 1.0.")
    return valor


def truncar_texto_pdf(texto: str, limite: int = MAX_CARACTERES_PDF) -> str:
    if limite <= 0:
        raise ValueError("O limite de caracteres deve ser positivo.")
    limpo = " ".join((texto or "").split())
    if len(limpo) <= limite:
        return limpo
    return limpo[:limite].rstrip() + "..."


def construir_prompt_comentario(
    conteudo: str,
    topico: str | None = None,
    autor_alias: str | None = None,
) -> list[dict[str, str]]:
    texto = (conteudo or "").strip()
    if not texto:
        raise ValueError("O conteudo do comentario nao pode ser vazio para triagem.")
    topico_str = (topico or "Geral").strip() or "Geral"
    alias_str = (autor_alias or "Estudante Anonimo").strip() or "Estudante Anonimo"
    mensagem_usuario = (
        f"Tipo de submissao: COMENTARIO ACADEMICO\n"
        f"Apelido do autor: {alias_str}\n"
        f"Topico de dificuldade: {topico_str}\n"
        f"Texto do comentario:\n{texto}"
    )
    return [
        {"role": "system", "content": PROMPT_SISTEMA_MODERACAO},
        {"role": "user", "content": mensagem_usuario},
    ]


def construir_prompt_material(
    titulo: str,
    tipo: str,
    formato: str,
    texto_extraido: str | None = None,
) -> list[dict[str, str]]:
    titulo_limpo = (titulo or "").strip()
    if not titulo_limpo:
        raise ValueError("O titulo do material nao pode ser vazio para triagem.")
    trecho = truncar_texto_pdf(texto_extraido or "")
    corpo_texto = trecho if trecho else "[Sem texto extraido; analise baseada em imagem/metadados]"
    mensagem_usuario = (
        f"Tipo de submissao: MATERIAL DE APOIO ({tipo})\n"
        f"Formato do arquivo: {formato.upper()}\n"
        f"Titulo do material: {titulo_limpo}\n"
        f"Conteudo extraido do documento:\n{corpo_texto}"
    )
    return [
        {"role": "system", "content": PROMPT_SISTEMA_MODERACAO},
        {"role": "user", "content": mensagem_usuario},
    ]


def interpretar_resposta_ollama(conteudo_json: str) -> VereditoModIA:
    if not conteudo_json or not conteudo_json.strip():
        raise ValueError("Resposta vazia recebida do servico Ollama.")
    try:
        dados = json.loads(conteudo_json)
    except json.JSONDecodeError as exc:
        raise ValueError("JSON malformado retornado pelo servico Ollama.") from exc
    if not isinstance(dados, dict):
        raise ValueError("O payload retornado pelo Ollama deve ser um objeto JSON.")
    if "motivo" in dados and isinstance(dados["motivo"], str):
        dados["motivo"] = dados["motivo"].strip()[:1000]
    try:
        return VereditoModIA.model_validate(dados)
    except ValidationError as exc:
        raise ValueError("Schema de veredito invalido retornado pelo Ollama.") from exc


def resolver_moderacao_comentario(
    veredito: VereditoModIA | None,
    limiar_confianca: float = LIMIAR_CONFIANCA_PADRAO,
    motivo_fallback: str | None = None,
) -> TransicaoModeracao:
    limiar = validar_limiar_confianca(limiar_confianca)
    if veredito is None:
        motivo = (
            (motivo_fallback or "").strip()
            or "Triagem automatica indisponivel — aguardando revisao de moderador."
        )
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo=None,
            motivo_moderacao=motivo[:1000],
            confianca_ia=None,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    motivo_limpo = veredito.motivo.strip()[:1000]
    if veredito.confianca < limiar or veredito.decisao == "REVISAO_HUMANA":
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo=None,
            motivo_moderacao=f"[Escalonado pela IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],
            confianca_ia=veredito.confianca,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "APROVAR" and veredito.categoria_violacao == "NENHUMA":
        return TransicaoModeracao(
            status_final="PUBLICADO",
            status_moderacao_arquivo=None,
            motivo_moderacao=motivo_limpo,
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "REJEITAR":
        return TransicaoModeracao(
            status_final="OCULTO",
            status_moderacao_arquivo=None,
            motivo_moderacao=f"[{veredito.categoria_violacao}] {motivo_limpo}"[:1000],
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=False,
        )

    return TransicaoModeracao(
        status_final="PENDENTE",
        status_moderacao_arquivo=None,
        motivo_moderacao=f"[Inconsistencia IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],
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
        motivo = (
            (motivo_fallback or "").strip()
            or "Triagem automatica indisponivel — aguardando curadoria humana."
        )
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo="em_analise",
            motivo_moderacao=motivo[:1000],
            confianca_ia=None,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    motivo_limpo = veredito.motivo.strip()[:1000]
    if veredito.confianca < limiar or veredito.decisao == "REVISAO_HUMANA":
        return TransicaoModeracao(
            status_final="PENDENTE",
            status_moderacao_arquivo="em_analise",
            motivo_moderacao=f"[Escalonado pela IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],
            confianca_ia=veredito.confianca,
            moderado_por=None,
            registrar_curadoria_ia=False,
        )

    if veredito.decisao == "APROVAR" and veredito.categoria_violacao == "NENHUMA":
        return TransicaoModeracao(
            status_final="APROVADO",
            status_moderacao_arquivo="ativo",
            motivo_moderacao=motivo_limpo,
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=True,
        )

    if veredito.decisao == "REJEITAR":
        return TransicaoModeracao(
            status_final="RECUSADO",
            status_moderacao_arquivo="bloqueado",
            motivo_moderacao=f"[{veredito.categoria_violacao}] {motivo_limpo}"[:1000],
            confianca_ia=veredito.confianca,
            moderado_por="IA",
            registrar_curadoria_ia=True,
        )

    return TransicaoModeracao(
        status_final="PENDENTE",
        status_moderacao_arquivo="em_analise",
        motivo_moderacao=f"[Inconsistencia IA ({veredito.categoria_violacao})]: {motivo_limpo}"[:1000],
        confianca_ia=veredito.confianca,
        moderado_por=None,
        registrar_curadoria_ia=False,
    )
