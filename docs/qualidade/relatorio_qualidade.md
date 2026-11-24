# Relatório de Qualidade, Análise Estática e Testes

Este documento consolida as ferramentas de análise estática, regras de estilo, critérios de qualidade automatizados e o relatório de execução dos testes do **Tamburetei UnB** (MDS 2026/2 — FCTE/UnB).

---

## 1. Linters, Estilo e Análise Estática

Todas as regras abaixo são verificadas automaticamente a cada `push` e `Pull Request` para `develop` e `main` pelo workflow [`.github/workflows/ci.yml`](https://github.com/unb-mds/2026-02-TambureteiUnB/blob/develop/.github/workflows/ci.yml):

| Camada | Ferramenta | Configuração / Comando | Escopo e Critério |
| :--- | :--- | :--- | :--- |
| **Backend (Lint)** | **Ruff** | `python -m ruff check app tests` | Verificação de sintaxe, imports, estilo PEP 8 e qualidade de código em `backend/app` e `backend/tests`. |
| **Backend (SAST)** | **Bandit** | `python -m bandit -r app -ll` | Análise estática de segurança bloqueando alertas de severidade média e alta. |
| **Backend (Mutação)** | **Mutmut** | `backend/setup.cfg` (`mutmut run`) | Testes de mutação em 7 módulos críticos de domínio e ETL com escore mínimo de **50%**. |
| **Frontend (Lint)** | **ESLint 9** | `frontend/eslint.config.mjs` (`npm run lint`) | Presets `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`. |
| **Frontend (Tipagem)** | **TypeScript 5** | `npx tsc --noEmit` + `npm run build` | Checagem estática estrita de tipos e validação do build de produção do Next.js. |
| **Infraestrutura** | **Docker Compose** | `docker compose up -d --build` + `/health` | Validação de reprodutibilidade em contêineres (`RNF06`) e saúde de API + PostgreSQL 17. |

### Diretrizes de Estilo e Engenharia
* **Arquitetura Limpa (Backend):** separação estrita entre rotas (`api/routers`), contratos (`api/schemas`), regras puras (`domain`), orquestração (`services`) e persistência (`repositories`), conforme [Arquitetura & ADRs](../engenharia/arquitetura.md) e [Como Contribuir](../comecando/como_contribuir.md).
* **Padronização de código e comunicação:** sem emojis em código, documentação, commits ou PRs (`AGENTS.md`); commits no padrão *Conventional Commits*; esquema de banco versionado exclusivamente via migrações Alembic (*Database-as-Code*).

---

## 2. Cobertura de Código e Relatório Consolidado de Testes

Medição executada sobre o ambiente local conteinerizado em **23/11/2026** (branch `develop` / `docs/governanca-e-readme`):

| Camada / Suíte | Ferramenta / Comando | Resultado | Métrica / Cobertura |
| :--- | :--- | :--- | :--- |
| **Backend — Testes Unitários** | `pytest tests/unit` | 100% aprovados (`0` falhas) | Regras puras de domínio, schemas Pydantic, sanitização LGPD, quórum, moderação, denúncias e ETL. |
| **Backend — Testes de Integração** | `pytest tests/integration` | 100% aprovados (`0` falhas) | Rotas FastAPI, autenticação JWT/RBAC, transações SQLAlchemy e migrações contra PostgreSQL 17. |
| **Backend — Cobertura Geral** | `pytest tests --cov=app` | Aprovado (meta CI: `>= 70%`) | **83%** (`4.838` de `5.805` instruções cobertas; `967` não cobertas). |
| **Backend — Testes de Mutação** | `mutmut run` (`backend/setup.cfg`) | Gate ativo no CI | Escore mínimo exigido de **50%** nos 7 módulos críticos (`metricas_transformer`, `sanitizer`, `materiais`, `quorum`, `semestre`, `moderacao` e `denuncias`). |
| **Frontend — Unitários e Acessibilidade** | `npm test` (Node test runner + `tsx`) | **180 / 180 aprovados** (`0` falhas, `0` pulados) | Serviços HTTP, validação de upload, dificuldades, curadoria, moderação, exportação CSV/JSON (`RF06`) e testes de acessibilidade. |

---

## 3. Validação Funcional e Aceitação

Além das suítes automatizadas, a validação ponta a ponta da aplicação segue dois mecanismos documentados no portal:

1. **Roteiro de Validação Rápida (*Smoke Test*):** passo a passo reproduzível em [Guia de Desenvolvimento](../comecando/desenvolvimento.md#roteiro-de-validacao-rapida-smoke-test), cobrindo subida dos contêineres, carga SIGAA, autenticação, catálogo de cursos/disciplinas, colaboração/moderação e planejamento semanal (`/minha-grade`).
2. **Diagnóstico e Registro de Correções Funcionais:** rastreamento técnico dos defeitos reproduzidos e das correções aplicadas na estabilização da Release 2, documentados em [Diagnóstico de Bugs](diagnostico_bugs_funcionais.md) e nos registros individuais desta seção (`correcao_*.md`).
