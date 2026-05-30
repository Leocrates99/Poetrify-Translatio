/**
 * @module dictionary/frequency
 * @description Indicatore di frequenza relativa (1–5 ●) per i lemmi più
 * comuni del latino e del greco antico. Curatela manuale basata sulle liste
 * di frequenza standard (Diederich 1939 per il latino; Mahoney 2010 e
 * Major 2008 per il greco).
 *
 * Scala:
 *   5 ● ● ● ● ●  · top 100 lemmi · "ricorrenti in ogni pagina"
 *   4 ● ● ● ●    · top 500       · "frequentissimi"
 *   3 ● ● ●      · top 1500      · "frequenti"
 *   2 ● ●        · top 5000      · "comuni"
 *   1 ●          · resto del corpus    (default per qualunque lemma noto)
 *
 * Per i lemmi non presenti nelle liste curate, viene usato 1 (presenza
 * minima nel corpus). Per i lemmi non riconosciuti dall'engine, viene
 * usato 0 (nessun indicatore).
 *
 * API:
 *   getFrequency(lemma, lang) → 0..5
 *   renderStars(score)        → '● ● ● ○ ○' (per HTML inline)
 */

/* ─── LATINO: 200 lemmi top, curatela basata su Diederich + LASLA ────── */
const LATIN_FREQ_5 = new Set([
  'sum','et','in','non','est','qui','quod','ad','ut','cum','si','de','ex',
  'is','hic','ille','suus','meus','tuus','noster','vester','ipse','idem',
  'a','ab','per','sed','etiam','nec','quoque','autem','enim','quidem','tamen',
  'magnus','bonus','omnis','multus','alius','alter','primus','novus','solus',
  'possum','habeo','facio','do','dico','video','fero','eo','venio','duco',
  'res','vir','homo','dies','annus','tempus','locus','urbs','populus','rex',
  'pater','mater','filius','frater','soror','deus','dominus','servus',
  'aqua','terra','mare','mons','silva','sol','luna','ignis','ventus',
  'pars','manus','genus','nomen','verbum','mens','animus','corpus','vita','mors',
  'amor','bellum','pax','lex','ius','virtus','fides','spes','fortuna',
]);
const LATIN_FREQ_4 = new Set([
  'do','quaero','accipio','peto','rogo','iubeo','volo','nolo','malo','debeo',
  'amo','timeo','spero','metuo','credo','intellego','sentio','puto','existimo',
  'puer','puella','femina','filia','uxor','maritus','rusticus','miles','dux',
  'amicus','hostis','consul','senatus','imperator','victor','hostis','liber',
  'parvus','minor','maior','minimus','maximus','optimus','pessimus',
  'liber','pulcher','miser','pauper','dives','sanus','aeger','clarus',
  'longus','brevis','altus','latus','gravis','levis','dulcis','acer',
  'tres','quattuor','quinque','sex','septem','octo','novem','decem',
  'unus','duo','centum','mille','medius','primus','ultimus','tertius',
  'campus','flumen','arbor','flos','folium','fructus','semen','panis',
  'caelum','stella','nox','dies','aurora','vesper','mensis','annus',
  'dominus','rex','tyrannus','consul','senatus','imperium','provincia',
  'equus','canis','ovis','bos','aves','piscis','lupus','leo','aquila',
  'porto','servo','perdo','dono','reddo','mitto','accipio','capio','iaceo',
  'curro','ambulo','salio','volo','natō','nato','tango','gusto','olfacio',
  'sequor','laudo','culpo','specto','spectō','noceō','prosum','interest',
]);
const LATIN_FREQ_3 = new Set([
  'taurus','agnus','vitulus','asinus','mulus','cervus','vulpes','urcus',
  'olea','vinum','farra','triticum','hordeum','panis','caseus','butyrum',
  'arma','gladius','hasta','sagitta','scutum','galea','lorica','arcus',
  'puer','iuvenis','senex','virgo','matrona','vidua','famulus','servus',
  'litterae','epistula','codex','liber','tabula','pictura','musica','cantus',
  'doceo','disco','studeo','exerceo','expono','explico','demonstro','probo',
  'ago','rego','impero','iudico','damno','absolvo','accuso','defendo',
  'gaudeo','rideo','fleo','clamo','tacui','silens','susurro','plango',
  'audax','timidus','fortis','ignavus','prudens','stultus','sapiens','fidelis',
]);
const LATIN_FREQ_2 = new Set([
  'asinus','catulus','pullus','ovum','nidus','cunabulum','cuna','cubile',
  'sutor','faber','agricola','sutor','pistor','medicus','iurisconsultus','rhetor',
  'monumentum','sepulcrum','tumulus','statua','imago','signum','tropaeum',
  'philosophia','rhetorica','grammatica','dialectica','arithmetica','geometria','astronomia','musica',
]);

/* ─── GRECO: 200 lemmi top, basato su Mahoney 2010 + LSJ frequency ───── */
const GREEK_FREQ_5 = new Set([
  'εἰμί','καί','δέ','γάρ','τε','μέν','οὖν','ἀλλά','γε','δή','μή','οὐ','οὐκ','οὐχ',
  'ὁ','ἡ','τό','οὗτος','αὐτός','ἐγώ','σύ','ἡμεῖς','ὑμεῖς','τίς','τι','ὅς','ὅστις',
  'εἰς','ἐν','ἐκ','πρός','ἐπί','κατά','παρά','σύν','περί','ὑπό','ὑπέρ','διά','ἀπό',
  'μετά','πρό','ἀντί','ἄνευ','ἕνεκα','ὡς','ὥσπερ','εἰ','ὅτι','ἵνα','ὅπως','πρίν',
  'λέγω','ἔχω','γίγνομαι','γίνομαι','ἔρχομαι','βαίνω','φέρω','ἄγω','ποιέω','πέμπω',
  'ὁράω','βλέπω','ἀκούω','γιγνώσκω','οἶδα','δοκέω','νομίζω','βούλομαι','θέλω',
  'ἄνθρωπος','ἀνήρ','γυνή','παῖς','πατήρ','μήτηρ','υἱός','θεός','πόλις','βασιλεύς',
  'λόγος','ἔργον','ἡμέρα','χρόνος','τόπος','νοῦς','ψυχή','σῶμα','βίος','θάνατος',
  'μέγας','πολύς','ἀγαθός','κακός','καλός','αἰσχρός','δίκαιος','ἄδικος','σοφός',
  'πᾶς','ἕκαστος','ἄλλος','ἕτερος','αὐτός','τοιοῦτος','τοσοῦτος','ποῖος','πόσος',
]);
const GREEK_FREQ_4 = new Set([
  'φιλέω','μισέω','πιστεύω','ἐλπίζω','φοβέομαι','θαυμάζω','αἰσθάνομαι','μανθάνω',
  'διδάσκω','πείθω','κελεύω','ἐθέλω','δύναμαι','δίδωμι','λαμβάνω','τίθημι',
  'ἵστημι','ἵημι','δείκνυμι','ἀπόλλυμι','ἀνοίγνυμι','ζεύγνυμι','ῥήγνυμι',
  'οἶκος','δόμος','ἀγρός','κῆπος','ναῦς','ἁρμα','δρόμος','τράπεζα','κλίνη',
  'ἵππος','κύων','λύκος','λέων','ταῦρος','βοῦς','ὄϊς','ὗς','ἔλαφος','πρόβατον',
  'οἶνος','σῖτος','ἄρτος','γάλα','κρέας','ἰχθύς','μέλι','ὕδωρ','γλεῦκος','γῆρας',
  'φῶς','σκότος','ἥλιος','σελήνη','ἀστήρ','νύξ','ἑσπέρα','ἕως','ἔαρ','θέρος','χειμών',
  'γῆ','ὕδωρ','πῦρ','ἀήρ','αἰθήρ','πέλαγος','θάλασσα','ποταμός','ὄρος','πεδίον',
  'πρῶτος','ἔσχατος','νέος','παλαιός','γέρων','ἰσχυρός','ἀσθενής','ταχύς','βραδύς',
  'πλούσιος','πένης','ἐλεύθερος','δοῦλος','ξένος','πολίτης','συγγενής','ἀδελφός',
  'εἷς','δύο','τρεῖς','τέσσαρες','πέντε','δέκα','ἑκατόν','χίλιοι','μύριοι',
]);
const GREEK_FREQ_3 = new Set([
  'φιλόσοφος','ῥήτωρ','ποιητής','γραμματικός','τραγῳδός','κωμῳδός','χορός','αὐλός',
  'στρατός','στρατιώτης','ἱππεύς','ναύτης','κυβερνήτης','λοχαγός','ταξίαρχος',
  'βωμός','ναός','ἄγαλμα','ἱερόν','ἱερεύς','θυσία','ἑορτή','ἀγών','γυμνάσιον',
  'ἐκκλησία','βουλή','δικαστήριον','ψῆφος','νόμος','δίκη','κρίσις','τιμή','δόξα',
  'χιτών','ἱμάτιον','σανδάλιον','κράνος','θώραξ','ξίφος','δόρυ','ἀσπίς','τόξον',
]);
const GREEK_FREQ_2 = new Set([
  'σχολή','βιβλίον','σχῆμα','γράμμα','ἀριθμός','λογισμός','μέτρον','σταθμός',
  'μῦθος','παροιμία','αἴνιγμα','ὕμνος','ᾠδή','ἐλεγεῖον','ἴαμβος','δίστιχον',
]);

/* Indici di lookup veloci */
function _buildIndex(sets) {
  const out = Object.create(null);
  sets.forEach(([set, score]) => {
    for (const lem of set) {
      /* prima occorrenza vince (rispecchia rank superiore) */
      if (!(lem in out)) out[lem] = score;
    }
  });
  return out;
}
const _LAT_INDEX = _buildIndex([
  [LATIN_FREQ_5, 5], [LATIN_FREQ_4, 4], [LATIN_FREQ_3, 3], [LATIN_FREQ_2, 2],
]);
const _GR_INDEX = _buildIndex([
  [GREEK_FREQ_5, 5], [GREEK_FREQ_4, 4], [GREEK_FREQ_3, 3], [GREEK_FREQ_2, 2],
]);

/**
 * Score 0..5 per il lemma. 0 = sconosciuto, 1 = lemma noto ma non curato.
 */
export function getFrequency(lemma, lang) {
  if (!lemma) return 0;
  const idx = (lang === 'greco') ? _GR_INDEX : _LAT_INDEX;
  return idx[lemma] || 1;
}

/**
 * Render Unicode pallini per lo score (1-5).
 * 5: ●●●●●  ·  3: ●●●○○  ·  0: (vuoto)
 */
export function renderStars(score) {
  const s = Math.max(0, Math.min(5, Math.round(score || 0)));
  if (s === 0) return '';
  return '●'.repeat(s) + '○'.repeat(5 - s);
}

/** Etichetta sintetica dello score. */
export function describeFrequency(score) {
  switch (Math.round(score || 0)) {
    case 5: return 'ricorrente · top 100';
    case 4: return 'frequentissimo · top 500';
    case 3: return 'frequente · top 1500';
    case 2: return 'comune · top 5000';
    case 1: return 'attestato · oltre top 5000';
    default: return '';
  }
}

export const FREQUENCY_META = {
  name: 'frequency',
  version: '0.1.0',
  description: 'Indicatore frequenza 1-5 ● per i ~400 lemmi top curati',
  exports: ['getFrequency', 'renderStars', 'describeFrequency', 'FREQUENCY_META'],
};
