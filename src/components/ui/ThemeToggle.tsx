import { useState } from 'react';
import { getTheme, setTheme } from '../../lib/theme';
import type { Theme } from '../../lib/theme';

/** Light / dark switch. The theme is applied to <html> and remembered on the device. */
export default function ThemeToggle({ className = 'tbtn' }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || getTheme());

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setLocal(next);
  };

  return (
    <button type="button" className={className} onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
