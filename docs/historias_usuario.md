# Histórias de usuário e necessidades de dados

## 1. Objetivo e escopo

Este documento relaciona as necessidades dos usuários do **Tamburetei UnB** às informações que o sistema precisa armazenar e gerenciar. Para cada história, apresenta critérios de aceitação, entidades, atributos, relacionamentos e restrições relevantes à implementação do banco de dados e da aplicação.

A análise atende ao objetivo da issue **Banco de Dados — Histórias de Usuário (#9)**: identificar as estruturas de dados necessárias às funcionalidades e registrar necessidades para implementação futura.

As referências são o `PROJECT_CONTEXT.md`, a skill `tamburetei-dev`, os documentos de [requisitos](requisitos.md), [arquitetura](arquitetura.md) e [regras de negócio](regras_negocio.md), além do esquema SQL fornecido pela equipe em `message.txt`. Esse esquema é tratado como referência de modelagem; sua presença não comprova a execução das tabelas ou a implementação das funcionalidades.

O escopo compreende as dez histórias analisadas: cadastro, consulta curricular, indicadores históricos, situação discente, consulta e submissão de materiais, comentários, votos, curadoria de materiais e exportação. Não representa todo o backlog do produto nem estabelece prioridade ou release para as histórias.

Os identificadores HU01 a HU10 são próprios deste documento. A rastreabilidade de requisitos funcionais utiliza exclusivamente a numeração de `docs/requisitos.md`, pois ela diverge da numeração do `PROJECT_CONTEXT.md`.

## 2. Perfis de usuários

| Perfil | Participação no sistema |
| --- | --- |
| Visitante | Consulta informações públicas e cria uma conta para participar das funcionalidades colaborativas. |
| Estudante autenticado | Registra sua situação em disciplinas, submete materiais, comenta, responde e vota. |
| Moderador / administrador | Realiza a curadoria dos materiais e atua na moderação conforme suas permissões. |

## 3. Visão geral e rastreabilidade

| História | Necessidade | Entidades principais | Requisitos relacionados |
| --- | --- | --- | --- |
| HU01 | Criar uma conta | `usuarios` | RF01 |
| HU02 | Consultar a organização curricular | `cursos`, `disciplinas`, `cursos_disciplinas` | RF04, RF05, RF07 |
| HU03 | Consultar indicadores históricos | `disciplinas`, `metricas_academicas` | RF08 |
| HU04 | Registrar ou atualizar situação discente | `usuarios`, `disciplinas`, `situacoes_disciplinas` | RF09 |
| HU05 | Consultar materiais aprovados | `disciplinas`, `conteudos` | RF10, RF11 |
| HU06 | Submeter materiais | `usuarios`, `disciplinas`, `conteudos` | RF13 |
| HU07 | Comentar e responder sob pseudônimo | `usuarios`, `disciplinas`, `comentarios` | RF12 |
| HU08 | Votar em contribuições úteis | `usuarios`, `votos_uteis`, `conteudos`, `comentarios` | RF14 |
| HU09 | Aprovar ou recusar materiais | `usuarios`, `conteudos` | RF15, parcialmente |
| HU10 | Exportar indicadores públicos | `disciplinas`, `metricas_academicas` | RF06 |

A autenticação e o controle de acesso (RF02 e RF03) são dependências das ações protegidas. A HU09 cobre a curadoria de materiais; o fluxo de denúncias e moderação de comentários previsto no RF15 necessita de detalhamento adicional.

## 4. Histórias de usuário

### HU01 — Criar uma conta

> Como visitante, quero criar uma conta para participar das funcionalidades colaborativas da plataforma.

**Critérios de aceitação**

- O cadastro solicita nome, e-mail e senha, sem matrícula, CPF ou IRA.
- O sistema impede o cadastro de duas contas com o mesmo e-mail.
- A senha é armazenada exclusivamente como hash com bcrypt.
- Uma nova conta recebe o perfil `STUDENT`; o cadastro público não permite escolher privilégios de moderação ou administração.
- Dados de autenticação e o hash da senha não são disponibilizados nas consultas públicas.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `usuarios` | `id`, `nome`, `email`, `password_hash` | Identificar internamente a conta e armazenar suas credenciais. |
| `usuarios` | `role`, `is_active`, `created_at` | Controlar perfil, situação da conta e data de criação. |

**Relacionamentos e restrições:** `usuarios.id` identifica o participante nas situações, submissões, comentários e votos. `email` possui unicidade no esquema. O hash e a atribuição segura do perfil dependem da aplicação, além das restrições do banco.

**Regras relacionadas:** RN01; RNF02 e RNF03.

### HU02 — Consultar a organização curricular

> Como visitante, quero consultar as disciplinas de um curso para conhecer sua organização curricular e encontrar informações sobre as matérias.

**Critérios de aceitação**

- A consulta é pública, sem necessidade de autenticação.
- O visitante pode navegar por curso, departamento e período sugerido e buscar disciplinas por nome ou código.
- A consulta identifica quais disciplinas são obrigatórias ou optativas no curso selecionado.
- A página da disciplina apresenta os metadados disponíveis, incluindo ementa, créditos e carga horária.
- A ausência de período sugerido não é exibida como um período inexistente ou inventado.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `cursos` | `id`, `codigo_mec`, `nome`, `campus`, `grau`, `turno`, `slug` | Identificar e apresentar o curso. |
| `disciplinas` | `id`, `codigo`, `nome`, `slug`, `departamento`, `creditos`, `carga_horaria`, `ementa` | Identificar, localizar e apresentar a disciplina. |
| `cursos_disciplinas` | `curso_id`, `disciplina_id`, `periodo_sugerido`, `is_obrigatoria` | Representar a posição e a natureza da disciplina em cada curso. |

**Relacionamentos e restrições:** cursos e disciplinas possuem relação muitos para muitos, representada por `cursos_disciplinas`. A combinação `(curso_id, disciplina_id)` é única. O período e a obrigatoriedade pertencem à associação, pois podem variar entre cursos. Os slugs são únicos em suas respectivas tabelas.

**Necessidade a definir:** confirmar se o código acadêmico deve ser obrigatório e único, pois o esquema anexado não estabelece essas garantias.

### HU03 — Consultar indicadores históricos

> Como visitante, quero consultar indicadores históricos de uma disciplina para compreender seu desempenho acadêmico ao longo dos semestres.

**Critérios de aceitação**

- A consulta pública apresenta os indicadores disponíveis de aprovação, reprovação por nota, reprovação por falta e trancamento.
- Os resultados podem ser filtrados por intervalo de anos e identificam ano e semestre.
- Os indicadores históricos são apresentados separadamente das contribuições do “Já cursei”.
- A publicação respeita o tratamento de baixa amostragem previsto na RN07.
- Períodos sem dados são identificados como indisponíveis, sem serem interpretados automaticamente como resultado zero.
- Cálculos com denominador zero não produzem erro nem uma taxa enganosa; a representação do resultado indisponível deve ser definida no contrato da API.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `disciplinas` | `id`, `codigo`, `nome`, `slug` | Identificar a disciplina analisada. |
| `metricas_academicas` | `disciplina_id`, `ano`, `semestre` | Identificar o recorte histórico. |
| `metricas_academicas` | `matriculados`, `aprovados`, `reprovados_nota`, `reprovados_falta`, `trancamentos`, `taxa_aprovacao` | Armazenar contagens agregadas e a taxa de aprovação. |

**Relacionamentos e restrições:** uma disciplina possui vários registros históricos. A combinação `(disciplina_id, ano, semestre)` é única. O esquema aceita semestres 1 e 2. Contagens não negativas e consistência das taxas precisam de validação; o SQL fornecido não garante essas condições integralmente.

**Regras relacionadas:** RN07; RNF01 e RNF02.

**Necessidades a definir:** documentar fonte, fórmula e denominadores dos indicadores, política para dados ausentes e tratamento de baixa amostragem antes da publicação. O modelo agregado por disciplina não permite verificar sozinho a quantidade de estudantes de cada turma de origem.

### HU04 — Registrar ou atualizar situação em uma disciplina

> Como estudante autenticado, quero registrar ou atualizar minha situação em uma disciplina para contribuir com as estatísticas da comunidade.

**Critérios de aceitação**

- Somente estudantes autenticados podem registrar sua própria situação.
- As opções são `APROVADO`, `REPROVADO_NOTA`, `REPROVADO_FALTA` e `TRANCOU`.
- Cada estudante mantém no máximo uma situação por disciplina.
- Um novo envio para a mesma disciplina atualiza o registro anterior, sem duplicar a contribuição.
- A data de atualização acompanha a alteração do registro.
- Consultas públicas apresentam resultados agregados, sem identificar os estudantes responsáveis.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `situacoes_disciplinas` | `id`, `usuario_id`, `disciplina_id`, `situacao`, `updated_at` | Registrar a situação atual declarada pelo estudante na disciplina. |
| `usuarios` | `id` | Identificar internamente o responsável. |
| `disciplinas` | `id` | Identificar a matéria correspondente. |

**Relacionamentos e restrições:** cada situação pertence a um usuário e a uma disciplina. A restrição `UNIQUE(usuario_id, disciplina_id)` impede duplicidade. A aplicação deve realizar a atualização do registro existente e de `updated_at`; seu valor padrão não atualiza automaticamente a coluna em alterações futuras.

**Regras relacionadas:** RN01 e RN02.

**Limite do modelo:** os registros representam a situação atual autodeclarada, sem histórico de tentativas ou semestre cursado. A ligação interna com `usuario_id` permite identificar o responsável no banco, embora essa identidade não deva aparecer publicamente. Essa distinção precisa ser conciliada com a redação da política de privacidade do projeto.

### HU05 — Consultar materiais aprovados

> Como visitante, quero consultar materiais aprovados de uma disciplina para apoiar meus estudos.

**Critérios de aceitação**

- A consulta é pública e restrita aos conteúdos com `status_curadoria = APROVADO`.
- Os materiais são organizados por tipo: link útil, resumo, prova antiga ou dica.
- Cada item apresenta título e os demais dados disponíveis, como descrição, origem e semestre de referência.
- Conteúdos pendentes ou recusados não são acessíveis pelas consultas públicas de materiais.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `conteudos` | `id`, `disciplina_id`, `titulo`, `descricao`, `tipo`, `url_origem`, `semestre`, `status_curadoria` | Localizar e apresentar os materiais autorizados para publicação. |
| `disciplinas` | `id`, `nome`, `slug` | Vincular os materiais à disciplina consultada. |

**Relacionamentos e restrições:** uma disciplina possui vários conteúdos. O banco restringe os tipos e estados aceitos, enquanto a aplicação deve aplicar o filtro de publicação em todas as consultas públicas.

**Regras relacionadas:** RN05 e RN06.

### HU06 — Submeter materiais de estudo

> Como estudante autenticado, quero submeter materiais de estudo para compartilhar recursos com outros estudantes.

**Critérios de aceitação**

- A submissão exige autenticação e identifica uma disciplina existente.
- O estudante informa título, tipo e os dados do material exigidos pelo formato adotado.
- Toda nova submissão recebe o estado `PENDENTE`, sem possibilidade de autoaprovação pelo estudante.
- O material somente se torna público após aprovação por moderador.
- A submissão e a curadoria observam a vedação de gabaritos e resoluções de atividades avaliativas contínuas vigentes.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `conteudos` | `id`, `disciplina_id`, `usuario_id`, `titulo`, `descricao`, `tipo`, `url_origem`, `semestre` | Registrar a contribuição, sua origem e sua associação acadêmica. |
| `conteudos` | `status_curadoria`, `created_at`, `updated_at` | Controlar o estado e as datas da submissão. |

**Relacionamentos e restrições:** um usuário pode submeter vários conteúdos, e cada conteúdo pertence a uma disciplina. No esquema fornecido, a exclusão do usuário preserva o conteúdo e torna `usuario_id` nulo. A aplicação deve identificar o autor pela sessão autenticada e controlar alterações de estado.

**Regras relacionadas:** RN05 e RN06.

**Necessidade a definir:** `url_origem` é obrigatório no modelo atual. É necessário decidir se dicas e resumos podem ser escritos diretamente na plataforma sem um link externo. O esquema também não descreve armazenamento de arquivos enviados.

### HU07 — Comentar e responder sob pseudônimo

> Como estudante autenticado, quero comentar e responder sob pseudônimo para trocar experiências e esclarecer dúvidas sobre uma disciplina.

**Critérios de aceitação**

- A publicação exige autenticação e uma disciplina existente.
- A exibição pública utiliza `autor_alias`, sem revelar nome, e-mail ou identificador interno do usuário.
- O estudante pode publicar um comentário inicial ou responder a um comentário existente da mesma disciplina.
- Comentários em estado `PENDENTE` ou `OCULTO` não são exibidos nas consultas públicas.
- As interações respeitam a conduta acadêmica definida na RN04.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `comentarios` | `id`, `disciplina_id`, `usuario_id`, `autor_alias`, `conteudo`, `topico_dificuldade` | Registrar a contribuição e sua apresentação pública. |
| `comentarios` | `parent_id`, `status_moderacao`, `created_at` | Organizar respostas, controlar visibilidade e registrar a data de publicação. |

**Relacionamentos e restrições:** cada comentário pertence a um usuário e a uma disciplina. `parent_id` referencia outro comentário; quando nulo, indica uma publicação inicial. A aplicação deve garantir que a resposta pertença à mesma disciplina do comentário original. O esquema inicia comentários como `PUBLICADO`, diferentemente dos materiais submetidos.

**Regras relacionadas:** RN01 e RN04.

**Necessidades a definir:** política de escolha e uso do alias, tratamento das respostas quando o comentário original é ocultado e fluxo de denúncias. O modelo atual não registra denúncias nem seu motivo ou processamento.

### HU08 — Votar em contribuições úteis

> Como estudante autenticado, quero votar em materiais e comentários úteis para destacar contribuições relevantes para a comunidade.

**Critérios de aceitação**

- A votação exige autenticação e um material ou comentário existente e disponível publicamente.
- Cada usuário pode manter no máximo um voto por item.
- Repetir a ação em um item já votado remove o voto existente.
- As contagens agregadas podem ser utilizadas para ordenar as contribuições por relevância.
- A consulta pública não revela a identidade dos votantes.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `votos_uteis` | `id`, `usuario_id`, `target_type`, `target_id`, `created_at` | Registrar o voto e identificar seu destino. |
| `conteudos` / `comentarios` | `id` e estado de publicação | Identificar o item votado e verificar sua disponibilidade. |

**Relacionamentos e restrições:** um usuário pode votar em vários itens. Cada voto aponta para um conteúdo ou comentário, conforme `target_type`. A combinação `(usuario_id, target_type, target_id)` é única. A alternância entre inclusão e remoção deve ser implementada na aplicação.

**Regras relacionadas:** RN01 e RN03.

**Necessidade a definir:** o destino é uma associação lógica, pois `target_id` não possui chave estrangeira para as duas tabelas. A implementação deve garantir a existência do destino e evitar votos órfãos após sua exclusão.

### HU09 — Aprovar ou recusar materiais

> Como moderador, quero aprovar ou recusar materiais submetidos para controlar o que será disponibilizado publicamente na plataforma.

**Critérios de aceitação**

- A fila de curadoria é acessível somente a usuários autorizados com perfil de moderação ou administração.
- A fila permite consultar os materiais pendentes e os dados necessários à avaliação.
- A aprovação altera o estado para `APROVADO` e permite a publicação.
- A recusa altera o estado para `RECUSADO` e mantém o material fora das consultas públicas.
- A avaliação observa as regras de conduta acadêmica e os tipos de material permitidos.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `usuarios` | `id`, `role`, `is_active` | Identificar o responsável pela ação e verificar sua autorização. |
| `conteudos` | `id`, `titulo`, `descricao`, `tipo`, `url_origem`, `semestre`, `status_curadoria`, `updated_at` | Examinar o material e registrar seu estado atual. |

**Relacionamentos e restrições:** o vínculo `conteudos.usuario_id` identifica o autor da submissão, não o moderador. O modelo restringe os estados possíveis, mas a autorização e as transições de curadoria dependem da aplicação.

**Regras relacionadas:** RN04, RN05 e RN06.

**Necessidade a definir:** caso seja exigida auditoria das decisões, acrescentar uma solução para registrar moderador responsável, data e motivo da decisão. Esses dados não são representados explicitamente pelo esquema atual.

### HU10 — Exportar indicadores públicos

> Como visitante, quero exportar os indicadores públicos para realizar minhas próprias análises sobre o desempenho acadêmico.

**Critérios de aceitação**

- A exportação é pública e oferece os formatos CSV e JSON.
- O conjunto exportado identifica as disciplinas e os períodos correspondentes aos indicadores.
- A exportação inclui somente informações autorizadas para publicação e respeita as mesmas regras de baixa amostragem da consulta pública.
- Dados pessoais, credenciais e registros individuais de situação discente não integram o dataset histórico exportado.
- A estrutura do dataset e o significado dos campos são documentados.

**Dados necessários**

| Entidade | Atributos relevantes | Finalidade |
| --- | --- | --- |
| `disciplinas` | `id`, `codigo`, `nome` | Identificar as disciplinas no conjunto exportado. |
| `metricas_academicas` | `disciplina_id`, `ano`, `semestre`, contagens acadêmicas e `taxa_aprovacao` | Compor o dataset histórico agregado. |

**Relacionamentos e restrições:** a exportação associa métricas às disciplinas por `disciplina_id`. A funcionalidade pode ser atendida por consulta e serialização, sem necessidade de uma tabela própria de exportações no escopo descrito.

**Regras relacionadas:** RN01 e RN07.

**Necessidade a definir:** contrato dos arquivos, representação de valores ausentes, metadados de origem e versão do dataset.

---
## Épico 1: Autenticação e Segurança
 
### Feature 1.1: Cadastro e Login de Usuários
 
#### User Story 1.1.1: Cadastro de novo usuário
Eu, como visitante não autenticado, desejo me cadastrar na plataforma com e-mail e senha, a fim de obter acesso às funcionalidades restritas a alunos autenticados.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `User` (id, email, senha_hash, perfil, criado_em)
- Criar schema Pydantic `UserCreate` com validação de e-mail e força de senha
- Integrar biblioteca de hashing bcrypt (ex: passlib) ao fluxo de criação
- Criar endpoint `POST /auth/register` com verificação de e-mail duplicado

**Critérios de aceitação:**
- Avisar em casos de erro de e-mail já cadastrado
- Avisar em casos de erro de senha fora do padrão mínimo exigido
- Visualizar dados do usuário criado (sem a senha) na resposta da API
- Garantir que nenhuma senha em texto puro seja persistida no banco de dados ao salvar o usuário
#### User Story 1.1.2: Login com geração de token JWT
Eu, como usuário cadastrado, desejo autenticar com e-mail e senha, a fim de receber um token JWT que me identifique nas próximas requisições.
 
**Nessa issue deve ser feito:**
- Criar endpoint `POST /auth/login` que valida credenciais
- Implementar geração de JWT com claims de id e perfil do usuário
- Configurar tempo de expiração e chave de assinatura via variável de ambiente

**Critérios de aceitação:**
- Avisar em casos de erro de credenciais inválidas
- Retornar token JWT válido e código HTTP 200 em caso de sucesso
- Ser acessado somente por usuários de perfil visitante (rota pública, sem autenticação prévia)
#### User Story 1.1.3: Exclusão da própria conta
Eu, como usuário autenticado, desejo excluir a minha conta, a fim de encerrar o meu acesso à plataforma quando não desejar mais utilizá-la.
 
**Nessa issue deve ser feito:**
- Criar endpoint `DELETE /users/me`
- Identificar o usuário autenticado via token JWT
- Desativar a conta do usuário, impedindo novos logins
- Manter as contribuições já realizadas pelo usuário, a fim de não afetar o sistema de validação das estatísticas
- Anonimizar os dados pessoais do usuário após exclusão da conta
**Critérios de aceitação:**

- Garantir que apenas o próprio usuário possa realizar a exclusão
- Avisar em caso de token ausente, inválido ou expirado
- Garantir que o usuário excluído não realize novos logins
- Garantir que as contribuições já realizadas não sejam afetadas após a exclusão da conta
### Feature 1.2: Controle de Acesso por Perfil (RBAC)
 
#### User Story 1.2.1: Middleware de verificação de perfil
Eu, como Engenheiro de Backend, desejo implementar um middleware/dependência de autorização baseada em perfil, a fim de restringir endpoints sensíveis a usuários com a permissão correta.
 
**Nessa issue deve ser feito:**
- Criar dependência FastAPI `get_current_user` a partir do token JWT
- Criar dependência `require_role(perfil)` reutilizável em rotas protegidas
- Aplicar o middleware nas rotas administrativas já existentes

**Critérios de aceitação:**
- Avisar em casos de erro de token inválido ou expirado
- Avisar em casos de erro de permissão insuficiente (403)
- Ser acessado somente por usuários de perfil administrador nas rotas administrativas

 
## Épico 2: Gestão de Dados Acadêmicos Públicos (Professores x Turmas)
  
### Feature 2.1: Modelagem de Disciplinas e Turmas
 

#### User Story 2.1.1: Cadastro de turma vinculada a disciplina e professor
Eu, como administrador, desejo registrar turmas vinculando disciplina, semestre e professor(es) responsável(is), a fim de estruturar a base de dados que sustenta as estatísticas colaborativas.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `Turma` (disciplina_id, semestre, professor_id, código da turma)
- Criar relacionamento SQLAlchemy N:N entre `Turma` e `Professor`
- Criar endpoint `POST /turmas` e `GET /turmas/{id}`

**Critérios de aceitação:**
- Avisar em casos de erro de professor ou disciplina inexistente
- Visualizar turmas de uma disciplina em uma lista
- Ser acessado somente por usuários de perfil administrador para criação

### Feature 2.2: Consulta de Professores
 
#### User Story 2.2.1: Consulta de Professores
Eu, como usuário, desejo pesquisar professores cadastrados na plataforma, a fim de visualizar disciplinas e turmas vinculadas a eles.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /professores`
- Implementar busca de professores por nome
- Criar endpoint `GET /professores/{id}`
- Retornar as disciplinas e turmas vinculadas ao professor
- Implementar a paginação na listagem de professores

**Critérios de aceitação:**
- Filtrar professores pelo nome
- Visualizar as turmas e disciplinas vinculadas ao professor selecionado
- Avisar em caso de professor inexistente
- Visualizar os professores em uma lista paginada
---
 
## Épico 3: Doação Colaborativa de Estatísticas de Turmas
 
### Feature 3.1: Envio de Doações de Estatísticas
 
#### User Story 3.1.1: Envio validado de doação de estatística de turma
Eu, como aluno autenticado, desejo doar os índices de aprovação, reprovação por nota, reprovação por falta e trancamento de uma turma que cursei, a fim de contribuir com dados reais extraídos do SIGAA para a plataforma.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `DoacaoEstatistica` (turma_id, usuario_id, semestre_referencia, taxas diversas, data_envio)
- Criar schema Pydantic `DoacaoCreate` com validadores customizados (ex: garantir que a soma das taxas seja exatamente 100% e o semestre siga o padrão "YYYY.S")
- Criar endpoint `POST /turmas/{id}/doacoes` implementando checagem de existência da turma no banco antes de aceitar o payload

**Critérios de aceitação:**
- Avisar em casos de erro de valores de taxa fora do intervalo permitido ou soma diferente de 100%
- Avisar em casos de erro de turma inexistente referenciada na doação (HTTP 404)
- Avisar em casos de erro de doação duplicada do mesmo usuário para a mesma turma e semestre
- Ser acessado somente por usuários de perfil aluno autenticado
### Feature 3.2: Motor de Consenso (Quórum)
 
#### User Story 3.2.1: Cálculo automático de quórum de doações idênticas
Eu, como Engenheiro de Backend, desejo implementar uma rotina que compare as doações recebidas para uma mesma turma, a fim de identificar quando um quórum de envios idênticos é atingido.
 
**Nessa issue deve ser feito:**
- Criar função de agrupamento de doações por turma com comparação de igualdade de valores
- Definir parâmetro de configuração de quórum mínimo (ex: N doações idênticas)
- Disparar a rotina de consenso automaticamente a cada nova doação recebida
**Critérios de aceitação:**
- Avisar em casos de erro de quórum mal configurado (valor menor que 1)
- Visualizar o progresso do quórum de uma turma em uma lista (quantidade de doações por valor)
- Ser acessado somente por usuários de perfil administrador para consulta do progresso

#### User Story 3.2.2: Consolidação da estatística oficial após quórum atingido
Eu, como Engenheiro de Backend, desejo consolidar automaticamente a estatística oficial de uma turma assim que o quórum de consenso for atingido, a fim de disponibilizar dados confiáveis no catálogo de cadeiras.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `EstatisticaConsolidada` (turma_id, semestre_referencia, taxa_aprovacao, taxa_reprovacao_nota, taxa_reprovacao_falta, taxa_trancamento, status)
- Implementar rotina que grava a estatística consolidada ao atingir o quórum, mantendo o histórico por semestre, e marca o status como "validado"
- Impedir sobrescrita de estatística já consolidada, salvo por ação administrativa

**Critérios de aceitação:**
- Avisar em casos de erro de tentativa de consolidação sem quórum atingido
- Visualizar estatísticas consolidadas em uma lista
- Ser acessado somente por usuários de perfil administrador para forçar recálculo

### Feature 3.3: Série Histórica de Estatísticas por Período
 
#### User Story 3.3.1: Consulta de estatísticas de uma turma filtradas por intervalo de anos
Eu, como usuário autenticado, desejo consultar a série histórica de estatísticas de uma disciplina filtrada por um intervalo de anos, a fim de analisar a evolução das taxas de aprovação, reprovação e trancamento ao longo do tempo.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /catalogo/cadeiras/{id}/estatisticas` com parâmetros de query `ano_inicio` e `ano_fim`
- Implementar conversão dos parâmetros de ano na rota FastAPI para abranger os semestres correspondentes (ex: transformar `ano_inicio=2022` e `ano_fim=2024` em uma busca de "2022.1" até "2024.2")
- Implementar consulta SQLAlchemy agregando `EstatisticaConsolidada` por semestre dentro do intervalo informado
- Otimizar a consulta no banco de dados criando um índice composto em (disciplina_id, semestre_referencia)

**Critérios de aceitação:**
- Avisar em casos de erro de intervalo de anos inválido (HTTP 400 se ano_fim for menor que ano_inicio)
- Visualizar as estatísticas de cada semestre em uma lista ordenada cronologicamente
- Filtro de pesquisa por intervalo de anos aplicado com sucesso na resposta da API
---
 
## Épico 4: Catálogo de Cadeiras
 
### Feature 4.1: Busca e Listagem de Cadeiras
 
#### User Story 4.1.1: Listagem de cadeiras com filtro de pesquisa
Eu, como usuário, desejo listar e pesquisar as cadeiras (disciplinas) disponíveis no catálogo, a fim de encontrar rapidamente a disciplina que desejo consultar.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /catalogo/cadeiras` com paginação
- Implementar filtros por parâmetros de query (nome, código, departamento) usando consultas case-insensitive (ex: ILIKE no PostgreSQL)
- Otimizar consulta SQLAlchemy com índices nos campos de busca

**Critérios de aceitação:**
- Visualizar cadeiras em uma lista paginada
- Filtro de pesquisa por nome da disciplina
- Filtro de pesquisa por código da disciplina

#### User Story 4.1.2: Detalhe de cadeira com estatísticas consolidadas
Eu, como usuário, desejo visualizar o detalhe de uma cadeira com suas turmas e estatísticas consolidadas, a fim de decidir em qual turma e professor me matricular.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /catalogo/cadeiras/{id}` agregando turmas e estatísticas consolidadas
- Implementar serialização Pydantic aninhada (disciplina > turmas > estatísticas)
- Tratar cadeiras sem estatística consolidada ainda (retorno nulo controlado)

**Critérios de aceitação:**
- Avisar em casos de erro de cadeira inexistente (HTTP 404)
- Visualizar estatísticas de aprovação por turma em uma lista aninhada
- Ser acessado publicamente (rota aberta para visitantes e usuários autenticados)
#### User Story 4.2.1: Cálculo automático de badge de aprovação por cadeira
Eu, como usuário autenticado, desejo visualizar um badge (selo) automático de aprovação para cada cadeira, a fim de ter uma leitura rápida do nível de dificuldade geral da disciplina.
 
**Nessa issue deve ser feito:**
- Definir regra de negócio de faixas de badge (ex: fácil, médio, difícil) baseada na taxa média de aprovação
- Criar rotina de serviço `calcular_badge(disciplina_id)` reutilizada no endpoint de catálogo
- Persistir o badge atualizado em uma coluna nativa da tabela no PostgreSQL (sem uso de cache externo/Redis, respeitando a ADR 01)

**Critérios de aceitação:**
- Avisar em casos de erro (retornar nulo ou tag "Sem Dados") caso a disciplina não possua estatística suficiente para cálculo
- Visualizar o badge calculado junto aos dados da cadeira na listagem pública
- Filtro de pesquisa por badge de aprovação
---
 
 
## Épico 5: Espaço de Comunidade
 
### Feature 5.1: Comentários em Cadeiras e Turmas
 
#### User Story 5.1.1: Criação de comentário em uma cadeira ou turma
Eu, como aluno autenticado, desejo publicar comentários em uma cadeira ou turma, a fim de compartilhar minha experiência com outros alunos.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `Comentario` (usuario_id, FK disciplina_id (nullable), FK turma_id (nullable), conteudo, criado_em, status_moderacao com default "ativo")
- Implementar restrição (CHECK constraint) no banco garantindo que o comentário pertença a uma disciplina OU a uma turma, nunca a ambas ou a nenhuma
- Criar schema Pydantic `ComentarioCreate` com validação de limite máximo de caracteres
- Criar endpoint `POST /comentarios` recebendo os dados validados

**Critérios de aceitação:**
- Avisar em casos de erro de conteúdo vazio ou acima do limite de caracteres
- Visualizar o comentário criado na resposta da API com status "ativo" (moderação reativa)
- Ser acessado somente por usuários de perfil aluno autenticado

#### User Story 5.1.2: Listagem de comentários com filtro
Eu, como usuário, desejo visualizar os comentários de uma cadeira, a fim de conhecer a opinião de outros alunos antes de me matricular.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /cadeiras/{id}/comentarios` retornando apenas comentários com status "ativo"
- Implementar paginação e ordenação por data de criação (mais recentes primeiro)
- Implementar filtro por parâmetro de query para buscar comentários de uma turma específica

**Critérios de aceitação:**
- Visualizar comentários aprovados/ativos em uma lista paginada
- Filtro de pesquisa por turma aplicado corretamente
- Avisar em casos de erro de cadeira sem comentários (retorno vazio controlado com HTTP 200 e lista vazia)

#### User Story 5.1.3: Edição e exclusão do próprio comentário
Eu, como aluno autenticado, desejo editar ou remover o meu próprio comentário, com o intuito de corrigir uma informação publicada ou remover um comentário que não desejo que permaneça na plataforma.
 
**Nessa issue deve ser feito:**
- Criar endpoint `PATCH /comentarios/{id}`
- Criar endpoint `DELETE /comentarios/{id}`
- Identificar o usuário via token JWT
- Verificar se o usuário autenticado é o autor antes de permitir a exclusão ou edição do comentário
- Aplicar na edição as mesmas validações de conteúdo definidas na criação do comentário

**Critérios de aceitação:**
- Garantir que apenas o autor do comentário possa modificá-lo ou excluí-lo
- Avisar em caso de comentário inexistente
- Avisar em caso de tentativa de edição ou exclusão por outro usuário
- Garantir que comentários excluídos não sejam exibidos nas listagens
- Garantir que os comentários editados continuem respeitando os limites de caracteres
### Feature 5.2: Compartilhamento e Upload de Materiais
 
#### User Story 5.2.1: Upload físico de material de apoio
Eu, como aluno autenticado, desejo fazer o upload de arquivos físicos (como PDFs ou imagens) referentes a uma cadeira, a fim de ajudar outros alunos com conteúdo relevante de estudo.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `Material` (usuario_id, disciplina_id, titulo, caminho_arquivo, formato, status_moderacao com default "ativo")
- Criar endpoint `POST /cadeiras/{id}/materiais` utilizando `UploadFile` do FastAPI para receber requisições multipart/form-data
- Implementar rotina no backend para salvar o arquivo em um diretório local seguro e gravar o caminho relativo no banco de dados
- Implementar validação de tipo de arquivo (apenas PDF, PNG, JPG) e tamanho máximo (ex: 5MB)

**Critérios de aceitação:**
- Avisar em casos de erro de formato de arquivo não suportado (HTTP 415 Unsupported Media Type)
- Avisar em casos de erro de arquivo excedendo o tamanho máximo permitido (HTTP 413 Payload Too Large)
- Visualizar os metadados do material salvo na resposta da API
- Ser acessado somente por usuários de perfil aluno autenticado

#### User Story 5.2.2: Listagem de materiais por cadeira
Eu, como usuário, desejo listar os materiais de apoio disponíveis em uma cadeira, a fim de encontrar conteúdo de estudo recomendado por outros alunos.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /cadeiras/{id}/materiais` retornando apenas materiais com status "ativo"
- Incluir na resposta do schema Pydantic o ID do material para possibilitar o download futuro
- Implementar paginação dos resultados e filtro textual por título

**Critérios de aceitação:**
- Visualizar materiais disponíveis em uma lista com título e formato do arquivo
- Filtro de pesquisa por título do material
- Avisar em casos de erro de cadeira sem materiais cadastrados (retorno vazio controlado)

#### User Story 5.2.3: Download de material de apoio
Eu, como usuário, desejo fazer o download do arquivo de um material previamente compartilhado, a fim de consumi-lo nos meus estudos.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /materiais/{id}/download`
- Implementar busca do caminho do arquivo no banco de dados pelo ID
- Utilizar `FileResponse` do FastAPI para retornar o arquivo binário corretamente para o navegador/cliente

**Critérios de aceitação:**
- Avisar em casos de erro de material inexistente ou excluído (HTTP 404)
- Avisar em casos de erro de material bloqueado por moderação (HTTP 403)
- Ser acessado somente por usuários de perfil aluno autenticado (download protegido)
### Feature 5.3: Moderação de Conteúdo
 
#### User Story 5.3.1: Denúncia de conteúdo impróprio
Eu, como aluno autenticado, desejo denunciar um comentário ou material impróprio, a fim de sinalizar conteúdo que viole as regras da comunidade para revisão de um moderador.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `Denuncia` (FK comentario_id nullable, FK material_id nullable, usuario_id, motivo, status)
- Implementar restrição (CHECK constraint) garantindo que a denúncia tenha comentario_id OU material_id, nunca ambos
- Criar endpoint `POST /comunidade/denuncias`
- Implementar gatilho lógico no backend: se o conteúdo receber N denúncias, alterar o status dele para "em_analise" automaticamente (ocultando-o nas listagens)

**Critérios de aceitação:**
- Avisar em casos de erro de denúncia duplicada pelo mesmo usuário
- Visualizar a denúncia registrada com status "pendente" na resposta
- Ser acessado somente por usuários de perfil aluno autenticado

#### User Story 5.3.2: Moderação de comentários e materiais denunciados
Eu, como moderador, desejo revisar, aprovar ou remover conteúdos denunciados, a fim de manter o espaço de comunidade seguro e dentro das regras da plataforma.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /moderacao/denuncias` listando denúncias pendentes e carregando os dados do conteúdo denunciado (relacionamento SQL)
- Criar endpoint `PATCH /moderacao/denuncias/{id}` para o administrador aprovar (restituir conteúdo) ou remover (deletar conteúdo/arquivo)
- Atualizar automaticamente o status_moderacao do comentário ou material afetado no banco de dados

**Critérios de aceitação:**
- Visualizar denúncias pendentes em uma lista
- Filtro de pesquisa por tipo de conteúdo denunciado (Comentário ou Material)
- Ser acessado somente por usuários de perfil moderador ou administrador
---
 
## Épico 6: Dashboard Institucional (Curso e Campus)
 
### Feature 6.1: Modelagem de Curso e Campus
 
#### User Story 6.1.1: Consulta da grade curricular do curso organizada por período
Eu, como usuário (visitante ou autenticado), desejo visualizar a grade curricular de um curso organizada por período, a fim de planejar minha matrícula nas disciplinas.

**Nessa issue deve ser feito:**
- Criar endpoint REST `GET /cursos/{id}/grade` no FastAPI para consulta pública da matriz curricular.
- Implementar a consulta (Query) utilizando o SQLAlchemy para realizar o join na tabela associativa N:N entre Curso e Disciplina, respeitando o campo periodo_sugerido.
- Implementar serialização de dados utilizando Pydantic para retornar as disciplinas agrupadas ou ordenadas de forma limpa por período (ex: Período 1, Período 2, etc.).
- Garantir que a rota seja pública 

**Critérios de aceitação:**
- Visualização Estruturada: O retorno da API deve apresentar as disciplinas organizadas cronologicamente por seus respectivos períodos sugeridos.
- Acesso Público: A rota deve ser acessível publicamente por qualquer visitante ou aluno autenticado, sem exigir autenticação prévia.
- **Tratamento de Erro (404):** A API deve retornar um código HTTP 404 (Not Found) acompanhado de uma mensagem amigável caso o ID do curso informado na URL não exista no banco de dados.
- Tratamento de Curso Vazio (200): Caso o curso exista mas ainda não possua disciplinas vinculadas, a API deve retornar um código HTTP 200 com uma lista vazia controlada, em vez de quebrar a aplicação.

### Feature 6.2: Métricas Agregadas Institucionais
 
#### User Story 6.2.1: Cálculo da taxa média de formação por curso
Eu, como usuário (visitante ou autenticado), desejo visualizar a taxa média de formação de cada curso, a fim de entender o desempenho institucional geral daquele curso.
 
**Nessa issue deve ser feito:**
- Criar model SQLAlchemy `MetricaCurso` (curso_id, taxa_formacao, semestre_referencia)
- Implementar rotina de importação e processamento a partir dos dados públicos oficiais de diplomados/ingressantes da instituição
- Criar endpoint `GET /dashboard/cursos/{id}/formacao`

**Critérios de aceitação:**
- Avisar em casos de erro de curso sem dados públicos suficientes para cálculo
- Visualizar a taxa de formação por semestre em uma lista cronológica
- Ser acessado somente por usuários de perfil visitante ou autenticado (rota pública de leitura)

#### User Story 6.2.2: Cálculo de taxa de evasão por campus
Eu, como usuário (visitante ou autenticado), desejo visualizar a taxa de evasão agregada por campus, a fim de comparar o desempenho institucional entre diferentes campi da UnB.
 
**Nessa issue deve ser feito:**
- Criar rotina de agregação cruzando dados públicos de alunos evadidos por campus
- Persistir o resultado agregado em uma View Materializada no PostgreSQL para garantir alta performance nas consultas sem utilizar Redis ou ferramentas externas de cache (respeitando a ADR 01)
- Criar endpoint `GET /dashboard/campus/{id}/evasao`

**Critérios de aceitação:**
- Avisar em casos de erro de campus inexistente (HTTP 404)
- Visualizar a evasão por campus em uma lista comparativa otimizada
- Filtro de pesquisa por campus

#### User Story 6.2.3: Endpoint geral do dashboard institucional
Eu, como usuário (visitante ou autenticado), desejo acessar um endpoint único com as métricas institucionais agregadas da UnB (formação, evasão e fluxo de estudantes), a fim de alimentar a visão geral exibida na página inicial da plataforma.
 
**Nessa issue deve ser feito:**
- Criar endpoint `GET /dashboard/geral` agregando dados consolidados de `MetricaCurso` e das Views Materializadas por toda a instituição
- Implementar cálculo de fluxo de estudantes (ingressantes x concluintes x evadidos) por semestre
- Configurar atualização nativa periódica (Refresh) das visões no banco de dados

**Critérios de aceitação:**
- Visualizar as métricas institucionais agregadas em uma única resposta rápida
- Avisar em casos de erro de indisponibilidade temporária dos dados consolidados
- Ser acessado somente por usuários de perfil visitante ou autenticado (rota pública de leitura)

---

## 5. Síntese das entidades e relacionamentos

| Entidade | Responsabilidade | Relacionamentos principais |
| --- | --- | --- |
| `usuarios` | Contas e permissões | Um usuário possui várias situações, submissões, comentários e votos. |
| `cursos` | Metadados dos cursos | Associa-se a várias disciplinas por `cursos_disciplinas`. |
| `disciplinas` | Cadastro canônico das matérias | Associa-se a cursos e possui métricas, situações, conteúdos e comentários. |
| `cursos_disciplinas` | Organização curricular por curso | Cada associação referencia um curso e uma disciplina. |
| `metricas_academicas` | Indicadores históricos agregados | Cada registro referencia uma disciplina em um ano e semestre. |
| `situacoes_disciplinas` | Situação atual autodeclarada | Cada registro referencia um usuário e uma disciplina. |
| `conteudos` | Materiais e seu estado de curadoria | Cada material referencia uma disciplina e pode manter referência ao autor. |
| `comentarios` | Discussões sob pseudônimo | Cada comentário referencia usuário e disciplina e pode responder a outro comentário. |
| `votos_uteis` | Relevância das contribuições | Cada voto referencia um usuário e aponta logicamente para conteúdo ou comentário. |

Histórias não correspondem necessariamente a tabelas individuais: a HU02 utiliza três entidades, enquanto consulta, submissão e curadoria de materiais compartilham `conteudos`.

## 6. Pendências para implementação futura

As observações abaixo registram decisões ou verificações necessárias. Não representam funcionalidades já implementadas nem autorização para ampliar o escopo do produto.

| Tema | Situação identificada | Encaminhamento necessário |
| --- | --- | --- |
| Numeração dos requisitos | Há divergências entre o contexto e `docs/requisitos.md`. | Unificar os identificadores e atualizar a rastreabilidade. |
| Privacidade das situações | Há vínculo interno entre usuário e situação acadêmica. | Conciliar a política textual com a persistência prevista e definir acesso e retenção desses registros. |
| Baixa amostragem | O esquema histórico já está agregado por disciplina e semestre. | Definir tratamento no pipeline, preservando a proteção também em filtros e exportações. |
| Proveniência dos indicadores | Não há representação explícita de fonte ou versão da carga. | Definir como documentar origem, atualização e reprodutibilidade do dataset. |
| Evasão e tempo de formação | O modelo não contém os dados necessários a esses indicadores institucionais. | Detalhar histórias e dados específicos quando esse escopo for trabalhado; não inferir evasão a partir de reprovação ou trancamento. |
| Denúncias de comentários | Existe estado de moderação, mas não registro de denúncias. | Detalhar a história complementar e as informações necessárias ao fluxo. |
| Auditoria da curadoria | Apenas o estado atual do material é armazenado. | Decidir se serão registrados responsável, motivo e histórico das decisões. |
| Formatos de contribuição | A URL é obrigatória para todos os tipos de conteúdo. | Definir suporte a dicas e resumos em texto e eventual envio de arquivos. |
| Integridade dos votos | O destino do voto não possui chave estrangeira. | Definir garantia de existência e tratamento de exclusões. |
| Respostas em comentários | A referência ao comentário original não garante mesma disciplina. | Validar a associação e definir comportamento de respostas após ocultação do original. |
| Consistência de métricas | Faltam garantias completas para contagens e taxas. | Definir validações, denominadores e política de valores ausentes ou inconsistentes. |
| Datas de atualização | `DEFAULT NOW()` só fornece o valor inicial. | Garantir a atualização dos campos nas operações de alteração. |
| Exclusão de contas | O SQL remove situações, comentários e votos em cascata e preserva materiais sem autor. | Confirmar se esse comportamento atende às regras de retenção e aos efeitos desejados sobre discussões e contagens. |

## 7. Orientações para a implementação

- Evoluir o esquema por migrações versionadas do Alembic, conforme a arquitetura do projeto.
- Implementar regras de negócio no domínio e nos serviços, persistência nos repositórios e validação de entrada e saída nos schemas da API.
- Combinar restrições do banco com autorização, filtros de publicação e validações na aplicação; a estrutura SQL isolada não garante todos os critérios de aceitação.
- Utilizar os critérios de cada história como referência para testes, observando as metas de qualidade descritas nas regras de negócio.
- Tratar os registros de exemplo do SQL como dados de demonstração, sem apresentá-los como indicadores oficiais validados.

Este documento descreve as necessidades de dados e os comportamentos esperados. A conclusão de cada história deve ser verificada por sua implementação e pelos respectivos critérios de aceitação.
