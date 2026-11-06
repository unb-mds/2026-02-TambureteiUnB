from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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


dashboard_service = DashboardService()
