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
