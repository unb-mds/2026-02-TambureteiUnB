interface StoolLogoProps {
  size?: number;
}

export default function StoolLogo({ size = 36 }: StoolLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Símbolo do banquinho Tamburetei"
    >
      {/* Assento */}
      <rect x="30" y="70" width="160" height="28" rx="14" fill="#5B4BDB" />
      {/* Perna esquerda */}
      <path
        d="M60 98 C55 140 48 165 42 190"
        stroke="#5B4BDB"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Perna direita */}
      <path
        d="M160 98 C165 140 172 165 178 190"
        stroke="#5B4BDB"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Perna central esquerda */}
      <path
        d="M95 98 C93 138 88 162 82 192"
        stroke="#7C6CF0"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Perna central direita */}
      <path
        d="M125 98 C127 138 132 162 138 192"
        stroke="#7C6CF0"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Barra de apoio dos pés */}
      <path
        d="M50 155 C90 148 130 148 170 155"
        stroke="#F4C542"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Destaque do assento */}
      <rect x="50" y="75" width="120" height="8" rx="4" fill="#7C6CF0" opacity="0.5" />
      {/* Estrela decorativa */}
      <path
        d="M195 55 L198 62 L205 62 L199 67 L201 74 L195 70 L189 74 L191 67 L185 62 L192 62 Z"
        fill="#F4C542"
        opacity="0.9"
      />
      {/* Detalhes circulares */}
      <circle cx="22" cy="110" r="4" fill="#F4C542" opacity="0.6" />
      <circle cx="14" cy="125" r="2.5" fill="#5B4BDB" opacity="0.4" />
      <circle cx="200" cy="105" r="3" fill="#5B4BDB" opacity="0.3" />
      {/* Círculo desenhado à mão */}
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