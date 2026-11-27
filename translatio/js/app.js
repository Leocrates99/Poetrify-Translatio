/* ============================================================================
   TRANSLATIO · il banco dove lo studente analizza e traduce la sua versione
   ----------------------------------------------------------------------------
   Translatio non analizza al posto dello studente: gli da' il banco (il testo
   diviso in frasi, le caselle della grammatica, i fili dei sintagmi e delle
   proposizioni), disegna cio' che lui scrive e alla fine lo impagina in un
   documento da consegnare. E' isolato: non legge il lessico, i paradigmi o il
   corpus di Poetrify; ne usa solo i token grafici e i caratteri.

   Un flusso solo, in quattro tappe: TESTO → ANALISI → VERSIONE → CONSEGNA.
   L'analisi scende in quattro livelli, nell'ordine: sintattica (il periodo),
   logica (i sintagmi), grammaticale (le parole), traduzione della frase.
   Navigazione con l'hash, bidirezionale (il tasto Indietro cambia la vista):
     #/                                  archivio
     #/nuova · #/nuova/<lingua>          porta della lingua · testo nuovo
     #/v/<id>/testo                      il brano e le frasi
     #/v/<id>/analisi/<frase>/<lente>    il banco
     #/v/<id>/traduzione                 la versione intera (la tappa «Versione»)
     #/v/<id>/consegna                   il documento da consegnare
   ============================================================================ */
import { html, raw, $, monta, annuncia, scaricaFile, copiaTesto, nomeFile } from './ui/dom.js';
import { ICONE } from './ui/icone.js';
import { ESEMPI } from './esempi.js';
import { dividiInFrasi, tokenizza, normalizzaSpazi } from './motore/testo.js';
import { trattiCoerenti, taglia, formaTagliabile } from './motore/grammatica.js';
import { segmentoDi } from './motore/sintassi.js';
import {
  nuovaVersione, nuovaFrase, riallineaFrasi, haLavoro, caricaVersione, salvaVersione,
  salvaPiuTardi, salvaSubito, eliminaVersione, esportaJSON, importaJSON, nuovoId,
} from './stato.js';
import { vistaArchivio, vistaPorta } from './viste/archivio.js';
import { vistaTesto, anteprimaFrasi, avvisoLingua } from './viste/testo.js';
import {
  vistaAnalisi, scheda, fraseViva, LENTI, PRIMA_LENTE, gruppoDaCompilare, valoriDelGruppo,
} from './viste/analisi.js';
import { vistaTraduzione, versioneInMarkdown, soloTraduzione } from './viste/traduzione.js';
import { vistaConsegna, controllo } from './viste/consegna.js';
import { documento, paginaDaConsegnare, oggi } from './viste/documento.js';
import { CSS_DOCUMENTO } from './viste/stile-documento.js';

const S = {
  vista: 'archivio',
  v: null,
  bozza: null,
  frase: 0,
  lente: PRIMA_LENTE,
  sel: null,
  span: null,
  ancora: null,
  segnoAttivo: null,
  filtro: '',
  schedaGruppoAperta: false,
  apriMorfemi: false,
  mostra: 'bella',
  modoDividi: false,
  focusParola: false,
};
const VISTE_DI_VERSIONE = new Set(['testo', 'analisi', 'traduzione', 'consegna']);
const NOMI_LENTI = new Set(LENTI.map(l => l.k));
const contaParole = f => tokenizza(f.testo).filter(t => t.k === 'w').length;
const paroleDi = f => tokenizza(f.testo).filter(t => t.k === 'w');
const salva = () => salvaPiuTardi(S.v, contaParole);
const frase = () => S.v && S.v.frasi[S.frase];
const tastieraFine = () => { try { return matchMedia('(pointer: fine)').matches; } catch (_) { return true; } };

/* ── rotte ────────────────────────────────────────────────────────────────── */
function rotta() {
  const parti = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!parti.length) return { vista: 'archivio' };
  if (parti[0] === 'nuova') {
    return ['latino', 'greco'].includes(parti[1]) ? { vista: 'testo', nuova: parti[1] } : { vista: 'porta' };
  }
  if (parti[0] === 'v' && parti[1]) {
    const id = parti[1];
    const sez = VISTE_DI_VERSIONE.has(parti[2]) ? parti[2] : 'analisi';
    if (sez !== 'analisi') return { vista: sez, id };
    const n = parseInt(parti[3], 10);
    return { vista: 'analisi', id, frase: Number.isFinite(n) ? n - 1 : null, lente: NOMI_LENTI.has(parti[4]) ? parti[4] : null };
  }
  return { vista: 'archivio' };
}

function vai(h, { sostituisci = false } = {}) {
  if (location.hash === h) { render(); return; }
  if (sostituisci) { history.replaceState(null, '', h); render(); } else location.hash = h;
}

function azzeraSelezione() {
  S.sel = null; S.span = null; S.ancora = null; S.segnoAttivo = null;
  S.filtro = ''; S.schedaGruppoAperta = false; S.apriMorfemi = false;
}

/* ── disegno ──────────────────────────────────────────────────────────────── */
function nastro() {
  const el = $('#nastro');
  if (!S.v) { el.innerHTML = ''; el.className = ''; return; }
  const v = S.v;
  const pos = v.posizione || {};
  const tappa = (vista, href, nome) => html`<a class="tappa" href="${href}" ${S.vista === vista ? raw('aria-current="page"') : ''}>${nome}</a>`;
  el.className = 'nastro';
  monta(el, html`<div class="titolo-versione"><strong>${v.titolo || 'Versione senza titolo'}</strong>${v.autore ? html`<span>${v.autore}</span>` : ''}</div>
    <nav class="tappe" aria-label="Tappe della versione">
      ${tappa('testo', `#/v/${v.id}/testo`, 'Testo')}
      ${tappa('analisi', `#/v/${v.id}/analisi/${(pos.frase || 0) + 1}/${pos.lente || PRIMA_LENTE}`, 'Analisi')}
      ${tappa('traduzione', `#/v/${v.id}/traduzione`, 'Versione')}
      ${tappa('consegna', `#/v/${v.id}/consegna`, 'Consegna')}
    </nav>`, { conservaScroll: false });
}

/* Il fuoco e lo scorrimento sopravvivono al ridisegno: chi sta scrivendo nel
   filtro, o scorrendo la scheda, non deve accorgersi che la pagina e' rifatta. */
const ATTR_FUOCO = ['az', 'campo', 'i', 'f', 'k', 'n', 'r', 'lente', 'pos', 'g', 'x', 'funzione', 'ruolo', 'tipo', 'grado', 'mostra', 'id'];
function chiaveFuoco(el) {
  if (!el || el === document.body || !el.dataset) return null;
  const parti = ATTR_FUOCO.filter(a => el.dataset[a] != null).map(a => `[data-${a}="${CSS.escape(el.dataset[a])}"]`);
  return parti.length ? parti.join('') : (el.id ? `#${CSS.escape(el.id)}` : null);
}

function render() {
  const r = rotta();
  const prima = { vista: S.vista, id: S.v && S.v.id, frase: S.frase, lente: S.lente };

  if (r.id) {
    if (!S.v || S.v.id !== r.id) {
      salvaSubito();
      const v = caricaVersione(r.id);
      if (!v) { annuncia('Questa versione non c’è più in questo browser.'); vai('#/', { sostituisci: true }); return; }
      S.v = v; azzeraSelezione();
    }
  } else {
    if (S.v) salvaSubito();
    S.v = null;
  }
  S.vista = r.vista;

  if (r.vista === 'testo') {
    if (r.nuova) {
      if (!S.bozza || S.bozza.id || S.bozza.lingua !== r.nuova) {
        S.bozza = { lingua: r.nuova, titolo: '', autore: '', testo: '', corte: false, frasi: [] };
      }
    } else if (!S.bozza || S.bozza.id !== S.v.id) {
      S.bozza = { id: S.v.id, lingua: S.v.lingua, titolo: S.v.titolo, autore: S.v.autore, testo: S.v.testo, corte: !!S.v.corte, frasi: S.v.frasi.map(f => f.testo) };
    }
  } else {
    S.bozza = null; S.modoDividi = false;
  }

  if (['analisi', 'traduzione', 'consegna'].includes(r.vista) && !S.v.frasi.length) {
    /* una versione senza frasi (un file importato vuoto) si apre dal testo */
    vai(`#/v/${S.v.id}/testo`, { sostituisci: true });
    return;
  }
  if (r.vista === 'analisi') {
    const pos = S.v.posizione || {};
    const n = r.frase != null ? r.frase : (pos.frase || 0);
    S.frase = Math.min(Math.max(0, n), S.v.frasi.length - 1);
    S.lente = r.lente || pos.lente || PRIMA_LENTE;
    if (prima.id !== S.v.id || prima.frase !== S.frase || prima.lente !== S.lente || prima.vista !== 'analisi') {
      azzeraSelezione();
    }
    if (pos.frase !== S.frase || pos.lente !== S.lente) {
      S.v.posizione = { frase: S.frase, lente: S.lente };
      salva();
    }
    /* l'hash si completa da se': #/v/id/analisi → #/v/id/analisi/3/proposizioni */
    const pieno = `#/v/${S.v.id}/analisi/${S.frase + 1}/${S.lente}`;
    if (location.hash !== pieno) history.replaceState(null, '', pieno);
  }
  if (r.vista === 'consegna' && !S.v.consegna.data) { S.v.consegna.data = oggi(); salva(); }

  document.body.classList.toggle('vista-analisi', S.vista === 'analisi');
  document.body.classList.toggle('vista-consegna', S.vista === 'consegna');
  const lingua = S.v ? S.v.lingua : (S.bozza ? S.bozza.lingua : '');
  if (lingua) document.body.dataset.lang = lingua; else delete document.body.dataset.lang;
  document.title = S.v ? `${S.v.titolo || 'Versione'} · Translatio` : 'Translatio · Poetrify';

  /* fuoco e scorrimento, prima */
  const att = document.activeElement;
  const kf = chiaveFuoco(att);
  const selIn = att && typeof att.selectionStart === 'number' ? [att.selectionStart, att.selectionEnd] : null;
  const corpo = $('#scheda-corpo');
  const yScheda = corpo ? corpo.scrollTop : 0;
  const banco = $('.colonna-banco');
  const yBanco = banco ? banco.scrollTop : 0;
  const stessoBanco = prima.vista === 'analisi' && S.vista === 'analisi' && prima.frase === S.frase && prima.lente === S.lente && prima.id === (S.v && S.v.id);
  const chiaveScheda = `${S.lente}:${S.sel}:${S.span ? S.span.da + '-' + S.span.a : ''}`;
  const stessaScheda = S._chiaveScheda === chiaveScheda;
  S._chiaveScheda = chiaveScheda;

  nastro();
  const main = $('#principale');
  let corpoPagina;
  switch (S.vista) {
    case 'porta': corpoPagina = vistaPorta(); break;
    case 'testo': corpoPagina = vistaTesto(S); break;
    case 'analisi': corpoPagina = vistaAnalisi(S); break;
    case 'traduzione': corpoPagina = vistaTraduzione(S); break;
    case 'consegna': corpoPagina = vistaConsegna(S); break;
    default: corpoPagina = vistaArchivio();
  }
  const yPagina = window.scrollY;
  monta(main, corpoPagina, { conservaScroll: false });
  if (prima.vista !== S.vista || prima.id !== (S.v && S.v.id)) window.scrollTo(0, 0);
  else window.scrollTo(0, yPagina);

  /* fuoco e scorrimento, dopo */
  const corpoDopo = $('#scheda-corpo');
  if (corpoDopo && stessaScheda) corpoDopo.scrollTop = yScheda;
  const bancoDopo = $('.colonna-banco');
  if (bancoDopo && stessoBanco) bancoDopo.scrollTop = yBanco;
  if (S.focusParola && S.sel != null) {
    const b = main.querySelector(`.parola[data-i="${S.sel}"]`);
    if (b) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest' }); }
    S.focusParola = false;
  } else if (kf) {
    const el = main.querySelector(kf) || document.querySelector(kf);
    if (el && el !== document.activeElement) {
      el.focus({ preventScroll: true });
      if (selIn && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(selIn[0], selIn[1]); } catch (_) { /* non tutti gli input */ } }
    }
  }
  autoaltezza();
}

/* Le aree della traduzione crescono col testo, invece di scorrere dentro di se'. */
function autoaltezza(dove = document) {
  dove.querySelectorAll('.versio .area, .area-resa').forEach(a => {
    a.style.height = 'auto';
    a.style.height = `${Math.max(a.scrollHeight + 2, 64)}px`;
  });
}

/* Mentre lo studente scrive lemma e significato, la riga sotto la parola si
   aggiorna; la scheda (dove ha il cursore) no. */
let _fraseTimer = null;
function aggiornaFraseViva() {
  clearTimeout(_fraseTimer);
  _fraseTimer = setTimeout(() => { const el = $('#frase-viva'); if (el && S.vista === 'analisi') monta(el, fraseViva(S)); }, 120);
}
let _foglioTimer = null;
function aggiornaAnteprima() {
  clearTimeout(_foglioTimer);
  _foglioTimer = setTimeout(() => {
    const el = $('#anteprima-documento'); if (el) monta(el, documento(S.v));
    const c = $('#controllo-consegna'); if (c) monta(c, controllo(S.v));
  }, 180);
}

/* ── la parola: si crea quando lo studente ci scrive, sparisce se la svuota ─ */
function parolaDa(i) {
  const f = frase();
  return f.parole[i] || (f.parole[i] = {});
}
function riordina(i) {
  const f = frase();
  const p = f.parole[i];
  if (!p) return;
  for (const k of ['lemma', 'senso', 'nota', 'pos', 'connettivo']) if (!p[k]) delete p[k];
  if (p.tratti && !Object.keys(p.tratti).length) delete p.tratti;
  if (p.morfemi && !p.morfemi.length) delete p.morfemi;
  if (!Object.keys(p).length) delete f.parole[i];
}

/* ── le azioni ───────────────────────────────────────────────────────────── */
function aggiornaFrasiBozza() {
  const b = S.bozza;
  b.frasi = dividiInFrasi(b.testo, b.lingua, { corte: b.corte });
  monta($('#anteprima'), anteprimaFrasi(S));
  monta($('#avviso-lingua'), avvisoLingua(S));
  const c = $('#conto-frasi'); if (c) c.textContent = b.frasi.length || '';
  const btn = document.querySelector('[data-az="conferma-testo"]');
  if (btn) btn.disabled = !b.frasi.length;
}
let _anteprimaTimer = null;

function scegliParola(i) {
  const f = frase();
  if (!f) return;
  const n = paroleDi(f).length;
  if (i < 0 || i >= n) return;
  if (S.sel !== i) S.apriMorfemi = false;
  S.sel = i;
  render();
}

function selezionaInGruppo(i, estendi) {
  if (estendi && S.span) {
    const a = S.ancora != null ? S.ancora : S.span.da;
    S.span = { da: Math.min(a, i), a: Math.max(a, i) };
    S.ancora = null;
  } else if (S.ancora != null && !S.segnoAttivo) {
    S.span = { da: Math.min(S.ancora, i), a: Math.max(S.ancora, i) };
    S.ancora = null;
  } else {
    S.ancora = i; S.span = { da: i, a: i }; S.segnoAttivo = null;
  }
  S.filtro = '';
  render();
}

/* Le proposizioni si scelgono per segmenti: un tocco prende il segmento
   intero; col Maiuscolo la selezione si allarga ai segmenti fino a quello. */
function selezionaSegmento(i, estendi) {
  const f = frase();
  const n = paroleDi(f).length;
  const seg = segmentoDi(i, n, f.tagli);
  if (estendi && S.span) S.span = { da: Math.min(S.span.da, seg.da), a: Math.max(S.span.a, seg.a) };
  else S.span = seg;
  S.ancora = null;
  const gia = f.proposizioni.find(s => s.da === S.span.da && s.a === S.span.a);
  S.segnoAttivo = gia ? gia.id : null;
  render();
}

function segniCorrenti() {
  const f = frase();
  return S.lente === 'sintagmi' ? f.sintagmi : f.proposizioni;
}

const AZIONI = {
  /* archivio */
  esempio(el) {
    const e = ESEMPI[+el.dataset.i];
    const v = nuovaVersione({ lingua: e.lingua, titolo: e.titolo, autore: e.autore, testo: e.testo });
    salvaVersione(v, contaParole);
    vai(`#/v/${v.id}/analisi/1/${PRIMA_LENTE}`);
  },
  esporta(el) {
    const v = caricaVersione(el.dataset.id);
    if (v) scaricaFile(`${nomeFile(v.titolo)}.translatio.json`, esportaJSON(v), 'application/json');
  },
  elimina(el) {
    const v = caricaVersione(el.dataset.id);
    const nome = v && v.titolo ? `«${v.titolo}»` : 'questa versione';
    if (!confirm(`Elimino ${nome}? Il lavoro fatto andrà perso, a meno che tu non ne abbia scaricato il file.`)) return;
    eliminaVersione(el.dataset.id);
    annuncia('Versione eliminata.');
    render();
  },

  /* testo */
  unisci(el) {
    const n = +el.dataset.f;
    const fr = S.bozza.frasi;
    fr.splice(n, 2, `${fr[n]} ${fr[n + 1]}`);
    monta($('#anteprima'), anteprimaFrasi(S));
    const c = $('#conto-frasi'); if (c) c.textContent = fr.length;
  },
  dividi(el) {
    const n = +el.dataset.f; const i = +el.dataset.i;
    const toks = tokenizza(S.bozza.frasi[n]);
    const k = toks.findIndex(t => t.k === 'w' && t.i === i);
    const a = toks.slice(0, k).map(t => t.t).join('').trim();
    const b = toks.slice(k).map(t => t.t).join('').trim();
    if (!a || !b) return;
    S.bozza.frasi.splice(n, 1, a, b);
    monta($('#anteprima'), anteprimaFrasi(S));
    const c = $('#conto-frasi'); if (c) c.textContent = S.bozza.frasi.length;
  },
  'modo-dividi'() { S.modoDividi = !S.modoDividi; render(); },
  'cambia-lingua'(el) {
    S.bozza.lingua = el.dataset.lingua;
    if (!S.bozza.id) { history.replaceState(null, '', `#/nuova/${S.bozza.lingua}`); }
    document.body.dataset.lang = S.bozza.lingua;
    aggiornaFrasiBozza();
    render();
  },
  'conferma-testo'() {
    const b = S.bozza;
    if (!b.frasi.length) return;
    if (!b.id) {
      const v = nuovaVersione({ lingua: b.lingua, titolo: b.titolo.trim(), autore: b.autore.trim(), testo: normalizzaSpazi(b.testo), corte: b.corte });
      v.frasi = b.frasi.map(nuovaFrase);
      salvaVersione(v, contaParole);
      S.bozza = null;
      vai(`#/v/${v.id}/analisi/1/${PRIMA_LENTE}`);
      return;
    }
    const v = S.v;
    const cambiaLingua = b.lingua !== v.lingua;
    let { frasi, perse } = riallineaFrasi(v, b.frasi);
    if (cambiaLingua) { perse = v.frasi.filter(haLavoro).length; frasi = b.frasi.map(nuovaFrase); }
    if (perse && !confirm(`${perse} ${perse === 1 ? 'frase cambiata perde' : 'frasi cambiate perdono'} il lavoro fatto. Continuo?`)) return;
    Object.assign(v, { lingua: b.lingua, titolo: b.titolo.trim(), autore: b.autore.trim(), testo: normalizzaSpazi(b.testo), corte: b.corte, frasi, posizione: { frase: 0, lente: PRIMA_LENTE } });
    salvaVersione(v, contaParole);
    S.bozza = null;
    vai(`#/v/${v.id}/analisi/1/${PRIMA_LENTE}`);
  },

  /* analisi · parole */
  lente(el) { vai(`#/v/${S.v.id}/analisi/${S.frase + 1}/${el.dataset.lente}`); },
  parola(el, ev) {
    const i = +el.dataset.i;
    const f = frase();
    switch (S.lente) {
      case 'segmenti': {
        /* la sbarra: qui comincia una nuova proposizione */
        if (i === 0) return;
        const t = new Set(f.tagli || []);
        if (t.has(i)) t.delete(i); else t.add(i);
        f.tagli = [...t].sort((a, b) => a - b);
        salva(); render();
        annuncia(t.has(i) ? 'Sbarra: qui comincia una proposizione.' : 'Sbarra tolta.', { visibile: false });
        return;
      }
      case 'verbi': {
        const p = parolaDa(i);
        p.pos = p.pos === 'verbo' ? '' : 'verbo';
        p.tratti = trattiCoerenti(p, S.v.lingua);
        riordina(i);
        salva(); render();
        return;
      }
      case 'connettivi': {
        const p = parolaDa(i);
        p.connettivo = !p.connettivo;
        riordina(i);
        salva(); render();
        return;
      }
      case 'proposizioni': selezionaSegmento(i, ev && ev.shiftKey); return;
      case 'sintagmi': selezionaInGruppo(i, ev && ev.shiftKey); return;
      case 'parole': scegliParola(i); return;
      default:
    }
  },
  chiudi() { azzeraSelezione(); render(); },
  pos(el) {
    const i = +el.dataset.i;
    const p = parolaDa(i);
    p.pos = p.pos === el.dataset.pos ? '' : el.dataset.pos;
    p.tratti = trattiCoerenti(p, S.v.lingua);
    riordina(i);
    salva(); render();
  },
  tratto(el) {
    const i = +el.dataset.i;
    const p = parolaDa(i);
    const g = el.dataset.g; const x = el.dataset.x;
    p.tratti = { ...(p.tratti || {}) };
    if (p.tratti[g] === x) delete p.tratti[g]; else p.tratti[g] = x;
    p.tratti = trattiCoerenti(p, S.v.lingua);       // cambiato il modo, la persona puo' non servire piu'
    riordina(i);
    salva(); render();
  },
  prossima(el) {
    const i = +el.dataset.i;
    const f = frase();
    const n = paroleDi(f).length;
    if (i + 1 < n) { S.focusParola = true; scegliParola(i + 1); return; }
    const fatte = paroleDi(f).filter(w => f.parole[w.i] && f.parole[w.i].pos).length;
    annuncia(fatte === n ? `Analisi grammaticale fatta: ${n} parole su ${n}. Ora la traduzione.` : `Fine della frase: ${fatte} parole analizzate su ${n}.`);
    S.focusParola = true;
    render();
  },
  'svuota-parola'(el) {
    const i = +el.dataset.i;
    const p = frase().parole[i];
    if (!p) return;
    if ((p.lemma || p.senso || p.nota) && !confirm('Svuoto l’analisi di questa parola, con lemma, significato e osservazioni?')) return;
    delete frase().parole[i];
    S.apriMorfemi = false;
    salva(); render();
    annuncia('Parola svuotata.', { visibile: false });
  },
  taglio(el) {
    const i = +el.dataset.i;
    const w = paroleDi(frase())[i];
    const p = parolaDa(i);
    p.morfemi = taglia(formaTagliabile(w.t), p.morfemi, +el.dataset.k);
    S.apriMorfemi = true;
    riordina(i);
    salva(); render();
  },
  'ruolo-morfema'(el) {
    const i = +el.dataset.i;
    const p = parolaDa(i);
    const m = p.morfemi && p.morfemi[+el.dataset.n];
    if (!m) return;
    m.r = m.r === el.dataset.r ? '' : el.dataset.r;
    S.apriMorfemi = true;
    salva(); render();
  },

  /* analisi · sintagmi e proposizioni */
  funzione(el) {
    if (!S.span) return;
    const f = frase();
    const funzione = el.dataset.funzione;
    const attivo = f.sintagmi.find(s => s.id === S.segnoAttivo);
    if (attivo) attivo.funzione = funzione;
    else {
      /* lo stesso gruppo, ri-segnato, cambia funzione invece di raddoppiarsi */
      const uguale = f.sintagmi.find(s => s.da === S.span.da && s.a === S.span.a);
      if (uguale) uguale.funzione = funzione;
      else f.sintagmi.push({ id: nuovoId('s'), da: S.span.da, a: S.span.a, funzione });
    }
    salva();
    annuncia(`${funzione}: segnato.`, { visibile: false });
    /* fatto un gruppo, la scheda torna all'elenco: il gesto dopo e' il gruppo seguente */
    S.span = null; S.segnoAttivo = null; S.ancora = null; S.filtro = ''; S.schedaGruppoAperta = true;
    render();
  },
  segno(el) {
    const s = segniCorrenti().find(x => x.id === el.dataset.id);
    if (!s) return;
    S.segnoAttivo = s.id; S.span = { da: s.da, a: s.a }; S.ancora = null;
    render();
  },
  'togli-segno'(el) {
    const f = frase();
    const k = S.lente === 'sintagmi' ? 'sintagmi' : 'proposizioni';
    f[k] = f[k].filter(s => s.id !== el.dataset.id);
    if (S.segnoAttivo === el.dataset.id) { S.segnoAttivo = null; S.span = null; }
    S.schedaGruppoAperta = true;
    salva(); render();
  },
  ruolo(el) {
    if (!S.span) return;
    const f = frase();
    const r = el.dataset.ruolo;
    let attivo = f.proposizioni.find(s => s.id === S.segnoAttivo)
      || f.proposizioni.find(s => s.da === S.span.da && s.a === S.span.a);
    if (attivo) { if (attivo.ruolo !== r) { attivo.ruolo = r; attivo.tipo = ''; } } else {
      attivo = { id: nuovoId('p'), da: S.span.da, a: S.span.a, ruolo: r, tipo: '', grado: 1 };
      f.proposizioni.push(attivo);
    }
    S.segnoAttivo = attivo.id; S.ancora = null;
    salva();
    annuncia(`${r}: segnata.`, { visibile: false });
    render();
  },
  'tipo-prop'(el) {
    const attivo = frase().proposizioni.find(s => s.id === S.segnoAttivo);
    if (!attivo) return;
    attivo.tipo = attivo.tipo === el.dataset.tipo ? '' : el.dataset.tipo;
    salva(); render();
  },
  grado(el) {
    const attivo = frase().proposizioni.find(s => s.id === S.segnoAttivo);
    if (!attivo) return;
    attivo.grado = +el.dataset.grado;
    salva(); render();
  },
  'parti-da-brutta'(el) {
    const f = S.v.frasi[+el.dataset.f];
    f.bella = f.brutta;
    salva(); render();
    const t = document.querySelector(`textarea[data-campo="bella"][data-f="${el.dataset.f}"]`);
    if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  },

  /* traduzione */
  mostra(el) { S.mostra = el.dataset.mostra; render(); },
  async 'copia-traduzione'() {
    const ok = await copiaTesto(soloTraduzione(S.v));
    annuncia(ok ? 'Traduzione copiata.' : 'Non riesco a copiare: seleziona il testo a mano.');
  },
  'scarica-md'() {
    scaricaFile(`${nomeFile(S.v.titolo)}.md`, versioneInMarkdown(S.v, { mostra: S.mostra }), 'text/markdown');
  },
  stampa() { salvaSubito(); window.print(); },

  /* consegna */
  'scarica-html'() {
    salvaSubito();
    const v = S.v;
    const nome = [nomeFile(v.titolo), v.consegna.studente ? nomeFile(v.consegna.studente) : ''].filter(Boolean).join('-');
    scaricaFile(`${nome}.html`, paginaDaConsegnare(v, esportaJSON(v)), 'text/html');
    annuncia('Pagina scaricata: è il file da consegnare.');
  },
  'scarica-json'() {
    salvaSubito();
    scaricaFile(`${nomeFile(S.v.titolo)}.translatio.json`, esportaJSON(S.v), 'application/json');
  },

  /* tema */
  tema() {
    if (window.PoetrifyTheme) window.PoetrifyTheme.toggle();
    aggiornaTema();
  },
};

function aggiornaTema() {
  const b = $('#tema');
  if (!b) return;
  const scuro = document.documentElement.getAttribute('data-theme') === 'dark';
  b.innerHTML = scuro ? ICONE.sole : ICONE.luna;
  b.setAttribute('aria-label', scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro');
  b.title = b.getAttribute('aria-label');
}

/* ── i campi: lo stato si aggiorna mentre si scrive, il disegno no ───────── */
const CAMPI = {
  titolo(el) { S.bozza.titolo = el.value; },
  autore(el) { S.bozza.autore = el.value; },
  testo(el) {
    S.bozza.testo = el.value;
    clearTimeout(_anteprimaTimer);
    _anteprimaTimer = setTimeout(aggiornaFrasiBozza, 220);
  },
  corte(el) { S.bozza.corte = el.checked; aggiornaFrasiBozza(); },
  lemma(el) { const i = +el.dataset.i; parolaDa(i).lemma = el.value.trim(); riordina(i); salva(); aggiornaFraseViva(); },
  senso(el) { const i = +el.dataset.i; parolaDa(i).senso = el.value.trim(); riordina(i); salva(); aggiornaFraseViva(); },
  nota(el) { const i = +el.dataset.i; parolaDa(i).nota = el.value; riordina(i); salva(); },
  filtro(el) { S.filtro = el.value; monta($('#scheda'), scheda(S)); const i = $('[data-campo="filtro"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  brutta(el) { S.v.frasi[+el.dataset.f].brutta = el.value; salva(); autoaltezza(el.parentElement); },
  bella(el) { S.v.frasi[+el.dataset.f].bella = el.value; salva(); autoaltezza(el.parentElement); },
  consegna(el) { S.v.consegna[el.dataset.k] = el.value; salva(); aggiornaAnteprima(); },
  includi(el) { S.v.consegna.includi[el.dataset.k] = el.checked; salva(); aggiornaAnteprima(); },
};
const CAMPI_A_SCELTA = new Set(['corte', 'includi']);

/* ── ascoltatori ─────────────────────────────────────────────────────────── */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-az]');
  if (!el || el.matches('input[type="file"]')) return;
  if (el.getAttribute('aria-disabled') === 'true') { ev.preventDefault(); return; }
  const f = AZIONI[el.dataset.az];
  if (!f) return;
  ev.preventDefault();
  Promise.resolve(f(el, ev)).catch(e => { console.error('[translatio]', e); annuncia('Qualcosa non ha funzionato: riprova.'); });
});

document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-campo]');
  if (el && CAMPI[el.dataset.campo] && !CAMPI_A_SCELTA.has(el.dataset.campo)) CAMPI[el.dataset.campo](el);
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.matches('[data-campo]') && CAMPI_A_SCELTA.has(el.dataset.campo)) CAMPI[el.dataset.campo](el);
  if (el.matches('[data-az="importa"]') && el.files && el.files[0]) {
    el.files[0].text().then(t => {
      const v = importaJSON(t);
      salvaVersione(v, contaParole);
      annuncia(`Aperta «${v.titolo || 'versione'}».`);
      vai(`#/v/${v.id}/analisi/1/${PRIMA_LENTE}`);
    }).catch(e => annuncia(e && e.message && !/JSON/.test(e.message) ? e.message : 'Il file non si apre: non sembra un lavoro di Translatio.'));
    el.value = '';
  }
});
/* «toggle» non risale: si ascolta in cattura. La scomposizione aperta resta
   aperta anche quando la scheda si ridisegna. */
document.addEventListener('toggle', ev => {
  const d = ev.target;
  if (d.matches && d.matches('details[data-apri="morfemi"]')) S.apriMorfemi = d.open;
}, true);

function tastoNumero(ev) {
  const n = +ev.key;
  if (!(n >= 1 && n <= 9) || S.sel == null || !tastieraFine()) return false;
  const f = frase();
  const p = f.parole[S.sel];
  const gruppo = gruppoDaCompilare(p, S.v.lingua);
  if (!gruppo) return false;
  const x = valoriDelGruppo(gruppo, p, S.v.lingua)[n - 1];
  if (!x) return false;
  ev.preventDefault();
  if (gruppo === 'pos') AZIONI.pos({ dataset: { i: String(S.sel), pos: x } });
  else AZIONI.tratto({ dataset: { i: String(S.sel), g: gruppo, x } });
  return true;
}

document.addEventListener('keydown', ev => {
  if (S.vista !== 'analisi') return;
  const t = ev.target;
  const scrive = t.matches && t.matches('input, textarea, select, [contenteditable="true"]');
  if (ev.key === 'Escape') {
    if (scrive) t.blur();
    if (S.sel != null || S.span || S.schedaGruppoAperta) { azzeraSelezione(); render(); }
    return;
  }
  if (ev.key === 'Enter' && scrive && S.lente === 'parole' && S.sel != null && t.matches('input[data-campo="lemma"], input[data-campo="senso"]')) {
    /* Invio nel lemma va al significato; nel significato, alla parola dopo */
    ev.preventDefault();
    if (t.dataset.campo === 'lemma') { const s = $('input[data-campo="senso"]'); if (s) s.focus(); } else AZIONI.prossima({ dataset: { i: String(S.sel) } });
    return;
  }
  if (scrive || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (ev.key === '[' && S.frase > 0) { vai(`#/v/${S.v.id}/analisi/${S.frase}/${S.lente}`); return; }
  if (ev.key === ']' && S.frase < S.v.frasi.length - 1) { vai(`#/v/${S.v.id}/analisi/${S.frase + 2}/${S.lente}`); return; }
  if (S.lente !== 'parole') return;
  if (tastoNumero(ev)) return;
  const n = paroleDi(frase()).length;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
    ev.preventDefault();
    const d = ev.key === 'ArrowRight' ? 1 : -1;
    const i = S.sel == null ? (d > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, S.sel + d));
    S.focusParola = true;
    scegliParola(i);
    return;
  }
  if (ev.key === 'Enter' && S.sel != null && (!t.closest('button, a') || (t.matches('.parola') && +t.dataset.i === S.sel))) {
    ev.preventDefault();
    AZIONI.prossima({ dataset: { i: String(S.sel) } });
  }
});

window.addEventListener('hashchange', render);
window.addEventListener('pagehide', salvaSubito);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') salvaSubito(); });

/* ── avvio ───────────────────────────────────────────────────────────────── */
/* il foglio del documento: lo stesso che viaggia dentro il file .html */
const stile = document.createElement('style');
stile.id = 'stile-documento';
stile.textContent = CSS_DOCUMENTO;
document.head.appendChild(stile);

document.getElementById('tema').addEventListener('click', () => AZIONI.tema());
aggiornaTema();
render();
