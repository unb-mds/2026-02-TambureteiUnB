# Tamburetei UnB — Frontend

Interface web desenvolvida em Next.js (App Router), React 19 e Tailwind CSS para visualização de métricas, histórico acadêmico e turmas ofertadas da Universidade de Brasília (UnB).

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+
- npm

### 1. Instalar dependências
```bash
npm install
```

### 2. Rodar em desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 3. Scripts úteis
- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Gera o build de produção otimizado
- `npm run start`: Inicia a aplicação em modo produção
- `npm run lint`: Executa a análise estática com ESLint
- `npx tsc --noEmit`: Executa a checagem estática de tipos do TypeScript

---

## 🧩 Componentes de Interface

A arquitetura do frontend conta com componentes modulares, acessíveis e reutilizáveis organizados em `src/components`:

### `CardTurma` (`src/components/CardTurma.tsx`)

Componente responsável por exibir as informações essenciais de cada turma ofertada para uma disciplina no semestre letivo vigente.

- **Função:**
  - Apresenta de forma visual e consolidada os dados da turma: código identificador, docente responsável, horários semanais, local/sala e taxa de preenchimento de vagas.

- **Badges de Identificação e Turno:**
  - **Identificador da Turma:** Badge de destaque com o código da turma (ex.: `Turma 01`, `Turma 02`) estilizado com as cores temáticas do sistema (`bg-[#EDE9FD] text-[#5B4BDB]`).
  - **Turno de Oferta:** Badges semânticos com paleta de cores contextual para rápida identificação:
    - **Diurno:** Tons de âmbar (`bg-amber-50 text-amber-700 border-amber-200/80`).
    - **Vespertino:** Tons de laranja (`bg-orange-50 text-orange-700 border-orange-200/80`).
    - **Noturno:** Tons de índigo (`bg-indigo-50 text-indigo-700 border-indigo-200/80`).

- **Indicador de Ocupação e Vagas Esgotadas:**
  - **Barra de Progresso Acessível:** Implementa a role semântica `role="progressbar"` com atributos ARIA (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`) e transição suave de largura proporcional ao percentual de ocupação (`vagasOcupadas / totalVagas * 100`).
  - **Vagas Abertas:** Indicador em verde (`#10B981` / `#067A59`), sinalizando que ainda há vagas disponíveis para matrícula.
  - **Indicador de Vagas Esgotadas:** Quando `vagasOcupadas >= totalVagas`, o componente exibe um badge visual `Esgotada` em vermelho (`bg-rose-100 text-rose-700`) e a barra de progresso adota a cor de alerta (`bg-rose-500` / `text-rose-600`).

### Outros Componentes do Sistema
- **`Navbar`**: Barra de navegação superior global com links de cursos, disciplinas e acesso de usuário.
- **`Footer`**: Rodapé institucional com links de apoio e informações do projeto Tamburetei.
- **`Pagination`**: Controle de paginação para listas com cálculo dinâmico de páginas.
- **`Button`**: Botão estilizado com suporte a múltiplas variantes e estados.
- **`Input`**: Campo de entrada customizado para formulários e filtros de busca.
- **`StoolIllustration`**: Ilustração SVG temática do tamborete que representa a identidade visual da aplicação.
