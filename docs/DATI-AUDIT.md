# Audit · Profilo utente e salvaguardia dei dati

> **Scopo:** che i progressi dello studente **non vadano persi**, che siano **esportabili e re-importabili**
> su un device nuovo e non sincronizzato, e che la loro lettura resti **sempre funzionante e reversibile**.
> Metodo: lettura del sorgente (4 lenti d'analisi) + verifica diretta dei punti critici. Luglio 2026.

Poetrify è un sito **statico** senza backend né account: **tutto vive nel `localStorage` del singolo
browser**. Non c'è rete di sicurezza. Perciò l'export non è una comodità: è **l'unica** forma di
sopravvivenza dei dati.

---

## 1 · Il guasto principale (verificato)

> ### Il «Backup completo» che l'app offre **non è re-importabile dall'app stessa**.

| | |
|---|---|
| **Cosa fa il bottone** | `Esporta il lavoro` → «JSON · Backup completo» chiama `exportJSON()` → `buildExportData()` (translator.html:38553), che ritorna `{ meta: state.meta, sentences: state.sentences }`. |
| **Cosa accetta l'import** | `importProjectsFromFile()` (translator.html:12452) richiede un array oppure `data.projects`. |
| **Esito** | Il file esportato **non ha** `projects`, né `app`, né `kind`, né `schemaVersion` → l'import risponde **«File non valido: nessun progetto trovato»**. |
| **Aggravante** | `buildExportData()` serializza **solo il brano corrente** (`state`), non l'archivio: «completo» è falso due volte. |
| **Nota** | La funzione corretta **esiste** — `exportAllProjects()` (12438) produce l'involucro giusto — ma è raggiungibile **solo dalla command palette**, non dal modale che lo studente usa. |

**Conseguenza:** uno studente che segue l'unica strada visibile crede di avere un backup, e ha un file
che al momento del bisogno viene rifiutato. È il peggior tipo di difetto: **fallisce nel momento in cui
serve**, quando l'originale non c'è più.

**Correzione minima (una riga):** il bottone del modale deve chiamare `exportAllProjects()`.
È il singolo intervento con il maggior ritorno dell'intero audit.

---

## 2 · Gli altri guasti critici

### 2.1 · Il lessico personale non è ripristinabile *per costruzione*

`modules/dictionary/personal-vocab.js` — il lessico che lo studente costruisce lemma dopo lemma —
espone `exportAsTsv()` e **nessuna funzione di import**. Il TSV è per giunta *a perdere* (la definizione
viene appiattita: `\t` e `\n` sostituiti da spazi). Su un device nuovo quel lessico **non torna**.

### 2.2 · Perdita silenziosa e definitiva su dato corrotto

Il pattern si ripete identico in `personal-vocab.js`, `search-history.js` e `shared/poetrify-manuali.js`:

```js
try { …JSON.parse(raw)… } catch (e) { return []; }   // solo console.warn, o nemmeno quello
```

1. Il dato si corrompe (scrittura interrotta da quota esaurita, estensione, sync di terzi).
2. La lettura restituisce **vuoto**: lo studente vede il lessico azzerato, **senza un avviso**.
3. La **prima scrittura successiva sovrascrive** la stringa grezza → il dato, che era ancora
   recuperabile, viene **distrutto**.

**Regola da adottare ovunque: mai sovrascrivere un dato che non si è riusciti a leggere.**

### 2.3 · Il profilo non esiste più come dato — e quello reale è il meno protetto

Rilievo inatteso: le chiavi `poetrify-user-profile`, `poetrify-student-profile`, `poetrify-level`
**non sono scritte da nessuna riga**: sono soltanto *cancellate* da una IIFE (translator.html:12320-12326).
Il sistema a fasce è stato abolito e sostituito da costanti (`getUserProfile()` → sempre `'triennio'`;
`applyLevelToBody()` → sempre `avanzato`). Il «Livello: Interm.» del dizionario **non legge da nessuna
parte**.

Il vero profilo condiviso oggi è **`poetrify-manuali`** (`shared/poetrify-theme.js`-style IIFE in
`shared/poetrify-manuali.js`, pagina `profilo.html` intitolata «I tuoi manuali»). Sono **libri, non
persone**: ottimo per la privacy di utenti minorenni. Era **il dato meno protetto dell'ecosistema**:
nessuna guardia di quota e una versione **inerte** (entrambe sanate in `a31cb88`).

> **Alla luce del perimetro (§4):** che il profilo resti fuori dall'export **non è più un difetto** —
> i manuali sono una dichiarazione locale, si ridichiarano in un minuto e non sono lavoro dello
> studente. Ciò che conta, ed è stato fatto, è che **non si distruggano** in silenzio.

> ⚠️ **Conseguenza sulla roadmap UX già pubblicata:** il Passo 4 chiede di «uniformare la tassonomia
> dei livelli» (Principiante/Intermedio/Avanzato). Applicato alla lettera **reintrodurrebbe una fascia
> deliberatamente abolita**. Va riscritto in: *rimuovere i residui del livello* (mockup «Livello: Interm.»,
> API morte, classi di gating senza CSS).

### 2.4 · La versione del profilo è inerte (nessuna reversibilità possibile)

`shared/poetrify-manuali.js:40` esegue **sempre** `p.v = VERSIONE;` — **stampa** la versione invece
di **leggerla**. Non esiste catena di migrazione. Un domani un backup `v2` aperto da un'app ferma alla
`v1` verrebbe ri-etichettato `v1` e riscritto **perdendo i campi nuovi**, in silenzio. È l'opposto
esatto dell'obiettivo di reversibilità — e contrasta col modello corretto del translator
(`meta.schemaVersion` + `_migrateProject`).

---

## 3 · Il quadro completo per severità

| Sev. | Guasto | Dove |
|---|---|---|
| 🔴 | Il «Backup completo» non è re-importabile *(verificato)* | translator: modale → `exportJSON()` |
| 🔴 | Nessun bottone di **importazione**: il ritorno dei dati è solo nella command palette | translator |
| 🔴 | Lessico personale: **nessun import** esiste | `personal-vocab.js` |
| 🔴 | Archivio progetti: lettura corrotta → array vuoto → **l'autosave a 30 s sovrascrive tutto** | translator |
| 🔴 | Il profilo (manuali) è **fuori da ogni export** e non ha import | `poetrify-manuali.js` |
| 🔴 | Import **distruttivo e non annullabile**: un backup vecchio sovrascrive il lavoro nuovo e annuncia «successo» | translator |
| 🟠 | `schemaVersion` **scritto ma mai letto**, e timbrato al ribasso → la versione dichiarata diventa falsa | translator, manuali |
| 🟠 | Nessuna difesa contro un file di versione **futura**: nessun degradare con grazia | tutti |
| 🟠 | Nel dizionario l'esito di scrittura è **buttato via**: a quota piena il salvataggio fallisce in silenzio | `personal-vocab.js` |
| 🟠 | Il lessico è il maggior consumatore di quota (incorpora la **definizione intera**) e nessuno lo sa | `personal-vocab.js` |
| 🟠 | I cap **1000** (lessico) e **20** (ricerche) tagliano in silenzio, e tagliano **il più vecchio** | dizionario |
| 🟠 | L'unico avviso di perdita dati dura **2,4 s** e rimanda a un comando nascosto | translator |
| 🟡 | Validazione dell'import ferma a due campi: un file troncato entra e rompe la lista | translator |
| 🟡 | Reversibili e *a perdere* presentati come pari nella stessa griglia (e l'etichetta più rassicurante è quella falsa) | modale export |
| 🟡 | Il **corpus non persiste nulla**: il progresso di lettura riparte da zero e resta fuori da ogni backup | corpus |
| 🟡 | Condizioni reali (scuola, telefoni, iOS che evince i dati dopo 7 giorni) cancellano i dati: l'app non prepara mai lo studente | tutti |

---

## 4 · La soluzione proposta

> ### ⚠️ Perimetro (deciso dal docente, lug 2026)
>
> **Import ed export valgono per la SEZIONE DI LAVORO: la traduzione del brano
> della versione.** È quello il lavoro dello studente — il testo, la
> scomposizione, l'analisi, la bozza, la bella copia — ed è quello che non deve
> andare perso e deve poter riprendere su un altro dispositivo.
>
> Profilo, lessico personale, cronologia, preferenze e corpus **non sono
> materia di portabilità**: sono corredo locale del dispositivo. Per loro vale
> la **salvaguardia** (§4.2: mai distruggere un dato illeggibile, nessun
> fallimento muto), non il trasferimento.
>
> Di conseguenza il formato unico a sezioni descritto qui sotto è **superato**:
> resta agli atti come ragionamento, ma **non va implementato**. Il formato di
> riferimento è quello che il translator già produce — l'involucro
> `{ app, kind, schemaVersion, exportedAt, count, projects }` — su cui
> concentrare versione, migrazione, anteprima e annullamento.

### 4.1 · ~~Un solo file per tutto l'ecosistema~~ *(proposta superata: vedi il perimetro qui sopra)*

Formato **`.poetrify.json`**, involucro auto-descrittivo, **sezioni indipendenti**:

```jsonc
{
  "app": "poetrify",
  "kind": "backup",
  "schemaVersion": 2,          // versione dell'involucro
  "minReaderVersion": 1,       // sotto questa, il lettore sa di non poter leggere tutto
  "exportedAt": "2026-07-30T18:12:00.000Z",
  "writtenBy": { "superficie": "dizionario", "build": "2026-07-30" },
  "leggimi": "Backup di Poetrify. Per ripristinarlo: apri Poetrify → Profilo → Importa. Ogni sezione è indipendente: se una non è leggibile, le altre vengono comunque ripristinate.",
  "sezioni": {
    "profilo":    { "schemaVersion": 1, "dati": { … } },   // i manuali
    "progetti":   { "schemaVersion": 3, "dati": [ … ] },   // le traduzioni
    "lessico":    { "schemaVersion": 1, "dati": [ … ] },   // il lessico personale
    "ricerche":   { "schemaVersion": 1, "dati": [ … ] },
    "preferenze": { "schemaVersion": 1, "dati": { … } },
    "corpus":     { "schemaVersion": 1, "dati": { … } }    // segnalibri (nuovo)
  },
  "integrita": { "conteggi": { "progetti": 4, "lessico": 312 } }
}
```

**Perché così**

- **Sezioni indipendenti** → se una si corrompe, le altre si ripristinano lo stesso: *degradare con
  grazia*, mai rifiutare tutto in blocco.
- **`minReaderVersion`** → un'app più vecchia sa **cosa** non riesce a leggere e lo **dice**, invece di
  fallire o troncare.
- **`leggimi` + `integrita`** → il file resta comprensibile a un umano e verificabile anche fra anni.
- **Conservazione dei campi sconosciuti come contratto** (non come effetto collaterale): ciò che il
  lettore non riconosce viene **ri-scritto identico** → round-trip senza perdite, in entrambe le direzioni.

### 4.2 · Le quattro regole non negoziabili *(valgono ovunque, anche fuori perimetro)*

1. **Mai sovrascrivere ciò che non si è potuto leggere.** Su parse fallito: la stringa grezza va in
   **quarantena** (`poetrify-corrotto.<timestamp>`), si avvisa l'utente, *poi* si riparte da vuoto.
2. **L'import non distrugge mai.** Prima di applicare: **snapshot** dello stato corrente + **anteprima**
   («2 progetti nuovi, 1 aggiornato, 3 lemmi in conflitto») + **«Annulla import»** per tutta la sessione.
3. **Nessun fallimento muto.** Ogni scrittura restituisce un esito e ogni esito arriva all'interfaccia:
   quota piena → avviso **persistente** (non un toast di 2,4 s) con l'azione «Esporta ora».
4. **La versione si legge, non si timbra.** `schemaVersion` pilota una catena di migrazioni; in scrittura
   si stampa la versione reale.

### 4.3 · ~~Il modulo condiviso a sezioni~~ *(superato: serviva al formato unico del §4.1)*

> Le funzioni utili — **anteprima**, **istantanea**, **annulla**, **stato del backup** — restano
> valide, ma vanno realizzate **dentro il translator**, sui progetti di traduzione, non in un modulo
> che raccoglie sezioni da tutto l'ecosistema.


`shared/poetrify-dati.js` — stesso pattern IIFE di `poetrify-theme.js`, espone `window.PoetrifyDati`:

| Funzione | Ruolo |
|---|---|
| `esporta(opzioni)` | costruisce l'involucro interrogando le sezioni registrate |
| `anteprima(file)` | legge **senza applicare**: dice cosa entrerebbe e cosa è in conflitto |
| `importa(file, scelte)` | applica con snapshot preventivo, restituisce i conteggi |
| `annullaUltimoImport()` | ripristina lo snapshot |
| `statoBackup()` | «ultimo backup: 12 giorni fa» → badge nell'header |
| `registraSezione(nome, adattatore)` | ogni superficie registra `{ leggi, scrivi, migra, identita }` |

Così il modulo **non conosce** i dettagli delle singole sezioni, e ogni ramo resta padrone dei propri dati:
è lo stesso principio di `shared/poetrify-tokens.css` applicato alla persistenza.

### 4.4 · Conflitti fra due device

Regola di identità esplicita: i progetti si riconoscono per `id`. In caso di conflitto **non si sceglie
in silenzio**: l'anteprima elenca i casi e propone *«tieni il mio / tieni quello importato / tieni
entrambi»*. I timestamp **non** fanno da arbitro automatico — gli orologi dei device scolastici non sono
affidabili.

---

## 5 · Ordine di lavoro

Rivisto secondo il **perimetro del §4**: portabilità = **solo il lavoro di traduzione**; per il resto,
salvaguardia locale.

| # | Intervento | Stato | Effetto |
|---|---|---|---|
| **1** | Il bottone «Backup completo» chiama `exportAllProjects()` | ✅ **fatto** (`a31cb88`) | Il backup smette di essere finto |
| **2** | Quarantena su dato illeggibile + mai-sovrascrivere | ✅ **fatto** (`a31cb88`) | Elimina la perdita **silenziosa e definitiva** |
| **3** | Pulsante «Importa» visibile + formati reversibili distinti da quelli a perdere | ✅ **fatto** (`a31cb88`) | Il backup sa tornare indietro |
| **4** | Anteprima dell'import + istantanea + «annulla» *sui progetti* | ✅ **fatto** (`aa4bc0c`) | Chiude la reversibilità sul lavoro che conta |
| **5** | `schemaVersion` **letto** (non timbrato) e catena di migrazioni | ✅ **fatto** (`44ffbdb`) | Un file vecchio o più nuovo resta leggibile |
| **6** | Validazione dell'import oltre i due campi, col **motivo** del rifiuto | ✅ **fatto** (`44ffbdb`) | Un file malformato non entra e non rompe l'archivio |
| **7** | Avviso di quota **persistente** con «Esporta ora» | ✅ **fatto** | La memoria piena si vede prima del danno |
| **8** | Badge «ultimo backup: N giorni fa» | ✅ **fatto** | Rende passiva una disciplina che nessuno ricorda |

Con questi, il perimetro del §4 è **coperto**: il lavoro di traduzione si esporta in un formato che si
rilegge, si reimporta vedendo prima che cosa accadrà e potendo tornare indietro, sopravvive ai cambi di
versione, e l'utente viene avvertito *prima* che la memoria lo tradisca.

**Fuori perimetro** (restano a titolo di salvaguardia locale, non di trasferimento): formato unico a
sezioni, profilo/lessico/corpus nell'export, persistenza del corpus. Il backup del lessico personale
già realizzato (`3d7fc7a`) resta come **comodità locale** — utile a chi vuole portarsi via un elenco —
ma non è la strada della portabilità dell'ecosistema e non va generalizzato.

---

## 6 · Limiti di questo audit

- Le fasi di *progetto* e *critica avversariale* del workflow sono state interrotte dal limite di
  sessione: **il progetto del §4 è stato redatto direttamente**, non passato al vaglio di critici
  indipendenti. Va considerato una proposta solida ma **non ancora stress-testata**.
- Il guasto del §1 e le strutture di `personal-vocab.js` / `poetrify-manuali.js` sono stati **verificati
  direttamente sul sorgente**. Gli altri rilievi provengono dall'analisi delle 4 lenti con riferimenti
  di riga: prima di intervenire su ciascuno, ricontrollare la riga citata.
- Non è stato misurato il **peso reale** dei dati in un uso da un anno scolastico: la stima «il lessico
  è il maggior consumatore di quota» è architetturale (incorpora le definizioni intere), non misurata.
