"use client";

import { useTheme } from "@/components/ThemeProvider";
import { isThemePreference, type ThemePreference } from "@/services/theme";

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

export default function ThemeSelector({
  className = "",
}: {
  className?: string;
}) {
  const { preference, setPreference } = useTheme();

  return (
    <label className={`flex items-center gap-2 text-xs font-medium text-gray-600 ${className}`}>
      <span>Tema</span>
      <select
        aria-label="Tema da aparência"
        value={preference}
        onChange={(event) => {
          if (isThemePreference(event.target.value)) {
            setPreference(event.target.value);
          }
        }}
        className="rounded-lg border border-[#DDD9F1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202124] outline-none focus:border-[#5B4BDB] focus:ring-2 focus:ring-[#5B4BDB]/20"
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
