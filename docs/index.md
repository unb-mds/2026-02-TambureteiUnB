# 📊 Tamburetei UnB

Bem-vindo à documentação oficial do **Tamburetei UnB**, uma plataforma aberta, colaborativa e analítica voltada à comunidade acadêmica da **Universidade de Brasília (UnB)**, hospedada sob a organização **OpenDevUnB**.

O projeto é desenvolvido no âmbito da disciplina **Métodos de Desenvolvimento de Software (MDS 2026/2 — FCTE/UnB)** pelo **Grupo G9**, inspirado no ecossistema pioneiro do OpenDevUFCG.

---

## 🎯 Propósito do Sistema

O sistema foi concebido para atender a três necessidades centrais da comunidade universitária:

### 1. Transparência e Métricas Acadêmicas
Ingestão, normalização e disponibilização pública de indicadores históricos da UnB (obtidos via DPO, INEP e LAI):
* **Taxas de aprovação** por disciplina, curso e departamento;
* **Índices de reprovação** por nota e por falta/frequência;
* **Trancamentos e retenção** curricular ao longo dos semestres;
* **Taxas de evasão** institucional por curso;
* **Tempo médio de formação**.

### 2. Hub Colaborativo de Disciplinas (`/cadeiras`)
Centralização de materiais pedagógicos organizados modularmente por matéria (`/cadeiras/:slug`):
* Ementas oficiais, carga horária e créditos;
* Dificuldades comuns e tópicos conceituais críticos;
* Dicas de estudo e metodologias de aprovação;
* Resumos e notas de aula compartilhados (*"leites"*);
* Curadoria de links úteis (playlists no YouTube, livros, repositórios de exercícios);
* Enunciados de avaliações públicas anteriores.

### 3. Crowdsourcing e Experiência Discente ("Já cursei")
Espaço anônimo e seguro para a vivência dos estudantes:
* **Registro de Situação Acadêmica:** O aluno autenticado pode indicar se foi *Aprovado*, *Reprovado por Nota*, *Reprovado por Falta* ou *Trancou* a disciplina, alimentando as estatísticas em tempo real;
* **Comentários Anônimos/Pseudônimos:** Relatos acadêmicos sob *alias*, preservando a privacidade individual e a liberdade de expressão;
* **Votos Úteis (Upvotes):** Avaliação comunitária para destacar os melhores resumos e dicas.

---

## 🗓️ Cronograma e Entregas (Releases)

| Release | Data Limite | Foco Principal | Entregáveis Técnicos |
| :--- | :--- | :--- | :--- |
| **Release 1 (R1)** | Semana 7 — 28/09/2026 | Engenharia de Dados, Infraestrutura & Modelagem | Pipeline ETL conteinerizado em Docker, anonimização LGPD (Privacy by Design), dataset limpo e modelos relacionais no PostgreSQL 17 versionados com Alembic. |
| **Release 2 (R2)** | Semana 15 — 25/11/2026 | Portal Web & Hub Comunitário | Frontend em Next.js (App Router), dashboards analíticos interativos, hub de disciplinas (`/cadeiras/:slug`), moderação de relatos e pipeline CI/CD com SAST. |

---

## 🛠️ Stack Tecnológica

* **Backend:** Python 3.12+, FastAPI (arquitetura assíncrona), Pydantic v2 e SQLAlchemy 2.0.
* **Banco de Dados:** PostgreSQL 17 gerenciado via Docker e migrações versionadas exclusivamente com Alembic (*Database-as-Code*).
* **Frontend:** Next.js (App Router), React, TypeScript e Tailwind CSS.
* **Qualidade & Testes:** Pytest, Mutmut (testes de mutação), Bandit e SonarQube (SAST).
* **Infraestrutura:** Docker e Docker Compose para execução isolada e reprodutível.
