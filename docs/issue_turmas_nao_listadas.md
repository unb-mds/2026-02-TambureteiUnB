# [BUG] Turmas não são listadas no frontend devido à ausência do ID da disciplina e incompatibilidade no endpoint /turmas

## 📌 Descrição do Problema
Na página de detalhes de uma disciplina (`/disciplinas/[slug]`), a seção de **Turmas Ofertadas** exibe permanentemente o estado vazio (*"Nenhuma turma ofertada para a disciplina"*), mesmo quando existem turmas cadastradas no banco de dados para aquela cadeira no semestre letivo.

Após a remoção dos dados mockados na PR `feat/listagem-turmas-reais`, a integração real falha silenciosamente e nenhuma turma é renderizada na interface.

---

## 🔍 Análise da Causa Raiz

1. **Ausência do campo `id` no Schema Pydantic da Disciplina (Backend):**
   - O frontend precisa do `id` numérico da disciplina para consultar suas turmas.
   - Ao carregar a página por slug (`GET /cadeiras/{slug}`), o endpoint retorna o schema `DisciplinaResponse` (que herda de `DisciplinaResumo`).
   - No arquivo `backend/app/api/schemas/disciplina.py`, o schema **não possui o campo `id`**.
   - Consequentemente, o backend não serializa o `id` da entidade no JSON de resposta, fazendo com que no frontend o campo `discipline.id` chegue sempre como `undefined`.

2. **Incompatibilidade de Parâmetros no Endpoint de Turmas (Backend):**
   - O endpoint `GET /turmas` em `backend/app/api/routers/turmas.py` exige estritamente um `disciplina_id: int` obrigatório via Query Param.
   - O endpoint não aceita `disciplina_slug` como parâmetro alternativo.

3. **Bloqueio no Frontend:**
   - Em `frontend/src/app/disciplinas/[slug]/page.tsx`, o hook `useEffect` possui uma validação:
     ```typescript
     if (typeof disciplinaId !== "number" || !Number.isFinite(disciplinaId) || disciplinaId <= 0) {
       setClasses([]);
       return;
     }
     ```
   - Como `disciplinaId` é `undefined`, a função retorna precocemente, aborta a consulta à API e define a lista de turmas como vazia (`classes = []`), disparando o `ClassEmptyState`.
   - *Nota:* Anteriormente, esse erro passava despercebido porque a requisição falhava com HTTP 422 e caía em um bloco `catch` que carregava turmas mockadas de `frontend/src/mocks/turmas.ts`. Com a remoção dos mocks, o problema veio à tona.

---

## 🛑 Passos para Reproduzir

1. Subir o ambiente localmente via Docker (`docker compose up -d`).
2. Popular o banco com dados de disciplinas e turmas (ex: `sample_turmas.csv` ou pipeline ETL).
3. Acessar qualquer disciplina no frontend: `http://localhost:3000/disciplinas/calculo-1` (ou qualquer outro slug válido com turmas cadastradas).
4. Rolar até a seção **Turmas Ofertadas**.
5. **Comportamento observado:** É exibido o componente `ClassEmptyState` informando que não há turmas ofertadas.
6. **Comportamento esperado:** As turmas cadastradas para a disciplina e semestre devem ser listadas em formato de cards com docente, horário, local e taxa de ocupação.

---

## 🛠️ Solução Proposta

### 1. Backend (`backend/app/api/schemas/disciplina.py`)
- Adicionar o campo `id: Optional[int] = None` (ou `int`) na classe `DisciplinaResumo`, permitindo que tanto a listagem geral quanto a busca detalhada por slug retornem o `id` da disciplina.

### 2. Backend (`backend/app/api/routers/turmas.py` e `turma_service.py`)
- Tornar o parâmetro `disciplina_id` opcional e adicionar o parâmetro alternativo `disciplina_slug: Optional[str] = None`.
- Se `disciplina_slug` for fornecido em vez de `disciplina_id`, o serviço busca a disciplina pelo slug e obtém seu `id`.
- Retornar erro `400 Bad Request` apenas se nem `disciplina_id` nem `disciplina_slug` forem informados.

### 3. Frontend (`frontend/src/services/disciplineService.ts` e `page.tsx`)
- Atualizar a interface `BackendDisciplinaResumo` / `BackendDisciplinaResponse` para garantir a tipagem de `id: number`.
- No método `getClassesByDiscipline`, permitir o envio de `disciplina_id` ou `slug`.
- No `useEffect` de `page.tsx`, consumir o `discipline.id` retornado pela API ou utilizar o `slug` da rota como fallback seguro.

---

## ✅ Critérios de Aceitação (DoD)

- [ ] `GET /cadeiras/{slug}` retorna o campo `id` no payload JSON.
- [ ] `GET /turmas` aceita `disciplina_id` (inteiro) OU `disciplina_slug` (string).
- [ ] O frontend carrega e renderiza com sucesso os cards de turmas reais ao navegar para `/disciplinas/[slug]`.
- [ ] O estado de carregamento (*skeleton*) e estado de erro (*retry*) continuam funcionando adequadamente.
- [ ] Testes automatizados do backend (`pytest`) e testes de componentes do frontend executam com sucesso.

---

## 📁 Arquivos Relacionados
- `backend/app/api/schemas/disciplina.py`
- `backend/app/api/routers/turmas.py`
- `backend/app/services/turma_service.py`
- `frontend/src/services/disciplineService.ts`
- `frontend/src/app/disciplinas/[slug]/page.tsx`
- `frontend/src/types/disciplina.ts`
