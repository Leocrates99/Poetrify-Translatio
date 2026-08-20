# Il tablet e la mano · il pannello sale dal basso

> Le ultime due classi. Qui il pannello cambia **asse**: non è un secondo
> disegno, è la stessa regola applicata dove la larghezza non c'è.

---

## 1 · Perché dal basso e non da destra

Sotto i 900 px il pannello del token restava nel flusso, sotto il brano. Era la
scelta giusta finché l'alternativa era un **foglio laterale largo il 92 % dello
schermo**, che copre proprio il testo che si sta leggendo: si guadagnava il
pannello e si perdeva il brano, cioè il contrario dell'obiettivo.

Ora l'alternativa c'è. È la regola già archiviata nel canone — *il pannello si
apre sull'asse in cui lo schermo ha margine* — applicata all'asse opposto: **a
destra quando avanza la larghezza, dal basso quando avanza l'altezza**.

| | tablet | telefono |
|---|---|---|
| il foglio prende | **45 %** dell'altezza | **60 %** |
| il brano, ancorato in cima | fino a **55svh − 140** | fino a **40svh − 140** |
| perché | sopra restano fascia e brano | i controlli sono più alti, le dita meno precise |

Il brano non è più solo «sopra»: è **ancorato in cima e scorre dentro di sé**.
Senza, con una versione da cento parole si scorre per lavorare e il testo se ne
va — esattamente ciò che tutto questo lavoro doveva impedire. Nessun comando
nuovo: il gesto per vedere il resto è scorrere, come dappertutto.

## 2 · Cura per iPhone e telefoni di fascia alta

| dettaglio | perché si paga |
|---|---|
| **`svh`, non `vh`** | con la barra di Safari che compare e sparisce, `vh` misura la finestra *più grande*: il foglio finirebbe sotto il bordo |
| **`env(safe-area-inset-bottom)`** | sull'iPhone senza tasto fisico la barra gestuale mangia gli ultimi 34 px, e lì finirebbe il pulsante di conferma |
| **campi a 16 px** | sotto quella soglia Safari **ingrandisce la pagina** al primo tocco su un campo, e da quello zoom non si torna indietro da soli: il brano resta tagliato per il resto della sessione |
| **`overscroll-behavior: contain`** | arrivando in fondo al riquadro del brano il trascinamento proseguirebbe sulla pagina sotto, e il testo scapperebbe via |
| **inerzia nello scorrimento** | `-webkit-overflow-scrolling: touch` dentro il foglio e dentro il brano |
| **bersagli a 44 px** | inclusa la **✕**: 32 px bastano al mouse, non al pollice — e sbagliarla vuol dire toccare la parola sotto |

Verificato con puntatore grossolano: **nessun campo sotto i 16 px**, nessun
bersaglio sotto i 44.

## 3 · Collaudo

| | iPhone 15 Pro 393×852 | iPhone 15 Pro Max 430×932 | iPad 768×1024 |
|---|---|---|---|
| fascia | 44 | 44 | **44** *(nuovo: vedi sotto)* |
| brano ancorato | 125 → 326 | 125 → 373 | 137 → 560 |
| foglio | 341, **60 %** | 373, **60 %** | 563, **45 %** |
| il brano è **tutto** sopra il foglio | ✅ 15 px d'aria | ✅ | ✅ 3 px d'aria |
| a filo del bordo inferiore | ✅ | ✅ | ✅ |
| scroll orizzontale | nessuno | nessuno | nessuno |

Greco sul Pro Max: parola nella faccia politonica, contrasto minimo **5,47**,
tutti gli elementi a norma.

### Due difetti trovati misurando

**🔴 Sull'iPad la fascia non scattava.** L'innesco era la sola altezza (900 px) e
un iPad in verticale è alto 1024: restava tutto il cromo disteso. Ma sul tablet è
la **larghezza** a essere scarsa, e la fascia serve uguale. L'innesco diventa
«altezza bassa **oppure** larghezza stretta»: resta fedele al principio — si
guarda l'asse scarso — e ora ne guarda due.

**🔴 Il brano ancorato finiva sotto il foglio.** Su iPhone 15 Pro: riquadro alto
290 px da 125, cioè fino a 415, mentre il foglio comincia a 341 — **74 px di
testo dietro il pannello**, scorribili ma invisibili. Il tetto ora si calcola
sullo spazio che resta davvero. La costante è passata da 125 a **140** perché il
riquadro comincia a 125 sull'iPhone e a 137 sull'iPad: quindici pixel di testo in
meno, e la certezza su tutte e due le macchine.

## 4 · Una cosa che non ho potuto verificare qui, e perché

**L'animazione d'apertura del foglio.** Il pannello del browser non compone
frame, quindi una `transition` di 250 ms non avanza mai: la trasformazione resta
al valore di partenza e il foglio *sembra* non aprirsi.

Non l'ho dato per scontato — l'ho isolato. Un elemento **nuovo** con la stessa
forma e senza transizione reagisce subito (top 1024 → 563); il foglio vero, con
la transizione, no. Spegnendo la transizione, il foglio va **esattamente** dove
deve: `top 563`, `bottom 1024`, a filo del bordo. La geometria è verificata; è
solo l'interpolazione che non può girare qui.

---

## 5 · Gli inquilini nuovi del foglio, misurati sul telefono

Il foglio che sale dal basso non è un disegno finito una volta: è una **casa che
riceve inquilini**. Da quando questa carta è stata scritta ne sono arrivati due —
i pannelli dello scheletro e il mini pulsante di richiamo — e ciascuno ha portato
con sé le misure del posto da cui veniva. È l'occasione per registrare che cosa
succede quando succede.

### La terza porta arriva anche qui

Il cassetto ha una porta in più: i pannelli dello scheletro, che prima si
aprivano in linea sotto il brano e lasciavano il docente senza cassetto proprio
nella tappa in cui lavora di più (`docs/CASSETTO-DEL-TOKEN.md` §8). Sul telefono
quella porta funziona come le altre due, e il foglio si comporta come deve.

| | misura |
|---|---|
| il pannello dello scheletro entra nel foglio | ✅ |
| il foglio | `y = 325`, alto **487**, chiude a **812** — a filo del bordo |
| sale dal basso | ✅ |
| il brano resta sopra, visibile | ✅ |
| la pagina va di lato | mai |

### Tre bersagli che nessuno aveva contato

Dentro il foglio, però, i comandi del nuovo inquilino misuravano **25 px**
(«modo finito», «modo non finito») e **21** («✨ auto»). Erano nati per stare in
una riga del brano, dove convivono con parole alte quattordici pixel; nel foglio,
sotto un pollice, sono un bersaglio che si sbaglia.

La ragione per cui erano sfuggiti sta nella forma della regola. I 44 px non si
applicano a *tutto* ciò che sta nel foglio: si applicano a un **elenco di classi**
— `.btn`, `.seg-btn`, `.drop-trigger`, `.dict-suggest-pill`, e via elencando.
Un elenco è preciso e non protegge nessuno che non vi compaia. Le due classi
mancanti sono state aggiunte, e nel foglio non resta più niente sotto la soglia.

> **La regola che ne esce, ed è la parte che vale oltre questo caso.** Ogni
> componente che entra in una superficie nuova ci porta le misure della
> superficie da cui viene, e la regola del tocco non conosce le sue classi finché
> non gliele si dice. Aprire una porta nuova sul cassetto vuol dire, sempre,
> rimisurare i bersagli che ci passano. Sta scritto anche accanto alla regola nel
> foglio di stile, dove serve a chi la modifica.

Era già successo una volta, e alla lettera: il commutatore fra scelta e scrittura
libera stava a 40 px «perché la sua classe non era in elenco». Due volte lo stesso
inciampo è una specie, non un caso.

### Il resto della mano, oggi

| | misura |
|---|---|
| la testata | **53 px** *(48 sul leggìo, più il respiro del tocco)* |
| il mini pulsante di richiamo | **44 px** — nasce a 33 e cresce sotto `pointer: coarse` |
| le tre carte dello scopo | una colonna da **335 px**, alte 171 · 189 · 189 |
| il modale che le ospita | 363×731, **scorre dentro di sé**, la pagina non va di lato |

Sul tablet in verticale le stesse carte stanno a **due colonne** da 329 px e il
modale, alto 618, entra tutto: la soglia dei 1080 fa il suo mestiere senza che il
foglio debba saperne niente.

### Che cosa resta non verificabile qui

Vale ancora, immutata, la §4: l'animazione d'apertura non si può osservare in
questo riquadro, e la geometria è stata verificata spegnendola. Le misure di
questa sezione sono tutte **geometriche** — posizioni e altezze a foglio già
aperto — quindi non toccano quel limite.
