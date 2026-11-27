/* ============================================================================
   SINTASSI · sintagmi, proposizioni, costruzione
   ----------------------------------------------------------------------------
   Le funzioni logiche e i tipi di proposizione sono quelli delle tassonomie
   (tassonomie.js). Qui non si propone nulla: lo studente segna, il banco
   disegna. Si aggiunge solo cio' che serve al disegno:
     · il caso di una funzione, per colorare il suo filo col codice di
       categoria della collana (nominativo blu di Prussia, accusativo giallo
       indiano…);
     · la costruzione nell'ordine italiano (soggetto, predicato, oggetto,
       complementi), rimessa in fila coi sintagmi che lo studente ha segnato.
   ============================================================================ */
import { FUNZIONI_LATINO, FUNZIONI_GRECO, PROPOSIZIONI } from './tassonomie.js';

const CASO_DEL_GRUPPO = [
  [/^Predicato/i, 'pred'],
  [/nominativo/i, 'nom'], [/accusativo/i, 'acc'], [/genitivo/i, 'gen'],
  [/dativo/i, 'dat'], [/ablativo/i, 'abl'], [/vocativo/i, 'voc'],
];

export function gruppiDiFunzioni(lang) {
  return lang === 'greco' ? FUNZIONI_GRECO : FUNZIONI_LATINO;
}

const _casoCache = new Map();
export function casoDellaFunzione(funzione, lang) {
  if (!funzione) return 'altro';
  const k = `${lang}:${funzione}`;
  if (_casoCache.has(k)) return _casoCache.get(k);
  let caso = 'altro';
  if (/^Predicato|^Copula/i.test(funzione)) caso = 'pred';
  else {
    for (const g of gruppiDiFunzioni(lang)) {
      if (g.items.includes(funzione)) {
        const hit = CASO_DEL_GRUPPO.find(([re]) => re.test(g.group));
        caso = hit ? hit[1] : 'altro';
        break;
      }
    }
  }
  _casoCache.set(k, caso);
  return caso;
}

export function abbreviaFunzione(f) {
  return String(f || '')
    .replace(/^Complemento predicativo del(l')?/i, 'pred. del$1')
    .replace(/^Complemento di luogo \((.+)\)/i, 'luogo, $1')
    .replace(/^Complemento di /i, 'c. di ')
    .replace(/^Complemento /i, 'c. ')
    .replace(/^Predicato verbale/i, 'predicato')
    .replace(/^Predicato nominale/i, 'pred. nominale');
}

/* ── proposizioni ────────────────────────────────────────────────────────── */
export const RUOLI = ['Principale', 'Coordinata', 'Subordinata'];
const SUFFISSO = { latino: /\s*\(latino\)$/, greco: /\s*\(greco\)$/ };
const ALTRA = { latino: /\(greco\)$/, greco: /\(latino\)$/ };

/* I tipi che si incontrano in quasi ogni versione stanno davanti; gli altri
   restano a un tocco, sotto «Altri tipi». Trentadue pastiglie in fila non
   sono una scelta, sono un elenco da scorrere a memoria. */
const FREQUENTI = {
  Principale: ['Enunciativa', 'Interrogativa diretta', 'Imperativa', 'Esclamativa'],
  Coordinata: ['Copulativa', 'Avversativa', 'Disgiuntiva', 'Dichiarativa', 'Conclusiva'],
  Subordinata: ['Relativa propria', 'Oggettiva', 'Infinitiva oggettiva', 'Causale', 'Finale', 'Consecutiva',
    'Temporale', 'Condizionale (protasi)', 'Concessiva', 'Interrogativa indiretta',
    'Ablativo assoluto', 'Genitivo assoluto', 'Participiale congiunta'],
};

export function tipiDiProposizione(ruolo, lang) {
  const lista = ruolo === 'Principale' ? PROPOSIZIONI.principale
    : ruolo === 'Coordinata' ? PROPOSIZIONI.coordinata
      : PROPOSIZIONI.subordinata;
  const tutti = lista.filter(t => !ALTRA[lang].test(t)).map(t => t.replace(SUFFISSO[lang], ''));
  const pref = FREQUENTI[ruolo] || [];
  const frequenti = pref.filter(t => tutti.includes(t));
  const altri = tutti.filter(t => !frequenti.includes(t));
  return { frequenti, altri, tutti };
}

export function etichettaProposizione(s, lungo = false) {
  const sigla = s.ruolo === 'Principale' ? 'P' : s.ruolo === 'Coordinata' ? 'C' : `S${s.grado || 1}`;
  const tipo = s.tipo ? s.tipo.toLowerCase() : '';
  if (lungo) return `${s.ruolo}${s.ruolo === 'Subordinata' ? ` di ${s.grado || 1}° grado` : ''}${tipo ? ` · ${tipo}` : ''}`;
  return `${sigla}${tipo ? ' · ' + tipo : ''}`;
}

/* ── il disegno dei segni ───────────────────────────────────────────────── */
/* Livelli: ogni segno (sintagma o proposizione) prende la prima riga libera,
   cosi' due gruppi annidati stanno su due fili e non si coprono. */
export function livelli(segni) {
  const ordinati = [...segni].sort((a, b) => a.da - b.da || (b.a - b.da) - (a.a - a.da));
  const righe = [];
  const out = new Map();
  for (const s of ordinati) {
    let r = 0;
    while (righe[r] && righe[r].some(x => !(s.a < x.da || s.da > x.a))) r++;
    (righe[r] || (righe[r] = [])).push(s);
    out.set(s.id, r);
  }
  return { righe: righe.length, livello: out };
}

/* ── la costruzione: soggetto, predicato, oggetto, complementi ──────────── */
const PRIORITA = [
  [/^Soggetto/, 0], [/^Copula|^Predicato/, 1], [/^Parte nominale|predicativo del soggetto/, 2],
  [/^Complemento oggetto/, 3], [/predicativo dell'oggetto/, 4],
];
export function ordoDellaFrase(f, parole, lang) {
  const blocchi = (f.sintagmi || []).map(s => ({
    funzione: s.funzione,
    caso: casoDellaFunzione(s.funzione, lang),
    da: s.da,
    testo: parole.slice(s.da, s.a + 1).map(w => w.t).join(' '),
    rango: (PRIORITA.find(([re]) => re.test(s.funzione)) || [null, 5])[1],
  }));
  /* a parita' di rango (i complementi) vale l'ordine del testo */
  return blocchi.sort((a, b) => a.rango - b.rango || a.da - b.da);
}
