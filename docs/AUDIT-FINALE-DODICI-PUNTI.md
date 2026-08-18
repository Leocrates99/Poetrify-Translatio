# Audit finale dei dodici punti

> Vaglio avversariale del lavoro svolto sull'ordine di `PERCORSI-TRADUTTIVI.md`.
> Non legge i commit: legge il codice, e prova a farlo cadere.
> **Tesi sotto esame:** «i dodici punti sono fatti; il translator ha un motore
> unico, playlist-driven, con un metro onesto, e nessuna promessa dell'audit è
> rimasta scoperta».
> **Verdetto: la tesi regge, con due eccezioni gravi — entrambe regressioni
> introdotte dal lavoro stesso, entrambe riparate qui.**

## 1 · Il metodo dell'audit

Tre passate, in ordine di severità crescente:

1. **statica** sul sorgente: funzioni orfane, numeri cablati, lessico bandito
   negli attributi visibili, chiavi di playlist che non esistono nel catalogo;
2. **differenziale** contro il file al commit `c421aca` (prima dei dodici
   punti): per ogni orfano, era già morto o l'ho ucciso io?
3. **dinamica** nel browser: le cuciture fra i punti, con casi costruiti apposta
   per farle cedere.

### Due falsi positivi del mio stesso strumento

Da dichiarare, perché la lezione del punto 8 vale anche qui — *un metro non
tarato mente più dell'oggetto che misura*:

- il cercatore di `TODO` ha segnalato un mio commento: **«METODO» contiene
  «TODO»**;
- l'estrattore delle chiavi del catalogo pescava anche le chiavi di altri
  oggetti (tassonomie greche, descrittori), producendo dodici «tappe mai
  usate» inesistenti.

Ogni reperto qui sotto è stato verificato uno per uno prima di essere scritto.

## 2 · I reperti

### 🔴 R1 — Il pannello di chiusura della versione era irraggiungibile

**Il meccanismo esatto.** Il pannello «✓ Ho finito: chiudi e salva» viveva in
**un solo punto**: dentro il ramo `frase-per-frase`, nella sua vista «bella
copia». Al punto 10 quel ramo è stato cancellato — correttamente, era codice
morto raggiungibile — e il pannello se n'è andato con lui.

Risultato: `chiudiVersione()` esisteva ancora ma **senza un solo ingresso**.
Nessuno poteva più segnare una versione come consegnata. E poiché tre punti
successivi avevano costruito sopra quello stato, la catena era morta con esso:

- punto 5: `if (p.meta.completatoAt) return 100` — ramo irraggiungibile;
- punto 6: «una versione consegnata non si tocca» — guardia mai attiva;
- il nome del file (`…_completo.json`), l'ordinamento per data di consegna e
  la riga «Consegnata il…» negli export — tutti su un dato mai scritto.

**Perché non l'ho visto allora.** La whitelist del punto 10 elencava *che cosa
cancellare*, e la terna verificava *che le superfici vive rendessero*. Nessuna
delle due poneva la domanda giusta: **quali funzioni utente vivono dentro il
ramo che sto cancellando?**

**Riparato.** Il pannello sta ora nella vista «Bella copia» viva — dove la
versione finisce. Verificato l'intero arco: il pulsante c'è, chiudere scrive
`completatoAt`, il metro dà 100%, il file prende `_completo`, l'export stampa
«Consegnata il 18 agosto 2026», il pannello a versione chiusa offre backup e
riapertura, e riaprire cancella la data.

### 🔴 R2 — Una tappa condizionale che sparisce teletrasportava lo studente

**Il meccanismo esatto.** Sei sulla tappa «Posizioni» (⌖) della *Versione
d'autore*; fai esattamente ciò che ti chiede — assegni il capo attributivo; la
condizione diventa falsa, la tappa esce dalla playlist. A quel punto
`getScheletroTappa()` non trovava più la chiave memorizzata e cadeva sul
**ripiego numerico**, pensato al punto 7 per tradurre i cursori dei brani
vecchi: prendeva la posizione (7) e la applicava a `SCHELETRO_CANONICO`,
atterrando su **«Ordo e brutta»** — quattro fasi più in là, senza spiegazione.

Il ripiego per i brani legacy sparava nel vivo.

**Riparato.** Quando la tappa memorizzata non c'è più, si approda alla **tappa
successiva della playlist di quel percorso** (o alla precedente, se non ce ne
sono altre dopo); il ripiego numerico resta solo per i cursori davvero legacy,
cioè quando non c'è alcuna chiave memorizzata.
Verificato con un caso **discriminante** — brano con incastonatura *e*
participio a valore proprio — dove il vecchio ripiego avrebbe dato «Ordo» e la
regola nuova dà «Agganci», che è la tappa giusta.

### 🟠 R3 — Tre funzioni orfanate da me e lasciate lì

- `_renderNastroTappeVecchio`: al micro-passo 3 ho **rinominato invece di
  cancellare** il vecchio nastro. Settanta righe di codice morto creato da me,
  subito dopo aver predicato al punto 10 la disciplina delle sole delezioni.
- `fpfAdvanceSentence` e `setFrasePerFraseStep`: residui del ramo
  `frase-per-frase`. La delezione del punto 10 aveva rimosso i chiamanti ma non
  le funzioni: **era incompleta**.

Rimosse. *(Restano 19 funzioni orfane, ma erano già tali prima dei dodici punti:
non le tocco qui — sarebbero un lavoro d'igiene con la sua whitelist.)*

### 🟡 R4 — La tappa ⌖ promette più di quanto il predicato dia

`suggerisciCapoAttributivo` riconosce l'incastonatura **stretta**
(`mMin > eMin && mMax < eMax`). Il caso più comune in latino —
`magnam victoriam`, l'attributo che comincia allo stesso token del suo capo —
**non scatta**: mMin e eMin coincidono. La tappa vale solo per i casi «a
cornice» (`in [magna] urbe`).

Il testo della tappa dice «le loro parole stanno DENTRO lo span di un altro
sintagma», che è vero ma lascia sperare in un rendimento maggiore.
**Non è un difetto del codice** (il predicato è preesistente e altrove è usato
bene, con l'adiacenza come ripiego): è una **promessa da calibrare**. Lasciato
come osservazione, non toccato.

### 🟡 R5 — `ancore.compiuta` è indulgente

Usa `some`: basta **un solo** aggancio dichiarato perché la tappa risulti
compiuta, anche se altre àncore restano vuote. Difendibile (agganciare non è
obbligatorio) ma incoerente con le altre tappe, che chiedono *tutte* le frasi.
Lasciato come osservazione.

## 3 · Che cosa ha retto

Verificato, non presunto:

- **coerenza del catalogo**: nessuna chiave di playlist manca dal catalogo
  `TAPPE`; ogni tappa con sede `scheletro` ha un corpo;
- **metro ↔ playlist**: nessun percorso chiede nel metro un modulo che nessuna
  sua tappa alimenti. (Il controllo segnalava `testo` e `frasi`: sono
  presupposti del brano, non tappe — falso positivo, non difetto);
- **percorso principale end-to-end**: creazione dall'avvio → lavoro su tutte le
  tappe → 100% → export `.md` con percorso e copertura stampati → archivio col
  badge;
- **le due vie**: un solo nastro, un solo cursore, un solo conteggio, su tutte
  le superfici, in latino e in greco;
- **console pulita** su scheda nuova, `brace_check` fermo a 10, `node --check`
  sul blocco principale con percorso esplicito.

## 4 · La lezione che vale oltre questo lavoro

**Cancellare un ramo morto richiede due domande, non una.** La prima —
«questo codice è raggiungibile?» — la whitelist del punto 10 se l'è posta bene.
La seconda — «**quali funzioni utente vivono qui dentro?**» — no. Un ramo
morto può ospitare una feature viva, e R1 è esattamente questo: la chiusura
della versione stava in affitto dentro un ramo condannato.

**Un ripiego pensato per i dati vecchi non deve poter scattare sui dati nuovi.**
R2 nasce da un ripiego corretto (tradurre i cursori legacy) che nessuno aveva
recintato: quando il punto 12 ha introdotto tappe che spariscono, quel ripiego
si è trovato a decidere un caso vivo per cui non era stato scritto.
