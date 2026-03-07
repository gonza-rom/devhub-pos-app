"use client";
// components/ThemeToggle.tsx
// Botón de toggle claro/oscuro — va en el Sidebar

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";


export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        color:      "var(--text-primary)",
        background: "transparent",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)";
        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
      }}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Moon className="h-4 w-4 flex-shrink-0" />
      )}
      <span>{theme === "dark" ? "Tema claro" : "Tema oscuro"}</span>
    </button>
  );
}