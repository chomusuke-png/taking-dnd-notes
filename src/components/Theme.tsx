import { useEffect } from 'react';
import { useUi, type ThemePref } from '../store/ui';

/** Aplica la preferencia de tema como data-theme en <html>. */
export function useApplyTheme(): void {
  const theme = useUi((s) => s.theme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f6f3ee' : '#121212');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

const NEXT: Record<ThemePref, ThemePref> = { system: 'dark', dark: 'light', light: 'system' };
const LABEL: Record<ThemePref, string> = { system: '🖥️ Sistema', dark: '🌙 Oscuro', light: '☀️ Claro' };

export function ThemeToggle() {
  const { theme, setTheme } = useUi();
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTheme(NEXT[theme])} title="Cambiar tema">
      {LABEL[theme]}
    </button>
  );
}
