# Changelog

Todas as mudanças notáveis documentadas por release do projeto **Tamburetei UnB** são registradas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.10.0] - 2026-11-20

Detalhes completos na [Release v0.10.0 no GitHub](https://github.com/unb-mds/2026-02-TambureteiUnB/releases/tag/v0.10.0).

### Adicionado
- Consulta de estatísticas históricas de turmas filtradas por intervalo de anos e consolidação no fluxo de detalhe das disciplinas.
- Exportação de dados abertos públicos em CSV e JSON integrada à visualização das estatísticas acadêmicas (`RF06`).
- Página dedicada de turmas ofertadas por disciplina com paginação e cartões simplificados.
- Validação de acessibilidade para leitores de tela e conformidade semântica em formulários e tabelas.

### Corrigido
- Ocultação do banner de acesso visitante para usuários autenticados.
- Exibição da ocupação real de matriculados e ajuste visual nos cartões de turmas.

---

## [0.9.0] - 2026-11-13

Detalhes completos em [docs/releases/v0.9.0.md](docs/releases/v0.9.0.md).

### Adicionado
- Central de Denúncias comunitárias (`RN04`), tabela `denuncias` (migração `011_denuncias`) e retenção preventiva automática por limiar.
- Painel de ações em `/moderacao` (`DenunciaModerationCard` e `ModerationActionModal`).

---

## [0.8.0] - 2026-11-06

Detalhes completos em [docs/releases/v0.8.0.md](docs/releases/v0.8.0.md).

### Adicionado
- Painel de dificuldades e tópicos críticos da ementa (`DificuldadesPanel`) em `/disciplinas/[slug]`.
- Fluxo de curadoria administrativa de arquivos com auditoria transacional (`curadorias`).
- Respostas encadeadas (*threads*) em comentários e contador interativo "Já cursei".

---

## [0.7.0] - 2026-10-30

Detalhes completos em [docs/releases/v0.7.0.md](docs/releases/v0.7.0.md).

### Adicionado
- Upload multipart de materiais (`MaterialModal`) e hub por categoria (`MateriaisApoio`).
- Motor de consenso por quórum (`QUORUM_MINIMO_DOACOES = 3`) e tabela `estatisticas_consolidadas` (migração `012`).
- Grade curricular por curso e taxa de formação (`GET /dashboard/cursos/{identificador}/formacao`).
- Pipeline unificado de CI/CD (`Ruff`, `Bandit`, `Pytest >= 70%`, `Mutmut >= 50%`, `ESLint`, `TypeScript`, `Docker Compose`).

---

## [0.6.0] - 2026-10-23

Detalhes completos em [docs/releases/v0.6.0.md](docs/releases/v0.6.0.md).

### Adicionado
- Listagem real de turmas com filtros por turno, ordenação por ocupação e endpoint de doação estatística (`POST /turmas/{turma_id}/doacoes`).
- Conexão dos indicadores históricos reais de aprovação, reprovação e trancamento.

### Alterado
- Padronização institucional para **FCTE/UnB** nas telas e filtros.

---

## [0.1.0] - 2026-09-28 (Release 1)

### Adicionado
- Pipeline ETL conteinerizado (SIGAA, DPO/INEP e Dados Abertos) com anonimização LGPD (`RN01` e `RN07`).
- Modelagem relacional inicial no PostgreSQL 17 versionada com Alembic, autenticação JWT (`RBAC`) e catálogo de cursos e disciplinas.
