# Política de Segurança

A privacidade e a segurança dos usuários do **Tamburetei UnB** seguem o princípio de *Privacy by Design* e as diretrizes da Lei Geral de Proteção de Dados (LGPD).

## Versões Suportadas

| Versão / Linha | Status |
| :--- | :--- |
| `main` (Produção — [tambureteiunb.com.br](https://tambureteiunb.com.br)) | Suportada |
| `develop` (Integração ativa) | Suportada |

## Como Reportar uma Vulnerabilidade ou Risco à Privacidade

**Não abra uma Issue pública** para relatar falhas de segurança, vazamento de credenciais ou possível exposição de dados pessoais.

Envie os detalhes em privado para:

* **E-mail oficial do projeto:** `tambureteiunb@gmail.com`

Inclua, sempre que possível, a rota ou componente afetado, passos para reprodução e impacto observado. A equipe avaliará o relato para correção e publicação coordenada na branch principal.

## Controles Aplicados no Projeto

* Coleta mínima de dados pessoais (sem matrícula, CPF ou histórico nominal armazenado — `RN01` e ADR 05).
* Senhas protegidas com hash `bcrypt`, autenticação via token JWT e validação estrita de `SECRET_KEY` em produção.
* Consultas SQL parametrizadas via SQLAlchemy 2.0, CORS restrito em produção e análise estática automatizada com `Bandit` e `Ruff` no pipeline de CI.
* Proteção de borda em produção via **Cloudflare** (proxy DNS, terminação TLS/HTTPS, mitigação contra DDoS e filtragem de tráfego suspeito na entrada) à frente do proxy reverso **Caddy**, mantendo as portas da aplicação e do banco restritas à rede interna do servidor.
