/**
 * @module engine/conjunctions
 * @description Preset delle congiunzioni per il latino e il greco antico.
 *   · CONJ_PRESETS               — dizionario lemma → tipologia + hint cross-layer
 *   · lookupConjunctionPreset()  — lookup case-insensitive (normalizza per il greco)
 *   · applyConjunctionPreset()   — applica il preset a una grammar entry,
 *                                  popolando partOfSpeech, congiunzioneTipo,
 *                                  _propTipoHint (tipo proposizionale) e
 *                                  _moodHint (modo verbale richiesto)
 *
 * Le voci greche derivano dalla Tabella delle Congiunzioni Greche del corpus
 * didattico (55 voci: 22 coordinanti + 23 subordinanti + 10 particelle).
 * Le chiavi greche sono NFD-normalizzate (lowercase, senza diacritici).
 */

import { normalizeText } from './text-utils.js';

export const CONJ_PRESETS = {
  latino: {
    /* ── COORDINANTI COPULATIVE ─────────────────────────────────────── */
    'et':     { tipo: 'Coordinante copulativa', pos: 'Congiunzione' },
    'atque':  { tipo: 'Coordinante copulativa', pos: 'Congiunzione' },
    'ac':     { tipo: 'Coordinante copulativa', pos: 'Congiunzione' },
    'que':    { tipo: 'Coordinante copulativa', pos: 'Congiunzione', note: 'enclitica (-que)' },
    '-que':   { tipo: 'Coordinante copulativa', pos: 'Congiunzione', note: 'enclitica' },
    'neque':  { tipo: 'Coordinante copulativa', pos: 'Congiunzione', note: 'negativa (= e non)' },
    'nec':    { tipo: 'Coordinante copulativa', pos: 'Congiunzione', note: 'negativa (= e non)' },
    'etiam':  { tipo: 'Coordinante copulativa', pos: 'Avverbio', note: 'avv.: anche, perfino' },
    'quoque': { tipo: 'Coordinante copulativa', pos: 'Avverbio', note: 'avv. postpos.: anche' },
    /* ── COORDINANTI DISGIUNTIVE ─────────────────────────────────────── */
    'aut':  { tipo: 'Coordinante disgiuntiva', pos: 'Congiunzione' },
    'vel':  { tipo: 'Coordinante disgiuntiva', pos: 'Congiunzione' },
    'sive': { tipo: 'Coordinante disgiuntiva', pos: 'Congiunzione' },
    'seu':  { tipo: 'Coordinante disgiuntiva', pos: 'Congiunzione' },
    've':   { tipo: 'Coordinante disgiuntiva', pos: 'Congiunzione', note: 'enclitica (-ve)' },
    '-ve':  { tipo: 'Coordinante disgiuntiva', pos: 'Congiunzione', note: 'enclitica' },
    /* ── COORDINANTI AVVERSATIVE ─────────────────────────────────────── */
    'sed':     { tipo: 'Coordinante avversativa', pos: 'Congiunzione' },
    'at':      { tipo: 'Coordinante avversativa', pos: 'Congiunzione' },
    'autem':   { tipo: 'Coordinante avversativa', pos: 'Congiunzione', note: 'postpositiva' },
    'verum':   { tipo: 'Coordinante avversativa', pos: 'Congiunzione' },
    'vero':    { tipo: 'Coordinante avversativa', pos: 'Congiunzione', note: 'postpositiva' },
    'tamen':   { tipo: 'Coordinante avversativa', pos: 'Congiunzione', note: 'tuttavia' },
    'ceterum': { tipo: 'Coordinante avversativa', pos: 'Congiunzione', note: 'del resto' },
    /* ── COORDINANTI DICHIARATIVE / ESPLICATIVE ──────────────────────── */
    'nam':    { tipo: 'Coordinante dichiarativa', pos: 'Congiunzione' },
    'enim':   { tipo: 'Coordinante dichiarativa', pos: 'Congiunzione', note: 'postpositiva' },
    'namque': { tipo: 'Coordinante dichiarativa', pos: 'Congiunzione' },
    'etenim': { tipo: 'Coordinante dichiarativa', pos: 'Congiunzione' },
    'quippe': { tipo: 'Coordinante dichiarativa', pos: 'Congiunzione' },
    /* ── COORDINANTI CONCLUSIVE ──────────────────────────────────────── */
    'ergo':    { tipo: 'Coordinante conclusiva', pos: 'Congiunzione' },
    'igitur':  { tipo: 'Coordinante conclusiva', pos: 'Congiunzione', note: 'postpositiva' },
    'itaque':  { tipo: 'Coordinante conclusiva', pos: 'Congiunzione' },
    'proinde': { tipo: 'Coordinante conclusiva', pos: 'Congiunzione' },
    /* ── SUBORDINANTI CAUSALI ────────────────────────────────────────── */
    'quia':         { tipo: 'Subordinante causale', pos: 'Congiunzione' },
    'quoniam':      { tipo: 'Subordinante causale', pos: 'Congiunzione' },
    'quandoquidem': { tipo: 'Subordinante causale', pos: 'Congiunzione' },
    'quod':         { tipo: 'Subordinante causale', pos: 'Congiunzione', note: 'anche dichiarativa "il fatto che"' },
    /* ── SUBORDINANTI FINALI ─────────────────────────────────────────── */
    'ut':       { tipo: 'Subordinante finale', pos: 'Congiunzione', note: 'anche consec./completiva' },
    'ne':       { tipo: 'Subordinante finale', pos: 'Congiunzione', note: 'finale negativa' },
    'quominus': { tipo: 'Subordinante finale', pos: 'Congiunzione', note: 'dopo verba impediendi' },
    'quin':     { tipo: 'Subordinante finale', pos: 'Congiunzione', note: 'dopo neg. impediendi/dubitandi' },
    /* ── SUBORDINANTI TEMPORALI ──────────────────────────────────────── */
    'cum':         { tipo: 'Subordinante temporale', pos: 'Congiunzione', note: 'cum + cong.: anche causale/concessivo' },
    'postquam':    { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'antequam':    { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'priusquam':   { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'dum':         { tipo: 'Subordinante temporale', pos: 'Congiunzione', note: 'anche causale o finale' },
    'donec':       { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'quoad':       { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'simulac':     { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'simulatque':  { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'simul':       { tipo: 'Subordinante temporale', pos: 'Congiunzione' },
    'ubi':         { tipo: 'Subordinante temporale', pos: 'Congiunzione', note: 'anche locale (ubi = "dove")' },
    /* ── SUBORDINANTI CONDIZIONALI ───────────────────────────────────── */
    'si':   { tipo: 'Subordinante condizionale', pos: 'Congiunzione' },
    'nisi': { tipo: 'Subordinante condizionale', pos: 'Congiunzione', note: 'negativa (se non)' },
    'sin':  { tipo: 'Subordinante condizionale', pos: 'Congiunzione', note: 'avversativa nel cond.' },
    /* ── SUBORDINANTI CONCESSIVE ─────────────────────────────────────── */
    'etsi':     { tipo: 'Subordinante concessiva', pos: 'Congiunzione' },
    'tametsi':  { tipo: 'Subordinante concessiva', pos: 'Congiunzione' },
    'etiamsi':  { tipo: 'Subordinante concessiva', pos: 'Congiunzione' },
    'quamquam': { tipo: 'Subordinante concessiva', pos: 'Congiunzione' },
    'quamvis':  { tipo: 'Subordinante concessiva', pos: 'Congiunzione' },
    'licet':    { tipo: 'Subordinante concessiva', pos: 'Congiunzione' },
    /* ── SUBORDINANTI COMPARATIVE ────────────────────────────────────── */
    'quasi':   { tipo: 'Subordinante comparativa', pos: 'Congiunzione' },
    'velut':   { tipo: 'Subordinante comparativa', pos: 'Congiunzione' },
    'tamquam': { tipo: 'Subordinante comparativa', pos: 'Congiunzione' },
    'sicut':   { tipo: 'Subordinante comparativa', pos: 'Congiunzione' },
    /* ── INTERROGATIVE ───────────────────────────────────────────────── */
    'an':    { tipo: 'Subordinante completiva', pos: 'Congiunzione', note: 'interrog. doppia' },
    'utrum': { tipo: 'Subordinante completiva', pos: 'Congiunzione', note: 'interrog. doppia' },
  },
  greco: {
    /* COORDINANTI · TABELLA I */
    'αλλα':    { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'ma, però, tuttavia (avversativa forte)', mood: ['Indicativo'], propTipo: ['Avversativa'] },
    'αρα':     { tipo: 'Coordinante conclusiva (οὖν, ἄρα)',    pos: 'Particella',   note: 'dunque, pertanto (inferenziale)', mood: ['Indicativo'], propTipo: ['Conclusiva'] },
    'αταρ':    { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'ma, tuttavia, però (poetica)', mood: ['Indicativo'], propTipo: ['Avversativa'] },
    'αυταρ':   { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'ma, invece (epico)', mood: ['Indicativo'], propTipo: ['Avversativa'] },
    'αυ':      { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'di nuovo, a sua volta, da parte sua', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'αυτε':    { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'di nuovo, a sua volta (variante di αὖ)', mood: ['Indicativo'] },
    'αυθις':   { tipo: 'Coordinante (καί, τε)',                pos: 'Avverbio',     note: 'di nuovo, ancora (temporale-aggiuntivo)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'γαρ':     { tipo: 'Coordinante dichiarativa (γάρ)',       pos: 'Congiunzione', note: 'infatti, poiché (postpositiva, mai prima posiz.)', mood: ['Indicativo'], propTipo: ['Dichiarativa'] },
    'δε':      { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'ma, e, invece (postpositiva, spesso correl. con μέν)', mood: ['Indicativo'], propTipo: ['Avversativa', 'Copulativa'] },
    'η':       { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'o, oppure (disgiuntiva); anche comparativa', mood: ['Indicativo'], propTipo: ['Disgiuntiva'] },
    'ηδε':     { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'e, ed anche (copulativa, poetica)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'και':     { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'e, anche, pure (copulativa)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'μεν':     { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella',   note: 'da una parte (correl. preparatoria con δέ)', mood: ['Indicativo'] },
    'μενοι':   { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'tuttavia, nondimeno (avversativa rafforzata)', mood: ['Indicativo'], propTipo: ['Avversativa'] },
    'μεντοι':  { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'tuttavia, però, eppure (avversativa-concessiva)', mood: ['Indicativo'], propTipo: ['Avversativa', 'Concessiva'] },
    'μητε':    { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'né (correl. negativa con μηδέ)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'μηδε':    { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'neppure (negativa)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'νυν':     { tipo: 'Coordinante (καί, τε)',                pos: 'Avverbio',     note: 'ora, adesso, ma ora (temporale-transitivo)', mood: ['Indicativo'] },
    'ομωσ':    { tipo: 'Coordinante avversativa (ἀλλά, δέ)',   pos: 'Congiunzione', note: 'ugualmente, tuttavia (concessivo-avversativo)', mood: ['Indicativo'], propTipo: ['Avversativa', 'Concessiva'] },
    'ουδε':    { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'e non, neppure (negativa aggiuntiva)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'ουκουν':  { tipo: 'Coordinante conclusiva (οὖν, ἄρα)',    pos: 'Congiunzione', note: 'non dunque?, non è vero che? (interrog. concl.)', mood: ['Indicativo'], propTipo: ['Conclusiva'] },
    'ουν':     { tipo: 'Coordinante conclusiva (οὖν, ἄρα)',    pos: 'Congiunzione', note: 'dunque, pertanto (postpositiva)', mood: ['Indicativo'], propTipo: ['Conclusiva'] },
    'ουτε':    { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'né (correl. negativa)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'τε':      { tipo: 'Coordinante (καί, τε)',                pos: 'Congiunzione', note: 'e, ed (enclitica, correlativa τε ... καί)', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    'τοινυν':  { tipo: 'Coordinante conclusiva (οὖν, ἄρα)',    pos: 'Congiunzione', note: 'dunque, ebbene (transizione argomentativa)', mood: ['Indicativo'], propTipo: ['Conclusiva'] },
    'ωσαυτως': { tipo: 'Coordinante (καί, τε)',                pos: 'Avverbio',     note: 'similmente, allo stesso modo', mood: ['Indicativo'], propTipo: ['Copulativa'] },
    /* SUBORDINANTI · TABELLA II */
    'αμα':     { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'contemporaneamente, non appena (+ part./ind.)', mood: ['Indicativo', 'Participio'], propTipo: ['Temporale'] },
    'δια':     { tipo: 'Subordinante causale (ὅτι, ἐπεί)',     pos: 'Preposizione', note: 'a causa di, per (+ acc./gen.)', mood: ['Infinito'], propTipo: ['Causale'] },
    'διοτι':   { tipo: 'Subordinante causale (ὅτι, ἐπεί)',     pos: 'Congiunzione', note: 'perché, poiché (διά + ὅτι)', mood: ['Indicativo'], propTipo: ['Causale'] },
    'ει':      { tipo: 'Subordinante condizionale (εἰ, ἐάν)',  pos: 'Congiunzione', note: 'se (protasi: ind./cong./ott.)', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Condizionale (protasi)'] },
    'ειπερ':   { tipo: 'Subordinante concessiva (καίπερ)',     pos: 'Congiunzione', note: 'anche se, pur se, benché', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Concessiva'] },
    'ειτε':    { tipo: 'Subordinante condizionale (εἰ, ἐάν)',  pos: 'Congiunzione', note: 'o se, sia che... sia che (correlativa)', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Disgiuntiva', 'Condizionale (protasi)'] },
    'εαν':     { tipo: 'Subordinante condizionale (εἰ, ἐάν)',  pos: 'Congiunzione', note: 'se (eventualità futura: εἰ + ἄν + cong.)', mood: ['Congiuntivo'], propTipo: ['Condizionale (protasi)'] },
    'ην':      { tipo: 'Subordinante condizionale (εἰ, ἐάν)',  pos: 'Congiunzione', note: 'variante poetica di ἐάν', mood: ['Congiuntivo'], propTipo: ['Condizionale (protasi)'] },
    'επει':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'quando, dopo che / poiché, giacché', mood: ['Indicativo'], propTipo: ['Temporale', 'Causale'] },
    'επειδη':  { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'dopo che, poiché (rafforzato ἐπεί + δή)', mood: ['Indicativo'], propTipo: ['Temporale', 'Causale'] },
    'επειδαν': { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'quando (futuro), ogni volta che (ἐπειδή + ἄν + cong.)', mood: ['Congiuntivo'], propTipo: ['Temporale'] },
    'εστε':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'finché, fino a quando (limitativa)', mood: ['Indicativo', 'Congiuntivo'], propTipo: ['Temporale'] },
    'εως':     { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'finché, fino a quando, mentre', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Temporale'] },
    'ημος':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'quando, nel momento in cui (poetica)', mood: ['Indicativo'], propTipo: ['Temporale'] },
    'ινα':     { tipo: 'Subordinante finale (ἵνα, ὅπως)',      pos: 'Congiunzione', note: 'affinché, perché (finale + cong.)', mood: ['Congiuntivo', 'Ottativo'], propTipo: ['Finale'] },
    'καιπερ':  { tipo: 'Subordinante concessiva (καίπερ)',     pos: 'Congiunzione', note: 'benché, pur, sebbene (+ participio)', mood: ['Participio'], propTipo: ['Concessiva'] },
    'καιτοι':  { tipo: 'Subordinante concessiva (καίπερ)',     pos: 'Congiunzione', note: 'eppure, tuttavia, benché (+ part./ind.)', mood: ['Indicativo', 'Participio'], propTipo: ['Concessiva'] },
    'μη':      { tipo: 'Subordinante finale (ἵνα, ὅπως)',      pos: 'Congiunzione', note: 'perché non, che non (finale negativa / verba timendi)', mood: ['Congiuntivo'], propTipo: ['Finale', 'Oggettiva'] },
    'μηπω':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'non ancora, finché non', mood: ['Indicativo'], propTipo: ['Temporale'] },
    'οθεν':    { tipo: 'Subordinante causale (ὅτι, ἐπεί)',     pos: 'Congiunzione', note: 'da dove, donde, per cui', mood: ['Indicativo'], propTipo: ['Causale', 'Relativa propria'] },
    'οπη':     { tipo: 'Subordinante finale (ἵνα, ὅπως)',      pos: 'Congiunzione', note: 'in che modo, come (modale / finale)', mood: ['Indicativo', 'Congiuntivo'], propTipo: ['Modale', 'Finale'] },
    'οποι':    { tipo: 'Subordinante finale (ἵνα, ὅπως)',      pos: 'Congiunzione', note: 'dove, verso dove (con scopo)', mood: ['Indicativo', 'Congiuntivo'], propTipo: ['Finale', 'Relativa propria'] },
    'οποτε':   { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'quando, ogni volta che (indefinita/iterativa)', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Temporale'] },
    'οποτερα': { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Congiunzione', note: 'se... o se, quale dei due', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Interrogativa indiretta'] },
    'οπου':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'dove, quando, dovunque (relativa locale-temporale)', mood: ['Indicativo', 'Congiuntivo'], propTipo: ['Temporale', 'Relativa propria'] },
    'οπως':    { tipo: 'Subordinante finale (ἵνα, ὅπως)',      pos: 'Congiunzione', note: 'perché, come (finale/consec./interrog. indir.)', mood: ['Congiuntivo', 'Indicativo'], propTipo: ['Finale', 'Consecutiva', 'Interrogativa indiretta'] },
    'οσον':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'per quanto (tempo), nella misura in cui', mood: ['Indicativo'], propTipo: ['Temporale', 'Causale'] },
    'οστις':   { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Pronome',      note: 'chiunque, qualunque, chi (relativa indefinita)', mood: ['Indicativo', 'Congiuntivo', 'Ottativo'], propTipo: ['Relativa propria'] },
    'οταν':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'quando (futuro), ogni volta che (ὅτε + ἄν + cong.)', mood: ['Congiuntivo'], propTipo: ['Temporale'] },
    'οτε':     { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'quando, nel momento in cui', mood: ['Indicativo'], propTipo: ['Temporale'] },
    'οτι':     { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Congiunzione', note: 'che, perché, poiché (dichiarativa/causale)', mood: ['Indicativo', 'Ottativo'], propTipo: ['Oggettiva', 'Dichiarativa', 'Causale'] },
    'πλην':    { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Congiunzione', note: 'eccetto, salvo, tranne (+ gen./acc.)', mood: ['Indicativo'], propTipo: ['Eccettuativa'] },
    'πριν':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'prima che, finché non (+ inf./cong.)', mood: ['Infinito', 'Congiuntivo'], propTipo: ['Temporale'] },
    'πως':     { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Congiunzione', note: 'come, in che modo (interrog./esclam. indiretta)', mood: ['Indicativo'], propTipo: ['Interrogativa indiretta'] },
    'ως':      { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Congiunzione', note: 'come, perché, poiché, quando, che (multifunzionale)', mood: ['Indicativo', 'Congiuntivo', 'Ottativo', 'Participio'], propTipo: ['Finale', 'Causale', 'Temporale', 'Comparativa', 'Dichiarativa'] },
    'ωσπερ':   { tipo: 'Subordinante completiva (ὅτι, ὡς)',    pos: 'Congiunzione', note: 'come, proprio come (paragone reale)', mood: ['Indicativo', 'Participio'], propTipo: ['Comparativa'] },
    'ωστε':    { tipo: 'Subordinante consecutiva (ὥστε)',      pos: 'Congiunzione', note: 'cosicché, così da (conseg. effettiva o dich.)', mood: ['Indicativo', 'Infinito'], propTipo: ['Consecutiva'] },
    'μεχρι':   { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'fino a (temporale-limitativa)', mood: ['Indicativo', 'Congiuntivo'], propTipo: ['Temporale'] },
    'αχρι':    { tipo: 'Subordinante temporale (ὅτε, ἐπεί)',   pos: 'Congiunzione', note: 'fino a (variante di μέχρι)', mood: ['Indicativo', 'Congiuntivo'], propTipo: ['Temporale'] },
    /* PARTICELLE */
    'δη':    { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'enfatica: davvero, proprio' },
    'γε':    { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'enclitica, limitativa: almeno, certo' },
    'τοι':   { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'enclitica, enfatica: di sicuro' },
    'μην':   { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'enfatica: invero, certo' },
    'περ':   { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'enclitica: proprio, davvero' },
    'αν':    { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'modale: eventualità, irrealtà' },
    'κεν':   { tipo: 'Particella enfatica (μέν, δή)',        pos: 'Particella', note: 'arc./ep. = ἄν' },
    'αρα_q': { tipo: 'Particella interrogativa (ἆρα, μῶν)',  pos: 'Particella', note: 'ἆρα: forse? (interr. diretta)' },
    'μων':   { tipo: 'Particella interrogativa (ἆρα, μῶν)',  pos: 'Particella', note: 'forse? (interr. att. negativa)' },
  },
};

/**
 * Cerca un preset di congiunzione per la parola data.
 * @param {string} word - parola flessa (anche con apostrofo/troncamento)
 * @param {'latino'|'greco'} lang
 * @returns {object|null} preset { tipo, pos, note, mood?, propTipo? } o null
 */
export function lookupConjunctionPreset(word, lang) {
  if (!word) return null;
  const dict = CONJ_PRESETS[lang];
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
 * Applica un preset di congiunzione/particella a una grammar entry,
 * popolando solo i campi vuoti. Salva anche gli hint cross-layer.
 * @returns {boolean} true se ha applicato almeno una modifica
 */
export function applyConjunctionPreset(entry, lang) {
  if (!entry || !entry.word) return false;
  const preset = lookupConjunctionPreset(entry.word, lang);
  if (!preset) return false;
  let applied = false;
  if (preset.pos && (entry.partOfSpeech === 'Congiunzione' || entry.partOfSpeech === 'Particella' || !entry.partOfSpeech)) {
    if (entry.partOfSpeech !== preset.pos) { entry.partOfSpeech = preset.pos; applied = true; }
  }
  if (preset.tipo && !entry.congiunzioneTipo) {
    entry.congiunzioneTipo = preset.tipo;
    applied = true;
  }
  if (preset.note && !entry.note) {
    entry.note = '[preset] ' + preset.note;
    applied = true;
  }
  if (preset.propTipo && !entry._propTipoHint) {
    entry._propTipoHint = Array.isArray(preset.propTipo) ? preset.propTipo.slice() : [preset.propTipo];
    applied = true;
  }
  if (preset.mood && !entry._moodHint) {
    entry._moodHint = Array.isArray(preset.mood) ? preset.mood.slice() : [preset.mood];
    applied = true;
  }
  if (applied) entry._presetApplied = true;
  return applied;
}
