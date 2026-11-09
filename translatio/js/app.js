/* ============================================================================
   TRANSLATIO · il banco d'analisi e traduzione di Poetrify
   ----------------------------------------------------------------------------
   Un flusso solo, in tre tappe: TESTO → ANALISI → TRADUZIONE.
   Navigazione con l'hash, bidirezionale (il tasto Indietro cambia la vista):
     #/                                  archivio
     #/nuova · #/nuova/<lingua>          porta della lingua · testo nuovo
     #/v/<id>/testo                      il brano e le frasi
     #/v/<id>/analisi/<frase>/<lente>    il banco
     #/v/<id>/traduzione                 la versione intera
   Cucitura con il resto di Poetrify: index.html?lang=la|grc&text=…&titolo=…
   apre un testo nuovo gia' compilato (lo usa il Corpus).
   ============================================================================ */
import { html, raw, $, monta, annuncia, scaricaFile, copiaTesto, nomeFile } from './ui/dom.js';
import { ICONE } from './ui/icone.js';
import { ESEMPI } from './esempi.js';
import { dividiInFrasi, tokenizza, normalizzaSpazi } from './motore/testo.js';
import {
  analizzaParola, completaConParadigma, restringiNelContesto, voceDelLessico, conLemma,
} from './motore/analizzatore.js';
import {
  nuovaVersione, nuovaFrase, riallineaFrasi, haLavoro, caricaVersione, salvaVersione,
  salvaPiuTardi, salvaSubito, eliminaVersione, esportaJSON, importaJSON, nuovoId,
} from './stato.js';
import { vistaArchivio, vistaPorta } from './viste/archivio.js';
import { vistaTesto, anteprimaFrasi, avvisoLingua } from './viste/testo.js';
import { vistaAnalisi, scheda, statoLavoro, apertaScheda, LENTI } from './viste/analisi.js';
import { vistaTraduzione, versioneInMarkdown, soloTraduzione } from './viste/traduzione.js';

const S = {
  vista: 'archivio',
  v: null,
  bozza: null,
  frase: 0,
  lente: 'parole',
  sel: null,
  span: null,
  ancora: null,
  segnoAttivo: null,
  ruoloBozza: null,
  filtro: '',
  schedaGruppoAperta: false,
  lessico: null,
  lavoro: null,
  mostra: 'bella',
  modoDividi: false,
  focusParola: false,
};
const NOMI_LENTI = new Set(LENTI.map(l => l.k));
const contaParole = f => tokenizza(f.testo).filter(t => t.k === 'w').length;
const paroleDi = f => tokenizza(f.testo).filter(t => t.k === 'w');
const salva = () => salvaPiuTardi(S.v, contaParole);
const frase = () => S.v && S.v.frasi[S.frase];

/* ── rotte ────────────────────────────────────────────────────────────────── */
function rotta() {
  const parti = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!parti.length) return { vista: 'archivio' };
  if (parti[0] === 'nuova') {
    return ['latino', 'greco'].includes(parti[1]) ? { vista: 'testo', nuova: parti[1] } : { vista: 'porta' };
  }
  if (parti[0] === 'v' && parti[1]) {
    const id = parti[1];
    const sez = parti[2] || 'analisi';
    if (sez === 'testo') return { vista: 'testo', id };
    if (sez === 'traduzione') return { vista: 'traduzione', id };
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
  S.ruoloBozza = null; S.filtro = ''; S.schedaGruppoAperta = false;
}

/* ── disegno ──────────────────────────────────────────────────────────────── */
function nastro() {
  const el = $('#nastro');
  if (!S.v) { el.innerHTML = ''; el.className = ''; return; }
  const v = S.v;
  el.className = 'nastro';
  monta(el, html`<div class="titolo-versione"><strong>${v.titolo || 'Versione senza titolo'}</strong>${v.autore ? html`<span>${v.autore}</span>` : ''}</div>
    <nav class="tappe" aria-label="Tappe della versione">
      <a class="tappa" href="#/v/${v.id}/testo" ${S.vista === 'testo' ? raw('aria-current="page"') : ''}>Testo</a>
      <a class="tappa" href="#/v/${v.id}/analisi/${(v.posizione && v.posizione.frase || 0) + 1}/${(v.posizione && v.posizione.lente) || 'parole'}" ${S.vista === 'analisi' ? raw('aria-current="page"') : ''}>Analisi</a>
      <a class="tappa" href="#/v/${v.id}/traduzione" ${S.vista === 'traduzione' ? raw('aria-current="page"') : ''}>Traduzione</a>
    </nav>`, { conservaScroll: false });
}

/* Il fuoco e lo scorrimento sopravvivono al ridisegno: chi sta scrivendo nel
   filtro, o scorrendo la scheda, non deve accorgersi che la pagina e' rifatta. */
const ATTR_FUOCO = ['az', 'campo', 'i', 'f', 'k', 'lente', 'pos', 'g', 'x', 'funzione', 'ruolo', 'tipo', 'mostra', 'id'];
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
      S.v = v; S.lessico = null; azzeraSelezione();
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

  if ((r.vista === 'analisi' || r.vista === 'traduzione') && !S.v.frasi.length) {
    /* una versione senza frasi (un file importato vuoto) si apre dal testo */
    vai(`#/v/${S.v.id}/testo`, { sostituisci: true });
    return;
  }
  if (r.vista === 'analisi') {
    const pos = S.v.posizione || {};
    const n = r.frase != null ? r.frase : (pos.frase || 0);
    S.frase = Math.min(Math.max(0, n), S.v.frasi.length - 1);
    S.lente = r.lente || pos.lente || 'parole';
    if (prima.id !== S.v.id || prima.frase !== S.frase || prima.lente !== S.lente || prima.vista !== 'analisi') {
      azzeraSelezione();
    }
    if (pos.frase !== S.frase || pos.lente !== S.lente) {
      S.v.posizione = { frase: S.frase, lente: S.lente };
      salva();
    }
    /* l'hash si completa da se': #/v/id/analisi → #/v/id/analisi/3/parole */
    const pieno = `#/v/${S.v.id}/analisi/${S.frase + 1}/${S.lente}`;
    if (location.hash !== pieno) history.replaceState(null, '', pieno);
  }

  document.body.classList.toggle('vista-analisi', S.vista === 'analisi');
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
    default: corpoPagina = vistaArchivio();
  }
  monta(main, corpoPagina, { conservaScroll: false });
  if (prima.vista !== S.vista || prima.id !== (S.v && S.v.id)) window.scrollTo(0, 0);

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

  if (S.v && (S.vista === 'analisi' || S.vista === 'traduzione')) avviaAnalisi(S.v, S.frase);
}

/* Le aree della traduzione crescono col testo, invece di scorrere dentro di se'. */
function autoaltezza(dove = document) {
  dove.querySelectorAll('.versio .area, .area-resa').forEach(a => {
    a.style.height = 'auto';
    a.style.height = `${Math.max(a.scrollHeight + 2, 64)}px`;
  });
}

/* ── il lavoro lento: l'analisi automatica del brano ─────────────────────── */
let lavoro = null;

async function analizzaFrase(v, f) {
  const ws = paroleDi(f);
  const prop = await Promise.all(ws.map(w => analizzaParola(w.t, v.lingua)));
  /* il paradigma solo dove il lessico non dava l'analisi: i paradigmi latini
     pesano, e si caricano per intero quando serve davvero */
  for (const p of prop) if (!p.letture.length) await completaConParadigma(p, v.lingua);
  restringiNelContesto(prop);
  ws.forEach((w, k) => {
    const gia = f.parole[w.i];
    if (gia && (gia.stato === 'confermata' || gia.toccata)) return;      // il lavoro dello studente non si tocca
    const p = prop[k];
    f.parole[w.i] = {
      forma: p.forma, stato: 'proposta', lemma: p.lemma, citazione: p.citazione, pos: p.pos,
      tratti: p.tratti, letture: (p.letture || []).slice(0, 12), glossa: p.glossa, nota: p.nota,
      altriLemmi: p.altriLemmi, fonte: p.fonte, classe: p.classe || '', segmenti: p.segmenti || null,
      via: p.via, enclitica: p.enclitica, casiRetti: p.casiRetti, senso: gia ? gia.senso || '' : '',
    };
  });
  f.analizzata = true;
}

function aggiornaStatoLavoro() {
  const el = $('#stato-lavoro');
  if (el) monta(el, statoLavoro(S));
}

async function avviaAnalisi(v, prima) {
  if (lavoro && lavoro.vid === v.id) { lavoro.prima = prima; return; }
  const daFare = () => v.frasi.map((f, n) => n).filter(n => !v.frasi[n].analizzata);
  if (!daFare().length) return;
  const job = lavoro = { vid: v.id, prima };
  const totale = daFare().length;
  let fatte = 0;
  S.lavoro = { attivo: true, fatte: 0, totale, messaggio: `Leggo il brano: ${totale} ${totale === 1 ? 'frase' : 'frasi'} da analizzare.` };
  aggiornaStatoLavoro();
  try {
    let coda;
    while ((coda = daFare()).length) {
      if (!S.v || S.v.id !== v.id) break;
      const n = coda.includes(job.prima) ? job.prima : coda[0];
      S.lavoro.messaggio = `Leggo la frase ${n + 1}: lemmi, analisi, significati…`;
      aggiornaStatoLavoro();
      await analizzaFrase(v, v.frasi[n]);
      fatte++;
      S.lavoro.fatte = fatte;
      salvaVersione(v, contaParole);
      const scrive = document.activeElement && document.activeElement.matches('textarea, input');
      if (S.vista === 'analisi' && S.frase === n && !scrive) render();
      else aggiornaStatoLavoro();
    }
  } catch (e) {
    console.error('[translatio] analisi interrotta', e);
    annuncia('L’analisi automatica si è interrotta: puoi continuare a mano.');
  } finally {
    if (lavoro === job) lavoro = null;
    S.lavoro = null;
    aggiornaStatoLavoro();
    if (S.vista === 'analisi' && S.v && S.v.id === v.id && !(document.activeElement && document.activeElement.matches('textarea, input'))) render();
  }
}

/* La scheda di una parola completa la proposta col paradigma (i morfemi) la
   prima volta che si apre: e' il momento in cui serve, non prima. */
async function completaPerScheda(f, i) {
  const p = f.parole[i];
  if (!p || p.paradigmaProvato) return;
  p.paradigmaProvato = true;
  const tenuta = { ...p.tratti };
  await completaConParadigma(p, S.v.lingua, { primaIlParadigma: false });
  if (Object.keys(tenuta).length) p.tratti = tenuta;
  salva();
  if (S.vista === 'analisi' && S.sel === i && frase() === f) render();
}

async function apriLessico(lemma) {
  if (!S.v || !lemma) return;
  if (S.lessico && S.lessico.lemma === lemma) return;
  const r = await voceDelLessico(lemma, S.v.lingua);
  S.lessico = { lemma, testo: r ? r.definizione : 'Il lessico non ha una voce per questo lemma.' };
  const el = $('#lessico-voce');
  if (el) el.textContent = S.lessico.testo;
}

/* ── le azioni ───────────────────────────────────────────────────────────── */
function aggiornaAnteprima() {
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
  S.sel = i;
  S.lessico = null;
  render();
  completaPerScheda(f, i);
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
    S.ancora = i; S.span = { da: i, a: i }; S.segnoAttivo = null; S.ruoloBozza = null;
  }
  S.filtro = '';
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
    vai(`#/v/${v.id}/analisi/1/parole`);
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
    aggiornaAnteprima();
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
      vai(`#/v/${v.id}/analisi/1/parole`);
      return;
    }
    const v = S.v;
    const cambiaLingua = b.lingua !== v.lingua;
    let { frasi, perse } = riallineaFrasi(v, b.frasi);
    if (cambiaLingua) { perse = v.frasi.filter(haLavoro).length; frasi = b.frasi.map(nuovaFrase); }
    if (perse && !confirm(`${perse} ${perse === 1 ? 'frase cambiata perde' : 'frasi cambiate perdono'} il lavoro fatto. Continuo?`)) return;
    Object.assign(v, { lingua: b.lingua, titolo: b.titolo.trim(), autore: b.autore.trim(), testo: normalizzaSpazi(b.testo), corte: b.corte, frasi, posizione: { frase: 0, lente: 'parole' } });
    salvaVersione(v, contaParole);
    S.bozza = null;
    vai(`#/v/${v.id}/analisi/1/parole`);
  },

  /* analisi */
  lente(el) { vai(`#/v/${S.v.id}/analisi/${S.frase + 1}/${el.dataset.lente}`); },
  parola(el, ev) {
    const i = +el.dataset.i;
    if (S.lente === 'parole') { scegliParola(i); return; }
    if (S.lente === 'sintagmi' || S.lente === 'proposizioni') selezionaInGruppo(i, ev.shiftKey);
  },
  chiudi() { azzeraSelezione(); render(); },
  conferma(el) {
    const f = frase();
    const i = +el.dataset.i;
    const p = f.parole[i];
    if (!p) return;
    const nuova = p.stato !== 'confermata';
    p.stato = 'confermata';
    salva();
    const n = paroleDi(f).length;
    const prossima = paroleDi(f).findIndex((w, k) => k > i && (!f.parole[k] || f.parole[k].stato !== 'confermata'));
    if (prossima >= 0) { S.focusParola = true; scegliParola(prossima); return; }
    const tutte = paroleDi(f).every((w, k) => f.parole[k] && f.parole[k].stato === 'confermata');
    if (tutte && nuova) annuncia(`Frase analizzata: tutte le ${n} parole sono confermate. Ora i sintagmi.`);
    if (i + 1 < n) { S.focusParola = true; scegliParola(i + 1); } else render();
  },
  lettura(el) {
    const p = frase().parole[+el.dataset.i];
    p.tratti = { ...p.letture[+el.dataset.k] };
    p.toccata = true;
    salva(); render();
  },
  pos(el) {
    const p = frase().parole[+el.dataset.i];
    if (p.pos === el.dataset.pos) return;
    p.pos = el.dataset.pos;
    p.toccata = true;
    if (['avverbio', 'preposizione', 'congiunzione', 'particella', 'interiezione'].includes(p.pos)) p.tratti = {};
    salva(); render();
  },
  tratto(el) {
    const p = frase().parole[+el.dataset.i];
    const g = el.dataset.g; const x = el.dataset.x;
    p.tratti = { ...(p.tratti || {}) };
    if (p.tratti[g] === x) delete p.tratti[g]; else p.tratti[g] = x;
    p.toccata = true;
    salva(); render();
  },
  async 'altro-lemma'(el) {
    const f = frase(); const i = +el.dataset.i;
    const p = f.parole[i];
    const alt = p.altriLemmi[+el.dataset.k];
    const n = await conLemma(p, alt, S.v.lingua);
    f.parole[i] = { ...n, stato: 'proposta', toccata: true, senso: p.senso || '', paradigmaProvato: true };
    S.lessico = null;
    salva(); render();
    annuncia(`Riletta come forma di ${n.lemma}.`, { visibile: false });
  },
  funzione(el) {
    if (!S.span) return;
    const f = frase();
    const funzione = el.dataset.funzione;
    const attivo = f.sintagmi.find(s => s.id === S.segnoAttivo);
    if (attivo) attivo.funzione = funzione;
    else {
      /* lo stesso gruppo, ri-segnato, cambia funzione invece di raddoppiarsi */
      const uguale = f.sintagmi.find(s => s.da === S.span.da && s.a === S.span.a);
      if (uguale) { uguale.funzione = funzione; S.segnoAttivo = uguale.id; } else {
        const s = { id: nuovoId('s'), da: S.span.da, a: S.span.a, funzione };
        f.sintagmi.push(s); S.segnoAttivo = s.id;
      }
    }
    S.ancora = null; S.filtro = '';
    salva();
    annuncia(`${funzione}: segnato.`, { visibile: false });
    /* fatto un gruppo, la scheda torna all'elenco: il gesto dopo e' il gruppo seguente */
    S.span = null; S.segnoAttivo = null; S.schedaGruppoAperta = true;
    render();
  },
  segno(el) {
    const s = segniCorrenti().find(x => x.id === el.dataset.id);
    if (!s) return;
    S.segnoAttivo = s.id; S.span = { da: s.da, a: s.a }; S.ancora = null; S.ruoloBozza = null;
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
    const r = el.dataset.ruolo;
    const attivo = frase().proposizioni.find(s => s.id === S.segnoAttivo);
    if (attivo) { if (attivo.ruolo !== r) { attivo.ruolo = r; attivo.tipo = ''; salva(); } } else S.ruoloBozza = r;
    render();
  },
  'tipo-prop'(el) {
    if (!S.span) return;
    const f = frase();
    const { ruolo, tipo } = el.dataset;
    let attivo = f.proposizioni.find(s => s.id === S.segnoAttivo)
      || f.proposizioni.find(s => s.da === S.span.da && s.a === S.span.a);
    if (attivo) Object.assign(attivo, { ruolo, tipo });
    else {
      attivo = { id: nuovoId('p'), da: S.span.da, a: S.span.a, ruolo, tipo, grado: 1 };
      f.proposizioni.push(attivo);
    }
    S.segnoAttivo = attivo.id; S.ancora = null;
    salva();
    annuncia(`${ruolo} ${tipo.toLowerCase()}: segnata.`, { visibile: false });
    render();
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
  stampa() { window.print(); },

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
    _anteprimaTimer = setTimeout(aggiornaAnteprima, 220);
  },
  corte(el) { S.bozza.corte = el.checked; aggiornaAnteprima(); },
  senso(el) {
    const p = frase().parole[+el.dataset.i];
    if (p) { p.senso = el.value; salva(); }
  },
  lemma(el) {
    const p = frase().parole[+el.dataset.i];
    if (p) { p.lemma = el.value.trim() || p.forma; p.citazione = el.value.trim(); p.toccata = true; salva(); }
  },
  filtro(el) { S.filtro = el.value; monta($('#scheda'), scheda(S)); const i = $('[data-campo="filtro"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  brutta(el) { S.v.frasi[+el.dataset.f].brutta = el.value; salva(); autoaltezza(el.parentElement); },
  bella(el) { S.v.frasi[+el.dataset.f].bella = el.value; salva(); autoaltezza(el.parentElement); },
};

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
  if (el && CAMPI[el.dataset.campo] && el.type !== 'checkbox') CAMPI[el.dataset.campo](el);
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.matches('[data-campo="corte"]')) CAMPI.corte(el);
  if (el.matches('[data-az="importa"]') && el.files && el.files[0]) {
    el.files[0].text().then(t => {
      const v = importaJSON(t);
      salvaVersione(v, contaParole);
      annuncia(`Aperta «${v.titolo || 'versione'}».`);
      vai(`#/v/${v.id}/analisi/1/parole`);
    }).catch(e => annuncia(e.message || 'Il file non si apre.'));
  }
});
/* «toggle» non risale: si ascolta in cattura */
document.addEventListener('toggle', ev => {
  const d = ev.target;
  if (d.matches && d.matches('[data-az-apri="lessico"]') && d.open) apriLessico(d.dataset.lemma);
}, true);

document.addEventListener('keydown', ev => {
  if (S.vista !== 'analisi') return;
  const t = ev.target;
  const scrive = t.matches && t.matches('input, textarea, select, [contenteditable="true"]');
  if (ev.key === 'Escape') {
    if (scrive) t.blur();
    if (S.sel != null || S.span || S.schedaGruppoAperta) { azzeraSelezione(); render(); }
    return;
  }
  if (scrive || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (ev.key === '[' && S.frase > 0) { vai(`#/v/${S.v.id}/analisi/${S.frase}/${S.lente}`); return; }
  if (ev.key === ']' && S.frase < S.v.frasi.length - 1) { vai(`#/v/${S.v.id}/analisi/${S.frase + 2}/${S.lente}`); return; }
  if (S.lente !== 'parole') return;
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
    AZIONI.conferma({ dataset: { i: String(S.sel) } });
  }
});

window.addEventListener('hashchange', render);
window.addEventListener('pagehide', salvaSubito);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') salvaSubito(); });

/* ── avvio, con la cucitura ?lang=&text= dal resto di Poetrify ───────────── */
function cucitura() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  const lang = { la: 'latino', latino: 'latino', grc: 'greco', greco: 'greco' }[q.get('lang') || ''];
  const testo = q.get('text') || q.get('testo') || '';
  history.replaceState(null, '', location.pathname + (location.hash || ''));
  if (!lang) return;
  if (testo) {
    S.bozza = {
      lingua: lang, titolo: q.get('titolo') || '', autore: q.get('autore') || q.get('src') || '',
      testo, corte: false, frasi: dividiInFrasi(testo, lang),
    };
  }
  history.replaceState(null, '', `${location.pathname}#/nuova/${lang}`);
}

cucitura();
document.getElementById('tema').addEventListener('click', () => AZIONI.tema());
aggiornaTema();
render();
