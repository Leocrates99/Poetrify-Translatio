/**
 * @module engine/prepositions
 * @description Preset delle preposizioni per il latino e il greco antico.
 *   · PREP_PRESETS              — dizionario lemma → casi retti + complementi
 *   · lookupPrepositionPreset() — lookup case-insensitive
 *   · applyPrepositionPreset()  — applica preset alla grammar entry,
 *                                 popolando partOfSpeech, preposizioneRetta,
 *                                 _prepHint (mappa caso→funzioni per cross-layer)
 *
 * Voci greche dalla Tabella delle Preposizioni Greche del corpus didattico
 * (18 preposizioni proprie + 5 improprie ricorrenti).
 */

import { normalizeText } from './text-utils.js';

export const PREP_PRESETS = {
  latino: {
    /* (Da espandere con le preposizioni latine — placeholder) */
  },
  greco: {
    'αμφι': {
      pos: 'Preposizione', note: 'intorno a, riguardo a (moto circolare / argomento)',
      casiRetti: ['Accusativo', 'Genitivo'],
      complementi: [
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di argomento'], note: 'moto circolare, argomento' },
        { caso: 'Genitivo',   funzioni: ['Complemento di argomento'], note: 'riguardo a' },
      ],
    },
    'ανα': {
      pos: 'Preposizione', note: 'lungo, in alto, distributivo',
      casiRetti: ['Accusativo'],
      complementi: [
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto per)'], note: 'moto per luogo, distributivo' },
      ],
    },
    'αντι': {
      pos: 'Preposizione', note: 'al posto di, in cambio di',
      casiRetti: ['Genitivo'],
      complementi: [
        { caso: 'Genitivo', funzioni: ['Complemento di causa', 'Complemento di prezzo'], note: 'sostituzione, scambio, prezzo' },
      ],
    },
    'απο': {
      pos: 'Preposizione', note: 'da (moto da luogo, agente, allontanamento)',
      casiRetti: ['Genitivo'],
      complementi: [
        { caso: 'Genitivo', funzioni: ['Complemento di luogo (moto da)', 'Complemento di agente', 'Complemento di causa efficiente', 'Complemento di allontanamento o separazione'], note: 'moto da, agente, separazione' },
      ],
    },
    'δια': {
      pos: 'Preposizione', note: 'attraverso, per mezzo di, a causa di',
      casiRetti: ['Genitivo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di luogo (moto per)', 'Complemento di mezzo o strumento'], note: 'moto per luogo, mezzo tramite persona' },
        { caso: 'Accusativo', funzioni: ['Complemento di causa', 'Complemento di tempo continuato'], note: 'causa, tempo continuato' },
      ],
    },
    'εις': {
      pos: 'Preposizione', note: 'verso, in, fino a (moto a luogo, fine, tempo)',
      casiRetti: ['Accusativo'],
      complementi: [
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di fine o scopo', 'Complemento di tempo determinato'], note: 'moto a luogo, scopo, tempo fino a' },
      ],
    },
    'ες': {
      pos: 'Preposizione', note: 'variante ionica di εἰς',
      casiRetti: ['Accusativo'],
      complementi: [
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di fine o scopo'], note: 'come εἰς' },
      ],
    },
    'εκ': {
      pos: 'Preposizione', note: 'da (interno), origine, causa',
      casiRetti: ['Genitivo'],
      complementi: [
        { caso: 'Genitivo', funzioni: ['Complemento di luogo (moto da)', 'Complemento di origine', 'Complemento di causa'], note: 'moto da dentro, origine, causa' },
      ],
    },
    'εξ': {
      pos: 'Preposizione', note: 'variante di ἐκ davanti a vocale',
      casiRetti: ['Genitivo'],
      complementi: [
        { caso: 'Genitivo', funzioni: ['Complemento di luogo (moto da)', 'Complemento di origine', 'Complemento di causa'], note: 'come ἐκ davanti a vocale' },
      ],
    },
    'εν': {
      pos: 'Preposizione', note: 'in, dentro, tra (stato in luogo)',
      casiRetti: ['Dativo'],
      complementi: [
        { caso: 'Dativo', funzioni: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato', 'Complemento di modo', 'Complemento di mezzo o strumento'], note: 'stato in luogo, tempo, modo, mezzo' },
      ],
    },
    'επι': {
      pos: 'Preposizione', note: 'su, sopra, contro (sui 3 casi)',
      casiRetti: ['Genitivo', 'Dativo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato'], note: 'sopra (statico), tempo storico (al tempo di)' },
        { caso: 'Dativo',     funzioni: ['Complemento di luogo (stato in)', 'Complemento di causa', 'Complemento di fine o scopo'], note: 'sopra/presso, causa, condizione' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di fine o scopo', 'Complemento di tempo continuato'], note: 'moto contro, scopo, tempo continuato' },
      ],
    },
    'κατα': {
      pos: 'Preposizione', note: 'giù da, lungo, secondo',
      casiRetti: ['Genitivo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di luogo (moto da)', 'Complemento di svantaggio'], note: 'moto da (alto verso basso), contro' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto per)', 'Complemento di tempo determinato', 'Complemento di modo', 'Complemento di limitazione'], note: 'moto per/lungo, distributivo, conformità, limitazione' },
      ],
    },
    'μετα': {
      pos: 'Preposizione', note: 'con, dopo (compagnia o posteriorità)',
      casiRetti: ['Genitivo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di compagnia', 'Complemento di unione', 'Complemento di modo'], note: 'compagnia, unione, modo' },
        { caso: 'Accusativo', funzioni: ['Complemento di tempo determinato'], note: 'dopo (temporale), cambiamento di stato' },
      ],
    },
    'παρα': {
      pos: 'Preposizione', note: 'presso, da parte di, contro (3 casi)',
      casiRetti: ['Genitivo', 'Dativo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di luogo (moto da)', 'Complemento di agente'], note: 'moto da presso, agente' },
        { caso: 'Dativo',     funzioni: ['Complemento di luogo (stato in)', 'Complemento di paragone'], note: 'stato presso, paragone' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di paragone', 'Complemento concessivo'], note: 'moto verso, oltre, contrarietà' },
      ],
    },
    'περι': {
      pos: 'Preposizione', note: 'intorno a, riguardo a',
      casiRetti: ['Genitivo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di argomento', 'Complemento di vantaggio'], note: 'argomento, vantaggio' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di tempo determinato'], note: 'moto circolare, tempo determinato' },
      ],
    },
    'προ': {
      pos: 'Preposizione', note: 'davanti, prima (di luogo o tempo)',
      casiRetti: ['Genitivo'],
      complementi: [
        { caso: 'Genitivo', funzioni: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato', 'Complemento di paragone'], note: 'davanti a, prima di, preferenza' },
      ],
    },
    'προς': {
      pos: 'Preposizione', note: 'verso, presso, da parte di (3 casi)',
      casiRetti: ['Genitivo', 'Dativo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di luogo (moto da)', 'Complemento di agente'], note: 'provenienza, giuramento' },
        { caso: 'Dativo',     funzioni: ['Complemento di luogo (stato in)'], note: 'stato presso, aggiunta' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di fine o scopo'], note: 'moto verso, scopo, rapporto' },
      ],
    },
    'συν': {
      pos: 'Preposizione', note: 'insieme con (compagnia cooperativa)',
      casiRetti: ['Dativo'],
      complementi: [
        { caso: 'Dativo', funzioni: ['Complemento di compagnia', 'Complemento di unione', 'Complemento di mezzo o strumento', 'Complemento di modo'], note: 'compagnia coop., mezzo, modo' },
      ],
    },
    'υπερ': {
      pos: 'Preposizione', note: 'sopra, oltre, a favore di',
      casiRetti: ['Genitivo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di luogo (stato in)', 'Complemento di vantaggio', 'Complemento di argomento'], note: 'sopra, a favore di, riguardo a' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di paragone'], note: 'moto oltre, misura/superlativo' },
      ],
    },
    'υπο': {
      pos: 'Preposizione', note: 'da (agente), sotto, verso (tempo)',
      casiRetti: ['Genitivo', 'Accusativo'],
      complementi: [
        { caso: 'Genitivo',   funzioni: ['Complemento di agente', 'Complemento di causa efficiente'], note: 'agente e causa efficiente (passive)' },
        { caso: 'Accusativo', funzioni: ['Complemento di luogo (moto a)', 'Complemento di tempo determinato'], note: 'moto sotto, tempo verso' },
      ],
    },
    /* Preposizioni improprie ricorrenti */
    'χωρις':  { pos: 'Preposizione', note: 'senza (separazione)', casiRetti: ['Genitivo'],
      complementi: [{ caso: 'Genitivo', funzioni: ['Complemento di allontanamento o separazione', 'Complemento di privazione'], note: 'separazione/privazione' }] },
    'ανευ':   { pos: 'Preposizione', note: 'senza (mancanza)', casiRetti: ['Genitivo'],
      complementi: [{ caso: 'Genitivo', funzioni: ['Complemento di privazione', 'Complemento di allontanamento o separazione'], note: 'mancanza' }] },
    'ενεκα':  { pos: 'Preposizione', note: 'a causa di, per (postposta)', casiRetti: ['Genitivo'],
      complementi: [{ caso: 'Genitivo', funzioni: ['Complemento di fine o scopo', 'Complemento di causa'], note: 'scopo motivante' }] },
    'ενεκεν': { pos: 'Preposizione', note: 'variante di ἕνεκα', casiRetti: ['Genitivo'],
      complementi: [{ caso: 'Genitivo', funzioni: ['Complemento di fine o scopo', 'Complemento di causa'], note: 'come ἕνεκα' }] },
    'χαριν':  { pos: 'Preposizione', note: 'per amore di, in grazia di (postposta)', casiRetti: ['Genitivo'],
      complementi: [{ caso: 'Genitivo', funzioni: ['Complemento di fine o scopo'], note: 'scopo/grazia di' }] },
  },
};

/**
 * Cerca il preset di preposizione per la parola data.
 * @returns {object|null}
 */
export function lookupPrepositionPreset(word, lang) {
  if (!word) return null;
  const dict = PREP_PRESETS[lang];
  if (!dict) return null;
  let key;
  if (lang === 'greco') {
    key = normalizeText(word);
  } else {
    key = word.toLowerCase().trim().replace(/[.,;?!:·]/g, '');
  }
  return dict[key] || null;
}

/**
 * Applica il preset di preposizione a una grammar entry.
 * Popola partOfSpeech, preposizioneRetta, note, _prepHint.
 * @returns {boolean}
 */
export function applyPrepositionPreset(entry, lang) {
  if (!entry || !entry.word) return false;
  const preset = lookupPrepositionPreset(entry.word, lang);
  if (!preset) return false;
  let applied = false;
  if (preset.pos && !entry.partOfSpeech) {
    entry.partOfSpeech = preset.pos;
    applied = true;
  }
  if (!entry.preposizioneRetta && Array.isArray(preset.casiRetti) && preset.casiRetti.length > 0) {
    if (preset.casiRetti.length === 1) {
      entry.preposizioneRetta = preset.casiRetti[0];
    } else {
      entry.preposizioneRetta = lang === 'greco' ? 'Più casi' : 'Accusativo o ablativo';
    }
    applied = true;
  }
  if (preset.note && !entry.note) {
    entry.note = '[preset] ' + preset.note;
    applied = true;
  }
  if (!entry._prepHint && Array.isArray(preset.complementi)) {
    entry._prepHint = preset.complementi.map(c => ({
      caso: c.caso,
      funzioni: c.funzioni.slice(),
      note: c.note || '',
    }));
    applied = true;
  }
  if (applied) entry._presetApplied = true;
  return applied;
}
