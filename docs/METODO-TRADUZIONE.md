# Il metodo nella sezione Traduzione — mappa della specifica

> Specifica del docente (lug 2026) sul processo traduttivo: participi nei 5 valori,
> stemma a barre S·V·O·C, tecnica a layer, gruppi di S e O, guida «pro».
> Questo documento dice **che cosa è realizzato, che cosa esisteva già e che cosa resta**,
> perché le prossime sessioni non ricostruiscano il quadro da zero.

## 1 · Realizzato ora

### Participio nei 5 valori (selettore grammaticale)
Nel selettore del verbo, quando la forma è **Participio**, compare il campo
**«Valore sintattico»**: *Attributivo · Sostantivato · Predicativo · Congiunto · Assoluto*
(entrambe le lingue, `participioValore` nelle tassonomie). Sotto il selettore, la
**regola del metodo** come suggerimento dinamico (`PARTICIPIO_VALORE_REGOLE`):

| Valore | Conseguenza sintattica |
|---|---|
| Attributivo | elemento **interno** al sintagma del nome; regge i suoi complementi |
| Sostantivato | vale come **nome**: interno (o nucleo) del sintagma nominale; regge complementi |
| Predicativo | **sintagma proprio** legato al verbo; regge complementi e aggancia altri sintagmi |
| Congiunto | **sintagma proprio** concordato con un nome; regge complementi e aggancia altri sintagmi |
| Assoluto | **sintagma proprio** autonomo (abl. ass. · gen./acc. ass.); regge complementi e aggancia altri sintagmi |

Nell'analisi del periodo il latino ha ora anche **Participiale congiunta (latino)** e
**Participiale predicativa (latino)** (il greco aveva già congiunta/sostantivata/predicativa).

### Stemma a barre S·V·O·C (terza vista dello stemma)
`_renderSyntaxTreeBarre`: ogni **sintagma** dell'analisi logica è una **barra allineata
a sinistra**, larghezza ∝ estensione in **token** (badge «N tok»), colori del sistema
dei casi. L'ordine è quello del metodo — **S · V · O · complementi** — non quello del
testo. I **gruppi** di S e O (attributi, apposizioni, specificazioni) stanno **rientrati
sotto la loro àncora**, agganciata per **adiacenza dei token** (verificato: `Romanus`→
`Populus`, `magnam`→`victoriam`). Se il predicato non è ancora un sintagma, si
sintetizza dai **verbi a forma finita** della grammatica (etichetta «dalla grammatica»).
Ciclo viste: **2.0 → classica → barre**.

## 2 · Esisteva già (trovato in ricognizione: non ricostruire)

- **Finito / non finito**: `verboForma` («Forma finita» vs Infinito/Participio/…) e lo
  **scheletro** ha il layer 1 dedicato («Individua TUTTE le forme verbali… distingui
  modo finito / non finito»).
- **La tecnica a layer** chiesta nella specifica è lo **scheletro a 7 passi**:
  1 Verbi (finiti/non finiti) → 2 Proposizioni (congiunzioni, asindeti) → 3 Soggetto
  **col suo gruppo** → 4 Oggetto **col gruppo** → 5 Preposizionali → 6 Altri complementi
  → 7 Traduzione nell'**ordo S·V·O·C**.
- **Menù a tendina su PC**: le fasi dello scheletro usano già `<select>` con `optgroup`
  per caso e per preposizione reggente (`scheletroFuncOptionsHtml`).
- **Gruppi di S e O**: le fasi 3-4 li prevedono esplicitamente (menù isolato per fase).

## 3 · Resta da fare (deciso dal docente: «in seguito»)

1. **Guida «pro»**: agganciare il modello della guida alla versione completata nel vero
   metodo (semplificato), col discorso delle **ramificazioni** — la versione pro.
2. **Aggancio di sintagmi ai sintagmi participiali**: oggi il dato logico è piatto
   (`tokenIndices` per entry); l'«agganciare ulteriori sintagmi» di predicativo/
   congiunto/assoluto è affidato all'analisi del periodo (participiale = proposizione).
   Un eventuale **annidamento nel dato logico** (campo `padre`) è un cambio di schema:
   da progettare con migrazione (v3) e da riflettere nella vista a barre (indentazione
   multipla).
3. **Menù a tendina**: verificare se fuori dallo scheletro (metodo a strati) resti
   qualche picker non-tendina da uniformare su desktop.
4. **Complementi minori in secondo piano**: nella vista a barre i gruppi sono già
   attenuati; valutare lo stesso trattamento per i complementi «minori» nella fase 6.
