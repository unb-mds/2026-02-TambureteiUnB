# 🔄 Pipeline ETL — Tamburetei UnB

Módulo de Engenharia de Dados responsável pela **Extração**, **Transformação**, **Sanitização (LGPD)** e **Carga** de dados acadêmicos públicos da Universidade de Brasília (UnB), atendendo às entregas da **Release 1 (R1)** da disciplina Métodos de Desenvolvimento de Software (MDS 2026/2 — FCTE/UnB).

---

## 🏛️ Estrutura de Diretórios

O módulo segue os princípios de separação de responsabilidades e *Clean Architecture* descritos na documentação arquitetural do projeto:

```
backend/app/pipeline/
├── extractors/            # 1. Extração de dados brutos
│   ├── base.py            # Classe abstrata BaseExtractor
│   ├── sigaa_extractor.py # Extração de turmas, docentes e componentes curriculares do SIGAA
│   └── dpo_inep_extractor.py # Extração de séries históricas e relatórios do DPO/INEP/LAI
│
├── transformers/          # 2. Transformação e regras de negócio
│   ├── base.py            # Classe abstrata BaseTransformer
│   ├── sigaa_transformer.py # Limpeza, normalização, title case e geração de slugs
│   ├── metricas_transformer.py # Validação matemática e cálculo de taxas de aprovação
│   └── sanitizer.py       # Sanitização LGPD (RN01, RN07 e RNF02)
│
├── loaders/               # 3. Carga e exportação
│   ├── base.py            # Classe abstrata BaseLoader
│   ├── db_loader.py       # Carga relacional idempotente no PostgreSQL 17 (SQLAlchemy)
│   └── export_loader.py   # Exportação de datasets públicos em CSV e JSON (RF06)
│
├── schemas/               # 4. Contratos de dados e validação
│   ├── sigaa.py           # Schemas Pydantic para turmas, disciplinas e docentes
│   └── metricas.py        # Schemas Pydantic para métricas acadêmicas agregadas
│
├── data/                  # 5. Armazenamento intermediário (Staging)
│   ├── raw/               # Arquivos brutos baixados (ignorado no Git via .gitignore)
│   └── processed/         # Datasets limpos e prontos para distribuição
│
├── config.py              # Parâmetros e caminhos de configuração do pipeline
├── runner.py              # Orquestrador unificado do fluxo de ETL (ETLRunner)
└── cli.py                 # Interface de linha de comando para terminal e Docker
```

---

## 🛡️ Conformidade com a LGPD e Regras de Negócio (Privacy by Design)

O pipeline cumpre integralmente as regras estabelecidas para o projeto:

1. **[RN01 / RNF02] Anonimato Discente:** É terminantemente proibida a persistência ou processamento de identificadores pessoais discentes como matrícula, CPF, e-mail institucional ou dados nominais de alunos. O sanitizador descarta automaticamente tais campos antes de qualquer operação.
2. **[RN07] Tratamento de Baixa Amostragem:** Turmas ou registros com amostragem inferior a **5 estudantes matriculados** têm seus números individuais de aprovação, reprovação e trancamento suprimidos no detalhamento (`amostragem_suprimida_lgpd = True`), impossibilitando a identificação indireta de discentes.

---

## 🚀 Como Executar

### 1. Via Linha de Comando (CLI)

Na raiz do diretório `backend/`:

* **Executar ingestão completa do SIGAA em modo Dry-Run (sem gravar no banco):**
  ```bash
  python -m app.pipeline.cli --source sigaa --semestre 2026.1 --dry-run
  ```

* **Executar ingestão do SIGAA persistindo no PostgreSQL:**
  ```bash
  python -m app.pipeline.cli --source sigaa --semestre 2026.1
  ```

* **Processar arquivo CSV/JSON bruto baixado:**
  ```bash
  python -m app.pipeline.cli --source sigaa --input-file app/pipeline/data/raw/turmas_2026_1.csv
  ```

* **Executar pipeline de métricas históricas (DPO/INEP):**
  ```bash
  python -m app.pipeline.cli --source metricas --ano-inicio 2021 --ano-fim 2026
  ```

* **Executar todas as fontes integradas:**
  ```bash
  python -m app.pipeline.cli --source all
  ```

### 2. Via Contêiner Docker

Executar diretamente no contêiner `backend`:

```bash
docker compose exec backend python -m app.pipeline.cli --source sigaa --dry-run
```

---

## 🧪 Testes Automatizados

A suíte de testes unitários do pipeline valida todos os contratos, regras de transformação e a política de proteção LGPD:

```bash
docker compose exec backend pytest tests/test_pipeline.py -v
```
