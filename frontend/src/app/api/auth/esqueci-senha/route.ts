import { NextRequest, NextResponse } from "next/server";

// Rate limiting simples em memória por IP e por e-mail para prevenir abusos
// Limite: máximo 3 solicitações a cada 15 minutos por IP / e-mail
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS_PER_WINDOW = 3;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (isRateLimited(`ip:${ip}`)) {
      return NextResponse.json(
        { message: "Muitas tentativas de recuperação. Por favor, aguarde alguns minutos antes de tentar novamente." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "E-mail inválido ou não informado." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (isRateLimited(`email:${normalizedEmail}`)) {
      return NextResponse.json(
        { message: "Muitas tentativas para este e-mail. Por favor, aguarde alguns minutos." },
        { status: 429 }
      );
    }

    const apiUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    const backendRes = await fetch(`${apiUrl}/auth/esqueci-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data.message || "Erro ao processar solicitação." },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({
      message:
        data.message ||
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
