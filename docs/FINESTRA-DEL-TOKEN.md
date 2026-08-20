# La finestra del token · dal basso alla colonna di destra

> «In modo che il testo sia sempre visibile e presente senza spostare sguardo o
> pagina.» Questo documento dice che cosa succedeva prima, misurato, e come sta
> adesso.

## 1 · Il difetto, misurato

Nella scheda **Periodale**, cliccando una parola:

| | valore |
|---|---|
| altezza del pannello | **344px** |
| bordo inferiore | y = 1115 |
| altezza della finestra | 860 |
| **fuori schermo** | **255px** |
| il brano finiva a | y = 759 |

Per usare il pannello si scorreva; scorrendo, il brano usciva di vista. Il
pannello nasceva dentro `.tokenizer > .subsection > #editor-content`, cioè nel
flusso, sotto il testo.

## 2 · La macchina c'era già

La terza colonna della griglia, le sue transizioni, il foglio a scomparsa sotto
i 720px, l'Escape: tutto costruito per il **drawer di compilazione**, che però si
apriva solo cliccando l'intestazione di una voce già creata. Qui la si estende al
pannello del token — il gesto più frequente della giornata — senza inventare
niente di nuovo e senza toccare un solo renderer.

**Un inquilino alla volta, con precedenza dichiarata:**

1. la **barra del token**, se c'è. È il gesto in corso: si è appena cliccata una
   parola e si sta dicendo che cos'è. Entra da sola, senza un clic in più.
2. i **campi di una voce**, aperti col clic sulla sua intestazione.

> **Sono tre, non due.** Fra le due si è poi inserita la porta dei **pannelli
> dello scheletro**, che condivide la natura della prima. La storia sta in
> `docs/CASSETTO-DEL-TOKEN.md` §8; il perché servisse, nella §6 qui sotto.

Tutte e sette le barre dell'app nascono da funzioni `…ActionBar` /
`…PendingPanel` — nessuna è cromo permanente — quindi la sola classe
`.token-action-bar` copre **grammaticale, logica, periodale, unificato e
connettivi**. ~~e i verbi dello scheletro~~ — **questa parte era falsa**: vedi §6.

## 3 · Le tre insidie, e come sono chiuse

### La barra scaduta che resta nel cassetto

Il drawer non copia: **sposta** il nodo. Quando l'editor si ridisegna ne
costruisce uno nuovo, e il vecchio resterebbe nel cassetto per sempre. Servono
due discriminanti:

- **la sentinella di ridisegno.** `renderEditor` riscrive sempre `innerHTML`,
  quindi a ogni giro il primo figlio è un nodo *nuovo*. Confrontarlo distingue
  due silenzi che si somigliano: «l'editor non ha la barra perché l'abbiamo
  spostata noi» e «l'editor è stato ridisegnato e la barra non c'è più».
- **la casa c'è ancora?** Sgomberando, se il posto da cui il nodo è stato preso
  è ancora attaccato al documento ce lo si rimette; se è stato staccato, il nodo
  è scaduto e si butta. È la stessa domanda che risolve il passaggio di soglia
  (§4) e il ridisegno, senza due rami diversi.

### Il sobbalzo a ogni scelta

Il ridisegno costruisce una barra nuova anche solo scegliendo una voce nel
pannello. Se la «porta in vista» scattasse lì, la pagina sobbalzerebbe a ogni
scelta: è **la parola**, non il nodo, a dire se è cambiato qualcosa. Misurato:
scelta di un valore nel pannello → scroll invariato, 0px.

### Chiudere ≠ nascondere

La barra esiste finché la parola è selezionata: nascondere il pannello la
farebbe rientrare al primo ridisegno. La ✕ preme l'**«Annulla» della barra
stessa** — l'uscita che l'app aveva già previsto, con tutto quel che si porta
dietro. Verificato: dopo la ✕ non resta nessuna barra né nel cassetto né
nell'editor, nessun token in attesa, e la griglia torna a due colonne.

## 4 · Le due scelte deliberate

~~**Sotto i 900px la barra resta dov'è.** Lì la terza colonna non esiste e il
drawer diventa un foglio che copre il brano: aprirlo *da solo* a ogni tocco
sarebbe peggio del pannello in basso.~~ **Superata.** Era vera finché
l'alternativa era un foglio LATERALE largo il 92% dello schermo. Da quando sotto
i 900 il pannello **sale dal basso** e lascia il brano sopra, visibile
(`docs/TABLET-E-MANO.md`), il motivo per tenerlo fuori è caduto: `adrLargo` vale
`true` a ogni larghezza. La voce aperta a mano usava già il foglio dappertutto.

**La parola si porta in vista, una volta sola.** Il pannello si apre in cima
alla colonna di destra; se la parola cliccata sta in fondo allo schermo — e nella
scheda Grammaticale sta a 825px in una finestra alta 860, perché sopra il brano
ci sono nastro, pill, testata, comandi e la testata della sottosezione — lo
sguardo dovrebbe attraversare la pagina in diagonale. Verificato su «incolunt»,
cliccata a y=734: l'editor scorre di 433px, la parola si ferma a 492 e il brano
intero rientra in schermo (377→699).

## 5 · Collaudo

| | prima | dopo |
|---|---|---|
| pannello Periodale | 344px, **255px fuori schermo** | 378px a y=177, **tutto in schermo** |
| pannello Grammaticale | nel flusso, sotto il brano | 166px nella colonna di destra |
| brano | usciva di vista scorrendo | **in vista** |
| spostamento della parola cliccata | — | **0px** (misurato: 825 → 825) |
| griglia | `264px 1016px 0px` | `264px 564px 452px` |

- **Quattro schede** (grammaticale · logica · periodale · unificato): il pannello
  entra nel drawer in tutte, la testata porta la parola, l'editor ne resta senza.
- **Cambio di parola**: la testata passa da «incolunt» a «Belgae», una sola barra
  nel cassetto, nessuna residua.
- **✕ ed Escape**: chiudono, annullano la selezione, non lasciano nulla.
- **Greco**: pannello a y=177 alto 166px, testata «Ἀλκιβιάδης» nella faccia
  politonica, alone del token in `#1800AC`.
- **Latino**: alone in `#A22E37`. Era scritto a mano in indaco accanto a un bordo
  che invece commutava: bordo rosso pompeiano con alone blu. Stesso rimedio per
  il lampeggio del blocco appena creato (`block-flash`).
- Nessuno scroll orizzontale, nessuno scroll interno al cassetto, console pulita,
  `brace_check = 10`, `node --check` OK.

### Quel che non ho potuto verificare qui

Il riallineamento **al momento esatto** in cui si attraversa la soglia dei 900px.
Il browser dell'app non manda alla pagina nessun segnale di ridimensionamento
quando la finestra viene cambiata dallo strumento: né l'evento `change` di
`matchMedia`, né `resize`, né un `ResizeObserver` sul documento — provati tutti e
tre con un contatore, tutti a zero, mentre `innerWidth` e la media query CSS
cambiavano regolarmente. In un browser vero `resize` scatta, ed è a quello che il
codice si appende.

Quel che invece **è** verificato è la rete di sicurezza: la sincronia gira dopo
ogni mutazione del DOM, cioè dopo ogni interazione vera. Provato a 820px con la
barra rimasta nel cassetto — una qualunque mutazione la rimette sotto il brano,
chiude il cassetto e riporta la griglia a una colonna. Anche se il segnale di
ridimensionamento mancasse del tutto, la posizione si corregge al primo gesto.

---

## 6 · Una copertura dichiarata e mai avuta

La §2 chiudeva con una frase che sembrava un pregio del disegno: la sola classe
`.token-action-bar` copre sei superfici, **compresi i verbi dello scheletro**.
Era falsa, e non per un dettaglio.

Contato oggi sulla regione intera dello scheletro, righe 28548-29300:

```
.token-action-bar in quella regione:  0
```

I renderer del percorso — `renderScheletroVerbi`, `renderScheletroProposizioni` e
sorelle — hanno una **famiglia di markup propria**: `.schel-vq-row`,
`.schel-conn-bar`, `.schel-defconj-bar`. Nessuna e' una barra del token.

### Che cosa è costata

Esattamente ciò che l'utente ha visto e segnalato: lavorando la tappa **Verbi**
del compito a casa, il pannello dell'analisi si apriva **in linea sotto il brano**
con la colonna di destra a `0px`, e non si capiva perché il cassetto ci fosse
altrove e lì no. La carta diceva che quel caso era coperto, quindi nessuno era
andato a guardare.

La lacuna è chiusa — la porta dei pannelli dello scheletro, `CASSETTO-DEL-TOKEN`
§8 — ma il difetto della **carta** merita di restare scritto, perché è di una
specie che si ripete: *una copertura dedotta dal nome di una classe invece che
contata*. Sette barre nascono da funzioni `…ActionBar`, dunque — sembrava — tutto
ciò che assomiglia a una barra è una `.token-action-bar`. Lo scheletro non
assomigliava a niente di tutto questo, ed era proprio il posto dove l'utente
lavora di più.

### La regola che ne esce

Una copertura si scrive in una carta **solo dopo averla contata**, e il conteggio
va messo accanto all'affermazione. «La sola classe X copre A, B, C» senza un
numero è un'ipotesi con l'aria di un fatto; «grep su X nella regione R: n
occorrenze» è una verifica che il lettore successivo può rifare.
