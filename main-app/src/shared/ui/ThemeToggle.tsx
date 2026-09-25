import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Theme = "light" | "dark";

// Prefer the saved choice, then the operating-system preference on first use.
function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage?.getItem("goelta-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }
    window.localStorage?.setItem("goelta-theme", theme);
  }, [theme]);

  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <Icon name={dark ? "sun" : "moon"} size={19} />
    </button>
  );
}
