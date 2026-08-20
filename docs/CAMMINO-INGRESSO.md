# Il cammino d'ingresso · dalla home al banco di lavoro

> Mappato **cliccandolo**, non a memoria, e reso liscio dove si inciampava.
> Nasce dalla segnalazione «nulla è stato messo in funzione da dove sto
> guardando io»: il lavoro c'era, ma il cammino per arrivarci non era coerente.

## 1 · Il cammino, come è adesso

| # | Dove | La domanda | Le risposte |
|---|---|---|---|
| 1 | `app.html` | Che strumento ti serve? | **Translator** · Dizionario · Corpus · I tuoi manuali |
| 2 | `lingua.html?to=translator` | In che lingua? | **Latino** · Greco antico |
| 3 | `translator.html?lang=…` → **Π Panoramica del ramo** | **Da dove prendi il testo?** | **Incollala o fotografala** *(in colore pieno)* · **Prendila dal Corpus** — oppure *riprendi* un brano lasciato a metà |
| 4 | avvio · passo **1 di 3** | **Da quale libro viene?** | Dal manuale scolastico *(manuale, numero, pagina)* · Versione d'autore *(autore, opera, locus)* — e sotto, il **titolo della versione**, facoltativo |
| 5 | avvio · passo **2 di 3** | Il testo | incolli · **fotografi la pagina** |
| 6 | avvio · passo **3 di 3** | **Perché traduci oggi?** | tre card — casa · classe · simulazione — e nient'altro |
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

Ora la Panoramica parla della **fonte del testo** («Incollala o fotografala» ·
«Prendila dal Corpus», in quest'ordine per la ragione della §5) e l'avvio del **libro di provenienza**. Parole diverse
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

---

## 5 · L'ordine delle porte segue la statistica

Il cammino non è cambiato nella forma, ma in **quale risposta si incontra per
prima**, e la ragione è una sola per tutti e due i bivi: chi apre il translator ha
quasi sempre in mano una versione **già assegnata** — il manuale, la fotocopia, il
foglio. Il Corpus e la versione d'autore sono la via colta, non quella frequente,
e stavano per prime: chiedevano di scendere di un gradino per fare la cosa che si
fa quasi sempre.

Ora sono invertite in entrambi i punti. E nella Panoramica la via frequente porta
il **colore pieno della lingua**, perché dei due ingressi uno si prende quasi
sempre e il peso visivo lo dice senza costringere a leggerli tutti e due.

### Il riquadro non lascia più il vuoto

I due pulsanti stavano in cima e sotto restavano ~350px di niente, mentre il
pannello accanto — «Riprendi» — arrivava in fondo. Ora la colonna cresce e i due
si dividono l'altezza. Misurato: i pannelli stanno a **319 / 319**, e il vuoto
residuo è 21px, cioè il padding.

### Il titolo della versione si può scrivere

Il nome del brano si componeva da solo — «Latino · vers. 148, p. 212» — e non si
poteva dettare. Ora c'è il campo, **facoltativo**, e `avvioTitolo()` si è
sdoppiata: `avvioTitoloAutomatico()` compone, `avvioTitolo()` decide — il nome
scritto vince, il campo vuoto lascia l'automatismo.

Il segnaposto del campo **mostra il nome che verrebbe da sé**, così chi lo lascia
vuoto vede in anticipo come si chiamerà. E si aggiorna scrivendo: `avvioCampo`
non ridisegna di proposito — si perderebbe il fuoco mentre si scrive — quindi il
solo nodo del segnaposto si aggiorna a mano. Senza, scritto «148», prometteva
ancora «Brano del 20/08/2026».

### Il richiamo ai manuali non è più un link

«Aggiungili una volta sola →» era l'unico link testuale sottolineato della
schermata, e spariva accanto ai riquadri. È diventato un **mini pulsante a colore
pieno** — la classe `.cta-mini`, che vive in `shared/poetrify-tokens.css` e vale
su ogni superficie. Il perché sta nella regola: un richiamo che porta altrove è
un'**azione**, e le azioni hanno la forma del pulsante.

Attenzione alla cascata, ed è scritto anche nel CSS: una regola di contenitore
come `.avvio-nomanuali a` ha specificità (0,2,0) e batte `.cta-mini` (0,1,0),
ridipingendo il testo del pulsante col colore del fondo. Lì quella regola serviva
solo al link che spariva ed è stata tolta.

### Collaudo

| prova | esito |
|---|---|
| Panoramica, ordine | «Incollala o fotografala» prima, in `rgb(162, 46, 55)` |
| contrasto del pulsante pieno | **7,04:1** in latino chiaro · 7,39 scuro · 12,85 in greco |
| pannelli della Panoramica | 319 / 319, vuoto residuo 21px |
| avvio passo 1, ordine | «Dal manuale scolastico» prima |
| mini-CTA | bianco su pieno, 7,04:1, 33px · 44px al tocco |
| campo del titolo | 682×38, e il nome scritto vince sull'automatico |
| segnaposto vivo | vuoto → «Brano del 20/08/2026» · 148 → «Latino · vers. 148» · 212 → «…, p. 212» |
| avvio passo 3 | tre carte, una riga, nessun «altri percorsi» |

`brace_check = 10` · `node --check` OK · script verificato arrivare in fondo.
