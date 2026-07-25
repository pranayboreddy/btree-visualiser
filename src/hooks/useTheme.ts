import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "treelab-theme";

function readStored(): Theme | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : null;
}

/**
 * Light/dark theme with an explicit override persisted to localStorage.
 * When no override is set, the OS preference wins (handled purely in CSS).
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [override, setOverride] = useState<Theme | null>(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (override) {
      root.setAttribute("data-theme", override);
      localStorage.setItem(STORAGE_KEY, override);
    } else {
      root.removeAttribute("data-theme");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [override]);

  const systemDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: Theme = override ?? (systemDark ? "dark" : "light");
  const toggle = (): void => setOverride(theme === "dark" ? "light" : "dark");

  return { theme, toggle };
}
