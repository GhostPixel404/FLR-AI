import type { ThemePref } from '../types';

/** Resolve a theme preference to the concrete scheme to render. */
export function effectiveTheme(theme: ThemePref): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply the resolved theme to <html data-theme="…"> so CSS + basemap can read it. */
export function applyTheme(theme: ThemePref): void {
  document.documentElement.dataset.theme = effectiveTheme(theme);
}
