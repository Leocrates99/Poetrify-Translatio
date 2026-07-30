/* ============================================================================
   POETRIFY · I MANUALI IN ADOZIONE — profilo minimo, condiviso da tutte le pagine
   ----------------------------------------------------------------------------
   A che serve: sapere DA QUALE LIBRO viene una versione. Nel liceo la versione
   non si chiama «Cicerone, De officiis I 15»: si chiama «la 148 di pagina 212».
   Il manuale sta qui, nel profilo, e non si ridigita a ogni brano; numero e
   pagina restano sul singolo brano.

   ⚠ NON è il vecchio «profilo studente» e NON contiene fasce di competenza
   (base/intermedio/avanzato): quel sistema è stato ABOLITO e non va reintrodotto.
   Qui dentro ci sono soltanto libri. Il servizio resta unico e completo per tutti.

   Uso:  <script src="shared/poetrify-manuali.js"></script>
         PoetrifyManuali.lista('la')        → i manuali di latino in adozione
         PoetrifyManuali.preferito('grc')   → quello da proporre per primo
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'poetrify-manuali';
  var VERSIONE = 1;

  /* Le superfici usano due grafie per la lingua (ISO la/grc e legacy
     latino/greco): si accettano entrambe, come già fa il resto del progetto. */
  function normLang(l) {
    var s = String(l || '').toLowerCase();
    return (s === 'grc' || s === 'greco') ? 'grc' : 'la';
  }

  function vuoto() { return { v: VERSIONE, la: [], grc: [] }; }

  function leggi() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return vuoto();
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return vuoto();
      if (!Array.isArray(p.la)) p.la = [];
      if (!Array.isArray(p.grc)) p.grc = [];
      p.v = VERSIONE;
      return p;
    } catch (e) { return vuoto(); }   // file:// o modalità privata: non bloccare mai
  }

  function scrivi(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); return true; }
    catch (e) { return false; }
  }

  function lista(lang) { return leggi()[normLang(lang)].slice(); }

  /* Il preferito è quello marcato; in mancanza, il primo della lista. Serve a
     proporre subito il libro giusto senza obbligare a scegliere ogni volta. */
  function preferito(lang) {
    var arr = lista(lang);
    if (!arr.length) return null;
    for (var i = 0; i < arr.length; i++) if (arr[i].preferito) return arr[i];
    return arr[0];
  }

  function setPreferito(lang, id) {
    var L = normLang(lang), p = leggi();
    p[L] = p[L].map(function (m) { return Object.assign({}, m, { preferito: m.id === id }); });
    scrivi(p);
    return preferito(L);
  }

  function _id() { return 'man-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4).toString(36); }

  function aggiungi(lang, dati) {
    var L = normLang(lang), p = leggi();
    var titolo = String((dati && dati.titolo) || '').trim();
    if (!titolo) return null;                       // il titolo è l'unico dato indispensabile
    var voce = {
      id: _id(),
      titolo: titolo,
      editore: String((dati && dati.editore) || '').trim(),
      anno: String((dati && dati.anno) || '').trim(),
      preferito: p[L].length === 0                  // il primo inserito è anche il predefinito
    };
    p[L].push(voce);
    scrivi(p);
    return voce;
  }

  function rimuovi(lang, id) {
    var L = normLang(lang), p = leggi();
    var era = p[L].find(function (m) { return m.id === id; });
    p[L] = p[L].filter(function (m) { return m.id !== id; });
    /* Se se ne va il predefinito, il primo rimasto prende il suo posto: la
       lista non resta mai senza un libro da proporre. */
    if (era && era.preferito && p[L].length) p[L][0].preferito = true;
    scrivi(p);
    return p[L].slice();
  }

  /* Etichetta leggibile: «Titolo — Editore (anno)», omettendo ciò che manca. */
  function etichetta(m) {
    if (!m) return '';
    var s = m.titolo || '';
    if (m.editore) s += ' — ' + m.editore;
    if (m.anno) s += ' (' + m.anno + ')';
    return s;
  }

  /* ── CATALOGO DI PARTENZA ──────────────────────────────────────────────────
     Sono SUGGERIMENTI per l'inserimento rapido, non «i tuoi libri»: il profilo
     nasce vuoto e si popola con un clic o a mano. L'elenco è volutamente breve
     e limitato ai titoli di larga diffusione nel liceo italiano: in un dominio
     che il docente conosce meglio di chiunque, una lista corta e corretta vale
     più di una lunga e approssimativa. Va corretto ed esteso liberamente. */
  var SUGGERITI = {
    la: [
      { titolo: 'Il nuovo Tantucci Plus',      editore: 'Poseidonia Scuola' },
      { titolo: 'Nuovo comprendere e tradurre', editore: 'Bompiani per la scuola' },
      { titolo: 'Lingua viva',                  editore: 'Bruno Mondadori' },
      { titolo: 'Nuovo Lingua Magistra',        editore: 'Petrini' }
    ],
    grc: [
      { titolo: 'Greco. Corso di lingua e cultura greca', editore: 'Sansoni per la Scuola' },
      { titolo: 'Gymnasion',                              editore: 'Paravia' },
      { titolo: 'Ellenistì',                              editore: 'Zanichelli' }
    ]
  };

  window.PoetrifyManuali = {
    KEY: KEY,
    normLang: normLang,
    leggi: leggi,
    lista: lista,
    aggiungi: aggiungi,
    rimuovi: rimuovi,
    preferito: preferito,
    setPreferito: setPreferito,
    etichetta: etichetta,
    SUGGERITI: SUGGERITI
  };
}());
