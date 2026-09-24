import re
import unicodedata
from typing import Any, Dict, List, Tuple
from app.pipeline.transformers.base import BaseTransformer
from app.pipeline.schemas.sigaa import (
    SIGAADocenteClean,
    SIGAADisciplinaClean,
    SIGAATurmaClean,
)


def slugify(text: str) -> str:
    """Gera um slug canônico a partir de uma string textual (ex: 'Cálculo 1' -> 'calculo-1')."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", text)


class SIGAATransformer(BaseTransformer):
    """
    Transformador de dados brutos do SIGAA em modelos canônicos do domínio.
    
    Aplica regras de:
    - Normalização de textos e remoção de espaços duplicados
    - Geração de slugs padronizados para disciplinas
    - Limpeza de nomes de docentes (Title Case e remoção de títulos/graus)
    - Padronização do código de turma e formato do semestre (YYYY.S)
    """

    def __init__(self):
        super().__init__(name="SIGAATransformer")

    def transform(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforma o payload bruto do SIGAA contendo turmas, disciplinas e docentes.
        """
        raw_turmas = raw_data.get("turmas", [])
        raw_disciplinas = raw_data.get("disciplinas", [])
        raw_docentes = raw_data.get("docentes", [])

        clean_disciplinas = self.transform_disciplinas(raw_disciplinas)
        clean_docentes = self.transform_docentes(raw_docentes)
        clean_turmas = self.transform_turmas(raw_turmas)

        return {
            "disciplinas": clean_disciplinas,
            "docentes": clean_docentes,
            "turmas": clean_turmas,
        }

    def transform_disciplinas(self, raw_list: List[Dict[str, Any]]) -> List[SIGAADisciplinaClean]:
        """Normaliza e dedupica componentes curriculares."""
        seen_codigos = set()
        clean: List[SIGAADisciplinaClean] = []

        for item in raw_list:
            codigo = str(item.get("codigo", "")).strip().upper()
            nome = str(item.get("nome", "")).strip()
            if not codigo or not nome:
                continue

            # Remove prefixo redundante caso o nome venha como 'CODIGO - NOME'
            nome_limpo = re.sub(rf"^{re.escape(codigo)}\s*-\s*", "", nome, flags=re.IGNORECASE).strip()
            nome_final = nome_limpo if nome_limpo else nome

            if codigo in seen_codigos:
                continue
            seen_codigos.add(codigo)

            clean.append(
                SIGAADisciplinaClean(
                    codigo=codigo,
                    slug=slugify(nome_final),
                    nome=nome_final,
                    departamento=item.get("departamento", "").strip() or None,
                    creditos=int(item["creditos"]) if item.get("creditos") else None,
                    carga_horaria=int(item["carga_horaria"]) if item.get("carga_horaria") else None,
                    ementa=item.get("ementa", "").strip() or None,
                )
            )
        return clean

    def transform_docentes(self, raw_list: List[Dict[str, Any]]) -> List[SIGAADocenteClean]:
        """Normaliza nomes de docentes para Title Case e remove duplicatas."""
        seen_nomes = set()
        clean: List[SIGAADocenteClean] = []

        for item in raw_list:
            nome_raw = str(item.get("nome", "")).strip()
            if not nome_raw:
                continue

            # Remove prefixos como "Prof.", "Dr.", "Dra."
            nome_limpo = re.sub(r"^(Prof\.|Profa\.|Dr\.|Dra\.|Me\.|Ma\.)\s*", "", nome_raw, flags=re.IGNORECASE)
            nome_normalizado = " ".join([part.capitalize() for part in nome_limpo.split()])

            if nome_normalizado in seen_nomes:
                continue
            seen_nomes.add(nome_normalizado)

            clean.append(
                SIGAADocenteClean(
                    nome=nome_normalizado,
                    departamento=item.get("departamento", "").strip() or None,
                )
            )
        return clean

    def transform_turmas(self, raw_list: List[Dict[str, Any]]) -> List[SIGAATurmaClean]:
        """Padroniza informações de turmas ofertadas."""
        clean: List[SIGAATurmaClean] = []

        for item in raw_list:
            cod_disc = str(item.get("codigo_disciplina", "")).strip().upper()
            nome_disc = str(item.get("nome_disciplina", "")).strip()
            cod_turma = str(item.get("codigo_turma", "")).strip().upper()
            semestre = str(item.get("semestre", "")).strip()

            if not cod_disc or not cod_turma or not semestre:
                continue

            # Valida formato do semestre (ex: 2026.1)
            if not re.match(r"^\d{4}\.[12]$", semestre):
                continue

            docentes_raw = item.get("docentes", [])
            docentes = [str(d).strip() for d in docentes_raw if str(d).strip()]

            nome_disc_limpo = re.sub(rf"^{re.escape(cod_disc)}\s*-\s*", "", nome_disc, flags=re.IGNORECASE).strip()
            slug_disc = slugify(nome_disc_limpo if nome_disc_limpo else cod_disc)

            clean.append(
                SIGAATurmaClean(
                    codigo_disciplina=cod_disc,
                    slug_disciplina=slug_disc,
                    codigo_turma=cod_turma,
                    semestre=semestre,
                    horario=str(item.get("horario", "")).strip() or None,
                    local=str(item.get("local", "")).strip() or None,
                    docentes=docentes,
                    matriculados=int(item["matriculados"]) if item.get("matriculados") is not None else None,
                )
            )
        return clean
