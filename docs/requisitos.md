# 📋 Engenharia de Requisitos

Esta seção documenta a especificação de requisitos do **Tamburetei UnB**, definindo o escopo funcional, os atributos de qualidade do sistema e a priorização das entregas no modelo ágil de MDS 2026/2.

---

## 👥 Perfis de Usuários (Atores)

| Perfil | Descrição | Permissões no Sistema |
| :--- | :--- | :--- |
| **Visitante** | Usuário anônimo sem login (estudantes, calouros, comunidade externa). | Acesso livre a dashboards analíticos, ementas, links úteis, resumos ("leites"), provas públicas e comentários. Não pode postar nem votar. |
| **Estudante** | Usuário cadastrado e autenticado na plataforma (apenas Nome, E-mail e Senha). | Todas as permissões de visitante + registrar situação na disciplina ("Já cursei"), submeter novos materiais, enviar comentários sob *alias* e votar (upvote). |
| **Moderador / Admin** | Membro da equipe com privilégios de curadoria e governança. | Todas as permissões anteriores + fila de moderação para aprovar/recusar materiais submetidos e moderar comentários denunciados. |

---

## ⚙️ Requisitos Funcionais (RF)

### Módulo 1: Autenticação e Gestão de Acesso
* **[RF01] Cadastro Enxuto e Seguro:** O sistema deve permitir o cadastro de usuários solicitando apenas `Nome`, `E-mail` e `Senha`. Em conformidade com a LGPD e Privacy by Design, **não** serão solicitados matrícula, CPF ou histórico acadêmico nominal.
* **[RF02] Autenticação Stateless:** O sistema deve autenticar usuários e emitir tokens JWT com expiração segura para requisições autenticadas.
* **[RF03] Controle de Permissões:** O sistema deve restringir o acesso a endpoints protegidos (envio de comentários, submissão de materiais e votos) apenas a usuários com token válido.

### Módulo 2: Catálogo e Navegação de Cursos
* **[RF04] Catálogo de Cadeiras:** O sistema deve exibir a grade curricular navegável por curso, departamento e período sugerido (1º período, 2º período, optativas).
* **[RF05] Busca Rápida:** O sistema deve permitir pesquisar disciplinas por nome ou código acadêmico.
* **[RF06] Exportação de Dados Abertos:** O sistema deve disponibilizar botão de download do conjunto de dados analíticos públicos em formato CSV ou JSON.

### Módulo 3: Hub Modular da Disciplina (`/cadeiras/:slug`)
* **[RF07] Painel Geral e Ementa:** O sistema deve renderizar os dados canônicos da matéria (ementa, carga horária, créditos e departamento) com suporte a formatação Markdown.
* **[RF08] Dashboards de Desempenho Histórico:** O sistema deve exibir gráficos temporais com taxas de aprovação, reprovação (por nota e por falta) e trancamento por ano/semestre, com filtro por intervalo de anos.
* **[RF09] Registro de Situação pelo Aluno ("Já cursei"):** O sistema deve permitir que um estudante autenticado registre seu status na disciplina: `Aprovado`, `Reprovado por Nota`, `Reprovado por Falta` ou `Trancado`.
* **[RF10] Repositório de Conteúdos:** O sistema deve disponibilizar abas categorizadas para:
  * Resumos de matérias (*"leites"*);
  * Links úteis (playlists no YouTube, livros recomendados, repositórios de exercícios);
  * Enunciados de provas públicas de semestres anteriores.
* **[RF11] Dificuldades Comuns e Dicas:** O sistema deve disponibilizar um repositório temático dos tópicos mais complexos da disciplina acompanhados de orientações práticas de estudo.
* **[RF12] Comentários da Comunidade:** O sistema deve permitir o envio de comentários e dúvidas sobre a disciplina, exibidos publicamente de forma desvinculada da identidade nominal do autor (sob *alias*), com suporte a respostas aninhadas (threads).

### Módulo 4: Colaboração e Curadoria
* **[RF13] Submissão de Materiais:** O sistema deve fornecer formulário para alunos autenticados enviarem novos links úteis, resumos ou enunciados de provas públicas.
* **[RF14] Voto Útil (Upvotes):** O sistema deve permitir que usuários votem em dicas, resumos e comentários úteis, servindo como critério de ordenação dos materiais mais relevantes.
* **[RF15] Fila de Moderação:** O sistema deve fornecer aos moderadores uma interface administrativa para aprovar ou rejeitar materiais submetidos e moderar relatos sinalizados.

---

## 🛡️ Requisitos Não-Funcionais (RNF)

* **[RNF01] Desempenho e Latência:** Consultas de busca e carregamento de dados analíticos devem responder em menos de **300 ms** em condições normais, utilizando consultas otimizadas e índices no PostgreSQL 17 (sem Redis).
* **[RNF02] Privacidade e LGPD (Privacy by Design):**
  * O sistema **não** armazena identificadores institucionais diretos (matrícula, CPF, IRA).
  * Votos de aprovação e comentários são anonimizados na exibição pública.
  * Microdados históricos do DPO/INEP de turmas com menos de 5 alunos são consolidados no acumulado geral para evitar identificação indireta.
* **[RNF03] Segurança e Criptografia:** Senhas devem ser armazenadas utilizando hash forte com bcrypt. Comunicação via HTTPS e consultas protegidas contra SQL Injection pelo SQLAlchemy ORM.
* **[RNF04] Arquitetura em Camadas:** O backend FastAPI deve respeitar a separação estrita de responsabilidades: `api/` (routers/schemas), `domain/` (lógica pura), `services/` (casos de uso), `repositories/` (SQLAlchemy) e `models/` (entidades).
* **[RNF05] Versionamento Database-as-Code:** Toda e qualquer evolução do esquema do banco de dados deve ser executada através de migrações versionadas do **Alembic**.
* **[RNF06] Reprodutibilidade em Containers:** Toda a aplicação deve ser executável via `docker compose up` sem comandos manuais no sistema operacional do desenvolvedor.
* **[RNF07] Responsividade:** A interface web (Next.js + Tailwind CSS) deve ser adaptável para smartphones, tablets e desktops.

---

## 🗺️ Matriz de Rastreabilidade por Release

| Requisito | Descrição | Release | Status |
| :--- | :--- | :--- | :--- |
| **RF01, RF02, RF03** | Autenticação simples, sessão JWT e controle de perfis | R1 / R2 | Planejado |
| **RF04, RF05, RF06** | Catálogo, busca de disciplinas e exportação de dados | R1 | Em andamento |
| **RF07, RF08** | Ementas oficiais e painéis de indicadores DPO/INEP | R1 | Em andamento |
| **RF09, RF10, RF11** | Crowdsourcing de situação, resumos e dificuldades | R2 | Planejado |
| **RF12, RF13, RF14, RF15** | Comentários anônimos, submissões, upvotes e moderação | R2 | Planejado |
| **RNF01 a RNF07** | Desempenho, LGPD, camadas, Alembic e Docker | R1 & R2 | Ativo |
