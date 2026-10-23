# 🎓 Tamburetei UnB — Release v0.6.0 (Sprint 6)

A equipe do projeto **Tamburetei UnB** (MDS 2026/2 — FCTE/UnB, Grupo G9) tem o prazer de anunciar o lançamento da versão **`v0.6.0`**, marcando o encerramento das entregas da **Sprint 6**.

Esta release consolida avanços cruciais na integração completa entre frontend e backend com dados reais de turmas e disciplinas, implementação do fluxo colaborativo de doações estatísticas (crowdsourcing discente), estruturação oficial do dicionário de dados relacional e alinhamento de identidade institucional à FCTE.

---

## 📋 Sumário Executivo

| Métrica / Atributo | Detalhes |
| :--- | :--- |
| **Versão (SemVer)** | `v0.6.0` (Minor release referente à Sprint 6) |
| **Versão Anterior** | `v0.1.0` (Sprint 5 / Release 1 — 28/09/2026) |
| **Data da Release** | 23/10/2026 |
| **Commit Base** | `784fe67` (branch `correcao-email-thamires`) / `8ddd9e6` (branch `develop`) |
| **Pull Requests Integrados** | 6 PRs (#83, #85, #88, #93, #100, #101) |
| **Cobertura / Testes** | 100% de sucesso na suíte de testes de integração e unitários |

---

## 🚀 Novas Funcionalidades (Features)

* **Listagem e Integração de Turmas Reais (`PR #100`, `PR #85`):**
  * Integração dos dados reais de turmas da API FastAPI diretamente na página de detalhes da disciplina (`/disciplinas/[slug]`).
  * Implementação de filtro por turnos (Diurno, Noturno) e ordenação dinâmica por vagas e código da turma.
  * Criação dos componentes `ClassCard` e `CardTurma` com horários formatados, docentes responsáveis e cálculo seguro da taxa de ocupação das turmas.
  * Implementação de estado de carregamento com *skeleton loaders* (`ClassCardSkeleton`) e tratamento de estados vazios (*empty state*) para disciplinas sem turmas cadastradas.

* **Módulo de Doação Estatística de Turmas (`PR #101`):**
  * Implementação da rota `POST /turmas/{turma_id}/doacoes` restrita a usuários discentes autenticados (`role: STUDENT`), em atendimento ao **RF06** e **RN02** (Crowdsourcing "Já Cursei").
  * Criação do serviço `DoacaoService` com validações de regras de negócio: garantia de existência da turma, intervalo válido de taxas, checagem e bloqueio de doações duplicadas do mesmo usuário para a mesma turma/semestre.
  * Implementação da persistência assíncrona no PostgreSQL via `DoacaoRepository`.
  * Criação dos schemas Pydantic v2 `DoacaoCreate` e `DoacaoResponse` com mensagens customizadas e humanizadas em português (`PydanticCustomError`).
  * Criação do modelo SQLAlchemy `DoacaoEstatistica`, tabela canônica `doacoes_estatisticas` no banco de dados e migração Alembic `008_create_doacoes_estatisticas_table.py`.

* **Conexão de Indicadores e Métricas Reais (`PR #93`):**
  * Conexão dos cards de métricas (taxa de aprovação, reprovação por nota, reprovação por falta e trancamentos) e do acumulado histórico aos dados analíticos reais providos pelo backend.
  * Adição de `metrica_consolidada` às interfaces TypeScript de modelo de disciplina.

---

## 🐛 Correções de Bugs (Fixes)

* **Sincronização de Baseline do Banco de Dados (`PR #88`):**
  * Alinhamento e sincronização completa do script inicial `init.sql` com o baseline de migrações do Alembic (versão `007` e `008`) e os modelos SQLAlchemy, prevenindo divergências de inicialização em ambientes Docker limpos.
* **Cálculo Percentual e Proporções em Gráficos (`PR #83`):**
  * Correção do cálculo de proporção e distribuição percentual nos gráficos do dashboard analítico.
  * Ajuste de layout e escala em elementos visuais SVG na página de estatísticas da disciplina.

---

## 🎨 Melhorias de UI/UX

* **Padronização Institucional FCTE/UnB (`PR #83`):**
  * Atualização da nomenclatura institucional e textual de FGA para **FCTE (Faculdade de Ciências e Tecnologias em Engenharia)**, refletindo a designação oficial da UnB.
  * Atualização dos badges de campus, filtros de busca por unidade acadêmica e textos informativos na página inicial e no catálogo de cursos.
* **Componentização e Responsividade (`PR #100`, `PR #85`):**
  * Desacoplamento e modularização dos componentes de exibição de turmas no frontend para melhor manutenção e reusabilidade.
  * Animações de loading shimmer nos *skeletons* durante o carregamento de dados assíncronos.
  * Estilização de badges informativos de turno, ocupação e status de oferta de vagas com Tailwind CSS.

---

## 📝 Documentação e Testes

* **Dicionário de Dados Relacional Oficial (`PR #88`):**
  * Publicação do documento `docs/banco_de_dados.md`, detalhando todas as tabelas, tipos de dados, chaves primárias, chaves estrangeiras, restrições (`UNIQUE`, `CHECK`) e índices de alta performance do PostgreSQL 17.
  * Inclusão de Diagrama Entidade-Relacionamento (ERD) renderizado em Mermaid.
  * Documentação e mapeamento de débitos técnicos identificados no modelo de dados.
* **Reestruturação e Navegação do MkDocs (`PR #88`):**
  * Reorganização hierárquica das páginas de documentação por categorias: Visão, Requisitos, Arquitetura, Engenharia de Dados, Histórias de Usuário e Guia do Desenvolvedor.
  * Correção da porta de execução local do MkDocs para `8001` no guia do desenvolvedor.
  * Adição de roteiro padronizado de *smoke test* para verificação rápida de sanidade do sistema.
* **Testes Automatizados de Qualidade (`PR #101`, `PR #85`):**
  * Adição de suíte de testes unitários para os schemas e validadores de doação (`tests/unit/test_doacao_schemas.py`).
  * Adição de testes de integração para o ciclo completo da rota de doações com banco de dados (`tests/integration/test_doacao_service.py`), cobrindo fluxos de sucesso, erro 404 para turma inexistente, erro 409 para duplicidade e validação de permissões.
  * Criação de testes de frontend e dados de validação para o componente `CardTurma`.
* **Guias e Instruções do Frontend (`PR #83`, `PR #85`):**
  * Restauração e enriquecimento do `frontend/README.md` com instruções completas de inicialização e documentação dos componentes de interface em português.

---

## 🔗 Rastreabilidade: Pull Requests e Issues Fechadas

| PR | Título da Alteração | Área | Autor(a) | Status |
| :---: | :--- | :---: | :--- | :---: |
| [**#101**](https://github.com/unb-mds/G9-2026-2/pull/101) | `feat(doacoes): endpoint e persistência de doação estatística por turma` | Backend / DB | [@LuisGuilherme67](https://github.com/LuisGuilherme67) | Merged ✅ |
| [**#100**](https://github.com/unb-mds/G9-2026-2/pull/100) | `feat(turmas): listagem de turmas reais com filtros, ocupação e skeletons` | Frontend | [@thamiresellen](https://github.com/thamiresellen) | Merged ✅ |
| [**#93**](https://github.com/unb-mds/G9-2026-2/pull/93) | `feat(disciplinas): conecta cards de métricas e base acumulada aos dados reais` | Frontend / Integração | [@mariav-07](https://github.com/mariav-07) | Merged ✅ |
| [**#88**](https://github.com/unb-mds/G9-2026-2/pull/88) | `docs(database): estrutura dicionário de dados oficial e mapeia débitos técnicos` | DB / Docs | [@bcaueLPS](https://github.com/bcaueLPS) | Merged ✅ |
| [**#85**](https://github.com/unb-mds/G9-2026-2/pull/85) | `feature(frontend): componentes de turmas e fallback mock de disciplinas` | Frontend | [@thamiresellen](https://github.com/thamiresellen) | Merged ✅ |
| [**#83**](https://github.com/unb-mds/G9-2026-2/pull/83) | `feature(frontend): padronização institucional FCTE e telas de autenticação` | Frontend / UI | [@thamiresellen](https://github.com/thamiresellen) | Merged ✅ |

---

## 👥 Contribuidores da Sprint 6

Agradecimentos especiais a todos os membros do Grupo G9 que tornaram esta entrega possível:

* **Thamires Ellen Souza** ([@thamiresellen](https://github.com/thamiresellen))
* **Luis Guilherme de Almeida Costa** ([@LuisGuilherme67](https://github.com/LuisGuilherme67))
* **Maria Vitória** ([@mariav-07](https://github.com/mariav-07))
* **Caue Oliveira** ([@bcaueLPS](https://github.com/bcaueLPS))

---

## 🛠️ Guia de Verificação e Execução

### Execução com Docker Compose:
```bash
# Clone e entre no repositório
git clone https://github.com/unb-mds/G9-2026-2.git
cd G9-2026-2

# Configure o ambiente
cp .env.example .env

# Construa e suba os contêineres
docker compose up -d --build

# Execute as migrações mais recentes (incluindo migração 008)
docker compose exec backend alembic upgrade head

# Execute a suíte de testes de backend
docker compose exec backend pytest -v
```

### Execução do Frontend:
```bash
cd frontend
npm install
npm run lint
npm run dev
# Acesse: http://localhost:3000
```
