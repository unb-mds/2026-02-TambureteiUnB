import math
import re
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.disciplina import (
    CursoDisciplinaInfo,
    DisciplinaResponse,
    DisciplinaResumo,
)
from app.models.disciplina import Disciplina
from app.repositories.disciplina_repo import disciplina_repo
from app.pipeline.transformers.sigaa_transformer import slugify


class DisciplinaService:
    @staticmethod
    def _incluir_locais_oferta(db: Session, items: List[Disciplina], semestre: Optional[str] = None) -> None:
        ids = [item.id for item in items]
        locais = disciplina_repo.listar_locais_oferta(db, ids, semestre)
        ids_pizza = disciplina_repo.listar_ids_com_pizza(db, ids)
        for item in items:
            item.locais_oferta = locais.get(item.id, [])
            item.possui_dados_pizza = item.id in ids_pizza

    def listar_catalogo(
        self,
        db: Session,
        nome: Optional[str],
        codigo: Optional[str],
        departamento: Optional[str],
        page: int,
        size: int,
    ) -> dict:
        items, total = disciplina_repo.search_paginated(
            db,
            nome=nome,
            codigo=codigo,
            departamento=departamento,
            skip=(page - 1) * size,
            limit=size,
        )
        self._incluir_locais_oferta(db, items)
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if total else 0,
        }

    def listar(
        self,
        db: Session,
        nome: Optional[str] = None,
        codigo: Optional[str] = None,
        departamento: Optional[str] = None,
        apenas_com_turmas: bool = False,
        semestre: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Disciplina]:
        items, _ = disciplina_repo.search_paginated(
            db,
            nome=nome,
            codigo=codigo,
            departamento=departamento,
            apenas_com_turmas=apenas_com_turmas,
            semestre=semestre,
            skip=0,
            limit=limit,
        )
        self._incluir_locais_oferta(db, items, semestre)
        return items

    @staticmethod
    def _resolver_itens_disciplina(db: Session, expressao: Optional[str]) -> List[DisciplinaResumo]:
        """
        Extrai códigos de disciplinas presentes em expressões de pré-requisitos ou
        equivalências e os resolve para objetos DisciplinaResumo navegáveis.
        """
        if not expressao:
            return []

        itens: List[DisciplinaResumo] = []
        codigos = list(dict.fromkeys(re.findall(r"\b[A-Z]{3,4}\d{4}\b", expressao)))
        if not codigos:
            return itens
        encontradas = disciplina_repo.get_by_codigos(db, codigos)
        for cod in codigos:
            disc_alvo = encontradas.get(cod)
            if disc_alvo:
                itens.append(
                    DisciplinaResumo(
                        codigo=disc_alvo.codigo or cod,
                        nome=disc_alvo.nome,
                        slug=disc_alvo.slug,
                        departamento=disc_alvo.departamento,
                        creditos=disc_alvo.creditos,
                    )
                )
            else:
                itens.append(
                    DisciplinaResumo(
                        codigo=cod,
                        nome=cod,
                        slug=slugify(cod),
                        departamento=None,
                        creditos=None,
                    )
                )
        return itens

    def obter_por_slug(self, db: Session, slug: str) -> DisciplinaResponse:
        """
        Retorna os detalhes completos de uma disciplina (RF07/RF08 - Hub Colaborativo),
        incluindo resolução de pré-requisitos, equivalências e cursos vinculados com
        sua respectiva natureza curricular.
        """
        disciplina = disciplina_repo.get_by_slug(db, slug)
        if not disciplina:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada")

        pre_req_itens = self._resolver_itens_disciplina(db, disciplina.pre_requisitos)
        equiv_itens = self._resolver_itens_disciplina(db, disciplina.equivalencias)

        cursos_info: List[CursoDisciplinaInfo] = []
        for cd in disciplina.cursos_disciplinas:
            if cd.curso:
                cursos_info.append(
                    CursoDisciplinaInfo(
                        curso_nome=cd.curso.nome,
                        curso_slug=cd.curso.slug,
                        periodo_sugerido=cd.periodo_sugerido,
                        is_obrigatoria=cd.is_obrigatoria,
                        natureza=cd.natureza or ("Obrigatoria" if cd.is_obrigatoria else "Optativa"),
                    )
                )

        ids_pizza = disciplina_repo.listar_ids_com_pizza(db, [disciplina.id])

        return DisciplinaResponse(
            id=disciplina.id,
            codigo=disciplina.codigo or "",
            nome=disciplina.nome,
            slug=disciplina.slug,
            departamento=disciplina.departamento,
            creditos=disciplina.creditos,
            carga_horaria=disciplina.carga_horaria,
            ementa=disciplina.ementa,
            pre_requisitos=disciplina.pre_requisitos,
            co_requisitos=disciplina.co_requisitos,
            equivalencias=disciplina.equivalencias,
            pre_requisitos_itens=pre_req_itens,
            equivalencias_itens=equiv_itens,
            cursos=cursos_info,
            possui_dados_pizza=disciplina.id in ids_pizza,
            metrica_consolidada=disciplina.metrica_consolidada,
            metricas=disciplina.metricas or [],
        )


disciplina_service = DisciplinaService()