/**
 * @module dictionary/italian-glosses
 * @description Glosse italiane sintetiche per i lemmi più frequenti, curate
 * manualmente per affiancare le definizioni inglesi del corpus L&S/LSJ9.
 *
 * Copertura: ~100 lemmi latini + ~110 greci dei più ricorrenti nei brani
 * scolastici. Sufficiente per Medie/Biennio. Il triennio resta con la
 * definizione inglese del corpus (più ricca, sebbene meno immediata).
 *
 * Chiavi normalizzate via NFD + strip diacritici + lowercase, così il lookup
 * non dipende da macron latini o spiriti/accenti greci di input.
 */

import { normalizeText } from '../engine/text-utils.js';

/* ────────────────────────────────────────────────────────────────────────
   LATINO · top ~100 lemmi
   ──────────────────────────────────────────────────────────────────────── */
const LATIN_GLOSSES = {
  // verbi ad alta frequenza
  'sum':       'essere · stare · esistere',
  'habeo':     'avere · tenere · possedere',
  'facio':     'fare · compiere · agire',
  'video':     'vedere · osservare',
  'dico':      'dire · parlare · affermare',
  'do':        'dare · concedere',
  'venio':     'venire · giungere · arrivare',
  'duco':      'condurre · guidare · ritenere',
  'capio':     'prendere · catturare · cogliere',
  'fero':      'portare · sopportare · riferire',
  'eo':        'andare · procedere',
  'maneo':     'rimanere · restare · attendere',
  'sto':       'stare in piedi · resistere',
  'volo':      'volere · desiderare',
  'possum':    'potere · essere in grado',
  'debeo':     'dovere · essere in debito',
  'pono':      'porre · collocare · deporre',
  'mitto':     'mandare · inviare · lasciar andare',
  'scribo':    'scrivere · comporre',
  'lego':      'leggere · scegliere · raccogliere',
  'audio':     'ascoltare · sentire · udire',
  'amo':       'amare · prediligere',
  'rego':      'governare · dirigere',
  'iubeo':     'ordinare · comandare',
  'peto':      'chiedere · cercare · dirigersi a',
  'puto':      'pensare · ritenere · valutare',
  'opto':      'desiderare · scegliere',
  'rogo':      'chiedere · domandare · pregare',
  'sequor':    'seguire · inseguire',
  'utor':      'usare · servirsi (+ abl.)',
  'fio':       'diventare · essere fatto',
  'cogo':      'costringere · radunare',
  'gero':      'portare · gestire · compiere (gerere bellum)',
  'vinco':     'vincere · sconfiggere',
  'pugno':     'combattere · lottare',
  'iaceo':     'giacere · essere disteso',
  'iacio':     'gettare · lanciare',
  'colo':      'coltivare · onorare · abitare',
  'paro':      'preparare · procurare',
  'noceo':     'nuocere · danneggiare (+ dat.)',
  'cresco':    'crescere · aumentare',
  'sentio':    'sentire · percepire · pensare',
  'cogito':    'pensare · meditare',
  'narro':     'narrare · raccontare',
  'doceo':     'insegnare · istruire',
  'disco':     'imparare · apprendere',
  'credo':     'credere · affidare (+ dat.)',
  'spero':     'sperare · attendere',
  'timeo':     'temere · aver paura',
  'voco':      'chiamare · invocare',
  'appello':   'chiamare · rivolgersi · approdare',

  // sostantivi
  'puer':      'fanciullo · ragazzo · bambino',
  'puella':    'fanciulla · ragazza',
  'vir':       'uomo · marito · valoroso',
  'femina':    'donna',
  'homo':      'uomo · essere umano',
  'rex':       're · sovrano',
  'regina':    'regina',
  'consul':    'console (magistrato romano)',
  'civis':     'cittadino',
  'populus':   'popolo · gente',
  'res':       'cosa · faccenda · realtà (res publica = stato)',
  'pater':     'padre',
  'mater':     'madre',
  'filius':    'figlio',
  'filia':     'figlia',
  'frater':    'fratello',
  'soror':     'sorella',
  'amicus':    'amico',
  'hostis':    'nemico (pubblico, di guerra)',
  'inimicus':  'nemico (personale)',
  'dominus':   'padrone · signore',
  'servus':    'schiavo · servo',
  'deus':      'dio · divinità',
  'dea':       'dea',
  'templum':   'tempio · spazio sacro',
  'urbs':      'città (la città, Roma)',
  'oppidum':   'città fortificata · borgo',
  'patria':    'patria · terra dei padri',
  'terra':     'terra · territorio',
  'mare':      'mare',
  'flumen':    'fiume · corso d\'acqua',
  'silva':     'bosco · selva',
  'mons':      'monte · montagna',
  'via':       'via · strada',
  'iter':      'cammino · marcia · viaggio',
  'castra':    'accampamento (sostantivo plurale)',
  'arma':      'armi (plur. tantum) · armi difensive',
  'bellum':    'guerra · conflitto',
  'pax':       'pace',
  'victoria':  'vittoria',
  'gloria':    'gloria · fama',
  'fortuna':   'fortuna · sorte · destino',
  'virtus':    'virtù · valore · coraggio',
  'animus':    'animo · cuore · coraggio · mente',
  'anima':     'anima · soffio vitale',
  'corpus':    'corpo',
  'manus':     'mano · gruppo (manus militum)',
  'caput':     'testa · capo · capitale',
  'os':        'bocca / volto (os, oris) · osso (os, ossis)',
  'oculus':    'occhio',
  'cor':       'cuore',
  'domus':     'casa · dimora',
  'tempus':    'tempo · stagione',
  'dies':      'giorno · tempo (femm. quando indica scadenza)',
  'annus':     'anno',
  'nox':       'notte',
  'lux':       'luce · giorno',
  'vita':      'vita',
  'mors':      'morte',
  'amor':      'amore · passione · affetto',
  'ira':       'ira · collera',
  'verbum':    'parola · termine',
  'liber':     'libro · scritto',
  'rosa':      'rosa',
  'aqua':      'acqua',
  'ignis':     'fuoco',
  'aer':       'aria · atmosfera',
  'ventus':    'vento',

  // aggettivi
  'magnus':    'grande · ampio · importante',
  'parvus':    'piccolo · scarso',
  'bonus':     'buono · valido',
  'malus':     'cattivo · malvagio · sfavorevole',
  'pulcher':   'bello · nobile',
  'fortis':    'forte · valoroso · coraggioso',
  'gravis':    'pesante · grave · serio',
  'levis':     'leggero · agile · superficiale',
  'altus':     'alto · profondo · nobile',
  'longus':    'lungo · esteso',
  'brevis':    'breve · corto',
  'novus':     'nuovo · inaudito · recente',
  'vetus':     'vecchio · antico · esperto',
  'sanctus':   'sacro · venerabile · puro',
  'verus':     'vero · reale · genuino',
  'multus':    'molto · numeroso',
  'tantus':    'così grande · così tanto',
  'omnis':     'tutto · ogni',
  'totus':     'tutto intero · completo',
  'solus':     'solo · unico',
  'liber1':    'libero · indipendente',
  'celer':     'veloce · rapido',
  'felix':     'felice · fortunato · fecondo',

  // pronomi e altro
  'ego':       'io',
  'tu':        'tu',
  'is':        'egli · questo · quello (riferito a 3a pers.)',
  'ille':      'quello · quegli (lontano)',
  'iste':      'codesto (vicino a chi ascolta, spesso spregiativo)',
  'hic':       'questo · costui (vicino)',
  'qui':       'il quale · chi · che (pron. relativo)',
  'quis':      'chi? (pron. interrogativo)',
  'aliquis':   'qualcuno · alcuno',
  'idem':      'lo stesso · il medesimo',
  'ipse':      'egli stesso · esso stesso',

  // preposizioni e congiunzioni più frequenti (anche se molte sono nei preset)
  'et':        'e (cong. copulativa)',
  'sed':       'ma (cong. avversativa)',
  'autem':     'invece · però · d\'altronde',
  'enim':      'infatti · giacché',
  'nam':       'infatti',
  'cum':       'quando · poiché / con (prep. abl.)',
  'si':        'se (cong. condizionale)',
  'nisi':      'se non · tranne che',
  'ut':        'come / affinché / quando',
  'ne':        'affinché non · non',
  'quod':      'perché · poiché · che (cong. dichiarativa)',
  'quia':      'poiché · perché (causale)',
};

/* ────────────────────────────────────────────────────────────────────────
   GRECO · top ~110 lemmi (Unicode polytonic preservato)
   ──────────────────────────────────────────────────────────────────────── */
const GREEK_GLOSSES = {
  // verbi
  'εἰμί':       'essere · esistere',
  'ἔχω':        'avere · possedere · stare (avv.)',
  'λέγω':       'dire · parlare',
  'ποιέω':      'fare · comporre · creare',
  'φέρω':       'portare · sopportare · produrre',
  'βαίνω':      'andare · camminare',
  'ἔρχομαι':    'venire · andare',
  'γίγνομαι':   'diventare · nascere · accadere',
  'δίδωμι':     'dare · concedere',
  'τίθημι':     'porre · stabilire',
  'ἵστημι':     'stare in piedi · stabilire',
  'λαμβάνω':    'prendere · ricevere · catturare',
  'ὁράω':       'vedere · osservare',
  'ἀκούω':      'ascoltare · sentire',
  'οἶδα':       'sapere (perfetto a senso pres.)',
  'γιγνώσκω':   'conoscere · capire',
  'φιλέω':      'amare · essere amico',
  'βούλομαι':   'volere · desiderare',
  'ἐθέλω':      'volere · acconsentire',
  'δύναμαι':    'potere · essere capace',
  'δοκέω':      'sembrare · pensare · parere',
  'νομίζω':     'ritenere · stimare · considerare',
  'πιστεύω':    'credere · fidarsi',
  'γράφω':      'scrivere · disegnare',
  'φεύγω':      'fuggire · evitare',
  'μάχομαι':    'combattere · lottare',
  'πέμπω':      'mandare · inviare',
  'ἄγω':        'condurre · guidare',
  'φημί':       'dire · affermare',
  'καλέω':      'chiamare · invocare',
  'παύω':       'far cessare · medio: cessare',
  'παιδεύω':    'educare · istruire',
  'πάσχω':      'soffrire · subire · provare',
  'πράττω':     'fare · compiere · trattare',
  'λύω':        'sciogliere · liberare · annullare',
  'ζητέω':      'cercare · indagare',
  'εὑρίσκω':    'trovare · scoprire',
  'τίκτω':      'generare · partorire',
  'φοβέομαι':   'temere · aver paura',
  'πείθω':      'persuadere · medio: obbedire',

  // sostantivi
  'ἄνθρωπος':   'uomo · essere umano',
  'ἀνήρ':       'uomo · marito · valoroso',
  'γυνή':       'donna · moglie',
  'παῖς':       'bambino · figlio · servo',
  'θεός':       'dio · divinità',
  'θεά':        'dea',
  'βασιλεύς':   're · sovrano',
  'δῆμος':      'popolo · stato · paese',
  'πόλις':      'città · stato',
  'πατήρ':      'padre',
  'μήτηρ':      'madre',
  'ἀδελφός':    'fratello',
  'ἀδελφή':     'sorella',
  'φίλος':      'amico · caro · amato',
  'ἐχθρός':     'nemico · ostile',
  'πολέμιος':   'nemico (di guerra)',
  'δοῦλος':     'schiavo · servo',
  'δεσπότης':   'padrone · signore',
  'λόγος':      'parola · ragione · discorso · racconto',
  'βίος':       'vita · esistenza · sostentamento',
  'ψυχή':       'anima · vita · spirito',
  'σῶμα':       'corpo',
  'καρδία':     'cuore',
  'νοῦς':       'mente · intelletto',
  'γνώμη':      'opinione · giudizio · pensiero',
  'σοφία':      'sapienza · saggezza · abilità',
  'δόξα':       'opinione · gloria · reputazione',
  'ἀρετή':      'virtù · valore · eccellenza',
  'τέχνη':      'arte · tecnica · mestiere',
  'ἐπιστήμη':   'scienza · conoscenza',
  'χρόνος':     'tempo',
  'ἡμέρα':      'giorno',
  'νύξ':        'notte',
  'θάλασσα':    'mare',
  'ποταμός':    'fiume',
  'ὄρος':       'monte · montagna',
  'γῆ':         'terra · paese · territorio',
  'οἶκος':      'casa · famiglia · patrimonio',
  'οἰκία':      'casa · abitazione',
  'πόλεμος':    'guerra · conflitto',
  'εἰρήνη':     'pace',
  'νίκη':       'vittoria',
  'θάνατος':    'morte',
  'φόβος':      'paura · timore',
  'ἔρως':       'amore · passione · desiderio',
  'φιλία':      'amicizia',
  'ἀρχή':       'inizio · principio · potere · comando',
  'τέλος':      'fine · scopo · esito',
  'ὁδός':       'strada · via · viaggio',
  'βίβλος':     'libro · scritto',
  'χείρ':       'mano · braccio',
  'ὀφθαλμός':   'occhio',
  'στρατός':    'esercito',
  'ναῦς':       'nave',
  'ἵππος':      'cavallo',
  'βίος':       'vita',

  // aggettivi
  'ἀγαθός':     'buono · valoroso · nobile',
  'κακός':      'cattivo · malvagio · vile',
  'καλός':      'bello · nobile · onorevole',
  'μέγας':      'grande · importante',
  'μικρός':     'piccolo · breve',
  'πολύς':      'molto · numeroso · grande',
  'ὀλίγος':     'poco · scarso',
  'σοφός':      'sapiente · abile · saggio',
  'δίκαιος':    'giusto · retto',
  'ἀληθής':     'vero · veritiero',
  'ἱερός':      'sacro · santo',
  'φίλιος':     'amichevole · favorevole',
  'νέος':       'nuovo · giovane',
  'παλαιός':    'antico · vecchio',
  'πρῶτος':     'primo · principale',
  'ἔσχατος':    'estremo · ultimo · finale',
  'πᾶς':        'tutto · ogni · intero',
  'ἕτερος':     'altro (di due) · diverso',
  'ἄλλος':      'altro · differente',

  // pronomi e particelle frequenti
  'ἐγώ':        'io',
  'σύ':         'tu',
  'αὐτός':      'egli stesso · esso · medesimo',
  'οὗτος':      'questo · costui (vicino)',
  'ἐκεῖνος':    'quello · quegli (lontano)',
  'ὅδε':        'questo qui · il seguente',
  'ὅς':         'il quale · chi (pron. relativo)',
  'τίς':        'chi? · quale? (interrogativo)',
  'τις':        'qualcuno · uno · qualche',

  // congiunzioni / particelle / preposizioni più studiate
  'καί':        'e · anche · pure',
  'δέ':         'ma · e (particella di contrasto/sequenza)',
  'γάρ':        'infatti · perché',
  'οὖν':        'dunque · quindi',
  'ἀλλά':       'ma · invece',
  'εἰ':         'se (condizionale)',
  'ἐάν':        'se (eventuale, + cong.)',
  'ἵνα':        'affinché · perché (finale, + cong./ott.)',
  'ὅτι':        'che · perché · poiché',
  'ὥστε':       'cosicché · perciò (consecutivo)',
  'οὐ':         'non',
  'μή':         'non (proibitivo, condizionale)',
};

/* ────────────────────────────────────────────────────────────────────────
   PUBLIC API
   ──────────────────────────────────────────────────────────────────────── */

/* Costruisce mappa normalizzata → glossa, per lookup tolerant a diacritici */
function _buildNormalizedIndex(raw) {
  const idx = Object.create(null);
  for (const [k, v] of Object.entries(raw)) {
    /* CLTK disambigua omografi con suffissi numerici (sum1, liber1, …):
     * li accettiamo sia con sia senza il suffisso */
    const cleanK = k.replace(/\d+$/, '');
    idx[normalizeText(cleanK)] = v;
    if (cleanK !== k) idx[normalizeText(k)] = v;
  }
  return idx;
}

const _LATIN_INDEX = _buildNormalizedIndex(LATIN_GLOSSES);
const _GREEK_INDEX = _buildNormalizedIndex(GREEK_GLOSSES);

/**
 * Cerca una glossa italiana sintetica per il lemma.
 * @param {string} lemma · lemma canonico (con o senza diacritici)
 * @param {'latino'|'greco'} lang
 * @returns {string} · glossa italiana o '' se non disponibile
 */
export function getItalianGloss(lemma, lang) {
  if (!lemma) return '';
  const idx = (lang === 'greco') ? _GREEK_INDEX : _LATIN_INDEX;
  const key = normalizeText(lemma);
  return idx[key] || '';
}

/** Conta quante glosse sono disponibili (per la dashboard di status). */
export function countItalianGlosses() {
  return {
    latino: Object.keys(LATIN_GLOSSES).length,
    greco: Object.keys(GREEK_GLOSSES).length,
  };
}

export const ITALIAN_GLOSSES_META = {
  name: 'italian-glosses',
  version: '0.1.0',
  description: 'Glosse italiane sintetiche curate per i top ~200 lemmi LAT+GR',
  exports: ['getItalianGloss', 'countItalianGlosses', 'ITALIAN_GLOSSES_META'],
};
