# Audit · I percorsi traduttivi e la loro declinazione UX/UI

> **Domanda del docente:** concepire in maniera strutturata, funzionante, efficiente,
> intuitiva e *spedita* i possibili percorsi di approccio e metodo traduttivi, con la
> relativa declinazione UX/UI.
> **Metodo:** ricognizione a 4 lenti sul codice reale (con riferimenti di riga) →
> progettazione → doppia critica avversariale (didattica/carico cognitivo · fattibilità
> nel monolite). Luglio 2026. Documento-fonte per le sessioni future.

---

## 1 · Diagnosi: tre motori, non tre percorsi

Il translator ha **4 assi vivi** — Lingua (gate) · Metodo (strati/valenziale) · Vista
(frase/intero) · Guida (libera/guidata) — più un quinto asse *fantasma* (`approach`,
ormai solo derivato). Ma delle 8 combinazioni memorizzabili, i percorsi di rendering
reali sono **4**, e non sono declinazioni di uno stesso motore: sono **tre macchine
separate** che implementano la stessa pedagogia con stati, stepper e contabilità propri:

| Percorso reale | Motore | Carattere |
|---|---|---|
| «attuale» (strati + frase) | 3 stanze per frase + tab unificato | il più rifinito; ~25-30 clic di navigazione per 5 frasi |
| «integrale» (strati + intero) | brano intero taggabile, batch, auto-analisi | il più **spedito** (~8-10 clic), ma senza stemma a barre |
| scheletro (valenziale) | 7 fasi brano-wide | l'unico con nastro completo analisi→ordo→brutta→E |
| guidata (wizard) | 9 tappe in 4 fasi, renderer propri | il più lungo (≥24 clic di solo posizionamento) |

### I guasti trovati (verificati riga per riga)

| Sev. | Guasto | Dove |
|---|---|---|
| 🔴 | **La didattica del metodo è muta per tutti.** L'abolizione del Profilo ha inchiodato `data-level='avanzato'`, e la regola CSS residua `body:not([data-level="base"]) … display:none` (≈4511-4535) nasconde **per sempre** `.wizard-instructions`, `.field-hint`, `.attributivo-hint` e ~15 classi: le istruzioni del wizard (GUIDED_STEPS_META, ≈30726-30761), la regola dei 5 valori del participio, l'hint ⌖ d'incastonatura — il cuore «la classificazione insegna» — non sono visibili a **nessuno studente**. | CSS ≈4511-4535 |
| 🔴 | Lo studente **non incontra mai il metodo del docente**: l'avvio chiede solo Guidata/Libera; il valenziale si scopre solo da un segmented 🦴 con tooltip; il modale descrittivo («a») **non ha nemmeno la scheda dello scheletro**. | avvio ≈27592 · modale ≈38630-38666 |
| 🔴 | **«Frase-per-frase» è codice morto raggiungibile**: la card del modale lo offre ancora, ma il click attiva silenziosamente guidata+attuale (percorso diverso da quello appena letto); ~250 righe di renderer irraggiungibile (≈30226-30308). | modale + dispatcher ≈28061 |
| 🟠 | **Controlli cliccabili senza effetto**: Vista attiva ma inerte col valenziale (toast di conferma sul nulla); Metodo cliccabile ma inerte in guidata. L'ortogonalità dichiarata dei 3 assi non esiste. | setVista/setMetodo ≈38596-38614 |
| 🟠 | **Doppia pedagogia non riconciliata**: scheletro (7 fasi) e wizard (9 tappe) insegnano quasi la stessa progressione con due macchine a stati che possono coesistere in conflitto nello stesso progetto. | ≈28143 · ≈30726 |
| 🟠 | **Su telefono non esiste alcun posto** dove leggere le differenze fra i percorsi: tooltip invisibili al tocco, modale solo da tastiera, quick-bar nel drawer. | — |
| 🟠 | Lo **stemma a barre** (la vista canonica del metodo) è terzo nel ciclo dei toggle, mai default, e **non esiste proprio** nel percorso integrale. | ≈35276 |
| 🟠 | La **contabilità** (projectStatus/Completion) misura solo le tre analisi a strati: i brani fatti con lo scheletro non risultano mai «completi». | ≈30338-30366 |
| 🟡 | **Copy fossile** in ≥6 punti: badge «6/6» su 9 tappe, scheletro descritto «3 step» quando le fasi sono 7, «pulsante in alto a destra» rimosso, aria-label col «profilo», tag `<\strong>` spezzato (≈31222), onboarding spento e stale. | vari |
| 🟡 | `setLingua` è una **funzione orfana** (mai chiamata): non esiste un controllo per cambiare lingua in corsa. | ≈38261-38279 |
| 🟡 | Nel percorso scheletro la fase 1 mostra il select del participio **ma scarta `f.hint`**: proprio il percorso del metodo perde la regola del metodo. | renderScheletroVerbQuick |

**Il paradosso di fondo:** il pregio maggiore — il **modello dati unico per frase**, che
rende sicuro cambiare percorso a metà versione — non è comunicato da nessuna superficie.

---

## 2 · La visione: un motore, una famiglia di percorsi

> **UN MOTORE, PIÙ PERCORSI.** Si definisce una **catena canonica di layer-moduli** e ogni
> percorso è una **playlist** di quei moduli più tre manopole: *dose degli hint* (piena /
> compressa) · *guida* (voce del docente sopra la fase: on/off) · *granularità* (per frase /
> brano intero). I percorsi si distinguono per **SCOPO e TEMPO** dichiarati («Simulazione
> di compito · ~2-3 min a frase»), **mai per bravura** (fasce abolite). Gli assi tecnici
> Metodo/Vista/Guida **spariscono dalla UI** come scelte autonome: diventano stato interno
> derivato dal percorso — muoiono le combinazioni inerti e i quattro vocabolari sovrapposti.
> Il **nastro delle tappe** (già il pezzo UX più riuscito) rende la playlist: *il nastro È
> il percorso*.

### La catena canonica dei layer

```
L0 Pre-lettura · L1 Verbi (finiti/non finiti + participio 5 valori) · L2 Proposizioni/connettivi
L3 Soggetto+gruppo · L4 Oggetto+gruppo · L5 Preposizionali · L6 Altri complementi
L7 Grammatica completa · L8 Stemma a barre S·V·O·C · L9 Ordo S·V·O·C → brutta · L10 Bella copia
```

Le 7 fasi dello scheletro **sono già l'implementazione canonica** di L1-L6+L9; il wizard
vi si fonde come **overlay-guida** (i suoi testi didattici tornano visibili e diventano la
«voce del docente» richiudibile sopra ogni fase).

---

## 3 · La famiglia dei percorsi

*Nomi rivisti dalla critica didattica: per scopo, in parole da studente. «La versione» →
**Versione per casa**; «Compito in classe» → **Simulazione di compito** (durante una
verifica reale l'app è vietata: la promessa onesta è l'allenamento); «Pro con
ramificazioni» → **Versione d'autore**.*

| Percorso | Per | Playlist | Tempo | Stato |
|---|---|---|---|---|
| **Versione per casa** *(default)* | il compito assegnato: metodo pieno | L1→L2→L3→L4→L5→L6 (+L8 a fianco, default barre) →L9→L10 | 45-90′ (8-12 frasi) | **esiste**: è lo scheletro, da rendere playlist-driven |
| **Passo dopo passo** | prima versione / voce del docente accanto | L0 + le stesse fasi **con guida attiva** + L7 facoltativa + L10 con rilettura | 60-120′, cala con l'abitudine | fusione wizard→motore (interim: `mode=guided` com'è, con le istruzioni sbloccate) |
| **Simulazione di compito** | allenarsi al ritmo della verifica, a casa | ⚡auto-analizza → L1 (brano intero) → L2 → L9→L10; L3-L6 solo dove la brutta inceppa | ~2-3′ a frase; ~10 clic di struttura | da comporre (auto-analizza integrale + fasi 1-2 + seed ordo) |
| **Ripasso lampo** | prima della verifica: struttura senza tradurre | L1→L2→**L8 come traguardo visivo**; chiusura «Visto ✓» senza bella | 10-15′ | da comporre; entry point naturale: **dall'Archivio**, non dall'avvio |
| **Leggere tanto** | mole (Cesare/Senofonte a capitoli): ritmo e senso | ciclo stretto per frase: L1 lampo → brutta immediata → avanti; dizionario a fianco | 2-3′ a frase | nuovo; v1 **senza** trapianto del pattern L2 dal laboratorio |
| **Versione d'autore** | la «guida pro» rimandata: il testo apre i bivi | come Versione per casa + **nodi condizionali dai dati**: participio→bivio dei 5 valori; valore proprio→tappa ⚓; incastonatura→tappa ⌖ | 60-90′ su brano denso | nuovo (solo il branching: i predicati esistono già tutti) |

### Routing — un gesto, parole oneste

- **All'avvio, 3 card** (non 6: choice overload per un quindicenne): *Versione per casa ·
  Simulazione di compito · Passo dopo passo*, più «altri percorsi». Ogni card: icona, scopo,
  **miniatura del nastro** (la playlist si vede), **tempo per unità** («~2-3 min a frase») —
  e **alla soglia la stima calcolata sul brano reale** («14 frasi: circa 40 minuti»).
- **Regola di primo ingresso**: finché non c'è una versione completata, il default
  evidenziato è *Passo dopo passo* («è la tua prima volta: qui il metodo te lo spiega»).
- **In corsa**: pill «Percorso: …» che riapre il pannello card (v1 mobile: nel banner di
  contesto della tab C + soglia; topbar quando il CSS regge). Sostituisce i 3 segmented,
  il modale «a» e i doppioni della palette.
- **Prescrivibilità del docente**: `?percorso=` nel deep-link (con filo esplicito verso
  `importPassoDalCorpus`, perché `?text=` oggi ha precedenza assoluta) come **default
  marcato**; l'export e la bella **stampano il percorso usato e la copertura dei moduli**
  («Percorso: Simulazione di compito · L1 L2 L9») — il contrasto all'abuso del percorso
  corto non è il blocco, è la **visibilità**.
- **Cambio sicuro e onesto**: «Cambi strada: il lavoro fatto resta» — ma al passaggio verso
  un percorso più ricco le tappe a valle (L9, L10) passano allo stato terzo **«da
  rivedere»**: vero per i dati E per la testa.
- **Rientro selettivo** (il micro-gesto che mancava): dalla brutta di frase, «analizza i
  gruppi di questa frase» apre l'editor logico condiviso in overlay.

### Declinazione UX/UI trasversale

- **Parole da studente, sempre**: banditi «attuale», «integrale», «approccio»,
  «frase-per-frase» da ogni superficie utente.
- **La scelta si legge, non si scopre**: mai differenze affidate a tooltip o a modali da
  tastiera; card identiche su PC e telefono.
- **Nastro unico** per qualunque percorso (muore il doppio stepper); la tappa corrente
  dice sempre cosa fare e cosa viene dopo.
- **DNA invariato**: pergamena, colore = lingua; il percorso ha icona e nome, **mai un
  colore proprio** (il colore resta della lingua).
- **Onestà dei controlli**: mai un controllo cliccabile senza effetto; ciò che il percorso
  non usa non si mostra.
- **Didattica visibile e dosata**: gli hint del metodo sbloccati, poi dosati per scopo
  (distesi in Passo dopo passo e Versione d'autore, compressi a ℹ nei rapidi) — mai spenti.
- **Il tempo è un'informazione, non una minaccia**: niente countdown; in Simulazione il
  progresso è «frasi fatte N/M» (timer eliminato dalla v1).
- **Copy come contratto**: ogni testo che nomina posizioni o conteggi si genera dalla
  scheda-percorso, così le parole migrano coi meccanismi e non fossilizzano.

---

## 4 · Ordine dei lavori (riconciliato dalle due critiche)

| # | Intervento | Rischio | Nota |
|---|---|---|---|
| 1 | ✅ **FATTO** — Sblocco didattico MIRATO: neutralizzare la regola CSS ≈4511-4535 **solo** per `.wizard-instructions` + hint del metodo (participio/⌖/aggancio), **con rilettura del copy riesumato**; emettere `f.hint` nel quick-menu verbi dello scheletro | nullo | valore massimo; ogni percorso futuro ne dipende. NON strappare l'intera regola: metà delle classi porta copy dell'era del profilo |
| 2 | ✅ **FATTO** — Bonifica copy fossile: 6/6→9, «3 step»→7 fasi, `<\strong>` ≈31222, aria-label, riferimenti a controlli rimossi | nullo | |
| 3 | ✅ **FATTO** — Campo `percorso` + scheda-percorso `PERCORSI` (fonte unica) + migrazione 3→4 + `?percorso=` nel bootstrap | basso | **Variante adottata:** dove l'inferenza non è sicura (progetti «per strati») il percorso resta **vuoto** invece di ricevere il default — non si scrive ciò che non si sa; i progetti senza percorso restano al metro storico. `disponibile:false` tiene fuori dalle superfici i percorsi progettati-non-costruiti. |
| 4 | ✅ **FATTO** — Card all'avvio, prima ondata ONESTA: solo percorsi che sono puri preset sugli assi esistenti (Versione per casa · Passo dopo passo interim). Miniatura del nastro, tempo per-frase, stima alla soglia, regola di primo ingresso, percorso stampato nell'export | basso | **niente card vaporware**: una card entra nel pannello solo quando il percorso esiste |
| 5 | ✅ **FATTO** — Contabilità parametrica: `MODULI_METRO` (otto moduli pesati, ognuno con predicato per frase) + campo `metro` in ogni scheda-percorso; `projectCompletion`/`projectStatus`/`projectPhases` leggono il metro **a firma invariata** (i 20 call-site non toccati); badge di percorso in Archivio e icona nelle card di ripresa, col **tooltip che dice cosa manca** | basso | **Scoperta**: la lacuna vera non era lo scheletro ma la **traduzione mai pesata** — una versione analizzata e *mai tradotta* risultava «100% Completato» (ora 70%, «manca: Brutta · Bella copia»). `meta.completatoAt` → 100% e `done`: la dichiarazione di chi traduce vince sul conteggio. I progetti **senza percorso restano al metro storico** (`METRO_STORICO`, identico al precedente). Un percorso senza traduzione (Ripasso) chiude la fase e cambia anche l'etichetta di ripresa |
| 6 | ✅ **FATTO** — Semantica del cambio percorso: `esitoCambioPercorso` (che cosa il nuovo metro aggiunge/toglie e che cosa resta in sospeso) + `cambiaPercorso` con la **domanda** che compare SOLO quando c'è qualcosa in gioco; stato terzo **`meta.daRivedere`** (moduli + `perche` + frasi segnate una per una) con peso **½** nel completamento, `data-state="review"` nel semaforo, banner con «l'ho riletta» su ogni superficie di lavoro, tratteggio sui campi da rileggere; **riconciliazione con i tre assi** (`riconciliaPercorso` + `percorsoAdattato` + «Rimettimi nel percorso»); percorso, copertura dei moduli e cambi **stampati in tutti gli export** | basso | **Regole scelte**: si segnala solo un arricchimento a monte che comporti lavoro NUOVO (un modulo aggiunto ma già compiuto non allarma nessuno); una versione **consegnata** non si tocca; **de-escalation libera** — il freno all'abuso del percorso corto è la visibilità (`storicoPercorsi` negli export), non il divieto; riscrivere **è** rileggere, e la conferma esplicita vale quanto la riscrittura. **Difetto trovato e chiuso**: `datiDi` scartava `percorso`, quindi PDF/Word/SVG/PNG stampavano una percentuale calcolata col metro storico. Nessun bump di schema: il campo è additivo e la sua assenza significa già «nulla in sospeso» |
| 7 | ✅ **FATTO** — Refactor scheletro playlist-driven: **`TAPPE`** = catalogo unico (label · `sede` · `modulo` · e per le tappe di sede `scheletro` anche `icona`/`hint`/`corpo`/`entrando`/`terminale`); le `playlist` dei percorsi da elenchi di ETICHETTE diventano elenchi di **chiavi**, e le fasi dello scheletro sono `tappeScheletroDi()` = la playlist filtrata per sede; il **cursore è una chiave** (`scheletroTappa`, col numero scritto accanto per compatibilità) invece di un indice; azione terminale **dichiarata dall'ultima tappa**; il **seed dell'ordo** è `entrando` sulla tappa `ordo`, non più `if (step === 7)` | medio | **Verificato**: «Versione per casa» → 7 fasi, «Simulazione» → 3 (stepper e navigazione si accorciano da sé, nessuna riga del renderer lo sa), senza percorso → le 7 canoniche (`SCHELETRO_CANONICO`, ripiego: non si inventa una playlist a chi non l'ha). Il cursore **ricorda la tappa** anche quando un percorso più corto non la prevede: tornando indietro si riprende da lì. `sede:'progetto'` marca le tappe disegnate e non costruite (Analisi automatica, Stemma a barre): dicono il piano nella miniatura e non entrano in nessun motore. Playlist di «Versione per casa» corretta: comincia da **Frasi** (9 tappe, non 8) perché è di lì che si parte davvero. Rimossa la facciata numerica `get/setScheletroStep`, senza più chiamanti. ⚠️ **Nuovo baseline `brace_check` = 10** (era 11): l'array `STEPS` cablato conteneva un falso positivo dell'euristica. Fa fede `node --check` |
| 8 | ✅ **FATTO** — Collaudo mobile: **otto criteri misurabili** su 15 superfici, banco reale di 12 frasi / 45 sintagmi, viewport 375×812. Esito **120/120**; criterio del tocco verificato con `elementFromPoint` su **723 comandi**. Protocollo e avvertenze in **`docs/COLLAUDO-MOBILE.md`** (leggerlo prima di ripetere il collaudo) | — | **Guasto strutturale trovato**: `.app` è una griglia a colonna *implicita* (= `auto`), e con `.topbar`/`.bottombar` a `min-width: auto` diventava **403px su 375** — `overflow: hidden` TAGLIAVA 10px a destra di ogni blocco, non scorribili. Cura `minmax(0, 1fr)`, desktop invariato. Inoltre: nessun comando arrivava ai 44px (min 27 · mediana 36) → 44 alla navigazione e 32 ai densi, **sul puntatore** non sulla larghezza; 154 dichiarazioni sotto 11px nel foglio → pavimento alzato solo dove misurato, con `.app` a pari specificità invece di `!important`; 114 textarea dell'ordo sotto i 44px. ⚠️ **Il metro ha prodotto 3 falsi allarmi** prima di dire il vero (contenuto di `<details>` chiusi, elementi sotto le bande appiccicate, elementi scorsi fuori dall'editor) e **una regressione introdotta dalla cura** (il ✕ dell'ordo portato a 32px finiva sopra l'etichetta). Tutto documentato: ogni «guasto» va verificato prima di ripararlo |
| 9 | ✅ **FATTO** — Percorsi rapidi: **Simulazione di compito** (4 fasi: Analisi automatica → Verbi → Proposizioni → Ordo e brutta) e **Ripasso lampo** (3 fasi: Verbi → Proposizioni → Stemma a barre, ingresso dall'Archivio), più il **rientro selettivo** — dalla resa di frase, «⤴ Sintagmi di questa frase» riapre lo STESSO editor logico in un pannello, e chiudendolo si torna esattamente dov'eri | medio | **Nuovo campo `ingresso`**: «costruito» e «da dove si comincia» erano la stessa cosa e non lo sono — il Ripasso è eseguibile ma non è un modo di *iniziare* una versione (`percorsiDaAvvio()` / `percorsiDaArchivio()`). Le due tappe mancanti costruite sul già esistente: `autoanalisi` chiama `autoAnalyzeAllSentences` in `entrando` e mostra che cosa ha deciso la macchina (misurato: 0→9 parole su 27, con i campioni in chiaro); `stemma` riusa `renderSyntaxTree` **senza forzarne la vista**, così il commutatore che porta con sé continua a funzionare, e imposta «barre» come default solo se lo studente non ha già scelto. **Difetto trovato**: il preset di Simulazione diceva «per strati» mentre la sua playlist è tutta di tappe dello scheletro — gli assi non portavano mai dove il percorso prometteva. Il pannello del rientro è agganciato a `renderEditor()`: senza, una modifica fatta da dentro cambiava il dato e lasciava il pannello fermo |
| 10 | ✅ **FATTO** — in **tre commit separati**. (a) **Pill «Percorso»** nella sede unica (compare su tutte le superfici di lavoro), che apre il pannello delle card in corsa e passa dal rito del punto 6; **estinzioni** del lessico bandito nelle superfici utente. (b) **Commit di sole delezioni** (22 righe aggiunte contro 252 tolte) con **`docs/WHITELIST-DELEZIONI.md` scritta prima**: cade il ramo `frase-per-frase`, il modale «approccio», `renderApproachBanner` e le sue 9 chiamate, 38 righe di CSS orfano. (c) Le due scoperte della terna + l'ultima parola bandita | medio | **Il prerequisito che rende possibile il taglio**: `getApproach()` DERIVA dagli assi invece di leggere il campo persistito — era da lì che il ramo restava *raggiungibile* (la migrazione normalizza `approach` solo se mancano gli assi). **Resta `MIGRAZIONI[1]`** col ramo `frase-per-frase`: è compatibilità coi DATI, non codice vivo. ⚠️ **La whitelist conteneva un errore**: dava `setApproach()` per orfano e non lo era (lo chiama un pulsante vivo) — ripristinato, e cade invece `quickSwitchApproach`. Una whitelist si verifica contando i chiamanti uno per uno. **La terna ha trovato due difetti veri**: la pill si fidava di un flag memorizzato invece di guardare gli assi (ora `assiCombaciano()` a ogni render), e un brano senza `currentSentenceIdx` mostrava «Frase non trovata» (invariante garantita in `_riparaCampiEssenziali`). **I tre segmentati restano**: la pill è il controllo primario, non l'unico — un brano senza percorso deve restare governabile; la sostituzione piena si compie col punto 11 |
| 11 | ✅ **FATTO** — fusione guidata→motore, a micro-passi collaudabili. **1/n FATTO** (`33b1730`): `GUIDED_STEPS_META` e la playlist di «Passo dopo passo» erano **lo stesso elenco scritto due volte** — la prosa resta verbatim ma vive in **`GUIDATA`** indicizzata per chiave, l'ordine lo da' la playlist (`tappeGuidateDi`), e ogni tappa porta il proprio **predicato di completamento** (`compiuta` + `globale`) e il proprio **corpo**: via tre catene di `if (step === N)`. **2/n FATTO** (`c742820`): cursore a **chiave** (`guidataTappa`) come lo scheletro; **nessun 9 cablato** (il badge `/9` era il vizio del «6/6» del punto 2, pronto a rimentire); la **scheda interna d'analisi** la dichiara la tappa invece della posizione; cade `clampVisibleGuidedStep` (nato per il profilo abolito). | **alto** | **Collaudo di ogni passo: «identico a prima», verificato non presunto** — 9 tappe rese con occhiello/titolo/istruzioni/corpo/navigazione, 9 predicati confrontati con l'atteso calcolato a mano, semantica per-frase intatta. **La prova che la fusione è vera**: con la playlist di «Simulazione» (due sole tappe con corpo guidato) il wizard rende «TAPPA 1 DI 2» con stepper e navigazione coerenti — nessuna riga sa più che le tappe siano nove. **3/n FATTO** (`0cd730e`): **macchina a stati sola** (`sedeEffettiva` · `vaiAllaTappa` · `tappaCorrente` · `tappaCompiuta`) e **NASTRO UNICO** appiccicato che mostra la playlist intera e governa entrambe le vie. Muoiono lo stepper dello scheletro, quello a fasi del wizard e il **doppio conteggio** («TAPPA 5 DI 9» contro «6 Sintassi»). Collaudo: 16 salti + salto incrociato fra i motori, desktop e greco. **Buco trovato**: saltando a una tappa guidata dalla scheda C il wizard non si raggiungeva. Le superfici guidate, mai misurate prima, avevano un tasto a **19px** (sotto il minimo WCAG di 24): ora tutte e 9 a norma. **4/n FATTO** (`7f52078`): la **sidebar** era due array quasi identici (cambiava solo la sezione «lavoro», le altre cinque voci copiate parola per parola) → uno solo; il **badge** diceva la POSIZIONE in guidata e il COMPLETAMENTO nel nastro, con la stessa grafica → uno solo, da `contoTappe()`; cade `hideForMedie` (scritto in 4 punti, letto in nessuno). **Tre vicoli ciechi trovati collaudando**: cambiando percorso si restava su una superficie che il nuovo percorso non usa (`approdaAlPercorso()`, che sposta solo se serve); il nastro spariva sulle schede fuori dal wizard in via guidata; il «sei qui» segnava la tappa del wizard anche stando sul Brano. **La catena dell'audit è chiusa**: nastro unico → sidebar → macchina a stati unica. La card «Passo dopo passo» **non è più interim** |
| 12 | **Stemma a barre trasversale** (nell'integrale/Simulazione; default del ciclo nei percorsi di metodo) · poi **Leggere tanto** v1 (senza trapianto lab) · infine **Versione d'autore** (branching sopra `PARTICIPIO_VALORE_REGOLE`, `sintagmaConParticipioProprio`, `suggerisciCapoAttributivo`) | basso/nuovo | chiude la promessa della guida pro |

### Tagli deliberati (prima ondata)

- «Leggere tanto» e «Versione d'autore» **fuori dal pannello card finché non esistono**.
- Ripasso lampo non è un modo di *iniziare* una versione: il suo ingresso è l'**Archivio**.
- Timer in Simulazione: eliminato (resta «frasi fatte N/M»).
- Escalation/de-escalation suggerite: dopo la contabilità parametrica.
- Motore-playlist L0-L10 come **modello concettuale**, non engine astratto subito
  (framework prematuro): si parte parametrizzando lo scheletro.

---

## 5 · Perché così

La domanda chiedeva percorsi «strutturati, strutturali, funzionanti, efficienti, intuitivi,
spediti». La risposta strutturale è **una sola catena di moduli** con playlist per scopo:
- *strutturata*: la scheda-percorso è l'unica fonte di verità (card, pill, nastro, export);
- *funzionante*: si compone da pezzi già vivi (scheletro, auto-analizza, seed ordo, stemma);
- *efficiente*: nessun renderer duplicato; il wizard si fonde invece di raddoppiare;
- *intuitiva*: si sceglie per scopo con parole da studente, e la playlist si vede;
- *spedita*: Simulazione ~10 clic di struttura; Ripasso 10-15′; e il percorso pieno
  resta il default culturale, difeso dalla visibilità (export col percorso stampato),
  non da divieti.
