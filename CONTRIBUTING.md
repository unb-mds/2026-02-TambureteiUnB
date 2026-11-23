# Guia de Contribuição — Tamburetei UnB

Este documento estabelece o fluxo oficial de trabalho, padrões arquiteturais, convenções de versionamento e portas de qualidade obrigatórias para contribuir com o **Tamburetei UnB** (MDS 2026/2 — FCTE / Universidade de Brasília).

---

## 1. Fluxo de Trabalho (Git e GitHub)

O repositório utiliza uma estratégia de branches baseada em duas linhas principais:

* **`main`:** branch de produção e entregas oficiais de Release (aciona o deploy automático da documentação no GitHub Pages via `.github/workflows/deploy-docs.yml`).
* **`develop`:** branch de integração contínua da sprint. Todas as novas funcionalidades, correções e melhorias documentais partem da `develop` e retornam para ela via Pull Request.

### Passo a passo para contribuir

1. **Issue Obrigatória:** toda alteração deve estar vinculada a uma Issue (User Story, Bug ou Task) cadastrada no quadro do projeto.
2. **Sincronização e Criação da Branch:**
   ```bash
   git switch develop
   git pull origin develop
   git switch -c <tipo>/<descricao-curta>
   ```
3. **Nomenclatura de Branches:**
   * `feat/<escopo>`: nova funcionalidade ou User Story (ex.: `feat/dashboard-geral`).
   * `fix/<escopo>`: correção de defeito ou regressão (ex.: `fix/178-ocupacao-real-turmas`).
   * `docs/<escopo>`: criação ou reestruturação de documentação (ex.: `docs/estrutura-pastas`).
   * `test/<escopo>`: adição ou refatoração exclusiva de testes automatizados.
   * `chore/<escopo>` ou `ci/<escopo>`: manutenção de infraestrutura, Docker ou GitHub Actions.

---

## 2. Padrão de Commits e Comunicação Técnica

O projeto adota a especificação **Conventional Commits** combinada com as diretrizes do `AGENTS.md`:

* **Formato:** `<tipo>(<escopo opcional>): <descrição no imperativo ou presente>`
  * Exemplos:
    * `test(dashboard): adiciona testes unitarios para calculo de taxa de evasao`
    * `feat(dashboard): implementa endpoint GET /dashboard/geral`
    * `docs: atualiza dicionario de dados ate a revisao 015 do Alembic`
* **Commits Atômicos por Camada:** evite commits monolíticos. Separe as alterações em commits incrementais por camada arquitetural (`test` -> `domain` -> `schemas` -> `repositories` -> `services` -> `routers`).
* **Política Sem Emojis:** é estritamente proibido o uso de emojis em mensagens de commit, títulos e descrições de Pull Requests, Issues, comentários de código e documentação técnica (`AGENTS.md`).

---

## 3. Arquitetura e Desenvolvimento Orientado a Testes (TDD)

Toda implementação no backend (`backend/app/`) segue o ciclo **TDD (`Red -> Green -> Refactor`)** aliado à **Clean Architecture**:

1. **`app/domain/` (Domínio Puro):** funções matemáticas e regras de negócio puras, sem dependência de FastAPI, SQLAlchemy ou HTTP. Alvo prioritário de testes unitários e testes de mutação (Mutmut).
2. **`app/api/schemas/` (Contratos Pydantic v2):** validação de entrada e serialização de saída utilizando `ConfigDict(from_attributes=True)` e `PydanticCustomError` com mensagens claras em português.
3. **`app/models/` e `alembic/` (Database-as-Code — ADR 02):** modelos SQLAlchemy 2.0. Qualquer evolução de esquema exige migração linear no Alembic (`alembic revision --autogenerate -m "..."`), mantendo um único `head`.
4. **`app/repositories/` (Acesso a Dados):** encapsula consultas SQLAlchemy 2.0, utilizando `selectinload` ou `.unique()` em relacionamentos N:N para evitar o problema de consultas N+1.
5. **`app/services/` (Casos de Uso):** orquestra repositórios e funções de domínio, realizando o controle transacional e lançando `HTTPException` semânticas (`400`, `401`, `403`, `404`, `409`, `422`, `503`).
6. **`app/api/routers/` (Transporte HTTP Declarativo):** roteadores enxutos que apenas injetam dependências (`Depends(get_db)`, `Depends(get_current_user)`) e delegam a chamada ao `Service`. É vedado executar consultas SQL ou instanciar modelos ORM dentro dos routers.

---

## 4. Portas de Qualidade (Quality Gates) antes do Pull Request

Antes de abrir ou solicitar revisão em um Pull Request para a `develop`, execute localmente as verificações exigidas pelo pipeline `.github/workflows/ci.yml`:

### Backend (via Docker)
```bash
# 1. Lint e formatação estática (Ruff)
docker compose exec backend ruff check app tests

# 2. Análise estática de segurança / SAST (Bandit)
docker compose exec backend bandit -r app -ll

# 3. Migrações lineares do Alembic
docker compose exec backend alembic upgrade head

# 4. Suíte de testes automatizados e cobertura mínima (>= 70%)
docker compose exec backend pytest --cov=app --cov-report=term-missing --cov-fail-under=70

# 5. Testes de mutação nas regras de negócio (Mutmut >= 50%)
docker compose exec backend mutmut run
```

### Frontend (Next.js / TypeScript)
```bash
cd frontend
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
```

### Documentação (MkDocs)
```bash
mkdocs build --strict
```

---

## 5. Abertura e Revisão de Pull Requests

1. Preencha integralmente o template `.github/PULL_REQUEST_TEMPLATE.md`, marcando o checklist de conformidade arquitetural e referenciando a Issue (`Closes #XXX` ou `Relacionado a #XXX`).
2. Aguarde a aprovação de todos os jobs do GitHub Actions (`Backend — Lint & SAST`, `Backend — Testes, Cobertura & Mutação`, `Frontend — Lint, Typecheck & Build` e `Infra — Docker Compose Build & Healthcheck`).
3. Todo Pull Request requer revisão (*Code Review*) de pelo menos outro integrante da equipe antes do merge na `develop`.
