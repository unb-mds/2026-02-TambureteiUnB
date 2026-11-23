# Cores dos indicadores nos temas claro e escuro

## Comportamento

As métricas de disciplina usam variáveis de status para fundo, texto e borda. Aprovação, reprovação por nota, reprovação por falta e trancamentos mantêm cores distintas com superfícies escuras, preservando suas contagens e cálculos.

O gráfico de ocupação utiliza variáveis do tema para ocupadas, disponíveis e ausência de dados. Centro e contorno acompanham a superfície do card; texto e legenda permanecem legíveis. Os indicadores de turno usam a mesma paleta.

O seletor de anos das métricas do curso acompanha o tema, incluindo a passagem do mouse. O ano selecionado mantém o destaque em roxo e informa seu estado com `aria-pressed`. As opções quebram linha em telas pequenas.

## Verificação visual

1. Abrir uma disciplina com métricas e turmas nos temas claro e escuro.
2. Conferir fundo, borda, valor, contagem e rótulo das quatro métricas.
3. Conferir ocupação parcial, turma vazia, turma cheia e ausência de dados. Usar o teclado para acessar a legenda das fatias.
4. Conferir os indicadores de turno e o gráfico compacto nos cards de turma.
5. Abrir um curso com métricas de vários anos; selecionar outro ano e verificar a atualização dos valores.
6. Passar o mouse sobre anos não selecionados e conferir a ausência de fundo branco no tema escuro.
7. Repetir a navegação em tela de celular e verificar quebra de linha e ausência de rolagem horizontal.

A validação de navegador utiliza dados demonstrativos para cobrir os estados. As quatro cores dos valores das métricas no tema escuro apresentam contraste superior a 7:1 em seus fundos. A verificação inclui TypeScript, lint, testes do frontend e build.
