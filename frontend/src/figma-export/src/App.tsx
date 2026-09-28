import { useState } from "react";

// ── SVG: Stool / Banquinho symbol ────────────────────────────────────────────
function StoolIllustration({ size = 220 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Símbolo do banquinho Tamburetei"
    >
      {/* Seat */}
      <rect x="30" y="70" width="160" height="28" rx="14" fill="#5B4BDB" />
      {/* Leg left */}
      <path
        d="M60 98 C55 140 48 165 42 190"
        stroke="#5B4BDB"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Leg right */}
      <path
        d="M160 98 C165 140 172 165 178 190"
        stroke="#5B4BDB"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Leg center-left */}
      <path
        d="M95 98 C93 138 88 162 82 192"
        stroke="#7C6CF0"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Leg center-right */}
      <path
        d="M125 98 C127 138 132 162 138 192"
        stroke="#7C6CF0"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Foot bar */}
      <path
        d="M50 155 C90 148 130 148 170 155"
        stroke="#F4C542"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Cushion highlight */}
      <rect x="50" y="75" width="120" height="8" rx="4" fill="#7C6CF0" opacity="0.5" />
      {/* Hand-drawn star doodle */}
      <path
        d="M195 55 L198 62 L205 62 L199 67 L201 74 L195 70 L189 74 L191 67 L185 62 L192 62 Z"
        fill="#F4C542"
        opacity="0.9"
      />
      {/* Dot doodles */}
      <circle cx="22" cy="110" r="4" fill="#F4C542" opacity="0.6" />
      <circle cx="14" cy="125" r="2.5" fill="#5B4BDB" opacity="0.4" />
      <circle cx="200" cy="105" r="3" fill="#5B4BDB" opacity="0.3" />
      {/* Hand-drawn circle */}
      <path
        d="M15 85 C12 78 18 68 26 70 C34 72 36 83 30 88 C24 93 14 90 15 85 Z"
        stroke="#F4C542"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

// ── SVG: Larger hero stool ───────────────────────────────────────────────────
function HeroStoolIllustration() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Background blob */}
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: 360,
          height: 360,
          background: "radial-gradient(circle, #7C6CF0 0%, #5B4BDB 60%, transparent 100%)",
        }}
      />
      {/* Floating cards */}
      <div
        className="absolute bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2"
        style={{ top: 30, left: -20, fontSize: 13, fontFamily: "Inter, sans-serif" }}
      >
        <span style={{ fontSize: 18 }}>📚</span>
        <div>
          <p className="font-semibold text-gray-800" style={{ fontSize: 12 }}>Cálculo 1</p>
          <p style={{ color: "#6B7280", fontSize: 11 }}>42 materiais</p>
        </div>
      </div>
      <div
        className="absolute bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2"
        style={{ bottom: 50, right: -30, fontSize: 13, fontFamily: "Inter, sans-serif" }}
      >
        <span style={{ fontSize: 18 }}>⭐</span>
        <div>
          <p className="font-semibold text-gray-800" style={{ fontSize: 12 }}>Aprovação</p>
          <p style={{ color: "#5B4BDB", fontSize: 11, fontWeight: 600 }}>78% na turma</p>
        </div>
      </div>
      <div
        className="absolute bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2"
        style={{ top: 80, right: -40, fontSize: 13, fontFamily: "Inter, sans-serif" }}
      >
        <span style={{ fontSize: 18 }}>💬</span>
        <div>
          <p className="font-semibold text-gray-800" style={{ fontSize: 12 }}>12 relatos</p>
          <p style={{ color: "#6B7280", fontSize: 11 }}>de estudantes</p>
        </div>
      </div>
      {/* Main stool */}
      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Banquinho Tamburetei"
      >
        {/* Seat */}
        <rect x="40" y="95" width="220" height="38" rx="19" fill="#5B4BDB" />
        {/* Seat gloss */}
        <rect x="65" y="101" width="170" height="12" rx="6" fill="#7C6CF0" opacity="0.4" />
        {/* Legs */}
        <path d="M80 133 C74 192 66 228 58 262" stroke="#5B4BDB" strokeWidth="14" strokeLinecap="round" />
        <path d="M220 133 C226 192 234 228 242 262" stroke="#5B4BDB" strokeWidth="14" strokeLinecap="round" />
        <path d="M128 133 C125 190 118 224 112 264" stroke="#7C6CF0" strokeWidth="13" strokeLinecap="round" />
        <path d="M172 133 C175 190 182 224 188 264" stroke="#7C6CF0" strokeWidth="13" strokeLinecap="round" />
        {/* Foot bar */}
        <path d="M68 215 C120 204 180 204 232 215" stroke="#F4C542" strokeWidth="9" strokeLinecap="round" />
        {/* Doodles around stool */}
        <path d="M258 80 L262 91 L273 91 L264 98 L267 109 L258 102 L249 109 L252 98 L243 91 L254 91 Z" fill="#F4C542" opacity="0.85" />
        <circle cx="28" cy="148" r="6" fill="#F4C542" opacity="0.5" />
        <circle cx="20" cy="168" r="4" fill="#5B4BDB" opacity="0.3" />
        <circle cx="272" cy="155" r="5" fill="#5B4BDB" opacity="0.25" />
        {/* Wavy hand-drawn lines */}
        <path d="M25 200 C28 196 32 202 35 198 C38 194 42 200 45 196" stroke="#F4C542" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M252 230 C255 226 259 232 262 228 C265 224 269 230 272 226" stroke="#7C6CF0" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      </svg>
    </div>
  );
}

// ── Feature Card ─────────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  accent?: boolean;
}

function FeatureCard({ icon, title, description, accent = false }: FeatureCardProps) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-3 transition-transform hover:-translate-y-1 cursor-pointer"
      style={{
        background: accent ? "#5B4BDB" : "#FFFFFF",
        color: accent ? "#FFFFFF" : "#202124",
        boxShadow: "0 2px 16px rgba(91,75,219,0.08)",
        border: accent ? "none" : "1px solid #EDE9FD",
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{
          background: accent ? "rgba(255,255,255,0.15)" : "#EDE9FD",
        }}
      >
        {icon}
      </div>
      <h3
        className="font-semibold text-lg"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: accent ? "rgba(255,255,255,0.82)" : "#6B7280" }}
      >
        {description}
      </p>
      <div className="flex items-center gap-1 text-sm font-medium mt-auto pt-1" style={{ color: accent ? "#F4C542" : "#5B4BDB" }}>
        Saiba mais
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3l5 5-5 5M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-3xl font-bold"
        style={{ fontFamily: "Poppins, sans-serif", color: "#5B4BDB" }}
      >
        {value}
      </span>
      <span className="text-sm text-center" style={{ color: "#6B7280" }}>
        {label}
      </span>
    </div>
  );
}

// ── Tag / Pill ───────────────────────────────────────────────────────────────
function Pill({ label }: { label: string }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors hover:bg-purple-100"
      style={{ background: "#EDE9FD", color: "#5B4BDB", fontFamily: "Inter, sans-serif" }}
    >
      {label}
    </span>
  );
}

// ── Experience Card ──────────────────────────────────────────────────────────
function ExperienceCard({
  name,
  course,
  text,
  avatar,
}: {
  name: string;
  course: string;
  text: string;
  avatar: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: "#FFFFFF",
        border: "1px solid #EDE9FD",
        boxShadow: "0 2px 16px rgba(91,75,219,0.06)",
      }}
    >
      <p
        className="text-sm leading-relaxed italic"
        style={{ color: "#202124" }}
      >
        "{text}"
      </p>
      <div className="flex items-center gap-3 mt-auto">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: avatar }}
        >
          {name[0]}
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
            {name}
          </p>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            {course}
          </p>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} width="14" height="14" viewBox="0 0 14 14" fill="#F4C542">
              <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.6 3.5L7 9.5 4 11l.6-3.5L2 5l3.5-.5L7 1z" />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onBack, onSignup }: { onBack: () => void; onSignup?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#F7F7FA",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #EDE9FD",
          boxShadow: "0 1px 8px rgba(91,75,219,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer" }}
          >
            <StoolIllustration size={34} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 18, color: "#5B4BDB", letterSpacing: "-0.02em" }}>
                Tamburetei
              </span>
              <span style={{ color: "#F4C542", fontSize: 9, letterSpacing: "0.12em", fontWeight: 600 }}>
                INFORMAÇÃO QUE TE APOIA
              </span>
            </div>
          </button>
          <p style={{ color: "#6B7280", fontSize: 14 }}>
            Ainda não tem conta?{" "}
            <button
              onClick={onSignup}
              style={{ color: "#5B4BDB", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
            >
              Criar conta
            </button>
          </p>
        </div>
      </header>

      {/* Main area: two-column */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 65px)" }}>

        {/* Left panel – brand */}
        <div
          style={{
            background: "linear-gradient(145deg, #5B4BDB 0%, #7C6CF0 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "80px 72px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background doodles */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.1 }}
            viewBox="0 0 720 800"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle cx="600" cy="100" r="200" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="100" cy="700" r="150" stroke="white" strokeWidth="2" fill="none" />
            <path d="M50 200 C90 180 120 220 150 200 C180 180 210 215 240 200" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M480 600 C520 580 550 620 580 600 C610 580 640 615 670 600" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M360 50 L365 65 L380 65 L368 74 L372 88 L360 80 L348 88 L352 74 L340 65 L355 65 Z" fill="white" />
            <path d="M80 450 L84 461 L95 461 L86 468 L89 479 L80 472 L71 479 L74 468 L65 461 L76 461 Z" fill="white" />
          </svg>

          {/* Big stool */}
          <div style={{ position: "absolute", right: -20, bottom: 40, opacity: 0.18 }}>
            <StoolIllustration size={340} />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 99,
                padding: "6px 16px",
                marginBottom: 32,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F4C542", display: "inline-block" }} />
              <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>Plataforma acadêmica da UnB</span>
            </div>

            <h2
              style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 42,
                fontWeight: 800,
                color: "#FFFFFF",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: 20,
                maxWidth: 380,
              }}
            >
              O conhecimento que te faltava está aqui.
            </h2>

            <p style={{ color: "rgba(255,255,255,0.80)", fontSize: 16, lineHeight: 1.7, maxWidth: 360, marginBottom: 40 }}>
              Materiais, relatos e informações sobre disciplinas da UnB, organizados
              por estudantes para estudantes.
            </p>

            {/* Mini stats */}
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { value: "500+", label: "disciplinas" },
                { value: "8.5k+", label: "estudantes" },
                { value: "3.2k+", label: "materiais" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 24, color: "#F4C542" }}>
                    {s.value}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel – form */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            background: "#F7F7FA",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>

            {/* Logo mark */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: "#EDE9FD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <StoolIllustration size={48} />
              </div>
              <h1
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#202124",
                  letterSpacing: "-0.02em",
                  marginBottom: 6,
                }}
              >
                Bem-vindo de volta
              </h1>
              <p style={{ color: "#6B7280", fontSize: 15, textAlign: "center" }}>
                Entre na sua conta do Tamburetei
              </p>
            </div>

            {/* Form card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 24,
                padding: "36px 40px",
                boxShadow: "0 4px 32px rgba(91,75,219,0.10)",
                border: "1px solid #EDE9FD",
              }}
            >
              {/* Email field */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  E-mail institucional
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: `2px solid ${focusedField === "email" ? "#5B4BDB" : "#E5E7EB"}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    background: "#FFFFFF",
                    transition: "border-color 0.15s",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="1" y="3" width="16" height="12" rx="2.5" stroke={focusedField === "email" ? "#5B4BDB" : "#9CA3AF"} strokeWidth="1.6" />
                    <path d="M1 6l8 5 8-5" stroke={focusedField === "email" ? "#5B4BDB" : "#9CA3AF"} strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="seu@email.com"
                    style={{
                      flex: 1,
                      outline: "none",
                      border: "none",
                      fontSize: 14,
                      color: "#202124",
                      fontFamily: "Inter, sans-serif",
                      background: "transparent",
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Senha
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: `2px solid ${focusedField === "password" ? "#5B4BDB" : "#E5E7EB"}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    background: "#FFFFFF",
                    transition: "border-color 0.15s",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="8" width="12" height="9" rx="2" stroke={focusedField === "password" ? "#5B4BDB" : "#9CA3AF"} strokeWidth="1.6" />
                    <path d="M6 8V6a3 3 0 116 0v2" stroke={focusedField === "password" ? "#5B4BDB" : "#9CA3AF"} strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="9" cy="12.5" r="1.2" fill={focusedField === "password" ? "#5B4BDB" : "#9CA3AF"} />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    style={{
                      flex: 1,
                      outline: "none",
                      border: "none",
                      fontSize: 14,
                      color: "#202124",
                      fontFamily: "Inter, sans-serif",
                      background: "transparent",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9CA3AF" }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="#9CA3AF" strokeWidth="1.6" />
                        <circle cx="9" cy="9" r="2.5" stroke="#9CA3AF" strokeWidth="1.6" />
                        <path d="M2 2l14 14" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="#9CA3AF" strokeWidth="1.6" />
                        <circle cx="9" cy="9" r="2.5" stroke="#9CA3AF" strokeWidth="1.6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: "right", marginBottom: 28 }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#5B4BDB",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>

              {/* Submit */}
              <button
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 12,
                  background: "#5B4BDB",
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                  boxShadow: "0 4px 16px rgba(91,75,219,0.35)",
                  transition: "filter 0.15s, transform 0.1s",
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.filter = "brightness(1)"; }}
              >
                Entrar
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>ou continue com</span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>

              {/* Google SSO */}
              <button
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  background: "#FFFFFF",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  border: "1.5px solid #E5E7EB",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = "#5B4BDB"; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = "#E5E7EB"; }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                Entrar com Google
              </button>
            </div>

            {/* Sign up link */}
            <p style={{ textAlign: "center", marginTop: 24, color: "#6B7280", fontSize: 14 }}>
              Não tem uma conta?{" "}
              <button
                onClick={onSignup}
                style={{
                  color: "#5B4BDB",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Criar conta gratuita
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Input Field Component ─────────────────────────────────────────────────────
function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  hint,
  icon,
  focused,
  onFocus,
  onBlur,
  error,
  suffix,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  icon: React.ReactNode;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  error?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "Inter, sans-serif" }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: `2px solid ${error ? "#EF4444" : focused ? "#5B4BDB" : "#E5E7EB"}`,
          borderRadius: 12,
          padding: "11px 14px",
          background: "#FFFFFF",
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          style={{
            flex: 1,
            outline: "none",
            border: "none",
            fontSize: 14,
            color: "#202124",
            fontFamily: "Inter, sans-serif",
            background: "transparent",
          }}
        />
        {suffix}
      </div>
      {hint && !error && (
        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: "#EF4444", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="#EF4444" />
            <path d="M6 4v2.5M6 8h.01" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Password Strength Meter ───────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ["", "Fraca", "Razoável", "Boa", "Forte"];
  const colors = ["#E5E7EB", "#EF4444", "#F4C542", "#7C6CF0", "#22C55E"];
  if (!password) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: i <= score ? colors[score] : "#E5E7EB",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: colors[score], fontWeight: 500, fontFamily: "Inter, sans-serif" }}>
        {labels[score]}
      </span>
    </div>
  );
}

// ── Signup Page ───────────────────────────────────────────────────────────────
function SignupPage({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [focused, setFocused] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    matricula: "",
    password: "",
    confirm: "",
    agreed: false,
  });

  const set = (k: keyof typeof form) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const emailValid = !form.email || form.email.endsWith("@aluno.unb.br") || form.email.endsWith("@unb.br");
  const matriculaValid = !form.matricula || /^\d{9}$/.test(form.matricula);
  const passwordMatch = !form.confirm || form.password === form.confirm;

  const eyeIcon = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#9CA3AF" }}
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M2 2l14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
    </button>
  );

  const iconColor = (field: string) => focused === field ? "#5B4BDB" : "#9CA3AF";

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#F7F7FA", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #EDE9FD", boxShadow: "0 1px 8px rgba(91,75,219,0.06)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer" }}>
            <StoolIllustration size={34} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 18, color: "#5B4BDB", letterSpacing: "-0.02em" }}>Tamburetei</span>
              <span style={{ color: "#F4C542", fontSize: 9, letterSpacing: "0.12em", fontWeight: 600 }}>INFORMAÇÃO QUE TE APOIA</span>
            </div>
          </button>
          <p style={{ color: "#6B7280", fontSize: 14 }}>
            Já tem uma conta?{" "}
            <button onClick={onLogin} style={{ color: "#5B4BDB", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
              Entrar
            </button>
          </p>
        </div>
      </header>

      {/* Two-column layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 65px)" }}>

        {/* Left – brand panel */}
        <div style={{ background: "linear-gradient(145deg, #5B4BDB 0%, #7C6CF0 100%)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "80px 72px", position: "relative", overflow: "hidden" }}>

          {/* Background doodles */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.1 }} viewBox="0 0 720 900" fill="none" preserveAspectRatio="xMidYMid slice">
            <circle cx="620" cy="80" r="220" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="80" cy="780" r="180" stroke="white" strokeWidth="2" fill="none" />
            <path d="M60 250 C100 230 130 270 160 250 C190 230 220 265 250 250" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M460 650 C500 630 530 670 560 650 C590 630 620 665 650 650" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M340 40 L345 56 L361 56 L348 66 L353 82 L340 72 L327 82 L332 66 L319 56 L335 56 Z" fill="white" />
            <path d="M90 480 L94 492 L106 492 L96 500 L100 512 L90 504 L80 512 L84 500 L74 492 L86 492 Z" fill="white" />
          </svg>

          {/* Ghost stool */}
          <div style={{ position: "absolute", right: -20, bottom: 40, opacity: 0.15 }}>
            <StoolIllustration size={340} />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", borderRadius: 99, padding: "6px 16px", marginBottom: 32 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F4C542", display: "inline-block" }} />
              <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>Plataforma gratuita para estudantes</span>
            </div>

            <h2 style={{ fontFamily: "Poppins, sans-serif", fontSize: 40, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 20, maxWidth: 380 }}>
              Junte-se a quem já estuda melhor.
            </h2>

            <p style={{ color: "rgba(255,255,255,0.80)", fontSize: 16, lineHeight: 1.7, maxWidth: 360, marginBottom: 40 }}>
              Crie sua conta gratuita e acesse materiais, relatos e informações sobre qualquer disciplina da UnB.
            </p>

            {/* Benefits list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { icon: "📂", text: "Acesso a milhares de materiais e provas antigas" },
                { icon: "💬", text: "Relatos reais de quem já cursou cada disciplina" },
                { icon: "📊", text: "Estatísticas de aprovação por professor e turma" },
                { icon: "🆓", text: "Sempre gratuito para estudantes da UnB" },
              ].map((b) => (
                <div key={b.text} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {b.icon}
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.5, paddingTop: 8 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right – form */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 80px 48px", background: "#F7F7FA", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 440 }}>

            {/* Logo mark */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "#EDE9FD", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <StoolIllustration size={44} />
              </div>
              <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "#202124", letterSpacing: "-0.02em", marginBottom: 4 }}>
                Criar conta
              </h1>
              <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center" }}>
                Preencha os dados abaixo para começar
              </p>
            </div>

            {/* Form card */}
            <div style={{ background: "#FFFFFF", borderRadius: 24, padding: "32px 36px", boxShadow: "0 4px 32px rgba(91,75,219,0.10)", border: "1px solid #EDE9FD" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Name */}
                <InputField
                  label="Nome completo"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Seu nome completo"
                  focused={focused === "name"}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="6" r="3.5" stroke={iconColor("name")} strokeWidth="1.6" />
                      <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke={iconColor("name")} strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                />

                {/* Email */}
                <InputField
                  label="E-mail institucional"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="seu@aluno.unb.br"
                  hint="Use seu e-mail @aluno.unb.br ou @unb.br"
                  focused={focused === "email"}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  error={submitted && !emailValid ? "Use um e-mail institucional da UnB (@aluno.unb.br ou @unb.br)" : undefined}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="1" y="3" width="16" height="12" rx="2.5" stroke={iconColor("email")} strokeWidth="1.6" />
                      <path d="M1 6l8 5 8-5" stroke={iconColor("email")} strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                />

                {/* Matricula */}
                <InputField
                  label="Matrícula"
                  value={form.matricula}
                  onChange={set("matricula")}
                  placeholder="000000000"
                  hint="9 dígitos numéricos da sua matrícula na UnB"
                  focused={focused === "matricula"}
                  onFocus={() => setFocused("matricula")}
                  onBlur={() => setFocused(null)}
                  error={submitted && !matriculaValid ? "A matrícula deve ter 9 dígitos numéricos" : undefined}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="1" width="14" height="16" rx="2.5" stroke={iconColor("matricula")} strokeWidth="1.6" />
                      <path d="M5 6h8M5 9h8M5 12h5" stroke={iconColor("matricula")} strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  }
                />

                {/* Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <InputField
                    label="Senha"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Mínimo 8 caracteres"
                    focused={focused === "password"}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="3" y="8" width="12" height="9" rx="2" stroke={iconColor("password")} strokeWidth="1.6" />
                        <path d="M6 8V6a3 3 0 116 0v2" stroke={iconColor("password")} strokeWidth="1.6" strokeLinecap="round" />
                        <circle cx="9" cy="12.5" r="1.2" fill={iconColor("password")} />
                      </svg>
                    }
                    suffix={eyeIcon(showPassword, () => setShowPassword(!showPassword))}
                  />
                  <PasswordStrength password={form.password} />
                </div>

                {/* Confirm password */}
                <InputField
                  label="Confirmar senha"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={set("confirm")}
                  placeholder="Repita a senha"
                  focused={focused === "confirm"}
                  onFocus={() => setFocused("confirm")}
                  onBlur={() => setFocused(null)}
                  error={submitted && !passwordMatch ? "As senhas não coincidem" : undefined}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4 9.5l3.5 3.5 6.5-7" stroke={form.confirm && passwordMatch ? "#22C55E" : iconColor("confirm")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="1" y="1" width="16" height="16" rx="4" stroke={form.confirm && passwordMatch ? "#22C55E" : iconColor("confirm")} strokeWidth="1.6" />
                    </svg>
                  }
                  suffix={eyeIcon(showConfirm, () => setShowConfirm(!showConfirm))}
                />

                {/* Terms */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <div
                    onClick={() => set("agreed")(!form.agreed)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `2px solid ${form.agreed ? "#5B4BDB" : "#D1D5DB"}`,
                      background: form.agreed ? "#5B4BDB" : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      transition: "all 0.15s",
                      cursor: "pointer",
                    }}
                  >
                    {form.agreed && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, userSelect: "none" }}>
                    Concordo com os{" "}
                    <span style={{ color: "#5B4BDB", fontWeight: 600 }}>Termos de Uso</span>
                    {" "}e a{" "}
                    <span style={{ color: "#5B4BDB", fontWeight: 600 }}>Política de Privacidade</span>
                    {" "}do Tamburetei
                  </span>
                </label>

                {/* Submit */}
                <button
                  onClick={() => setSubmitted(true)}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 12,
                    background: "#5B4BDB",
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "Poppins, sans-serif",
                    border: "none",
                    cursor: "pointer",
                    letterSpacing: "-0.01em",
                    boxShadow: "0 4px 16px rgba(91,75,219,0.35)",
                    marginTop: 4,
                    transition: "filter 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.filter = "brightness(1)"; }}
                >
                  Criar conta
                </button>

              </div>
            </div>

            {/* Sign in link */}
            <p style={{ textAlign: "center", marginTop: 20, color: "#6B7280", fontSize: 14 }}>
              Já tem uma conta?{" "}
              <button
                onClick={onLogin}
                style={{ color: "#5B4BDB", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "Inter, sans-serif" }}
              >
                Entrar agora
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<"home" | "login" | "signup">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Início");

  if (page === "login") {
    return (
      <LoginPage
        onBack={() => { setPage("home"); setActiveNav("Início"); }}
        onSignup={() => setPage("signup")}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage
        onBack={() => { setPage("home"); setActiveNav("Início"); }}
        onLogin={() => setPage("login")}
      />
    );
  }

  const navItems = ["Início", "Pesquisar", "Guia", "Entrar"];

  const popularDisciplines = [
    "Cálculo 1",
    "Álgebra Linear",
    "Programação 1",
    "Física 1",
    "Estatística",
    "Circuitos Elétricos",
    "Bioquímica",
    "Introdução ao Direito",
  ];

  const experiences = [
    {
      name: "Mariana S.",
      course: "Engenharia de Software, 3º semestre",
      text: "Antes de fazer Cálculo 2 eu fiquei dias no Tamburetei lendo relatos de quem já tinha passado. Me ajudou demais a entender o que esperar da disciplina.",
      avatar: "#5B4BDB",
    },
    {
      name: "Lucas O.",
      course: "Ciência da Computação, 5º semestre",
      text: "Os materiais compartilhados aqui têm uma qualidade incrível. Encontrei resumos e listas de exercícios que realmente fizeram diferença na minha aprovação.",
      avatar: "#7C6CF0",
    },
    {
      name: "Ana B.",
      course: "Medicina, 2º semestre",
      text: "Gosto muito dos relatos de outros estudantes — dá uma visão real da disciplina, sem filtros. Me sinto menos sozinha no processo.",
      avatar: "#5B4BDB",
    },
  ];

  return (
    <div
      style={{ background: "#F7F7FA", fontFamily: "Inter, sans-serif", minHeight: "100vh", width: "100%" }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "#FFFFFF",
          borderColor: "#EDE9FD",
          boxShadow: "0 1px 8px rgba(91,75,219,0.06)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-between px-8 py-4"
          style={{ maxWidth: 1440 }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <StoolIllustration size={36} />
            <div className="flex flex-col leading-tight">
              <span
                className="font-bold text-xl"
                style={{ fontFamily: "Poppins, sans-serif", color: "#5B4BDB", letterSpacing: "-0.02em" }}
              >
                Tamburetei
              </span>
              <span
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "#F4C542", letterSpacing: "0.12em", fontSize: 9 }}
              >
                INFORMAÇÃO QUE TE APOIA
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              item === "Entrar" ? (
                <button
                  key={item}
                  onClick={() => { setActiveNav(item); setPage("login"); }}
                  className="ml-3 px-5 py-2 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
                  style={{
                    background: "#5B4BDB",
                    color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Entrar
                </button>
              ) : (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: activeNav === item ? "#5B4BDB" : "#6B7280",
                    background: activeNav === item ? "#EDE9FD" : "transparent",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {item}
                </button>
              )
            ))}
          </nav>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-8 py-20 grid items-center gap-12"
        style={{
          maxWidth: 1440,
          gridTemplateColumns: "1fr 420px",
        }}
      >
        {/* Left */}
        <div className="flex flex-col gap-6 max-w-xl">
          {/* Tag */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full w-fit text-sm font-medium"
            style={{ background: "#EDE9FD", color: "#5B4BDB" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#5B4BDB" }}
            />
            Plataforma acadêmica da UnB
          </div>

          {/* Headline */}
          <h1
            className="leading-tight"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: 52,
              fontWeight: 800,
              color: "#202124",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Conhecimento também{" "}
            <span className="doodle-underline" style={{ color: "#5B4BDB" }}>
              se compartilha.
            </span>
          </h1>

          {/* Body */}
          <p
            className="text-lg leading-relaxed"
            style={{ color: "#6B7280", maxWidth: 460, lineHeight: 1.7 }}
          >
            O Tamburetei é a plataforma feita por estudantes da UnB para estudantes da UnB.
            Encontre materiais, relatos e informações sobre as disciplinas do seu curso — tudo
            num lugar só.
          </p>

          {/* Search bar */}
          <div
            className="flex items-center gap-2 rounded-2xl p-2 mt-2"
            style={{
              background: "#FFFFFF",
              border: "2px solid #EDE9FD",
              boxShadow: "0 4px 24px rgba(91,75,219,0.10)",
              maxWidth: 500,
            }}
          >
            <div className="flex items-center gap-3 flex-1 px-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar disciplina, código ou professor..."
                className="flex-1 outline-none text-sm bg-transparent"
                style={{ color: "#202124", fontFamily: "Inter, sans-serif" }}
              />
            </div>
            <button
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "#5B4BDB",
                color: "#FFFFFF",
                fontFamily: "Poppins, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              Explorar disciplinas
            </button>
          </div>

          {/* Popular tags */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium" style={{ color: "#9CA3AF", alignSelf: "center" }}>
              Populares:
            </span>
            {popularDisciplines.slice(0, 5).map((d) => (
              <Pill key={d} label={d} />
            ))}
          </div>
        </div>

        {/* Right – illustration */}
        <div className="flex justify-center">
          <HeroStoolIllustration />
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <div
        className="mx-auto px-8 mb-4"
        style={{ maxWidth: 1440 }}
      >
        <div
          className="rounded-2xl px-10 py-6 grid gap-6"
          style={{
            background: "#5B4BDB",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {[
            { value: "500+", label: "disciplinas catalogadas" },
            { value: "3.2k+", label: "materiais compartilhados" },
            { value: "8.5k+", label: "estudantes cadastrados" },
            { value: "1.4k+", label: "relatos de experiências" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span
                className="text-3xl font-bold"
                style={{ fontFamily: "Poppins, sans-serif", color: "#F4C542" }}
              >
                {s.value}
              </span>
              <span className="text-sm text-center" style={{ color: "rgba(255,255,255,0.75)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-8 py-16"
        style={{ maxWidth: 1440 }}
      >
        {/* Section header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p
              className="text-sm font-semibold mb-2 tracking-widest uppercase"
              style={{ color: "#F4C542", letterSpacing: "0.1em" }}
            >
              O que você encontra aqui
            </p>
            <h2
              className="text-4xl font-bold"
              style={{
                fontFamily: "Poppins, sans-serif",
                color: "#202124",
                letterSpacing: "-0.02em",
              }}
            >
              Tudo que você precisa<br />para se preparar
            </h2>
          </div>
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:bg-purple-50"
            style={{
              borderColor: "#5B4BDB",
              color: "#5B4BDB",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Ver todas as funcionalidades
          </button>
        </div>

        {/* Cards grid */}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        >
          <FeatureCard
            icon="📖"
            title="Disciplinas"
            description="Encontre informações detalhadas sobre qualquer disciplina da UnB: ementa, pré-requisitos, professores e mais."
            accent={true}
          />
          <FeatureCard
            icon="📊"
            title="Estatísticas"
            description="Veja as taxas de aprovação, reprovação e trancamento por disciplina e por professor, de forma transparente."
          />
          <FeatureCard
            icon="📂"
            title="Materiais"
            description="Acesse provas antigas, resumos, listas de exercícios e outros materiais compartilhados por estudantes."
          />
          <FeatureCard
            icon="💬"
            title="Experiências"
            description="Leia relatos reais de quem já cursou a disciplina. Dicas, alertas e percepções de verdade, sem filtros."
          />
        </div>
      </section>

      {/* ── DISCIPLINES BROWSE ─────────────────────────────────────────────── */}
      <section
        className="mx-auto px-8 pb-16"
        style={{ maxWidth: 1440 }}
      >
        <div
          className="rounded-3xl p-10"
          style={{ background: "#FFFFFF", border: "1px solid #EDE9FD" }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <p
                className="text-sm font-semibold mb-1 tracking-widest uppercase"
                style={{ color: "#F4C542", letterSpacing: "0.1em" }}
              >
                Explorar
              </p>
              <h2
                className="text-3xl font-bold"
                style={{ fontFamily: "Poppins, sans-serif", color: "#202124" }}
              >
                Disciplinas em destaque
              </h2>
            </div>
            <div className="flex gap-2">
              {["Exatas", "Humanas", "Saúde", "Tecnologia", "Todas"].map((f) => (
                <button
                  key={f}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background: f === "Todas" ? "#5B4BDB" : "#F7F7FA",
                    color: f === "Todas" ? "#FFFFFF" : "#6B7280",
                    border: "1px solid",
                    borderColor: f === "Todas" ? "#5B4BDB" : "#E5E7EB",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Discipline rows */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { code: "MAT0025", name: "Cálculo 1", dept: "Matemática", approval: "67%", materials: 38 },
              { code: "CIC0004", name: "Algoritmos e Programação", dept: "Computação", approval: "71%", materials: 52 },
              { code: "FIS0110", name: "Física 1", dept: "Física", approval: "61%", materials: 29 },
              { code: "MAT0026", name: "Cálculo 2", dept: "Matemática", approval: "59%", materials: 31 },
              { code: "CIC0097", name: "Estruturas de Dados", dept: "Computação", approval: "74%", materials: 44 },
              { code: "EST0023", name: "Estatística Aplicada", dept: "Estatística", approval: "80%", materials: 20 },
            ].map((d) => (
              <div
                key={d.code}
                className="flex items-center justify-between px-5 py-4 rounded-xl cursor-pointer transition-all hover:border-purple-300 hover:shadow-sm"
                style={{
                  border: "1px solid #EDE9FD",
                  background: "#F7F7FA",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: "#EDE9FD", color: "#5B4BDB", fontFamily: "Inter, sans-serif", fontSize: 10 }}
                  >
                    {d.code.slice(0, 3)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {d.name}
                    </p>
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>
                      {d.code} · {d.dept}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "#6B7280" }}>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-sm" style={{ color: "#5B4BDB" }}>{d.approval}</span>
                    <span>aprovação</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-sm" style={{ color: "#202124" }}>{d.materials}</span>
                    <span>materiais</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCES ───────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-8 pb-16"
        style={{ maxWidth: 1440 }}
      >
        <div className="mb-10">
          <p
            className="text-sm font-semibold mb-2 tracking-widest uppercase"
            style={{ color: "#F4C542", letterSpacing: "0.1em" }}
          >
            Relatos reais
          </p>
          <h2
            className="text-4xl font-bold"
            style={{ fontFamily: "Poppins, sans-serif", color: "#202124", letterSpacing: "-0.02em" }}
          >
            O que dizem os estudantes
          </h2>
        </div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {experiences.map((e) => (
            <ExperienceCard key={e.name} {...e} />
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-8 pb-20"
        style={{ maxWidth: 1440 }}
      >
        <div
          className="rounded-3xl overflow-hidden relative px-16 py-16 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #5B4BDB 0%, #7C6CF0 100%)",
          }}
        >
          {/* Hand-drawn doodles in background */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1200 280"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            style={{ opacity: 0.12 }}
          >
            <path d="M100 50 C140 30 170 70 200 50 C230 30 260 65 290 50" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M900 200 C940 180 970 220 1000 200 C1030 180 1060 215 1090 200" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="180" r="30" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="1150" cy="60" r="25" stroke="white" strokeWidth="2" fill="none" />
            <path d="M500 20 L503 30 L513 30 L505 36 L508 46 L500 40 L492 46 L495 36 L487 30 L497 30 Z" fill="white" />
            <path d="M800 240 L803 250 L813 250 L805 256 L808 266 L800 260 L792 266 L795 256 L787 250 L797 250 Z" fill="white" />
          </svg>

          {/* Left text */}
          <div className="relative z-10 max-w-xl">
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "Poppins, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              Pronto para explorar a plataforma?
            </h2>
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.7 }}>
              Junte-se a milhares de estudantes da UnB que já estão usando o Tamburetei
              para se preparar melhor e compartilhar conhecimento.
            </p>
          </div>

          {/* Right buttons */}
          <div className="relative z-10 flex flex-col gap-4 items-start flex-shrink-0">
            <button
              className="px-8 py-4 rounded-xl font-bold text-base transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "#F4C542",
                color: "#202124",
                fontFamily: "Poppins, sans-serif",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 24px rgba(244,197,66,0.4)",
              }}
            >
              Explorar agora — é gratuito
            </button>
            <button
              className="px-8 py-4 rounded-xl font-semibold text-base transition-all hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                border: "1.5px solid rgba(255,255,255,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              Como funciona?
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        className="border-t"
        style={{ background: "#FFFFFF", borderColor: "#EDE9FD" }}
      >
        <div
          className="mx-auto px-8 py-10 flex items-center justify-between"
          style={{ maxWidth: 1440 }}
        >
          <div className="flex items-center gap-3">
            <StoolIllustration size={28} />
            <div>
              <span
                className="font-bold"
                style={{ fontFamily: "Poppins, sans-serif", color: "#5B4BDB", fontSize: 15 }}
              >
                Tamburetei
              </span>
              <span
                className="block"
                style={{ color: "#9CA3AF", fontSize: 11, letterSpacing: "0.08em" }}
              >
                INFORMAÇÃO QUE TE APOIA
              </span>
            </div>
          </div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Feito com 💜 por e para estudantes da Universidade de Brasília
          </p>
          <div className="flex gap-6">
            {["Sobre", "Contribuir", "Privacidade", "Contato"].map((l) => (
              <button
                key={l}
                className="text-sm transition-colors hover:text-purple-600"
                style={{ color: "#6B7280", fontFamily: "Inter, sans-serif" }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
