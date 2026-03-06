"use client";
// components/ThemeProvider.tsx
// Agrega la clase "light" al <html> según preferencia guardada en localStorage.
// Uso: wrapeá el layout con <ThemeProvider>

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Leer preferencia guardada al montar
    useEffect(() => {
    const saved = localStorage.getItem("devhub-theme") as Theme | null;
    const initial = saved ?? "dark"; // ← siempre dark si no hay preferencia guardada
    setTheme(initial);
    applyTheme(initial);
    }, []);

  function applyTheme(t: Theme) {
    const html = document.documentElement;
    if (t === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
  }

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("devhub-theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}