from fastapi import HTTPException, status
from sqlalchemy import RowMapping
from sqlalchemy.orm import Session

from app.domain.dashboard import calcular_media, calcular_taxa_evasao
from app.repositories.dashboard_repo import dashboard_repo


class DashboardService:
    def obter_formacao_curso(self, db: Session, curso_id: int) -> dict:
        curso = dashboard_repo.get_curso_com_metricas(db, curso_id)
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

        linhas_por_campus: dict[str, list[RowMapping]] = {}
        for linha in dashboard_repo.listar_evasao_campus(db, campi):
            linhas_por_campus.setdefault(linha["campus"], []).append(linha)

        resumos = []
        for nome_campus, linhas in linhas_por_campus.items():
            serie = self._montar_serie_evasao(linhas)
            if serie:
                resumos.append({"campus": nome_campus, **self._resumir_serie(serie)})

        resumos.sort(key=lambda item: (-item["taxa_evasao"], item["campus"]))
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


dashboard_service = DashboardService()
