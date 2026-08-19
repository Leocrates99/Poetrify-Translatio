# Il leggìo · quando lo schermo è basso, il cromo si ritira

> La prima delle quattro classi di schermo a essere costruita, e la più urgente:
> è quella del portatile, cioè della macchina di tutti i giorni.

---

## 1 · La misura, sul monitor vero

Portatile **1536×864** px CSS — il pannello 1920×1080 mostrato al 125 %.
Nella scheda dell'analisi il brano cominciava a **y=667 su 864**, con **523 px**
di cose che parlavano prima del testo:

| | altezza | dice |
|---|---|---|
| nastro delle tappe | 78 | dove sei nel percorso, dieci nodi |
| pill del percorso | 30 | quale percorso |
| banner di revisione | 59 | perché è adattato — e **ripete il nome del percorso** |
| testata di sezione | 75 | «C · Analisi integrale» + **«21 parole · 1 frase»** |
| comandi rapidi | 40 | |
| testata del brano | 98 | incipit + **«21 parole · 1 frase»** + comando |
| **somma** | **380** | *(523 con gli stacchi)* |

**Due ridondanze non sono opinioni, sono misure.** «21 parole · 1 frase» compare
**due volte a 200 px di distanza**; «Versione per casa» pure (pill e banner). E
l'incipit del brano — «📜 Versione · Gallia est omnis divisa in partes…» —
annuncia parole che stanno due centimetri più sotto.

## 2 · La fascia

Una banda sola, **44 px**, ancorata in cima all'area che scorre, con le tre cose
che servono *mentre* si traduce:

**Percorso · Tappa (o Avanzamento) 3/10 · da rileggere**

Ognuna è una **porta**: il percorso apre il pannello dei percorsi, la tappa apre
il nastro intero, la spia apre gli avvisi. Niente si perde — si smette solo di
dirlo sempre. Verificato: aprendo il nastro il brano scende da 379 a 475, aprendo
anche gli avvisi a 593, richiudendo torna a 379.

**Il conto non dipende dal nome della tappa.** Nella vista a strati
`tappaCorrente()` è vuota per costruzione — lì non esiste *un* cursore di tappa,
il concetto appartiene allo scheletro e alla via guidata. Ma il conto è sempre
vero: è il completamento del percorso, lo stesso numero del pallino nel menù. Se
la tappa ha un nome lo si dice, altrimenti si annuncia l'avanzamento.

## 3 · L'innesco è l'altezza, non la larghezza

`@media (max-height: 900px)`. È il principio già archiviato nel canone — *le
classi di schermo si separano per asse scarso* — applicato: sul 2K esterno
(1440 px d'altezza) non cambia **niente**, e la stessa regola serve il portatile,
la finestra affiancata e il telefono, che hanno in comune l'altezza e non la
larghezza.

**E la fascia si disegna sempre, anche quando non si vede.** È il CSS a scegliere
chi mostrare. Renderla condizionale in JavaScript significherebbe far dipendere
il *contenuto* dalla finestra: al primo ridimensionamento senza ridisegno le due
verità divergerebbero.

## 4 · Collaudo

| | prima | dopo |
|---|---|---|
| il brano comincia a | **y=667** | **y=379** |
| guadagno | — | **288 px** |
| la frase intera in schermo | no | **sì** (379→552) |
| testata del brano | 104 px | 58 px |
| schermo alto (1000 px) | — | **invariato**: nastro 78, pill 30, banner 60, testata 75, brano 669 |

- **Tutte le schede**: la fascia compare su Brano («Tappa Brano»), Scomposizione
  («Frasi»), Analisi («Avanzamento»), Traduzione («Ordo e brutta») e nella via
  guidata; il contenuto comincia a 202 su ognuna.
- **Greco**: accento del percorso e filetto della fascia in blu Poetrify, brano a
  379, nessuno scroll orizzontale.
- **Contrasti**: minimo **4,96** in chiaro e **6,59** in scuro, niente sotto i
  10 px, bersagli da 32 px.

`brace_check = 10` · `node --check` OK · console pulita.

### Due difetti miei, trovati misurando

- la **spia di revisione** dava **4,48:1**, sotto la soglia per un pelo: l'ambra
  di marca al 12 % sotto `--warning-ink`. Alleggerito il fondo all'8 % — il
  problema era il fondo, non il corpo. Ora 4,96.
- le **targhette della fascia** stavano a 9,5 px, sotto il pavimento che vale in
  tutto il resto del menù e del cassetto. Ora 10.

## 5 · Rimasto fuori, e detto

Sopra il brano restano la fascia (44, ed è il punto), i comandi rapidi (47) e la
testata del brano (58). Comprimere oltre vorrebbe dire togliere **comandi**, non
ripetizioni: è una decisione diversa da questa, e va proposta prima di farla.
