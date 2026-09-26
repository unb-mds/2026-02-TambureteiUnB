## Épico 1: Modelagem de Usuários e Segurança de Acesso (Database)

### Feature 1.1: Persistência de Contas e Perfis

#### User Story 1.1.1: Estruturação da tabela de usuários com UUID e hash de credenciais
Eu, como Engenheiro de Banco de Dados, desejo modelar e versionar a tabela `usuarios`, a fim de armazenar credenciais de forma segura e em estrita conformidade com a LGPD (Privacy by Design).

**Nessa issue deve ser feito:**
- Criar a tabela `usuarios` no PostgreSQL 17 com chave primária UUID (`gen_random_uuid()`)
- Definir colunas: `id` (UUID PK), `nome` (VARCHAR 100), `email` (VARCHAR 150), `password_hash` (VARCHAR 255), `role` (VARCHAR 20), `is_active` (BOOLEAN) e `created_at` (TIMESTAMPTZ)
- Criar índice único no campo `email` (`ix_usuarios_email`)
- Adicionar constraint CHECK garantindo valores permitidos para `role`: `'STUDENT'`, `'MODERATOR'`, `'ADMIN'`
- Versionar a tabela na migração inicial do Alembic

**Critérios de aceitação:**
- Impedir e-mails duplicados através da restrição UNIQUE no banco
- Garantir a geração automática de UUID na criação de novos registros
- Não conter colunas para matrícula, CPF ou IRA, garantindo a privacidade discente

---

## Épico 2: Estrutura Curricular e Catálogo (Database)

### Feature 2.1: Modelagem de Cursos, Disciplinas e Matrizes

#### User Story 2.1.1: Estruturação das tabelas de cursos e disciplinas com slugs amigáveis
Eu, como Engenheiro de Banco de Dados, desejo modelar as tabelas `cursos` e `disciplinas`, a fim de persistir os metadados acadêmicos da UnB com suporte a consultas rápidas e URLs amigáveis.

**Nessa issue deve ser feito:**
- Criar tabela `cursos`: `id` (SERIAL PK), `codigo_mec` (VARCHAR 20 UNIQUE), `nome` (VARCHAR 150), `campus` (VARCHAR 100), `grau` (VARCHAR 50), `turno` (VARCHAR 50), `slug` (VARCHAR 150 UNIQUE) e `created_at`
- Criar tabela `disciplinas`: `id` (SERIAL PK), `codigo` (VARCHAR 30), `slug` (VARCHAR 150 UNIQUE), `nome` (VARCHAR 150), `departamento` (VARCHAR 100), `creditos` (INT), `carga_horaria` (INT), `ementa` (TEXT) e `created_at`
- Criar índices nos campos `slug` e `codigo_mec` da tabela `cursos`, e nos campos `slug` e `codigo` da tabela `disciplinas`
- Garantir suporte a textos longos de ementa em Markdown utilizando o mecanismo nativo TOAST do PostgreSQL

**Critérios de aceitação:**
- Garantir a unicidade dos slugs para suporte às rotas `/cadeiras/:slug`
- Impedir registros com valores nulos nos campos obrigatórios (`nome` e `slug`)
- Otimizar as buscas por código acadêmico através de índices dedicados

#### User Story 2.1.2: Modelagem da matriz curricular associativa (cursos_disciplinas)
Depende de: US 2.1.1

Eu, como Engenheiro de Banco de Dados, desejo modelar a tabela intermediária `cursos_disciplinas`, a fim de mapear o fluxo curricular associando matérias a cursos com período sugerido e obrigatoriedade.

**Nessa issue deve ser feito:**
- Criar a tabela `cursos_disciplinas`: `id` (SERIAL PK), `curso_id` (FK `cursos.id`), `disciplina_id` (FK `disciplinas.id`), `periodo_sugerido` (INT) e `is_obrigatoria` (BOOLEAN)
- Configurar foreign keys com regra `ON DELETE CASCADE` para ambas as tabelas pai
- Criar constraint de unicidade composta: `UNIQUE(curso_id, disciplina_id)`
- Criar índices nas chaves estrangeiras `curso_id` e `disciplina_id` para agilizar joins

**Critérios de aceitação:**
- Impedir a duplicação do vínculo entre a mesma matéria e curso
- Permitir valor nulo no campo `periodo_sugerido` para contemplar matérias optativas livres
- Remover automaticamente os vínculos curriculares caso um curso ou disciplina seja excluído

---

## Épico 3: Indicadores Analíticos e Séries Históricas (Database)

### Feature 3.1: Fato Analítico de Desempenho Histórico (DPO/INEP)

#### User Story 3.1.1: Estruturação da tabela de métricas acadêmicas com índices temporais
Depende de: US 2.1.1

Eu, como Engenheiro de Dados, desejo modelar a tabela fato `metricas_academicas`, a fim de persistir os indicadores históricos agregados da UnB por disciplina e semestre com alta velocidade de leitura.

**Nessa issue deve ser feito:**
- Criar tabela `metricas_academicas`: `id` (BIGSERIAL PK), `disciplina_id` (FK `disciplinas.id` ON DELETE CASCADE), `ano` (INT), `semestre` (INT), `matriculados` (INT), `aprovados` (INT), `reprovados_nota` (INT), `reprovados_falta` (INT), `trancamentos` (INT) e `taxa_aprovacao` (NUMERIC(5,2))
- Adicionar constraint CHECK garantindo valores válidos para semestre (1 ou 2)
- Criar constraint de unicidade: `UNIQUE(disciplina_id, ano, semestre)`
- Criar índice composto em `(disciplina_id, ano)` para otimizar filtros por intervalo temporal

**Critérios de aceitação:**
- Impedir duplicidade de métricas para a mesma disciplina no mesmo ano e semestre
- Garantir que consultas analíticas por intervalo de anos respondam em menos de 300 ms
- Garantir que a exclusão de uma disciplina remova em cascata suas métricas históricas
- Aplicar a regra RNF02/RN07 de consolidação em nível de consulta pública para turmas com menos de 5 estudantes, preservando anonimização e conformidade com LGPD

---

## Épico 4: Crowdsourcing e Experiência Discente (Database)

### Feature 4.1: Persistência do Módulo "Já cursei"

#### User Story 4.1.1: Estruturação da tabela de situações discentes com garantia de unicidade
Depende de: US 1.1.1, US 2.1.1

Eu, como Engenheiro de Banco de Dados, desejo modelar a tabela `situacoes_disciplinas`, a fim de armazenar a situação do estudante na matéria garantindo a regra de voto único por disciplina.

**Nessa issue deve ser feito:**
- Criar tabela `situacoes_disciplinas`: `id` (BIGSERIAL PK), `usuario_id` (FK `usuarios.id` ON DELETE CASCADE), `disciplina_id` (FK `disciplinas.id` ON DELETE CASCADE), `situacao` (VARCHAR 20) e `updated_at` (TIMESTAMPTZ)
- Adicionar constraint CHECK restringindo os valores de situação para: `'APROVADO'`, `'REPROVADO_NOTA'`, `'REPROVADO_FALTA'` e `'TRANCOU'`
- Criar constraint de unicidade: `UNIQUE(usuario_id, disciplina_id)`
- Criar índice na coluna `disciplina_id` para acelerar os cálculos de contagem agregada da matéria

**Critérios de aceitação:**
- Garantir a nível de banco que um aluno só possa ter no máximo um registro ativo por disciplina
- Impedir a inserção de strings ou estados inválidos fora das 4 situações padronizadas
- Suportar agregação anônima instantânea dos votos para exibição na página da disciplina

---

## Épico 5: Repositório Colaborativo e Moderação (Database)

### Feature 5.1: Tabelas de Conteúdos, Comentários e Upvotes

#### User Story 5.1.1: Estruturação da tabela de conteúdos com controle de curadoria
Depende de: US 1.1.1, US 2.1.1

Eu, como Engenheiro de Banco de Dados, desejo modelar a tabela `conteudos`, a fim de persistir materiais de estudo e registrar seu ciclo de aprovação na moderação.

**Nessa issue deve ser feito:**
- Criar tabela `conteudos`: `id` (BIGSERIAL PK), `disciplina_id` (FK `disciplinas.id` ON DELETE CASCADE), `usuario_id` (FK `usuarios.id` ON DELETE SET NULL), `titulo` (VARCHAR 200), `descricao` (TEXT), `tipo` (VARCHAR 30), `url_origem` (TEXT nullable), `semestre` (VARCHAR 10), `status_curadoria` (VARCHAR 20) e carimbos de data
- Adicionar constraint CHECK para os tipos aceitos: `'LINK_UTIL'`, `'RESUMO'`, `'PROVA_ANTIGA'`, `'DICA'`
- Adicionar constraint CHECK para os status de curadoria: `'PENDENTE'`, `'APROVADO'`, `'RECUSADO'`, com default `'PENDENTE'`
- Criar índice composto em `(disciplina_id, tipo, status_curadoria)` para agilizar a listagem de materiais públicos

**Critérios de aceitação:**
- Toda nova submissão em `conteudos` deve nascer com o status `PENDENTE`; arquivos em `materiais` seguem a US 5.2 do backend
- Preservar os materiais na base mesmo se o autor excluir a conta, tornando `usuario_id` nulo (`ON DELETE SET NULL`)
- Permitir filtragem imediata apenas de materiais aprovados nas consultas públicas

#### User Story 5.1.2: Estruturação da tabela de comentários com auto-relacionamento em árvore
Depende de: US 1.1.1, US 2.1.1

Eu, como Engenheiro de Banco de Dados, desejo modelar a tabela `comentarios`, a fim de possibilitar discussões sob pseudônimo e respostas aninhadas (threads).

**Nessa issue deve ser feito:**
- Criar tabela `comentarios`: `id` (BIGSERIAL PK), `disciplina_id` (FK `disciplinas.id` ON DELETE CASCADE), `usuario_id` (FK `usuarios.id` ON DELETE SET NULL), `autor_alias` (VARCHAR 50 default 'Estudante Anônimo'), `topico_dificuldade` (VARCHAR 150), `conteudo` (TEXT), `parent_id` (BIGINT), `created_at` (TIMESTAMPTZ) e `status_moderacao` (VARCHAR 20)
- Configurar chave estrangeira auto-referencial em `parent_id` apontando para `comentarios.id` com `ON DELETE CASCADE`
- Adicionar constraint CHECK para os status de moderação: `'PUBLICADO'`, `'PENDENTE'`, `'OCULTO'`
- Criar índices nas colunas `disciplina_id` e `parent_id`

**Critérios de aceitação:**
- Suportar hierarquia de respostas em árvore através da coluna `parent_id`
- Garantir que a exclusão de um comentário pai remova automaticamente suas respostas vinculadas
- Permitir ocultar comentários denunciados alterando o status para `OCULTO` sem quebrar a integridade

#### User Story 5.1.3: Estruturação da tabela de votos úteis (upvotes)
Depende de: US 1.1.1

Eu, como Engenheiro de Banco de Dados, desejo modelar a tabela `votos_uteis`, a fim de computar a relevância de materiais e comentários impedindo votos duplicados.

**Nessa issue deve ser feito:**
- Criar tabela `votos_uteis`: `id` (BIGSERIAL PK), `usuario_id` (FK `usuarios.id` ON DELETE CASCADE), `target_type` (VARCHAR 20), `target_id` (BIGINT) e `created_at`
- Adicionar constraint CHECK restringindo os alvos: `target_type IN ('CONTEUDO', 'COMENTARIO')`
- Criar constraint de unicidade: `UNIQUE(usuario_id, target_type, target_id)`
- Criar índice na combinação `(target_type, target_id)` para acelerar consultas de contagem de upvotes

**Critérios de aceitação:**
- Impedir que o mesmo usuário registre mais de um voto útil no mesmo material ou comentário
- Remover em cascata os votos atribuídos caso a conta do usuário seja excluída

---

## Épico 6: Governança e Automação (Database-as-Code)

### Feature 6.1: Controle de Migrações com Alembic e Carga Inicial

#### User Story 6.1.1: Automação do esquema relacional e carga inicial no Docker
Eu, como Engenheiro de Banco de Dados, desejo versionar o esquema em migrações do Alembic e disponibilizar o script de carga inicial, a fim de garantir a reprodutibilidade integral do banco no contêiner Docker.

**Nessa issue deve ser feito:**
- Configurar o arquivo `alembic.ini` e o runner `alembic/env.py` mapeando `Base.metadata`
- Gerar o arquivo de migração versionada inicial `001_initial_schema.py` com as 9 tabelas e seus índices
- Criar o script `init.sql` com as definições DDL e inserção de dados de semente (seeds) da UnB FCTE Gama
- Configurar volume no `docker-compose.yml` montando o script em `/docker-entrypoint-initdb.d/init.sql`

**Critérios de aceitação:**
- Subir o contêiner do PostgreSQL 17 com todas as 9 tabelas e dados de teste criados automaticamente
- Executar `alembic upgrade head` sem erros de sintaxe ou conflito de tipos
- Possibilitar reverter todo o esquema de forma limpa via `alembic downgrade base`
## Arquivos de apoio — Feature 5.2 do backend

Os binários ficam no volume privado `materiais_data`. A tabela `materiais` armazena `id`, `usuario_id` (FK opcional), `disciplina_id` (FK obrigatória), `titulo`, `caminho_arquivo` (chave única), `formato`, `tamanho_bytes`, `status_moderacao` e `created_at`. O estado inicial é `ativo`. Esta entidade não substitui `conteudos` nem herda sua fila de curadoria. Consulte [os contratos da Feature 5.2](feature_5_2_materiais.md).
