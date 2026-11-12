from __future__ import annotations

CATEGORIAS_DENUNCIA = (
    "OFENSA_DOCENTE",
    "CONTEUDO_IMPROPRIO",
    "GABARITO_ATIVO",
    "SPAM",
    "OUTRO",
)  # pragma: no mutate

STATUS_DENUNCIA = ("PENDENTE", "DESCARTADA", "PROCEDENTE")  # pragma: no mutate
ACOES_MODERACAO_DENUNCIA = (
    "EXCLUIR_CONTEUDO",
    "DESCARTAR_DENUNCIA",
    "REMOVER",
    "APROVAR",
)  # pragma: no mutate

LIMIAR_OCULTACAO_DENUNCIAS = 3
MOTIVO_MIN_CARACTERES = 5
MOTIVO_MAX_CARACTERES = 1000

TERMOS_RISCO_RN04 = (
    "incompetente",
    "pessimo professor",
    "péssimo professor",
    "horrivel",
    "horrível",
    "ridiculo",
    "ridículo",
    "vagabundo",
    "corrupto",
    "burro",
    "idiota",
    "imbecil",
    "lixo",
    "odeio esse professor",
    "perseguicao",
    "perseguição",
    "assedio",
    "assédio",
    "humilha",
)  # pragma: no mutate


def validar_categoria_denuncia(categoria: str) -> str:
    if not isinstance(categoria, str):
        raise ValueError("Categoria de denúncia inválida.")  # pragma: no mutate
    normalizada = categoria.strip().upper()
    if normalizada not in CATEGORIAS_DENUNCIA:
        raise ValueError("Categoria de denúncia inválida.")  # pragma: no mutate
    return normalizada


def normalizar_motivo_denuncia(motivo: str | None) -> str:
    if motivo is None or not isinstance(motivo, str):
        raise ValueError("O motivo da denúncia é obrigatório.")  # pragma: no mutate
    limpo = motivo.strip()
    if not limpo:
        raise ValueError("O motivo da denúncia é obrigatório.")  # pragma: no mutate
    if len(limpo) < MOTIVO_MIN_CARACTERES:
        raise ValueError("O motivo da denúncia deve ter no mínimo 5 caracteres.")  # pragma: no mutate
    if len(limpo) > MOTIVO_MAX_CARACTERES:
        raise ValueError("O motivo da denúncia deve ter no máximo 1000 caracteres.")  # pragma: no mutate
    return limpo


def normalizar_justificativa_decisao(justificativa: str | None) -> str | None:
    if justificativa is None:
        return None
    limpa = justificativa.strip()
    if not limpa:
        return None
    if len(limpa) > MOTIVO_MAX_CARACTERES:
        raise ValueError("A justificativa deve ter no máximo 1000 caracteres.")  # pragma: no mutate
    return limpa


def atingiu_limiar_ocultacao(
    total_denuncias_pendentes: int,
    limiar: int = LIMIAR_OCULTACAO_DENUNCIAS,
) -> bool:
    if isinstance(total_denuncias_pendentes, bool) or isinstance(limiar, bool):
        raise ValueError("Parâmetros numéricos inválidos para avaliação de limiar.")  # pragma: no mutate
    if limiar < 1 or total_denuncias_pendentes < 0:
        raise ValueError("Parâmetros de limiar fora do intervalo permitido.")  # pragma: no mutate
    return total_denuncias_pendentes >= limiar


def analisar_risco_rn04(texto: str | None, categoria: str = "OUTRO") -> tuple[bool, list[str]]:
    sinalizacoes: list[str] = []
    if isinstance(categoria, str) and categoria.strip().upper() == "OFENSA_DOCENTE":
        sinalizacoes.append("CATEGORIA_OFENSA_DOCENTE")

    conteudo_baixo = (texto or "").lower()
    for termo in TERMOS_RISCO_RN04:
        if termo in conteudo_baixo:
            sinalizacoes.append(f"TERMO_DEPRECIATIVO_RN04:{termo}")

    return len(sinalizacoes) > 0, sinalizacoes


def determinar_transicao_moderacao(acao: str, tipo_alvo: str) -> dict[str, str]:
    if not isinstance(acao, str) or not isinstance(tipo_alvo, str):
        raise ValueError("Ação e tipo de alvo devem ser textuais.")  # pragma: no mutate

    acao_norm = acao.strip().upper()
    alvo_norm = tipo_alvo.strip().upper()

    if acao_norm not in ACOES_MODERACAO_DENUNCIA:
        raise ValueError("Ação de moderação inválida.")  # pragma: no mutate
    if alvo_norm not in ("COMENTARIO", "MATERIAL"):
        raise ValueError("Tipo de alvo inválido para moderação.")  # pragma: no mutate

    excluir = acao_norm in ("EXCLUIR_CONTEUDO", "REMOVER")
    if excluir:
        if alvo_norm == "COMENTARIO":
            return {
                "status_denuncia": "PROCEDENTE",
                "status_moderacao": "OCULTO",
                "status_curadoria": "",
            }
        return {
            "status_denuncia": "PROCEDENTE",
            "status_moderacao": "excluido",
            "status_curadoria": "RECUSADO",
        }

    if alvo_norm == "COMENTARIO":
        return {
            "status_denuncia": "DESCARTADA",
            "status_moderacao": "PUBLICADO",
            "status_curadoria": "",
        }
    return {
        "status_denuncia": "DESCARTADA",
        "status_moderacao": "ativo",
        "status_curadoria": "APROVADO",
    }
