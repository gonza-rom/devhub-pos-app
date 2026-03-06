// app/theme-script.tsx
// Previene el flash blanco/negro al cargar la página.
// Se ejecuta ANTES que React hidrate — va inline en el <head> del layout.

export function ThemeScript() {
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('devhub-theme');
        if (saved === 'light') document.documentElement.classList.add('light');
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}