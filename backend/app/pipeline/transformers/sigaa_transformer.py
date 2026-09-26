import re
import unicodedata
from typing import Any, Dict, List
from pydantic import ValidationError
from app.pipeline.transformers.base import BaseTransformer
from app.pipeline.schemas.sigaa import (
    SIGAADocenteClean,
    SIGAADisciplinaClean,
    SIGAATurmaClean,
    SIGAACursoClean,
    SIGAACursoVinculoClean,
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
    - Validação de integridade estrutural via contratos Pydantic
    """

    def __init__(self):
        super().__init__(name="SIGAATransformer")

    def transform(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforma o payload bruto do SIGAA contendo turmas, disciplinas, docentes e cursos.
        """
        raw_turmas = raw_data.get("turmas", [])
        raw_disciplinas = raw_data.get("disciplinas", [])
        raw_docentes = raw_data.get("docentes", [])
        raw_cursos = raw_data.get("cursos", [])

        clean_disciplinas = self.transform_disciplinas(raw_disciplinas)
        clean_docentes = self.transform_docentes(raw_docentes)
        clean_turmas = self.transform_turmas(raw_turmas)
        clean_cursos = self.transform_cursos(raw_cursos)

        return {
            "cursos": clean_cursos,
            "disciplinas": clean_disciplinas,
            "docentes": clean_docentes,
            "turmas": clean_turmas,
        }

    def transform_cursos(self, raw_list: List[Dict[str, Any]]) -> List[SIGAACursoClean]:
        """Normaliza e valida cursos acadêmicos."""
        seen_slugs = set()
        clean: List[SIGAACursoClean] = []
        for item in raw_list:
            nome = str(item.get("nome", "")).strip()
            slug = str(item.get("slug", "")).strip() or slugify(nome)
            if not slug or slug in seen_slugs:
                continue
            seen_slugs.add(slug)
            clean.append(
                SIGAACursoClean(
                    id=item.get("id"),
                    codigo_sigaa=item.get("codigo_sigaa"),
                    codigo_mec=item.get("codigo_mec"),
                    nome=nome,
                    slug=slug,
                    campus=item.get("campus", "FCTE - Gama"),
                    grau=item.get("grau", "Bacharelado"),
                    turno=item.get("turno", "Diurno"),
                )
            )
        return clean

    def transform_disciplinas(self, raw_list: List[Dict[str, Any]]) -> List[SIGAADisciplinaClean]:
        """Normaliza, dedupica e valida componentes curriculares."""
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

            try:
                ch_val = int(item["carga_horaria"]) if item.get("carga_horaria") is not None and str(item["carga_horaria"]).isdigit() else None
                creditos_val = int(item["creditos"]) if item.get("creditos") is not None and str(item["creditos"]).isdigit() else None
                if creditos_val is None and ch_val:
                    creditos_val = ch_val // 15

                ementa_raw = item.get("ementa")
                ementa_limpa = str(ementa_raw).strip() if ementa_raw else None
                if ementa_limpa:
                    ementa_limpa = re.sub(r"[ \t]+", " ", ementa_limpa)

                # Processa vínculos com cursos
                cursos_raw = item.get("cursos", [])
                cursos_clean: List[SIGAACursoVinculoClean] = []
                for c in cursos_raw:
                    try:
                        c_slug = c.get("curso_slug")
                        if c_slug:
                            cursos_clean.append(
                                SIGAACursoVinculoClean(
                                    curso_slug=c_slug,
                                    periodo_sugerido=c.get("periodo_sugerido"),
                                    is_obrigatoria=bool(c.get("is_obrigatoria", True)),
                                    natureza=str(c.get("natureza", "Obrigatoria")),
                                )
                            )
                    except Exception:
                        pass

                pre_req_raw = item.get("pre_requisitos")
                pre_req_limpo = str(pre_req_raw).strip() if pre_req_raw else None

                co_req_raw = item.get("co_requisitos")
                co_req_limpo = str(co_req_raw).strip() if co_req_raw else None

                equiv_raw = item.get("equivalencias")
                equiv_limpo = str(equiv_raw).strip() if equiv_raw else None

                clean.append(
                    SIGAADisciplinaClean(
                        codigo=codigo,
                        slug=slugify(nome_final),
                        nome=nome_final,
                        departamento=str(item["departamento"]).strip() if item.get("departamento") is not None else None,
                        creditos=creditos_val,
                        carga_horaria=ch_val,
                        ementa=ementa_limpa or None,
                        pre_requisitos=pre_req_limpo or None,
                        co_requisitos=co_req_limpo or None,
                        equivalencias=equiv_limpo or None,
                        cursos=cursos_clean,
                    )
                )
            except (ValidationError, Exception) as e:
                self.logger.warning(f"Ignorando registro de disciplina inválido '{codigo}': {e}")

        return clean

    def transform_docentes(self, raw_list: List[Dict[str, Any]]) -> List[SIGAADocenteClean]:
        """Normaliza nomes de docentes para Title Case, unifica departamentos e remove duplicatas."""
        seen_docentes: Dict[str, SIGAADocenteClean] = {}
        clean: List[SIGAADocenteClean] = []

        for item in raw_list:
            nome_raw = str(item.get("nome", "")).strip()
            if not nome_raw:
                continue

            # Remove prefixos como "Prof.", "Dr.", "Dra." (inclusive títulos compostos como "Prof. Dr.")
            nome_limpo = re.sub(r"^(?:(?:prof\.|profa\.|dr\.|dra\.|me\.|ma\.)\s*)+", "", nome_raw, flags=re.IGNORECASE).strip()
            partes = [part.capitalize() for part in nome_limpo.split()]
            nome_normalizado = " ".join(partes)

            chave_dedup = slugify(nome_normalizado)
            if not chave_dedup:
                continue

            depto_novo = str(item.get("departamento") or "").strip() or None

            if chave_dedup in seen_docentes:
                existente = seen_docentes[chave_dedup]
                if depto_novo and existente.departamento != depto_novo:
                    deptos = set(d.strip() for d in existente.departamento.split(",")) if existente.departamento else set()
                    deptos.update(d.strip() for d in depto_novo.split(","))
                    merged = ", ".join(sorted(deptos))
                    if len(merged) > 255:
                        merged = merged[:252] + "..."
                    existente.departamento = merged
                continue

            if depto_novo and len(depto_novo) > 255:
                depto_novo = depto_novo[:252] + "..."

            try:
                doc_obj = SIGAADocenteClean(
                    nome=nome_normalizado,
                    departamento=depto_novo,
                )
                seen_docentes[chave_dedup] = doc_obj
                clean.append(doc_obj)
            except (ValidationError, Exception) as e:
                self.logger.warning(f"Ignorando registro de docente inválido '{nome_normalizado}': {e}")

        return clean

    def transform_turmas(self, raw_list: List[Dict[str, Any]]) -> List[SIGAATurmaClean]:
        """Padroniza e valida informações de turmas ofertadas."""
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

            try:
                cap_val = int(item["capacidade"]) if item.get("capacidade") is not None and str(item["capacidade"]).isdigit() else None
                matr_val = int(item["matriculados"]) if item.get("matriculados") is not None and str(item["matriculados"]).isdigit() else None

                clean.append(
                    SIGAATurmaClean(
                        codigo_disciplina=cod_disc,
                        slug_disciplina=slug_disc,
                        codigo_turma=cod_turma,
                        semestre=semestre,
                        horario=str(item.get("horario", "")).strip() or None,
                        local=str(item.get("local", "")).strip() or None,
                        docentes=docentes,
                        capacidade=cap_val,
                        matriculados=matr_val,
                    )
                )
            except (ValidationError, Exception) as e:
                self.logger.warning(f"Ignorando turma inválida '{cod_disc} - {cod_turma}': {e}")

        return clean
