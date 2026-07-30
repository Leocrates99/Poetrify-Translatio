/* ============================================================================
   POETRIFY · QUARANTENA — rete di sicurezza dei dati dello studente
   ----------------------------------------------------------------------------
   Poetrify è un sito statico senza backend: TUTTO vive nel localStorage del
   singolo browser. Non c'è una copia altrove. Perciò vale una regola sola:

       MAI SOVRASCRIVERE UN DATO CHE NON SI È RIUSCITI A LEGGERE.

   Il guasto che questo modulo chiude (audit docs/DATI-AUDIT.md §2.2): un JSON
   corrotto veniva intercettato da un `catch` che restituiva l'array vuoto in
   silenzio. Lo studente vedeva il lessico azzerato — nessun avviso — e la
   PRIMA scrittura successiva sovrascriveva la stringa grezza, distruggendo
   per sempre un dato che era ancora recuperabile.

   Qui invece, quando la lettura fallisce:
     1. la stringa grezza viene messa da parte in `poetrify-corrotto.<chiave>.<ts>`
        (nessuna perdita: il dato originale resta, intatto, sotto un altro nome);
     2. l'utente viene AVVISATO (evento `poetrify:dato-corrotto`; se nessuno lo
        ascolta, compare comunque una striscia in fondo alla pagina: nessun
        fallimento muto);
     3. solo allora si riparte dal valore di ripiego.

   Uso (script classico, prima dei moduli):
     <script src="shared/poetrify-quarantena.js"></script>

     const voci = PoetrifyQuarantena.leggiJSON('poetrify-personal-vocab', []);
     PoetrifyQuarantena.scriviJSON('poetrify-personal-vocab', voci);

   Recupero manuale dalla console del browser:
     PoetrifyQuarantena.elenco()               → cosa c'è in quarantena
     PoetrifyQuarantena.scarica(nome)          → salva il grezzo su file
     PoetrifyQuarantena.ripristina(nome)       → rimette il grezzo al suo posto
   ============================================================================ */
(function () {
  'use strict';

  var PREFISSO = 'poetrify-corrotto.';
  var MAX_IN_QUARANTENA = 12;   /* tetto: la quarantena non deve a sua volta riempire la memoria */

  /* ── utilità di base ───────────────────────────────────────────────────── */
  function ora() { return new Date().toISOString(); }

  function chiaviQuarantena() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFISSO) === 0) out.push(k);
      }
    } catch (e) { /* storage non accessibile: nulla da elencare */ }
    return out.sort();
  }

  /* Evita di accumulare copie identiche: se lo stesso grezzo è già in
     quarantena per la stessa chiave, non se ne crea un'altra. */
  function giaInQuarantena(chiave, grezzo) {
    var pref = PREFISSO + chiave + '.';
    var lista = chiaviQuarantena();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].indexOf(pref) !== 0) continue;
      try { if (localStorage.getItem(lista[i]) === grezzo) return lista[i]; } catch (e) {}
    }
    return null;
  }

  function potaQuarantena() {
    var lista = chiaviQuarantena();
    while (lista.length > MAX_IN_QUARANTENA) {
      try { localStorage.removeItem(lista.shift()); } catch (e) { break; }
    }
  }

  /* ── avviso all'utente: mai un fallimento muto ─────────────────────────── */
  function avvisa(dettaglio) {
    var ev;
    try {
      ev = new CustomEvent('poetrify:dato-corrotto', { detail: dettaglio, cancelable: true });
      /* Se una pagina gestisce l'evento (es. col proprio toast) e chiama
         preventDefault(), non mostriamo la striscia di ripiego. */
      var proseguire = document.dispatchEvent(ev);
      if (!proseguire) return;
    } catch (e) { /* CustomEvent non disponibile: si va di striscia */ }
    striscia(dettaglio);
  }

  function striscia(d) {
    function mostra() {
      if (document.getElementById('poetrify-avviso-corrotto')) return;
      var box = document.createElement('div');
      box.id = 'poetrify-avviso-corrotto';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;'
        + 'max-width:640px;margin:0 auto;padding:12px 14px;border-radius:10px;'
        + 'border:1px solid var(--warning,#b9791f);background:var(--paper,#fff);'
        + 'color:var(--ink,#2c3539);font:14px/1.5 var(--font-ui,system-ui,sans-serif);'
        + 'box-shadow:var(--shadow,0 6px 22px rgba(44,53,57,.18));display:flex;gap:10px;align-items:flex-start';
      var testo = document.createElement('div');
      testo.style.cssText = 'flex:1;min-width:0';
      testo.innerHTML = '<strong>Un dato salvato non era leggibile.</strong><br>'
        + 'Non è stato cancellato: è stato messo da parte '
        + '<span style="opacity:.75">(' + (d && d.quarantena ? String(d.quarantena) : 'in quarantena') + ')</span>. '
        + 'Puoi continuare a lavorare. Per sicurezza <strong>esporta un backup</strong>; '
        + 'per recuperare il dato apri la console e usa <code>PoetrifyQuarantena.elenco()</code>.';
      var chiudi = document.createElement('button');
      chiudi.type = 'button';
      chiudi.textContent = '✕';
      chiudi.setAttribute('aria-label', 'Chiudi avviso');
      chiudi.style.cssText = 'flex:none;border:1px solid var(--rule,#d5d2cb);background:transparent;'
        + 'color:inherit;border-radius:6px;width:28px;height:28px;cursor:pointer;line-height:1';
      chiudi.addEventListener('click', function () { box.remove(); });
      box.appendChild(testo); box.appendChild(chiudi);
      document.body.appendChild(box);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostra);
    else mostra();
  }

  /* ── API ───────────────────────────────────────────────────────────────── */

  /**
   * Legge e interpreta un JSON dal localStorage senza mai distruggerlo.
   * @param {string} chiave      chiave di localStorage
   * @param {*}      ripiego     valore restituito se manca o è illeggibile
   * @param {object} [opz]       { valida: fn(valore)->bool } controllo di forma
   * @returns {*} il valore interpretato, oppure `ripiego`
   */
  function leggiJSON(chiave, ripiego, opz) {
    var grezzo = null;
    try { grezzo = localStorage.getItem(chiave); }
    catch (e) { return ripiego; }                    /* storage non accessibile */
    if (grezzo === null || grezzo === '') return ripiego;

    var valore;
    try { valore = JSON.parse(grezzo); }
    catch (e) { return _quarantena(chiave, grezzo, ripiego, 'JSON non interpretabile'); }

    var valida = opz && typeof opz.valida === 'function' ? opz.valida : null;
    if (valida && !valida(valore)) {
      return _quarantena(chiave, grezzo, ripiego, 'forma inattesa');
    }
    return valore;
  }

  function _quarantena(chiave, grezzo, ripiego, motivo) {
    var nome = giaInQuarantena(chiave, grezzo);
    if (!nome) {
      nome = PREFISSO + chiave + '.' + ora();
      try {
        localStorage.setItem(nome, grezzo);
        potaQuarantena();
      } catch (e) {
        /* Non c'è spazio nemmeno per la copia: NON tocchiamo l'originale.
           Meglio un dato illeggibile ma presente che un dato perduto. */
        console.error('[quarantena] impossibile mettere da parte «' + chiave + '»:', e);
        avvisa({ chiave: chiave, motivo: motivo, quarantena: null, salvata: false });
        return ripiego;
      }
    }
    console.warn('[quarantena] «' + chiave + '» ' + motivo + ' → messo da parte in «' + nome + '»');
    avvisa({ chiave: chiave, motivo: motivo, quarantena: nome, salvata: true });
    return ripiego;
  }

  /**
   * Scrive un valore come JSON. Restituisce true/false: l'esito NON va ignorato.
   * @returns {boolean} false se la scrittura è fallita (memoria piena)
   */
  function scriviJSON(chiave, valore) {
    try {
      localStorage.setItem(chiave, JSON.stringify(valore));
      return true;
    } catch (e) {
      console.error('[quarantena] scrittura fallita su «' + chiave + '»:', e);
      try {
        document.dispatchEvent(new CustomEvent('poetrify:memoria-piena', {
          detail: { chiave: chiave, errore: String(e && e.name || e) },
        }));
      } catch (e2) {}
      return false;
    }
  }

  /* Il nome in quarantena è «PREFISSO + chiaveOriginale + '.' + timestamp ISO».
     Il timestamp contiene esso stesso dei punti (…:37.208Z), quindi NON si può
     tagliare sull'ultimo punto: si riconosce la data in coda con un'espressione
     regolare, altrimenti ripristina() scriverebbe su una chiave sbagliata. */
  var CODA_ISO = /^(.*)\.(\d{4}-\d{2}-\d{2}T[0-9:.]+Z)$/;

  /** Elenco leggibile di ciò che è in quarantena. */
  function elenco() {
    return chiaviQuarantena().map(function (k) {
      var resto = k.slice(PREFISSO.length);
      var m = CODA_ISO.exec(resto);
      var grezzo = '';
      try { grezzo = localStorage.getItem(k) || ''; } catch (e) {}
      return {
        nome: k,
        chiaveOriginale: m ? m[1] : resto,
        quando: m ? m[2] : '',
        byte: grezzo.length,
        anteprima: grezzo.slice(0, 160),
      };
    });
  }

  /** Rimette il grezzo al suo posto (sovrascrive l'attuale: da usare con criterio). */
  function ripristina(nome) {
    var voce = elenco().filter(function (v) { return v.nome === nome; })[0];
    if (!voce) return false;
    try {
      var grezzo = localStorage.getItem(nome);
      if (grezzo === null) return false;
      localStorage.setItem(voce.chiaveOriginale, grezzo);
      return true;
    } catch (e) { console.error('[quarantena] ripristino fallito:', e); return false; }
  }

  /** Salva su file il contenuto in quarantena (per recuperarlo a mano). */
  function scarica(nome) {
    var grezzo;
    try { grezzo = localStorage.getItem(nome); } catch (e) { return false; }
    if (grezzo === null) return false;
    try {
      var blob = new Blob([grezzo], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nome.replace(/[^\w.-]+/g, '_') + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { console.error('[quarantena] download fallito:', e); return false; }
  }

  /** Elimina una voce dalla quarantena (irreversibile: chiedere conferma a monte). */
  function scarta(nome) {
    try { localStorage.removeItem(nome); return true; }
    catch (e) { return false; }
  }

  window.PoetrifyQuarantena = {
    leggiJSON: leggiJSON,
    scriviJSON: scriviJSON,
    elenco: elenco,
    ripristina: ripristina,
    scarica: scarica,
    scarta: scarta,
    PREFISSO: PREFISSO,
  };
})();
