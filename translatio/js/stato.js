/* ============================================================================
   STATO · le versioni, la loro forma e la loro conservazione
   ----------------------------------------------------------------------------
   Una VERSIONE e' un brano con le sue frasi. Ogni frase porta tre analisi e
   due rese, tutte sullo stesso testo:

     versione = { id, schema, lingua, titolo, autore, testo, corte,
                  frasi: [frase], posizione: { frase, lente }, creata, modificata }
     frase    = { id, testo, parole: { [indice]: parola }, analizzata,
                  sintagmi: [{ id, da, a, funzione }],
                  proposizioni: [{ id, da, a, ruolo, tipo, grado }],
                  brutta, bella }
     parola   = la proposta dell'analizzatore + { stato: 'proposta'|'confermata', senso }

   Le parole si indicizzano per POSIZIONE nella frase (0, 1, 2…), ricalcolata
   dal testo: se il testo della frase cambia, la frase riparte da capo — ed e'
   giusto, perche' e' un'altra frase.

   Tutto vive nel browser (localStorage), in try/catch: in file:// o in
   navigazione privata lo storage puo' lanciare, e una pagina che muore in cima
   resta bianca. Se manca, si lavora in memoria e lo si dice.
   ============================================================================ */
import { dividiInFrasi, chiaveFrase } from './motore/testo.js';

export const SCHEMA = 1;
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
  return { id: nuovoId('f'), testo, parole: {}, analizzata: false, sintagmi: [], proposizioni: [], brutta: '', bella: '' };
}

export function nuovaVersione({ lingua, titolo = '', autore = '', testo = '', corte = false }) {
  const v = {
    id: nuovoId(), schema: SCHEMA, app: 'translatio', lingua, titolo, autore, testo, corte,
    frasi: [], posizione: { frase: 0, lente: 'parole' }, creata: ora(), modificata: ora(),
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
    if (f) { usate.add(f); return { ...f, testo: t, parole: f.testo === t ? f.parole : {}, analizzata: f.testo === t && f.analizzata }; }
    return nuovaFrase(t);
  });
  for (const f of v.frasi) if (!usate.has(f) && haLavoro(f)) perse++;
  return { frasi, perse };
}

export function haLavoro(f) {
  return Object.values(f.parole || {}).some(p => p.stato === 'confermata' || p.senso)
    || (f.sintagmi || []).length || (f.proposizioni || []).length || !!(f.brutta || f.bella);
}

/* ── avanzamento: che cosa e' fatto, contato in un posto solo ────────────── */
export function statoFrase(f, nParole) {
  const parole = Object.values(f.parole || {});
  const confermate = parole.filter(p => p.stato === 'confermata').length;
  return {
    parole: nParole,
    confermate,
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
  if (s.parole && s.confermate === s.parole) return 'analizzata';
  if (s.confermate || s.sintagmi || s.proposizioni) return 'in-corso';
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
    if (s.parole && s.confermate === s.parole) analizzate++;
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
function migra(v) {
  if (!v || typeof v !== 'object') return null;
  v.schema = v.schema || 1;
  v.posizione = v.posizione || { frase: 0, lente: 'parole' };
  for (const f of v.frasi || []) {
    f.parole = f.parole || {};
    f.sintagmi = f.sintagmi || [];
    f.proposizioni = f.proposizioni || [];
    f.brutta = f.brutta || '';
    f.bella = f.bella || '';
  }
  return v;
}

/* ── scambio: un file per versione ───────────────────────────────────────── */
export function esportaJSON(v) {
  return JSON.stringify({ formato: 'translatio', schema: SCHEMA, versione: v }, null, 1);
}

export function importaJSON(testo) {
  const j = JSON.parse(testo);
  const v = migra(j && j.formato === 'translatio' ? j.versione : j);
  if (!v || !Array.isArray(v.frasi) || !v.lingua) throw new Error('Il file non contiene una versione di Translatio.');
  v.id = nuovoId();            // un'importazione non sovrascrive mai una versione che c'e' gia'
  return v;
}
