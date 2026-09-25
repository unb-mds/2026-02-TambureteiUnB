import csv
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.pipeline.config import pipeline_settings
from app.pipeline.extractors.base import BaseExtractor

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
        departamentos_file: Optional[Path] = None,
    ):
        super().__init__(name="SIGAAExtractor")
        self.base_url = base_url or pipeline_settings.SIGAA_BASE_URL
        self.home_url = home_url or pipeline_settings.SIGAA_HOME_URL
        self.departamentos_file = departamentos_file or pipeline_settings.DEPARTAMENTOS_CSV

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

    def extract(
        self,
        semestre: str = "2026.1",
        input_file: Optional[str] = None,
        departamentos: Optional[List[int]] = None,
        max_departamentos: Optional[int] = None,
        delay_seconds: float = 1.5,
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

        # Extração via Scraping online do SIGAA
        self.logger.info(f"Iniciando scraping online do SIGAA para o semestre {semestre}...")
        match = re.match(r"^(\d{4})\.([12])$", semestre.strip())
        if not match:
            raise ValueError(f"Semestre inválido: '{semestre}'. Esperado formato YYYY.S (ex: '2026.1').")

        ano = int(match.group(1))
        periodo = int(match.group(2))

        deptos_ids = departamentos or self.load_departamentos_ids()
        if max_departamentos:
            deptos_ids = deptos_ids[:max_departamentos]

        todas_turmas: List[Dict[str, Any]] = []
        disciplinas_map: Dict[str, Dict[str, Any]] = {}
        docentes_set: Set[str] = set()
        successful_deptos = 0

        with httpx.Client(headers=self.HEADERS, timeout=45.0, follow_redirects=True) as client:
            # 1. Inicializa cookies de sessão na home
            try:
                client.get(self.home_url)
            except Exception as e:
                self.logger.warning(f"Aviso ao inicializar sessão na home: {e}")

            for depto_id in deptos_ids:
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
                                "departamento": str(depto_id),
                            }
                        for doc in t.get("docentes", []):
                            if doc:
                                docentes_set.add(doc)

                    successful_deptos += 1
                    self.logger.info(f"Depto {depto_id}: {len(turmas_depto)} turmas encontradas.")
                except Exception as e:
                    self.logger.error(f"Erro ao raspar departamento {depto_id}: {e}")

        if deptos_ids and successful_deptos == 0:
            raise RuntimeError(
                f"Falha total na extração online do SIGAA: todos os {len(deptos_ids)} departamentos falharam. "
                "Verifique a conectividade ou formato da sessão JSF."
            )

        docentes_list = [{"nome": d} for d in sorted(docentes_set)]

        return {
            "turmas": todas_turmas,
            "disciplinas": list(disciplinas_map.values()),
            "docentes": docentes_list,
        }

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
        docentes_set: Set[str] = set()

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
                    capacidade = int(vagas_str) if str(vagas_str).isdigit() else None

                    matr_str = row.get("matriculados") or row.get("vagas_ocupadas") or row.get("ocupadas") or ""
                    matriculados = int(matr_str) if str(matr_str).isdigit() else None

                    depto_id = row.get("departamento_id", "").strip() or None

                    docentes = [
                        d.strip()
                        for d in re.split(r"[/,]", docentes_raw)
                        if d.strip() and d.strip().upper() != "NAO INFORMADO"
                    ]

                    for d in docentes:
                        docentes_set.add(d)

                    if cod_disc and cod_disc not in disciplinas_map:
                        disciplinas_map[cod_disc] = {
                            "codigo": cod_disc,
                            "nome": nome_disc or cod_disc,
                            "departamento": depto_id,
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
                            docentes_set.add(d)
                            doc_clean.append(d)

                    if cod and cod not in disciplinas_map:
                        disciplinas_map[cod] = {
                            "codigo": cod,
                            "nome": nome or cod,
                            "departamento": item.get("departamento") or item.get("departamento_id"),
                        }

                    turmas_raw.append({
                        "codigo_disciplina": cod,
                        "nome_disciplina": nome,
                        "codigo_turma": str(item.get("codigo_turma") or item.get("turma", "")).strip(),
                        "semestre": str(item.get("semestre", semestre)).strip(),
                        "docentes": doc_clean,
                        "horario": item.get("horario"),
                        "local": item.get("local"),
                        "capacidade": int(item["capacidade"]) if item.get("capacidade") is not None else (
                            int(item["qnt_vagas"]) if item.get("qnt_vagas") is not None else None
                        ),
                        "matriculados": int(item["matriculados"]) if item.get("matriculados") is not None else None,
                    })

        return {
            "turmas": turmas_raw,
            "disciplinas": list(disciplinas_map.values()),
            "docentes": [{"nome": d} for d in sorted(docentes_set)],
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
