# Dicionário de Dados — Modelo Relacional

Este documento descreve o modelo relacional ativo do **Tamburetei UnB** (PostgreSQL 17), sincronizado integralmente com o script `init.sql` e a cadeia oficial de migrações do Alembic (revisão `015_moderacao_ia` — Head). O esquema possui **17 tabelas de domínio, 1 visão materializada (`mv_evasao_campus`)** e a tabela de controle `alembic_version`.

---

## Mapa de Relacionamentos do Modelo Relacional

Para facilitar a visualização clara e objetiva sem distorções de escala em diferentes resoluções, as dependências relacionais do banco estão estruturadas por módulos de domínio:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MÓDULO DE USUÁRIOS E SEGURANÇA                                 │
│                                                                                                  │
│   [ usuarios ] (UUID) ──(1:N)──► [ situacoes_disciplinas ] (Registro de aprovação/trancamento)   │
│                       ──(1:N)──► [ doacoes_estatisticas ]  (Doações de índices de turmas SIGAA)  │
│                       ──(1:N)──► [ conteudos ]             (Submissão de materiais e links)      │
│                       ──(1:N)──► [ curadorias ]            (Auditoria de curadoria RN06)       │
│                       ──(1:N)──► [ comentarios ]           (Relatos discentes sob pseudônimo)    │
│                       ──(1:N)──► [ votos_uteis ]           (Upvotes de relevância da comunidade) │
│                       ──(1:N)──► [ denuncias ]             (Sinalizações comunitárias RN04)      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MÓDULO DE ESTRUTURA ACADÊMICA                                  │
│                                                                                                  │
│   [ cursos ] ───────(1:N)──► [ cursos_disciplinas ] (N:N Matriz Curricular)                      │
│                                           ▲                                                      │
│   [ disciplinas ] ──(1:N)─────────────────┘                                                      │
│          │                                                                                       │
│          ├──(1:N)──► [ turmas ] ◄──(N:N)── [ professores ] (via turmas_professores)              │
│          │               ├──(1:N)──► [ doacoes_estatisticas ]      (Motor de Quórum US 3.1.1)    │
│          │               └──(1:N)──► [ estatisticas_consolidadas ] (Quórum validado US 3.2.2)    │
│          │                                                                                       │
│          ├──(1:N)──► [ metricas_academicas ]       (Séries históricas por ano/semestre do DPO)   │
│          ├──(1:1)──► [ metricas_consolidadas ]     (Totalizador acumulado e supressão LGPD RN07) │
│          ├──(1:N)──► [ estatisticas_consolidadas ] (Métricas oficiais consolidadas por quórum)   │
│          ├──(1:N)──► [ situacoes_disciplinas ]     (Histórico crowdsourced de estudantes)        │
│          ├──(1:N)──► [ conteudos ]                 (Materiais, arquivos privados e links)        │
│          │               ├──(1:1)──► [ curadorias ] (Auditoria imutável RN06)                     │
│          │               └──(1:N)──► [ denuncias ]  (Denúncias sobre materiais)                   │
│          └──(1:N)──► [ comentarios ]               (Discussões e dúvidas com threads aninhadas)  │
│                          └──(1:N)──► [ denuncias ]  (Denúncias sobre relatos RN04)               │
│                                                                                                  │
│   [ cursos ] ───────(1:N)──► [ metricas_cursos ]   (Indicadores de evasão e fluxo INEP)          │
│                                     │                                                            │
│                                     └──► [ mv_evasao_campus ] (Materialized View de evasão)      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Matriz de Cardinalidade e Chaves Estrangeiras

| Tabela Origem | Tabela Destino | Relação | Coluna FK | Política de Deleção | Propósito |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `cursos` | `cursos_disciplinas` | **1 : N** | `curso_id` | `CASCADE` | Vincula a disciplina à grade curricular do curso |
| `disciplinas` | `cursos_disciplinas` | **1 : N** | `disciplina_id` | `CASCADE` | Define periodicidade e natureza (obrigatória/optativa) |
| `disciplinas` | `turmas` | **1 : N** | `disciplina_id` | `CASCADE` | Ofertas semestrais concretas da disciplina |
| `turmas` | `turmas_professores` | **1 : N** | `turma_id` | `CASCADE` | Associação N:N entre turmas e professores |
| `professores` | `turmas_professores` | **1 : N** | `professor_id` | `CASCADE` | Suporte a múltiplos docentes na mesma turma |
| `disciplinas` | `metricas_academicas` | **1 : N** | `disciplina_id` | `CASCADE` | Séries históricas de aprovação/reprovação (DPO/INEP) |
| `disciplinas` | `metricas_consolidadas` | **1 : 1** | `disciplina_id` | `CASCADE` | Consolidado geral com proteção contra reidentificação LGPD |
| `cursos` | `metricas_cursos` | **1 : N** | `curso_id` | `CASCADE` | Séries históricas de vagas, ingressantes e evasão por curso |
| `turmas` | `estatisticas_consolidadas` | **1 : N** | `turma_id` | `CASCADE` | Estatísticas validadas pelo Motor de Quórum por turma e semestre |
| `disciplinas` | `estatisticas_consolidadas` | **1 : N** | `disciplina_id` | `CASCADE` | Consulta analítica rápida por disciplina e semestre |
| `usuarios` | `situacoes_disciplinas` | **1 : N** | `usuario_id` | `CASCADE` | Registro anônimo de "Já cursei essa matéria" |
| `disciplinas` | `situacoes_disciplinas` | **1 : N** | `disciplina_id` | `CASCADE` | Totalizador de experiência discente na disciplina |
| `turmas` | `doacoes_estatisticas` | **1 : N** | `turma_id` | `CASCADE` | Doações colaborativas de índices de turma extraídos do SIGAA |
| `usuarios` | `doacoes_estatisticas` | **1 : N** | `usuario_id` | `CASCADE` | Vínculo de autoria e prevenção de doações duplicadas |
| `disciplinas` | `conteudos` | **1 : N** | `disciplina_id` | `CASCADE` | Repositório colaborativo de materiais e links |
| `turmas` | `conteudos` | **1 : N** | `turma_id` | `SET NULL` | Vínculo opcional de material a uma turma específica |
| `usuarios` | `conteudos` | **1 : N** | `usuario_id` | `SET NULL` | Preserva material didático se a conta for excluída |
| `conteudos` | `curadorias` | **1 : 1** | `conteudo_id` | `RESTRICT` | Registro imutável de auditoria da decisão sobre o arquivo |
| `usuarios` | `curadorias` | **1 : N** | `moderador_id` | `SET NULL` | Moderador humano autor da decisão (nulo quando `perfil_moderador = 'IA'`) |
| `disciplinas` | `comentarios` | **1 : N** | `disciplina_id` | `CASCADE` | Mural de discussões da disciplina |
| `turmas` | `comentarios` | **1 : N** | `turma_id` | `SET NULL` | Contextualização opcional do relato por turma |
| `usuarios` | `comentarios` | **1 : N** | `usuario_id` | `CASCADE` | Auditoria interna (não exibido publicamente) |
| `comentarios` | `comentarios` | **1 : N** | `parent_id` | `CASCADE` | Hierarquia em árvore para respostas aninhadas (threads) |
| `usuarios` | `votos_uteis` | **1 : N** | `usuario_id` | `CASCADE` | Upvotes únicos por usuário em conteúdos ou comentários |
| `comentarios` | `denuncias` | **1 : N** | `comentario_id` | `CASCADE` | Denúncias vinculadas a um relato da comunidade |
| `conteudos` | `denuncias` | **1 : N** | `conteudo_id` | `CASCADE` | Denúncias vinculadas a um material de apoio |
| `usuarios` | `denuncias` | **1 : N** | `usuario_id` | `CASCADE` | Estudante autor da sinalização (oculto nas listagens RN01) |
| `usuarios` | `denuncias` | **1 : N** | `moderador_id` | `SET NULL` | Moderador responsável pela resolução da denúncia |

---

## 1. Usuários e Segurança

### `usuarios`
Contas de acesso à plataforma. Em estrita conformidade com o princípio de *Privacy by Design* e a LGPD, **não armazena matrícula, CPF, IRA ou histórico acadêmico discente**.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID | **PK**, default `gen_random_uuid()` | Identificador não sequencial para prevenção de enumeração |
| `nome` | VARCHAR(100) | NOT NULL | Nome de exibição do usuário |
| `email` | VARCHAR(150) | NOT NULL, UNIQUE | E-mail institucional ou de acesso |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash criptográfico bcrypt da senha |
| `role` | VARCHAR(20) | NOT NULL, default `'STUDENT'`, CHECK (`STUDENT`, `MODERATOR`, `ADMIN`) | Nível de privilégio e controle de acesso (RBAC) |
| `is_active` | BOOLEAN | NOT NULL, default `TRUE` | Controle de desativação lógica da conta |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Carimbo de data/hora de criação do registro |

---

## 2. Estrutura Acadêmica e Curricular

### `cursos`
Metadados institucionais dos cursos de graduação da Universidade de Brasília.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | SERIAL | **PK** | Identificador sequencial do curso |
| `codigo_mec` | VARCHAR(20) | UNIQUE | Código oficial do curso registrado no MEC |
| `nome` | VARCHAR(150) | NOT NULL | Nome oficial do curso (ex.: *Engenharia de Software*) |
| `campus` | VARCHAR(100) | NOT NULL, default `'FCTE - Gama'` | Campus universitário de oferta |
| `grau` | VARCHAR(50) | default `'Bacharelado'` | Grau acadêmico conferido |
| `turno` | VARCHAR(50) | default `'Diurno'` | Turno predominante das aulas |
| `slug` | VARCHAR(150) | NOT NULL, UNIQUE | Identificador amigável para rotas (`/cursos/:slug`) |
| `modalidade` | VARCHAR(50) | — | Modalidade de ensino (ex.: Presencial / EaD) |
| `area_geral` | VARCHAR(100) | — | Grande área de conhecimento do curso |
| `area_especifica` | VARCHAR(100) | — | Área de conhecimento específica |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de inserção no sistema |

### `disciplinas`
Cadastro canônico das disciplinas ofertadas.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | SERIAL | **PK** | Identificador sequencial da disciplina |
| `codigo` | VARCHAR(30) | — | Código acadêmico SIGAA (ex.: `FGA0138`) |
| `slug` | VARCHAR(150) | NOT NULL, UNIQUE | Identificador amigável de rota (`/disciplinas/:slug`) |
| `nome` | VARCHAR(150) | NOT NULL | Nome da disciplina |
| `departamento` | VARCHAR(255) | — | Nome do departamento ou faculdade responsável |
| `creditos` | INT | CHECK (> 0) | Quantidade total de créditos |
| `carga_horaria` | INT | CHECK (> 0) | Carga horária total em horas |
| `ementa` | TEXT | — | Ementa oficial da disciplina |
| `pre_requisitos` | TEXT | — | Expressão formal de pré-requisitos (ex.: `FGA0158 OU MAT0025`) |
| `co_requisitos` | TEXT | — | Co-requisitos acadêmicos simultâneos |
| `equivalencias` | TEXT | — | Disciplinas equivalentes aceitas na matriz |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de inserção |

### `cursos_disciplinas`
Tabela associativa **N:N** que define a matriz curricular de cada curso.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | SERIAL | **PK** | Identificador da relação |
| `curso_id` | INT | NOT NULL, **FK** → `cursos(id)` ON DELETE CASCADE | Identificador do curso |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Identificador da disciplina vinculada |
| `periodo_sugerido` | INT | CHECK (> 0) | Semestre ideal de cursagem (nulo para optativas livres) |
| `is_obrigatoria` | BOOLEAN | NOT NULL, default `TRUE` | Flag booleana de obrigatoriedade |
| `natureza` | VARCHAR(50) | NOT NULL, default `'Obrigatoria'` | Classificação curricular (*Obrigatoria*, *Optativa*, etc.) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de registro |

**Restrição de Unicidade:** `UNIQUE (curso_id, disciplina_id)` impede vínculos duplicados da mesma disciplina no mesmo curso.

---

## 3. Corpo Docente e Turmas

### `professores`
Cadastro de docentes da instituição.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | SERIAL | **PK** | Identificador sequencial do docente |
| `nome` | VARCHAR(150) | NOT NULL | Nome completo do professor |
| `departamento` | VARCHAR(255) | — | Lotação departamental do docente |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de inserção |

### `turmas`
Oferta semestral de uma disciplina.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | SERIAL | **PK** | Identificador sequencial da turma |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina ofertada |
| `codigo_turma` | VARCHAR(10) | NOT NULL | Código identificador da turma (ex.: `01`, `A`) |
| `semestre` | VARCHAR(10) | NOT NULL | Semestre letivo da oferta (ex.: `2026.2`) |
| `horario` | VARCHAR(255) | — | Código de horário SIGAA (ex.: `35M12` ou descritivo) |
| `local` | VARCHAR(255) | — | Local de realização das aulas (ex.: `UED - Sala 102`) |
| `capacidade` | INT | — | Número total de vagas disponibilizadas |
| `matriculados` | INT | — | Número total de discentes matriculados |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de cadastro |

**Restrição de Unicidade:** `UNIQUE (disciplina_id, codigo_turma, semestre)` assegura que a mesma turma não seja duplicada no mesmo semestre.

### `turmas_professores`
Tabela associativa **N:N** que conecta turmas aos professores responsáveis, suportando co-docência.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `turma_id` | INT | **PK composta**, **FK** → `turmas(id)` ON DELETE CASCADE | Turma lecionada |
| `professor_id` | INT | **PK composta**, **FK** → `professores(id)` ON DELETE CASCADE | Professor associado |

---

## 4. Métricas Acadêmicas e Séries Históricas

### `metricas_academicas`
Dados analíticos históricos agregados por disciplina, ano e semestre (fontes: DPO / INEP / LAI).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador do registro histórico |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina analisada |
| `ano` | INT | NOT NULL | Ano letivo de referência |
| `semestre` | INT | NOT NULL, CHECK (1, 2) | Semestre letivo (1 ou 2) |
| `matriculados` | INT | NOT NULL, default 0 | Quantidade total de matriculados na amostra |
| `aprovados` | INT | NOT NULL, default 0 | Total de aprovações |
| `reprovados_nota` | INT | NOT NULL, default 0 | Reprovações por nota inferior à média |
| `reprovados_falta` | INT | NOT NULL, default 0 | Reprovações por insuficiência de frequência |
| `trancamentos` | INT | NOT NULL, default 0 | Quantidade de trancamentos da matéria |
| `taxa_aprovacao` | NUMERIC(5,2) | — | Índice percentual consolidado de aprovação (ex.: `78.50`) |
| `amostragem_suprimida_lgpd` | BOOLEAN | NOT NULL, default `FALSE` | Flag que indica se a amostra foi ocultada para proteção discente (RN07) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de inserção |

**Restrição de Unicidade:** `UNIQUE (disciplina_id, ano, semestre)`.

### `metricas_consolidadas`
Totalizadores acumulados de desempenho acadêmico por disciplina em toda a sua série histórica.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador da métrica consolidada |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE, **UNIQUE** | Disciplina associada |
| `matriculados` | INT | NOT NULL, default 0 | Somatório total de matrículas históricas |
| `aprovados` | INT | NOT NULL, default 0 | Somatório total de aprovações históricas |
| `reprovados_nota` | INT | NOT NULL, default 0 | Somatório total de reprovações por nota |
| `reprovados_falta` | INT | NOT NULL, default 0 | Somatório total de reprovações por falta |
| `trancamentos` | INT | NOT NULL, default 0 | Somatório total de trancamentos |
| `taxa_aprovacao_acumulada` | NUMERIC(5,2) | — | Média ponderada histórica de aprovação |
| `total_turmas_suprimidas` | INT | NOT NULL, default 0 | Quantidade de turmas com amostragem suprimida por LGPD |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data e hora do último cálculo de consolidação |

### `metricas_cursos`
Indicadores macro de fluxo, evasão e sucesso dos cursos de graduação (dados INEP / Censo da Educação Superior).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador do registro do curso |
| `curso_id` | INT | NOT NULL, **FK** → `cursos(id)` ON DELETE CASCADE | Curso de graduação |
| `ano` | INT | NOT NULL | Ano de referência do Censo |
| `vagas_totais` | INT | NOT NULL, default 0 | Total de vagas ofertadas no vestibular e SISU |
| `inscritos_total` | INT | NOT NULL, default 0 | Total de inscritos concorrendo às vagas |
| `ingressantes` | INT | NOT NULL, default 0 | Total de novos alunos que ingressaram |
| `matriculados` | INT | NOT NULL, default 0 | Total de alunos ativos matriculados |
| `concluintes` | INT | NOT NULL, default 0 | Total de discentes formados no ano |
| `trancados` | INT | NOT NULL, default 0 | Total de matrículas com trancamento ativo |
| `desvinculados` | INT | NOT NULL, default 0 | Total de abandonos/desligamentos formais |
| `taxa_sucesso` | NUMERIC(5,2) | — | Taxa percentual de conclusão do curso |
| `taxa_evasao` | NUMERIC(5,2) | — | Taxa percentual de evasão discente anual |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de inserção |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de atualização |

**Restrição de Unicidade:** `UNIQUE (curso_id, ano)`.

### `estatisticas_consolidadas`
Métricas oficiais consolidadas pelo Motor de Consenso/Quórum a partir das doações discentes (US 3.2.2 — migrações `012_estatisticas_consolidadas` e `013_estat_disciplina_semestre`).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador sequencial da estatística consolidada |
| `turma_id` | INT | NOT NULL, **FK** → `turmas(id)` ON DELETE CASCADE | Turma consolidada |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina vinculada (indexada para busca por matéria e semestre) |
| `semestre_referencia` | VARCHAR(10) | NOT NULL | Semestre letivo no padrão canônico UnB (ex.: `'2026.1'`) |
| `taxa_aprovacao` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual oficial consolidado de aprovação |
| `taxa_reprovacao_nota` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual oficial consolidado de reprovação por nota |
| `taxa_reprovacao_falta` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual oficial consolidado de reprovação por falta |
| `taxa_trancamento` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual oficial consolidado de trancamento |
| `status` | VARCHAR(20) | NOT NULL, default `'VALIDADO'`, CHECK (`VALIDADO`) | Estado oficial da consolidação por quórum |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de consolidação inicial |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data da última atualização de consenso |

**Restrições e Índices:** `UNIQUE (turma_id, semestre_referencia)`, `CHECK ((taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00)` e índice composto `ix_estatisticas_disciplina_semestre (disciplina_id, semestre_referencia)`.

### `mv_evasao_campus` (Materialized View)
Visão materializada para leitura rápida de indicadores agregados de evasão institucional por campus e ano letivo (`GET /dashboard/evasao-campus` — US 6.1.1, migração `014_mv_evasao_campus`).

| Coluna | Tipo | Origem / Agregação | Descrição |
|---|---|---|---|
| `campus` | VARCHAR(100) | `COALESCE(NULLIF(TRIM(c.campus), ''), 'Não informado')` | Nome normalizado do campus universitário |
| `ano` | INT | `mc.ano` | Ano de referência da série histórica |
| `total_cursos` | BIGINT | `COUNT(DISTINCT c.id)` | Quantidade de cursos com métricas no campus e ano |
| `matriculados` | BIGINT | `COALESCE(SUM(mc.matriculados), 0)` | Somatório de estudantes matriculados no campus |
| `desvinculados` | BIGINT | `COALESCE(SUM(mc.desvinculados), 0)` | Somatório de estudantes desvinculados no campus |

**Índice Único:** `ux_mv_evasao_campus_campus_ano ON mv_evasao_campus (campus, ano)` permite atualização concorrente sem bloqueio de leitura (`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_evasao_campus`).

---

## 5. Colaboração Discente e Moderação

### `situacoes_disciplinas`
Módulo crowdsourced que permite ao estudante declarar sua experiência com a matéria ("Já cursei"). Alimenta unicamente dados agregados.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador |
| `usuario_id` | UUID | NOT NULL, **FK** → `usuarios(id)` ON DELETE CASCADE | Estudante autor |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina avaliada |
| `situacao` | VARCHAR(20) | NOT NULL, CHECK (`APROVADO`, `REPROVADO_NOTA`, `REPROVADO_FALTA`, `TRANCOU`) | Situação declarada pelo estudante |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data da última atualização |

**Restrição de Unicidade:** `UNIQUE (usuario_id, disciplina_id)` assegura exatamente um registro por aluno em cada matéria (RN02).

### `doacoes_estatisticas`
Registro de submissões colaborativas de estatísticas de turmas extraídas do SIGAA por estudantes autenticados (Épico 3 — US 3.1.1). Alimenta o Motor de Consenso/Quórum antes da consolidação oficial.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador sequencial da doação |
| `turma_id` | INT | NOT NULL, **FK** → `turmas(id)` ON DELETE CASCADE | Turma referenciada na doação |
| `usuario_id` | UUID | NOT NULL, **FK** → `usuarios(id)` ON DELETE CASCADE | Estudante autenticado autor da doação |
| `semestre_referencia` | VARCHAR(10) | NOT NULL | Semestre letivo no padrão canônico UnB (ex.: `'2026.1'`) |
| `taxa_aprovacao` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual de aprovação reportado |
| `taxa_reprovacao_nota` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual de reprovação por nota reportado |
| `taxa_reprovacao_falta` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual de reprovação por falta reportado |
| `taxa_trancamento` | NUMERIC(5,2) | NOT NULL, CHECK (`0 <= valor <= 100`) | Percentual de trancamento reportado |
| `status` | VARCHAR(20) | NOT NULL, default `'PENDENTE'`, CHECK (`PENDENTE`, `CONSOLIDADA`, `DESCARTADA`) | Ciclo de vida no Motor de Quórum |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Carimbo de data e hora do envio (`data_envio`) |

**Restrições de Integridade:** `UNIQUE (usuario_id, turma_id, semestre_referencia)` impede doações duplicadas do mesmo aluno para a mesma turma e semestre; `CHECK ((taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00)` garante fechamento percentual exato.

### `amostras_historico`
Registros individuais anonimizados extraídos em memória de Históricos Escolares (PDF) do SIGAA via `POST /perfil/importar-historico` (`backend/app/models/amostra_historico.py`), utilizados para consolidar estatísticas reais sem persistir dados nominais ou `usuario_id`.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | **PK** | Identificador sequencial da amostra |
| `dedup_hash` | VARCHAR(64) | NOT NULL, UNIQUE | Hash SHA-256 irreversível (com `SECRET_KEY`) para impedir contagem duplicada |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina cursada na amostra |
| `turma_id` | INT | **FK** → `turmas(id)` ON DELETE SET NULL | Turma correspondente (quando resolvida ou criada) |
| `codigo_turma` | VARCHAR(10) | NOT NULL | Código normalizado da turma |
| `semestre` | VARCHAR(10) | NOT NULL | Semestre cursado (ex.: `'2026.1'`) |
| `desfecho` | VARCHAR(20) | NOT NULL, CHECK (`APR`, `REP_NOTA`, `REP_FALTA`, `TRANC`) | Resultado acadêmico normalizado |
| `mencao` | VARCHAR(5) | CHECK (`SS`, `MS`, `MM`, `MI`, `II`, `SR`), nullable | Menção extraída quando aplicável |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Carimbo de registro da amostra |

> **Nota de esquema:** o modelo ORM já integra a aplicação em `backend/app/models/amostra_historico.py` (criado após o baseline `015_moderacao_ia` do `init.sql`).

### `conteudos`
Repositório colaborativo unificado de materiais didáticos: resumos, links externos, provas anteriores, dicas de estudo e uploads de arquivos privados (`tipo = 'ARQUIVO'`, migração `009_arquivos_conteudos`).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador do material |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina vinculada |
| `turma_id` | INT | **FK** → `turmas(id)` ON DELETE SET NULL | Turma opcional de referência |
| `usuario_id` | UUID | **FK** → `usuarios(id)` ON DELETE SET NULL | Autor do envio (preservado em caso de exclusão da conta) |
| `titulo` | VARCHAR(200) | NOT NULL | Título descritivo do material |
| `descricao` | TEXT | — | Detalhes adicionais sobre o conteúdo |
| `tipo` | VARCHAR(30) | NOT NULL, CHECK (`LINK_UTIL`, `RESUMO`, `PROVA_ANTIGA`, `DICA`, `ARQUIVO`) | Categoria acadêmica ou upload binário privado |
| `url_origem` | TEXT | Nullable para `ARQUIVO` | Link para visualização externa (obrigatório quando `tipo <> 'ARQUIVO'`) |
| `caminho_arquivo` | VARCHAR(64) | UNIQUE, nullable | Nome UUID seguro no volume privado (obrigatório quando `tipo = 'ARQUIVO'`) |
| `formato` | VARCHAR(3) | CHECK (`pdf`, `png`, `jpg`), nullable | Extensão validada por MIME e assinatura binária |
| `tamanho_bytes` | INT | CHECK (`> 0`), nullable | Tamanho do arquivo em bytes (limite de 5 MiB) |
| `status_moderacao` | VARCHAR(20) | CHECK (`ativo`, `em_analise`, `bloqueado`, `excluido`), nullable | Estado técnico do arquivo no armazenamento privado |
| `semestre` | VARCHAR(10) | — | Semestre de aplicação ou confecção |
| `status_curadoria` | VARCHAR(20) | NOT NULL, default `'PENDENTE'`, CHECK (`PENDENTE`, `APROVADO`, `RECUSADO`) | Status no fluxo de curadoria (RN06) |
| `motivo_moderacao` | TEXT | — | Parecer sintético da IA ou justificativa de recusa/escalonamento |
| `confianca_ia` | DOUBLE PRECISION | CHECK (`0 <= valor <= 1`) | Grau de confiança atribuído na triagem automática do Ollama |
| `moderado_por` | VARCHAR(20) | CHECK (`IA`, `MODERATOR`, `ADMIN`) | Perfil responsável pela decisão de moderação |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de submissão |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de alteração de curadoria |

### `curadorias`
Auditoria transacional imutável das decisões de aprovação ou recusa sobre materiais submetidos (RN06 — migrações `010_curadorias` e `015_moderacao_ia`).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador sequencial do registro de auditoria |
| `conteudo_id` | BIGINT | NOT NULL, UNIQUE, **FK** → `conteudos(id)` ON DELETE RESTRICT | Material avaliado (garante decisão única via `SELECT FOR UPDATE`) |
| `moderador_id` | UUID | **FK** → `usuarios(id)` ON DELETE SET NULL | Identificador do moderador humano (`NULL` quando `perfil_moderador = 'IA'`) |
| `perfil_moderador` | VARCHAR(20) | NOT NULL, CHECK (`MODERATOR`, `ADMIN`, `IA`) | Perfil que efetuou a decisão no momento da curadoria |
| `status_anterior` | VARCHAR(20) | NOT NULL, CHECK (`PENDENTE`) | Estado anterior exigido antes da deliberação |
| `status_novo` | VARCHAR(20) | NOT NULL, CHECK (`APROVADO`, `RECUSADO`) | Resultado final da curadoria |
| `justificativa` | TEXT | CHECK (`<= 1000` caracteres) | Justificativa da decisão (obrigatória quando `status_novo = 'RECUSADO'`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Carimbo de data e hora da decisão |

### `comentarios`
Relatos discentes e discussões acadêmicas sobre matérias e turmas, exibidos sob pseudônimo.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador do comentário |
| `disciplina_id` | INT | NOT NULL, **FK** → `disciplinas(id)` ON DELETE CASCADE | Disciplina comentada |
| `turma_id` | INT | **FK** → `turmas(id)` ON DELETE SET NULL | Turma vinculada (opcional) |
| `usuario_id` | UUID | NOT NULL, **FK** → `usuarios(id)` ON DELETE CASCADE | Identificador do autor real (oculto no frontend) |
| `autor_alias` | VARCHAR(50) | NOT NULL, default `'Estudante Anônimo'` | Pseudônimo público exibido aos leitores (RN01) |
| `topico_dificuldade` | VARCHAR(150) | — | Classificação do tópico de maior desafio |
| `conteudo` | TEXT | NOT NULL | Texto do comentário |
| `parent_id` | BIGINT | **FK** → `comentarios(id)` ON DELETE CASCADE | Comentário pai para respostas aninhadas em árvore |
| `status_moderacao` | VARCHAR(20) | NOT NULL, default `'PENDENTE'`, CHECK (`PUBLICADO`, `PENDENTE`, `OCULTO`) | Estado no ciclo de moderação híbrida (RN06) |
| `motivo_moderacao` | TEXT | — | Parecer sintético da IA ou justificativa de ocultação/escalonamento |
| `confianca_ia` | DOUBLE PRECISION | CHECK (`0 <= valor <= 1`) | Grau de confiança atribuído na triagem automática do Ollama |
| `moderado_por` | VARCHAR(20) | CHECK (`IA`, `MODERATOR`, `ADMIN`) | Perfil responsável pela decisão de moderação |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data de postagem |

### `votos_uteis`
Mecanismo de avaliação da relevância de conteúdos e comentários por *upvotes*.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador do voto |
| `usuario_id` | UUID | NOT NULL, **FK** → `usuarios(id)` ON DELETE CASCADE | Usuário votante |
| `target_type` | VARCHAR(20) | NOT NULL, CHECK (`CONTEUDO`, `COMENTARIO`) | Tipo do elemento avaliado |
| `target_id` | BIGINT | NOT NULL | Identificador do conteúdo ou comentário votado |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Carimbo do voto |

**Restrição de Unicidade:** `UNIQUE (usuario_id, target_type, target_id)` impede votos duplicados no mesmo item pelo mesmo usuário (RN03).

### `denuncias`
Registro de sinalizações comunitárias sobre comentários/relatos ou materiais de apoio (US 5.3.1 e US 5.3.2 — Central de Denúncias RN04).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGSERIAL | **PK** | Identificador sequencial da denúncia |
| `comentario_id` | BIGINT | **FK** → `comentarios(id)` ON DELETE CASCADE | Comentário denunciado (mutuamente exclusivo com `conteudo_id`) |
| `conteudo_id` | BIGINT | **FK** → `conteudos(id)` ON DELETE CASCADE | Material denunciado (mutuamente exclusivo com `comentario_id`) |
| `usuario_id` | UUID | NOT NULL, **FK** → `usuarios(id)` ON DELETE CASCADE | Estudante autor da denúncia (oculto nas listagens para preservar RN01) |
| `categoria` | VARCHAR(40) | NOT NULL, default `'OFENSA_DOCENTE'`, CHECK (`OFENSA_DOCENTE`, `CONTEUDO_IMPROPRIO`, `GABARITO_ATIVO`, `SPAM`, `OUTRO`) | Categoria de enquadramento da denúncia |
| `motivo` | TEXT | NOT NULL, CHECK (`5 <= length <= 1000`) | Descrição objetiva do motivo reportado |
| `status` | VARCHAR(20) | NOT NULL, default `'PENDENTE'`, CHECK (`PENDENTE`, `DESCARTADA`, `PROCEDENTE`) | Estado da denúncia no fluxo de moderação |
| `moderador_id` | UUID | **FK** → `usuarios(id)` ON DELETE SET NULL | Moderador ou administrador responsável pela decisão |
| `perfil_moderador` | VARCHAR(20) | — | Perfil administrativo no momento da decisão |
| `justificativa_decisao` | TEXT | CHECK (`<= 1000`) | Observação ou justificativa registrada na decisão |
| `resolved_at` | TIMESTAMPTZ | — | Data e hora da resolução |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `NOW()` | Data e hora do envio da denúncia |

**Restrições de Integridade:** `CHECK ((comentario_id IS NOT NULL AND conteudo_id IS NULL) OR (comentario_id IS NULL AND conteudo_id IS NOT NULL))` garante alvo único; `UNIQUE (usuario_id, comentario_id)` e `UNIQUE (usuario_id, conteudo_id)` impedem denúncias duplicadas pelo mesmo usuário.

---

## 6. Governança e Controle de Migrações (Database-as-Code)

### `alembic_version`
Tabela interna utilizada pelo motor do Alembic para controle estrito de migrações em conformidade com o princípio de *Database-as-Code* (ADR 02).

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `version_num` | VARCHAR(32) | **PK** | Identificador alfanumérico da revisão ativa (`015_moderacao_ia`) |

### Histórico da Linha de Base (Baseline Unificado)

O script `init.sql` e as migrações versionadas do Alembic encontram-se **100% sincronizados no baseline `015_moderacao_ia` (Head)**:

| Revisão | Identificador Alembic | Responsabilidade Técnica | Status |
| :---: | :--- | :--- | :---: |
| **001** | `initial_schema` | Criação das tabelas fundamentais de usuários, disciplinas, cursos e turmas | Incorporado |
| **002** | `add_amostragem_suprimida_lgpd` | Adição da flag de supressão de pequenas amostragens discentes (LGPD / RN07) | Incorporado |
| **003** | `add_turma_ocupacao_and_metricas_consolidadas` | Campos de capacidade/matrícula em turmas e tabela `metricas_consolidadas` | Incorporado |
| **004** | `widen_turma_horario_and_local` | Expansão dos campos de texto de horários e salas para 255 caracteres | Incorporado |
| **005** | `widen_departamento_columns` | Expansão das colunas de departamento em disciplinas e docentes para 255 caracteres | Incorporado |
| **006** | `add_requisitos_and_natureza` | Adição de pré/co-requisitos e equivalências em disciplinas e natureza em cursos | Incorporado |
| **007** | `add_metricas_cursos` | Adição de metadados em cursos e tabela `metricas_cursos` para dados do Censo | Incorporado |
| **008** | `add_doacoes_estatisticas` | Criação da tabela `doacoes_estatisticas` para coleta colaborativa de índices de turmas | Incorporado |
| **009** | `009_arquivos_conteudos` | Extensão da tabela `conteudos` para armazenamento privado de arquivos submetidos (`ARQUIVO`) | Incorporado |
| **010** | `010_curadorias` | Criação da tabela `curadorias` para auditoria das decisões sobre materiais | Incorporado |
| **011** | `011_denuncias` | Criação da tabela `denuncias` para a Central de Denúncias (RN04) e Painel de Ações | Incorporado |
| **012** | `012_estatisticas_consolidadas` | Criação da tabela `estatisticas_consolidadas` para métricas oficiais consolidadas | Incorporado |
| **013** | `013_estat_disciplina_semestre` | Adição de `disciplina_id` e índice composto em `estatisticas_consolidadas` | Incorporado |
| **014** | `014_mv_evasao_campus` | Criação da visão materializada `mv_evasao_campus` para evasão agregada por campus | Incorporado |
| **015** | `015_moderacao_ia` | Adição de `motivo_moderacao`, `confianca_ia` e `moderado_por` em `conteudos` e `comentarios` e suporte a `perfil_moderador = 'IA'` em `curadorias` | **HEAD (Ativo)** |
