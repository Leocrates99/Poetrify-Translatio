# Audit finale dei dodici punti

> Vaglio avversariale del lavoro svolto sull'ordine di `PERCORSI-TRADUTTIVI.md`.
> Non legge i commit: legge il codice, e prova a farlo cadere.
> **Tesi sotto esame:** «i dodici punti sono fatti; il translator ha un motore
> unico, playlist-driven, con un metro onesto, e nessuna promessa dell'audit è
> rimasta scoperta».
> **Verdetto: la tesi regge, con due eccezioni gravi — entrambe regressioni
> introdotte dal lavoro stesso — e due difetti preesistenti emersi chiudendo le
> osservazioni minori. Tutto riparato qui.**

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

### ✅ R4 — chiusa · e sotto c'era un difetto preesistente, non una promessa mal calibrata

L'osservazione iniziale era che la tappa ⌖ rendeva poco. Misurandola — e la
misura è stata rifatta due volte, perché la prima usava indici di token
inventati con una convenzione diversa da quella vera — è emerso altro.

**Difetto 1 · l'adiacenza era sfasata di uno.** `suggerisciCapoAttributivo`
cercava `mMin - eMax === 2` e commentava «parola adiacente». Ma gli indici di
*parola* sono consecutivi (passo 1, verificato con `tokenizeSentence`): quella
condizione descrive «una parola in mezzo», non l'adiacenza. Due parole
adiacenti non davano alcun suggerimento; ne dava una separata da una parola.
Preesistente, dal commit `2987735`.

**Difetto 2 · l'incastonatura era «strettamente interna».** Il test chiedeva
`mMin > eMin`, quindi non riconosceva come capo il sintagma che *contiene* il
complemento partendo dal suo stesso token. Conseguenza in una lingua a
concordanza: **`magnam` veniva proposto come attributivo di `Caesar`** invece
che di `victoriam` — il vicino dall'altra parte. Suggerire l'aggettivo al nome
sbagliato non è un dettaglio in un'app che insegna la concordanza.

**Chiuse entrambe.** L'adiacenza vale ora per distanza 1 (e resta lo scarto di
2, l'iperbato breve, con punteggio minore); l'incastonatura diventa
**contenimento** (il capo mi contiene e ha span maggiore).

Sui quattro casi latini di prova, prima e dopo:

| caso | prima | dopo |
|---|---|---|
| `magnam victoriam` (aggettivo adiacente) | proposto a **`Caesar`** ✗ | dentro `magnam victoriam` ✓ |
| `virtus militum` (genitivo adiacente) | nessun suggerimento ✗ | accanto a `Virtus` ✓ |
| `in [magna] urbe` (cornice) | dentro ✓ | dentro ✓ |
| `Magnam Caesar victoriam` (iperbato) | il **soggetto** proposto come attributivo ✗ | escluso ✓ |

La tappa distingue ora i due indizi nel testo («dentro» / «accanto a») e
esclude i **ruoli-nucleo** (soggetto, oggetto, predicato), che in posizione
attributiva non stanno mai: senza quel filtro, un soggetto incastrato in un
iperbato risultava candidato — la geometria diceva il vero, la sintassi no.

### ✅ R5 — chiusa · agganciare è facoltativo, decidere no

`ancore.compiuta` usava `some`: un solo aggancio decideva per tutte. La via
d'uscita non era essere più severi (`every` avrebbe preteso agganci che il
testo può non avere), ma rendere la cosa **decidibile**: si aggiunge
«∅ Non aggancia nulla» (con «↺ Ci ripenso» per ritrattare), e la tappa è
compiuta quando **ogni àncora è stata decisa**, in un senso o nell'altro.
Lo stato passa da «da decidere» a «non aggancia nulla», e il conto del nastro
lo segue.

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
