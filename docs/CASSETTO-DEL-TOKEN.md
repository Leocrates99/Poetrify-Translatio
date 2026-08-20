# Il cassetto del token · da utilità a scheda

> Quando è aperto, quella colonna è **la cosa principale sullo schermo**: si sta
> dicendo che cos'è una parola, e il brano per un momento fa da contesto. Era
> vestita da utilità. Ora ha la veste della scheda del dizionario, che fa
> esattamente lo stesso mestiere.

---

## 1 · Il difetto che ha reso il lavoro non cosmetico

Prima di vestire, ho confrontato le due metà dell'app sulla cosa che dovrebbero
condividere: **il colore della categoria grammaticale**.

| categoria | dizionario | banco (prima) | |
|---|---|---|---|
| sostantivo | `#1F63D6` | `#1800AC` | ✗ |
| verbo | `#DC2B2B` | `#C53030` | ✗ |
| **aggettivo** | `#0FA3A3` verde acqua | **`#2F855A` verde** | ✗ |
| **avverbio** | `#1FA24F` verde | **`#6366F1` indaco** | ✗ |
| pronome | `#D19A16` | `#D69E2E` | ✗ |
| preposizione | `#9C2D8E` murice | `#6B6660` seppia | ✗ |
| **congiunzione** | `#4A45C0` indaco | **`#F57C00` arancio** | ✗ |
| **numerale** | `#E9720C` arancio | **`#3F51B5` indaco** | ✗ |
| interiezione | `#E5389A` | `#C026D3` | ✗ |
| articolo | `#17B4CE` | `#38B2AC` | ✗ |
| particella | `#6B7280` | `#78716C` | ✗ |

**Zero coincidenze su undici.** E due coppie sono di fatto **scambiate**: nel
dizionario il verde è *avverbio*, nel banco è *aggettivo*; l'arancio è
*numerale* nel dizionario e *congiunzione* nel banco. Chi impara il colore
consultando una voce lo rilegge sbagliato appena torna sul brano.

Vince il **dizionario**, che è il canone dichiarato — undici tinte distinte e
nominate — contro una palette del banco costruita per riuso di variabili
semantiche: la preposizione era seppia e il numerale indaco perché quelle
variabili esistevano già, non perché significassero quello.

La palette è salita in `shared/poetrify-tokens.css`, che è la fonte unica già
linkata dalle quattro superfici. Il blocco locale del dizionario, ora doppione,
se n'è andato. Le pastiglie del brano leggono `--pos-c` con **una formula sola**
(`color-mix` verso `--ink`, che si inverte col tema) invece di undici colori
scritti a mano.

---

## 2 · La veste: gli stessi dispositivi della scheda

| dispositivo | scheda del dizionario | cassetto (ora) |
|---|---|---|
| filetto di categoria | `border-left: 4px solid var(--pos-c)` | `4px` col colore del **caso** |
| lemma | `clamp(42px, 8vw, 74px)` | `clamp(26px, 3.1vw, 38px)` — la colonna è di 450px |
| iniziale in accento | `.lx-init` | `.adr-init`, nel colore della lingua |
| occhiello di categoria | `.lx-postag` 10,5 · 800 · maiuscoletto | `.adr-occhiello`, idem |
| targhetta | `.lx-catbox` | stessa famiglia della pastiglia nel brano |
| filetto forte sotto la testata | `border-top: 1.5px solid ink` | `border-bottom: 1.5px solid var(--ink)` |
| etichette di sezione | `.lx-lbl` 10 · 700 · accento | `.label`, da inline a blocco |

**Gerarchia misurata: 10,5 › 38 › 11 px.** Il salto grande è la ragione per cui
si legge come gerarchia e non come rumore ordinato — nel dizionario è 30 › 19 ›
11, stesso rapporto.

**Il colore della categoria non è quello che credevo.** Avevo dato per scontato
che le pastiglie portassero `pos-*`; misurate, portano **`case-*`** — «Gallia
[case-neutro]», «est [case-verbo]» — perché nella scheda dell'analisi il sistema
semantico è il **gruppo di caso**, con la sua palette a nove tinte. Il cassetto
adotta la classe che il token ha addosso (`case-*`, oppure `pos-*` altrove), e
il colore lo eredita: **la parola nel brano e la sua targhetta mostrano la
stessa tinta**, e si riconoscono a colpo d'occhio come la stessa cosa.

Altri due dispositivi, minori ma dello stesso registro: la ✕ passa da un glifo
di 20px senza area a un bersaglio di **32×32**; l'atto in corso, che la barra
dichiarava nella propria etichetta e che si perdeva dentro il pannello, sale a
fare da occhiello («Parola selezionata», «Blocco (2)», «Voce in compilazione»).

---

## 3 · Tre difetti trovati misurando, non guardando

### 🔴 La palette dei casi non aveva un verso per il buio

Nel cassetto in tema scuro l'occhiello misurava **2,07:1** e la targhetta
**1,95** — illeggibili. La causa: `--case-text` porta le tinte *scure* disegnate
per la carta chiara, e il blocco `.case-*` era dichiarato una volta sola. Non è
un difetto introdotto qui: la stessa variabile tinge da sempre le celle della
vista a strati e la barra d'azione, che nel buio avevano lo stesso problema.
Chiuso alla radice, sulla palette: otto tinte schiarite, contrasti **da 6,99 a
9,22** sul fondo reale `#1c1f24`.

### 🔴 L'ottone che porta testo

`--brass` `#9c6b3c` su avorio misura **4,43:1**: regge come filetto, non come
parola. Nel cassetto lo portavano tre etichette del blocco lemma (titolo 4,43 ·
eccezione 3,93 · confidenza 3,55) — e le stesse falliscono anche nella scheda,
fuori dal cassetto. Introdotto **`--brass-ink` `#7a5228`** nei token condivisi e
applicato dove la misura ha visto il problema. Nella stessa passata: i semantici
della targhetta di confidenza passano alle varianti `-ink` che esistevano già, e
il suo corpo sale da 9 a 10px.

### 🟠 Una precedenza fissa oscurava una delle due vie

«La barra del token vince sempre» sembrava ragionevole, ma rendeva
**irraggiungibile** il clic sull'intestazione di una voce ogni volta che una
parola restava selezionata — e dopo un «Assegna» resta selezionata. Provato: si
clicca l'intestazione di «est» e il cassetto continua a mostrare «Gallia».

La regola giusta non è una gerarchia fra gli inquilini ma il **gesto più
recente**. Un solo ascoltatore delegato sui token segna quale sia stato
l'ultimo; nessun renderer toccato.

---

## 4 · Collaudo

Tre stati × due lingue, misurando ogni elemento di testo del cassetto contro il
suo **fondo reale** (strati traslucidi composti):

| stato | elementi | contrasto minimo | sotto 10px |
|---|---|---|---|
| barra del token · latino | 21 | 5,68 | nessuno |
| voce in compilazione · latino | 148 | 5,16 | nessuno |
| con l'eccezione spuntata | 150 | 4,62 → poi 5,16 | nessuno |
| voce in compilazione · greco | 99 | 5,16 | nessuno |
| cassetto in tema scuro | 26 | 6,59 | nessuno |

- **Latino**: «est» a 38px, iniziale in rosso pompeiano, targhetta «Verbo» dello
  **stesso colore del token nel brano** (verificato: identici), filetto
  `rgba(196,18,52,.88)`.
- **Greco**: «οἱ» nella faccia politonica, iniziale in blu Poetrify, targhetta
  «Pronome», filetto nell'ocra `#D19A16` del dizionario.
- **Blocco di più parole**: occhiello «Blocco (2)», cartiglio di pergamena col
  filetto d'ottone, «✓ Conferma blocco (2)» a tutta larghezza (412×40).
- **Le due vie**: parola → voce → parola, ognuna prende il cassetto quando è
  l'ultimo gesto; la scheda ospitata resta evidenziata.

`brace_check = 10` · `node --check` OK · console pulita.

---

## 5 · Rimasto fuori, e detto

- **Altri 15 usi di `--brass` come testo** nel translator e 12 nel corpus, non
  misurati uno per uno. `--brass-ink` ora esiste: la passata è una sostituzione
  meccanica, ma va misurata caso per caso e non appartiene a questo lavoro.
- **`--parchment` e `--radius-md` divergono** fra i token condivisi (`#f7f3e9`,
  8px) e il translator, che li ridefinisce localmente (`#eae8e2`, 6px). È lo
  stesso genere di deriva della palette PoS, un gradino più in basso.
- **`token-faded`** porta i token già assegnati a `opacity: .42`: è una scelta
  deliberata di quella tappa, ma a quell'opacità il testo scende sotto la soglia.

---

## 6 · La tendina dei token (ago 2026)

Dentro la scheda restavano **tre menù che disegnava il sistema operativo**, perché
l'upgrade a pastiglie si ferma a sette opzioni:

| menù | voci | note |
|---|---|---|
| `pending-pos-select` | 10 | **senza classe**: `segUpgradeAll` cerca `select.field-select` e non l'ha mai nemmeno considerato — nativo per omissione, non per scelta |
| `pending-logic-select` | **52-53 in otto gruppi** | nomi fino a 44 caratteri; è il caso che rende il lavoro necessario |
| `pending-periodale-ruolo` | 3 | |

Una tendina di sistema con cinquantatré voci raggruppate, in una colonna di
451px, è una lista da scorrere a memoria.

**Il patto è quello già in casa.** `segUpgrade` non tocca i renderer: prende il
`<select>` già costruito, gli mette accanto un widget, riscrive il valore
sull'originale e dispatcha `change`. La tendina fa lo stesso, per i select che le
pastiglie non prendono e che stanno dentro una `.token-action-bar`. Il select
resta il padrone del valore; la tendina è la sua faccia.

**Tre cose che fa e quella di sistema no.** *Filtra* (sopra le dodici voci);
*mostra i gruppi* come intestazioni di sezione in accento di lingua invece che
come separatori grigi; *sta nel disegno* — carta, filetti, raggi e corpi della
scheda.

### Due difetti trovati misurando

**🔴 Il filtro cercava anche nel nome del gruppo.** Misurato: «luogo» dava **16
voci invece di 4**, perché il gruppo dell'ablativo si chiama «Caso ablativo ·
mezzo, modo, *luogo*, tempo, agente» e si trascinava dietro tutti i suoi quindici
complementi; «specificazione» dava 13 invece di 1 per la stessa ragione col
genitivo. Le quattro parole che un docente digita davvero — luogo,
specificazione, agente, termine — erano tutte e quattro rovinate. Ora si cerca
solo nel testo della voce; le intestazioni restano per chi *sfoglia*, che è un
gesto diverso dal filtrare.

**🟠 Il pannello scavalcava il proprio tetto.** L'altezza calcolata sullo spazio
disponibile ignorava il massimo di 340px del disegno: misurati 433. Una tendina
alta mezzo schermo non si legge, si subisce.

### Una trappola, chiusa in partenza

Il cassetto ha `overflow: hidden`: un pannello in `position: absolute` ci sarebbe
stato **tagliato dentro**. La tendina è `position: fixed` e prende le coordinate
dal grilletto, riposizionandosi allo scorrimento e scegliendo se aprirsi in giù o
in su secondo lo spazio. Verificato: `tagliatoDalCassetto: false`.

### Collaudo

| | esito |
|---|---|
| filtro «luogo» | **4** · i quattro complementi di luogo |
| filtro «specificazione» · «agente» · «termine» | 1 ciascuno |
| filtro «tempo» | 2 · continuato e determinato |
| filtro senza risultati | «Nessuna voce con questo filtro.» |
| tastiera | ↓↓ + Invio → il `<select>` passa da «Aggettivo» a «Verbo» |
| pannello | `fixed`, allineato al grilletto, dentro la finestra, tetto 340 |
| greco | 53 voci, gruppi in blu Poetrify, «genitiv» → 2 |
| contrasti | minimo **5,68** in chiaro · **6,59** in scuro · niente sotto i 10px |
| fino in fondo | scelta dalla tendina → «Crea sintagma» → sintagma creato, nessun pannello orfano |

`brace_check = 10` · `node --check` OK · console pulita.

## 7 · Le porte del cassetto

Il cassetto ospita **tre inquilini diversi**, e conviene dirlo per esteso perché
per un pezzo se ne è visto uno solo.

| porta | che cosa entra | da quale gesto |
|---|---|---|
| **1 · la parola** | `.token-action-bar` — scelta della parte del discorso, «Assegna», «Annulla» | clic su una parola del brano |
| **1bis · la tappa** | i pannelli dello scheletro — il verbo attivo, la congiunzione attiva | si aprono lavorando, nelle tappe del percorso |
| **2 · la voce** | `.entry-fields` — il modulo intero: declinazione, genere, numero, caso, lemma | apertura di una voce nella lista |

L'ordine dei numeri non è casuale: la porta 1bis sta **fra** le altre due perché
ne condivide la natura con la prima — è un gesto automatico, si apre lavorando —
e come quella cede il passo alla voce aperta a mano, che è una richiesta esplicita.
La sezione 8 la racconta per intero.

La via 2 esisteva, era scritta bene e **non la innescava nessuno**:
`window.openAnalysisDrawer` era definita e mai chiamata in tutto il file. Chi
apriva una voce col `▶` vedeva i campi comparire in fondo alla pagina — misurato
a `y=975` su uno schermo alto 1440 — con il pannello di destra vuoto. Sembrava un
pannello rotto; era un pannello a cui nessuno bussava.

Un cablaggio c'era, ma su un gesto che quasi nessuno fa: un listener delegato
sull'intestazione della carta, che risponde al clic sul **testo**. Due barriere lo
tenevano fuori dal gesto principale:

1. `toggleEntryExpanded` apre con `evt.stopPropagation()`, e quel listener sta su
   `document` in fase di risalita: il clic sul `▶` non gli arriva mai;
2. la sua guardia esclude i pulsanti — e il `▶` **è** un pulsante. La guardia
   serve (il cestino non deve aprire il pannello), ma buttava via insieme al
   cestino l'unico comando che dice «apri questa voce».

Per questo il collegamento sta dove la voce **cambia stato**, non nel listener. Si
apre il cassetto solo per la voce *indirizzabile*, quella la cui carta porta
`data-sent`/`data-entry`: oggi le emette la sola `renderGrammarEntry()`, e il
controllo è sulla presenza degli attributi e non su un elenco di tipi, così il
giorno in cui anche la sezione logica li emetterà entrerà nel cassetto da sola.
Richiudere la voce chiude il pannello; «Comprimi tutto» chiude anche l'inquilino,
mentre «Espandi tutto» non tocca nulla — aperte tutte, non ce n'è una da ospitare
più delle altre.

### Collaudo

| prova | esito |
|---|---|
| `▶` su una voce | campi da `y=975` a `y=246`, **dentro** il cassetto, carta marcata `is-in-drawer` |
| controlli ospitati | 33 (sostantivo latino) · 45 (verbo) · 31 (sostantivo greco) |
| i pulsanti premuti davvero | declinazione «I» e genere «Femm.» passano a `seg-btn on` |
| dopo il ridisegno | i campi **restano** nel cassetto: una sola copia, la carta non li ricontiene |
| `▶` di nuovo | cassetto svuotato, `__adrawer` a `null`, l'invito del tavolo torna |
| leggìo 1536×864 | cassetto a `x=971`, largo 565, dentro lo schermo |
| tavolo 2560×1440 | colonne `264 · 1180 · 480`, campi a `y=246` |
| tablet 768×1024, greco | campi nel cassetto, «μῆνιν» in testata con gli accenti |
| telefono 375×812 | foglio dal basso, chiude a `812`; nessun bersaglio sotto i 44px, nessun campo di scrittura sotto i 16 |

Un bersaglio era fuori norma e non lo era per caso: `.toggle-mode-btn`, il `✎` che
commuta fra scelta e scrittura libera, misurava **40px** perché la sua classe non
era nell'elenco della regola per il tocco. Aggiunta.

Due letture, durante il collaudo, hanno mentito e vanno ricordate come tali: i
campi sembravano **duplicati** (una copia nella carta e una nel cassetto) e il
foglio del telefono sembrava **non salire**. La prima era una misura presa nello
stesso tick del clic, mentre la risincronizzazione è asincrona; la seconda è la
transizione CSS che in un riquadro che non compone fotogrammi non avanza mai.
Rimisurate a cose ferme — e con la transizione spenta — entrambe erano a posto.

`brace_check = 10` · `node --check` OK · console pulita.

## 8 · La terza porta · le tappe dello scheletro

Chi lavorava una tappa del percorso — Verbi, Proposizioni — vedeva il pannello
dell'analisi aprirsi **in linea sotto il brano**, con la colonna di destra a
`0px`, e non capiva perché il cassetto ci fosse altrove e lì no.

La ragione stava in una frontiera. L'app disegna l'analisi con **tre famiglie di
markup**, non due: le carte-voce, la barra del token, e i renderer dello
scheletro (`renderScheletro*`) che hanno un linguaggio proprio — `.schel-vq-row`,
`.schel-conn-bar`, `.schel-defconj-bar`. Contati sulla regione intera dello
scheletro, righe 28548-29300: **zero** agganci che il cassetto sapesse afferrare.

### La porta stretta, e perché non l'unificazione

Si poteva far emettere allo scheletro le stesse carte indirizzabili dell'Analisi,
riducendo le famiglie da tre a due. Sarebbe stato più pulito e molto più
invasivo: quei renderer non hanno solo un markup, hanno una logica d'interazione
propria — i bottoni che commutano finito e non finito, la barra dei connettivi,
il flusso di conferma — e riscriverne il markup vuol dire ricablare i gestori.
Si è scelta la porta stretta: **non si riscrive lo scheletro, gli si apre un
ingresso**.

### Un elenco, non tre rami

La porta non ramifica. Dichiara le sedi, e la prossima tappa che nascerà con un
pannello proprio si aggiunge con una riga:

| pannello | il nome della parola | categoria |
|---|---|---|
| `.schel-vq-row.is-active` | `.schel-vq-word` | Verbo |
| `.schel-conn-bar` | `.schel-conn-bar-word` | Congiunzione |

**Restano fuori le viste d'insieme, e non per dimenticanza.** Il Nucleo è una
griglia di celle sull'intera frase, i gruppi SVO raccolgono la frase, la
Traduzione è il campo di scrittura della frase: non hanno «quello aperto» da
portare via, e in una colonna da 540px starebbero peggio di dove stanno. Nello
scheletro esistono due soli stati «aperto», `scheletroActiveVerb` e
`scheletroActiveConn`, e sono esattamente i due della tavola.

### Il congedo è metà della porta

Nascondere la testa della riga dentro il cassetto — il nome lo dice già la
testata — sembrava una rifinitura, ed era la rimozione dell'**unica uscita** di
quel pannello: la × non chiudeva, perché la voce resta attiva nello stato e la
sincronia se la riprendeva al primo giro. Vale come regola: **ogni porta ha
bisogno del suo congedo**, e si preme quello che il pannello già possiede — la
testa per il verbo, il pulsante «chiudi» per la congiunzione — invece di
limitarsi a nascondere il cassetto.

### Una voce uscita dall'elenco prima di entrarci

`.schel-defconj-bar` — la barretta «è una congiunzione o un pronome relativo non
rilevato?» — sembrava un terzo candidato. Provandola: quando compare, compare
**insieme** al pannello della proposizione, che il cassetto prende già dalla prima
porta e che è il lavoro vero. Non si è riusciti a produrre uno stato in cui
vincesse, e una riga di configurazione che non scatta mai promette una copertura
che non c'è. È uscita, col perché scritto accanto.

Quella prova ha portato una buona notizia non cercata: il pannello della
**proposizione** era già ospitato dalla prima porta, perché contiene una
`.token-action-bar`. La copertura era più larga di quanto la mappa dicesse.

### Collaudo

| prova | esito |
|---|---|
| tappa Verbi, verbo marcato | pannello in `#analysis-drawer-body`, colonne `60 · 678 · 542` |
| testata | «VOCE IN COMPILAZIONE · deplorare · Verbo» |
| comando premuto nel cassetto | «modo non finito» → stato `_scheletroForma: non-finita`, `verboForma: Infinito` |
| dopo il ridisegno | pannello ancora ospitato, **una sola copia** |
| × sul verbo | riga a casa **collassata**, colonna a `0px` |
| tappa Proposizioni, congiunzione | «VOCE IN COMPILAZIONE · enim · Congiunzione», una copia |
| select nel cassetto | «Coordinante copulativa» → stato `congiunzioneTipo` |
| × sulla congiunzione | `scheletroActiveConn` azzerato, colonna a `0px` |
| non-regressione porta 1 | «PAROLA SELEZIONATA · vitam», 5 controlli, nessuna intrusa |
| non-regressione porta 2 | «VOCE IN COMPILAZIONE · Non · Avverbio», 13 controlli, una copia |

`brace_check = 10` · `node --check` OK · script verificato arrivare in fondo.
