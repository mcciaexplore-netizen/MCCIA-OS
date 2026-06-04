// Prevent theme flash: apply the persisted/system theme before first paint.
// Kept as an external file (not inline) so the Content-Security-Policy can use
// a strict `script-src 'self'` with no inline-script exceptions.
(function () {
  try {
    var stored = localStorage.getItem('mccia-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (stored !== 'light' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    /* ignore */
  }
})();
