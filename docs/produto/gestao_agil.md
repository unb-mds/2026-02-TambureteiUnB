# Gestão Ágil, Sprints e Rastreabilidade

Esta página centraliza os artefatos de planejamento ágil, rituais das sprints, atas de reunião e painéis de métricas do **Tamburetei UnB** (MDS 2026/2 — Grupo G9).

---

## 1. Story Map, Backlog e Quadro Ágil

* **Story Map e Protótipo (Figma):** [Template MDS — Grupo 9](https://www.figma.com/board/coZ3FgGpd5amxJxaanwaTr/Template-MDS---Grupo-9?node-id=2128-1592)
* **Changelog e Releases:** [Histórico de Versões (CHANGELOG)](https://github.com/unb-mds/2026-02-TambureteiUnB/blob/develop/CHANGELOG.md) · [Release v0.10.0](../releases/v0.10.0.md) · [Release v0.11.0](../releases/v0.11.0.md)
* **Milestones e Sprints (GitHub):** [Milestones do Repositório](https://github.com/unb-mds/2026-02-TambureteiUnB/milestones)
* **Rastreabilidade de Requisitos e Histórias:** [Requisitos do Sistema](requisitos.md) · Histórias ([Backend](historias_usuario_backend.md) · [Frontend](historias_usuario_frontend.md) · [Banco de Dados](historias_usuario_database.md)) · [Relatório Final (R2)](relatorio_final.md)

---

## 2. Atas de Reunião e Rituais das Sprints (Planning / Review / Alinhamento)

As atas detalhadas de planejamento, fechamento de sprint e alinhamentos técnicos são registradas como Issues oficiais no repositório:

| Data | Sprint / Escopo | Registro (GitHub Issue) | Responsável |
| :--- | :--- | :--- | :--- |
| 03/10/2026 | Sprint 5 — Ata de Reunião | [Issue #84](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/84) | `@thamiresellensa` |
| 10/10/2026 | Sprint 6 — Ata de Reunião | [Issue #87](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/87) | `@thamiresellensa` |
| 17/10/2026 | Sprint 6 — Ata de Reunião | [Issue #102](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/102) | `@lucasssmira` |
| 19/10/2026 | Sprints 6 a 12 — Alinhamento e Planejamento Frontend | [Issue #96](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/96) | `@mariav-07` |
| 02/11/2026 | Fechamento Sprint 7 e Alinhamento Sprint 8 | [Issue #182](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/182) | `@thamiresellensa` |
| 14/11/2026 | Fechamento Sprint 9 e Alinhamento Sprint 10 | [Issue #181](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/181) | `@thamiresellensa` |

---

## 3. Retrospectivas e Melhorias Aplicadas Entre Sprints

A cada fechamento de sprint, o time revisou gargalos técnicos e de processo para ajustar a iteração seguinte:

| Transição de Sprint | Gargalo / Ponto de Atenção Identificado | Melhoria Real Aplicada |
| :--- | :--- | :--- |
| **Sprint 6 -> Sprint 7** | Divergências pontuais entre migrações Alembic e `init.sql`, validações manuais dispersas e falta de padronização de estilo em PRs e documentação. | Implantação do pipeline unificado de CI/CD (`Ruff`, `Bandit`, `Pytest >= 70%`, `Mutmut >= 50%`, `ESLint`, `TypeScript` e Docker Compose), adoção do `AGENTS.md` (sem emojis e Clean Architecture) e da skill `tamburetei-tdd`. |
| **Sprint 7 -> Sprints 8 e 9** | Necessidade de isolar regras puras de domínio (quórum, curadoria e denúncias) da camada HTTP para viabilizar testes de mutação e evitar conflitos concorrentes na moderação. | Consolidação de módulos puros em `backend/app/domain/`, trilha de auditoria na tabela `curadorias`, retenção preventiva automática por limiar (`RN04`) e ampliação de testes unitários de serviços no frontend. |
| **Sprint 9 -> Sprints 10 a 12** | Necessidade de validar acessibilidade semântica, simplificar cartões de turmas e auditar ponta a ponta defeitos de integração antes da entrega final da Release 2. | Entrega de exportação em Dados Abertos (`CSV`/`JSON`) e testes de acessibilidade (`v0.10.0`), diagnóstico reproduzível de bugs funcionais com correções registradas em `docs/qualidade/` e reestruturação completa do portal MkDocs. |

---

## 4. Métricas de Fluxo, Velocity e Commits

* **Fluxo de rastreabilidade:** `Épico -> Feature -> História de Usuário (com critérios de aceitação) -> Issue / Milestone -> Pull Request revisado -> Release`.
* **Cadência de entregas:** após a Release 1 (`v0.1.0` em 28/09/2026), o time manteve ritmo contínuo de releases de sprint (`v0.6.0` em 23/10, `v0.7.0` em 30/10, `v0.8.0` em 06/11, `v0.9.0` em 13/11, `v0.10.0` em 20/11 e `v0.11.0` na Sprint 11) até a implantação em produção na semana da Release 2 (`#267`).
* **Análise de variação de velocity entre sprints:**
    * **Sprints 6 e 7 (maior volume de PRs paralelos):** concentraram entregas estruturais independentes (turmas reais, doações, quórum, upload de materiais, grade curricular e pipeline de CI/CD).
    * **Sprints 8 e 9 (menos PRs, maior densidade técnica por entrega):** entregas verticais completas envolvendo banco, domínio puro, auditoria e telas administrativas (dificuldades na ementa, curadoria com auditoria e Central de Denúncias `RN04`).
    * **Sprints 10 a 12 (consolidação de produto, estabilização e deploy):** foco em dados abertos (`v0.10.0`), acessibilidade, planejador `/minha-grade`, recuperação de senha (`v0.11.0`), triagem por IA local (Ollama), correção de bugs de integração, deploy em produção e documentação final.
* **Curva de Commits e Frequência de Código:** [Insights -> Commits](https://github.com/unb-mds/2026-02-TambureteiUnB/graphs/commit-activity)
* **Contribuições por Integrante:** [Insights -> Contributors](https://github.com/unb-mds/2026-02-TambureteiUnB/graphs/contributors)
* **Histórico de Entregas por Sprint:** [Release v0.6.0](../releases/v0.6.0.md), [Release v0.7.0](../releases/v0.7.0.md), [Release v0.8.0](../releases/v0.8.0.md), [Release v0.9.0](../releases/v0.9.0.md), [Release v0.10.0](../releases/v0.10.0.md) e [Release v0.11.0](../releases/v0.11.0.md).
