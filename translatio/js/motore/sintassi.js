/* ============================================================================
   SINTASSI · sintagmi, proposizioni, costruzione
   ----------------------------------------------------------------------------
   Le funzioni logiche e i tipi di proposizione sono quelli delle tassonomie
   (tassonomie.js). Qui non si propone nulla: lo studente segna, il banco
   disegna. Si aggiunge solo cio' che serve al disegno:
     · il caso di una funzione, per colorare il suo filo col codice di
       categoria della collana (nominativo blu di Prussia, accusativo giallo
       indiano…);
     · il gruppo dell'analisi logica a cui una funzione appartiene: prima il
       soggetto e il gruppo del nominativo, poi l'oggetto e il gruppo
       dell'accusativo, poi i complementi obliqui (l'ordine del metodo).
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

/** «A₁ · enunciativa» (breve, sul filo) o «B₁ · subordinata di 1° grado
 *  relativa propria» (distesa). `info` viene da annotaPeriodo: sigla e livello. */
export function etichettaProposizione(s, lungo = false, info = null) {
  const livello = info ? info.livello : (s.ruolo === 'Subordinata' ? (s.grado || 1) : 0);
  const sigla = info ? info.sigla : (s.ruolo === 'Principale' ? 'P' : s.ruolo === 'Coordinata' ? 'C' : `S${livello}`);
  const tipo = s.tipo ? s.tipo.toLowerCase() : '';
  if (lungo) return `${sigla} · ${String(s.ruolo || '').toLowerCase()}${s.ruolo !== 'Principale' && livello > 0 ? ` di ${livello}° grado` : ''}${tipo ? ` ${tipo}` : ''}`;
  return `${sigla}${tipo ? ' · ' + tipo : ''}`;
}

/* ── i tre gruppi dell'analisi logica, nell'ordine del metodo ─────────────── */
export const GRUPPI_LOGICI = ['nominativo', 'accusativo', 'obliqui'];
const gruppoDelTitolo = titolo => (/^Predicato|nominativo/i.test(titolo) ? 'nominativo' : /accusativo/i.test(titolo) ? 'accusativo' : 'obliqui');

/** Le funzioni che si scelgono in un gruppo: il predicato sta col soggetto
 *  (e' il nucleo della frase minima). */
export function funzioniDelGruppo(gruppo, lang) {
  return gruppiDiFunzioni(lang).filter(g => gruppoDelTitolo(g.group) === gruppo);
}
export function gruppoLogico(funzione, lang) {
  if (/^Predicato|^Copula/i.test(funzione || '')) return 'nominativo';
  const g = gruppiDiFunzioni(lang).find(x => x.items.includes(funzione));
  return g ? gruppoDelTitolo(g.group) : 'obliqui';
}

/* ── la segmentazione del periodo ─────────────────────────────────────────── */
/* Lo studente taglia il periodo davanti alla parola da cui comincia una nuova
   proposizione: i tagli sono gli indici di quelle parole. Ne vengono i
   segmenti, contigui, che la classificazione trasforma in proposizioni. */
export function segmentiDi(nParole, tagli = []) {
  const punti = [...new Set(tagli)].filter(i => i > 0 && i < nParole).sort((a, b) => a - b);
  const out = [];
  let da = 0;
  for (const t of punti) { out.push({ da, a: t - 1 }); da = t; }
  if (nParole) out.push({ da, a: nParole - 1 });
  return out;
}
export function segmentoDi(i, nParole, tagli) {
  return segmentiDi(nParole, tagli).find(s => i >= s.da && i <= s.a) || { da: i, a: i };
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
