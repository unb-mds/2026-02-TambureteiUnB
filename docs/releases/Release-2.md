# Release-2 — Marco Final: Comunidade, Planejamento Curricular e Inteligência Acadêmica

Esta release representa o marco consolidado de entrega da **Release 2 (R2)** do projeto **Tamburetei UnB** (MDS 2026/2 - FCTE/UnB), concretizando a plataforma aberta de inteligência acadêmica com conformidade estrita à **LGPD (*Privacy by Design*)**, planejamento semanal de horários, catálogo curricular integrado aos 161 cursos da universidade e esteira de doação de dados por crowdsourcing.

---

## 1. Destaques da Release 2

* **Implantação Oficial em Produção:**
  - Aplicação implantada e disponível na raiz do domínio público: **[https://tambureteiunb.com.br/](https://tambureteiunb.com.br/)**.
  - Arquitetura de produção orquestrada via Docker Compose, com terminação TLS, proxy reverso via Caddy e proteção de borda Cloudflare.
* **Hub Pedagógico por Disciplina e Séries Históricas:**
  - Gráficos de rosca e histogramas em barras empilhadas com histórico de aprovação, reprovação (nota e falta) e trancamento.
  - Regra de proteção por amostragem mínima ($N \ge 5$) para impedir reidentificação em turmas reduzidas.
* **Planejador Semanal de Grade (`/minha-grade`):**
  - Montagem de horários sem conflitos combinatórios com identificação de docentes e turmas.
  - Geração de documento de planejamento formatado em PDF para a matrícula.
* **Ecossistema de Doação Colaborativa (Crowdsourcing Seguro):**
  - Doação de estatísticas de turmas via texto (soma 100%) ou envio de print do gráfico de pizza do SIGAA para turmas já concluídas.
  - Esteira administrativa de moderação humana com consenso por quórum visual e isolamento de imagens em volume persistente (`pizzas_data`).
* **Seção Minha Graduação e Histórico Escolar (`/perfil`):**
  - Leitura e mapeamento de grade em 10 semestres a partir do Histórico Escolar do SIGAA, calculando integralização e equivalências curriculares.
* **Catálogo e Turmas Aprimorados:**
  - Ordenação padrão de `/disciplinas` priorizando disciplinas com dados de pizza, depois históricos e por fim sem dados.
  - Separação entre abas de período atual e turmas anteriores com cards compactos, taxas estratificadas com preservação de decimais (soma exata de 100%) e link do repositório GitHub no rodapé.

---

## 2. Entregas e Funcionalidades por Módulo

### Catálogo e Dados Abertos
- Catálogo navegável com links oficiais homologados para a grade curricular do SIGAA em 161 cursos da UnB.
- Filtro por ano de catálogo da matriz curricular e cards com notas de corte históricas do PAS.
- Barra de exportação de datasets abertos agregados em formatos CSV e JSON.

### Repositório Comunitário e Privacidade
- Repositório de materiais de apoio (provas anteriores, resumos e listas) com validação de extensão e limite de 5 MiB.
- Sistema de relatos e vivências acadêmicas com pseudônimos randômicos gerados via hash com salt criptográfico.
- Fila de denúncias e moderação de conteúdos com triagem local via LLM (Ollama).

### Segurança e Contas
- Fluxo de recuperação de senha por e-mail institucional seguro via SMTP (`tambureteiunb@gmail.com`) com token de uso único (15 min).
- Autenticação JWT com isolamento estrito de histórico por usuário logado.

---

## 3. Qualidade e Métricas de Engenharia

- **Cobertura de Testes no Backend:** Superior a 70% em testes unitários e de integração (`pytest-cov`).
- **Análise de Mutação:** Índice superior a 50% de mutantes eliminados nas regras de negócio críticas (`mutmut`).
- **Testes no Frontend:** 240 testes unitários automatizados cobrindo fluxos visuais, acessibilidade e algoritmos de grade.
- **Tipagem Estática:** 100% estrita em TypeScript (`npx tsc --noEmit`) e conformidade com ESLint/Ruff.

---

## 4. Histórico de Pull Requests Integradas na Release 2

* **#308:** feat(frontend): separa turmas historicas com cards compactos e estratifica reprovacoes — @lucasssmira
* **#304:** fix(infra): torna remocao de check constraints idempotente na migracao 021 e init.sql — @thamiresellensa
* **#303:** feat(frontend): adiciona link e icone do GitHub no rodape da aplicacao — @thamiresellensa
* **#289:** docs: reestrutura README no padrao essencial de software livre — @thamiresellensa
* **#295:** docs: consolida documentacao de producao e governanca (deploy, relatorio final, security) — @bcaueLPS
* **#294:** feat(frontend): exibir pre-requisitos de disciplinas como links navegaveis — @LuisGuilherme67
* **#293:** feat(frontend): disponibilizar link para grade curricular oficial do SIGAA — @LuisGuilherme67
* **#292:** feat(frontend): tornar todos os cards de cursos e disciplinas clicaveis — @LuisGuilherme67
* **#291:** feat(perfil): orientacao do historico escolar e envio de estatisticas de turmas — @LuisGuilherme67
* **#287:** feat(frontend): banner de esclarecimento sobre coleta de dados de turmas — @bcaueLPS
* **#257:** feat(perfil): novo design da aba Minha Graduacao e grade curricular — @thamiresellensa
* **#251:** feat(auth): recuperacao e alteracao de senha por email e perfil — @thamiresellensa
* **#240 / #231:** feat(grade): planejador semanal, rascunhos locais e exportacao em PDF — @diangellis
