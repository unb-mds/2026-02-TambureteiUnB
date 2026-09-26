# 🚀 Como Popular o Banco de Dados (Guia Rápido do Time)

Este guia prático foi criado para orientar todos os membros do grupo sobre **como popular o banco de dados local** (PostgreSQL) com dados reais do SIGAA da UnB, matrizes curriculares dos cursos e métricas históricas de desempenho.

---

## ⚡ Pré-requisitos

Antes de executar qualquer comando, certifique-se de que os contêineres Docker do projeto estão rodando e que as migrações do banco estão aplicadas:

```bash
# 1. Iniciar os contêineres (PostgreSQL, Backend e Adminer)
docker compose up -d

# 2. Garantir que todas as tabelas e migrações estão atualizadas
docker compose exec backend alembic upgrade head
```

---

## 🎯 1. Comando Recomendado para Desenvolvimento (FGA — Campus Gama)

Para o desenvolvimento diário, **não é necessário raspar a universidade inteira**. O comando abaixo extrai e popula tudo sobre o campus do Gama (**departamento 673**) para o semestre **2026.2**:

```bash
docker compose exec backend python -m app.pipeline.cli --source sigaa --departamento 673 --semestre 2026.2
```

*(Tempo estimado: cerca de 30 a 50 segundos)*

### O que este comando faz automaticamente:
1. **Cursos:** Insere e atualiza os 6 cursos da FGA (Engenharia de Software, Aeroespacial, Automotiva, Eletrônica, Energia e ABI).
2. **Disciplinas:** Cadastra mais de 350 matérias presentes nas matrizes da FGA e ofertas ativas, incluindo:
   - Ementas oficiais, carga horária e créditos.
   - **Pré-requisitos** e co-requisitos com expressões lógicas oficiais.
   - **Equivalências bidirecionais** (ex.: `FGA0161` $\leftrightarrow$ `FGA0302`).
3. **Vínculos Curriculares (`cursos_disciplinas`):** Conecta cada matéria ao seu respectivo curso, definindo o período sugerido e a **natureza** (`Obrigatoria`, `Optativa`, `Complementar`).
4. **Professores e Turmas:** Cadastra docentes da FGA e as turmas abertas, vinculando horários, salas e co-docências na tabela `turmas_professores`.

---

## 🌐 2. Populando Todos os Departamentos e Cursos da UnB

Se você precisar de dados de toda a universidade (Darcy Ribeiro, FGA, FCE e FUP):

### Apenas Cursos e Turmas da UnB (Mais Rápido):
```bash
docker compose exec backend python -m app.pipeline.cli --source sigaa --semestre 2026.2 --todos-cursos
```

### UnB Completa com Matrizes de Todos os Cursos:
```bash
docker compose exec backend python -m app.pipeline.cli --source sigaa --semestre 2026.2 --todos-cursos --todos-curriculos
```
> ⏱️ **Nota:** Como a UnB possui mais de 150 cursos de graduação e mais de 200 departamentos, a opção com `--todos-curriculos` realiza centenas de requisições ao SIGAA e pode levar alguns minutos.

---

## 📈 3. Populando Métricas Históricas de Aprovação (DPO / INEP)

Para carregar as séries históricas de aprovação, reprovação por nota, reprovação por falta e trancamentos:

```bash
docker compose exec backend python -m app.pipeline.cli --source metricas
```

Ou se quiser rodar **SIGAA + Métricas** em um único comando:
```bash
docker compose exec backend python -m app.pipeline.cli --source all --departamento 673 --semestre 2026.2
```

---

## 🔍 4. Modo de Simulação / Teste (`--dry-run`)

Se você quiser testar o pipeline sem fazer nenhuma alteração no banco de dados, adicione a flag `--dry-run`:

```bash
docker compose exec backend python -m app.pipeline.cli --source sigaa --departamento 673 --semestre 2026.2 --dry-run
```
Ele apenas extrai, higieniza os dados e gera os arquivos `.json` e `.csv` na pasta `backend/app/pipeline/data/processed/`.

---

## 🧹 5. Como Zerar o Banco de Dados (Reset Completo)

Caso você queira apagar todos os dados de teste e recomeçar a população do zero:

```bash
docker compose exec backend python -c "
from app.core.database import engine
from sqlalchemy import text

tables = [
    'comentarios', 'votos_uteis', 'conteudos', 'situacoes_disciplinas',
    'metricas_academicas', 'metricas_consolidadas', 'turmas_professores',
    'cursos_disciplinas', 'turmas', 'professores', 'disciplinas',
    'cursos', 'usuarios'
]

with engine.begin() as conn:
    conn.execute(text('TRUNCATE TABLE ' + ', '.join(tables) + ' RESTART IDENTITY CASCADE;'))
print('Banco de dados zerado com sucesso!')
"
```

---

## ✅ 6. Como Verificar se os Dados Foram Inseridos

Depois de rodar o comando de carga, você pode conferir os dados de 3 formas:

### 1. Via Terminal (SQL rápido):
```bash
docker compose exec db psql -U postgres -d tamburetei -c "
SELECT 
    d.codigo, 
    d.nome, 
    d.pre_requisitos, 
    d.equivalencias, 
    c.nome AS curso, 
    cd.natureza 
FROM disciplinas d 
JOIN cursos_disciplinas cd ON d.id = cd.disciplina_id 
JOIN cursos c ON cd.curso_id = c.id 
WHERE d.codigo IN ('FGA0168', 'FGA0302', 'FGA0161') 
LIMIT 10;
"
```

### 2. Pela Interface do Swagger da API:
Abra no navegador: **[http://localhost:8000/docs](http://localhost:8000/docs)**  
- Teste a rota `GET /cadeiras` para listar o catálogo.
- Teste a rota `GET /cadeiras/metodos-de-desenvolvimento-de-software` ou `/cadeiras/engenharia-e-ambiente` para ver detalhes, pré-requisitos clicáveis e cursos vinculados.

### 3. Pelo Adminer (Interface Visual do Banco):
Abra no navegador: **[http://localhost:8080](http://localhost:8080)** (ou porta 8085, conforme `.env`)
- **Sistema:** PostgreSQL
- **Servidor:** `db`
- **Usuário:** `postgres`
- **Senha:** `postgres` (ou a definida no seu `.env`)
- **Base de dados:** `tamburetei`
