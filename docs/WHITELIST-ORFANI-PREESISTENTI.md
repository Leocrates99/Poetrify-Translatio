# Whitelist · i 19 orfani preesistenti

> Scritta **prima** di cancellare, come la whitelist del punto 10.
> A differenza di quella, questa nasce dalla lezione di R1: **un orfano può
> essere una funzione utente che ha perso l'ingresso**, non codice morto. La
> domanda non era «si può cancellare» ma «è morta, o è una feature perduta?».
>
> **Esito: 1 feature ripristinata, 18 delezioni, più 5 orfani a cascata.
> Alla fine: zero funzioni orfane su 779 dichiarate.**

## 1 · Il metodo

Ogni funzione è stata esaminata su cinque assi: riferimenti statici in tutto il
repo (non solo `translator.html`); riferimenti **dinamici** (stringhe `onclick`,
template literal, `window[…]`, tabelle di dispatch); il corpo, per capire se
produceva interfaccia o era un helper di calcolo; la **storia git** (`log -S`),
per sapere quando e perché ha perso il chiamante; l'esistenza di un **sostituto
vivo**.

Le indagini sono state distribuite su sette analisti in parallelo, e ogni
verdetto «morto» è passato a un **confutatore** con un solo compito: smentirlo.
Tre confutazioni sono fallite per errori dell'API (`setLingua`,
`_countGreekSyllables`, `_countGreekTones`): **quei tre li ho verificati a
mano**, e sono dichiarati tali qui sotto.

## 2 · 🔧 La feature perduta, ripristinata

### `scheletroConfirmAllConj` — «✓ Conferma le congiunzioni (N)»

Marca in un colpo solo tutte le congiunzioni riconosciute della frase.

**La storia.** Introdotta col proprio bottone nel commit `a74aac7`, dentro la
riga «(1) Congiunzioni». Ha perso il chiamante in `9f4fb29`, quando quella riga
fu sostituita dalla **connBar preview-driven**. I suoi fratelli
(`scheletroConfirmConj`, `scheletroRemoveConj`, `scheletroSetConnTipo`) furono
ricablati sulla connBar nuova; **lei no**.

**Perché è omissione e non scelta.** L'altro acceleratore massivo della stessa
fase è sopravvissuto al redesign — «⚡ Completa proposizioni dai verbi» — quindi
i gesti in blocco fanno ancora parte del linguaggio della Fase 2. E chi ha fatto
il redesign ha lasciato in piedi la funzione col suo commento d'intestazione:
una rimozione voluta avrebbe cancellato anche l'handler, come si è fatto col
resto del pannello.

**Che cosa costava all'utente.** Senza il bottone, ogni congiunzione va
confermata da sola: clic sul token, attesa della connBar, «✓ conferma» — per
ogni congiunzione di ogni frase.

**Ripristinata** accanto a «⚡ Completa proposizioni dai verbi», col conteggio
dei candidati (`congDaConfermare`) e la scomparsa automatica quando non ne
restano. Verificato: due congiunzioni confermate in un clic, il pulsante
sparisce, la connBar continua a permettere la correzione una per una.

## 3 · Le 18 delezioni, e perché ciascuna

| Funzione | Sostituto vivo / motivo |
|---|---|
| `addPeriodaleEntry` | **modello dati superato**: creava una voce con `text` e `tokenIndices: []`, cioè pre-tokenizzatore; oggi tutta la macchina a valle (riquadri, sigle A₁/B₂, colori, ordine nell'albero) è ancorata ai `tokenIndices`. Mancava anche il campo `new-prop-text`: rimossa la forma intera, non solo il varco. Quattro vie di creazione vive, e il testo resta editabile nella scheda della proposizione |
| `periodaleAnchorOf` | superata da `periodaleLevel` e da `renderTreeClusterRow`. **E non ha mai funzionato**: il guardiano è `ruolo === 'coordinata'` minuscolo, mentre il modello scrive `'Coordinata'` — la sorella viva controlla entrambe le forme, lei no |
| `resumeProject` | alias di una riga su `openProject`, che è vivo e chiamato da tutte le vie utente |
| `setLingua` *(verificata a mano)* | il ramo linguistico si sceglie a monte, in `lingua.html`; 1 sola occorrenza in tutto il repo |
| `isTokenBatchCandidate` | superata da `getTokenBatchState`, più ricca (`occupied`/`candidate`/`neutral`) e realmente usata dal renderer dei token |
| `renderScheletroStep1` · `Step2` · `Step3` | i tre renderer della vecchia Fase 1-3 dello scheletro, sostituiti dai renderer per tappa |
| `suggestPosFromDict` | wrapper di una riga su `lookupHighFreqDict`, che i chiamanti usano direttamente |
| `legendColor` | mappa colori per una legenda **per funzione logica**; la legenda viva è **per caso** (`.pos-legend-swatch.case-*`) e prende i colori dal CSS. ⚠️ Un confutatore l'aveva dichiarata «feature perduta» sostenendo che esiste un produttore vivo di classi `lf-*`: **ho verificato e la smentita non regge** — `logicFuncClass` compare solo in un test di parità fra monolite e modulo, non disegna niente |
| `applyProfileToBody` | doppione morto di `applyLevelToBody`, residuo del profilo per fasce di competenza, abolito |
| `_greekReduplicate` · `_greekStemBeforeSigma` · `_addAugment_OLD` · `_countGreekSyllables` *(a mano)* · `_countGreekTones` *(a mano)* · `_isShortFinal` | copie morte nel monolite di helper di morfologia greca. `_addAugment_OLD` è dichiarato disabilitato dall'autore stesso in un commento |
| `_matchLongestPattern` | astrazione scritta e mai cablata: esiste **solo** nel monolite, zero chiamate in tutto il repo |

## 4 · I 5 orfani a cascata

Cancellare i tre `renderScheletroStepN` e il vecchio nastro ne ha orfanati altri
cinque — gli handler che vivevano solo nel loro markup. Tutti già irraggiungibili
prima, tutti rimossi: `scheletroMarkVerb`, `scheletroMarkSoggOgg`,
`scheletroAutoCompletePeriphery` (guscio di una riga su `autoAnalyzeHighConfidence`,
che è vivo e ha i suoi due bottoni «⚡ Auto-analizza»), `tappeLibere` (mio
residuo del micro-passo 3), e `setApproach`.

### Una mia correzione sbagliata, corretta

Nell'audit finale (R3) avevo **ripristinato `setApproach`** dichiarando che la
whitelist del punto 10 sbagliava a darlo per orfano, «perché lo chiama un
pulsante vivo nella fase dei verbi».

Quel pulsante — «↗ Lavora solo su questa frase» — stava **dentro
`renderScheletroStep3`**, che era esso stesso orfano. Il chiamante era codice
morto: la whitelist del punto 10 aveva ragione, e io ho «corretto» un verdetto
giusto fidandomi di un riferimento senza risalire alla sua raggiungibilità.

La lezione: **contare i chiamanti non basta — bisogna chiedersi se il chiamante
è raggiungibile.** Un riferimento dentro codice morto non è un riferimento.

## 5 · Un reperto architetturale, non toccato

La **morfologia greca è implementata due volte**: nel monolite (per il
translator) e in `modules/engine/paradigm.js` (importato dal **dizionario**, non
dal translator). Le due copie sono già divergenti — `_matchLongestPattern`
esiste solo nel monolite; `_greekReduplicate` è vivo nel modulo e morto nel
monolite. Unificarle è un lavoro a sé, con la sua whitelist: qui è solo
registrato.

> **Chiuso.** L'unificazione è stata fatta: vedi
> [`UNIFICAZIONE-MORFOLOGIA.md`](UNIFICAZIONE-MORFOLOGIA.md). Le due copie
> divergevano su **forme reali** — l'infinito futuro latino e gli apofonici
> della III greca — e il monolite aveva torto su tutto.

## 6 · Verifica finale

- **zero funzioni orfane** su 779 dichiarate (era 24);
- il pulsante ripristinato funziona e scompare quando non serve;
- tutte le sette fasi dello scheletro, l'integrale, l'archivio e la panoramica
  rendono;
- `brace_check` 10, `node --check` OK, console pulita.
