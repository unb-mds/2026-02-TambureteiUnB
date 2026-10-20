---
name: tamburetei-dev
description: Diretrizes de arquitetura, banco de dados, governança e regras de negócio para desenvolvimento do Tamburetei UnB (MDS 2026/2). Use sempre que for criar ou alterar código no backend FastAPI, modelos SQLAlchemy, migrações Alembic, rotas ou testes.
---

# Skill: Desenvolvimento do Tamburetei UnB

Esta skill instrui agentes de IA a seguirem rigorosamente os padrões técnicos, decisões de arquitetura (ADRs), regras de negócio e portas de qualidade da disciplina de Métodos de Desenvolvimento de Software (MDS 2026/2 — FCTE/UnB).

---

## 🏛️ Diretrizes Arquiteturais Obrigatórias

1. **Separação Estrita de Camadas (Clean Architecture):**
   * `api/`: Apenas roteamento HTTP do FastAPI e validação de entrada/saída com schemas Pydantic v2. Nunca invocar consultas de banco de dados diretamente aqui.
   * `domain/`: Regras de negócio puras (cálculo de taxas de aprovação e evasão, moderação). Não depende de ORM, framework web ou banco.
   * `services/`: Casos de uso e orquestração entre a camada de API e os repositórios.
   * `repositories/`: Consultas SQL e persistência assíncrona via SQLAlchemy 2.0.
   * `models/`: Mapeamento das entidades relacionais no PostgreSQL 17.
   * `pipeline/`: Scripts e jobs ETL para ingestão dos dados abertos (DPO/INEP/LAI).

2. **Decisões Arquiteturais (ADRs):**
   * **Sem Redis/NoSQL (ADR 01):** Proibido adicionar Redis, MongoDB ou filas assíncronas complexas (Celery/RabbitMQ). Usar apenas PostgreSQL 17 com consultas indexadas (latência < 300ms).
   * **Database-as-Code com Alembic (ADR 02):** Proibido executar comandos DDL manuais no banco. Toda evolução de schema deve ocorrer via migrações versionadas do Alembic (`alembic revision --autogenerate`).
   * **PostgreSQL 17 (ADR 03):** SGBD relacional oficial, conteinerizado via Docker.

3. **Privacy by Design e LGPD:**
   * Nunca coletar, armazenar ou expor dados acadêmicos sensíveis dos estudantes (matrícula, CPF, IRA).
   * O cadastro de usuários contém estritamente `nome`, `email` e `password_hash` (hash com bcrypt).
   * Comentários e relatos são exibidos publicamente de forma anônima ou sob pseudônimo (*alias*).
   * Votos de situação acadêmica alimentam exclusivamente os contadores estatísticos da disciplina, sem identificação pública do votante.

---

## 📌 Entidades Canônicas do Banco de Dados

* `usuarios`: id, nome, email, password_hash, role (STUDENT, MODERATOR, ADMIN), is_active, created_at.
* `cursos`: id, codigo_mec, nome, campus, grau, turno, slug.
* `disciplinas`: id, codigo, slug, nome, departamento, creditos, carga_horaria, ementa.
* `cursos_disciplinas`: curso_id, disciplina_id, periodo_sugerido, is_obrigatoria.
* `metricas_academicas`: disciplina_id, ano, semestre, matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos, taxa_aprovacao.
* `situacoes_disciplinas`: usuario_id, disciplina_id, situacao (APROVADO, REPROVADO_NOTA, REPROVADO_FALTA, TRANCOU), updated_at. Constraint: `UNIQUE(usuario_id, disciplina_id)`.
* `conteudos`: id, disciplina_id, usuario_id, titulo, descricao, tipo (LINK_UTIL, RESUMO, PROVA_ANTIGA, DICA), url_origem, status_curadoria (PENDENTE, APROVADO, RECUSADO).
* `comentarios`: id, disciplina_id, usuario_id, autor_alias, topico_dificuldade, conteudo, parent_id, status_moderacao.
* `votos_uteis`: usuario_id, target_type, target_id. Constraint: `UNIQUE(usuario_id, target_type, target_id)`.

---

## ⚖️ Regras de Negócio Críticas (RN)

* **[RN01] Anonimato Discente:** Nenhuma ação pública do estudante expõe dados pessoais nominais.
* **[RN02] Unicidade de Situação na Disciplina:** Cada estudante possui apenas 1 registro ativo por cadeira. Novos registros da mesma matéria atualizam o status anterior.
* **[RN03] Unicidade de Upvote:** Máximo de 1 voto útil por usuário em cada material ou comentário. Repetir o voto desfaz a curtida.
* **[RN04] Proteção a Docentes:** Vedada publicação de juízos depreciativos ou difamatórios contra professores. Foco estritamente pedagógico e conteudista.
* **[RN05] Vedação de Resoluções Ativas:** Proibida a publicação de gabaritos de atividades avaliativas contínuas vigentes. Permitidos apenas enunciados de provas públicas antigas e materiais conceituais.
* **[RN06] Curadoria de Submissões:** Novos materiais entram com `status_curadoria = PENDENTE` e exigem validação de moderador.
* **[RN07] Baixa Amostragem:** Dados históricos com menos de 5 alunos por turma são consolidados no acumulado geral.
* **[RN08] Cálculo de Evasão:** `(total_desligamentos / total_matriculados_ativos) * 100`.

---

## 🎯 Portas de Qualidade da Disciplina (MDS 2026/2)

1. **Cobertura de Código:** Mínimo de **70% de cobertura** de linhas no módulo de domínio (`app/domain/`).
2. **Escore de Mutação:** Mínimo de **50% de mortes** de mutantes nas regras de negócio com Mutmut.
3. **Testes de Sabotagem:** A suíte de testes deve falhar com 100% de eficácia quando falhas forem intencionalmente injetadas no domínio.
4. **Segurança (SAST):** Zero vulnerabilidades críticas ou altas no pipeline (Bandit e SonarQube).
5. **Reprodutibilidade:** Toda a aplicação deve ser executável via `docker compose up`.

---

## 🛠️ Comandos de Referência Rápida

* **Subir contêineres:**
  ```bash
  docker compose up -d --build
  ```
* **Aplicar migrações do banco:**
  ```bash
  docker compose exec backend alembic upgrade head
  ```
* **Gerar nova migração após alterar modelos:**
  ```bash
  docker compose exec backend alembic revision --autogenerate -m "descricao"
  ```
* **Rodar testes unitários com relatório de cobertura:**
  ```bash
  docker compose exec backend pytest tests/unit -v --cov=app/domain --cov-report=term-missing
  ```
* **Rodar testes de mutação:**
  ```bash
  docker compose exec backend mutmut run
  ```
