// Lightweight theme handling: 'light' | 'dark' | 'auto' (follow system).
// The choice is stored per-device and applied as a data-theme attribute on
// <html>; CSS in index.css supplies the dark palette.
const KEY = 'theme';

export function getTheme() {
  return localStorage.getItem(KEY) || 'auto';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  localStorage.setItem(KEY, theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

// Is the effective theme dark right now (accounting for 'auto')?
export function isDark() {
  const theme = getTheme();
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
