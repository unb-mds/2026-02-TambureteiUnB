# Release v0.6.0 — Sprint 6: Listagem de Turmas Reais, Doações Estatísticas e Padronização FCTE

Esta release consolida as entregas da **Sprint 6** do projeto **Tamburetei UnB** (MDS 2026/2 - FCTE/UnB), trazendo a integração de dados reais de turmas, o módulo de doações estatísticas discentes, a padronização institucional e avanços na documentação do sistema.

---

## 🚀 Novas Funcionalidades (Features)

- **Listagem de Turmas Reais:**
  * Integração dos dados reais da API de turmas na página de detalhes da disciplina.
  * Implementação de filtros dinâmicos por turno (Diurno / Noturno) e ordenação por código e ocupação.
  * Componentes `ClassCard` e `CardTurma` com cálculo de ocupação e formatação de horários.
  * Feedback visual com *skeleton screens* (`ClassCardSkeleton`) e tratamento de estados vazios.

- **Módulo de Doação Estatística de Turmas (Já Cursei):**
  * Criação do endpoint `POST /turmas/{turma_id}/doacoes` restrito ao perfil `STUDENT` (requisitos RF06 e RN02).
  * Camada de serviço `DoacaoService` e persistência via `DoacaoRepository` com prevenção de doações duplicadas.
  * Schemas Pydantic v2 (`DoacaoCreate` e `DoacaoResponse`) com mensagens de erro customizadas.
  * Modelo SQLAlchemy `DoacaoEstatistica`, tabela no `init.sql` e migração Alembic `008_create_doacoes_estatisticas_table.py`.

- **Indicadores e Métricas Históricas Reais:**
  * Conexão dos cards de aprovação, reprovação e trancamento da disciplina aos dados históricos reais providos pelo backend.

---

## 🐛 Correções de Bugs (Fixes)

- **Sincronização de Banco de Dados:** Alinhamento do script inicial `init.sql` com as migrações `007` e `008` do Alembic e modelos do SQLAlchemy.
- **Ajustes de UI e Gráficos:** Correção no cálculo de percentuais e escala de proporção dos gráficos SVG analíticos.

---

## 🎨 Melhorias de UI/UX

- **Padronização Institucional FCTE/UnB:** Atualização da nomenclatura institucional de FGA para **FCTE (Faculdade de Ciências e Tecnologias em Engenharia)** em seletores, filtros e telas do sistema.

---

## 📝 Documentação e Testes

- **Dicionário de Dados Relacional:** Adição do mapeamento de tabelas, índices e diagrama ERD (Mermaid) em `docs/banco_de_dados.md`.
- **MkDocs e Qualidade:** Reestruturação da navegação no `mkdocs.yml`, inclusão de roteiro de *smoke test* e testes unitários/integração para o módulo de doações e componentes do frontend.

---

## 👥 Pull Requests e Contribuidores

- **#101:** `feat(doacoes): endpoint e persistência de doação estatística por turma` — @LuisGuilherme67
- **#100:** `feat(turmas): listagem de turmas reais com filtros, ocupação e skeletons` — @thamiresellen
- **#93:** `feat(disciplinas): conecta cards de métricas e base acumulada aos dados reais` — @mariav-07
- **#88:** `docs(database): estrutura dicionário de dados oficial e mapeia débitos técnicos` — @bcaueLPS
- **#85:** `feature(frontend): componentes de turmas e fallback mock de disciplinas` — @thamiresellen
- **#83:** `feature(frontend): padronização institucional FCTE e telas de autenticação` — @thamiresellen
- **#78:** `feat(frontend): integração do fluxo de autenticação e layout base do perfil` — @DeAngelis-G
