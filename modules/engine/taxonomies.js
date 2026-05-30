/**
 * @module engine/taxonomies
 * @description Tassonomie morfo-sintattiche del sistema Poetrify.
 *   · FUNZIONI_LOGICHE_GROUPED  — funzioni logiche raggruppate per caso (latino)
 *   · FUNZIONI_LOGICHE_GROUPED_GR — variante greca (niente gruppo ablativo)
 *   · CONGIUNZIONE_TIPO_GROUPED — categorie macro delle congiunzioni (lat+gr)
 *   · PROPOSIZIONI              — ruoli e tipi delle proposizioni periodali
 *   · GUIDED_PHASES / GUIDED_STEPS_META — wizard guidato (4 fasi · 9 tappe)
 *   · GUIDED_GENERI             — generi di versione (racconto/militare/…)
 *   · APPROACH_DESCRIPTORS      — tre approcci traduttivi con pro e contro
 *
 * Modulo SOLO DATI, senza dipendenze. Importabile in qualunque punto della
 * SPA modulare; non causa side-effect.
 */

/* ════════════════════════════════════════════════════════════════════════════
   FUNZIONI LOGICHE · raggruppate per caso (latino)
   ════════════════════════════════════════════════════════════════════════════ */
export const FUNZIONI_LOGICHE_GROUPED = [
  { group: 'Predicato verbale',
    items: ['Predicato verbale'] },
  { group: 'Caso nominativo · soggetto, copulativi e affini',
    items: [
      'Soggetto', 'Predicato nominale', 'Copula', 'Parte nominale',
      'Apposizione', 'Attributo', 'Complemento predicativo del soggetto',
    ] },
  { group: 'Caso accusativo · oggetto e affini',
    items: [
      'Complemento oggetto', "Complemento predicativo dell'oggetto",
      'Complemento di luogo (moto a)', 'Complemento di tempo continuato',
      'Complemento di età',
    ] },
  { group: 'Caso genitivo · specificazione, partitivo e affini',
    items: [
      'Complemento di specificazione', 'Genitivo soggettivo', 'Genitivo oggettivo',
      'Complemento partitivo', 'Complemento di qualità', 'Complemento di abbondanza',
      'Complemento di privazione', 'Complemento di colpa', 'Complemento di pena',
      'Complemento di stima', 'Complemento di prezzo', 'Complemento di paragone',
      'Complemento di argomento',
    ] },
  { group: 'Caso dativo · termine, vantaggio, fine',
    items: [
      'Complemento di termine', 'Complemento di vantaggio', 'Complemento di svantaggio',
      'Dativo etico', 'Dativo di possesso', 'Complemento di fine o scopo',
    ] },
  { group: 'Caso ablativo · mezzo, modo, luogo, tempo, agente',
    items: [
      'Complemento di agente', 'Complemento di causa efficiente',
      'Complemento di mezzo o strumento', 'Complemento di modo',
      'Complemento di compagnia', 'Complemento di unione',
      'Complemento di causa', 'Complemento di luogo (stato in)',
      'Complemento di luogo (moto da)', 'Complemento di luogo (moto per)',
      'Complemento di tempo determinato', 'Complemento di materia',
      'Complemento di origine', 'Complemento di allontanamento o separazione',
      'Complemento di limitazione',
    ] },
  { group: 'Caso vocativo',
    items: ['Complemento di vocazione'] },
  { group: 'Misti / con preposizione / multi-caso',
    items: [
      'Complemento concessivo', 'Complemento di esclusione',
      'Complemento di denominazione',
      'Altro / da specificare',
    ] },
];

/* ════════════════════════════════════════════════════════════════════════════
   FUNZIONI LOGICHE · variante GRECA (niente gruppo ablativo).
   Le funzioni che il latino marca in ablativo sono redistribuite ai casi greci
   secondo l'uso reale del greco.
   ════════════════════════════════════════════════════════════════════════════ */
export const FUNZIONI_LOGICHE_GROUPED_GR = [
  { group: 'Predicato verbale',
    items: ['Predicato verbale'] },
  { group: 'Caso nominativo · soggetto, copulativi e affini',
    items: [
      'Soggetto', 'Predicato nominale', 'Copula', 'Parte nominale',
      'Apposizione', 'Attributo', 'Complemento predicativo del soggetto',
    ] },
  { group: 'Caso accusativo · oggetto, moto a, tempo continuato, limitazione',
    items: [
      'Complemento oggetto', "Complemento predicativo dell'oggetto",
      'Complemento di luogo (moto a)', 'Complemento di tempo continuato',
      'Complemento di età', 'Complemento di limitazione',
      'Complemento di estensione', 'Complemento di argomento',
    ] },
  { group: 'Caso genitivo · specificazione, partitivo, agente, moto da, paragone',
    items: [
      'Complemento di specificazione', 'Genitivo soggettivo', 'Genitivo oggettivo',
      'Complemento partitivo', 'Complemento di qualità', 'Complemento di abbondanza',
      'Complemento di privazione', 'Complemento di colpa', 'Complemento di pena',
      'Complemento di stima', 'Complemento di prezzo', 'Complemento di paragone',
      'Complemento di agente',
      'Complemento di origine', 'Complemento di allontanamento o separazione',
      'Complemento di luogo (moto da)', 'Complemento di materia',
    ] },
  { group: 'Caso dativo · termine, mezzo, modo, compagnia, tempo, agente (passivo)',
    items: [
      'Complemento di termine', 'Complemento di vantaggio', 'Complemento di svantaggio',
      'Dativo etico', 'Dativo di possesso', 'Complemento di fine o scopo',
      'Complemento di mezzo o strumento', 'Complemento di modo',
      'Complemento di compagnia', 'Complemento di unione',
      'Complemento di causa efficiente', 'Complemento di tempo determinato',
      'Complemento di luogo (stato in)',
    ] },
  { group: 'Caso vocativo',
    items: ['Complemento di vocazione'] },
  { group: 'Misti / con preposizione / multi-caso',
    items: [
      'Complemento di causa', 'Complemento di luogo (moto per)',
      'Complemento concessivo', 'Complemento di esclusione',
      'Complemento di denominazione',
      'Altro / da specificare',
    ] },
];

/** Restituisce il gruppo corretto in base alla lingua. */
export function funzioniLogicheGroupedFor(lang) {
  return (lang === 'greco') ? FUNZIONI_LOGICHE_GROUPED_GR : FUNZIONI_LOGICHE_GROUPED;
}

/** Lista piatta di TUTTE le funzioni logiche (lat ∪ gr) per validazione/batch. */
export const FUNZIONI_LOGICHE = (() => {
  const seen = new Set();
  const all = [];
  [FUNZIONI_LOGICHE_GROUPED, FUNZIONI_LOGICHE_GROUPED_GR].forEach(grp => {
    grp.forEach(g => g.items.forEach(it => {
      if (!seen.has(it)) { seen.add(it); all.push(it); }
    }));
  });
  return all;
})();

/* ════════════════════════════════════════════════════════════════════════════
   CONGIUNZIONI · macro-categorie raggruppate
   ════════════════════════════════════════════════════════════════════════════ */
export const CONGIUNZIONE_TIPO_GROUPED = {
  latino: [
    { group: 'Copulative',   items: ['Coordinante copulativa'] },
    { group: 'Coordinanti',  items: ['Coordinante disgiuntiva', 'Coordinante avversativa', 'Coordinante dichiarativa', 'Coordinante conclusiva', 'Coordinante correlativa'] },
    { group: 'Subordinanti', items: ['Subordinante causale', 'Subordinante finale', 'Subordinante consecutiva', 'Subordinante temporale', 'Subordinante condizionale', 'Subordinante concessiva', 'Subordinante comparativa', 'Subordinante completiva'] },
  ],
  greco: [
    { group: 'Copulative',   items: ['Coordinante (καί, τε)'] },
    { group: 'Coordinanti',  items: ['Coordinante avversativa (ἀλλά, δέ)', 'Coordinante dichiarativa (γάρ)', 'Coordinante conclusiva (οὖν, ἄρα)'] },
    { group: 'Subordinanti', items: ['Subordinante causale (ὅτι, ἐπεί)', 'Subordinante finale (ἵνα, ὅπως)', 'Subordinante consecutiva (ὥστε)', 'Subordinante temporale (ὅτε, ἐπεί)', 'Subordinante condizionale (εἰ, ἐάν)', 'Subordinante concessiva (καίπερ)', 'Subordinante completiva (ὅτι, ὡς)'] },
    { group: 'Particelle',   items: ['Particella enfatica (μέν, δή)', 'Particella interrogativa (ἆρα, μῶν)'] },
  ],
};

/* ════════════════════════════════════════════════════════════════════════════
   PROPOSIZIONI · ruolo, tipo, modo, grado
   ════════════════════════════════════════════════════════════════════════════ */
export const PROPOSIZIONI = {
  ruolo: ['Principale', 'Coordinata', 'Subordinata'],
  principale: ['Enunciativa', 'Volitiva', 'Desiderativa', 'Dubitativa', 'Interrogativa diretta', 'Esclamativa', 'Ottativa', 'Imperativa'],
  coordinata: ['Copulativa', 'Disgiuntiva', 'Avversativa', 'Dichiarativa', 'Conclusiva', 'Correlativa'],
  subordinata: [
    'Oggettiva', 'Soggettiva', 'Dichiarativa', 'Interrogativa indiretta',
    'Relativa propria', 'Relativa impropria (causale)', 'Relativa impropria (finale)', 'Relativa impropria (consecutiva)', 'Relativa impropria (concessiva)', 'Relativa impropria (condizionale)',
    'Causale', 'Finale', 'Consecutiva', 'Temporale', 'Condizionale (protasi)', 'Concessiva', 'Comparativa', 'Modale', 'Strumentale',
    'Infinitiva oggettiva (latino)', 'Infinitiva soggettiva (latino)', 'Ablativo assoluto (latino)', 'Perifrastica attiva (latino)', 'Perifrastica passiva (latino)',
    'Genitivo assoluto (greco)', 'Accusativo assoluto (greco)', 'Participiale congiunta (greco)', 'Participiale sostantivata (greco)', 'Participiale predicativa (greco)',
    'Completive con quin/quominus (latino)', 'Comparativo-ipotetica',
    'Altro / da specificare',
  ],
  modo: ['Indicativo', 'Congiuntivo', 'Ottativo', 'Infinito', 'Participio', 'Gerundio', 'Gerundivo', 'Supino'],
  grado: ['Di primo grado', 'Di secondo grado', 'Di terzo grado', 'Di quarto grado e oltre'],
};

/* ════════════════════════════════════════════════════════════════════════════
   MODALITÀ GUIDATA · 4 macro-fasi
   ════════════════════════════════════════════════════════════════════════════ */
export const GUIDED_PHASES = {
  lettura:    { letter: 'A', label: 'Lettura',    color: '#1800AC', tag: 'leggere prima di tradurre' },
  analisi:    { letter: 'B', label: 'Analisi',    color: '#2F855A', tag: '«pasticcia» il testo' },
  traduzione: { letter: 'C', label: 'Traduzione', color: '#D69E2E', tag: 'apri il dizionario' },
  versione:   { letter: 'D', label: 'Versione',   color: '#9C6B3C', tag: "dall'italiano all'italiano" },
};

export const GUIDED_STEPS_META = [
  /* FASE A · LETTURA */
  { num: 1, phase: 'lettura', label: 'Pre-lettura',
    title: "Lettura preparatoria · titolo, autore, genere, vista d'alto",
    instructions: 'Prima di mettere mano al testo: <strong>leggi il titolo e il sottotitolo</strong> per inquadrare l\'argomento, <strong>identifica l\'autore e l\'opera</strong> se conosciuti, <strong>riconosci il genere</strong> della versione, infine <strong>leggi tutta la versione almeno una volta</strong>.' },
  /* FASE B · ANALISI */
  { num: 2, phase: 'analisi', label: 'Frasi',
    title: 'Segmentazione · scomporre il periodo in frasi',
    instructions: 'La punteggiatura forte (. ! ? ; :) separa enunciati con senso compiuto. Verifica e modifica la segmentazione automatica con due sbarre <code>//</code>.' },
  { num: 3, phase: 'analisi', label: 'Verbi',
    title: 'Isolamento delle forme verbali',
    instructions: 'Clicca le parole che riconosci come <strong>forme verbali</strong>: ogni verbo è il centro di un sintagma (proposizione).' },
  { num: 4, phase: 'analisi', label: 'Connettivi',
    title: 'Congiunzioni e preposizioni · coordinanti e subordinanti',
    instructions: 'Segna <strong>tutti i collegamenti</strong> tra proposizioni: congiunzioni, preposizioni, pronomi relativi, particelle, asindeti.' },
  { num: 5, phase: 'analisi', label: 'Sintassi',
    title: 'Sintassi periodale · proposizioni principali, coordinate, subordinate',
    instructions: 'Identifica le <strong>proposizioni</strong> e classificale con sigle A₁ A₂ B₁ B₂…' },
  { num: 6, phase: 'analisi', label: 'Sintagmi',
    title: 'Frase minima e complementi · soggetto → oggetto → casi obliqui',
    instructions: 'Per ogni proposizione costruisci la frase minima isolando i sintagmi nell\'ordine: 1) soggetto e gruppo del nominativo; 2) compl. oggetto e gruppo dell\'accusativo; 3) compl. di movimento; 4) altri complementi nei casi obliqui.' },
  { num: 7, phase: 'analisi', label: 'Grammatica',
    title: 'Analisi grammaticale completa parola per parola',
    instructions: 'Completa la <strong>morfologia parola per parola</strong>.' },
  /* FASE C · TRADUZIONE */
  { num: 8, phase: 'traduzione', label: 'Brutta',
    title: 'Traduzione · brutta copia con il dizionario',
    instructions: 'Apri il dizionario e cerca le parole necessarie. Scegli la traduzione contestualmente coerente. Scrivi la resa di lavoro frase per frase.' },
  /* FASE D · VERSIONE */
  { num: 9, phase: 'versione', label: 'Bella copia',
    title: "Versione finale · «dall'italiano all'italiano»",
    instructions: 'Rileggi la brutta copia <strong>senza più guardare il testo originale</strong>. Lavora ora solo dentro la grammatica italiana.' },
];

/* ════════════════════════════════════════════════════════════════════════════
   GENERI DELLE VERSIONI · sei categorie didattiche
   ════════════════════════════════════════════════════════════════════════════ */
export const GUIDED_GENERI = [
  { key: 'racconto',  label: 'Versione "racconto"',
    desc: 'Taglio narrativo-descrittivo. Miti, favole antiche, biografie, descrizioni geografiche.' },
  { key: 'militare',  label: 'Versione "militare"',
    desc: 'Campagne militari, battaglie. Puntuale nell\'analisi logica, ricca di lessico tecnico.' },
  { key: 'filosofica', label: 'Versione "filosofica"',
    desc: 'Concetti astratti. Stile complesso, filo logico denso, termini astratti da scegliere con cura.' },
  { key: 'lettera',   label: 'Versione "lettera"',
    desc: 'Epistolari di autori famosi. Stile colloquiale, abbondante presenza della 2ª persona singolare.' },
  { key: 'discorso',  label: 'Versione "discorso politico"',
    desc: 'Discorsi politici. Stile elegante, teso, ricco di artifici retorici.' },
  { key: 'storica',   label: 'Versione "storica"',
    desc: 'Opere sulla storia romana scritte dagli autori originali.' },
];

/* ════════════════════════════════════════════════════════════════════════════
   APPROCCIO TRADUTTIVO · tre opzioni con pro e contro
   ════════════════════════════════════════════════════════════════════════════ */
export const APPROACH_DESCRIPTORS = {
  integrale: {
    icon: '🌐',
    title: 'Analisi integrale',
    tagline: "Tutta la versione mostrata insieme. Privilegi la visione d'insieme: batch e analisi operano sull'intero brano contemporaneamente.",
    pros: [
      "Vista panoramica della versione · cogli i parallelismi",
      'Batch grammaticale efficace su forme ricorrenti',
      'Ideale per brani brevi o di forte coesione retorica',
      'Permette di marcare tutte le congiunzioni / verbi in un colpo solo',
    ],
    cons: [
      'Su versioni lunghe la pagina diventa densa',
      'Più difficile concentrarsi sulla singola frase',
      "L'editor dei sintagmi logici può perdere contesto",
    ],
  },
  attuale: {
    icon: '🎯',
    title: 'Metodo attuale (per frase)',
    tagline: 'Una frase per volta via tab, ma con libertà di saltare avanti e indietro.',
    pros: [
      'Bilancio fra focus e libertà di movimento',
      'Tutte le rivoluzioni recenti sono ottimizzate per questo flusso',
      'Sub-tab grammatica/logica/periodale facilmente accessibili',
      'Persistenza stato per ogni frase',
    ],
    cons: [
      'Richiede disciplina personale per concludere ogni frase',
      'È facile lasciare frasi a metà passando alla successiva',
    ],
  },
  'frase-per-frase': {
    icon: '📍',
    title: 'Frase per frase (wizard)',
    tagline: 'Procedura sequenziale guidata: per ogni frase percorri in ordine grammar → logica → sintassi → traduzione, poi passi alla successiva.',
    pros: [
      'Massimo focus: una frase alla volta, ogni step concluso',
      'Esperienza didattica ordinata, anti-dispersione',
      'Ideale per studenti del biennio e per studio metodico',
      "La traduzione finale d'insieme è una vista riepilogativa pulita",
    ],
    cons: [
      'Meno libertà di salto in caso di intuizioni a posteriori',
      "Su brani lunghi può sembrare lento all'utente esperto",
      "Difficile correggere all'indietro senza interrompere il flusso",
    ],
  },
};
