# Uso de IA e Governança de Agentes — Tamburetei UnB

Este documento descreve como ferramentas de Inteligência Artificial e agentes de codificação são utilizados, padronizados e auditados no desenvolvimento do **Tamburetei UnB** (MDS 2026/2 — FCTE/UnB).

---

## 1. Diretrizes e Regras do Repositório (`AGENTS.md`)

O projeto adota instruções versionadas no próprio repositório (`AGENTS.md`, `PROJECT_CONTEXT.md` e `specs/backend-architecture-spec.md`) para garantir que qualquer código ou documentação gerada com auxílio de IA siga estritamente os padrões da equipe:

* **Arquitetura Limpa Obrigatória:** separação estrita em 4 camadas (`Router -> Service -> Repository -> Model`), além de contratos `Schemas` (Pydantic v2 com `PydanticCustomError` em português) e regras puras em `Domain`.
* **Comunicação Técnica Limpa:** proibição estrita de emojis em código-fonte, commits, Pull Requests, Issues e documentação técnica (`AGENTS.md`).
* **Banco de Dados como Código:** evolução exclusiva via migrações lineares do Alembic sobre PostgreSQL 17, sem ferramentas externas de cache (ADR 01).

---

## 2. Skills Especializadas do Projeto (`skills/`)

O repositório mantém *skills* customizadas para orientar agentes no fluxo de engenharia da disciplina:

| Skill | Caminho | Objetivo Principal |
| :--- | :--- | :--- |
| **Tamburetei Dev** | `skills/tamburetei-dev/SKILL.md` | Regras de negócio (RN01 a RN08), ADRs 01–03, proteção LGPD (RN07) e portas de qualidade do CI. |
| **Tamburetei TDD** | `skills/tamburetei-tdd/SKILL.md` | Fluxo obrigatório de Test-Driven Development (`Red -> Green -> Refactor`) integrado à Clean Architecture e commits atômicos por camada. |

---

## 3. Fluxo de Trabalho Assistido por IA

1. **Especificação e TDD (Fase Red):** os critérios de aceitação da User Story são convertidos primeiro em testes unitários (`tests/unit/`) e de integração (`tests/integration/`).
2. **Implementação por Camada (Fase Green):** geração incremental de domínio, schemas, repositórios, serviços e roteadores 100% declarativos.
3. **Verificação Automatizada (Fase Refactor & CI):**
   * Cobertura mínima de testes automatizados (`>= 70%` via `pytest --cov`);
   * Testes de mutação no domínio (`>= 50%` de mutantes mortos via `mutmut`);
   * Análise estática e segurança (`Ruff`, `Bandit` e `SonarCloud`).
4. **Revisão Humana Obrigatória:** todo Pull Request passa por revisão de código (*Code Review*) de outros integrantes da equipe antes do merge na branch `develop`.
