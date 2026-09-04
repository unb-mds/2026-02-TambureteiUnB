# ⚖️ Regras de Negócio e Governança

O projeto obedece obrigatoriamente a diretrizes estritas de privacidade, conformidade legal com a LGPD e ética acadêmica na Universidade de Brasília (UnB).

---

## 📌 Regras de Negócio (RN)

### [RN01] Privacidade por Padrão e Anonimato Discente
* A plataforma **não** armazena nem processa número de matrícula, CPF ou histórico acadêmico nominal dos estudantes.
* Relatos, dúvidas e comentários são exibidos publicamente de forma desvinculada do perfil nominal do aluno (sob pseudônimo ou *alias*).
* Os votos de situação discente alimentam exclusivamente os contadores estatísticos agregados da disciplina, sem exposição pública do nome de quem votou.

### [RN02] Unicidade da Situação Acadêmica por Disciplina
* Cada estudante autenticado pode possuir apenas **um** status ativo por disciplina (`Aprovado`, `Reprovado por Nota`, `Reprovado por Falta` ou `Trancado`).
* Se o estudante cursar novamente e registrar uma nova situação para a mesma matéria, o registro anterior é atualizado, impedindo a duplicação artificial das estatísticas.

### [RN03] Unicidade de Voto Útil (Upvote)
* Um usuário autenticado pode atribuir no máximo **1 voto útil** por material de apoio ou comentário.
* Uma nova chamada de upvote no mesmo item cancela o voto anterior.

### [RN04] Proteção a Docentes e Conduta Ética
* É expressamente vedada a publicação de juízos de valor depreciativos, ataques de cunho pessoal ou conteúdo difamatório contra professores.
* Relatos e avaliações devem focar exclusivamente na ementa, metodologia pedagógica, bibliografia e dificuldades técnicas da matéria.

### [RN05] Vedação de Resoluções Ativas
* É terminantemente proibida a disponibilização de respostas ou gabaritos de atividades avaliativas contínuas vigentes (como testes semanais ou relatórios laboratoriais recorrentes).
* São aceitos apenas enunciados de provas públicas de semestres anteriores e materiais conceituais de estudo.

### [RN06] Curadoria de Submissões Externas
* Todo material submetido por estudantes (links, resumos e arquivos) é gravado inicialmente com `status_curadoria = PENDENTE`.
* O recurso só é exibido publicamente após aprovação formal de um moderador da plataforma.

### [RN07] Tratamento de Dados Históricos com Baixa Amostragem (LGPD / DPO)
* Agregações históricas oriundas de microdados públicos do DPO/INEP com **menos de 5 estudantes** em uma turma devem ser consolidadas no acumulado geral da matéria para inviabilizar qualquer identificação indireta de notas.

### [RN08] Fórmula Oficial para Cálculo de Evasão
* A taxa de evasão institucional deve ser computada seguindo a relação oficial:
  $$\text{Taxa de Evasão (\%)} = \left( \frac{\text{Total de Desligamentos}}{\text{Total de Matriculados Ativos}} \right) \times 100$$

---

## 🎯 Critérios de Qualidade da Disciplina (MDS 2026/2)

1. **Cobertura de Código:** Mínimo de **70% de cobertura** de linhas no módulo de domínio (`app/domain/`).
2. **Escore de Mutação:** Mínimo de **50% de mortes** de mutantes nas regras de negócio com Mutmut.
3. **Testes de Sabotagem:** A suíte de testes deve falhar com 100% de eficácia quando falhas forem intencionalmente injetadas no domínio.
4. **Análise Estática de Segurança (SAST):** Nenhuma vulnerabilidade crítica ou alta tolerada no pipeline (validação contínua com Bandit e SonarQube).
5. **Reprodutibilidade:** Todo o ambiente deve subir integralmente via Docker Compose sem comandos manuais no sistema operacional hospedeiro.
