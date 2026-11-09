/* ============================================================================
   PARADIGMI · dove sta una forma dentro la sua flessione
   ----------------------------------------------------------------------------
   I paradigmi generati e validati del progetto (data/<lingua>/paradigms/) hanno
   le celle gia' scomposte in morfemi: [[testo, ruolo], …], con i ruoli
   a = aumento/raddoppiamento · t = tema · v = vocale tematica
   s = suffisso · d = desinenza.
   Cercare la forma del testo fra quelle celle da' due cose insieme:
     · TUTTE le letture possibili, ciascuna col suo percorso (verbo › ind › …),
       quindi anche l'ambiguita' vera (rosae: gen. sg. / dat. sg. / nom. pl.);
     · la SCOMPOSIZIONE della forma, che e' il cuore didattico del prodotto.
   Il lessico dice spesso il lemma senza l'analisi (in latino un quarto delle
   forme ha il parsing vuoto): il paradigma colma quel vuoto, e lo dichiara.
   ============================================================================ */
import { normalizeText } from '../../../modules/engine/text-utils.js';
import { daPercorso, dedup, CHIAVI_DI_CITAZIONE } from './tratti.js';

const BASE = new URL('../../../data/', import.meta.url).href;
const CARTELLA = { latino: 'latin', greco: 'greek' };
const _shard = new Map();      // `${lang}:${lettera}` → Promise<{paradigms}>

function caricaShard(lang, lettera) {
  const k = `${lang}:${lettera}`;
  if (!_shard.has(k)) {
    const url = `${BASE}${CARTELLA[lang]}/paradigms/${encodeURIComponent(lettera)}.json`;
    _shard.set(k, fetch(url)
      .then(r => (r.ok ? r.json() : { paradigms: {} }))
      .then(j => j.paradigms || {})
      .catch(() => ({})));
  }
  return _shard.get(k);
}

/* Chiave del lemma: il lessico scrive a volte «est1», «duo1», «#venio»,
   «dī-vĭdo»; i paradigmi no. */
function lemmaPulito(lemma) {
  return String(lemma || '').replace(/^#\s*/, '').replace(/[-_]/g, '').replace(/\d+$/, '');
}

export async function paradigmaDi(lemma, lang) {
  const pulito = lemmaPulito(lemma);
  if (!pulito || !CARTELLA[lang]) return null;
  const lettera = normalizeText(pulito).charAt(0);
  const P = await caricaShard(lang, lettera);
  if (P[pulito]) return { lemma: pulito, ...P[pulito] };
  const n = normalizeText(pulito).replace(/j/g, 'i');
  if (!P._norm) {
    const idx = Object.create(null);
    for (const k of Object.keys(P)) {
      const nk = normalizeText(k).replace(/j/g, 'i');
      if (!(nk in idx)) idx[nk] = k;
    }
    Object.defineProperty(P, '_norm', { value: idx, enumerable: false });
  }
  const k = P._norm[n];
  return k ? { lemma: k, ...P[k] } : null;
}

/* ── piegature per il confronto ──────────────────────────────────────────── */
/* Greco: la piegatura DOLCE tiene accenti e spiriti (λῦσαι infinito ≠ λύσαι
   ottativo) e unifica solo grave/acuto e maiuscole. FORTE: senza diacritici,
   solo come ripiego. Latino: niente quantita', j→i, v→u (Vergilius/Uergilius). */
const dolceGr = s => (s || '').normalize('NFD').replace(/̀/g, '́').normalize('NFC').toLowerCase();
const forteLat = s => normalizeText(s).replace(/j/g, 'i').replace(/v/g, 'u');

const eCella = x => Array.isArray(x) && x.length > 0 && Array.isArray(x[0]) && typeof x[0][0] === 'string';

/* Visita ricorsiva: ogni cella con il suo percorso di chiavi. */
function visita(nodo, percorso, fuori) {
  if (eCella(nodo)) { fuori.push({ percorso, indice: null, lunghezza: null, cella: nodo }); return; }
  if (Array.isArray(nodo)) {
    if (nodo.length && nodo.every(eCella)) {
      nodo.forEach((c, i) => fuori.push({ percorso, indice: i, lunghezza: nodo.length, cella: c }));
    }
    return;
  }
  if (nodo && typeof nodo === 'object') {
    for (const [k, v] of Object.entries(nodo)) {
      if (CHIAVI_DI_CITAZIONE.has(k)) continue;
      visita(v, [...percorso, k], fuori);
    }
  }
}

function celle(par) {
  if (!par._celle) {
    const fuori = [];
    if (par.nome) visita(par.nome, [], fuori);
    if (par.verbo) visita(par.verbo, [], fuori);
    Object.defineProperty(par, '_celle', { value: fuori, enumerable: false });
  }
  return par._celle;
}

/**
 * Le letture di `forma` dentro il paradigma: [{ tratti, segmenti }].
 * Si confronta prima con la piegatura che distingue (in greco gli accenti),
 * poi, se non c'e' nulla, con quella che non distingue.
 */
export function letturePerForma(par, forma, lang) {
  if (!par || !forma) return [];
  const pulita = forma.replace(/[’'ʼ᾽]$/u, '');
  const tutte = celle(par);
  const testo = c => c.cella.map(s => s[0]).join('');
  const prove = lang === 'greco'
    ? [s => dolceGr(s), s => normalizeText(s)]
    : [s => forteLat(s)];
  for (const piega of prove) {
    const bersaglio = piega(pulita);
    const hit = tutte.filter(c => piega(testo(c)) === bersaglio);
    if (hit.length) {
      const letture = hit.map(c => ({
        tratti: daPercorso(c.percorso, c.indice, c.lunghezza),
        segmenti: c.cella.filter(s => s[0]).map(([t, r]) => [t, r]),
      }));
      /* stesse caratteristiche dalla tabella declinata e da una citazione:
         una lettura sola */
      const viste = dedup(letture.map(l => l.tratti));
      return viste.map(t => letture.find(l => l.tratti === t || JSON.stringify(l.tratti) === JSON.stringify(t)));
    }
  }
  return [];
}

/* Legenda dei ruoli dei morfemi: nome per esteso e sigla. */
export const MORFEMI = {
  a: 'aumento o raddoppiamento',
  t: 'tema',
  v: 'vocale tematica',
  s: 'suffisso',
  d: 'desinenza',
};
