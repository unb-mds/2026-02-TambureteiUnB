---
name: tamburetei-tdd
description: >-
  Fluxo de Desenvolvimento Orientado a Testes (TDD - Red, Green, Refactor) combinado com a Especificacao Arquitetural do Backend (Clean Architecture) do Tamburetei UnB (MDS 2026/2). Use sempre que for implementar novas User Stories, endpoints, servicos, schemas, repositorios ou testes no backend FastAPI.
---

# Skill: TDD e Clean Architecture — Tamburetei UnB (MDS 2026/2)

Esta skill define o fluxo obrigatorio de **Test-Driven Development (TDD)** integrado a **Especificacao Arquitetural do Backend** do projeto Tamburetei UnB, garantindo commits atomicos por camada e conformidade com as portas de qualidade da disciplina.

---

## 1. Ciclo Obrigatorio de TDD (Red -> Green -> Refactor)

Nenhuma funcionalidade do backend deve ser implementada de uma so vez. Siga estritamente as 3 etapas:

### Etapa 1 — RED (Escrever os Testes Primeiro)
Antes de criar a rota ou a regra de negocio, defina os contratos e escreva os testes automatizados que validam todos os criterios de aceitacao da User Story:
1. **Testes Unitarios (`backend/tests/unit/`):**
   - Testar a validacao dos Schemas Pydantic v2 (entradas validas, entradas invalidas e mensagens em portugues via `PydanticCustomError`).
   - Testar funcoes puras de calculo/regras em `app/domain/` ou metodos isolados de `app/services/` (cobrindo valores limites, listas vazias e divisoes por zero para matar mutantes no Mutmut).
2. **Testes de Integracao (`backend/tests/integration/`):**
   - Testar o caso de sucesso (HTTP 200 / 201) verificando a estrutura exata do JSON retornado.
   - Testar cenarios de borda obrigatorios: entidade inexistente (HTTP 404), estado vazio controlado (HTTP 200 com `[]`), conflito/duplicidade (HTTP 409) e falta de permissao (HTTP 401 / 403).

### Etapa 2 — GREEN (Implementacao Camada por Camada)
Implemente o codigo minimo e limpo necessario para fazer os testes passarem, respeitando a separacao estrita das 4 camadas da Clean Architecture:

```text
Router (app/api/routers/) -> Service (app/services/) -> Repository (app/repositories/) -> Database (app/models/)
```

### Etapa 3 — REFACTOR e Portas de Qualidade
Com todos os testes passando (100% verde):
1. Revise se nenhuma regra da especificacao arquitetural foi violada.
2. Confira a cobertura de testes (meta minima: **70% de cobertura**):
   ```bash
   docker compose exec backend pytest -v --cov=app --cov-report=term-missing
   ```
3. Se houver logica em `app/domain/`, valide o escore de mutacao (meta minima: **50% de mutantes mortos**):
   ```bash
   docker compose exec backend mutmut run
   ```

---

## 2. Regras Inviolaveis por Camada (Backend Architecture Spec)

### Camada 1: Schemas (`app/api/schemas/`)
- **Responsabilidade Unica:** Contrato de dados e validacao de entrada/saida (Pydantic v2).
- **Regra de Idioma:** Todas as mensagens de erro devem ser em **portugues manual**, claras e amigaveis.
- **Proibido:** Nao utilize `min_length` ou `max_length` soltos no `Field(...)` que gerem erros em ingles (`String should have at least...`). Valide dentro de `@field_validator` ou `@model_validator` levantando `PydanticCustomError`.

### Camada 2: Repositories (`app/repositories/`)
- **Responsabilidade Unica:** Isolamento de consultas e persistencia via SQLAlchemy 2.0.
- Deve herdar de `BaseRepository[Model]`.
- **Regra Critica para Relacionamentos N:N:** Ao carregar colecoes Muitos-para-Muitos (ex.: `turmas_professores`, `cursos_disciplinas`), utilize `selectinload` (ou `.unique()` explicito com `joinedload`) para evitar duplicacao de instancias e evitar o problema de N+1 queries.

### Camada 3: Services (`app/services/`)
- **Responsabilidade Unica:** Regras de negocio, casos de uso e orquestracao entre repositorios.
- Verificar existencia de entidades dependentes e disparar `HTTPException` com status semantico (`400`, `404`, `409`).
- Instanciar modelos ORM antes de envia-los ao repositorio.

### Camada 4: Routers (`app/api/routers/`)
- **Responsabilidade Unica:** Interface HTTP 100% declarativa.
- Apenas define rota, metodo HTTP, `status_code`, `response_model`, injeta dependencias (`Depends(get_db)`, `Depends(require_role(...))`) e repassa imediatamente para o `service`.
- **Estritamente Proibido no Router:**
  1. Fazer queries no banco (`db.query(...)`) ou chamar `repository` diretamente.
  2. Colocar `if/else` de negocio (ex.: `if not curso: raise HTTPException(404)` ou calculos de paginacao `math.ceil`).
  3. Instanciar modelos ORM (`Curso(...)`, `Turma(...)`).

---

## 3. Estrategia de Commits Atomicos por Camada

Para manter um historico Git limpo, auditavel e granular, oriente ou execute **1 commit separado para cada camada concluida**, seguindo *Conventional Commits* sem emojis:

1. `feat(schemas): adiciona schemas <Nome> para <contexto>`
2. `feat(repositories): implementa consulta <metodo> em <Repositorio>`
3. `feat(services): implementa regra de <caso_de_uso> em <Service>`
4. `feat(<modulo>): expoe endpoint <METODO> <rota>`
5. `test(unit): adiciona testes unitarios dos schemas e regras de <modulo>`
6. `test(<modulo>): adiciona testes de integracao para <rota>`
