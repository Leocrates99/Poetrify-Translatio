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
