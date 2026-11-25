# Relatório Final do Projeto — Tamburetei UnB (Release 2)

Este documento consolida os resultados técnicos, entregas funcionais, métricas de engenharia, processo ágil e lições aprendidas do projeto **Tamburetei UnB** ao encerramento da disciplina **Métodos de Desenvolvimento de Software (MDS 2026/2 — FCTE / Universidade de Brasília)**.

---

## 1. Visão Executiva e Ambiente em Produção

* **Plataforma no Ar (Produção):** **[https://tambureteiunb.com.br/](https://tambureteiunb.com.br/)**
* **API de Produção:** `https://api.tambureteiunb.com.br` (`GET /health` ativo)
* **Portal de Documentação:** **[https://unb-mds.github.io/2026-02-TambureteiUnB/](https://unb-mds.github.io/2026-02-TambureteiUnB/)**
* **Repositório Oficial:** **[github.com/unb-mds/2026-02-TambureteiUnB](https://github.com/unb-mds/2026-02-TambureteiUnB)**

### Problema e Solução Entregue
Estudantes da UnB tradicionalmente planejam sua grade curricular sem visibilidade centralizada de indicadores históricos (aprovação, reprovação, evasão, notas de corte do PAS) e com materiais e relatos dispersos. O **Tamburetei UnB** resolve esse problema oferecendo em uma única plataforma aberta, reprodutível e aderente à **LGPD (*Privacy by Design*)**:

1. **Transparência Analítica:** painéis históricos por disciplina, curso e campus (fontes SIGAA, DPO/UnB, INEP e Cebraspe/PAS), além de exportação de dados abertos em **CSV** e **JSON** (`RF06`).
2. **Hub Colaborativo de Disciplinas (`/disciplinas/[slug]`):** ementas, turmas ofertadas com ocupação real, tópicos de dificuldade, materiais de apoio (PDF/PNG/JPG e links) e comentários sob pseudônimo com respostas encadeadas.
3. **Crowdsourcing, Planejamento e Segurança:** doações estatísticas com motor de consenso por quórum (`QUORUM_MINIMO_DOACOES = 3`), importação de Histórico Escolar SIGAA em memória (`/perfil`), planejador semanal (`/minha-grade`) com detecção de choques e exportação em PDF, além de curadoria humana (`/moderacao`), Central de Denúncias (`RN04`) e triagem híbrida por IA local (`Ollama`).

---

## 2. Consolidação das Entregas (Release 1 e Release 2)

| Marco / Release | Principais Entregáveis Consolidados |
| :--- | :--- |
| **Release 1 (`v0.1.0` — 28/09/2026)** | Pipeline ETL conteinerizado (SIGAA/DPO/INEP), anonimização LGPD (`RN01` e `RN07`), modelagem PostgreSQL 17 versionada com Alembic, autenticação JWT (`RBAC`) e catálogo inicial. |
| **Sprints 6 e 7 (`v0.6.0` e `v0.7.0`)** | Listagem real de turmas e ocupação, doações estatísticas, motor de quórum e `estatisticas_consolidadas`, upload multipart de materiais, grade curricular, taxa de formação por curso e pipeline unificado de CI/CD (`ci.yml`). |
| **Sprints 8 e 9 (`v0.8.0` e `v0.9.0`)** | Painel de dificuldades da ementa, curadoria administrativa com trava concorrente e auditoria (`curadorias`), threads e "Já cursei", Central de Denúncias (`RN04`) e painel `/moderacao`. |
| **Sprints 10 e 11 (`v0.10.0` e `v0.11.0`)** | Série histórica filtrada por intervalo de anos, exportação CSV/JSON (`RF06`), página dedicada de turmas ofertadas, acessibilidade validada, seção *Minha Graduação* com equivalências curriculares, planejador semanal (`/minha-grade`) e recuperação de senha via SMTP. |
| **Estabilização R2 e Deploy (`#267`+)** | Triagem híbrida por IA local (`Ollama`, ADR 08), importação de histórico SIGAA isolada por usuário, diagnóstico e correção de bugs funcionais, portal MkDocs reestruturado e implantação em produção em `tambureteiunb.com.br`. |

---

## 3. Indicadores de Arquitetura, Qualidade e Testes

* **Arquitetura (ADR 01 a ADR 08):** aplicação cliente-servidor desacoplada (`Next.js 16 + React 19` <-> `FastAPI Clean Architecture` <-> `PostgreSQL 17`), com 13 roteadores declarativos, 17+ tabelas de domínio e 1 visão materializada (`mv_evasao_campus`), sem dependência de Redis/NoSQL e com *Database-as-Code* via Alembic.
* **Pipeline de CI/CD e Qualidade Estática:** validação automática em toda PR (`Ruff`, `Bandit -ll`, `ESLint 9`, `tsc --noEmit`, `next build`, subida completa via `docker compose` e `mkdocs build --strict`).
* **Cobertura e Testes Automatizados (medição real em 23/11/2026):**
  * **Backend (`pytest --cov=app`):** **83%** de cobertura geral (`4.838` de `5.805` instruções cobertas — meta do CI: `>= 70%`), com 100% de aprovação nas suítes unitária e de integração.
  * **Testes de Mutação (`mutmut`):** gate ativo exigindo escore mínimo de **50%** nos 7 módulos críticos de domínio e sanitização LGPD.
  * **Frontend (`npm test`):** **180 / 180 testes aprovados** (`0` falhas, `0` pulados), cobrindo serviços HTTP, validações de upload, moderação, exportação CSV/JSON e acessibilidade.

---

## 4. Gestão Ágil, Rastreabilidade e Governança

* **Rastreabilidade Completa:** organização desde o *Story Map* (Figma) passando por épicos, features e histórias de usuário ([Backend](historias_usuario_backend.md), [Frontend](historias_usuario_frontend.md) e [Banco de Dados](historias_usuario_database.md)), rastreados por Issues, Milestones, Pull Requests revisados e Releases.
* **Ritual de Sprints e Retrospectivas:** planejamento e fechamentos registrados em Issues oficiais (`#84`, `#87`, `#96`, `#102`, `#181`, `#182`) e melhorias concretas aplicadas entre sprints, conforme detalhado em [Gestão Ágil e Sprints](gestao_agil.md).
* **Uso Governado de IA (`AGENTS.md` e `skills/`):** diretrizes versionadas garantindo aderência à Clean Architecture, ausência de emojis e revisão humana obrigatória antes de qualquer merge (detalhes em [Uso de IA & Agentes](../ai/ai_usage.md)).

---

## 5. Lições Aprendidas

### Aprendizados Técnicos
1. **Domínio Puro e Clean Architecture na prática:** isolar regras matemáticas e validações em `backend/app/domain/` desacopladas de HTTP e banco permitiu testes unitários instantâneos e viabilizou testes de mutação com `mutmut`.
2. **Database-as-Code e Docker reproduzível:** manter migrações lineares no Alembic e validar `alembic upgrade head` no CI eliminou divergências de esquema entre os sete integrantes da equipe.
3. **Privacidade desde o desenho (*Privacy by Design*):** processar o PDF do histórico SIGAA apenas em memória e executar triagem automática localmente com `Ollama` reduziu a superfície de risco e simplificou a conformidade com a LGPD.

### Aprendizados de Equipe, Processo e Ferramentas
1. **Automação antecipada de qualidade:** consolidar o pipeline de CI/CD unificado na Sprint 7 padronizou a revisão de código, evitou regressões entre entregas paralelas e reduziu o atrito de integração entre frontend e backend.
2. **Padrões explícitos para humanos e agentes:** documentar convenções no `AGENTS.md`, `CONTRIBUTING.md` e nas skills TDD manteve consistência arquitetural mesmo em desenvolvimento acelerado com apoio de IA.

### O que a Equipe Faria Diferente em Próximos Ciclos
1. **Deploy contínuo mais cedo:** colocar o ambiente de homologação/produção no ar ainda na metade da Release 2 para antecipar ajustes de CORS, proxy reverso, SMTP e variáveis de build (`NEXT_PUBLIC_API_URL`) antes da semana final.
2. **Estimativa quantitativa desde a Sprint 1:** registrar pontuação padronizada (*story points*) em todas as Issues desde o início para acompanhar métricas numéricas de *velocity* e *burndown* sprint a sprint.

---

## 6. Conclusão, Impacto e Próximos Passos

O **Tamburetei UnB** atingiu o escopo proposto para as Releases 1 e 2, entregando uma aplicação em produção ([tambureteiunb.com.br](https://tambureteiunb.com.br/)) que combina dados históricos oficiais da UnB com colaboração comunitária segura e transparência arquitetural.

### Próximos Passos Recomendados
* Ampliar a ingestão periódica de ofertas semestrais do SIGAA e novos cursos de outros campi da UnB.
* Aprofundar a cobertura de testes ponta a ponta automatizados no navegador e monitorar métricas de uso real em produção.
* Habilitar a integração contínua do SonarCloud após configuração da chave `SONAR_TOKEN` na organização e evoluir o modelo de triagem multimodal para anexos em imagem.
