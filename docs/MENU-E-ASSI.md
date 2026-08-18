# Il menù di sinistra e i tre assi · una forma sola, due colori

> Due lavori che si tenevano per mano: il selettore *Metodo · Vista · Guida* era
> datato, e il menù che lo ospita non era lo stesso in greco e in latino.
> Tutto quel che segue è **misurato**, non stimato: fingerprint degli stili
> calcolati sulle due lingue, contrasti calcolati, larghezze dei testi misurate
> col font vero.

---

## 1 · Il selettore dei tre assi

### 🔴 Le icone erano emoji

🧱 🦴 🎯 🌐 🪶 🧭, a colori e di un altro peso ottico, accanto a un menù di icone
in tratto (Tabler, `currentColor`, quindi già nel colore della lingua). Le emoji
inoltre le disegna il sistema operativo: il controllo aveva un aspetto diverso su
ogni macchina. **Cadono.** Le etichette bastano — *Per strati · Valenziale ·
Frase corrente · Brano intero · Libera · Guidata* — e il `title` porta la
spiegazione lunga.

### 🔴 L'opzione non applicabile era barrata

In Guidata la Vista non si applica (il wizard è sequenziale per frase). Il
gruppo veniva reso `[disabled]`, e la regola diceva `opacity: 0.4` +
`text-decoration: line-through`. Risultato: **l'intero gruppo Vista sembrava
cancellato**, la scelta in vigore compresa — che restava l'unica vera e si
leggeva rosa slavato — e nessuna parola diceva perché.

Barrato vuol dire «sbagliato», non «adesso non serve». Ora il gruppo si fa
quieto (la scelta in vigore in accento pallido, l'altra in seppia), resta
leggibile, e sotto c'è la riga: *«In Guidata si va una frase alla volta: la
vista non si applica.»*

### 🔴 La pista si spezzava in due righe

Il controllo vive **sempre** nel menù di sinistra — `arrangeChrome()` ce lo porta
su ogni schermo — e lì la colonna è stretta. Ma era disegnato come un segmented
control orizzontale (pista con ombra interna, pulsanti dentro) e lo scavalco del
cassetto gli metteva `flex-wrap: wrap`: due righe dentro una pista sola, cioè una
pista che non è più una pista.

Ora sono **due celle uguali per costruzione** (`flex: 1 1 0`, che non lascia
resti e non va mai a capo): la stessa pastiglia che lo studente usa tutto il
giorno nei pannelli di morfologia. Quattro scavalchi in meno da mantenere.

### 🟠 Erano tre interruttori orfani

Nessuno diceva da dove venissero. Ma li imposta il **percorso** — `applicaPercorso`
ne applica il preset — e la pill lo racconta col suo «· adattato». Ora il blocco
si apre con una riga che lo dice, il nome del percorso è un link al pannello, e
quando gli assi sono stati cambiati a mano compare **«Rimettili come il
percorso»**.

### 🟠 Non si navigavano da tastiera

Ogni altro radiogroup dell'app (le pastiglie di morfologia) ha le frecce e il
tabindex mobile. Questo no. Ora sì — e il fuoco sopravvive al ridisegno: senza
quell'accortezza, alla prima freccia il fuoco cadeva sul `<body>` e la seconda
non faceva più nulla.

### 🟠 La palette diceva la stessa cosa due volte

Sei voci per quattro scelte: «Modalità · Libera» e «Guida · 🪶 Libera» erano lo
stesso gesto sotto due nomi di gruppo, e l'emoji stava sia nell'etichetta sia
nella colonna delle icone. Un asse, un gruppo, una voce per scelta — con le
stesse parole del controllo, così cercarle è cercare quel che si è visto.

---

## 2 · Il menù di sinistra, uguale nelle due lingue

### 🔴 Il nome della lingua era incollato a ogni intestazione

`.sidebar-section-label::after` valeva per **tutte e quattro** le testate: si
leggeva «Impostazioni · Latino», «Strumenti · Latino», «Dati del brano · Latino»
— quest'ultima visibile nella segnalazione. La lingua è del lavoro, non delle
voci: ora timbra la sola testata dell'officina.

### 🔴 Otto regole del cromo scritte per il solo latino

Il loro corpo usava già `var(--lang-accent)`, che commuta da sé — quindi il
`body[data-lang="latino"]` davanti non serviva. Tre erano doppioni puri. Le altre
davano al latino **una forma che il greco non aveva**:

| | latino (prima) | greco (prima) | ora |
|---|---|---|---|
| tab dell'analisi attivo | pieno d'accento, testo bianco | bianco in rilievo | pieno d'accento, in entrambi |
| hover sul tab | accento | *nessuno* | accento, in entrambi |
| voce attiva del menù | bordo 3px **+ ombra interna 4px** | bordo 3px | bordo 3px, in entrambi |
| barra d'azione del token | bordo 3px | bordo 4px | 4px, in entrambi |
| bottone morbido | testo scuro, hover **pieno** | testo accento, hover appena tinto | testo scuro e hover pieno, in entrambi |

Restano per lingua le due che una differenza **vera** ce l'hanno: la pillola
della lingua e la tastiera greca, che in latino non serve. E i font: il greco ha
bisogno di una faccia politonica, e quella resta sua.

### 🔴 Due blocchi CSS mal formati

```css
body[data-lang="latino"] .current-sentence-banner,   ← virgola invece di {
  border-left-color: var(--lang-accent);
}
```

```css
/* 7. Approach banner */
  border-left-color: var(--lang-accent);             ← nessun selettore
}
```

Il parser, cercando la graffa d'apertura, **si mangiava la regola successiva**:
sono morti in silenzio l'accento di `.section-letter` e quello di `.lemma-final`.
Verificato nel CSSOM: quei due selettori non esistevano. Nessun danno visibile —
le regole base usano già `--primary` e `--brass`, che danno gli stessi valori —
ma era una trappola per chiunque scrivesse una regola lì sotto.

### 🔴 Il badge di completamento debordava

Da quando dice `fatte/totale` e non più una spunta, il contenuto arriva a cinque
caratteri. Misurato col font della nav: **«10/10» occupa 22,1px a 9px di corpo e
27px a 11** — dentro un cerchio da 18–20px. L'ultima tappa di un percorso a dieci
traboccava dal proprio cerchio. Ora è una pastiglia che si allarga sul contenuto
(«2/10» → 31px) e resta tonda quando il contenuto è un carattere solo.

### 🟠 Misure sul telefono

Intestazioni a 10px, badge a 9, targhette dei «Dati del brano» a 10: sotto il
pavimento degli 11px già posato altrove. Il link al percorso era alto 17px, il
badge del backup 31. Tutti alzati.

---

## 3 · Collaudo

**Parità fra le due lingue.** Fingerprint di 19 elementi del menù e del blocco
degli assi × 18 proprietà strutturali, catturata su **due caricamenti reali** a
viewport identico (1280×860, sidebar 264px in entrambi):

```
STRUTTURA_DIVERSA: {}          ← nessuna differenza
TESTI_DIVERSI:     {}
colori che commutano: banda della sidebar · voce attiva · icone ·
                      badge pieno · link al percorso · cella scelta
colori identici:      13 elementi su 19
```

Sei elementi cambiano colore, ed è esattamente l'identità linguistica che fa il
suo mestiere. Tutto il resto è identico.

> Nota di metodo: il `data-lang` **non si commuta da script** per misurare. Il
> browser ricalcola i `var()` ma non rifà il matching dei selettori, e una prima
> misura così mi aveva dato il rosso pompeiano in greco — un falso allarme.
> Le due lingue si misurano su due caricamenti veri, a viewport dichiarato.

**Contrasti** (fondo reale, strati traslucidi composti):

| | chiaro lat | chiaro grc | scuro lat | scuro grc |
|---|---|---|---|---|
| minimo su 8 elementi | 5,68 | 5,68 | 6,59 | **5,10** |

Tutti sopra il 4,5:1 richiesto per il testo piccolo. Il minimo assoluto è il link
al percorso in greco scuro.

**Telefono** (375×812, menù aperto, greco): nessuna scritta sotto gli 11px,
nessun bersaglio sotto i 24px, niente fuori dal menù, nessuno scroll orizzontale.

**Funzionamento**: «Rimettili come il percorso» riporta `valenziale/intero/guided`
→ `valenziale/intero/free` e fa sparire il proprio bottone; le frecce spostano
scelta e fuoco e li mantengono dopo il ridisegno; il gruppo inerte non cambia
nulla quando lo si preme.

`brace_check = 10` · `node --check` OK · console pulita.

---

## 4 · Rimasto fuori, e detto

- **`.token.token-pending`** ha un alone azzurro scritto a mano
  (`rgba(24,0,172,0.15)`) accanto a un bordo `var(--primary)`: in latino è un
  bordo rosso con l'alone blu. È nell'editor, non nel menù — fuori da questi due
  lavori, ma è lo stesso difetto di famiglia.
- **`.approach-grid` / `.approach-option`**: CSS orfano dal punto 10 (il modale
  dell'approccio non esiste più). Da cancellare in un commit di sole delezioni.
