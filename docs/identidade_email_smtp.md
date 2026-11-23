# Identidade de E-mail e Integracao SMTP — Tamburetei UnB

## 1. Visao Geral e Provedor Recomendado

Para o estagio atual do projeto Tamburetei UnB, priorizou-se uma solucao sem custos financeiros, com alta confiabilidade na entrega e que dispense contratacao de provedores transacionais pagos (como SendGrid, Resend ou Amazon SES).

### Provedor Selecionado
* **Google Workspace / Gmail Pessoal Institucional do Projeto (Gratuito):**
  * Endereco sugerido: `tambureteiunb@gmail.com`
  * Nome do remetente exibido: `Tamburetei UnB`
* **Por que essa escolha?**
  1. **Disponibilidade e Sem Custo:** Contas Gmail sao gratuitas, amplamente disponiveis e nao exigem cartao de credito.
  2. **Isolamento de Contas:** Uma conta propria do projeto centraliza as comunicacoes, evitando que desenvolvedores vinculem seus e-mails pessoais ao codigo ou infraestrutura.
  3. **Seguranca via Senhas de Aplicativo (App Passwords):** O Google permite gerar tokens de acesso SMTP dedicados de 16 caracteres, permitindo revogacao imediata sem expor a senha principal da conta.
  4. **Padrao e Reputacao:** Alta entregabilidade para caixas de entrada universitarias e de estudantes (@aluno.unb.br, @unb.br, Outlook, Gmail).

---

## 2. Passo a Passo para Criacao da Conta Oficial

1. Acesse a pagina de criacao de contas do Google: `https://accounts.google.com/signup`.
2. Nome: `Tamburetei`, Sobrenome: `UnB`.
3. Nome de usuario recomendado: `tambureteiunb@gmail.com` (ou alternativamente `tamburetei.unb@gmail.com`).
4. Ative a **Autenticacao em Duas Etapas (2FA)** nas configuracoes de seguranca da conta Google.
5. Acesse a secao **Senhas de Aplicativo (App Passwords)** em `https://myaccount.google.com/apppasswords`.
6. Crie uma senha de app com o nome `Tamburetei Backend SMTP`.
7. Copie a senha de 16 caracteres gerada (formato: `xxxx xxxx xxxx xxxx`). Esta sera a variavel `SMTP_PASSWORD` / `SMTP_PASS`.

---

## 3. Variaveis de Ambiente

### Backend (`.env` na raiz do projeto)
```bash
# Configuracao de E-mail e SMTP (Tamburetei UnB)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tambureteiunb@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM_EMAIL=tambureteiunb@gmail.com
SMTP_FROM_NAME="Tamburetei UnB"
SMTP_TLS=true
SMTP_SSL=false
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)
```bash
# Configuracao do Servidor Next.js (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tambureteiunb@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM="Tamburetei UnB <tambureteiunb@gmail.com>"
```

*Nota:* Em ambiente local sem as variaveis configuradas, tanto o backend quanto o frontend operam em **modo de desenvolvimento**, registrando logs seguros e retornando sucesso sem enviar e-mails reais nem interromper testes e desenvolvimento.

---

## 4. Arquitetura e Desacoplamento

A integracao com envio de e-mails foi construida seguindo o principio de responsabilidade unica:

1. **`backend/app/services/email_service.py`:**
   * Servico centralizado no backend baseado no modulo padrao `smtplib` e `email.mime` (zero dependencias externas).
   * Contem os metodos `send_password_reset_email` e `send_password_change_confirmation`.
   * Template visual HTML responsivo com identidade visual escura oficial (Dark theme, roxo `#7c3aed`).
2. **`backend/app/services/auth_service.py`:**
   * O fluxo de autenticacao e recuperacao apenas consome o `email_service`, sem conhecer detalhes da implementacao de transporte ou credenciais.
3. **`frontend/src/services/emailService.ts`:**
   * Alternativa servidora Next.js utilizando `nodemailer`, mantendo suporte com fallback seguro via `jsonTransport`.

---

## 5. Migracao Futura para Dominio Proprio

Quando o projeto adquirir um dominio proprio (por exemplo, `tamburetei.unb.br` ou `tamburetei.com.br`), a transicao nao exigira nenhuma alteracao de codigo:

1. Configure os registros DNS do dominio (SPF, DKIM e DMARC) no provedor SMTP escolhido.
2. Atualize apenas as variaveis de ambiente:
   ```bash
   SMTP_HOST=smtp.sendgrid.net  # ou servidor proprio
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=chave_do_provedor
   SMTP_FROM_EMAIL=no-reply@tamburetei.unb.br
   SMTP_FROM_NAME="Tamburetei UnB"
   ```
3. Nenhuma linha de codigo de autenticacao, rotas ou schemas precisara ser modificada.

---

## 6. Procedimento de Teste

### Teste em Modo de Desenvolvimento (Mock / Sem Credenciais)
1. Inicie o sistema com `SMTP_HOST` vazio.
2. Solicite a recuperacao de senha na pagina `/auth/esqueci-senha`.
3. Verifique que a requisicao retorna status 200 com a mensagem de sucesso sem falhas de conexao.
4. O link e o token nao sao vazados publicamente no payload do cliente.

### Teste com Envio Real de E-mail
1. Preencha as credenciais no `.env` do backend ou frontend com a conta oficial e a senha de aplicativo criada.
2. Acesse a tela de recuperacao de senha e informe um e-mail valido.
3. Verifique a caixa de entrada para checar o recebimento da mensagem formatada com o botao de redefinicao.
4. Clique no link, redefina a senha e confira o recebimento do e-mail de confirmacao de seguranca.
