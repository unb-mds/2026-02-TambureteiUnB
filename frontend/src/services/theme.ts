export const THEME_STORAGE_KEY = "tamburetei-theme";
export const THEME_CHANGE_EVENT = "tamburetei-theme-change";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedPreference) ? storedPreference : "system";
}

export function subscribeThemePreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

export function applyTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): void {
  const resolvedTheme = resolveTheme(preference, systemPrefersDark);
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

export function getServerThemePreference(): ThemePreference {
  return "system";
}
