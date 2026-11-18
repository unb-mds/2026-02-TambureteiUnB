from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.estatistica_consolidada import SerieHistoricaResponse, SerieHistoricaSemestre
from app.domain.semestre import intervalo_anos_valido, intervalo_semestres
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.estatistica_repo import estatistica_repo

MSG_INTERVALO_INVALIDO = "Intervalo de anos inválido: ano_fim deve ser maior ou igual a ano_inicio."


class EstatisticaService:
    def serie_historica(
        self,
        db: Session,
        disciplina_id: int,
        ano_inicio: Optional[int],
        ano_fim: Optional[int],
    ) -> SerieHistoricaResponse:
        # 1. Intervalo coerente
        if not intervalo_anos_valido(ano_inicio, ano_fim):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=MSG_INTERVALO_INVALIDO)

        # 2. Disciplina precisa existir
        if not disciplina_repo.get_by_id(db, disciplina_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

        # 3. Conversao de anos em semestres e consulta agregada
        semestre_inicio, semestre_fim = intervalo_semestres(ano_inicio, ano_fim)
        linhas = estatistica_repo.serie_historica_por_disciplina(
            db, disciplina_id, semestre_inicio, semestre_fim
        )

        return SerieHistoricaResponse(
            disciplina_id=disciplina_id,
            ano_inicio=ano_inicio,
            ano_fim=ano_fim,
            semestres=[
                SerieHistoricaSemestre(
                    semestre_referencia=linha.semestre_referencia,
                    total_turmas=linha.total_turmas,
                    taxa_aprovacao=float(linha.taxa_aprovacao),
                    taxa_reprovacao_nota=float(linha.taxa_reprovacao_nota),
                    taxa_reprovacao_falta=float(linha.taxa_reprovacao_falta),
                    taxa_trancamento=float(linha.taxa_trancamento),
                )
                for linha in linhas
            ],
        )


estatistica_service = EstatisticaService()
