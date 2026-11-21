"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Tema da página"
      className="inline-flex items-center gap-0.5 rounded-full border border-[#E8E6F8] p-0.5"
    >
      <button
        type="button"
        aria-label="Usar tema claro"
        title="Claro"
        aria-pressed={preference === "light"}
        onClick={() => setPreference("light")}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] ${
          preference === "light"
            ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
            : "text-gray-500 hover:bg-gray-100 hover:text-[#5B4BDB]"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Usar tema escuro"
        title="Escuro"
        aria-pressed={preference === "dark"}
        onClick={() => setPreference("dark")}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] ${
          preference === "dark"
            ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
            : "text-gray-500 hover:bg-gray-100 hover:text-[#5B4BDB]"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />
        </svg>
      </button>
    </div>
  );
}
