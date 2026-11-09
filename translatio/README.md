# Translatio · analisi e traduzione di frasi e versioni

Il banco di Poetrify per **analizzare e tradurre** un brano latino o greco: il brano
si divide in frasi, ogni frase si guarda parola per parola, la traduzione si scrive a
fronte. È un progetto nuovo, rifondato da capo nell'UX/UI, e per ora fa **solo questo**:
niente dizionario autonomo, niente corpus, niente grammatica (restano nelle loro pagine).

- In locale: dalla radice del repository `python3 -m http.server 8000`, poi
  `http://localhost:8000/translatio/`
- Online (dopo il merge su `main`): `…/Poetrify-Translatio/translatio/`

## Il flusso: tre tappe, una sola strada

```
TESTO  →  ANALISI  →  TRADUZIONE
```

1. **Testo.** Si incolla il brano; il programma lo divide in periodi (latino: `. ? !`;
   greco: `. ;`). Le frasi si correggono: ⤓ unisce una frase alla successiva, *Dividi*
   fa cominciare una frase nuova dalla parola toccata. Se il testo sembra dell'altra
   lingua, un avviso propone di cambiarla.
2. **Analisi.** La frase è la protagonista e non cambia mai di posto; cambiano le
   **lenti** che le si appoggiano sopra:
   - **Parole**: lemma, parte del discorso, analisi morfologica, significato. Il
     filetto sotto la parola ha il colore della parte del discorso: *tratteggiato*
     finché è una proposta del programma, *pieno* quando lo studente l'ha confermata.
   - **Sintagmi**: si toccano la prima e l'ultima parola di un gruppo e se ne sceglie
     la funzione logica. Il filo sotto il gruppo ha il colore del **caso** (codice di
     categoria della collana: nominativo blu di Prussia, accusativo giallo indiano…).
   - **Proposizioni**: stesso gesto; principale, coordinata o subordinata (col grado),
     e il tipo. Il filo sta sopra le parole: lingua per la principale, ottone per le
     dipendenti, tratteggio per le coordinate.
   - **Resa**: glossario della frase, la costruzione nell'ordine italiano (soggetto,
     predicato, oggetto, complementi, ricavata dai sintagmi), brutta e bella copia.
3. **Traduzione.** La versione intera, testo a fronte: una riga per frase, la brutta e
   la bella sono due stati della stessa riga. In calce l'**apparato lessicale** con i
   significati scelti. Copia, scarica in Markdown, stampa (la stampa toglie i comandi).

## Le scelte di UX/UI

| Scelta | Perché |
|---|---|
| Tre tappe nominate in parole da studente, nessun asse da configurare | Il translator storico aveva quattro assi (Profilo, Metodo, Vista, Guida) e combinazioni che non facevano niente: qui non c'è niente da scegliere prima di lavorare |
| La frase al centro, le analisi come lenti | La morfologia, la sintassi e il periodo si leggono *sul testo*, non in tre stanze diverse |
| Il programma propone, lo studente conferma | Ogni proposta dichiara la fonte (tabelle curate, lessico, paradigma, indizio): tratteggio = proposta, pieno = confermato. Una forma sbagliata vale meno di una forma assente |
| Le glosse automatiche (tradotte dall'inglese) solo nella scheda, segnate «da verificare» | Non entrano nel glossario, nell'apparato né nella stampa: sbagliano spesso |
| La scheda della parola come dizionario vivo | Forma grande con l'iniziale nel colore della lingua, **morfemi colorati** (tema, vocale tematica, suffisso, desinenza) dai paradigmi del progetto, letture possibili, correzione a mano, voce del lessico, rimando al Dizionario |
| La scheda sta dove lo schermo ha margine | ≥ 1280 px colonna fissa a destra; sotto, foglio dal basso (45 % tablet, 60 % telefono) con la frase sopra, scorrevole |
| Quattro classi di schermo della casa | < 768 la mano · 768–1279 il tablet · 1280–1799 il leggio (banco + scheda) · ≥ 1800 il tavolo (frasi · banco · scheda) |
| Il banco da lavoro sta fermo, scorrono i pannelli | Dal leggio in su la cornice non scorre: banco e scheda hanno ciascuno il proprio scorrimento |
| Proposte segnate ★, mai scelte al posto dello studente | Per i sintagmi le funzioni del caso (e quelle aperte dalla preposizione); per le proposizioni il tipo suggerito dal connettivo |
| Tastiera | ← → passano di parola in parola, Invio conferma e va avanti, `[` `]` cambiano frase, Esc chiude |
| Navigazione con l'hash, bidirezionale | Il tasto Indietro cambia vista, lente o frase; ogni stato ha un indirizzo |
| Local-first | Tutto nel `localStorage` (in try/catch); ogni versione si scarica e si riapre come file |

Il DNA visivo è quello della casa, letto dai token condivisi (`shared/poetrify-tokens.css`):
pergamena calda per il banco, **colore = lingua** (rosso pompeiano il latino, indaco il
greco) via `body[data-lang]`, ottone solo nei filetti, greco per codepoint in Times
(GFS Didot come ripiego), palette delle undici parti del discorso, codice di categoria
dei casi, tema scuro della casa.

## Che cosa riusa e che cosa è nuovo

**Riusato, senza copiarlo** (import diretti):
- `modules/engine/lexicon-engine.js` · forma → lemma, parsing, definizione, glossa;
- `modules/engine/taxonomies.js` · funzioni logiche per caso, tipi di proposizione;
- `modules/engine/conjunctions.js`, `prepositions.js` · connettivi e preposizioni greche;
- `modules/dictionary/italian-glosses.js` · glosse italiane curate;
- `data/<lingua>/` · lessico a shard, paradigmi segmentati in morfemi, glosse;
- `shared/poetrify-tokens.css`, `shared/poetrify-theme.js`, `vendor/fonts/`.

**Nuovo nel motore condiviso:**
- `modules/engine/classi-chiuse.js` · generato da `_build/estrai-classi-chiuse.mjs`, che
  *valuta* i dizionari scritti a mano dentro `translator.html` (parole d'altissima
  frequenza, sum/εἰμί, pronomi) invece di ricopiarli. In greco la chiave tiene spiriti e
  accenti: ἡ articolo, ἤ disgiuntiva e ἥ relativo restano tre parole.

**Nuovo in `translatio/`:**

```
translatio/
├─ index.html
├─ css/translatio.css          componenti (i valori stanno nei token condivisi)
├─ js/app.js                   rotte, stato della sessione, azioni, analisi in sottofondo
├─ js/stato.js                 modello della versione, salvataggio, esportazione
├─ js/esempi.js                quattro brani d'apertura
├─ js/motore/
│  ├─ testo.js                 frasi e parole
│  ├─ tratti.js                lingua comune dell'analisi (parsing, schede, paradigmi → tratti)
│  ├─ paradigmi.js             la forma ritrovata nella flessione: letture e morfemi
│  ├─ analizzatore.js          la proposta per ogni parola, il contesto, le preposizioni latine
│  └─ sintassi.js              funzioni per caso, proposte, proposizioni, costruzione
├─ js/viste/                   archivio · testo · analisi · traduzione
├─ js/ui/                      dom (template che escapa), icone
└─ collaudo/
   ├─ motore.mjs               il motore su Cesare e Senofonte, in Node
   └─ browser.cjs              il flusso intero su quattro classi di schermo (Playwright)
```

## Collaudo

```bash
node translatio/collaudo/motore.mjs
```

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

```bash
node translatio/collaudo/browser.cjs
```

Il secondo controlla, sulle quattro classi di schermo (telefono greco, tablet latino,
leggio greco in tema scuro, tavolo latino): nessun errore in console, nessuno
scorrimento orizzontale, nessun comando sotto i 24 px. Esito al 9 novembre 2026: conforme.

## Limiti dichiarati

- **Copertura del greco.** Il lessico conosce circa 81 000 forme greche (in buona parte
  verbi omerici): nei brani attici una parola su otto-dieci resta «da analizzare»
  (ἠσθένει, ὑπώπτευε, τελευτήν nell'esempio di Senofonte). Lo studente le completa a mano;
  la scheda dice che il lessico non le conosce invece di indovinare.
- **Ambiguità.** Il programma ordina le letture col contesto (la preposizione sceglie il
  caso, l'articolo greco concorda col nome) ma non decide: le letture alternative restano
  nella scheda, e il segno «+N» sotto la parola le conta.
- **Paradigmi latini pesanti.** Si caricano solo dove il lessico non dà l'analisi e quando
  si apre la scheda di una parola (per i morfemi), non per l'intero brano.
- **Nessuna traduzione automatica.** La traduzione la scrive lo studente: il programma dà
  lemmi, analisi, significati e la costruzione.

## Prossimi passi possibili

- La card di Translatio nell'hub (`app.html`) e la cucitura dal Corpus
  (`translatio/?lang=&text=&titolo=` funziona già).
- Promuovere le preposizioni latine (`PREPOSIZIONI_LATINE` in `analizzatore.js`) nel
  motore condiviso, dove `prepositions.js` ha per il latino solo un segnaposto.
- Un indice inverso delle forme greche dei paradigmi, per alzare la copertura.
- La tastiera che compila il primo gruppo vuoto (cifre 1-9) nella correzione a mano.
