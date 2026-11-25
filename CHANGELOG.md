# Changelog

Todas as mudanças notáveis documentadas por release do projeto **Tamburetei UnB** são registradas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Release-2] - 2026-11-24

Detalhes completos em [docs/releases/Release-2.md](docs/releases/Release-2.md).

### Adicionado
- Implantação oficial em produção no domínio **[tambureteiunb.com.br](https://tambureteiunb.com.br/)** e `https://api.tambureteiunb.com.br` com Docker Compose, Caddy e Cloudflare.
- Hub pedagógico completo por disciplina com gráficos de rosca e histogramas semestrais em barras empilhadas com proteção LGPD ($N \ge 5$).
- Planejador semanal de horários (`/minha-grade`) com resolução de choques, gerador de combinações e exportação em PDF.
- Ecossistema de doação colaborativa de turmas (via texto ou upload de imagem do gráfico de pizza do SIGAA) com curadoria humana, fila de consenso, filtro estrito de turmas concluídas e esteira de moderação.
- Separação entre turmas do período atual e turmas históricas com cards compactos, taxas estratificadas (`Aprovação`, `Reprov. nota`, `Reprov. falta`, `Tranc.`) preservando casas decimais com soma exata de 100%, e ordenação do catálogo priorizando disciplinas com pizzas e históricos.
- Seção Minha Graduação e importação segura do Histórico Escolar do SIGAA no perfil do estudante com cálculo de integralização.
- Links oficiais homologados para a grade curricular do SIGAA em 161 cursos da UnB, pré-requisitos como links navegáveis e link oficial do repositório GitHub no rodapé.
- Backup automatizado não destrutivo (`scripts/backup_prod.sh`), volume persistente `pizzas_data`, documentação técnica de fechamento em `docs/produto/relatorio_final.md`, estratégia de deploy em `docs/engenharia/deploy.md` e novo README em conformidade com projetos de software livre.

---

## [0.11.0] (Sprint 11)

Detalhes completos em [docs/releases/v0.11.0.md](docs/releases/v0.11.0.md).

### Adicionado
- Seção **Minha Graduação** em `/perfil` com grade curricular em 10 períodos, status visual, equivalências da FCTE e cálculo de integralização.
- Planejador semanal de horários (`/minha-grade`) com resolução de choques, gerador automático sem conflitos, rascunhos locais e exportação em PDF.
- Fluxo de recuperação de senha (`POST /auth/esqueci-senha`, `/esqueci-senha`, `/redefinir-senha`) via e-mail SMTP institucional (`tambureteiunb@gmail.com`) e troca de senha no perfil.
- Isolamento e restauração do histórico SIGAA importado vinculado ao usuário autenticado.

### Alterado / Corrigido
- Suporte a múltiplos formatos de notas e menções no parser de Histórico Escolar do SIGAA, ordenação aprimorada do catálogo de disciplinas e prevenção de vazamento de tokens de recuperação no payload público.

---

## [0.10.0] - 2026-11-20

Detalhes completos em [docs/releases/v0.10.0.md](docs/releases/v0.10.0.md).

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
