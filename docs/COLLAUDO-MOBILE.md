# Collaudo mobile delle superfici di lavoro

> Punto 8 dell'ordine di `PERCORSI-TRADUTTIVI.md`. Serve a decidere le varianti
> mobile dei percorsi rapidi con misure, non con impressioni.
> Banco di prova: **12 frasi, 45 sintagmi, 78 parole** — Cesare, *De bello
> Gallico* I. Un brano vuoto non collauderebbe niente.
> Viewport **375×812**, puntatore grosso emulato.

## 1 · Gli otto criteri

Ogni criterio è una misura, non un giudizio. Passano o non passano.

| # | Criterio | Soglia | Perché |
|---|---|---|---|
| 1 | Nessuno scorrimento orizzontale del corpo | `scrollWidth − innerWidth ≤ 1px` | uno scorrimento laterale involontario fa perdere il segno |
| 2 | Nessun blocco tagliato a destra | nessun elemento con `right > innerWidth`, fuori dai contenitori scrollabili | ciò che esce da un `overflow: hidden` non è raggiungibile: è perduto |
| 3 | Bersagli tattili | **44px** navigazione · **32px** comandi densi · **24px** minimo assoluto | 44 è Apple HIG / WCAG 2.5.5 per ciò che si preme alla cieca; 24 è il minimo WCAG 2.5.8; portare *tutto* a 44 gonfierebbe la pagina fino a nascondere il lavoro |
| 4 | Nessuna scritta sotto **11px** | `font-size ≥ 11px` sugli elementi con testo proprio | sotto quella soglia le targhette non si leggono, si indovinano |
| 5 | Cromo fisso ≤ **⅓** dello schermo | somma delle bande `fixed`/`sticky` in vista | oltre, l'area di lavoro diventa una feritoia |
| 6 | La fase corrente è in vista | il nodo attivo dello stepper dentro il viewport | lo stepper è scrollabile: la tappa in corso non si deve cercare |
| 7 | Ogni comando risponde al **proprio** tocco | `elementFromPoint` al centro restituisce sé stesso | è l'unico modo di distinguere una sovrapposizione vera da una geometrica |
| 8 | Campi di scrittura usabili | larghezza ≥ 60% dello schermo · altezza ≥ 44px | una `textarea` a una riga sul telefono non si becca e non si scrive |

### Tre avvertenze sul metro (imparate sbagliando)

Il criterio 7 ha prodotto **tre falsi allarmi** prima di dire il vero. Chi
ripete il collaudo deve escludere, in quest'ordine:

1. **Il contenuto dei `<details>` chiusi.** Nell'integrale 24 comandi su 40
   stanno dentro rettangoli chiusi: non sono resi e non sono premibili — ed è
   giusto così. Misurarli segnalava «comandi che non rispondono» inesistenti.
2. **Ciò che sta sotto una banda appiccicata.** Un comando che scorre sotto la
   barra delle fasi non è un difetto: è ciò che le barre appiccicate fanno.
   Vanno esclusi i punti coperti, **calcolati a ogni passo** e non con una
   soglia fissa (la barra misura 67px, il guardiano a 60px non bastava).
3. **Ciò che è scorso fuori dall'editor.** `getBoundingClientRect` dà coordinate
   di finestra: un elemento uscito dall'area scrollabile riporta una posizione
   dove ora c'è la topbar, e il test accusa la topbar di rubare il tocco. Si
   ritaglia sul riquadro dell'**editor**, non su quello della finestra.

Anche il criterio 5 va ritagliato: il menù laterale è un cassetto fuori schermo
alto quanto la pagina, e contarlo dava «208% di cromo».

## 2 · Che cosa ha trovato

### 🔴 Il taglio di 10px su ogni blocco — guasto strutturale

`.app` è una griglia a una sola colonna **implicita**, e una colonna implicita
vale `auto`: si dimensiona sul max-content dei figli. Con `.topbar` e
`.bottombar` a `min-width: auto` la colonna diventava **403px su un viewport di
375**, e l'`overflow: hidden` del contenitore *tagliava* la differenza invece di
mostrarla. I 10px di destra di ogni blocco erano perduti — non scorribili, non
raggiungibili.

Cura: `grid-template-columns: minmax(0, 1fr)` più `min-width: 0` sulle tre
righe. Su desktop non cambia nulla (verificato: colonna 1280px, contenuto 912px,
nessuno scorrimento).

### 🟠 Nessun comando arrivava ai 44px

Distribuzione misurata sui 106 comandi della fase «Soggetto»: minimo **27px**,
mediana **36px**, massimo **36px**. Il minimo WCAG (24px) era rispettato
ovunque, ma niente raggiungeva la misura del dito.

Cura proporzionata, sul **puntatore** e non sulla larghezza (un tablet grande ha
lo stesso dito di un telefono): 44px al nastro delle tappe, allo stepper e ai
tasti di avanzamento; 32px ai comandi densi.

### 🟠 154 dichiarazioni sotto gli 11px

È un tratto sistematico dell'interfaccia densa, non un incidente. Non si
riscrivono tutte: si alza il pavimento **solo dove la misura ha visto il
problema**, e le altre restano finché un collaudo non le incrimina.

Nota di specificità: alcune di quelle classi sono già fissate da selettori
discendenti (`.schel-trad-brutta .field-block-label`). Il prefisso `.app` porta
le nuove regole a pari specificità, e a parità vince chi viene dopo: il blocco
chiude il foglio. Nessun `!important`.

### 🟠 I campi dell'ordo a una riga

114 `textarea` su 126 stavano sotto i 44px. Portate a 44 di altezza minima.

### 🔴 Una regressione introdotta dalla cura stessa

Portando il **✕** del blocco ordo da 18 a 32px, il pulsante è finito *sopra*
l'etichetta della fonte: il tocco andava all'etichetta. Trovato dal criterio 7,
non a occhio. Cura: riservargli lo spazio (`padding-right` sull'intestazione del
chip) invece di rimpicciolirlo.

## 3 · Esito

**120 criteri su 120**, su 15 superfici:

| Superficie | Esito |
|---|---|
| scheletro · verbi · proposizioni · soggetto · oggetto · preposizionali · altri · ordo | 8/8 ciascuna |
| integrale · analisi | 8/8 |
| per strati · frase corrente | 8/8 |
| A · brano · B · scomposizione | 8/8 |
| E · bozza · E · bella copia | 8/8 |
| D · archivio · Π · panoramica | 8/8 |

Criterio 7 verificato col dito su **723 comandi**: tutti rispondono al proprio
tocco. Desktop e ramo greco ricontrollati dopo le cure: nessuna regressione.

## 4 · Che cosa decide per i percorsi rapidi

- **Lo stepper regge playlist corte.** Con «Simulazione» (3 fasi) la barra si
  accorcia da sé e la fase corrente resta in vista: i percorsi rapidi non hanno
  bisogno di una variante mobile dello stepper.
- **La fase «ordo» è la più pesante.** 126 campi di scrittura su 12 frasi: è lì
  che una variante mobile serve davvero (impaginazione per frase invece che per
  brano intero), non nelle fasi d'analisi.
- **L'integrale è la superficie più fitta**, ma i suoi rettangoli chiusi la
  salvano: 16 comandi resi contro i 119 della fase «Soggetto». Il pattern
  «chiuso di default» è la variante mobile, ed esiste già.
- **Il cromo non è un problema**: la barra delle fasi resta sotto il terzo di
  schermo anche a 12 frasi.
