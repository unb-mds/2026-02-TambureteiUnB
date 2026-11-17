from fastapi import HTTPException, status
from sqlalchemy import RowMapping
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.domain.dashboard import (
    calcular_media,
    calcular_taxa_evasao,
    calcular_taxa_formacao,
)
from app.repositories.dashboard_repo import dashboard_repo


class DashboardService:
    def obter_formacao_curso(self, db: Session, identificador: int | str) -> dict:
        if isinstance(identificador, int):
            curso = dashboard_repo.get_curso_com_metricas(db, identificador)
        else:
            termo = str(identificador).strip()
            if termo.isdigit() and int(termo) <= 2_147_483_647:
                curso = dashboard_repo.get_curso_com_metricas(db, int(termo))
            else:
                curso = dashboard_repo.get_curso_com_metricas_por_slug(db, termo)

        if curso is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso não encontrado.")

        serie_historica = []
        for m in sorted(curso.metricas, key=lambda x: x.ano):
            if m.taxa_sucesso is not None:
                taxa = round(float(m.taxa_sucesso), 2)
            elif m.ingressantes and m.ingressantes > 0:
                taxa = round((m.concluintes / m.ingressantes) * 100, 2)
            else:
                continue

            serie_historica.append({
                "ano": m.ano,
                "ingressantes": m.ingressantes,
                "matriculados": m.matriculados,
                "concluintes": m.concluintes,
                "taxa_formacao": taxa,
            })

        if not serie_historica:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Curso não possui dados públicos suficientes para cálculo da taxa de formação.",
            )

        taxa_media = round(
            sum(item["taxa_formacao"] for item in serie_historica) / len(serie_historica),
            2,
        )

        return {
            "curso_id": curso.id,
            "curso_nome": curso.nome,
            "curso_slug": curso.slug,
            "taxa_media_formacao": taxa_media,
            "serie_historica": serie_historica,
        }

    def listar_evasao_por_campus(self, db: Session, campus: str | None = None) -> dict:
        termo = campus.strip() if campus else ""
        campi = None
        if termo:
            campi = dashboard_repo.listar_campi(db, termo)
            if not campi:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Campus não encontrado.")

        linhas = dashboard_repo.listar_evasao_campus(db, campi)
        resumos = self._agrupar_resumo_campi(linhas)
        return {"total_campi": len(resumos), "campi": resumos}

    def obter_evasao_campus(self, db: Session, campus: str) -> dict:
        nome_campus = self._resolver_campus(db, campus)
        serie = self._montar_serie_evasao(
            dashboard_repo.listar_evasao_campus(db, [nome_campus])
        )
        if not serie:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Campus não possui dados públicos suficientes para cálculo da taxa de evasão.",
            )

        return {
            "campus": nome_campus,
            **self._resumir_serie(serie),
            "serie_historica": serie,
        }

    def _resolver_campus(self, db: Session, campus: str) -> str:
        termo = campus.strip()
        candidatos = dashboard_repo.listar_campi(db, termo) if termo else []
        if not candidatos:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Campus não encontrado.")

        exatos = [nome for nome in candidatos if nome.lower() == termo.lower()]
        if exatos:
            return exatos[0]
        if len(candidatos) > 1:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Termo de campus ambíguo. Informe o nome completo do campus.",
            )
        return candidatos[0]

    def _montar_serie_evasao(self, linhas: list[RowMapping]) -> list[dict]:
        serie = []
        for linha in linhas:
            taxa = calcular_taxa_evasao(linha["desvinculados"], linha["matriculados"])
            if taxa is None:
                continue
            serie.append({
                "ano": linha["ano"],
                "total_cursos": linha["total_cursos"],
                "matriculados": linha["matriculados"],
                "desvinculados": linha["desvinculados"],
                "taxa_evasao": taxa,
            })
        return serie

    def _resumir_serie(self, serie: list[dict]) -> dict:
        matriculados = sum(item["matriculados"] for item in serie)
        desvinculados = sum(item["desvinculados"] for item in serie)
        return {
            "matriculados": matriculados,
            "desvinculados": desvinculados,
            "taxa_evasao": calcular_taxa_evasao(desvinculados, matriculados),
            "taxa_media_anual": calcular_media([item["taxa_evasao"] for item in serie]),
        }

    def obter_visao_geral(self, db: Session) -> dict:
        try:
            linhas_fluxo = dashboard_repo.listar_fluxo_institucional(db)
            linhas_campus = dashboard_repo.listar_evasao_campus(db)
            total_cursos = dashboard_repo.contar_cursos(db)
        except SQLAlchemyError as erro:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Dados consolidados temporariamente indisponíveis. Tente novamente em instantes.",
            ) from erro

        if not linhas_fluxo:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Dados consolidados institucionais ainda não estão disponíveis.",
            )

        fluxo = self._montar_fluxo_estudantes(linhas_fluxo)
        resumo_campi = self._agrupar_resumo_campi(linhas_campus)
        taxas_formacao = [
            item["taxa_formacao"] for item in fluxo if item["taxa_formacao"] is not None
        ]
        taxas_evasao = [
            item["taxa_evasao"] for item in fluxo if item["taxa_evasao"] is not None
        ]

        return {
            "total_cursos": total_cursos,
            "total_campi": len(resumo_campi),
            "ingressantes": sum(item["ingressantes"] for item in fluxo),
            "matriculados": sum(item["matriculados"] for item in fluxo),
            "concluintes": sum(item["concluintes"] for item in fluxo),
            "trancados": sum(item["trancados"] for item in fluxo),
            "evadidos": sum(item["evadidos"] for item in fluxo),
            "taxa_media_formacao": calcular_media(taxas_formacao),
            "taxa_media_evasao": calcular_media(taxas_evasao),
            "resumo_campi": resumo_campi,
            "fluxo_estudantes": fluxo,
        }

    def _agrupar_resumo_campi(self, linhas: list[RowMapping]) -> list[dict]:
        linhas_por_campus: dict[str, list[RowMapping]] = {}
        for linha in linhas:
            linhas_por_campus.setdefault(linha["campus"], []).append(linha)

        resumos = []
        for nome_campus, linhas_campus in linhas_por_campus.items():
            serie = self._montar_serie_evasao(linhas_campus)
            if serie:
                resumos.append({"campus": nome_campus, **self._resumir_serie(serie)})

        resumos.sort(key=lambda item: (-item["taxa_evasao"], item["campus"]))
        return resumos

    def _montar_fluxo_estudantes(self, linhas: list[RowMapping]) -> list[dict]:
        fluxo = []
        for linha in linhas:
            ingressantes = int(linha["ingressantes"] or 0)
            matriculados = int(linha["matriculados"] or 0)
            concluintes = int(linha["concluintes"] or 0)
            trancados = int(linha["trancados"] or 0)
            evadidos = int(linha["evadidos"] or 0)
            fluxo.append({
                "ano": linha["ano"],
                "ingressantes": ingressantes,
                "matriculados": matriculados,
                "concluintes": concluintes,
                "trancados": trancados,
                "evadidos": evadidos,
                "taxa_formacao": calcular_taxa_formacao(concluintes, ingressantes),
                "taxa_evasao": calcular_taxa_evasao(evadidos, matriculados),
            })
        return fluxo


dashboard_service = DashboardService()
