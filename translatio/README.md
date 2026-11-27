# Translatio · il banco dove lo studente analizza e traduce la sua versione

Translatio serve allo **studente** per analizzare una versione latina o greca e per
**esportare digitalmente l'analisi che fa lui**. Il programma non analizza: divide il brano
in frasi, offre le caselle della grammatica, **disegna** ciò che lo studente sceglie
(filetti, fili, colori) e alla fine lo impagina in un documento da consegnare.

È un lavoro **isolato**: non legge il lessico, i paradigmi, le glosse o il corpus di Poetrify
e non rimanda al Dizionario. Della casa usa solo i token grafici (`shared/poetrify-tokens.css`),
la chiave del tema (`shared/poetrify-theme.js`) e i caratteri (`vendor/fonts/`).

- In locale: dalla radice del repository `python3 -m http.server 8000`, poi
  `http://localhost:8000/translatio/`
- Online: `https://leocrates99.github.io/Poetrify-Translatio/translatio/`

## Il flusso: quattro tappe

```
TESTO  →  ANALISI  →  VERSIONE  →  CONSEGNA
           1 sintattica · 2 logica · 3 grammaticale · 4 traduzione
```

1. **Testo.** Lo studente incolla il brano. Il banco lo divide in periodi guardando solo la
   punteggiatura (latino `. ? !`; greco `. ;`), ed è una proposta grafica, non grammaticale:
   ⤓ unisce una frase alla successiva, *Dividi* fa cominciare una frase nuova dalla parola
   toccata.
2. **Analisi.** La frase sta al centro e non cambia mai di posto. Si analizza **dal periodo
   alla parola**, poi si traduce: quattro **livelli** numerati, in quest'ordine.
   1. **Sintattica · il periodo.** Si cercano i verbi; si toccano la prima e l'ultima parola
      di ogni proposizione, il ruolo (principale, coordinata, subordinata) la segna, poi se ne
      dicono il tipo e il grado. Il filo sta sopra le parole.
   2. **Logica · i sintagmi.** Dentro le proposizioni, stesso gesto: si sceglie la funzione
      logica (elenco per caso, con la ricerca). Il filo sotto il gruppo ha il colore del
      **caso** (codice di categoria della collana).
   3. **Grammaticale · le parole.** Si tocca una parola e nella scheda si scelgono la **parte
      del discorso** (le undici tinte della casa), poi i tratti che quella parte del discorso
      ha: caso, numero, genere, grado; modo, tempo, diatesi, persona; declinazione e
      coniugazione. Si scrivono il **lemma** (come sul dizionario), il **significato** in
      questa frase e, se si vuole, un'osservazione. Si può **scomporre la parola in morfemi**:
      si tocca la lettera da cui comincia un pezzo nuovo, e a ogni pezzo si dà un ruolo
      (prefisso, aumento, tema, vocale tematica, suffisso, desinenza), ciascuno col suo
      colore. Il filetto sotto la parola prende il colore della parte del discorso scelta;
      finché manca resta **punteggiato e grigio**. Sotto la parola compaiono sigla, lemma,
      analisi breve e significato.
   4. **Traduzione · la frase in italiano.** Il glossario della frase (lemmi e significati
      dello studente), la costruzione nell'ordine italiano rimessa in fila dai sintagmi,
      brutta e bella copia.

   I livelli **si sovrappongono**: ciò che è stato segnato nei livelli prima resta sotto quello
   su cui si lavora, più chiaro (nella logica le proposizioni sopra la frase; nella
   grammaticale proposizioni e sintagmi). In fondo al banco il **passo dopo** porta al livello
   seguente; dopo la traduzione, alla frase seguente dal livello sintattico; dopo l'ultima
   frase, alla Versione.
3. **Versione.** La versione intera, testo a fronte; brutta e bella sono due stati della
   stessa riga. In calce l'apparato lessicale coi lemmi e i significati dello studente.
4. **Consegna.** Chi consegna (nome, classe, data, docente), che cosa entra nel documento
   (nove voci, tutte accese all'inizio), un controllo di ciò che manca (parole senza parte
   del discorso, frasi senza bella copia, con il collegamento alla frase: non blocca nulla),
   e il **foglio** come uscirà. Tre modi di portarlo fuori:
   - **Stampa o salva in PDF**: la stampa del browser stampa solo il foglio, in A4;
   - **Scarica la pagina (.html)**: un file solo, con lo stile dentro e nessun file esterno,
     che si apre in qualunque browser; porta con sé il lavoro in JSON
     (`<script type="application/json" id="translatio-dati">`), e Translatio lo riapre;
   - **Scarica il file di lavoro (.json)**: per continuare su un altro computer.

## Il documento da consegnare

Un foglio A4 in veste C2 (`js/viste/documento.js`, `js/viste/stile-documento.js`):

- testatina con il titolo, l'autore, i dati dello studente e il filetto nero di 4 px;
- **il testo**, con le frasi numerate;
- per ogni frase, col numero appeso nella colonna di margine e nell'ordine dei livelli:
  **l'analisi disegnata** (le proposizioni sopra, i sintagmi sotto, la parte del discorso nel
  filetto, i morfemi a colori), l'**analisi sintattica** (il periodo), l'**analisi logica**
  (la costruzione), l'**analisi grammaticale** (la tavola delle parole: forma, analisi
  distesa, lemma, significato, poi le osservazioni), la **brutta** e la **bella**;
- **la traduzione** intera, **il lessico**, **la legenda** (solo i colori che il documento usa).

Il foglio ha classi sue (`d-…`) e colori suoi: è sempre bianco, anche col tema scuro
dell'applicazione, perché è la carta che si consegna. Lo stesso HTML serve all'anteprima,
alla stampa e al file scaricato.

## Le scelte di UX/UI

| Scelta | Perché |
|---|---|
| Nessuna proposta del programma | L'analisi è dello studente: il banco non suggerisce la parte del discorso, il lemma, la funzione o il tipo di proposizione. Disegna e impagina |
| Quattro tappe nominate in parole da studente | Niente da configurare prima di lavorare |
| La frase al centro, l'analisi in quattro livelli numerati | Dal periodo alla parola, poi la traduzione: l'ordine del metodo scolastico, e periodo, sintassi e morfologia si leggono *sul testo* |
| I livelli si sovrappongono | Quello che si è segnato prima resta visibile, più chiaro: la logica si fa dentro le proposizioni, la grammatica dentro i sintagmi |
| La tappa dopo l'analisi si chiama «Versione» | Il quarto livello è la Traduzione della frase: due voci «Traduzione» sullo stesso schermo porterebbero in due posti diversi |
| La scheda della parola come modulo | Si compila dall'alto in basso; si vedono solo i gruppi che quella parte del discorso ha (un infinito non chiede la persona; cambiata la parte del discorso, i tratti che non ha cadono) |
| La parola vuota non scrive nulla sotto di sé | Il filetto punteggiato dice già che manca; una scritta allargherebbe le parole brevi |
| I morfemi si tagliano toccando una lettera | Lo stesso gesto di *Dividi* nel testo; le lettere greche si tagliano con accenti e spiriti |
| La scheda sta dove lo schermo ha margine | ≥ 1280 px colonna fissa a destra; sotto, foglio dal basso (45 % tablet, 60 % telefono) |
| Quattro classi di schermo della casa | < 768 la mano · 768–1279 il tablet · 1280–1799 il leggio · ≥ 1800 il tavolo |
| Tastiera | ← → di parola in parola; **1–9 scelgono nel primo gruppo ancora vuoto** (i numeri compaiono sui bottoni, solo col puntatore fine); Invio va alla parola dopo (nel lemma, va al significato); `[` `]` cambiano frase; Esc chiude |
| Navigazione con l'hash, bidirezionale | Il tasto Indietro cambia vista, livello o frase; ogni stato ha un indirizzo (`#/v/<id>/analisi/<frase>/proposizioni · sintagmi · parole · resa`) |
| Local-first | Tutto nel `localStorage` (in try/catch); il lavoro esce solo quando lo studente lo scarica |

## La veste: C2 compatta

Translatio veste la **C2 compatta**, la veste dei documenti di studio del docente: una sola,
carta bianca e Inter (decisioni del 27 novembre 2026). Il foglio è `css/veste-c2.css`,
caricato dopo `css/translatio.css`, che porta la struttura e i componenti.

| Della C2, alla lettera | Adattato allo schermo |
|---|---|
| **carta bianca** e inchiostro, **un solo accento** per la cornice | i corpi 10 · 9 · 7 pt salgono di 1,2 (16 · 14,4 · 11,2 px); il documento da consegnare li tiene alla misura del foglio |
| **Inter** per tutto; **greco e latino in Times** | l'accento è della lingua: latino `#b8400e`, greco `#1d4ed8`; mai due in una pagina |
| **colonna di margine appesa**: numeri di frase e di sezione a sinistra del testo | il tema scuro, che la C2 non ha: stessa grammatica, valori misurati |
| tre pesi di filetto, nessun fondo, nessuna ombra, nessun angolo arrotondato | i contorni dei comandi in `#767676` (4,54:1) |
| tavole fra filetto nero di 2 px e di 1 px | **l'aggancio cromatico dell'analisi grammaticale resta**: le tinte delle parti del discorso, il codice di categoria dei casi, la palette dei morfemi |

**Il colore della lingua è l'accento della C2** (decisione del docente): latino `#b8400e`,
greco `#1d4ed8`; nel tema scuro `#f08a5d` e `#8aa9ff`. Non il rosso pompeiano e l'indaco
del resto di Poetrify: in Translatio la cornice ha un accento solo, quello della C2. I valori
stanno in testa a `css/veste-c2.css` e, per il foglio da consegnare, in `--d-accent`
(`js/viste/stile-documento.js`).

## I file

```
translatio/
├─ index.html
├─ css/translatio.css          struttura e componenti
├─ css/veste-c2.css            la veste C2 compatta
├─ js/app.js                   rotte, stato della sessione, azioni, tastiera
├─ js/stato.js                 la versione (schema 2), salvataggio, migrazione, file
├─ js/esempi.js                quattro brani d'apertura
├─ js/motore/                  moduli puri, nessun import fuori da translatio/
│  ├─ testo.js                 frasi e parole (tokenizzatore proprio)
│  ├─ grammatica.js            parti del discorso, tratti, etichette, morfemi
│  ├─ sintassi.js              colore dei fili, tipi di proposizione, costruzione
│  ├─ tassonomie.js            funzioni logiche e proposizioni (copia di modules/engine/taxonomies.js)
│  └─ traslitterazione.js      il greco in lettere latine, nella scheda
├─ js/viste/                   archivio · testo · analisi · traduzione · consegna
│  ├─ documento.js             il foglio da consegnare e la pagina .html autonoma
│  └─ stile-documento.js       il foglio di stile del documento, in una stringa
├─ js/ui/                      dom (template che escapa), icone
└─ collaudo/
   ├─ moduli.mjs               isolamento, frasi, grammatica, morfemi, migrazione, documento (Node)
   └─ browser.cjs              il lavoro intero su quattro classi di schermo (Playwright)
```

**I dati.** `versione = { id, schema: 2, lingua, titolo, autore, testo, frasi, posizione,
consegna }`; ogni frase ha `parole` (per posizione), `sintagmi`, `proposizioni`, `brutta`,
`bella`; ogni parola è `{ pos, tratti, lemma, senso, morfemi: [{ t, r }], nota }` e c'è
solo se lo studente ci ha scritto qualcosa. Le versioni dello schema 1 (Translatio con
l'analisi automatica) si aprono ancora: restano le parole che lo studente aveva confermato o
corretto, i significati, i sintagmi, le proposizioni e le traduzioni; le proposte mai
confermate cadono.

**La versione dei file.** `index.html` chiede ogni foglio di stile e ogni modulo con la
stessa versione (`?v=2026-11-27e`); i moduli interni la ricevono da un'import map. Così,
dopo un aggiornamento, il browser non mescola file nuovi e file vecchi rimasti in cache
(GitHub Pages li tiene 10 minuti). Quando si cambia un file, si alza la versione in tutte
le righe di `index.html`; il collaudo controlla che sia la stessa ovunque e che l'import
map elenchi tutti i moduli.

## Collaudo

```bash
node translatio/collaudo/moduli.mjs
```

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

```bash
node translatio/collaudo/browser.cjs
```

Il primo verifica fra l'altro che nessun modulo importi da fuori `translatio/js` e che
nessuno chiami il dizionario, il corpus o `data/`. Il secondo percorre, sulle quattro classi
di schermo (telefono greco, tablet latino, leggio greco in tema scuro, tavolo latino), il
lavoro dello studente dall'esempio alla consegna: nessuna parola analizzata prima che lo
studente la tocchi, la tastiera, i morfemi, sintagmi e proposizioni senza proposte, il
foglio, il file `.html` scaricato e riaperto, la stampa del solo foglio; nessun errore in
console, nessuno scorrimento orizzontale, nessun comando sotto i 24 px. Esito al 27
novembre 2026: conforme su entrambi.

## Limiti dichiarati

- **Nessun controllo di correttezza.** Translatio non sa se l'analisi è giusta: registra e
  disegna. Il controllo in Consegna guarda solo che cosa manca.
- **Il PDF passa dalla stampa del browser.** Si sceglie «Salva come PDF» al posto della
  stampante; i colori escono perché il foglio chiede la stampa esatta dei colori, ma alcuni
  browser hanno un'opzione «grafica di sfondo» da lasciare accesa.
- **La pagina .html non porta con sé Inter.** Usa Inter se è installato, altrimenti
  Helvetica o Arial; il latino e il greco restano in Times.
- **Le tassonomie sono una copia.** `js/motore/tassonomie.js` riprende alla lettera
  `modules/engine/taxonomies.js`: se una lista cambia là, va riportata qui a mano.
