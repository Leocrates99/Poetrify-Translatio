/* ============================================================================
   POETRIFY · TEMA CONDIVISO (D2)
   Unifica il dark su [data-theme] su <html>. Persiste su localStorage
   'poetrify-theme'; in mancanza segue prefers-color-scheme (impostato prima del
   paint dallo script anti-flash inline in <head>).
   - Nei file SENZA un toggle proprio (app, corpus) inietta un pulsante flottante.
   - Nei file con un toggle proprio (dictionary, translator) NON iniettare:
     linkare comunque per PoetrifyTheme.toggle()/set() e cablarci il bottone.
   Uso: <script src="shared/poetrify-theme.js" data-inject-toggle></script>
   ============================================================================ */
(function () {
  'use strict';
  var KEY = 'poetrify-theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme')
      || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function set(mode) {
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    var b = document.getElementById('poetrify-theme-toggle');
    if (b) {
      b.setAttribute('aria-pressed', String(mode === 'dark'));
      b.textContent = mode === 'dark' ? '☾' : '☀';
      b.title = mode === 'dark' ? 'Tema scuro (attivo) — passa al chiaro' : 'Tema chiaro (attivo) — passa allo scuro';
    }
  }
  function toggle() { set(current() === 'dark' ? 'light' : 'dark'); }

  function mountFloating() {
    if (document.getElementById('poetrify-theme-toggle')) return;
    var b = document.createElement('button');
    b.id = 'poetrify-theme-toggle';
    b.type = 'button';
    b.setAttribute('aria-label', 'Alterna tema chiaro/scuro');
    b.style.cssText = 'position:fixed;top:14px;right:14px;z-index:9999;width:40px;height:40px;'
      + 'display:inline-flex;align-items:center;justify-content:center;border-radius:999px;'
      + 'border:1px solid var(--rule);background:var(--paper);color:var(--ink);cursor:pointer;'
      + 'font-size:16px;line-height:1;box-shadow:var(--shadow-sm);transition:var(--transition)';
    b.addEventListener('click', toggle);
    document.body.appendChild(b);
    set(current());
  }

  // Espone l'API per i toggle già esistenti (dictionary/translator)
  window.PoetrifyTheme = { toggle: toggle, set: set, current: current };

  // Inietta il pulsante flottante solo se richiesto con data-inject-toggle
  var self = document.currentScript;
  if (self && self.hasAttribute('data-inject-toggle')) {
    if (document.readyState !== 'loading') mountFloating();
    else document.addEventListener('DOMContentLoaded', mountFloating);
  }
})();
