export const THEME_STORAGE_KEY = "tamburetei-theme";
export const THEME_CHANGE_EVENT = "tamburetei-theme-change";

export type ThemePreference = "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedPreference) ? storedPreference : "light";
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

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference;
}

export function applyTheme(preference: ThemePreference): void {
  const resolvedTheme = resolveTheme(preference);
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

export function getServerThemePreference(): ThemePreference {
  return "light";
}
