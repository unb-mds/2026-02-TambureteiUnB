import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/services/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "E-mail inválido ou não informado." },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const backendRes = await fetch(`${apiUrl}/auth/esqueci-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data.message || "Erro ao processar solicitação." },
        { status: backendRes.status }
      );
    }

    // Se o backend retornou um token (usuário existe na base), envia o e-mail via Nodemailer
    if (data.reset_token) {
      const origin = req.nextUrl.origin || "http://localhost:3000";
      const resetLink = `${origin}/redefinir-senha?token=${data.reset_token}`;

      await sendPasswordResetEmail({
        to: email.trim().toLowerCase(),
        resetLink,
      });
    }

    // Retorna mensagem amigável sem vazar token de redefinição para o navegador
    return NextResponse.json({
      message:
        "Se o e-mail informado estiver cadastrado, as instruções e o link seguro de redefinição foram enviados para a sua caixa de entrada.",
    });
  } catch (error) {
    console.error("Erro na rota de recuperação de senha:", error);
    return NextResponse.json(
      { message: "Não foi possível enviar o e-mail de recuperação no momento." },
      { status: 500 }
    );
  }
}
