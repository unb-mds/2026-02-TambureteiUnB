---
name: tamburetei-sprint
description: Planejamento e execução de Sprints de 5 dias do Tamburetei UnB, organizando o trabalho por Backend, Frontend, Banco de Dados, Arquitetura, Integração e Testes/Qualidade, criando uma Milestone e 6 Issues no GitHub após aprovação.
---

# Skill: Sprint do Tamburetei UnB

## Objetivo

Gerenciar o ciclo de planejamento de uma Sprint do Tamburetei UnB.

Cada Sprint possui duração de 5 dias e deve resultar em:

- 1 Milestone no GitHub;
- 6 Issues;
- todas as Issues associadas à Milestone;
- distribuição do trabalho entre as áreas do projeto;
- registro das dependências entre áreas.

---

# Áreas da Sprint

Toda Sprint deve analisar obrigatoriamente:

1. Backend
2. Frontend
3. Banco de Dados
4. Arquitetura
5. Integração
6. Testes/Qualidade

A análise deve considerar o estado real do projeto.

Não criar tarefas apenas para preencher uma área.

Se determinada área não possuir uma necessidade independente, uma tarefa relacionada pode contemplar uma dependência ou atividade necessária naquela área, desde que exista evidência no projeto.

---

# Duração

Cada Sprint possui exatamente 5 dias.

Formato:

Sprint N — DD/MM/YYYY a DD/MM/YYYY

A Milestone deve utilizar esse período no nome ou descrição.

---

# Fontes de informação

Antes de planejar uma Sprint, analisar:

- Issues abertas e fechadas;
- Milestones existentes;
- Pull Requests;
- commits recentes;
- branches relevantes;
- estrutura atual do código;
- estado do frontend;
- estado do backend;
- banco de dados e migrations;
- documentação de arquitetura;
- bloqueios e dependências.

Usar:

- `github-project-triage` para análise do GitHub;
- `tamburetei-dev` para regras técnicas, arquitetura e qualidade;
- `prd-to-issues` somente quando existir um PRD ou especificação já aprovada que precise ser transformada em Issues.

Não duplicar Issues existentes.

Não inventar funcionalidades, bugs, requisitos ou estados do projeto.

---

# Planejamento

Antes de criar qualquer coisa no GitHub, apresentar:

## Sprint N

Período: DD/MM/YYYY → DD/MM/YYYY

### Milestone

`Sprint N — DD/MM/YYYY a DD/MM/YYYY`

### Issues propostas

#### 1. Backend

`tipo(backend): descrição`

Descrição completa da tarefa.

#### 2. Frontend

`tipo(frontend): descrição`

Descrição completa da tarefa.

#### 3. Banco de Dados

`tipo(database): descrição`

Descrição completa da tarefa.

#### 4. Arquitetura

`tipo(arquitetura): descrição`

Descrição completa da tarefa.

#### 5. Integração

`tipo(integracao): descrição`

Descrição completa da tarefa.

#### 6. Testes/Qualidade

`tipo(qualidade): descrição`

Descrição completa da tarefa.

### Dependências

Informar claramente quando uma Issue depender de outra área.

Exemplo:

Frontend depende do endpoint implementado no Backend.

### Evidências

Para cada tarefa, indicar a Issue, PR, arquivo, commit ou outro elemento do projeto que justifique a tarefa.

---

# Aprovação obrigatória

O agente NÃO deve criar a Milestone ou as Issues imediatamente.

Primeiro deve apresentar o planejamento completo.

Somente após confirmação explícita do usuário, por exemplo:

`sim, pode criar`

o agente pode executar as alterações no GitHub.

---

# Criação no GitHub

Após aprovação:

1. Criar a Milestone da Sprint.
2. Criar exatamente 6 Issues.
3. Associar todas as Issues à Milestone.
4. Usar os títulos no padrão:

`tipo(escopo): descrição`

5. Utilizar o padrão de Issue do projeto:

```md
## Descrição

...

---

## Objetivos

- ...

---

## Tópicos Abordados

### ...

- ...

---

## Atividades

- [ ] ...