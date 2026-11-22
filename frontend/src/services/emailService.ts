import nodemailer, { type Transporter } from "nodemailer";

interface SendPasswordResetEmailParams {
  to: string;
  resetLink: string;
}

let transporter: Transporter | null = null;

function getEmailTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // Modo de desenvolvimento / fallback seguro usando JSON transport
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
}

export async function sendPasswordResetEmail({
  to,
  resetLink,
}: SendPasswordResetEmailParams): Promise<boolean> {
  const mailer = getEmailTransporter();
  const from = process.env.SMTP_FROM || "Tamburetei UnB <nao-responda@tamburetei.unb.br>";

  const mailOptions = {
    from,
    to,
    subject: "Tamburetei UnB - Recuperação de Senha",
    text: `Olá,\n\nRecebemos uma solicitação para redefinir a senha da sua conta no Tamburetei UnB.\n\nPara escolher uma nova senha, acesse o link abaixo (válido por 15 minutos):\n${resetLink}\n\nCaso não tenha feito essa solicitação, você pode ignorar esta mensagem.\n\nAtenciosamente,\nEquipe Tamburetei UnB`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #E8E6F8; border-radius: 20px;">
        <h2 style="color: #5B4BDB; margin-top: 0;">Tamburetei UnB</h2>
        <h3 style="color: #202124; margin-bottom: 12px;">Recuperação de Senha</h3>
        <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
          Recebemos uma solicitação para redefinir a senha da sua conta no Tamburetei UnB.
        </p>
        <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
          Clique no botão abaixo para cadastrar uma nova senha. Por segurança, este link expira em <strong>15 minutos</strong>:
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #5B4BDB; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
            Redefinir minha senha
          </a>
        </div>
        <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #F3F4F6; pt: 16px;">
          Se você não solicitou a alteração de senha, ignore este e-mail. Sua senha permanecerá inalterada.<br>
          Link direto: <a href="${resetLink}" style="color: #5B4BDB;">${resetLink}</a>
        </p>
      </div>
    `,
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    if (process.env.NODE_ENV !== "production") {
      // Log seguro sem vazar dados sensíveis
      console.log(`[Email] Link de redefinição processado com sucesso para ${to}`);
    }
    return Boolean(info);
  } catch (error) {
    console.error("[Email] Falha ao enviar e-mail via Nodemailer:", error);
    return false;
  }
}
