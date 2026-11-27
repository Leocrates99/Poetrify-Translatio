/* ============================================================================
   TASSONOMIE · le funzioni logiche e i tipi di proposizione
   ----------------------------------------------------------------------------
   Le liste fra cui lo studente sceglie quando segna un sintagma o una
   proposizione. Sono copiate, alla lettera, dalle tassonomie del motore di
   Poetrify (modules/engine/taxonomies.js, novembre 2026): Translatio e'
   isolato e non importa nulla dal resto del progetto. Se una lista cambia
   la', va riportata qui a mano (e viceversa).
   ============================================================================ */

export const FUNZIONI_LATINO = [
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

export const FUNZIONI_GRECO = [
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
};
