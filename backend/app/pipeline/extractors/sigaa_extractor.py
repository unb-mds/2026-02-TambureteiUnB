import csv
import json
import logging
import re
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.pipeline.config import pipeline_settings
from app.pipeline.extractors.base import BaseExtractor
from app.pipeline.transformers.sigaa_transformer import slugify

logger = logging.getLogger(__name__)


class SIGAAExtractor(BaseExtractor):
    """
    Extrator robusto de dados do SIGAA e do Portal de Dados Abertos da UnB.
    
    Incorpora as soluções de sessão JSF (JavaServer Faces):
    - Inicialização prévia de cookies na página inicial (/public/home.jsf)
    - Captura dinâmica de ViewState e nome do botão de submissão
    - Busca modularizada por ID de departamento (departamentos_ID_unb.csv)
    - Suporte a leitura direta de datasets brutos em CSV/JSON
    """

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "keep-alive",
        "Origin": "https://sigaa.unb.br",
        "Referer": "https://sigaa.unb.br/sigaa/public/turmas/listar.jsf",
    }

    def __init__(
        self,
        base_url: Optional[str] = None,
        home_url: Optional[str] = None,
        componentes_url: Optional[str] = None,
        curriculo_url: Optional[str] = None,
        departamentos_file: Optional[Path] = None,
        departamentos_json: Optional[Path] = None,
    ):
        super().__init__(name="SIGAAExtractor")
        self.base_url = base_url or pipeline_settings.SIGAA_BASE_URL
        self.home_url = home_url or pipeline_settings.SIGAA_HOME_URL
        self.componentes_url = componentes_url or pipeline_settings.SIGAA_COMPONENTES_URL
        self.curriculo_url = curriculo_url or getattr(pipeline_settings, "SIGAA_CURRICULO_URL", "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf")
        self.cursos_lista_url = getattr(pipeline_settings, "SIGAA_CURSOS_LISTA_URL", "https://sigaa.unb.br/sigaa/public/curso/lista.jsf?nivel=G")
        self.portal_curso_url = getattr(pipeline_settings, "SIGAA_PORTAL_CURSO_URL", "https://sigaa.unb.br/sigaa/public/curso/portal.jsf")
        self.departamentos_file = departamentos_file or pipeline_settings.DEPARTAMENTOS_CSV
        self.departamentos_json = departamentos_json or getattr(pipeline_settings, "DEPARTAMENTOS_JSON", pipeline_settings.DATA_PATH / "departamentos_unb.json")
        self.fcte_cursos = getattr(pipeline_settings, "FCTE_CURSOS", {})

    @staticmethod
    def _clean_depto_nome(name: str) -> str:
        """
        Normaliza nomes de departamentos da UnB para exibição amigável:
        - Campi satélites: 'FCTE - Gama', 'FCE - Ceilândia', 'FUP - Planaltina'
        - Darcy: Remove sufixo ' - BRASÍLIA', expande 'DEPTO' -> 'Departamento de ', etc.
        """
        if not name:
            return ""
        upper_name = name.upper()
        if "CAMPUS UNB GAMA" in upper_name:
            return "FCTE - Gama"
        if "CAMPUS UNB CEILÂNDIA" in upper_name or "CAMPUS UNB CEILANDIA" in upper_name:
            return "FCE - Ceilândia"
        if "FACULDADE DE PLANALTINA" in upper_name:
            return "FUP - Planaltina"

        cleaned = re.sub(r"\s*-\s*BRAS[IÍ]LIA\s*$", "", name, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"^DEPTO\b\.?\s*", "Departamento de ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^FAC\b\.?\s*", "Faculdade de ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^INST\b\.?\s*", "Instituto de ", cleaned, flags=re.IGNORECASE)

        preps = {"de", "da", "do", "dos", "das", "e", "em", "para", "com", "por", "a", "o", "as", "os"}
        words = cleaned.split()
        title_words = []
        for i, w in enumerate(words):
            w_clean = w.strip()
            if not w_clean:
                continue
            if i > 0 and w_clean.lower() in preps:
                title_words.append(w_clean.lower())
            elif "/" in w_clean or (w_clean.isupper() and 2 <= len(w_clean) <= 4 and w_clean.lower() not in preps):
                title_words.append(w_clean)
            else:
                title_words.append(w_clean.capitalize())
        res = " ".join(title_words)
        return res[:255]

    def load_departamentos_ids(self) -> List[int]:
        """Carrega a lista de IDs de departamentos mapeados da UnB."""
        if not self.departamentos_file.is_file():
            self.logger.warning(
                f"Arquivo de departamentos não encontrado em {self.departamentos_file}. Usando departamentos padrão."
            )
            # FCTE (673), MAT (361), CIC (508) como fallback mínimo
            return [673, 361, 508]

        ids: List[int] = []
        with open(self.departamentos_file, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if row and row[0].strip().isdigit() and row[0].strip() != "0":
                    ids.append(int(row[0].strip()))
        return sorted(set(ids))

    def load_departamentos_map(self) -> Dict[int, str]:
        """Carrega o mapa {id: nome_limpo} dos departamentos a partir do JSON local."""
        if self.departamentos_json.is_file():
            try:
                with open(self.departamentos_json, mode="r", encoding="utf-8") as f:
                    data = json.load(f)
                    return {int(k): str(v) for k, v in data.items() if str(k).isdigit()}
            except Exception as e:
                self.logger.warning(f"Erro ao carregar {self.departamentos_json}: {e}")
        return {
            673: "FCTE - Gama",
            672: "FCE - Ceilândia",
            666: "FUP - Planaltina",
            508: "Departamento de Ciências da Computação",
            518: "Departamento de Matemática",
            361: "Departamento de Tecnologia Arquitetura Urbanismo",
        }

    def fetch_departamentos_nomes(self, client: httpx.Client) -> Dict[int, str]:
        """
        Consulta dinamicamente os departamentos cadastrados no dropdown do SIGAA
        (select id='formTurma:inputDepto' em /public/turmas/listar.jsf).
        """
        try:
            resp = client.get(self.base_url)
            resp.raise_for_status()
            raw = resp.content
            try:
                html_text = raw.decode("utf-8")
            except UnicodeDecodeError:
                html_text = raw.decode("iso-8859-1", errors="replace")
            soup = BeautifulSoup(html_text, "html.parser")
            sel = soup.find("select", {"id": "formTurma:inputDepto"})
            if not sel:
                return {}
            deptos_map: Dict[int, str] = {}
            for opt in sel.find_all("option"):
                val = opt.get("value", "").strip()
                txt = opt.text.strip()
                if val and val.isdigit() and val != "0":
                    deptos_map[int(val)] = self._clean_depto_nome(txt)
            return deptos_map
        except Exception as e:
            self.logger.warning(f"Não foi possível consultar lista dinâmica de departamentos no SIGAA: {e}")
            return {}

    def extract(
        self,
        semestre: str = "2026.1",
        input_file: Optional[str] = None,
        departamentos: Optional[List[int]] = None,
        max_departamentos: Optional[int] = None,
        delay_seconds: float = 1.5,
        fetch_ementas: bool = True,
        fetch_curriculos: bool = True,
        cursos_ids: Optional[List[int]] = None,
        todos_cursos: bool = False,
        todos_curriculos: bool = False,
        **kwargs,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Executa extração completa a partir de arquivo local ou scraping online do SIGAA.
        """
        if input_file:
            path = Path(input_file)
            if not path.is_file():
                raise FileNotFoundError(f"Arquivo de entrada não encontrado: {input_file}")
            return self.extract_from_file(path, semestre=semestre)

        # Extração via scraping online do SIGAA
        self.logger.info(f"Iniciando scraping online do SIGAA para o semestre {semestre}...")
        match = re.match(r"^(\d{4})\.([12])$", semestre.strip())
        if not match:
            raise ValueError(f"Semestre inválido: '{semestre}'. Esperado formato YYYY.S (ex: '2026.1').")

        ano = int(match.group(1))
        periodo = int(match.group(2))

        deptos_ids = departamentos or self.load_departamentos_ids()
        if max_departamentos:
            deptos_ids = deptos_ids[:max_departamentos]

        deptos_nomes_map = self.load_departamentos_map()

        todas_turmas: List[Dict[str, Any]] = []
        disciplinas_map: Dict[str, Dict[str, Any]] = {}
        docentes_deptos_map: Dict[str, Set[str]] = defaultdict(set)
        deptos_catalogos_map: Dict[int, Tuple[Dict[str, Any], Optional[str], str]] = {}
        successful_deptos = 0

        with httpx.Client(headers=self.HEADERS, timeout=45.0, follow_redirects=True) as client:
            # 1. Inicializa cookies de sessão na home
            try:
                client.get(self.home_url)
            except Exception as e:
                self.logger.warning(f"Aviso ao inicializar sessão na home: {e}")

            try:
                live_deptos = self.fetch_departamentos_nomes(client)
                if live_deptos:
                    deptos_nomes_map.update(live_deptos)
            except Exception as e:
                self.logger.warning(f"Aviso ao obter nomes de departamentos do SIGAA: {e}")

            for depto_id in deptos_ids:
                depto_nome = deptos_nomes_map.get(depto_id) or str(depto_id)
                try:
                    time.sleep(delay_seconds)
                    res = self.scrape_departamento(client, depto_id, ano, periodo)
                    turmas_depto = res.get("turmas", [])
                    todas_turmas.extend(turmas_depto)

                    for t in turmas_depto:
                        cod = t.get("codigo_disciplina")
                        nome = t.get("nome_disciplina")
                        if cod and cod not in disciplinas_map:
                            disciplinas_map[cod] = {
                                "codigo": cod,
                                "nome": nome,
                                "departamento": depto_nome,
                                "carga_horaria": None,
                                "creditos": None,
                                "ementa": None,
                                "pre_requisitos": None,
                                "co_requisitos": None,
                                "equivalencias": None,
                                "cursos": [],
                            }
                        for doc in t.get("docentes", []):
                            if doc:
                                docentes_deptos_map[doc].add(depto_nome)

                    # Obter catálogo oficial de componentes do departamento
                    self.logger.info(f"Consultando catálogo oficial de componentes do departamento {depto_id}...")
                    comps_map, vs_comps = self.fetch_componentes_departamento(client, depto_id)
                    if comps_map:
                        self.logger.info(f"Depto {depto_id}: {len(comps_map)} componentes curriculares encontrados no catálogo.")
                        deptos_catalogos_map[depto_id] = (comps_map, vs_comps, depto_nome)

                    successful_deptos += 1
                    self.logger.info(f"Depto {depto_id}: {len(turmas_depto)} turmas encontradas.")
                except Exception as e:
                    self.logger.error(f"Erro ao raspar departamento {depto_id}: {e}")

            # 2. Extração de Cursos e Matrizes Curriculares oficiais
            cursos_list: List[Dict[str, Any]] = []
            cinfo_map: Dict[int, Dict[str, Any]] = dict(self.fcte_cursos)

            if todos_cursos:
                discovered_cursos = self.fetch_todos_cursos(client)
                for c in discovered_cursos:
                    cid = c["codigo_sigaa"]
                    cinfo_map[cid] = {
                        "nome": c["nome"],
                        "slug": c["slug"],
                        "campus": c["campus"],
                        "grau": c["grau"],
                        "turno": c["turno"],
                        "codigo_mec": c.get("codigo_mec"),
                    }
                cursos_list = discovered_cursos

            if fetch_curriculos:
                if todos_curriculos:
                    target_cursos = list(cinfo_map.keys())
                elif cursos_ids:
                    target_cursos = cursos_ids
                else:
                    target_cursos = list(self.fcte_cursos.keys())

                self.logger.info(f"Iniciando extração de matrizes curriculares para {len(target_cursos)} cursos...")
                for cid in target_cursos:
                    cinfo = cinfo_map.get(cid, {
                        "nome": f"Curso {cid}",
                        "slug": f"curso-{cid}",
                        "campus": "Darcy Ribeiro",
                        "grau": "Bacharelado",
                        "turno": "Diurno",
                    })
                    if not todos_cursos:
                        cursos_list.append({
                            "codigo_sigaa": cid,
                            **cinfo
                        })
                    try:
                        time.sleep(0.3)
                        self.logger.info(f"Consultando matriz curricular de {cinfo['nome']} (ID {cid})...")
                        grade = self.fetch_matriz_curricular(client, cid)
                        self.logger.info(f"{cinfo['nome']}: {len(grade)} disciplinas mapeadas na matriz.")
                        for item in grade:
                            cod = item["codigo"]
                            vinculo = {
                                "curso_slug": cinfo["slug"],
                                "periodo_sugerido": item["periodo_sugerido"],
                                "is_obrigatoria": item["is_obrigatoria"],
                                "natureza": item.get("natureza", "Obrigatoria"),
                            }
                            if cod in disciplinas_map:
                                if not any(v.get("curso_slug") == cinfo["slug"] for v in disciplinas_map[cod].get("cursos", [])):
                                    disciplinas_map[cod].setdefault("cursos", []).append(vinculo)
                            else:
                                # Matéria presente na grade curricular do curso (mesmo sem turma no departamento no semestre)
                                disciplinas_map[cod] = {
                                    "codigo": cod,
                                    "nome": item["nome"],
                                    "departamento": None,
                                    "carga_horaria": item["carga_horaria"],
                                    "creditos": item["creditos"],
                                    "ementa": None,
                                    "pre_requisitos": None,
                                    "co_requisitos": None,
                                    "equivalencias": None,
                                    "cursos": [vinculo],
                                }
                    except Exception as ex_c:
                        self.logger.warning(f"Aviso ao consultar matriz do curso {cid}: {ex_c}")
            elif not todos_cursos and cursos_ids:
                for cid in cursos_ids:
                    cinfo = cinfo_map.get(cid, {
                        "nome": f"Curso {cid}",
                        "slug": f"curso-{cid}",
                        "campus": "Darcy Ribeiro",
                        "grau": "Bacharelado",
                        "turno": "Diurno",
                    })
                    cursos_list.append({
                        "codigo_sigaa": cid,
                        **cinfo
                    })

            # 3. Enriquecimento consolidado com catálogo oficial de componentes (Turmas + Matrizes)
            self.logger.info(f"Iniciando enriquecimento consolidado de {len(disciplinas_map)} disciplinas com catálogos departamentais...")
            enriched_cods: Set[str] = set()
            for depto_id, (comps_map, vs_comps, depto_nome) in deptos_catalogos_map.items():
                for cod, d in disciplinas_map.items():
                    if cod in comps_map and cod not in enriched_cods:
                        enriched_cods.add(cod)
                        comp_info = comps_map[cod]
                        if not d.get("departamento"):
                            d["departamento"] = depto_nome
                        if not d.get("carga_horaria") and comp_info.get("carga_horaria"):
                            d["carga_horaria"] = comp_info.get("carga_horaria")
                        if not d.get("creditos") and comp_info.get("creditos"):
                            d["creditos"] = comp_info.get("creditos")

                        if fetch_ementas and comp_info.get("detalhes_params") and vs_comps:
                            try:
                                time.sleep(0.15)
                                detalhes = self.fetch_detalhes_componente(
                                    client,
                                    vs_comps,
                                    comp_info["detalhes_params"],
                                )
                                if detalhes.get("ementa"):
                                    d["ementa"] = detalhes["ementa"]
                                if detalhes.get("pre_requisitos"):
                                    d["pre_requisitos"] = detalhes["pre_requisitos"]
                                if detalhes.get("co_requisitos"):
                                    d["co_requisitos"] = detalhes["co_requisitos"]
                                if detalhes.get("equivalencias"):
                                    d["equivalencias"] = detalhes["equivalencias"]

                                extra_tags = []
                                if detalhes.get("ementa"):
                                    extra_tags.append("Ementa")
                                if detalhes.get("pre_requisitos"):
                                    extra_tags.append(f"Pré-req: {detalhes['pre_requisitos']}")
                                if detalhes.get("co_requisitos"):
                                    extra_tags.append(f"Co-req: {detalhes['co_requisitos']}")
                                if detalhes.get("equivalencias"):
                                    extra_tags.append(f"Equiv: {detalhes['equivalencias']}")

                                desc_extra = f" [{', '.join(extra_tags)}]" if extra_tags else ""
                                ch = d.get("carga_horaria")
                                cr = d.get("creditos")
                                self.logger.info(f"Disciplina {cod} ({d.get('nome')}): {ch}h ({cr} créditos){desc_extra}.")
                            except Exception as ex_em:
                                self.logger.debug(f"Aviso ao buscar detalhes de {cod}: {ex_em}")

            # 4. Propagação bidirecional de equivalências
            self.logger.info("Propagando equivalências bidirecionais entre disciplinas...")
            for cod_a, disc_a in list(disciplinas_map.items()):
                equiv_a = disc_a.get("equivalencias")
                if equiv_a:
                    codigos_b = re.findall(r"\b[A-Z]{3,4}\d{4}\b", equiv_a)
                    for cod_b in codigos_b:
                        if cod_b in disciplinas_map and cod_b != cod_a:
                            equiv_b = disciplinas_map[cod_b].get("equivalencias")
                            if not equiv_b:
                                disciplinas_map[cod_b]["equivalencias"] = f"( {cod_a} )"
                            elif cod_a not in equiv_b:
                                disciplinas_map[cod_b]["equivalencias"] = f"{equiv_b} OU ( {cod_a} )"

        if deptos_ids and successful_deptos == 0 and not cursos_list:
            raise RuntimeError(
                f"Falha total na extração online do SIGAA: todos os {len(deptos_ids)} departamentos falharam. "
                "Verifique a conectividade ou formato da sessão JSF."
            )

        docentes_list = []
        for doc_nome, deptos in sorted(docentes_deptos_map.items()):
            if deptos:
                depto_str = ", ".join(sorted(deptos))
                if len(depto_str) > 255:
                    depto_str = depto_str[:252] + "..."
            else:
                depto_str = None
            docentes_list.append({
                "nome": doc_nome,
                "departamento": depto_str,
            })

        return {
            "turmas": todas_turmas,
            "disciplinas": list(disciplinas_map.values()),
            "docentes": docentes_list,
            "cursos": cursos_list,
        }

    def fetch_todos_cursos(self, client: httpx.Client) -> List[Dict[str, Any]]:
        """
        Consulta o catálogo público de todos os cursos de graduação da UnB via lista.jsf?nivel=G.
        Retorna a lista dos 159 cursos estruturados com slugs 100% únicos (sem conflito de turnos/campi).
        """
        try:
            self.logger.info(f"Buscando catálogo completo de cursos em {self.cursos_lista_url}...")
            resp = client.get(self.cursos_lista_url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.content.decode("iso-8859-1", errors="replace"), "html.parser")
            table = soup.find("table", class_="listagem")
            if not table:
                self.logger.warning("Tabela de cursos não localizada na página de lista de cursos do SIGAA.")
                return []

            raw_courses: List[Dict[str, Any]] = []
            current_dept: Optional[str] = None

            for tr in table.find_all("tr"):
                # Header de unidade / departamento
                for el in tr.find_all(["td", "th"]):
                    if el.get("colspan"):
                        current_dept = el.get_text(strip=True)
                        break

                tds = tr.find_all("td")
                if len(tds) >= 4:
                    a = tr.find("a", href=re.compile(r"id=(\d+)"))
                    if a:
                        m = re.search(r"id=(\d+)", a["href"])
                        cid = int(m.group(1))
                        nome = tds[0].get_text(strip=True).title()
                        grau = tds[1].get_text(strip=True).title()
                        turno = tds[2].get_text(strip=True).title()

                        campus = "Darcy Ribeiro"
                        if current_dept:
                            cd_up = current_dept.upper()
                            if "FCTE" in cd_up or "GAMA" in cd_up:
                                campus = "FCTE - Gama"
                            elif "FUP" in cd_up or "PLANALTINA" in cd_up:
                                campus = "FUP - Planaltina"
                            elif "FCE" in cd_up or "CEILANDIA" in cd_up or "CEILÂNDIA" in cd_up:
                                campus = "FCE - Ceilândia"

                        # Verifica se temos código MEC mapeado em FCTE_CURSOS
                        codigo_mec = self.fcte_cursos.get(cid, {}).get("codigo_mec")

                        raw_courses.append({
                            "codigo_sigaa": cid,
                            "nome": nome,
                            "grau": grau,
                            "turno": turno,
                            "campus": campus,
                            "departamento": current_dept,
                            "codigo_mec": codigo_mec,
                        })

            # Resolução de unicidade de slugs
            name_counts = Counter(c["nome"] for c in raw_courses)
            used_slugs: Set[str] = set()
            courses: List[Dict[str, Any]] = []

            for c in raw_courses:
                base_slug = slugify(c["nome"])
                if name_counts[c["nome"]] > 1:
                    cand_slug = slugify(f"{c['nome']} {c['turno']}")
                    if cand_slug in used_slugs:
                        cand_slug = slugify(f"{c['nome']} {c['grau']} {c['turno']}")
                    if cand_slug in used_slugs:
                        cand_slug = slugify(f"{c['nome']} {c['campus']} {c['turno']}")
                else:
                    cand_slug = base_slug

                c["slug"] = cand_slug
                used_slugs.add(cand_slug)
                courses.append(c)

            self.logger.info(f"Total de {len(courses)} cursos de graduação descobertos no SIGAA (100% slugs únicos).")
            return courses
        except Exception as e:
            self.logger.error(f"Erro ao extrair catálogo de cursos do SIGAA: {e}")
            return []

    def fetch_matriz_curricular(
        self,
        client: httpx.Client,
        curso_id: int,
    ) -> List[Dict[str, Any]]:
        """
        Consulta a matriz curricular ativa do curso em curriculo.jsf?id=<curso_id>.
        Extrai todas as disciplinas obrigatórias (com periodo_sugerido 1..10)
        e optativas (periodo_sugerido=None, is_obrigatoria=False).
        """
        try:
            # Pré-visita o portal do curso para fixar o contexto de sessão do JSF
            try:
                client.get(f"{self.portal_curso_url}?id={curso_id}")
            except Exception:
                pass

            url = f"{self.curriculo_url}?id={curso_id}"
            r0 = client.get(url)
            r0.raise_for_status()
            soup0 = BeautifulSoup(r0.content.decode("iso-8859-1", errors="replace"), "html.parser")
            vs_input = soup0.find("input", {"name": "javax.faces.ViewState"})
            if not vs_input:
                return []
            vs_val = vs_input.get("value", "")

            # Localiza a estrutura curricular marcada como 'Ativa'
            active_params: Dict[str, str] = {}
            for tr in soup0.find_all("tr"):
                if "Ativa" in tr.get_text() and "Inativa" not in tr.get_text():
                    btn = tr.find("a", title=re.compile(r"Visualizar Estrutura Curricular", re.I))
                    if not btn:
                        for a in tr.find_all("a", onclick=True):
                            if "formCurriculosCurso" in a.get("onclick", ""):
                                btn = a
                                break
                    if btn and btn.get("onclick"):
                        matches = re.findall(r"'([^']+)':\s*'([^']+)'", btn["onclick"])
                        active_params = dict(matches)
                        break

            if not active_params:
                self.logger.warning(f"Estrutura curricular ativa não encontrada para curso {curso_id}.")
                return []

            post_data = {
                "formCurriculosCurso": "formCurriculosCurso",
                "javax.faces.ViewState": vs_val,
            }
            post_data.update(active_params)

            r1 = client.post(self.curriculo_url, data=post_data)
            r1.raise_for_status()
            soup1 = BeautifulSoup(r1.content.decode("iso-8859-1", errors="replace"), "html.parser")

            disciplinas_grade: List[Dict[str, Any]] = []
            for tbl in soup1.find_all("table"):
                cap = tbl.find("caption")
                cap_text = cap.get_text(strip=True) if cap else ""

                m_nivel = re.search(r"(\d+)º\s*Nível", cap_text, re.I)
                if m_nivel:
                    periodo = int(m_nivel.group(1))
                    for tr in tbl.find_all("tr"):
                        txt = tr.get_text(strip=True)
                        m_disc = re.match(r"^([A-Z]{3,4}\d{4})\s*-\s*(.+?)\s*-\s*(\d+)h", txt)
                        if m_disc:
                            cod = m_disc.group(1).strip().upper()
                            nome = m_disc.group(2).strip()
                            ch = int(m_disc.group(3))
                            disciplinas_grade.append({
                                "codigo": cod,
                                "nome": nome,
                                "carga_horaria": ch,
                                "creditos": ch // 15,
                                "periodo_sugerido": periodo,
                                "is_obrigatoria": True,
                                "natureza": "Obrigatoria",
                            })
                elif "optativas" in cap_text.lower():
                    for tr in tbl.find_all("tr"):
                        txt = tr.get_text(strip=True)
                        m_disc = re.match(r"^([A-Z]{3,4}\d{4})\s*-\s*(.+?)\s*-\s*(\d+)h", txt)
                        if m_disc:
                            cod = m_disc.group(1).strip().upper()
                            nome = m_disc.group(2).strip()
                            ch = int(m_disc.group(3))
                            disciplinas_grade.append({
                                "codigo": cod,
                                "nome": nome,
                                "carga_horaria": ch,
                                "creditos": ch // 15,
                                "periodo_sugerido": None,
                                "is_obrigatoria": False,
                                "natureza": "Optativa",
                            })
                elif "complementares" in cap_text.lower():
                    for tr in tbl.find_all("tr"):
                        txt = tr.get_text(strip=True)
                        m_disc = re.match(r"^([A-Z]{3,4}\d{4})\s*-\s*(.+?)\s*-\s*(\d+)h", txt)
                        if m_disc:
                            cod = m_disc.group(1).strip().upper()
                            nome = m_disc.group(2).strip()
                            ch = int(m_disc.group(3))
                            disciplinas_grade.append({
                                "codigo": cod,
                                "nome": nome,
                                "carga_horaria": ch,
                                "creditos": ch // 15,
                                "periodo_sugerido": None,
                                "is_obrigatoria": False,
                                "natureza": "Complementar",
                            })

            return disciplinas_grade
        except Exception as e:
            self.logger.warning(f"Erro ao extrair matriz curricular do curso {curso_id}: {e}")
            return []

    def fetch_componentes_departamento(
        self,
        client: httpx.Client,
        depto_id: int,
    ) -> Tuple[Dict[str, Dict[str, Any]], Optional[str]]:
        """
        Consulta o catálogo público de componentes curriculares do departamento via busca_componentes.jsf.
        Retorna dicionário mapeando o código da disciplina para:
        - nome
        - carga_horaria (int)
        - creditos (int, onde 1 crédito = 15h)
        - detalhes_params (parâmetros do onclick JSF para carregar detalhes/ementa)
        E o ViewState atual da página para submissões subsequentes.
        """
        try:
            form_resp = client.get(self.componentes_url)
            form_resp.raise_for_status()
            soup = BeautifulSoup(form_resp.text, "html.parser")
            vs_input = soup.find("input", {"name": "javax.faces.ViewState"})
            if not vs_input:
                return {}, None
            vs = vs_input.get("value", "")

            form_data = {
                "form": "form",
                "form:nivel": "G",
                "form:tipo": "2",  # Disciplina
                "form:checkUnidade": "on",
                "form:unidades": str(depto_id),
                "form:btnBuscarComponentes": "Buscar Componentes",
                "javax.faces.ViewState": vs,
            }

            search_resp = client.post(self.componentes_url, data=form_data)
            search_resp.raise_for_status()
            soup_res = BeautifulSoup(search_resp.text, "html.parser")
            vs_res_input = soup_res.find("input", {"name": "javax.faces.ViewState"})
            vs_res = vs_res_input.get("value", vs) if vs_res_input else vs

            table = soup_res.find("table", class_="listagem")
            if not table:
                return {}, vs_res

            comps: Dict[str, Dict[str, Any]] = {}
            for tr in table.find_all("tr")[1:]:
                tds = [td.get_text(strip=True) for td in tr.find_all("td")]
                if len(tds) >= 4:
                    cod = tds[0].strip().upper()
                    nome = tds[1].strip()
                    ch_str = tds[3].strip()  # Ex: "60h"
                    m = re.search(r"(\d+)", ch_str)
                    ch = int(m.group(1)) if m else None
                    cr = (ch // 15) if ch else None

                    btn = tr.find("a", title=re.compile(r"Detalhes do Componente", re.IGNORECASE))
                    params: Dict[str, str] = {}
                    if btn and btn.get("onclick"):
                        matches = re.findall(r"'([^']+)':\s*'([^']+)'", btn["onclick"])
                        params = dict(matches)

                    comps[cod] = {
                        "nome": nome,
                        "carga_horaria": ch,
                        "creditos": cr,
                        "detalhes_params": params,
                    }

            return comps, vs_res
        except Exception as e:
            self.logger.warning(f"Aviso ao consultar componentes do depto {depto_id}: {e}")
            return {}, None

    def fetch_detalhes_componente(
        self,
        client: httpx.Client,
        view_state: str,
        params: Dict[str, str],
    ) -> Dict[str, Optional[str]]:
        """
        Dispara requisição JSF para obter os detalhes do componente e extrai:
        - Ementa / Descrição
        - Pré-Requisitos (expressão booleana de códigos)
        - Co-Requisitos
        - Equivalências

        Garante que apenas a tabela principal de visualização do componente
        (class="visualizacao") seja considerada, evitando falsos positivos de
        tabelas secundárias como 'Outros componentes que têm esse componente como pré-requisito'
        ou 'Histórico de Pré-Requisitos'.
        """
        resultado: Dict[str, Optional[str]] = {
            "ementa": None,
            "pre_requisitos": None,
            "co_requisitos": None,
            "equivalencias": None,
        }
        if not view_state or not params:
            return resultado

        try:
            post_data = {
                "formListagemComponentes": "formListagemComponentes",
                "javax.faces.ViewState": view_state,
            }
            post_data.update(params)

            resp = client.post(self.componentes_url, data=post_data)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            vis_table = soup.find("table", class_="visualizacao")
            if not vis_table:
                vis_table = soup.find("table")

            if vis_table:
                for tr in vis_table.find_all("tr"):
                    # Assegura que a linha pertence diretamente à tabela principal
                    if tr.find_parent("table") != vis_table:
                        continue
                    cells = tr.find_all(["th", "td"], recursive=False)
                    if len(cells) >= 2:
                        label = cells[0].get_text(" ", strip=True).lower().rstrip(":")
                        val_raw = cells[1].get_text(" ", strip=True)
                        val_clean = None if (not val_raw or val_raw == "-") else re.sub(r"\s+", " ", val_raw).strip()

                        if label in ["pré-requisitos", "pre-requisitos", "pré-requisito", "pre-requisito"]:
                            resultado["pre_requisitos"] = val_clean
                        elif label in ["co-requisitos", "co-requisito", "corequisitos", "corequisito"]:
                            resultado["co_requisitos"] = val_clean
                        elif label in ["equivalências", "equivalencias", "equivalência", "equivalencia"]:
                            resultado["equivalencias"] = val_clean
                        elif label.startswith("ementa"):
                            all_text = cells[1].get_text("\n", strip=True) if len(cells) > 1 else tr.get_text("\n", strip=True)
                            clean = re.sub(r"^Ementa(?:/Descrição)?:\s*", "", all_text, flags=re.IGNORECASE).strip()
                            clean = re.sub(r"[ \t]+", " ", clean)
                            clean = re.sub(r"\n\s*\n+", "\n", clean)
                            if clean and clean != "-":
                                resultado["ementa"] = clean

            # Fallback para ementa se ainda não encontrada
            if not resultado["ementa"]:
                for el in soup.find_all(["div", "p", "td", "span"]):
                    txt = el.get_text(" ", strip=True)
                    if txt.lower().startswith("ementa:") or txt.lower().startswith("ementa/descrição:"):
                        clean = re.sub(r"^Ementa(?:/Descrição)?:\s*", "", txt, flags=re.IGNORECASE).strip()
                        clean = re.sub(r"\s+", " ", clean)
                        if clean and clean != "-":
                            resultado["ementa"] = clean
                            break

            return resultado
        except Exception as e:
            self.logger.debug(f"Erro ao extrair detalhes do componente: {e}")
            return resultado

    def fetch_ementa_componente(
        self,
        client: httpx.Client,
        view_state: str,
        params: Dict[str, str],
    ) -> Optional[str]:
        """Wrapper de compatibilidade para retornar apenas a Ementa."""
        return self.fetch_detalhes_componente(client, view_state, params).get("ementa")

    def scrape_departamento(
        self,
        client: httpx.Client,
        departamento_id: int,
        ano: int,
        periodo: int,
    ) -> Dict[str, Any]:
        """
        Executa a requisição JSF para buscar turmas de um único departamento.
        """
        # 1. Carrega a página de formulário e captura ViewState e action
        form_resp = client.get(self.base_url)
        form_resp.raise_for_status()

        soup = BeautifulSoup(form_resp.text, "html.parser")
        form_turma = soup.find("form", {"id": "formTurma"})
        if not form_turma:
            raise RuntimeError("Formulário formTurma não localizado no HTML do SIGAA.")

        raw_action = form_turma.get("action") or self.base_url
        action_url = urljoin(self.base_url, raw_action)

        form_data: Dict[str, str] = {}
        for hidden in form_turma.find_all("input", type="hidden"):
            name = hidden.get("name")
            if name:
                form_data[name] = hidden.get("value", "")

        # Localiza dinamicamente o nome do botão de busca
        botao_buscar = soup.find("input", attrs={"value": re.compile(r"^\s*Buscar\s*$", re.IGNORECASE)})
        nome_botao = botao_buscar.get("name") if botao_buscar else "formTurma:j_id_jsp_1370969402_11"

        form_data.update({
            "formTurma:inputNivel": "G",
            "formTurma:inputDepto": str(departamento_id),
            "formTurma:inputAno": str(ano),
            "formTurma:inputPeriodo": str(periodo),
            nome_botao: "Buscar",
        })

        # Pausa para sincronização de sessão no servidor JSF
        time.sleep(1.0)

        # 2. Submissão da busca
        search_resp = client.post(action_url, data=form_data)
        search_resp.raise_for_status()

        return self.parse_turmas_html(search_resp.text, departamento_id, f"{ano}.{periodo}")

    def parse_turmas_html(self, html: str, departamento_id: int, semestre: str) -> Dict[str, Any]:
        """Faz o parsing da tabela de turmas retornada pelo SIGAA."""
        soup = BeautifulSoup(html, "html.parser")

        # Verifica se houve retorno de nenhum registro
        msg_sistema = soup.find(class_=re.compile(r"(info|erro)", re.IGNORECASE))
        if msg_sistema:
            texto = msg_sistema.get_text(strip=True).lower()
            if "nenhum" in texto or "não foram encontrados" in texto or "invalido" in texto:
                return {"departamento_id": departamento_id, "turmas": []}

        turmas_div = soup.find("div", {"id": "turmasAbertas"})
        if not turmas_div:
            return {"departamento_id": departamento_id, "turmas": []}

        tables = turmas_div.find_all("table", {"class": "listagem"})
        turmas: List[Dict[str, Any]] = []

        for table in tables:
            current_disciplina_codigo = ""
            current_disciplina_nome = ""

            for row in table.find_all("tr"):
                classes = row.get("class", [])

                # Linha de cabeçalho da disciplina (agrupador)
                if "agrupador" in classes:
                    title_span = row.find("span", {"class": "tituloDisciplina"})
                    if title_span:
                        texto = title_span.get_text(strip=True)
                        parts = texto.split(" - ", 1)
                        if len(parts) == 2:
                            current_disciplina_codigo = parts[0].strip()
                            current_disciplina_nome = parts[1].strip()
                        else:
                            current_disciplina_codigo = texto.split()[0].strip()
                            current_disciplina_nome = texto
                    continue

                # Linha de dados da turma
                if "linhaPar" in classes or "linhaImpar" in classes:
                    cols = row.find_all("td")
                    if len(cols) >= 8 and current_disciplina_codigo:
                        cod_turma = cols[0].get_text(strip=True)
                        docente_raw = cols[2].get_text("\n", strip=True)
                        docentes = self._parse_docentes_cell(docente_raw)
                        horario_raw = cols[3].get_text(strip=True)
                        horario = horario_raw.split("(")[0].strip() if horario_raw else None

                        # cols[5] = Vagas ofertadas / capacidade total
                        # cols[6] = Vagas ocupadas / matriculados
                        vagas_str = cols[5].get_text(strip=True)
                        capacidade = int(vagas_str) if vagas_str.isdigit() else None

                        matriculados_str = cols[6].get_text(strip=True) if len(cols) > 6 else ""
                        matriculados = int(matriculados_str) if matriculados_str.isdigit() else None

                        local = cols[7].get_text(strip=True) if len(cols) > 7 else None

                        turmas.append({
                            "codigo_disciplina": current_disciplina_codigo,
                            "nome_disciplina": current_disciplina_nome,
                            "codigo_turma": cod_turma,
                            "semestre": semestre,
                            "docentes": docentes,
                            "horario": horario,
                            "local": local or None,
                            "capacidade": capacidade,
                            "matriculados": matriculados,
                            "departamento_id": departamento_id,
                        })

        return {"departamento_id": departamento_id, "turmas": turmas}

    def extract_from_file(self, file_path: Path, semestre: str = "2026.1") -> Dict[str, List[Dict[str, Any]]]:
        """
        Lê e estrutura dados de arquivos CSV ou JSON (ex: datasets de turmas do NoFluxoUnB).
        """
        self.logger.info(f"Carregando dataset de turmas de: {file_path}")
        ext = file_path.suffix.lower()

        turmas_raw: List[Dict[str, Any]] = []
        disciplinas_map: Dict[str, Dict[str, Any]] = {}
        docentes_deptos_map: Dict[str, Set[str]] = defaultdict(set)
        deptos_nomes_map = self.load_departamentos_map()

        if ext == ".csv":
            with open(file_path, mode="r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cod_disc = row.get("codigo", "").strip()
                    nome_disc_raw = row.get("nome", "").strip()
                    nome_disc = re.sub(r"^[A-Z0-9]+\s*-\s*", "", nome_disc_raw).strip()
                    cod_turma = row.get("turma", "").strip()
                    docentes_raw = row.get("docente", "").strip()
                    horario = row.get("horario", "").strip() or None
                    local = row.get("local", "").strip() or None

                    vagas_str = row.get("qnt_vagas") or row.get("vagas_ofertadas") or row.get("capacidade") or ""
                    capacidade = int(str(vagas_str).strip()) if str(vagas_str).strip().isdigit() else None

                    matr_str = row.get("matriculados") or row.get("vagas_ocupadas") or row.get("ocupadas") or ""
                    matriculados = int(str(matr_str).strip()) if str(matr_str).strip().isdigit() else None

                    depto_id = row.get("departamento_id", "").strip() or None
                    depto_raw = row.get("departamento", "").strip() or None
                    depto_nome_clean = None
                    if depto_id and depto_id.isdigit():
                        depto_nome_clean = deptos_nomes_map.get(int(depto_id))
                    if not depto_nome_clean and depto_raw:
                        depto_nome_clean = self._clean_depto_nome(depto_raw)
                    if not depto_nome_clean and depto_id:
                        depto_nome_clean = str(depto_id)

                    docentes = [
                        d.strip()
                        for d in re.split(r"[/,]", docentes_raw)
                        if d.strip() and d.strip().upper() != "NAO INFORMADO"
                    ]

                    for d in docentes:
                        if depto_nome_clean:
                            docentes_deptos_map[d].add(depto_nome_clean)
                        else:
                            docentes_deptos_map[d]

                    if cod_disc and cod_disc not in disciplinas_map:
                        disciplinas_map[cod_disc] = {
                            "codigo": cod_disc,
                            "nome": nome_disc or cod_disc,
                            "departamento": depto_nome_clean,
                        }

                    turmas_raw.append({
                        "codigo_disciplina": cod_disc,
                        "nome_disciplina": nome_disc,
                        "codigo_turma": cod_turma,
                        "semestre": semestre,
                        "docentes": docentes,
                        "horario": horario,
                        "local": local,
                        "capacidade": capacidade,
                        "matriculados": matriculados,
                    })

        elif ext == ".json":
            with open(file_path, mode="r", encoding="utf-8") as f:
                data = json.load(f)
                items = data if isinstance(data, list) else data.get("turmas", [])
                for item in items:
                    cod = item.get("codigo_disciplina") or item.get("codigo", "")
                    nome = item.get("nome_disciplina") or item.get("nome", "")

                    depto_raw = item.get("departamento") or item.get("departamento_id")
                    depto_nome_clean = None
                    if depto_raw:
                        if str(depto_raw).strip().isdigit():
                            depto_nome_clean = deptos_nomes_map.get(int(str(depto_raw).strip()))
                        if not depto_nome_clean:
                            depto_nome_clean = self._clean_depto_nome(str(depto_raw).strip())

                    raw_doc = item.get("docentes") or item.get("docente") or []
                    if isinstance(raw_doc, str):
                        doc_list = [d.strip() for d in re.split(r"[/,]", raw_doc) if d.strip()]
                    elif isinstance(raw_doc, list):
                        doc_list = [str(d).strip() for d in raw_doc if str(d).strip()]
                    else:
                        doc_list = []

                    doc_clean: List[str] = []
                    for d in doc_list:
                        if d.upper() != "NAO INFORMADO":
                            if depto_nome_clean:
                                docentes_deptos_map[d].add(depto_nome_clean)
                            else:
                                docentes_deptos_map[d]
                            doc_clean.append(d)

                    if cod and cod not in disciplinas_map:
                        disciplinas_map[cod] = {
                            "codigo": cod,
                            "nome": nome or cod,
                            "departamento": depto_nome_clean,
                        }

                    cap_val = item.get("capacidade") if item.get("capacidade") is not None else item.get("qnt_vagas")
                    capacidade = int(str(cap_val).strip()) if cap_val is not None and str(cap_val).strip().isdigit() else None

                    matr_val = item.get("matriculados") if item.get("matriculados") is not None else (item.get("vagas_ocupadas") or item.get("ocupadas"))
                    matriculados = int(str(matr_val).strip()) if matr_val is not None and str(matr_val).strip().isdigit() else None

                    turmas_raw.append({
                        "codigo_disciplina": cod,
                        "nome_disciplina": nome,
                        "codigo_turma": str(item.get("codigo_turma") or item.get("turma", "")).strip(),
                        "semestre": str(item.get("semestre", semestre)).strip(),
                        "docentes": doc_clean,
                        "horario": item.get("horario"),
                        "local": item.get("local"),
                        "capacidade": capacidade,
                        "matriculados": matriculados,
                    })

        docentes_list = []
        for doc_nome, deptos in sorted(docentes_deptos_map.items()):
            if deptos:
                depto_str = ", ".join(sorted(deptos))
                if len(depto_str) > 255:
                    depto_str = depto_str[:252] + "..."
            else:
                depto_str = None
            docentes_list.append({
                "nome": doc_nome,
                "departamento": depto_str,
            })

        return {
            "turmas": turmas_raw,
            "disciplinas": list(disciplinas_map.values()),
            "docentes": docentes_list,
            "cursos": [],
        }

    @staticmethod
    def _parse_docentes_cell(text: str) -> List[str]:
        """Extrai nomes limpos de docentes de uma célula multilinha (removendo (60h), etc.)."""
        docentes: List[str] = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            clean_name = re.sub(r"\s*\(\d+h\)\s*$", "", line, flags=re.IGNORECASE).strip()
            if clean_name and clean_name.upper() != "NAO INFORMADO" and clean_name not in docentes:
                docentes.append(clean_name)
        return docentes
