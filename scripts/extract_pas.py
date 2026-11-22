"""Extrai somente dados agregados do Sistema Universal dos boletins oficiais.
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
    clean = re.sub(r"\s*\([^)]*\)\**", "", name).rstrip("*")
    lower, upper = score(minimum), score(maximum)
    if lower is not None and upper is not None and Decimal(lower) > Decimal(upper):
        raise ValueError(f"Mínimo superior ao máximo: {name}")
    return {
        "nome": clean,
        "campus": campus,
        "grau": degree,
        "turno": shift,
        "minimo": lower,
        "maximo": upper,
        "pagina": page,
        "ingressoConjunto": "Engenharias" in name and "Software" in name,
    }


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
