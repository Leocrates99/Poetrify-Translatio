/**
 * @module dictionary/cognates
 * @description Tabella curata di coppie di cognati indoeuropei latino ↔ greco.
 *
 * Una "coppia cognata" è un termine che, pur essendo presente in entrambe
 * le lingue, condivide la stessa radice PIE (Proto-Indo-European) — non
 * un semplice prestito (es. φιλόσοφος → philosophus, NO) ma una vera
 * eredità da una radice comune (es. pater ↔ πατήρ, ignis ↔ πῦρ ?).
 *
 * Il dataset qui sotto è una curatela manuale di ~100 voci di alta
 * affidabilità, utili agli studenti per visualizzare il continuum IE.
 *
 * API:
 *   getCognate(lemma, lang) → { latin, greek, sense, root? } | null
 *   listCognates() → tutte le coppie
 */

/* Schema: { latin, greek, root, sense } */
const COGNATE_PAIRS = [
  /* Famiglia + parentela */
  { latin: 'pater',  greek: 'πατήρ',  root: '*ph₂tér',  sense: 'padre' },
  { latin: 'mater',  greek: 'μήτηρ',  root: '*méh₂tēr', sense: 'madre' },
  { latin: 'frater', greek: 'φρατήρ', root: '*bʰréh₂tēr', sense: 'fratello (gr. = membro di fratria)' },
  { latin: 'soror',  greek: 'ἔορ',    root: '*swésōr',  sense: 'sorella' },
  { latin: 'filius', greek: 'υἱός',   root: '*suh₂yús', sense: 'figlio (cfr. lat. arc. *sūnus → filius)' },
  /* Pronomi e numerali */
  { latin: 'ego',    greek: 'ἐγώ',    root: '*éǵh₂',    sense: 'io' },
  { latin: 'tu',     greek: 'σύ',     root: '*túh₂',    sense: 'tu' },
  { latin: 'nos',    greek: 'νώ',     root: '*nō',      sense: 'noi (dual.)' },
  { latin: 'unus',   greek: 'εἷς',    root: '*sem-',    sense: 'uno' },
  { latin: 'duo',    greek: 'δύο',    root: '*dwóh₁',   sense: 'due' },
  { latin: 'tres',   greek: 'τρεῖς',  root: '*tréyes',  sense: 'tre' },
  { latin: 'quattuor', greek: 'τέσσαρες', root: '*kʷetwóres', sense: 'quattro' },
  { latin: 'quinque', greek: 'πέντε', root: '*pénkʷe',  sense: 'cinque' },
  { latin: 'sex',    greek: 'ἕξ',     root: '*swéḱs',   sense: 'sei' },
  { latin: 'septem', greek: 'ἑπτά',   root: '*septḿ̥',  sense: 'sette' },
  { latin: 'octo',   greek: 'ὀκτώ',   root: '*oḱtṓw',   sense: 'otto' },
  { latin: 'novem',  greek: 'ἐννέα',  root: '*h₁néwn̥', sense: 'nove' },
  { latin: 'decem',  greek: 'δέκα',   root: '*déḱm̥',   sense: 'dieci' },
  { latin: 'centum', greek: 'ἑκατόν', root: '*ḱm̥tóm',  sense: 'cento' },
  { latin: 'mille',  greek: 'χίλιοι', root: '*ǵʰésl-',  sense: 'mille' },
  /* Corpo */
  { latin: 'cor',    greek: 'καρδία', root: '*ḱérd-',   sense: 'cuore' },
  { latin: 'oculus', greek: 'ὄσσε',   root: '*h₃ókʷ-',  sense: 'occhio' },
  { latin: 'dens',   greek: 'ὀδούς',  root: '*h₃dónts', sense: 'dente' },
  { latin: 'genu',   greek: 'γόνυ',   root: '*ǵónu',    sense: 'ginocchio' },
  { latin: 'pes',    greek: 'πούς',   root: '*pṓds',    sense: 'piede' },
  { latin: 'auris',  greek: 'οὖς',    root: '*h₂óws-',  sense: 'orecchio' },
  { latin: 'nasus',  greek: 'ῥίς',    root: '*nas-',    sense: 'naso (gr. = naso, lat. = naso)' },
  { latin: 'ungula', greek: 'ὄνυξ',   root: '*h₃nogʰ-', sense: 'unghia' },
  { latin: 'os',     greek: 'ὀστέον', root: '*h₃ést-',  sense: 'osso' },
  { latin: 'iecur',  greek: 'ἧπαρ',   root: '*Hyékʷr̥', sense: 'fegato' },
  { latin: 'cerebrum', greek: 'κάρα', root: '*ḱerh₂-',  sense: 'testa/cervello' },
  /* Natura · elementi · animali */
  { latin: 'sol',    greek: 'ἥλιος',  root: '*sóh₂wl̥', sense: 'sole' },
  { latin: 'luna',   greek: 'σελήνη', root: '*lewk-',   sense: 'luna · luminoso' },
  { latin: 'stella', greek: 'ἀστήρ',  root: '*h₂stḗr',  sense: 'stella' },
  { latin: 'nox',    greek: 'νύξ',    root: '*nókʷts',  sense: 'notte' },
  { latin: 'dies',   greek: 'Ζεύς',   root: '*dyḗws',   sense: 'giorno · cielo (Zeus = dio del cielo)' },
  { latin: 'aqua',   greek: 'ὕδωρ',   root: '*wódr̥',   sense: 'acqua' },
  { latin: 'ignis',  greek: 'πῦρ',    root: '*h₁n̥gʷnis vs *péh₂wr̥', sense: 'fuoco (diversi radici)' },
  { latin: 'ventus', greek: 'ἄνεμος', root: '*h₂wéh₁-', sense: 'vento' },
  { latin: 'mare',   greek: 'μῶρ',    root: '*móri-',   sense: 'mare' },
  { latin: 'terra',  greek: 'γῆ',     root: '(non IE)', sense: 'terra' },
  { latin: 'mons',   greek: 'βουνός', root: '(diversi)', sense: 'monte' },
  { latin: 'silva',  greek: 'ὕλη',    root: '(diversi)', sense: 'selva, materia' },
  { latin: 'caelum', greek: 'οὐρανός', root: '(diversi)', sense: 'cielo' },
  { latin: 'taurus', greek: 'ταῦρος', root: '*tauros',  sense: 'toro' },
  { latin: 'bos',    greek: 'βοῦς',   root: '*gʷṓws',   sense: 'bue, bovino' },
  { latin: 'ovis',   greek: 'ὄϊς',    root: '*h₂ówis',  sense: 'pecora' },
  { latin: 'sus',    greek: 'ὗς',     root: '*sūs',     sense: 'maiale' },
  { latin: 'equus',  greek: 'ἵππος',  root: '*h₁éḱwos', sense: 'cavallo' },
  { latin: 'canis',  greek: 'κύων',   root: '*ḱwṓ',     sense: 'cane' },
  { latin: 'lupus',  greek: 'λύκος',  root: '*wĺ̥kʷos', sense: 'lupo' },
  { latin: 'mus',    greek: 'μῦς',    root: '*múh₂s',   sense: 'topo' },
  { latin: 'serpens', greek: 'ἕρπω',  root: '*serp-',   sense: 'serpente (rad. *serp- "strisciare")' },
  { latin: 'avis',   greek: 'οἰωνός', root: '*h₂éwis',  sense: 'uccello' },
  { latin: 'piscis', greek: 'ἰχθύς',  root: '(diversi)', sense: 'pesce' },
  /* Verbi fondamentali */
  { latin: 'sum',    greek: 'εἰμί',   root: '*h₁es-',   sense: 'essere' },
  { latin: 'fero',   greek: 'φέρω',   root: '*bʰer-',   sense: 'portare' },
  { latin: 'duco',   greek: 'δίκη',   root: '*deyḱ-',   sense: 'condurre/mostrare' },
  { latin: 'sto',    greek: 'ἵστημι', root: '*steh₂-',  sense: 'stare in piedi · porre' },
  { latin: 'eo',     greek: 'εἶμι',   root: '*h₁ey-',   sense: 'andare' },
  { latin: 'edo',    greek: 'ἔδω',    root: '*h₁ed-',   sense: 'mangiare' },
  { latin: 'video',  greek: 'εἶδον',  root: '*weyd-',   sense: 'vedere · sapere' },
  { latin: 'scio',   greek: 'εἰδέναι', root: '*weyd-',  sense: 'sapere (perfetto οἶδα)' },
  { latin: 'sequor', greek: 'ἕπομαι', root: '*sekʷ-',   sense: 'seguire' },
  { latin: 'sero',   greek: 'σπείρω', root: '*sh₁-',    sense: 'seminare' },
  { latin: 'gigno',  greek: 'γίγνομαι', root: '*ǵenh₁-', sense: 'generare · nascere' },
  { latin: 'iungo',  greek: 'ζεύγνυμι', root: '*yewg-', sense: 'unire · aggiogare' },
  { latin: 'lego',   greek: 'λέγω',   root: '*leǵ-',    sense: 'raccogliere · dire' },
  { latin: 'capio',  greek: 'κάπτω',  root: '*keh₂p-',  sense: 'prendere' },
  { latin: 'verto',  greek: 'τρέπω',  root: '*wert-',   sense: 'volgere' },
  { latin: 'mens',   greek: 'μένος',  root: '*men-',    sense: 'mente · impeto' },
  { latin: 'genus',  greek: 'γένος',  root: '*ǵenh₁-',  sense: 'stirpe · genere' },
  { latin: 'novus',  greek: 'νέος',   root: '*néwos',   sense: 'nuovo' },
  { latin: 'vetus',  greek: 'ἔτος',   root: '*wet-',    sense: 'vecchio · anno (lat. ≠ gr.)' },
  /* Aggettivi e qualità */
  { latin: 'magnus', greek: 'μέγας',  root: '*méǵh₂s',  sense: 'grande' },
  { latin: 'plenus', greek: 'πλήρης', root: '*pleh₁-',  sense: 'pieno' },
  { latin: 'paucus', greek: 'παῦρος', root: '*peh₂u-',  sense: 'poco' },
  { latin: 'levis',  greek: 'ἐλαχύς', root: '*h₁lengʷʰ-', sense: 'leggero' },
  { latin: 'dulcis', greek: 'γλυκύς', root: '*dl̥kú-',  sense: 'dolce' },
  { latin: 'gravis', greek: 'βαρύς',  root: '*gʷréh₂us', sense: 'pesante' },
  { latin: 'medius', greek: 'μέσος',  root: '*médʰyo-', sense: 'mediano' },
  { latin: 'rectus', greek: 'ὀρθός',  root: '(diversi)', sense: 'retto, dritto' },
  /* Cultura · politica */
  { latin: 'urbs',   greek: 'πόλις',  root: '(diversi)', sense: 'città · stato' },
  { latin: 'rex',    greek: 'βασιλεύς', root: '*h₃rḗǵs', sense: 're (gr. ≠ lat.)' },
  { latin: 'dominus', greek: 'δεσπότης', root: '*dem-', sense: 'signore della casa' },
  { latin: 'servus', greek: 'δοῦλος', root: '(diversi)', sense: 'servo' },
  { latin: 'liber',  greek: 'ἐλεύθερος', root: '*h₁lewdʰ-', sense: 'libero' },
  { latin: 'amicus', greek: 'φίλος',  root: '(diversi)', sense: 'amico' },
  { latin: 'hostis', greek: 'ξένος',  root: '*gʰósti-', sense: 'straniero/ospite' },
  { latin: 'pax',    greek: 'εἰρήνη', root: '*peh₂ǵ-',  sense: 'pace' },
  { latin: 'bellum', greek: 'πόλεμος', root: '(diversi)', sense: 'guerra' },
  { latin: 'lex',    greek: 'νόμος',  root: '(diversi)', sense: 'legge' },
  { latin: 'verbum', greek: 'ῥῆμα',   root: '*werh₁-',  sense: 'parola · verbo' },
  { latin: 'nomen',  greek: 'ὄνομα',  root: '*h₁nómn̥', sense: 'nome' },
  /* Spazio · tempo · moto */
  { latin: 'centrum', greek: 'κέντρον', root: '(prestito)', sense: 'centro (gr. → lat.)' },
  { latin: 'medium', greek: 'μέσον',  root: '*médʰyo-', sense: 'mezzo' },
  { latin: 'super',  greek: 'ὑπέρ',   root: '*upér',    sense: 'sopra' },
  { latin: 'sub',    greek: 'ὑπό',    root: '*upó',     sense: 'sotto' },
  { latin: 'pro',    greek: 'πρό',    root: '*pro',     sense: 'davanti, per' },
  { latin: 'in',     greek: 'ἐν',     root: '*h₁én',    sense: 'in' },
  { latin: 'ex',     greek: 'ἐκ',     root: '*h₁eǵʰs',  sense: 'fuori da' },
  { latin: 'ante',   greek: 'ἀντί',   root: '*h₂énti',  sense: 'davanti, contro' },
  { latin: 'inter',  greek: 'ἐντός',  root: '*h₁én',    sense: 'tra, dentro' },
];

/* Indici di accesso veloce */
const _LAT_INDEX = Object.create(null);
const _GR_INDEX = Object.create(null);
for (const pair of COGNATE_PAIRS) {
  _LAT_INDEX[pair.latin] = pair;
  _GR_INDEX[pair.greek] = pair;
}

/**
 * Ritorna la coppia cognata per un dato lemma, se presente.
 * @param {string} lemma
 * @param {string} lang  'latino' | 'greco'
 * @returns {{ latin, greek, root, sense } | null}
 */
export function getCognate(lemma, lang) {
  if (!lemma) return null;
  if (lang === 'greco') return _GR_INDEX[lemma] || null;
  return _LAT_INDEX[lemma] || null;
}

/** Lista intera (utile per browse / debugging). */
export function listCognates() {
  return COGNATE_PAIRS.slice();
}

/** Conteggio per usi nell'about/empty state. */
export function countCognates() {
  return COGNATE_PAIRS.length;
}

export const COGNATES_META = {
  name: 'cognates',
  version: '0.1.0',
  description: `${COGNATE_PAIRS.length} coppie LAT↔GR curate (radici PIE)`,
  exports: ['getCognate', 'listCognates', 'countCognates', 'COGNATES_META'],
};
