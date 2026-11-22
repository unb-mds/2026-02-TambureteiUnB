# Notas de corte PAS

## Consulta

Início e Cursos mostram um resumo compacto da referência PAS mais recente: ciclo, Sistema Universal, argumento final mínimo e aviso de ingresso conjunto quando aplicável. No detalhe do curso, a seta abre o histórico e as explicações; a seção começa recolhida e aceita navegação por teclado.

A referência corresponde ao menor argumento final entre os selecionados do boletim. Não representa necessariamente o último convocado ou matriculado, nem garante ingresso em outra edição. Argumentos negativos são válidos; ausência não é zero.

## Fontes e cobertura

Os seis boletins indicados na [página oficial do Cebraspe](https://www.cebraspe.org.br/pas-unb/publicacoes/) cobrem os ciclos 2018–2020 a 2023–2025. O último usa a versão V5 indicada pelo índice oficial. Somente o Sistema Universal está disponível nesta entrega.

| Ciclo | Ofertas extraídas |
| --- | ---: |
| 2023–2025 | 96 |
| 2022–2024 | 54 |
| 2021–2023 | 98 |
| 2020–2022 | 99 |
| 2019–2021 | 99 |
| 2018–2020 | 102 |

Os 548 registros agregados ficam em `frontend/src/data/pas-*.json`. Cada edição preserva URL, SHA-256 do PDF, página, campus, grau, turno e argumentos originais. Não há nomes ou dados individuais de candidatos.

No ciclo 2018–2020, os cabeçalhos de campus são inconsistentes. A tabela de demanda da própria edição confirma 81 vínculos de forma única; a observação do documento confirma a oferta conjunta do Gama. As outras 20 ofertas ficam sem campus validado e não são associadas por aproximação. O arquivo preserva o campus original e a página usada para validar o vínculo quando aplicável.

## Associação ao catálogo

A interface continua consultando a API de cursos existente. A associação usa nome, campus, grau e turno; nomes de campus conhecidos são normalizados explicitamente, incluindo `FCTE - Gama`, utilizado pelo pipeline, e `FCTE`. Slug e matriz curricular não definem a oferta de ingresso.

Nos boletins incluídos, Software integra a entrada conjunta das Engenharias do Gama. O aviso pertence à edição consultada. Uma futura entrada exclusiva exige o boletim correspondente e não deve herdar automaticamente a nota conjunta.

Ofertas desconhecidas, ensino a distância e correspondências ambíguas recebem aviso de indisponibilidade. A ausência no último ciclo não é preenchida com uma nota antiga.

## Atualização reproduzível

1. Criar um ambiente Python e instalar `python -m pip install -r scripts/requirements-pas.txt`.
2. Revisar as URLs oficiais em `scripts/pas-sources.json`.
3. Executar `python scripts/extract_pas.py` na raiz do projeto.
4. Conferir os PDFs e os diffs dos arquivos JSON, principalmente cabeçalhos, campus e oferta conjunta.
5. Executar os testes do frontend, lint, TypeScript e build antes de publicar a atualização.

Os PDFs são armazenados no diretório temporário do sistema. Para baixar novamente uma edição, remover somente o arquivo temporário `pas-history-AAAA-AAAA.pdf` correspondente. Os arquivos JSON registram o hash do documento efetivamente processado.

A extração é executada separadamente; a navegação não baixa PDFs ou executa scraping. Nesta entrega, os dados oficiais são recursos versionados do frontend: não foram criados tabela ou endpoint de notas PAS no PostgreSQL.

## Verificação

- Consultar Software com o campus `FCTE - Gama` e confirmar 61,705 no ciclo 2023–2025, com aviso de ingresso conjunto.
- Conferir o mesmo resumo no Início e em Cursos.
- Abrir e recolher o histórico no detalhe, incluindo pelo teclado.
- Conferir os seis ciclos, fontes individuais, valores negativos e indisponibilidade de vínculos não validados.
- Confirmar legibilidade nos temas claro e escuro e em telas pequenas.
