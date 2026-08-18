# Il cammino d'ingresso · dalla home al banco di lavoro

> Mappato **cliccandolo**, non a memoria, e reso liscio dove si inciampava.
> Nasce dalla segnalazione «nulla è stato messo in funzione da dove sto
> guardando io»: il lavoro c'era, ma il cammino per arrivarci non era coerente.

## 1 · Il cammino, come è adesso

| # | Dove | La domanda | Le risposte |
|---|---|---|---|
| 1 | `app.html` | Che strumento ti serve? | **Translator** · Dizionario · Corpus · I tuoi manuali |
| 2 | `lingua.html?to=translator` | In che lingua? | **Latino** · Greco antico |
| 3 | `translator.html?lang=…` → **Π Panoramica del ramo** | **Da dove prendi il testo?** | **Prendila dal Corpus** · **Incollala o fotografala** — oppure *riprendi* un brano lasciato a metà |
| 4 | avvio · passo **1 di 3** | **Da quale libro viene?** | Versione d'autore *(autore, opera, locus)* · Dal manuale scolastico *(manuale, numero, pagina)* |
| 5 | avvio · passo **2 di 3** | Il testo | incolli · **fotografi la pagina** |
| 6 | avvio · passo **3 di 3** | **Perché traduci oggi?** | tre card + «Altri percorsi (2)» |
| 7 | avvio · **soglia** | Tutto pronto | il piano delle tappe, la stima sul brano reale, **«Entra nel banco →»** |
| 8 | **il banco** | — | nastro delle tappe, pill del percorso, la tappa corrente |

Chi prende il testo dal **Corpus** salta i passi 4-5 (autore, opera e locus
arrivano compilati) e incontra la domanda del percorso appena il testo è
scomposto.

## 2 · Le tre frizioni trovate, e come sono state chiuse

### 🔴 Le stesse parole per due domande diverse

La Panoramica offriva «Versione d'autore» / «Dal manuale»; il passo 1 dell'avvio,
subito dopo, offriva «Versione d'autore» / «Dal manuale scolastico».

Sono **due domande legittime e distinte** — la prima è *da dove prendi il testo*,
la seconda è *l'anagrafica del brano*, che serve a dargli un nome e a ritrovarlo
— ma con le stesse etichette, su schermate consecutive, sembravano la stessa
domanda posta due volte.

Ora la Panoramica parla della **fonte del testo** («Prendila dal Corpus» ·
«Incollala o fotografala») e l'avvio del **libro di provenienza**. Parole diverse
per domande diverse.

### 🔴 La scelta fatta in Panoramica andava perduta

Chi cliccava «Dal manuale» ritrovava il passo 1 con **nulla selezionato** e
doveva ridire la stessa cosa. Ora la scelta viaggia (`startAvvio(lang, origine)`):
la carta arriva già scelta, i campi *manuale · numero · pagina* già aperti, e
«Continua» già attivo.

### 🟠 L'intestazione non diceva mai dove sei

Diceva sempre «Tre passi e si comincia: da quale libro viene, il testo, come
lavorarci» — **identica su tutti e quattro gli schermi**. Il nastro dei tre passi
lo diceva, la testata lo ripeteva a vuoto. Ora nomina il passo e il suo scopo:
«Passo 2 di 3 · il testo: incollalo, oppure fotografa la pagina».

## 3 · Che cosa non ho toccato, e perché

- **I due click prima del translator** (`app.html` → `lingua.html`) restano: il
  ramo linguistico si sceglie a monte per disegno — in Poetrify *il colore è la
  lingua* — e comprimerli significherebbe far entrare qualcuno in un ramo che non
  ha scelto.
- **Il passo 1 non si salta** anche quando l'origine arriva dalla Panoramica: i
  campi di provenienza (manuale, numero, pagina) vivono lì e servono a dare un
  nome al brano. Si eredita la scelta, non si scavalca il passo.
- **La soglia resta un momento a sé**: non è un passo (il nastro segna tre passi
  conclusi) ma il punto in cui si vede il piano prima di entrare.

## 4 · Collaudo

Percorso cliccandolo, schermo per schermo, in locale e in linea:

- le sette schermate rendono, ognuna con la propria domanda e le proprie
  risposte, e il nastro segna correttamente `1 · ✓ · ✓` fino alla soglia;
- la scelta d'origine arriva nell'avvio: carta selezionata, campi aperti,
  «Continua» attivo;
- la via dal **Corpus** incontra la domanda del percorso (tre card + «Altri
  percorsi»), poi pill, nastro a 10 tappe e completamento;
- **mobile 375×812**: le cinque schermate del cammino a norma dopo aver alzato a
  11px le targhette di `avvio-campi`, `am-piano-k`, `apc-nodo` e `apc-flag` — è
  la prima superficie che si incontra, e lì una scritta illeggibile costa più che
  altrove.
