# Poetrify · Architettura modulare

## Visione

Poetrify nasce come **monolite HTML/JS** (`poetrify-translator.html`, ~30 000 righe) progettato per essere auto-contenuto e distribuibile come singolo file. Questa scelta resta valida per la **distribuzione**, ma rende difficile lo **sviluppo iterativo**: ogni edit richiede grep frequenti, il parser del browser fatica al caricamento, il rischio di SyntaxError catastrofici cresce.

Per superare questo limite preservando la portabilità, abbiamo introdotto un'architettura **SPA modulare** che:

- separa il **motore** (dati lessicali, regole sintattiche, propagazione cross-layer) dalla **UI** (renderer, tokenizer, wizard);
- usa **ES modules nativi** del browser, senza bundler o transpiler;
- permette di sviluppare translator e dizionario in **moduli indipendenti** che condividono lo stesso engine;
- conserva il monolite legacy come **fallback** operativo durante la migrazione.

## Struttura cartelle

```
poetrify/                       ← cartella attiva di sviluppo
├─ app.html                     ← entry point della SPA modulare (dashboard)
├─ translator.html              ← translator attivo (sviluppo qui)
├─ dictionary.html              ← scheda dizionario (sviluppo qui)
├─ ARCHITECTURE.md              ← questo file
├─ modules/
│  ├─ engine/                   ← motore condiviso translator/dizionario
│  │  ├─ index.js               ← facade (ri-esporta tutto)
│  │  ├─ taxonomies.js
│  │  ├─ conjunctions.js
│  │  ├─ prepositions.js
│  │  ├─ cross-rules.js
│  │  ├─ conversion-table.js
│  │  └─ text-utils.js
│  ├─ translator/               ← fase 2: UI del translator (in corso)
│  │  ├─ index.js               ← facade
│  │  ├─ token-classifiers.js   ← posClass/posShort/logicFuncClass/case-group
│  │  ├─ options-renderer.js    ← renderFunzioneOptions/renderCongTipoOptions
│  │  └─ summaries.js           ← makeGrammar/Logic/PeriodaleSummary
│  ├─ dictionary/               (fase 3: UI del dizionario)
│  └─ ui/                       (fase 2: componenti UI condivisi)
└─ data/                        (fase 5: corpus lessicali in JSON)
   ├─ greek-dict.json           (futuro)
   └─ latin-dict.json           (futuro)

../poetrify-translator.html     ← archivio storico (NON sviluppare qui)
../poetrify-dictionary.html     ← archivio storico (NON sviluppare qui)
```

> **Da questo momento in poi tutto lo sviluppo avviene in `poetrify/`.**
> I file fratelli `../poetrify-translator.html` e `../poetrify-dictionary.html`
> sono **archivio storico**: non vanno modificati. Eventuali modifiche fatte
> per errore lì non si propagano a `poetrify/translator.html` e si perderebbero.

## Convenzioni ES modules

Tutti i moduli usano sintassi ES6:

```js
// taxonomies.js
export const FUNZIONI_LOGICHE_GROUPED = [...];
export function funzioniLogicheGroupedFor(lang) { ... }

// app.html
import { FUNZIONI_LOGICHE_GROUPED } from './modules/engine/index.js';
```

**Import nel browser:**
```html
<script type="module" src="./app.js"></script>
```

**Vincoli importanti:**
- Path **relativi** sempre con `.js` esplicito (`./engine/index.js`, non `./engine`)
- I file devono essere serviti via HTTP (file:// non funziona per moduli)
- CORS rispettato — apri tramite un server locale o un'estensione browser

## Moduli engine

### `taxonomies.js`
Tutte le tassonomie linguistiche fisse:
- `FUNZIONI_LOGICHE_GROUPED` / `FUNZIONI_LOGICHE_GROUPED_GR` — funzioni logiche raggruppate per caso, distinte per lat/gr (il greco non ha gruppo ablativo)
- `CONGIUNZIONE_TIPO_GROUPED` — macro-categorie delle congiunzioni (copulative / coordinanti / subordinanti / particelle)
- `PROPOSIZIONI` — ruoli, tipi, modi, gradi delle proposizioni periodali
- `GUIDED_PHASES` + `GUIDED_STEPS_META` — 4 macro-fasi e 9 tappe del wizard guidato
- `GUIDED_GENERI` — 6 generi didattici di versione
- `APPROACH_DESCRIPTORS` — 3 approcci traduttivi con pro/contro

### `conjunctions.js`
- `CONJ_PRESETS` — dizionario lemma → tipologia per latino (~50 voci) e greco (~55 voci)
- `lookupConjunctionPreset(word, lang)` — ricerca normalizzata
- `applyConjunctionPreset(entry, lang)` — applica preset a una grammar entry con propagazione hint cross-layer (`_propTipoHint`, `_moodHint`)

### `prepositions.js`
- `PREP_PRESETS` — dizionario lemma → casi retti + complementi attivati (18+5 preposizioni greche dalla tabella didattica)
- `lookupPrepositionPreset(word, lang)`
- `applyPrepositionPreset(entry, lang)` — applica preset salvando `_prepHint` con la mappa caso → funzioni

### `cross-rules.js`
- `CROSS_RULES` — regole inequivocabili funzione → caso/PoS (lat+gr)
- `PERIODALE_TIPO_TO_VERBO` — tipologie particolari → vincoli sul verbo
- `CASE_FUNCTION_MAP` + `functionToCases()` + `casesToFunctions()` — mappe bidirezionali

### `conversion-table.js`
- `CONVERSION_TABLE` — tabella di conversione master (Excel-derived) PoS → funzioni logiche + tipi periodali
- `lookupConversion(entry)` — opzioni per PoS+categoria
- `gradeFromGrammarToLogic(sentence, tokenIndices, lang)` — suggerisce funzioni logiche dai PoS+casi (priorità: sintagma preposizionale via `_prepHint` → PoS+categoria via CONVERSION_TABLE → filtro per caso)
- `gradeFromGrammarToPeriodale(sentence, tokenIndices, lang)` — suggerisce ruolo+tipo+tipi compatibili periodali

### `text-utils.js`
- `normalizeText(s)` — NFD + remove diacritics + lowercase (per chiavi greche)
- `tokenizeSentence(text)` — tokenizer con gestione apostrofi/elisioni
- `escapeHtml(s)` — escape safety per rendering (apostrofo come `&#039;` per parità byte-a-byte con l'inline)

## Moduli translator UI (Fase 2)

Renderer puri estratti dal monolite. Tutti **stateless** (niente accesso a `state`): consumano l'engine via import e nient'altro. Il translator inline carica questi moduli in modalità *shadow* — vedi sezione [Pattern shadow-module-bootstrap](#pattern-shadow-module-bootstrap).

### `token-classifiers.js`
- `posClass(part)` — mappa parte del discorso → classe CSS (`pos-sostantivo`, `pos-verbo`, …)
- `posShort(part)` — abbreviazione (`sost.`, `vb.`, …)
- `logicFuncClass(funzione)` — macro-classe della funzione logica per i chip colorati (`lf-soggetto`, `lf-modo`, …)
- `caseGroupForGrammarEntry(entry)` — case-group dal PoS+caso di una entry grammaticale (per il colore unificato)
- `funzioneToCaseGroup(funzione)` — inverso: dato il nome della funzione logica, restituisce il caso-colore associato

### `options-renderer.js`
- `renderFunzioneOptions(currentValue, suggestedSet, lang)` — genera gli `<option>` raggruppati per caso (greco senza gruppo ablativo) con marcatura ★ dei suggerimenti
- `renderCongiunzioneTipoOptions(currentValue, lang, suggestedSet)` — idem per le congiunzioni (copulative/coordinanti/subordinanti/particelle)

### `summaries.js`
Tre renderer compatti dei chip collassati. Accettano un piccolo set di hook opzionali per le dipendenze non-pure (predizione lemma, lookup sintagma capo):
- `makeGrammarSummary(entry, lang, hooks = { predictLemma })` — PoS + morfemi + lemma (manuale o predetto)
- `makeLogicSummary(entry, hooks = { findAttributivoHead })` — funzione + flag attributivo + nota
- `makePeriodaleSummary(entry)` — ruolo + tipo/modo/grado + connettivo (completamente puro)

### `translator/index.js`
Facade: ri-esporta i tre sub-moduli e `TRANSLATOR_UI_META` per la dashboard di stato.

## Pattern shadow-module-bootstrap

Durante la Fase 2 il translator inline e i nuovi moduli ES **coesistono**:

1. Lo script classico inline continua a definire i propri renderer come funzioni globali (è il sistema in produzione).
2. Un blocco `<script type="module">` aggiunto in fondo a `translator.html` carica `modules/engine/*` e `modules/translator/*`, li espone su `window.PoetrifyEngine` e `window.PoetrifyTranslatorUI`, ed esegue una **smoke test di parità**: confronta gli output dei moduli con quelli delle funzioni inline omonime.
3. Se la parità è perfetta, in console appare ` Poetrify modular UI · smoke OK `. Se diverge, viene loggato l'input fallito.

Vantaggi del pattern:
- nessun rischio di regressione mentre l'estrazione è in corso;
- i moduli sono *davvero* in uso (caricati dal browser ogni volta);
- la divergenza fra inline e modulare emerge subito in console;
- in iterazioni successive si cancella la copia inline e si referenzia direttamente `window.PoetrifyTranslatorUI.X` (o, per il refactoring più ambizioso, si converte tutto il blocco a `type="module"` e si importano direttamente le funzioni).

## Roadmap della migrazione

| Fase | Stato | Descrizione |
|---|---|---|
| 1. Estrazione dati | ✅ Completata | Tassonomie + preset + regole estratti in moduli ES |
| 1.5. Migrazione in `poetrify/` | ✅ Completata | `translator.html` e `dictionary.html` ora vivono in `poetrify/` come unica fonte di sviluppo; gli URL bridge sono aggiornati per puntare ai fratelli |
| 2. UI translator | 🛠 In corso | Primo batch consegnato: `token-classifiers.js`, `options-renderer.js`, `summaries.js`. Bootstrap shadow-module attivo con smoke-test di parità. Prossimi batch: tokenizer/render-token-chip, action-bars, wizard, lemma engine |
| 3. UI dizionario | ✅ Completata | `modules/dictionary/` operativo: autocomplete, paradigma inline, glosse IT, frequenza, cognati, ricerca inversa. **Nucleo scolastico** (~10k lemmi/lingua) con **drill-down alfabetico** (1ª→+4ª lettera), **barra di ricerca in anteprima** e browse **senza paginazione**. **Paradigma scolastico completo** (declinazioni/coniugazioni) via `engine/paradigm.js` (builder estratti dal translator) + toggle Completo↔Attestate. **Etimologia** con «deriva da» e composti correlati (`engine/morphology.js · detectLemmaPrefix`) |
| 4. Shared state | 🔜 Coda | Store reattivo condiviso, bridge URL → event bus |
| 5. Data JSON | ✅ Completata | Corpus lessicali shardati per lettera + cache lazy (`LexiconEngine`). Voci epigrafiche/testimonia **archiviate** in `data/<lang>/archive/` con fallback in lettura (`source:'archived'`); vedi `data/README.md` |
| 6. Build pipeline | 🔜 Coda | Bundler opzionale (esbuild / vite) per produzione single-file |

## Feature presenti nella versione corrente di `translator.html`

L'HTML di `poetrify/translator.html` è ancora monolitico al suo interno ma contiene **tutte le feature** sviluppate fino a oggi:

- Sistema delle 3 modalità di approccio (integrale · attuale · frase-per-frase)
- Wizard guidato a 9 tappe in 4 macro-fasi
- Dialogo cross-layer permanente fra grammatica / logica / sintassi
- Tabella di conversione master (PoS → funzioni logiche → tipi proposizionali)
- Preset congiunzioni greche (55 voci) + latine (~50)
- Preset preposizioni greche (23 voci) con casi+complementi
- Riconoscimento periodo ipotetico (3 tipi LAT + 4 tipi GR)
- Kit costrutti sintattici (ablativo/genitivo/accusativo assoluto, infinitive, perifrastiche)
- Ordo verborum italiano automatico (S→V→O→altri)
- Drag-select dei token con visualizzazione blocco unitario
- Apostrofi/troncamenti che restano nel token (κατ᾽, ἀλλ᾽)
- Dark mode + zoom indicator + tema rosso pompeiano per LAT
- Bridge ai dizionario via URL query string (`?lang=…&lemma=…`)

Le iterazioni future di refactoring trasformeranno gradualmente parti di `translator.html` in import dai moduli `engine/*`, riducendo le dimensioni dell'HTML monolite senza interrompere le funzionalità.

## Distribuzione

In sviluppo: aprire `app.html` via un server locale (es. `python -m http.server 8000`) per consentire l'import dei moduli.

In produzione: il monolite `poetrify-translator.html` continua a funzionare offline. Quando la modularizzazione sarà completa, un bundler creerà il single-file per chi preferisce quel formato.

## Debug

In console (dopo aver aperto `translator.html` via server locale):
```js
window.PoetrifyEngine          // tutta la facade engine (CONJ_PRESETS, PREP_PRESETS, …)
window.PoetrifyTranslatorUI    // tutta la facade translator-UI
window.PoetrifyTranslatorUI.posClass('Verbo')     // → 'pos-verbo'
window.PoetrifyTranslatorUI.makePeriodaleSummary({ ruolo:'Subordinata', tipo:'Finale' })
```

Smoke test automatiche all'avvio:
- in `app.html`:
  ```
  ✓ engine lookup test passed: ἵνα → Subordinante finale (ἵνα, ὅπως) · Finale
  ✓ translator-UI smoke passed: 8 assertions
  ```
- in `translator.html`:
  ```
   Poetrify modular UI · smoke OK   N test passati · M export attivi
   Poetrify modules                  engine v0.1.0 · translator-ui v0.2.0
  ```
  Se la parità fallisce, viene stampato il dettaglio dell'input divergente.

## Convenzioni di codice

- Indentazione: 2 spazi
- Quotes: single quotes preferito (`'foo'`)
- Carattere apostrofo nel sorgente: usare **sempre** `String.fromCharCode(0xNNNN)` quando si maneggiano apostrofi tipografici ASCII per evitare collisioni col delimitatore di stringa
- File JS: estensione esplicita `.js` negli import
- Commenti: italiano (lingua di sviluppo del progetto)
- Nomi: camelCase per funzioni, SCREAMING_SNAKE per costanti, kebab-case per file
