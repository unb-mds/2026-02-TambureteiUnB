"""Extrai dados agregados do Sistema Universal e cotas dos boletins oficiais.
Requer pdfplumber. PDFs são guardados no diretório temporário, fora do Git.
"""

import collections
import hashlib
import json
import re
import tempfile
import unicodedata
import urllib.request
from decimal import Decimal
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads(
    Path(__file__).with_name("pas-sources.json").read_text(encoding="utf8")
)
SHIFTS = {"Diurno", "Noturno", "Integral", "Matutino", "Vespertino"}


def compact(s):
    return "".join((s or "").split())


def campus_of(s):
    s = compact(s)
    for fragment, campus in [
        ("Ceilând", "FCE"),
        ("Planalt", "FUP"),
        ("Gama", "FCTE"),
        ("Darcy", "Darcy Ribeiro"),
    ]:
        if fragment in s:
            return campus
    raise ValueError(f"Campus não reconhecido: {s}")


def score(value):
    raw = compact(value)
    if raw == "-":
        return None
    if not re.fullmatch(r"-?\d+\.\d{3}", raw):
        raise ValueError(f"Argumento inválido: {value!r}")
    return raw


def record(name, campus, shift, minimum, maximum, page):
    name = " ".join(name.split())
    name = re.sub(r"Licenciat\s+ura", "Licenciatura", name)
    degree = "Licenciatura" if "Licenciatura" in name else "Bacharelado"
    normalized = (
        unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    )
    degree_labels = {
        "bacharelado": "Bacharelado",
        "bacharelados": "Bacharelado",
        "licenciatura": "Licenciatura",
        "psicologo": "Psicólogo",
    }
    degrees = list(
        dict.fromkeys(
            degree_labels[value]
            for value in re.findall(
                r"\b(bacharelados?|licenciatura|psicologo)\b", normalized
            )
        )
    )
    clean = re.sub(r"\s*\([^)]*\)\**", "", name).rstrip("*")
    lower, upper = score(minimum), score(maximum)
    if lower is not None and upper is not None and Decimal(lower) > Decimal(upper):
        raise ValueError(f"Mínimo superior ao máximo: {name}")
    return {
        "nome": clean,
        "campus": campus,
        "grau": degree,
        "graus": degrees,
        "ofertaOriginal": name,
        "turno": shift,
        "minimo": lower,
        "maximo": upper,
        "pagina": page,
        "ingressoConjunto": "Engenharias" in name and "Software" in name,
    }


QUOTA_IDS = [
    "ep_baixa_ppi", "ep_baixa_pcd_ppi", "ep_baixa_nao_ppi", "ep_baixa_pcd_nao_ppi",
    "ep_alta_ppi", "ep_alta_pcd_ppi", "ep_alta_nao_ppi", "ep_alta_pcd_nao_ppi", "negros",
]


def quota_modalities(cycle):
    threshold = "1,0" if cycle == "2023-2025" else "1,5"
    identity = "PPIQ" if cycle == "2023-2025" else "PPI"
    modalities = []
    for group in ("baixa", "alta"):
        for category in (identity, "PCD e " + identity, "Não " + identity, "PCD e Não " + identity):
            identifier = QUOTA_IDS[len(modalities)]
            income = "≤" if group == "baixa" else ">"
            modalities.append({"id": identifier, "sistema": "Sistema de Cotas para Escolas Públicas", "descricao": f"Renda {income} {threshold} salário mínimo · {category}"})
    modalities.append({"id": "negros", "sistema": "Sistema de Cotas para Negros", "descricao": "Sistema de Cotas para Negros"})
    return modalities


def quota_scores(values):
    if len(values) != 18:
        raise ValueError(f"Esperadas 18 colunas de notas de cotas; recebidas {len(values)}")
    result = {}
    for index, identifier in enumerate(QUOTA_IDS):
        lower, upper = score(values[index * 2]), score(values[index * 2 + 1])
        if lower is not None and upper is not None and Decimal(lower) > Decimal(upper):
            raise ValueError(f"Mínimo de cota superior ao máximo: {identifier}")
        result[identifier] = {"minimo": lower, "maximo": upper}
    return result


def extract(cycle, url):
    path = Path(tempfile.gettempdir()) / f"pas-history-{cycle}.pdf"
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=40).read())
    records = []
    with pdfplumber.open(path) as pdf:
        if cycle == "2019-2021":
            # Este layout traz campus/curso nas primeiras colunas e fragmenta células em linhas.
            assert (
                "Sistema" in pdf.pages[5].extract_text()
                and "Universal" in pdf.pages[5].extract_text()
            )
            for page in range(5, 11):
                table = max(pdf.pages[page].extract_tables(), key=len)
                starts = [
                    i
                    for i, row in enumerate(table)
                    if len(row) > 4 and compact(row[3]) in SHIFTS
                ]
                for index, start in enumerate(starts):
                    end = starts[index + 1] if index + 1 < len(starts) else len(table)
                    block = table[start:end]
                    campus_text = " ".join(v for row in block for v in row[:3] if v)
                    # Os seis primeiros layouts subdividem a coluna do nome em três células.
                    name_cells = slice(4, 5) if len(table[0]) == 25 else slice(4, 7)
                    name = " ".join(v for row in block for v in row[name_cells] if v)
                    records.append(
                        record(
                            name,
                            campus_of(campus_text),
                            compact(table[start][3]),
                            table[start][-2],
                            table[start][-1],
                            page + 1,
                        )
                    )
                    value_start = 5 if len(table[0]) == 25 else 7
                    values = [value for value in table[start][value_start:] if value is not None and value.strip()]
                    if len(values) != 20:
                        raise ValueError(f"Colunas de notas inesperadas em {cycle}, página {page + 1}")
                    # Em 2019–2021, Negros vem antes das oito modalidades de escola pública.
                    records[-1]["cotas"] = quota_scores(values[2:18] + values[:2])

        else:
            campus = None
            for page_no, page in enumerate(pdf.pages, 1):
                for table in page.extract_tables():
                    if len(table[0]) != 22:
                        continue
                    if "Universal" not in (table[0][-2] or ""):
                        raise ValueError(
                            f"Coluna Universal não confirmada: {cycle}, página {page_no}"
                        )
                    expected_identity = "PPIQ" if cycle == "2023-2025" else "PPI"
                    expected_income = "1,0" if cycle == "2023-2025" else "1,5"
                    if not (
                        "EscolasPúblicas" in compact(table[0][2])
                        and "Negros" in compact(table[0][18])
                        and expected_income in compact(table[1][2])
                        and expected_income in compact(table[1][10])
                        and compact(table[2][2]) == expected_identity
                        and compact(table[2][4]) == "PCDe" + expected_identity
                    ):
                        raise ValueError(f"Cabeçalhos de cotas não confirmados: {cycle}, página {page_no}")
                    for row in table:
                        name = " ".join((row[0] or "").split())
                        if name.startswith("Campus UnB"):
                            campus = campus_of(name)
                        if row[1] not in SHIFTS:
                            continue
                        if not campus:
                            raise ValueError(f"Campus ausente: {name}")
                        records.append(
                            record(name, campus, row[1], row[-2], row[-1], page_no)
                        )
                        quota_values = row[2:20]
                        invalid_printed_cell = (
                            cycle == "2021-2023" and page_no == 7
                            and "Arquitetura e Urbanismo" in name and row[1] == "Diurno"
                            and quota_values[11] == "h"
                        )
                        if invalid_printed_cell:
                            # A própria tabela oficial imprime uma letra, sem valor numérico.
                            quota_values[11] = "-"
                        records[-1]["cotas"] = quota_scores(quota_values)
                        if invalid_printed_cell:
                            records[-1]["cotas"]["ep_alta_pcd_ppi"].update({
                                "maximoOriginal": "h",
                                "observacao": "O boletim imprime ‘h’ no máximo desta modalidade; não há valor numérico válido.",
                            })
    if not records or sum(r["ingressoConjunto"] for r in records) != 1:
        raise ValueError(f"Oferta conjunta ausente ou duplicada: {cycle}")
    if cycle == "2018-2020":
        # A tabela de argumentos mistura cursos entre cabeçalhos de campus.
        # Validar pela tabela de demanda da mesma edição apenas quando o vínculo é único.
        def identity(name, degree, shift):
            raw = (
                unicodedata.normalize("NFKD", name)
                .encode("ascii", "ignore")
                .decode()
                .lower()
            )
            return re.sub(r"[^a-z0-9]", "", raw), degree, shift

        offers = collections.defaultdict(set)
        evidence = {}
        with pdfplumber.open(path) as pdf:
            if not (
                "Gama" in pdf.pages[9].extract_text()
                and "comum" in pdf.pages[9].extract_text()
            ):
                raise ValueError("Observação de ingresso conjunto não confirmada")
            demand_campus = shift = None
            for page_no in range(10, len(pdf.pages)):
                for table in pdf.pages[page_no].extract_tables():
                    if len(table[0]) != 34:
                        continue
                    for row in table:
                        name = row[0] or ""
                        if name.startswith("Campus UnB"):
                            demand_campus = campus_of(name)
                        elif compact(name) in SHIFTS:
                            shift = compact(name)
                        elif "(" in name and demand_campus and shift:
                            name = re.sub(r"-\s*\n", "", name)
                            name = " ".join(name.split())
                            degree = (
                                "Licenciatura"
                                if "Licenciatura" in name
                                else "Bacharelado"
                            )
                            clean = (
                                re.sub(r"\s*\([^)]*\)\**", "", name).rstrip("*").strip()
                            )
                            key = identity(clean, degree, shift)
                            offers[key].add(demand_campus)
                            evidence[(key, demand_campus)] = page_no + 1
        counts = collections.Counter(
            identity(r["nome"], r["grau"], r["turno"]) for r in records
        )
        for item in records:
            item["campusOriginal"] = item["campus"]
            key = identity(item["nome"], item["grau"], item["turno"])
            candidates = offers[key]
            item["campus"] = "Não validado"
            if item["ingressoConjunto"]:
                item["campus"] = "FCTE"
                item["paginaValidacaoCampus"] = 10
            elif len(candidates) == 1 and counts[key] == 1:
                item["campus"] = next(iter(candidates))
                item["paginaValidacaoCampus"] = evidence[(key, item["campus"])]
    keys = [(r["nome"], r["campus"], r["grau"], r["turno"]) for r in records]
    if cycle != "2018-2020" and len(keys) != len(set(keys)):
        raise ValueError(f"Ofertas duplicadas em {cycle}")
    data = {
        "observacao": "Cabeçalhos de campus inconsistentes. Vínculo não confirmado de forma única na tabela de demanda ou nas observações desta edição."
        if cycle == "2018-2020"
        else "",
        "ciclo": cycle.replace("-", "–"),
        "sistema": "Sistema Universal",
        "url": url,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "modalidades": quota_modalities(cycle),
        "registros": records,
    }
    target = ROOT / f"frontend/src/data/pas-{cycle}.json"
    target.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf8"
    )
    print(
        cycle, len(records), next(r["minimo"] for r in records if r["ingressoConjunto"])
    )


if __name__ == "__main__":
    for cycle, url in SOURCES.items():
        extract(cycle, url)
