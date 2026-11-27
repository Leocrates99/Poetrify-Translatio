/* ============================================================================
   STATO · le versioni, la loro forma e la loro conservazione
   ----------------------------------------------------------------------------
   Una VERSIONE e' un brano con le sue frasi. Tutto cio' che contiene l'ha
   scritto lo studente: Translatio non propone analisi.

     versione = { id, schema, lingua, titolo, autore, testo, corte,
                  frasi: [frase], posizione: { frase, lente },
                  consegna: { studente, classe, data, docente, includi },
                  creata, modificata }
     frase    = { id, testo, parole: { [indice]: parola },
                  tagli: [indice della parola da cui comincia una frase],
                  proposizioni: [{ id, da, a, ruolo, tipo, dipende, grado }],
                  sintagmi: [{ id, da, a, funzione }],
                  ordo: [indici delle parole nell'ordine scelto],
                  brutta, bella }
     parola   = { pos, tratti, lemma, senso, morfemi: [{ t, r }], nota, connettivo }
   (una forma verbale segnata nell'analisi periodale e' una parola con
   pos 'verbo': il passo dopo la ritrova gia' scelta)

   Le parole si indicizzano per POSIZIONE nella frase (0, 1, 2…), ricalcolata
   dal testo: se il testo della frase cambia davvero, la frase riparte da capo
   — ed e' giusto, perche' e' un'altra frase.

   Tutto vive nel browser (localStorage), in try/catch: in file:// o in
   navigazione privata lo storage puo' lanciare, e una pagina che muore in cima
   resta bianca. Se manca, si lavora in memoria e lo si dice.
   ============================================================================ */
import { dividiInFrasi, chiaveFrase } from './motore/testo.js';

export const SCHEMA = 2;
const K_INDICE = 'translatio:indice';
const K_VERSIONE = id => `translatio:v:${id}`;

let _memoria = null;            // ripiego quando lo storage non c'e'
export let storageDisponibile = true;

function leggi(k) {
  try { return localStorage.getItem(k); } catch (_) { storageDisponibile = false; return _memoria ? _memoria[k] ?? null : null; }
}
function scrivi(k, v) {
  try { localStorage.setItem(k, v); return true; } catch (_) {
    storageDisponibile = false;
    (_memoria || (_memoria = {}))[k] = v;
    return false;
  }
}
function togli(k) {
  try { localStorage.removeItem(k); } catch (_) { if (_memoria) delete _memoria[k]; }
}

const ora = () => new Date().toISOString();
export const nuovoId = (p = 'v') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ── costruzione ──────────────────────────────────────────────────────────── */
export function nuovaFrase(testo) {
  return { id: nuovoId('f'), testo, parole: {}, tagli: [], sintagmi: [], proposizioni: [], ordo: [], brutta: '', bella: '' };
}

/* Che cosa entra nel documento da consegnare: tutto, finche' lo studente non
   toglie qualcosa. */
export const INCLUDI = {
  grafica: true, periodo: true, verbi: true, logica: true, parole: true, morfemi: true, ordo: true,
  brutta: true, bella: true, traduzione: true, lessico: true, legenda: true,
};
export function nuovaConsegna() {
  return { studente: '', classe: '', data: '', docente: '', includi: { ...INCLUDI } };
}

export function nuovaVersione({ lingua, titolo = '', autore = '', testo = '', corte = false }) {
  const v = {
    id: nuovoId(), schema: SCHEMA, app: 'translatio', lingua, titolo, autore, testo, corte,
    frasi: [], posizione: { frase: 0, lente: 'proposizioni' }, consegna: nuovaConsegna(), creata: ora(), modificata: ora(),
  };
  v.frasi = dividiInFrasi(testo, lingua, { corte }).map(nuovaFrase);
  return v;
}

/**
 * Riallinea le frasi a un testo cambiato. Una frase che resta uguale (stessa
 * chiave: stesse lettere, a meno di accenti e punteggiatura) tiene la sua
 * analisi; le altre ripartono vuote. Restituisce quante analisi si perdono,
 * cosi' chi chiama puo' chiedere conferma solo quando c'e' qualcosa in gioco.
 */
export function riallineaFrasi(v, nuoveFrasi) {
  const vecchie = new Map();
  for (const f of v.frasi) {
    const k = chiaveFrase(f.testo);
    if (!vecchie.has(k)) vecchie.set(k, []);
    vecchie.get(k).push(f);
  }
  let perse = 0;
  const usate = new Set();
  const frasi = nuoveFrasi.map(t => {
    const lista = vecchie.get(chiaveFrase(t)) || [];
    const f = lista.find(x => !usate.has(x));
    /* stessa chiave vuol dire stesse parole nello stesso ordine: l'analisi
       resta (un accento corretto non cambia la frase) */
    if (f) { usate.add(f); return { ...f, testo: t }; }
    return nuovaFrase(t);
  });
  for (const f of v.frasi) if (!usate.has(f) && haLavoro(f)) perse++;
  return { frasi, perse };
}

/** Una parola e' analizzata quando lo studente le ha dato la parte del discorso. */
export const analizzata = p => !!(p && p.pos);
const scritta = p => !!(p && (p.pos || p.lemma || p.senso || p.nota || p.connettivo || (p.morfemi && p.morfemi.length)));

export function haLavoro(f) {
  return Object.values(f.parole || {}).some(scritta)
    || (f.tagli || []).length || (f.ordo || []).length || (f.sintagmi || []).length || (f.proposizioni || []).length || !!(f.brutta || f.bella);
}

/* ── avanzamento: che cosa e' fatto, contato in un posto solo ────────────── */
export function statoFrase(f, nParole) {
  let analizzate = 0; let verbi = 0; let connettivi = 0;
  for (let i = 0; i < nParole; i++) {
    const p = f.parole && f.parole[i];
    if (analizzata(p)) analizzate++;
    if (p && p.pos === 'verbo') verbi++;
    if (p && p.connettivo) connettivi++;
  }
  return {
    parole: nParole,
    analizzate,
    tagli: (f.tagli || []).length,
    ordo: (f.ordo || []).length,
    verbi,
    connettivi,
    sintagmi: (f.sintagmi || []).length,
    proposizioni: (f.proposizioni || []).length,
    brutta: !!(f.brutta || '').trim(),
    bella: !!(f.bella || '').trim(),
  };
}

/** Una parola sola per dire a che punto e' la frase: serve al navigatore. */
export function faseFrase(s) {
  if (s.bella) return 'tradotta';
  if (s.brutta) return 'in-traduzione';
  if (s.parole && s.analizzate === s.parole) return 'analizzata';
  if (s.analizzate || s.tagli || s.connettivi || s.ordo || s.sintagmi || s.proposizioni) return 'in-corso';
  return 'da-fare';
}

/* ── archivio ─────────────────────────────────────────────────────────────── */
export function elencoVersioni() {
  try {
    const raw = leggi(K_INDICE);
    const l = raw ? JSON.parse(raw) : [];
    return Array.isArray(l) ? l.sort((a, b) => String(b.modificata).localeCompare(String(a.modificata))) : [];
  } catch (_) { return []; }
}

export function caricaVersione(id) {
  try {
    const raw = leggi(K_VERSIONE(id));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return migra(v);
  } catch (_) { return null; }
}

function riassunto(v, contaParole) {
  const frasi = v.frasi || [];
  let analizzate = 0, inBella = 0, inBrutta = 0;
  for (const f of frasi) {
    const s = statoFrase(f, contaParole ? contaParole(f) : Object.keys(f.parole || {}).length);
    if (s.parole && s.analizzate === s.parole) analizzate++;
    if (s.bella) inBella++;
    else if (s.brutta) inBrutta++;
  }
  return {
    id: v.id, titolo: v.titolo, autore: v.autore, lingua: v.lingua,
    frasi: frasi.length, analizzate, inBella, inBrutta, modificata: v.modificata, creata: v.creata,
    incipit: (v.testo || '').slice(0, 90),
  };
}

export function salvaVersione(v, contaParole) {
  v.modificata = ora();
  const ok = scrivi(K_VERSIONE(v.id), JSON.stringify(v));
  const elenco = elencoVersioni().filter(x => x.id !== v.id);
  elenco.unshift(riassunto(v, contaParole));
  scrivi(K_INDICE, JSON.stringify(elenco));
  return ok;
}

export function eliminaVersione(id) {
  togli(K_VERSIONE(id));
  scrivi(K_INDICE, JSON.stringify(elencoVersioni().filter(x => x.id !== id)));
}

/* Salvataggio differito: chi scrive una traduzione non deve pagare un
   salvataggio a ogni lettera. */
let _timer = null;
let _inAttesa = null;
export function salvaPiuTardi(v, contaParole, ms = 500) {
  _inAttesa = [v, contaParole];
  clearTimeout(_timer);
  _timer = setTimeout(() => { _timer = null; const [a, b] = _inAttesa; _inAttesa = null; salvaVersione(a, b); }, ms);
}
export function salvaSubito() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  if (_inAttesa) { const [a, b] = _inAttesa; _inAttesa = null; salvaVersione(a, b); }
}

/* ── migrazioni: il dato vecchio si porta avanti, non si butta ───────────── */
/* Lo schema 1 (Translatio con l'analisi automatica, novembre 2026) teneva
   accanto al lavoro dello studente le proposte del programma. Passando allo
   schema 2 resta solo cio' che lo studente ha fatto: le parole che aveva
   confermato o corretto, i significati scelti, i sintagmi, le proposizioni,
   le traduzioni. Le proposte mai confermate cadono. */
function daSchema1(p) {
  if (!p || typeof p !== 'object') return null;
  const sua = p.stato === 'confermata' || p.toccata;
  const out = {};
  if (sua && p.pos) out.pos = p.pos;
  if (sua && p.tratti && Object.keys(p.tratti).length) {
    out.tratti = {};
    for (const [k, v] of Object.entries(p.tratti)) if (typeof v === 'string' && v) out.tratti[k] = v;
  }
  /* un lemma uguale alla forma (et, in, λύω) e' un lemma: lo studente l'aveva confermato */
  const lemma = p.citazione || p.lemma || '';
  if (sua && lemma) out.lemma = lemma;
  if (p.senso) out.senso = p.senso;
  return Object.keys(out).length ? out : null;
}

function migra(v) {
  if (!v || typeof v !== 'object') return null;
  const vecchio = (v.schema || 1) < 2;
  v.posizione = v.posizione || { frase: 0, lente: 'proposizioni' };
  v.consegna = { ...nuovaConsegna(), ...(v.consegna || {}) };
  const scelte = v.consegna.includi || {};
  /* la vecchia voce «costruzione» valeva per periodo e analisi logica insieme */
  if (scelte.costruzione === false) { scelte.periodo = false; scelte.logica = false; }
  delete scelte.costruzione;
  v.consegna.includi = { ...INCLUDI, ...scelte };
  for (const f of v.frasi || []) {
    f.parole = f.parole || {};
    if (vecchio) {
      const nuove = {};
      for (const [i, p] of Object.entries(f.parole)) { const q = daSchema1(p); if (q) nuove[i] = q; }
      f.parole = nuove;
      delete f.analizzata;
    }
    f.tagli = Array.isArray(f.tagli) ? f.tagli : [];
    f.ordo = Array.isArray(f.ordo) ? f.ordo : [];
    f.sintagmi = f.sintagmi || [];
    f.proposizioni = f.proposizioni || [];
    f.brutta = f.brutta || '';
    f.bella = f.bella || '';
  }
  v.schema = SCHEMA;
  return v;
}

/* ── scambio: un file per versione ───────────────────────────────────────── */
export function esportaJSON(v) {
  return JSON.stringify({ formato: 'translatio', schema: SCHEMA, versione: v }, null, 1);
}

/* Il documento HTML che lo studente consegna porta dentro di se' il lavoro,
   in un <script type="application/json">: lo stesso file si legge in
   qualunque browser e si riapre in Translatio. */
export const ID_DATI = 'translatio-dati';

export function importaJSON(testo) {
  let sorgente = String(testo || '');
  if (/^\s*</.test(sorgente)) {
    const m = new RegExp(`<script[^>]*id=["']${ID_DATI}["'][^>]*>([\\s\\S]*?)</script>`, 'i').exec(sorgente);
    if (!m) throw new Error('Questa pagina non contiene un lavoro di Translatio.');
    sorgente = m[1];
  }
  const j = JSON.parse(sorgente);
  const v = migra(j && j.formato === 'translatio' ? j.versione : j);
  if (!v || !Array.isArray(v.frasi) || !v.lingua) throw new Error('Il file non contiene una versione di Translatio.');
  v.id = nuovoId();            // un'importazione non sovrascrive mai una versione che c'e' gia'
  return v;
}
