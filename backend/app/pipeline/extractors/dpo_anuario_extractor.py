import csv
import json
import logging
import re
import unicodedata
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup
from app.pipeline.extractors.base import BaseExtractor

logger = logging.getLogger(__name__)


def clean_int(val: Any) -> int:
    """Limpa pontuação de milhares e converte para inteiro."""
    if val is None:
        return 0
    s = str(val).strip()
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else 0


def normalize_text(text: str) -> str:
    """Remove acentos, caracteres especiais e converte para minúsculas."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    clean = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return re.sub(r"[^a-zA-Z0-9]", "", clean).lower()


class DPOAnuarioExtractor(BaseExtractor):
    """
    Extrator de estatísticas e métricas de cursos de graduação a partir do
    Anuário Estatístico oficial da UnB (DPO/DAI).
    
    Acessa as tabelas HTML publicadas em grad.html (embutidas no repositório DPO),
    extraindo dados consolidados de:
    - Tabela 3.1: Características e carga horária
    - Tabela 3.2: Ingressantes por via (Vestibular, PAS, ENEM)
    - Tabela 3.4: Ingressantes e Formados (Concluintes)
    - Tabela 3.12: Alunos Regulares Ativos e Trancamentos Gerais
    - Tabela 3.16: Movimentação Estudantil (Abandono, Desligamentos / Evasão)
    """

    DEFAULT_URL = "https://anuariounb2025.netlify.app/grad.html"
    MIRROR_URL = "https://repositoriodpo.unb.br/anuarios/anuario-estatistico-2025/"

    COURSE_ALIASES = {
        "comunicacao social - public. propaganda": "publicidade e propaganda",
        "comunicacao social - audiovisual": "audiovisual",
        "artes plasticas": "artes visuais",
        "linguas estrangeiras aplicadas ao multilinguismo e a sociedade da informacao": "linguas estrangeiras aplicadas",
        "engenharia": "engenharia - abi",
        "letras - traducao - espanhol": "letras - traducao",
        "letras - traducao - frances": "letras - traducao",
        "letras - traducao - ingles": "letras - traducao",
    }

    def __init__(self, target_url: Optional[str] = None):
        super().__init__(name="DPOAnuarioExtractor")
        self.target_url = target_url or self.DEFAULT_URL

    def fetch_html(self, url: Optional[str] = None, timeout: int = 30) -> str:
        """Obtém o HTML bruto da página do Anuário Estatístico via HTTP."""
        fetch_url = url or self.target_url
        self.logger.info(f"Buscando Anuário Estatístico da UnB em: {fetch_url}")
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        req = urllib.request.Request(fetch_url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="ignore")

    @staticmethod
    def parse_course_row_label(first_cell: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Extrai (nome, grau, turno) de um rótulo no padrão DPO.
        Ex: 'Administração (B - Integral)' -> ('Administração', 'B', 'Integral')
            'Engenharia (ABI - Integral)'  -> ('Engenharia', 'ABI', 'Integral')
            'Artes Visuais (L - Noturno)'  -> ('Artes Visuais', 'L', 'Noturno')
        """
        text = first_cell.strip()
        m = re.match(r"^(.+?)\s*\((ABI|[BL/]+)\s*-\s*([^)]+)\)$", text)
        if m:
            nome = m.group(1).strip()
            grau = m.group(2).strip()
            turno = m.group(3).strip()
            return nome, grau, turno
        return None, None, None

    def parse_html_tables(self, html_content: str) -> Dict[Tuple[str, str], Dict[str, Any]]:
        """
        Analisa o HTML do Anuário e compila as métricas consolidadas por (nome, turno).
        """
        soup = BeautifulSoup(html_content, "html.parser")
        tables = soup.find_all("table")
        if not tables:
            self.logger.warning("Nenhuma tabela HTML encontrada no conteúdo fornecido.")
            return {}

        self.logger.info(f"Localizadas {len(tables)} tabelas no Anuário. Extraindo métricas...")
        data_by_course: Dict[Tuple[str, str], Dict[str, Any]] = {}

        # Mapeamento dinâmico de tabelas por título ou cabeçalho
        table_map: Dict[str, Any] = {}
        for idx, table in enumerate(tables):
            prev = table.find_previous(["h1", "h2", "h3", "h4", "caption"])
            title = prev.get_text(" ", strip=True).lower() if prev else f"table_{idx}"
            if "3.4" in title or "ingresso de alunos e número de formados" in title:
                table_map["ingresso_formados"] = table
            elif "3.12" in title or "ativos e com trancamento" in title:
                table_map["ativos_trancados"] = table
            elif "3.16" in title or "movimentação dos alunos" in title:
                table_map["movimentacao"] = table
            elif "3.2" in title or "ingresso nos cursos de graduação pelo vestibular" in title:
                table_map["ingresso_vias"] = table
            elif "3.1" in title or "dados e características dos cursos" in title:
                table_map["caracteristicas"] = table

        # Fallback posicional se os títulos não forem identificados por texto
        t_caract = table_map.get("caracteristicas", tables[0] if len(tables) > 0 else None)
        t_ingresso_vias = table_map.get("ingresso_vias", tables[1] if len(tables) > 1 else None)
        t_ing_form = table_map.get("ingresso_formados", tables[2] if len(tables) > 2 else None)
        t_ativos = table_map.get("ativos_trancados", tables[6] if len(tables) > 6 else None)
        t_mov = table_map.get("movimentacao", tables[9] if len(tables) > 9 else None)

        def init_entry(nome: str, turno: str) -> Dict[str, Any]:
            key = (nome, turno)
            if key not in data_by_course:
                data_by_course[key] = {
                    "nome_dpo": nome,
                    "turno_dpo": turno,
                    "ingressantes": 0,
                    "concluintes": 0,
                    "matriculados": 0,
                    "trancados": 0,
                    "desvinculados": 0,
                    "vagas_totais": 0,
                    "inscritos_total": 0,
                    "carga_horaria": None,
                }
            return data_by_course[key]

        # 1. Tabela 3.1: Características e Carga Horária
        if t_caract:
            for r in t_caract.find_all("tr"):
                cols = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
                if len(cols) >= 6:
                    nome, grau, turno = self.parse_course_row_label(cols[0])
                    if nome and turno:
                        entry = init_entry(nome, turno)
                        ch = clean_int(cols[5])
                        if ch > 0:
                            entry["carga_horaria"] = ch

        # 2. Tabela 3.4: Ingressantes e Concluintes
        if t_ing_form:
            for r in t_ing_form.find_all("tr"):
                cols = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
                if len(cols) >= 7:
                    nome, grau, turno = self.parse_course_row_label(cols[0])
                    if nome and turno:
                        entry = init_entry(nome, turno)
                        # cols[3] = TOTAL INGRESSANTES, cols[6] = TOTAL FORMADOS
                        entry["ingressantes"] = clean_int(cols[3])
                        entry["concluintes"] = clean_int(cols[6])

        # 3. Tabela 3.12: Alunos Ativos e Trancamentos Gerais
        if t_ativos:
            for r in t_ativos.find_all("tr"):
                cols = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
                if len(cols) >= 12:
                    nome, grau, turno = self.parse_course_row_label(cols[0])
                    if nome and turno:
                        entry = init_entry(nome, turno)
                        # Ativos 2º sem = cols[3] (Fem) + cols[4] (Masc)
                        # Trancados 2º sem = cols[7] (Fem) + cols[8] (Masc)
                        entry["matriculados"] = clean_int(cols[3]) + clean_int(cols[4])
                        entry["trancados"] = clean_int(cols[7]) + clean_int(cols[8])

        # 4. Tabela 3.16: Desvinculados / Evasão
        if t_mov:
            for r in t_mov.find_all("tr"):
                cols = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
                if len(cols) >= 8:
                    nome, grau, turno = self.parse_course_row_label(cols[0])
                    if nome and turno:
                        entry = init_entry(nome, turno)
                        # cols[3], cols[4] = Abandono 1º e 2º sem; cols[5], cols[6] = Outros 1º e 2º sem
                        abandono = clean_int(cols[3]) + clean_int(cols[4])
                        outros = clean_int(cols[5]) + clean_int(cols[6])
                        entry["desvinculados"] = abandono + outros

        # 5. Tabela 3.2: Ingressantes por vestibular / Total Geral
        if t_ingresso_vias:
            for r in t_ingresso_vias.find_all("tr"):
                cols = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
                if len(cols) >= 10:
                    nome, grau, turno = self.parse_course_row_label(cols[0])
                    if nome and turno:
                        entry = init_entry(nome, turno)
                        total_geral = clean_int(cols[-1])
                        if total_geral > 0 and entry["ingressantes"] == 0:
                            entry["ingressantes"] = total_geral

        return data_by_course

    def match_with_database_courses(
        self,
        dpo_data: Dict[Tuple[str, str], Dict[str, Any]],
        db_courses: List[Any],
        ano: int = 2024,
    ) -> List[Dict[str, Any]]:
        """
        Associa as métricas extraídas aos cursos persistidos no banco de dados,
        garantindo correspondência estrita por nome e turno (e prevenindo duplicidades).
        """
        matched_records: List[Dict[str, Any]] = []
        already_matched_course_ids = set()

        def get_val(obj: Any, attr: str, default: Any = "") -> Any:
            if isinstance(obj, dict):
                return obj.get(attr, default)
            val = getattr(obj, attr, default)
            return val if val is not None else default

        for (nome_dpo, turno_dpo), stats in dpo_data.items():
            # Resolve aliases com normalização sem acentos e espaços
            search_name = nome_dpo
            norm_raw = normalize_text(nome_dpo)
            for alias_from, alias_to in self.COURSE_ALIASES.items():
                if normalize_text(alias_from) in norm_raw:
                    search_name = alias_to
                    break

            norm_dpo_nome = normalize_text(search_name)
            dpo_is_noturno = "noturno" in turno_dpo.lower()
            dpo_is_ead = "distancia" in normalize_text(turno_dpo)

            best_match = None

            # Função auxiliar de elegibilidade de turno
            def turno_matches(c_item) -> bool:
                c_turno = normalize_text(str(get_val(c_item, "turno", "")))
                c_slug = normalize_text(str(get_val(c_item, "slug", "")))
                c_mod = normalize_text(str(get_val(c_item, "modalidade", "")))
                c_is_noturno = "noturno" in c_turno or "noturno" in c_slug
                c_is_ead = "distancia" in c_mod or "ead" in c_mod or "distancia" in c_slug or "distancia" in c_turno

                if dpo_is_ead:
                    return c_is_ead
                if dpo_is_noturno:
                    return c_is_noturno and not c_is_ead
                # Integral / Diurno
                return (not c_is_noturno) and (not c_is_ead)

            # 1. Correspondência estrita de Nome Normalizado + Turno idêntico
            for c in db_courses:
                c_id = get_val(c, "id", None)
                if c_id and c_id in already_matched_course_ids:
                    continue

                c_nome = get_val(c, "nome", "")
                norm_db_nome = normalize_text(c_nome)

                if norm_dpo_nome == norm_db_nome and turno_matches(c):
                    best_match = c
                    break

            # 2. Fallback de substring de nome com turno idêntico
            if not best_match:
                for c in db_courses:
                    c_id = get_val(c, "id", None)
                    if c_id and c_id in already_matched_course_ids:
                        continue

                    c_nome = get_val(c, "nome", "")
                    norm_db_nome = normalize_text(c_nome)

                    if (norm_dpo_nome in norm_db_nome or norm_db_nome in norm_dpo_nome) and turno_matches(c):
                        best_match = c
                        break

            # 3. Fallback de nome exato (apenas se nenhum outro com mesmo turno foi encontrado e não for EAD)
            if not best_match and not dpo_is_ead:
                for c in db_courses:
                    c_id = get_val(c, "id", None)
                    if c_id and c_id in already_matched_course_ids:
                        continue
                    c_nome = get_val(c, "nome", "")
                    if normalize_text(c_nome) == norm_dpo_nome:
                        best_match = c
                        break

            if not best_match:
                self.logger.debug(f"Curso DPO '{nome_dpo} ({turno_dpo})' não localizado no catálogo do banco.")
                continue

            c_id = get_val(best_match, "id", None)
            c_slug = get_val(best_match, "slug", "")
            c_nome = get_val(best_match, "nome", "")
            c_area_geral = get_val(best_match, "area_geral", None)
            c_area_especifica = get_val(best_match, "area_especifica", None)

            if c_id:
                already_matched_course_ids.add(c_id)

            ingressantes = stats["ingressantes"]
            concluintes = stats["concluintes"]
            matriculados = stats["matriculados"]
            trancados = stats["trancados"]
            desvinculados = stats["desvinculados"]

            # Vagas totais estimadas (mínimo igual aos ingressantes se não disponível)
            vagas_totais = stats["vagas_totais"] or ingressantes
            inscritos_total = stats["inscritos_total"]

            # Cálculo determinístico de taxas
            taxa_sucesso = None
            if ingressantes > 0:
                taxa_sucesso = round((concluintes / ingressantes) * 100, 2)

            taxa_evasao = None
            if matriculados > 0:
                taxa_evasao = round((desvinculados / matriculados) * 100, 2)

            record = {
                "curso_id": c_id,
                "curso_slug": c_slug,
                "curso_nome": c_nome,
                "ano": ano,
                "vagas_totais": vagas_totais,
                "inscritos_total": inscritos_total,
                "ingressantes": ingressantes,
                "matriculados": matriculados,
                "concluintes": concluintes,
                "trancados": trancados,
                "desvinculados": desvinculados,
                "taxa_sucesso": taxa_sucesso,
                "taxa_evasao": taxa_evasao,
                "modalidade": "A Distância" if dpo_is_ead else "Presencial",
                "area_geral": c_area_geral,
                "area_especifica": c_area_especifica,
            }
            matched_records.append(record)

        self.logger.info(f"Mapeamento concluído: {len(matched_records)} cursos associados com métricas do DPO.")
        return matched_records

    def extract(
        self,
        ano: int = 2024,
        input_file: Optional[str] = None,
        db_courses: Optional[List[Any]] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Executa a extração completa de métricas de cursos:
        1. Se input_file fornecido (HTML, JSON ou CSV), lê diretamente.
        2. Caso contrário, faz scraping online do Anuário Estatístico.
        3. Associa as métricas aos cursos e retorna a lista higienizada.
        """
        html_content = ""
        if input_file:
            path = Path(input_file)
            if not path.is_file():
                raise FileNotFoundError(f"Arquivo não encontrado: {input_file}")
            ext = path.suffix.lower()
            if ext in (".html", ".htm"):
                with open(path, "r", encoding="utf-8") as f:
                    html_content = f.read()
            elif ext == ".json":
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            elif ext == ".csv":
                records = []
                with open(path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        records.append(dict(r))
                return records
        else:
            try:
                html_content = self.fetch_html()
            except Exception as e:
                self.logger.error(f"Falha ao buscar Anuário online ({e}). Recorrendo ao espelho local.")
                mirror_file = Path(__file__).resolve().parent.parent / "data" / "sample_metricas_cursos.csv"
                if mirror_file.is_file():
                    return self.extract(input_file=str(mirror_file), db_courses=db_courses)
                raise

        parsed_data = self.parse_html_tables(html_content)

        # Se db_courses não foi fornecido, consulta do banco diretamente
        if db_courses is None:
            try:
                from app.core.database import SessionLocal
                from app.models.curso import Curso
                db = SessionLocal()
                try:
                    db_courses = db.query(Curso).all()
                finally:
                    db.close()
            except Exception as e:
                self.logger.warning(f"Não foi possível consultar cursos do banco: {e}")
                db_courses = []

        return self.match_with_database_courses(parsed_data, db_courses, ano=ano)
