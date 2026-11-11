#!/usr/bin/env node
/* ============================================================================
   ESTRAI LE CLASSI CHIUSE · dal monolite al motore condiviso
   ----------------------------------------------------------------------------
   Il translator storico (translator.html) custodisce, scritti a mano, i
   dizionari che riconoscono con certezza le parole «fisse» dei testi
   scolastici: l'articolo greco, le forme di sum / εἰμί, i pronomi, le parole
   d'altissima frequenza. Vivevano solo dentro il monolite, quindi nessun'altra
   superficie poteva leggerli.

   Questo script li VALUTA cosi' come sono scritti (nessuna ricopiatura a mano)
   e li deposita in `modules/engine/classi-chiuse.js`, generato. Se il monolite
   cambia quei blocchi, si rigenera:

       node _build/estrai-classi-chiuse.mjs

   I blocchi si cercano per NOME, non per numero di riga: il file cambia sotto
   i piedi a ogni sessione.
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'translator.html');
const OUT = path.join(ROOT, 'modules/engine/classi-chiuse.js');

const { normalizeText } = await import(path.join(ROOT, 'modules/engine/text-utils.js'));
const righe = fs.readFileSync(SRC, 'utf8').split('\n');

/* Un blocco comincia con `const NOME = ` a inizio riga e finisce alla prima
   riga che chiude al livello zero (`})();` per le IIFE, `};` per gli oggetti). */
function blocco(nome) {
  const i = righe.findIndex(r => r.startsWith(`const ${nome} = `));
  if (i < 0) throw new Error(`blocco non trovato: ${nome}`);
  const fine = righe.findIndex((r, k) => k > i && /^(\}\)\(\);|\};)\s*$/.test(r));
  if (fine < 0) throw new Error(`fine del blocco non trovata: ${nome}`);
  return righe.slice(i, fine + 1).join('\n');
}

const NOMI = [
  'LATIN_FREQ_DICT', 'GREEK_FREQ_DICT',
  '_HIGH_FREQ_BE_FORMS_LAT', '_HIGH_FREQ_BE_FORMS_GR',
  '_HIGH_FREQ_PRONOUNS_LAT', '_HIGH_FREQ_PRONOUNS_GR',
  '_HIGH_FREQ_PRONOUNS_EXT_LAT', '_HIGH_FREQ_PRONOUNS_EXT_GR',
];
const codice = NOMI.map(blocco).join('\n\n') + `\nreturn { ${NOMI.join(', ')} };`;
/* Il dizionario greco del monolite piega le chiavi con normalizeText, che
   cancella spiriti e accenti: ἡ (articolo), ἤ (disgiuntiva) e ἥ (relativo)
   diventano la stessa chiave, e l'ultima scritta vince. Qui gli si passa una
   piegatura DOLCE, che tiene spiriti, accenti e iota sottoscritto e unifica
   solo il grave con l'acuto (ὃν nel testo = ὅν in tabella) e le maiuscole.
   La piegatura forte resta al motore, come ripiego quando non c'e' ambiguita'. */
const dolce = s => (s || '').normalize('NFD').replace(/\u0300/g, '\u0301').normalize('NFC').toLowerCase();
// eslint-disable-next-line no-new-func
const B = new Function('normalizeText', codice)(dolce);

/* ── Le parole frequenti: forma → {lemma, pos, …}. Si raggruppano per voce,
   cosi' il file generato porta ogni lemma una volta sola. ─────────────────── */
function compatta(dict) {
  const voci = new Map();
  for (const [forma, v] of Object.entries(dict)) {
    const { lemma, pos, tier, ...extra } = v;
    const k = JSON.stringify([lemma, pos, extra]);
    if (!voci.has(k)) voci.set(k, { lemma, pos, extra, forme: [] });
    voci.get(k).forme.push(forma);
  }
  return [...voci.values()].map(v => {
    const r = [v.lemma, v.pos, v.forme];
    if (Object.keys(v.extra).length) r.push(v.extra);
    return r;
  });
}

/* ── Le forme analizzate: parola esatta → tratti. Si tengono solo i campi
   che dicono qualcosa sulla forma; `lemmaCustom` e' contabilita' del monolite. */
const CAMPI = ['partOfSpeech', 'lemma', 'caso', 'numero', 'genere', 'persona',
  'modo', 'tempo', 'diatesi', 'pronomeTipo', 'verboForma'];
function forme(...dicts) {
  const out = {};
  for (const d of dicts) {
    for (const [forma, v] of Object.entries(d)) {
      if (out[forma]) continue;                     // vince il primo: personali prima degli estesi
      const r = {};
      for (const c of CAMPI) if (v[c]) r[c] = v[c];
      out[forma] = r;
    }
  }
  return out;
}

const dati = {
  frequenti: {
    latino: compatta(B.LATIN_FREQ_DICT),
    greco: compatta(B.GREEK_FREQ_DICT),
  },
  forme: {
    latino: forme(B._HIGH_FREQ_BE_FORMS_LAT, B._HIGH_FREQ_PRONOUNS_LAT, B._HIGH_FREQ_PRONOUNS_EXT_LAT),
    greco: forme(B._HIGH_FREQ_BE_FORMS_GR, B._HIGH_FREQ_PRONOUNS_GR, B._HIGH_FREQ_PRONOUNS_EXT_GR),
  },
};

const conta = {
  latino: Object.keys(B.LATIN_FREQ_DICT).length,
  greco: Object.keys(B.GREEK_FREQ_DICT).length,
  formeLat: Object.keys(dati.forme.latino).length,
  formeGr: Object.keys(dati.forme.greco).length,
};

const out = `/* ============================================================================
   CLASSI CHIUSE E PAROLE FREQUENTI · generato, NON modificare a mano
   ----------------------------------------------------------------------------
   Origine: i dizionari scritti a mano dentro translator.html
   (LATIN_FREQ_DICT, GREEK_FREQ_DICT, _HIGH_FREQ_*), valutati e compattati da
   _build/estrai-classi-chiuse.mjs. Si rigenera con:

       node _build/estrai-classi-chiuse.mjs

   Contenuto: ${conta.latino} forme latine e ${conta.greco} greche d'alta frequenza
   (forma → lemma e parte del discorso); ${conta.formeLat} forme latine e ${conta.formeGr}
   greche analizzate per intero (sum/εἰμί, pronomi).
   ============================================================================ */
import { normalizeText } from './text-utils.js';

const DATI = ${JSON.stringify(dati)};

/* Piegature. DOLCE: tiene spiriti, accenti e iota sottoscritto, unifica il
   grave con l'acuto e le maiuscole (ὃν nel testo = ὅν in tabella; Ὁ = ὁ).
   FORTE: toglie tutti i diacritici (normalizeText), e si usa solo come ripiego
   quando la chiave forte porta a una voce sola. */
export function chiaveDolce(s) {
  return (s || '').normalize('NFD').replace(/̀/g, '́').normalize('NFC').toLowerCase();
}
function chiave(word, lang) {
  return lang === 'greco' ? chiaveDolce(word) : (word || '').toLowerCase().trim();
}

/* Indici costruiti una volta, alla prima domanda. */
const _indice = { latino: null, greco: null };
function indice(lang) {
  if (_indice[lang]) return _indice[lang];
  const esatto = Object.create(null);
  const forte = Object.create(null);           // chiave forte → voci distinte
  for (const [lemma, pos, forme, extra] of DATI.frequenti[lang] || []) {
    const voce = Object.assign({ lemma, pos }, extra || {});
    for (const f of forme) {
      esatto[f] = voce;
      const k = normalizeText(f);
      const lista = forte[k] || (forte[k] = []);
      if (!lista.includes(voce)) lista.push(voce);
    }
  }
  return (_indice[lang] = { esatto, forte });
}
const _forme = { latino: null, greco: null };
function indiceForme(lang) {
  if (_forme[lang]) return _forme[lang];
  const esatto = Object.create(null);
  const forte = Object.create(null);
  for (const [f, v] of Object.entries(DATI.forme[lang] || {})) {
    esatto[chiave(f, lang)] = v;
    const k = normalizeText(f);
    (forte[k] || (forte[k] = [])).push(v);
  }
  return (_forme[lang] = { esatto, forte });
}

/** Parola d'alta frequenza: {lemma, pos, info?, note?, tipo?} oppure null.
 *  In greco vale prima la chiave dolce; la forte solo se non e' ambigua
 *  (ἡ, ἤ, ἥ restano tre parole diverse). */
export function parolaFrequente(word, lang) {
  if (!word) return null;
  const idx = indice(lang);
  const hit = idx.esatto[chiave(word, lang)];
  if (hit) return hit;
  const lista = idx.forte[normalizeText(word)];
  return lista && lista.length === 1 ? lista[0] : null;
}

/** Forma analizzata per intero (sum/εἰμί, pronomi): stessa regola. */
export function formaAnalizzata(word, lang) {
  if (!word) return null;
  const idx = indiceForme(lang);
  const hit = idx.esatto[chiave(word, lang)];
  if (hit) return hit;
  const lista = idx.forte[normalizeText(word)];
  return lista && lista.length === 1 ? lista[0] : null;
}

export const CLASSI_CHIUSE_META = {
  name: 'classi-chiuse',
  generato: true,
  sorgente: 'translator.html · LATIN_FREQ_DICT, GREEK_FREQ_DICT, _HIGH_FREQ_*',
  conteggi: ${JSON.stringify(conta)},
};
`;

fs.writeFileSync(OUT, out);
console.log(`scritto ${path.relative(ROOT, OUT)} · ${(out.length / 1024).toFixed(0)} KB`, conta);
