/* ============================================================================
   SINTASSI · sintagmi, proposizioni, costruzione
   ----------------------------------------------------------------------------
   Le funzioni logiche e i tipi di proposizione vengono dalle tassonomie del
   motore condiviso (modules/engine/taxonomies.js): qui non se ne scrive una
   seconda lista. Si aggiunge solo cio' che serve a QUESTA interfaccia:
     · il caso di una funzione, per colorare il suo filo col codice di
       categoria della collana (nominativo blu di Prussia, accusativo giallo
       indiano…);
     · le proposte (★), che non decidono mai al posto dello studente;
     · la costruzione nell'ordine italiano: soggetto, predicato, oggetto,
       complementi.
   ============================================================================ */
import { funzioniLogicheGroupedFor, PROPOSIZIONI } from '../../../modules/engine/taxonomies.js';
import { lookupConjunctionPreset } from '../../../modules/engine/conjunctions.js';
import { preposizione } from './analizzatore.js';

const CASO_DEL_GRUPPO = [
  [/^Predicato/i, 'pred'],
  [/nominativo/i, 'nom'], [/accusativo/i, 'acc'], [/genitivo/i, 'gen'],
  [/dativo/i, 'dat'], [/ablativo/i, 'abl'], [/vocativo/i, 'voc'],
];

export function gruppiDiFunzioni(lang) {
  return funzioniLogicheGroupedFor(lang);
}

const _casoCache = new Map();
export function casoDellaFunzione(funzione, lang) {
  if (!funzione) return 'altro';
  const k = `${lang}:${funzione}`;
  if (_casoCache.has(k)) return _casoCache.get(k);
  let caso = 'altro';
  if (/^Predicato|^Copula/i.test(funzione)) caso = 'pred';
  else {
    for (const g of funzioniLogicheGroupedFor(lang)) {
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

/* ── le proposte di funzione ─────────────────────────────────────────────── */
const FINITI = new Set(['ind', 'cong', 'ott', 'imv']);
const PER_CASO = {
  latino: {
    nom: ['Soggetto', 'Attributo', 'Apposizione', 'Parte nominale'],
    acc: ['Complemento oggetto', 'Complemento di luogo (moto a)', 'Complemento di tempo continuato'],
    gen: ['Complemento di specificazione', 'Complemento partitivo'],
    dat: ['Complemento di termine', 'Complemento di vantaggio', 'Dativo di possesso'],
    abl: ['Complemento di mezzo o strumento', 'Complemento di modo', 'Complemento di causa', 'Complemento di tempo determinato', 'Complemento di luogo (stato in)'],
    voc: ['Complemento di vocazione'],
  },
  greco: {
    nom: ['Soggetto', 'Attributo', 'Apposizione', 'Parte nominale'],
    acc: ['Complemento oggetto', 'Complemento di limitazione', 'Complemento di tempo continuato'],
    gen: ['Complemento di specificazione', 'Complemento partitivo', 'Complemento di paragone'],
    dat: ['Complemento di termine', 'Complemento di mezzo o strumento', 'Complemento di modo', 'Complemento di tempo determinato'],
    voc: ['Complemento di vocazione'],
  },
};
const ESSERE = /^(sum|εἰμί|esse)$/i;

export function suggerisciFunzioni(f, span, parole, lang) {
  const out = [];
  const add = x => { if (x && !out.includes(x)) out.push(x); };
  const dentro = [];
  for (let i = span.da; i <= span.a; i++) dentro.push({ w: parole[i], p: f.parole[parole[i] && parole[i].i] });

  /* un verbo di modo finito: e' il predicato (o la copula, se e' «essere») */
  const verbo = dentro.find(x => x.p && x.p.pos === 'verbo' && x.p.tratti && FINITI.has(x.p.tratti.modo));
  if (verbo) {
    if (ESSERE.test(verbo.p.lemma || '')) { add('Copula'); add('Predicato nominale'); add('Predicato verbale'); }
    else add('Predicato verbale');
  }

  /* una preposizione in testa: i complementi che apre, col caso della parola che regge */
  const testa = dentro[0];
  const nominale = dentro.find(x => x.p && x.p.tratti && x.p.tratti.caso && x.p.pos !== 'preposizione');
  if (testa && testa.p && testa.p.pos === 'preposizione') {
    const prep = preposizione(testa.w.t, lang);
    if (prep) {
      const caso = nominale && nominale.p.tratti.caso;
      const lista = caso && prep.complementi[caso] ? prep.complementi[caso] : Object.values(prep.complementi).flat();
      lista.forEach(add);
    }
  } else if (nominale && !verbo) {
    (PER_CASO[lang] && PER_CASO[lang][nominale.p.tratti.caso] || []).forEach(add);
    /* l'ablativo latino con un verbo passivo nella frase puo' essere d'agente */
    if (lang === 'latino' && nominale.p.tratti.caso === 'abl') {
      const passivo = Object.values(f.parole).some(p => p && p.tratti && p.tratti.diatesi === 'pass' && FINITI.has(p.tratti.modo));
      if (passivo) add('Complemento di causa efficiente');
    }
  }
  return out.slice(0, 6);
}

/* ── proposizioni ────────────────────────────────────────────────────────── */
const SUFFISSO = { latino: /\s*\(latino\)$/, greco: /\s*\(greco\)$/ };
const ALTRA = { latino: /\(greco\)$/, greco: /\(latino\)$/ };

/* I tipi che si incontrano in quasi ogni versione stanno davanti; gli altri
   restano a un tocco, sotto «Altri tipi». Trentatre pastiglie in fila non
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

/* «Subordinante finale (ἵνa, ὅπως)» → «Finale»; «Coordinante copulativa» → «Copulativa» */
function tipoDaPreset(tipo) {
  const m = /^(Subordinante|Coordinante)\s+([^\s(]+)/i.exec(tipo || '');
  if (!m) return null;
  const t = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
  const ruolo = /^Sub/i.test(m[1]) ? 'Subordinata' : 'Coordinata';
  const mappa = { Condizionale: 'Condizionale (protasi)', Completiva: 'Dichiarativa' };
  return { ruolo, tipo: mappa[t] || t };
}

export function suggerisciProposizione(f, span, parole, lang) {
  const prima = parole[span.da];
  const p = prima && f.parole[prima.i];
  const out = { ruolo: 'Principale', tipo: 'Enunciativa', connettivo: '', perche: '' };
  if (!prima) return out;
  const preset = lookupConjunctionPreset(prima.t, lang);
  if (preset && preset.tipo) {
    const d = tipoDaPreset(preset.tipo);
    if (d) {
      out.ruolo = d.ruolo;
      out.tipo = d.tipo;
      out.connettivo = prima.t;
      out.perche = preset.tipo.toLowerCase();
      return out;
    }
  }
  if (p && p.pos === 'pronome' && /relativ/i.test(p.nota || '')) {
    return { ruolo: 'Subordinata', tipo: 'Relativa propria', connettivo: prima.t, perche: 'pronome relativo' };
  }
  /* participio in caso obliquo + nome concordato: costrutto assoluto */
  const ptc = [];
  for (let i = span.da; i <= span.a; i++) {
    const q = f.parole[parole[i].i];
    if (q && q.tratti && q.tratti.modo === 'ptc') ptc.push(q);
  }
  if (ptc.some(q => q.tratti.caso === 'abl') && lang === 'latino') {
    return { ruolo: 'Subordinata', tipo: 'Ablativo assoluto', connettivo: '', perche: 'participio in ablativo' };
  }
  if (ptc.some(q => q.tratti.caso === 'gen') && lang === 'greco') {
    return { ruolo: 'Subordinata', tipo: 'Genitivo assoluto', connettivo: '', perche: 'participio in genitivo' };
  }
  return out;
}

export function etichettaProposizione(s, lungo = false) {
  const sigla = s.ruolo === 'Principale' ? 'P' : s.ruolo === 'Coordinata' ? 'C' : `S${s.grado || 1}`;
  const tipo = s.tipo ? s.tipo.toLowerCase() : '';
  if (lungo) return `${s.ruolo}${s.ruolo === 'Subordinata' ? ` di ${s.grado || 1}° grado` : ''}${tipo ? ` · ${tipo}` : ''}`;
  return `${sigla}${tipo ? ' · ' + tipo : ''}`;
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
