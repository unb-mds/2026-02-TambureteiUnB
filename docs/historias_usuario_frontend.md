## Épico 1: Autenticação e Gestão de Acesso (Frontend)

### Feature 1.1: Telas de Cadastro e Login

#### User Story 1.1.1: Tela de cadastro de novo usuário
Eu, como visitante não autenticado, desejo acessar uma tela de cadastro para informar meu nome, e-mail e senha, a fim de criar uma conta e obter permissão para interagir na plataforma.

**Nessa issue deve ser feito:**
- Criar a rota e página `/cadastro` no Next.js (App Router)
- Construir formulário estilizado com Tailwind CSS com campos de Nome, E-mail, Senha e Confirmação de Senha
- Implementar validação de formulário no cliente (e-mail válido e senha mínima de 8 caracteres)
- Integrar chamada à API (`POST /auth/register`) com tratamento de estados de carregamento
- Exibir mensagens de feedback visual em caso de sucesso ou e-mail já existente

**Critérios de aceitação:**
- Avisar em casos de erro de e-mail inválido ou campos obrigatórios não preenchidos
- Avisar em casos de erro de senhas divergentes ou fora do padrão mínimo
- Redirecionar o usuário para a tela de login após cadastro com sucesso
- Interface totalmente responsiva adaptada a dispositivos móveis

#### User Story 1.1.2: Tela de login e controle de sessão
Depende de: US 1.1.1

Eu, como usuário cadastrado, desejo realizar login na plataforma com e-mail e senha, a fim de autenticar minha sessão e acessar as funcionalidades exclusivas para alunos.

**Nessa issue deve ser feito:**
- Criar a rota e página `/login` no App Router
- Construir formulário de autenticação integrado ao endpoint `POST /auth/login`
- Armazenar o token JWT de forma segura e gerenciar o estado global de autenticação (AuthContext)
- Atualizar a barra de navegação (Navbar) para exibir o perfil do usuário logado e botão de logout

**Critérios de aceitação:**
- Avisar em casos de erro de credenciais inválidas (e-mail ou senha incorretos)
- Redirecionar o usuário para a página inicial ou para a página anterior após login bem-sucedido
- Permitir encerrar a sessão através do botão de logout, limpando o token e atualizando a interface

---

## Épico 2: Navegação e Catálogo de Cadeiras (Frontend)

### Feature 2.1: Catálogo Curricular e Busca de Disciplinas

#### User Story 2.1.1: Catálogo curricular organizado por período
Eu, como visitante ou estudante, desejo navegar pela grade curricular de um curso organizada por semestres sugeridos, a fim de explorar as matérias obrigatórias e optativas.

**Nessa issue deve ser feito:**
- Criar a rota e página `/cadeiras` no App Router
- Implementar seletor de cursos com opção padrão para os cursos da UnB FCTE (Gama)
- Desenvolver componentes de cards para exibição das disciplinas agrupadas por período (1º período, 2º período, optativas)
- Exibir em cada card o código da matéria, nome oficial, departamento, créditos e badge médio de aprovação
- Implementar skeletons de carregamento para transições suaves

**Critérios de aceitação:**
- Visualizar as disciplinas organizadas cronologicamente por período sugerido
- Diferenciar visualmente matérias obrigatórias de matérias optativas
- Permitir clicar em qualquer card para ser redirecionado para a página modular `/cadeiras/:slug`
- Tratar estados de indisponibilidade da API com mensagem amigável de erro

#### User Story 2.1.2: Busca dinâmica e filtros de disciplinas
Depende de: US 2.1.1

Eu, como usuário, desejo pesquisar disciplinas por nome ou código acadêmico, a fim de localizar rapidamente a matéria que desejo consultar.

**Nessa issue deve ser feito:**
- Criar componente de barra de pesquisa com *debounce* na página do catálogo
- Implementar filtros rápidos por departamento acadêmico (ex.: FGA, MAT) e turno
- Integrar os filtros com os parâmetros de consulta da API (`GET /catalogo/cadeiras`)
- Exibir estado de lista vazia quando nenhum resultado corresponder aos critérios informados

**Critérios de aceitação:**
- Atualizar a listagem de disciplinas dinamicamente conforme o usuário digita
- Limpar filtros com um clique retornando à visão curricular completa
- Exibir mensagem amigável ("Nenhuma matéria encontrada") quando a busca não retornar registros

---

## Épico 3: Hub Modular da Disciplina (`/cadeiras/:slug`)

### Feature 3.1: Visão Geral e Indicadores Analíticos

#### User Story 3.1.1: Página modular da matéria com navegação por abas
Eu, como usuário, desejo acessar a página específica de uma disciplina organizada em abas temáticas, a fim de consultar ementa, métricas e materiais de forma centralizada.

**Nessa issue deve ser feito:**
- Criar a rota dinâmica `/cadeiras/[slug]` no Next.js
- Implementar cabeçalho com metadados principais: código, nome oficial, créditos e carga horária
- Criar sistema de abas navegáveis: *Visão Geral & Estatísticas*, *Dificuldades & Dicas*, *Resumos ("Leites")*, *Links Úteis* e *Provas Públicas*
- Renderizar a ementa oficial formatada com suporte a Markdown (`react-markdown`)

**Critérios de aceitação:**
- Alternar entre as abas sem recarregar a página
- Exibir a ementa oficial e objetivos formatados corretamente
- Redirecionar para página 404 customizada caso o slug da matéria não exista

#### User Story 3.1.2: Dashboards de desempenho histórico com filtro temporal
Depende de: US 3.1.1

Eu, como usuário, desejo visualizar gráficos analíticos de aprovação, reprovação e trancamento ao longo dos anos, a fim de compreender a dificuldade histórica da disciplina.

**Nessa issue deve ser feito:**
- Integrar biblioteca de gráficos interativos (ex.: Recharts ou Chart.js) na aba de estatísticas
- Desenvolver gráficos de linhas ou barras para exibir taxas de aprovação, reprovação por nota, reprovação por falta e trancamentos por semestre
- Criar componente de filtro por intervalo de anos (ex.: 2020 a 2024)
- Destacar os dados oficiais históricos de forma separada das avaliações do crowdsourcing

**Critérios de aceitação:**
- Exibir gráficos interativos e responsivos que se adaptem a telas de smartphones e desktops
- Atualizar os gráficos dinamicamente ao alterar o intervalo de anos selecionado
- Exibir tooltips informativas ao passar o cursor ou tocar nos pontos do gráfico

---

## Épico 4: Crowdsourcing e Experiência Discente (Frontend)

### Feature 4.1: Registro de Situação Discente ("Já cursei")

#### User Story 4.1.1: Componente de registro de situação discente no topo da cadeira
Depende de: US 1.1.2, US 3.1.1

Eu, como estudante autenticado, desejo registrar minha situação na matéria através de botões no topo da página da cadeira, a fim de alimentar as estatísticas comunitárias sem expor meu nome.

**Nessa issue deve ser feito:**
- Criar componente visual de votação rápida com as opções: `Aprovado`, `Reprovado por Nota`, `Reprovado por Falta` e `Trancado`
- Destacar a opção já selecionada anteriormente pelo usuário autenticado
- Integrar chamada à API (`POST /cadeiras/{id}/situacao`) com atualização reativa do contador
- Exibir modal ou aviso convidando visitantes não autenticados a fazerem login para votar

**Critérios de aceitação:**
- Permitir que o aluno registre ou altere seu status com apenas um clique
- Atualizar imediatamente os números de crowdsourcing na tela após a confirmação
- Garantir visualmente a mensagem de que a participação é anônima e desvinculada publicamente

### Feature 4.2: Repositório de Conteúdos e Upvotes

#### User Story 4.2.1: Listagem de materiais de apoio categorizados com botão de upvote
Depende de: US 3.1.1

Eu, como estudante, desejo consultar resumos, links úteis e provas antigas com botão de voto útil, a fim de identificar rapidamente os conteúdos mais recomendados pelos colegas.

**Nessa issue deve ser feito:**
- Construir as listas de materiais nas abas correspondentes da matéria
- Desenvolver componente de botão de *Upvote* com contador numérico de relevância
- Integrar chamada à API para registrar ou remover o voto útil do usuário
- Adicionar ordenação dos materiais pelos mais votados

**Critérios de aceitação:**
- Destacar visualmente o botão de upvote quando o usuário logado já tiver votado no item
- Impedir múltiplos votos úteis no mesmo item pelo mesmo usuário
- Disponibilizar links externos clicáveis e botão para download de enunciados de provas públicas

#### User Story 4.2.2: Modal de submissão colaborativa de materiais
Depende de: US 1.1.2, US 3.1.1

Eu, como estudante autenticado, desejo submeter novos links e resumos através de um formulário modal, a fim de colaborar com materiais de apoio para outros discentes.

**Nessa issue deve ser feito:**
- Criar botão "Adicionar Material" visível nas abas de conteúdos da disciplina
- Construir modal com campos: Título, Tipo (Link Útil, Resumo, Prova Antiga, Dica), URL/Origem e Semestre
- Implementar validação dos campos e chamada à API (`POST /materiais`)
- Exibir aviso sobre a regra ética que proíbe gabaritos de listas contínuas vigentes

**Critérios de aceitação:**
- Avisar em casos de campos obrigatórios não preenchidos ou URL inválida
- Informar ao estudante que o material passará pela moderação antes de se tornar público
- Fechar o modal e exibir notificação de envio realizado com sucesso

---

## Épico 5: Espaço de Comunidade e Moderação (Frontend)

### Feature 5.1: Relatos e Comentários da Comunidade

#### User Story 5.1.1: Seção de comentários sob pseudônimo com suporte a threads
Depende de: US 1.1.2, US 3.1.1

Eu, como estudante autenticado, desejo publicar relatos de dificuldades e responder a comentários sob pseudônimo (alias), a fim de trocar vivências sobre a matéria sem expor minha identidade real.

**Nessa issue deve ser feito:**
- Construir a seção de discussões na aba de *Dificuldades & Dicas* da disciplina
- Listar comentários exibindo o pseudônimo (`autor_alias`), data e texto do relato
- Criar formulário de comentário para usuários autenticados com campo de tópico e texto
- Implementar botão "Responder" para permitir respostas aninhadas em árvore (*threads*)
- Exibir aviso em destaque sobre conduta ética e proibição de ataques a docentes (RN04)

**Critérios de aceitação:**
- Garantir que o nome real e e-mail do autor não sejam exibidos publicamente
- Permitir publicação de comentários apenas para usuários logados
- Renderizar respostas aninhadas organizadas visualmente abaixo do comentário pai

### Feature 5.2: Painel de Moderação (Curadoria)

#### User Story 5.2.1: Painel administrativo para curadoria de materiais pendentes
Depende de: US 1.1.2

Eu, como moderador ou administrador, desejo acessar uma interface de curadoria, a fim de aprovar ou recusar materiais submetidos pela comunidade antes de sua publicação oficial.

**Nessa issue deve ser feito:**
- Criar rota protegida `/moderacao` com verificação de perfil (`MODERATOR` ou `ADMIN`)
- Construir tabela com a lista de materiais pendentes exibindo título, tipo, link e semestre
- Adicionar botões de ação rápida: "Aprovar" (verde) e "Recusar" (vermelho)
- Integrar chamadas à API de moderação com atualização em tempo real da lista

**Critérios de aceitação:**
- Bloquear o acesso e redirecionar usuários com perfil de estudante comum ou visitantes
- Remover o item da fila imediatamente após a ação de aprovar ou recusar
- Exibir mensagem informativa quando não houver materiais pendentes de curadoria

---

## Épico 6: Página Inicial e Exportação de Dados

### Feature 6.1: Dashboard Geral Institucional

#### User Story 6.1.1: Visão geral de métricas da UnB na página inicial
Eu, como visitante ou estudante, desejo acessar a página inicial com indicadores agregados da UnB, a fim de ter um panorama institucional rápido antes de buscar cadeiras específicas.

**Nessa issue deve ser feito:**
- Construir a página inicial (`/`) com design limpo utilizando Tailwind CSS
- Criar cards de destaques institucionais: total de matérias mapeadas, média histórica de aprovação e fluxo de formação
- Disponibilizar barra de busca central com redirecionamento direto para a matéria pesquisada
- Inserir botão de exportação pública do dataset analítico em formatos CSV e JSON

**Critérios de aceitação:**
- Apresentar a interface inicial de forma clara, organizada e convidativa
- Permitir download dos arquivos de dados abertos com apenas um clique
- Interface totalmente responsiva e compatível com as diretrizes de acessibilidade (a11y)