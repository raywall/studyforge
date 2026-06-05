const Theme = (() => {
  const KEY = 'sf_theme';
  const DEFAULT = 'dark';

  function getTheme() {
    return localStorage.getItem(KEY) || DEFAULT;
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(next === 'light'));
      btn.innerHTML = next === 'light' ? '<span>☀</span>' : '<span>☾</span>'; // claro e escuro
    });
  }

  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    applyTheme(getTheme());
    document.addEventListener('DOMContentLoaded', () => applyTheme(getTheme()));
    document.addEventListener('click', event => {
      const btn = event.target.closest('[data-theme-toggle]');
      if (btn) toggleTheme();
    });
  }

  return { getTheme, applyTheme, toggleTheme, initTheme };
})();

Theme.initTheme();
