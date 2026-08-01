/* ============================================================================
   POETRIFY · INDIETRO — tornare alla pagina da cui si è arrivati
   ----------------------------------------------------------------------------
   Finora ogni ritorno portava all'hub: chi entrava nel Corpus dall'avvio di un
   brano, o nei manuali dal passo 1, si ritrovava alla home e doveva rifare la
   strada. Qui il ritorno segue la provenienza reale.

   Come decide:
   · se si arriva da un'ALTRA pagina di Poetrify (referrer di questa origine,
     percorso diverso) → history.back(): si torna esattamente da dove si veniva,
     con il suo stato di scorrimento;
   · altrimenti (link aperto da fuori, tab nuova, pagina ricaricata) → si va
     alla destinazione di ripiego dichiarata nel markup.

   Perché non `history.length`: conta anche le voci di ALTRI siti nella stessa
   scheda, quindi non dice se l'indietro resta dentro Poetrify. Il referrer sì.

   Uso:  <script src="shared/poetrify-indietro.js"></script>
         <a href="app.html" data-indietro>← Torna agli strumenti</a>
   L'etichetta scritta nel markup nomina il RIPIEGO; se un vero indietro è
   possibile, lo script la sostituisce con «← Indietro» — così il pulsante non
   promette mai una destinazione diversa da quella dove porta davvero.
   ========================================================================== */
(function () {
  'use strict';

  /* Vero solo se il passo indietro resta dentro Poetrify e non è un semplice
     ricaricamento della stessa pagina. */
  function daPoetrify() {
    try {
      if (!document.referrer) return false;
      var r = new URL(document.referrer);
      if (r.origin !== location.origin) return false;
      return r.pathname !== location.pathname;
    } catch (e) { return false; }
  }

  /* Nome della pagina di provenienza per il tooltip, già con la preposizione
     articolata giusta: si compone «Torna » + questa voce, non «Torna a » +
     nome — altrimenti verrebbe «torna a gli strumenti». */
  var NOMI = {
    'app.html': 'agli strumenti',
    'lingua.html': 'alla scelta della lingua',
    'translator.html': 'al Translator',
    'dictionary.html': 'al Dizionario',
    'corpus.html': 'al Corpus',
    'profilo.html': 'ai tuoi manuali',
  };
  function nomeProvenienza() {
    try {
      var f = new URL(document.referrer).pathname.split('/').pop();
      return NOMI[f] || null;
    } catch (e) { return null; }
  }

  function torna(ripiego) {
    if (daPoetrify()) { history.back(); return; }
    location.href = ripiego || 'app.html';
  }

  /* Cambia SOLO il testo, mai i figli: `el.textContent = …` cancellerebbe anche
     l'icona dentro al pulsante (successo davvero, sulla freccia del Corpus).
     Se il markup dichiara un segnaposto [data-indietro-etichetta] si scrive lì. */
  function scriviEtichetta(el, testo) {
    var seg = el.querySelector('[data-indietro-etichetta]');
    if (seg) { seg.textContent = testo; return; }
    var scritto = false;
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        n.textContent = scritto ? '' : testo;
        scritto = true;
      }
    });
    if (!scritto) el.appendChild(document.createTextNode(testo));
  }

  function cabla() {
    var indietro = daPoetrify();
    var dove = indietro ? nomeProvenienza() : null;
    document.querySelectorAll('[data-indietro]').forEach(function (el) {
      var ripiego = el.getAttribute('data-indietro') || el.getAttribute('href') || 'app.html';
      el.addEventListener('click', function (e) { e.preventDefault(); torna(ripiego); });
      if (indietro) {
        /* L'etichetta segue la destinazione vera: mai promettere l'hub e
           portare altrove, né il contrario. */
        if (!el.dataset.indietroFisso) scriviEtichetta(el, '← Indietro');
        el.title = dove ? ('Torna ' + dove) : 'Torna alla pagina precedente';
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cabla);
  else cabla();

  window.PoetrifyIndietro = { torna: torna, daPoetrify: daPoetrify, nomeProvenienza: nomeProvenienza };
}());
