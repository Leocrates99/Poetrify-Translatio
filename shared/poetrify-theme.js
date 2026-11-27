/* ============================================================================
   POETRIFY · TEMA CONDIVISO (D2)
   Unifica il dark su [data-theme] su <html>. Persiste su localStorage
   'poetrify-theme'; in mancanza segue prefers-color-scheme (impostato prima del
   paint dallo script anti-flash inline in <head>).
   - Nei file SENZA un toggle proprio (app, corpus, profilo, lingua) il comando
     del tema sta DENTRO la testata, in coda alla firma, come `#tema` in
     Translatio: la pagina lo scrive nel markup
       <button class="tema-casa" id="poetrify-theme-toggle" type="button"
               aria-label="Alterna tema chiaro/scuro"></button>
     e questo script lo cabla (icona, etichetta, clic). La forma la danno i token
     condivisi (`.tema-casa` in shared/poetrify-tokens.css).
     Prima qui si iniettava un pulsante flottante (fixed, in alto a destra): non
     occupava spazio nella testata e copriva la fine della firma.
   - Nei file con un toggle proprio (dictionary, translator) NON cablare:
     linkare comunque per PoetrifyTheme.toggle()/set() e cablarci il bottone.
   Uso: <script src="shared/poetrify-theme.js" data-inject-toggle></script>
   ============================================================================ */
(function () {
  'use strict';
  var KEY = 'poetrify-theme';
  var ID = 'poetrify-theme-toggle';
  var root = document.documentElement;

  /* Le stesse icone di Translatio (translatio/js/ui/icone.js): un tratto solo,
     il colore lo da' il contesto. Il pulsante mostra dove porta, non dov'e'. */
  function icona(d) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d
      + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  var LUNA = icona('M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z');
  var SOLE = icona('M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z');

  function current() {
    return root.getAttribute('data-theme')
      || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function set(mode) {
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    var b = document.getElementById(ID);
    if (b) {
      var scuro = mode === 'dark';
      b.innerHTML = scuro ? SOLE : LUNA;
      b.setAttribute('aria-label', scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro');
      b.title = b.getAttribute('aria-label');
    }
  }
  function toggle() { set(current() === 'dark' ? 'light' : 'dark'); }

  function mount() {
    var b = document.getElementById(ID);
    if (!b) {
      // Ripiego per una pagina che non ha scritto il pulsante: lo si mette in
      // coda alla sua testata; senza testata, resta flottante.
      b = document.createElement('button');
      b.id = ID;
      b.type = 'button';
      b.className = 'tema-casa';
      var testata = document.querySelector('header');
      if (testata) testata.appendChild(b);
      else {
        b.style.cssText = 'position:fixed;top:14px;right:14px;z-index:9999;margin:0';
        document.body.appendChild(b);
      }
    }
    if (b.dataset.cablato) return;
    b.dataset.cablato = '1';
    b.addEventListener('click', toggle);
    set(current());
  }

  // Espone l'API per i toggle già esistenti (dictionary/translator)
  window.PoetrifyTheme = { toggle: toggle, set: set, current: current };

  // Cabla il comando della testata solo se richiesto con data-inject-toggle
  var self = document.currentScript;
  if (self && self.hasAttribute('data-inject-toggle')) {
    // Lo script sta in fondo al <body>: la testata e' gia' scritta, e cablarla
    // subito evita un primo disegno col pulsante vuoto.
    if (document.readyState !== 'loading' || document.getElementById(ID)) mount();
    else document.addEventListener('DOMContentLoaded', mount);
  }
})();
