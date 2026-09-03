PROJECT_CONTEXT — TAMBURETEI UnB
================================

1. VISÃO GERAL E PROPÓSITO
--------------------------

O Tamburetei UnB é uma plataforma aberta, colaborativa e analítica voltada à
comunidade acadêmica da Universidade de Brasília (UnB), hospedada sob a
organização OpenDevUnB.

O projeto faz parte do escopo da disciplina Métodos de Desenvolvimento de
Software (MDS 2026/2 — FCTE/UnB) e é inspirado no ecossistema do OpenDevUFCG.

O sistema atende a três pilares centrais dos estudantes:

1.1. Transparência e métricas acadêmicas

Ingestão, agregação e disponibilização de dados analíticos históricos sobre:
- taxas de aprovação;
- reprovação por nota;
- reprovação por falta;
- trancamentos;
- evasão;
- tempo médio de formação.

Os dados históricos são obtidos por meio do DPO, do INEP e da Lei de Acesso à
Informação (LAI).

1.2. Hub colaborativo de disciplinas (/cadeiras)

Centralização de recursos de apoio aos estudantes em páginas modulares
(/cadeiras/:slug), incluindo:
- ementas oficiais, carga horária e créditos;
- dificuldades comuns e relatos da comunidade;
- dicas práticas de estudo;
- resumos de conteúdos ("leites");
- curadoria de links úteis (playlists, livros, repositórios);
- enunciados de avaliações públicas anteriores.

1.3. Crowdsourcing e experiência estudantil ("Já cursei")

Mapeamento colaborativo da vivência discente:
- Registro anônimo de situação acadêmica por disciplina (aprovado, reprovado
  por nota, reprovado por falta ou trancado);
- Votação de relevância (upvotes) em dicas e materiais compartilhados;
- Comentários e discussões públicas sob pseudônimo (alias).


2. ESCOPO DAS ENTREGAS — RELEASES MDS 2026/2
---------------------------------------------

2.1. Release 1 (R1)
Prazo: Semana 7 — 28/09/2026
Foco: Engenharia de Dados, Infraestrutura e Modelagem

Entregáveis técnicos:
- Pipeline de ingestão e normalização de dados do DPO, INEP e Dados Abertos
  executado em containers Docker.
- Tratamento e agregação de dados em conformidade com a LGPD (Privacy by Design).
- Dataset limpo e documentado, com metadados e especificação OpenAPI.
- Modelos relacionais no PostgreSQL 17, versionados exclusivamente por migrações
  Alembic (Database-as-Code).

2.2. Release 2 (R2)
Prazo: Semana 15 — 25/11/2026
Foco: Portal Web, Hub Comunitário e Colaboração

Entregáveis técnicos:
- Frontend em Next.js (App Router) e React integrado à API pública FastAPI.
- Dashboards analíticos interativos com filtros temporais e taxas acadêmicas.
- Hub modular de disciplinas (/cadeiras e /cadeiras/:slug).
- Fluxo de colaboração: submissão de materiais, registro de situação discente,
  comentários anônimos e fila de moderação/curadoria.
- Deploy em nuvem com pipeline de CI/CD aprovado e SAST sem vulnerabilidades.


3. STACK TECNOLÓGICA E DECISÕES DE ARQUITETURA (ADR)
----------------------------------------------------

3.1. Frontend
- Next.js (App Router);
- React;
- TypeScript;
- Tailwind CSS.

3.2. Backend
- Python 3.12 ou superior;
- FastAPI (arquitetura assíncrona);
- Pydantic v2 para validação e serialização de dados;
- Documentação OpenAPI/Swagger nativa.

3.3. Banco de dados
- PostgreSQL 17, executado via Docker Compose;
- SQLAlchemy como ORM assíncrono;
- Alembic para controle de migrações e evolução do esquema (Database-as-Code).

Decisão arquitetural (ADR): Redis e MongoDB foram explicitamente descartados
para evitar sobre-engenharia e complexidade desnecessária no CI/CD e na infra.
O PostgreSQL 17, com índices adequados, atende com folga a leituras analíticas
em menos de 300 ms.

3.4. Infraestrutura
- Docker e Docker Compose;
- Serviços isolados: db (PostgreSQL 17), backend (FastAPI) e frontend (Next.js).

3.5. Qualidade e testes
- Pytest para testes unitários e de integração;
- Mutmut para testes de mutação;
- Bandit e SonarQube para análise estática de segurança (SAST).


4. ESPECIFICAÇÃO DE REQUISITOS
------------------------------

4.1. Requisitos Funcionais (RF)

- [RF01] Cadastro e Autenticação Simples: O sistema deve permitir o cadastro de
  usuários apenas com Nome, E-mail e Senha. Não serão solicitados nem
  armazenados dados institucionais sensíveis (como matrícula ou CPF).
- [RF02] Gestão de Sessão: Autenticação stateless via JWT com expiração segura.
- [RF03] Controle de Acesso por Perfil:
  * Visitante (sem login): Visualiza livremente dashboards, ementas, links,
    resumos, estatísticas e comentários.
  * Estudante (autenticado): Pode registrar sua situação na disciplina, postar
    comentários sob alias, submeter materiais/links e votar (upvote).
  * Moderador/Admin: Analisa e aprova/recusa materiais submetidos e modera
    comentários denunciados.
- [RF04] Catálogo e Busca de Cadeiras: Listagem curricular navegável por curso,
  departamento e período sugerido, com busca por código ou nome.
- [RF05] Painel Analítico da Disciplina: Gráficos de aprovação, reprovação
  (por nota e por falta) e trancamento por ano/semestre com filtro temporal.
- [RF06] Registro de Situação pelo Estudante ("Eu já cursei"): Permite ao usuário
  autenticado registrar se foi Aprovado, Reprovado por Nota, Reprovado por
  Falta ou Trancou na matéria, alimentando as estatísticas agregadas.
- [RF07] Repositório de Conteúdos da Cadeira: Listagem categorizada em:
  Resumos/Notas ("Leites"), Links Úteis e Provas Públicas Anteriores.
- [RF08] Dificuldades Comuns e Dicas: Tópicos conceituais críticos da disciplina
  e dicas de estudo.
- [RF09] Comentários da Comunidade: Postagem de comentários e dúvidas pelos
  alunos em formato anônimo/alias, com suporte a respostas aninhadas (threads).
- [RF10] Submissão de Materiais: Formulário para alunos enviarem novos links,
  resumos ou enunciados de provas públicas com status de moderação.
- [RF11] Voto de Relevância (Upvote): Possibilidade de votar em dicas,
  materiais e comentários úteis para ordenar os mais relevantes.
- [RF12] Fila de Moderação: Painel administrativo para curadoria de conteúdos.
- [RF13] Exportação de Dados Abertos: Download do dataset público em CSV/JSON.

4.2. Requisitos Não-Funcionais (RNF)

- [RNF01] Desempenho: Consultas de busca e carregamento de páginas analíticas
  devem responder em menos de 300 ms em condições normais, utilizando consultas
  otimizadas e índices no PostgreSQL 17 (sem Redis).
- [RNF02] Privacidade e LGPD (Privacy by Design): Não coletar matrícula, CPF ou
  dados acadêmicos nominais. As interações de comentários e votos devem ser
  exibidas publicamente de forma desvinculada da identidade real do aluno.
- [RNF03] Segurança Criptográfica: Senhas armazenadas com hash forte (Argon2 ou
  Bcrypt). Proteção contra injeção de SQL via SQLAlchemy ORM.
- [RNF04] Arquitetura em Camadas: Backend FastAPI com estrita separação entre
  rotas (api/), regras de negócio (services/domain/), persistência
  (repositories/) e entidades (models/).
- [RNF05] Versionamento Database-as-Code: Esquema gerenciado 100% via migrações
  do Alembic. Proibido DDL manual direto no banco.
- [RNF06] Reprodutibilidade Total: Execução completa do ambiente via
  `docker compose up`, sem dependências manuais no sistema operacional do host.
- [RNF07] Responsividade: Interface adaptável a dispositivos móveis e desktops.


5. ARQUITETURA DE SOFTWARE E BANCO DE DADOS
-------------------------------------------

5.1. Backend — FastAPI em camadas

backend/app/
|-- api/             Routers HTTP do FastAPI e schemas Pydantic (validação).
|-- core/            Configurações de ambiente (.env), segurança e tokens JWT.
|-- domain/          Lógica de negócio pura: cálculo de taxas, evasão e moderação.
|-- services/        Casos de uso e orquestração entre API e repositórios.
|-- repositories/    Consultas SQL e persistência assíncrona com SQLAlchemy.
|-- models/          Entidades relacionais do banco de dados em SQLAlchemy.
`-- pipeline/        ETL: ingestão, limpeza e agregação de dados do DPO/INEP.

5.2. Frontend — Next.js (App Router)

frontend/src/
|-- app/             Rotas: /, /cadeiras, /cadeiras/[slug] e /perfil.
|-- features/        Módulos: analytics, cadeiras, colaboracao e comentarios.
|-- components/ui/   Design system atômico com Tailwind CSS.
`-- services/        Clientes HTTP tipados para integração com a API FastAPI.

5.3. Estrutura do banco de dados — PostgreSQL 17

usuarios
  Cadastro simples: id, nome, email, password_hash, role (STUDENT, MODERATOR,
  ADMIN), is_active, created_at.

cursos
  Metadados institucionais: id, codigo_mec, nome, campus, grau, turno, slug.

disciplinas
  Cadastro canônico: id, codigo, slug, nome, departamento, creditos,
  carga_horaria, ementa.

cursos_disciplinas
  Matriz curricular: curso_id, disciplina_id, periodo_sugerido, is_obrigatoria.

metricas_academicas
  Fato analítico histórico agregado (DPO/INEP): disciplina_id, ano, semestre,
  matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos,
  taxa_aprovacao.

situacoes_disciplinas
  Crowdsourcing discente: usuario_id, disciplina_id, situacao (APROVADO,
  REPROVADO_NOTA, REPROVADO_FALTA, TRANCOU), updated_at.
  Constraint: UNIQUE(usuario_id, disciplina_id) — um registro por aluno/matéria.

conteudos
  Materiais de apoio: id, disciplina_id, usuario_id, titulo, descricao,
  tipo (LINK_UTIL, RESUMO, PROVA_ANTIGA, DICA), url_origem, semestre,
  status_curadoria (PENDENTE, APROVADO, RECUSADO), created_at.

comentarios
  Relatos e discussões: id, disciplina_id, usuario_id, autor_alias,
  topico_dificuldade, conteudo, parent_id, status_moderacao, created_at.

votos_uteis
  Upvotes de relevância: usuario_id, target_type (CONTEUDO, COMENTARIO),
  target_id, created_at.
  Constraint: UNIQUE(usuario_id, target_type, target_id).


6. REGRAS DE NEGÓCIO E GOVERNANÇA (RN)
--------------------------------------

Qualquer agente que gerar código deve obedecer obrigatoriamente às regras:

[RN01] Privacidade por Padrão e Anonimato Discente
A plataforma não armazena nem processa matrícula, CPF ou histórico acadêmico
individual. Avaliações e comentários exibem apenas autor_alias ou indicação
anônima. Os votos de situação acadêmica alimentam exclusivamente as métricas
numéricas agregadas da disciplina.

[RN02] Unicidade da Situação Acadêmica por Disciplina
Cada estudante autenticado pode possuir apenas 1 status ativo por disciplina.
Se o aluno registrar um novo status para a mesma matéria, o registro anterior
é atualizado (evitando contagem duplicada).

[RN03] Unicidade de Voto Útil (Upvote)
Um usuário pode registrar no máximo 1 voto útil por material ou comentário.
Uma nova chamada de upvote no mesmo item remove o voto existente.

[RN04] Proteção a Docentes e Conduta Ética
É terminantemente proibida a publicação de juízos de valor depreciativos,
ataques pessoais ou conteúdo difamatório contra docentes. Os relatos devem se
concentrar estritamente no conteúdo programático e na metodologia da matéria.

[RN05] Vedação de Resoluções Ativas
É proibida a publicação de gabaritos e resoluções de atividades contínuas
recorrentes (como testes semanais ou relatórios laboratoriais vigentes). São
aceitos apenas enunciados de avaliações públicas anteriores e resumos conceituais.

[RN06] Curadoria de Submissões Externas
Materiais submetidos por estudantes são gravados com status_curadoria = PENDENTE
e só são exibidos publicamente após aprovação de um moderador.

[RN07] Tratamento de Dados com Baixa Amostragem (LGPD / DPO)
Agregações históricas oriundas de microdados públicos com menos de 5 alunos por
turma são suprimidas ou consolidadas no acumulado da matéria para inviabilizar
identificação indireta de estudantes.

[RN08] Cálculo de Evasão Institucional
A taxa de evasão deve seguir a fórmula canônica:
Taxa de evasão = (total de desligamentos / total de matriculados ativos) x 100


7. PORTAS DE QUALIDADE E CRITÉRIOS DA DISCIPLINA (MDS 2026/2)
----------------------------------------------------------------

7.1. Cobertura de código
Mínimo de 70% de cobertura de linhas no módulo de domínio e regras de negócio.

7.2. Escore de mutação
Mínimo de 50% de mutantes mortos nas regras de negócio e cálculo de métricas
via Mutmut.

7.3. Testes de sabotagem
A suíte de testes deve falhar com 100% de eficácia quando forem injetadas falhas
deliberadas nas funções de domínio.

7.4. Análise estática de segurança (SAST)
Nenhuma vulnerabilidade crítica ou alta pode permanecer em aberto no pipeline
de CI/CD (validação com Bandit e SonarQube).

7.5. Reprodutibilidade
Toda a aplicação deve ser executável via Docker Compose, sem necessidade de
comandos manuais no sistema operacional hospedeiro.


8. INSTRUÇÕES PARA AGENTES DE IA
---------------------------------

8.1. Padrão de código
Escrever código limpo, tipado e com tratamento explícito de erros: TypeScript
no frontend e Type Hints com Pydantic v2 no Python.

8.2. Separação de camadas
Nunca realizar chamadas ao banco de dados diretamente nas rotas HTTP
(api/routers). As consultas devem permanecer estritamente nos repositories,
as regras de negócio nos services/domain, e a validação nos schemas Pydantic.

8.3. Migrações e Banco de Dados
Nunca propor a criação ou modificação de tabelas por meio de comandos SQL
manuais e isolados. Utilizar exclusivamente migrações versionadas do Alembic.

8.4. Controle de escopo e anti-sobre-engenharia
Não adicionar microsserviços, filas assíncronas complexas (RabbitMQ, Celery),
Redis ou bancos NoSQL. Manter a arquitetura simples, sólida e modular no
PostgreSQL 17.