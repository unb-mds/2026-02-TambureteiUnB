import { NextRequest, NextResponse } from "next/server";
import {
  BoundedMemoryRateLimiter,
  extractClientIp,
} from "@/utils/serverRateLimit";

// Rate limiting com memoria limitada por IP e por e-mail para prevenir abusos
// Limite: maximo 5 solicitacoes por IP e 3 por e-mail a cada 15 minutos
const rateLimiter = new BoundedMemoryRateLimiter(5000);
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 5;
const MAX_REQUESTS_PER_EMAIL = 3;

export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const ipCheck = rateLimiter.check(`ip:${ip}`, MAX_REQUESTS_PER_IP, RATE_LIMIT_WINDOW_MS);
    if (ipCheck.limited) {
      return NextResponse.json(
        {
          message:
            "Muitas tentativas de recuperação. Por favor, aguarde alguns minutos antes de tentar novamente.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipCheck.retryAfterSeconds),
          },
        }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || email.trim().length > 254) {
      return NextResponse.json(
        { message: "E-mail inválido ou não informado." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailCheck = rateLimiter.check(
      `email:${normalizedEmail}`,
      MAX_REQUESTS_PER_EMAIL,
      RATE_LIMIT_WINDOW_MS
    );
    if (emailCheck.limited) {
      return NextResponse.json(
        {
          message:
            "Muitas tentativas para este e-mail. Por favor, aguarde alguns minutos.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailCheck.retryAfterSeconds),
          },
        }
      );
    }

    const apiUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    const backendRes = await fetch(`${apiUrl}/auth/esqueci-senha`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Real-IP": ip,
      },
      body: JSON.stringify({ email: normalizedEmail }),
      signal: AbortSignal.timeout(10_000),
    });

    const rawText = await backendRes.text();
    let data: { message?: string; detail?: string } = {};
    if (rawText.trim()) {
      try {
        data = JSON.parse(rawText) as { message?: string; detail?: string };
      } catch {
        data = {};
      }
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          message:
            (typeof data.detail === "string" && data.detail) ||
            (typeof data.message === "string" && data.message) ||
            "Erro ao processar solicitação.",
        },
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
