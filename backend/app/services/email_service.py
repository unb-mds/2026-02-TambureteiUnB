import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Servico desacoplado para gerenciar o envio de e-mails transacionais (SMTP).
    Suporta modo de desenvolvimento com fallback seguro sem envio real de e-mails.
    """

    @property
    def is_configured(self) -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

    @property
    def sender_header(self) -> str:
        if settings.SMTP_FROM_NAME:
            return f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        return settings.SMTP_FROM_EMAIL

    def send_email(
        self,
        to_email: str,
        subject: str,
        text_content: str,
        html_content: str | None = None,
    ) -> bool:
        """
        Envia um e-mail com versao texto e HTML opcional.
        Em ambiente sem SMTP configurado, registra log seguro sem quebrar o fluxo.
        """
        if not self.is_configured:
            logger.info(
                "[EmailService] SMTP nao configurado. Simulando envio para '%s' com assunto '%s'.",
                to_email,
                subject,
            )
            return True

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.sender_header
        msg["To"] = to_email

        part_text = MIMEText(text_content, "plain", "utf-8")
        msg.attach(part_text)

        if html_content:
            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_html)

        try:
            if settings.SMTP_SSL or settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                if settings.SMTP_TLS:
                    server.starttls()

            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            server.quit()
            logger.info("[EmailService] E-mail enviado com sucesso para '%s'.", to_email)
            return True
        except Exception as e:
            logger.error("[EmailService] Falha ao enviar e-mail para '%s': %s", to_email, str(e))
            return False

    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        """
        Monta e dispara o e-mail de recuperacao de senha.
        Garante que o token nunca seja exposto em logs.
        """
        reset_link = f"{settings.FRONTEND_URL}/redefinir-senha?token={reset_token}"
        subject = f"{settings.SMTP_FROM_NAME} - Recuperação de Senha"

        text_content = (
            f"Olá,\n\n"
            f"Recebemos uma solicitação para redefinir a senha da sua conta no {settings.SMTP_FROM_NAME}.\n\n"
            f"Para cadastrar uma nova senha, acesse o link abaixo (válido por 15 minutos):\n"
            f"{reset_link}\n\n"
            f"Se você não fez essa solicitação, ignore esta mensagem. Sua conta permanece segura.\n\n"
            f"Atenciosamente,\n"
            f"Equipe {settings.SMTP_FROM_NAME}"
        )

        html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0b0e; color: #e1e1e6; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #121217; border: 1px solid #272730; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);">
    <h2 style="color: #8b5cf6; margin-top: 0; font-size: 24px; font-weight: 700;">{settings.SMTP_FROM_NAME}</h2>
    <h3 style="color: #ffffff; margin-bottom: 16px; font-size: 18px;">Recuperação de Senha</h3>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Recebemos um pedido para redefinir a senha da sua conta no <strong>{settings.SMTP_FROM_NAME}</strong>.
    </p>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Clique no botão abaixo para escolher uma nova senha. Por segurança, este link expira em <strong>15 minutos</strong>:
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{reset_link}" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
        Redefinir minha senha
      </a>
    </div>
    <p style="color: #71717a; font-size: 12px; line-height: 1.5; border-top: 1px solid #272730; padding-top: 20px; margin-top: 24px;">
      Caso não tenha solicitado a alteração, ignore este e-mail. Nenhuma alteração foi realizada em sua conta.<br><br>
      Link alternativo: <a href="{reset_link}" style="color: #a78bfa; word-break: break-all;">{reset_link}</a>
    </p>
  </div>
</body>
</html>"""

        return self.send_email(
            to_email=to_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
        )

    def send_password_change_confirmation(self, to_email: str) -> bool:
        """
        Notificacao de seguranca enviada apos a confirmacao de alteracao de senha.
        """
        subject = f"{settings.SMTP_FROM_NAME} - Senha alterada com sucesso"

        text_content = (
            f"Olá,\n\n"
            f"Confirmamos que a senha da sua conta no {settings.SMTP_FROM_NAME} foi alterada recentemente.\n\n"
            f"Se você realizou essa alteração, não é necessária nenhuma ação adicional.\n\n"
            f"Caso NÃO tenha sido você, recomendamos redefinir sua senha imediatamente na plataforma.\n\n"
            f"Atenciosamente,\n"
            f"Equipe {settings.SMTP_FROM_NAME}"
        )

        html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0b0e; color: #e1e1e6; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #121217; border: 1px solid #272730; border-radius: 16px; padding: 32px;">
    <h2 style="color: #8b5cf6; margin-top: 0; font-size: 24px; font-weight: 700;">{settings.SMTP_FROM_NAME}</h2>
    <h3 style="color: #ffffff; margin-bottom: 16px; font-size: 18px;">Segurança da Conta: Senha Alterada</h3>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Informamos que a senha da sua conta associada ao e-mail <strong>{to_email}</strong> foi alterada com sucesso.
    </p>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Se foi você que fez a alteração, nenhuma ação é necessária. Caso não reconheça essa atividade, entre em contato com nossa equipe ou redefina suas credenciais imediatamente.
    </p>
  </div>
</body>
</html>"""

        return self.send_email(
            to_email=to_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
        )


email_service = EmailService()
