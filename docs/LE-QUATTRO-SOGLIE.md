# Le quattro soglie · una dichiarazione sola

> Consolidamento delle soglie di schermo nei token condivisi. Con un limite
> tecnico dichiarato invece che aggirato, e un difetto di consegna trovato
> strada facendo.

---

## 1 · Che cosa c'era

Su sei file vivi giravano **diciassette larghezze diverse**: 360, 420, 480, 520,
560, 600, 620, 640, 700, 720, 760, 767, 800, 860, 899, 900, 901, 1024, 1100,
1800.

Ma non sono tutte la stessa cosa, e confonderle è il motivo per cui non esisteva
un sistema:

- alcune sono **confini di classe** — la pagina cambia impianto;
- la maggior parte sono **ritocchi di componente** — «qui questa targhetta sta
  stretta».

## 2 · La dichiarazione

In `shared/poetrify-tokens.css`, dentro `:root`:

```css
--bp-mano: 768px;             /* < 768        una colonna · pannello dal basso 60% */
--bp-tablet: 1280px;          /* 768–1279     una colonna · pannello dal basso 45% */
--bp-leggio: 1800px;          /* 1280–1799    due colonne + cassetto a richiesta  */
--bp-altezza-scarsa: 900px;   /* ≥ 1800       tre colonne, il cassetto c'è        */
```

Separano **capacità**, non dimensioni: *ho una seconda colonna?*, *posso tenere
il pannello sempre aperto?* E la quarta è un'**altezza**, perché l'asse scarso
non è sempre la larghezza.

### Il limite, detto e non aggirato

**Una custom property non si può usare dentro la condizione di una media
query.** `@media (max-width: var(--bp-tablet))` non scatta, in nessun browser.

Quindi questi token sono la **fonte dichiarativa**: li legge il JavaScript — che
li usa davvero — e li cita il CSS, dove il numero va scritto alla lettera con
accanto il nome della classe. Fingere il contrario avrebbe prodotto regole che
non scattano: un consolidamento che sembra fatto e non funziona è peggio di
nessun consolidamento.

`adrTavolo` ora legge `--bp-leggio` invece di ripetere `1800`, con ripiego al
valore dichiarato se il foglio non fosse caricato.

## 3 · Il difetto trovato strada facendo

Misurando, `--bp-mano` risultava **vuota** nel browser mentre il file sul server
la conteneva. Causa: `shared/poetrify-tokens.css` era linkato **senza versione**,
e il browser serviva la copia in cache.

Non riguarda solo le soglie. **Tutte** le modifiche ai token di questa sessione —
la palette delle parti del discorso unificata, `--brass-ink`, il verso scuro
della palette dei casi — arrivano a chi ha già visitato il sito solo quando la
sua cache scade. È lo stesso difetto da cui è partita la sessione: *il lavoro
c'era e non si vedeva*.

La convenzione esisteva già nel repo (`ocr.js?v=0.4.1`) e non era mai stata
estesa agli asset condivisi. Ora il foglio dei token è versionato in **tutte e
sei** le superfici.

## 4 · L'allineamento, dove significa qualcosa

Delle nove soglie a 720 px del translator, **otto sono ritocchi di componente**
(margini della barra dello scheletro, righe del nucleo, targhette dei preset,
testata dei paradigmi, ponte periodale, modale, barra del dizionario, righe di
glossa). Rinumerarle sarebbe rumore.

**Una sola era un confine di classe**: il blocco che porta la griglia a una
colonna, il rail della navigazione e i fogli fissi. Stava a 720 mentre il canone
dichiara la mano sotto i 768 — e mentre le regole nuove del foglio dal basso
usano già 767. Fra 721 e 767 c'era una fascia di **47 px** in cui il translator
si comportava da tablet e il canone lo chiamava mano. Ora è a 767.

**Verificato**: a 760 il corpo del testo è 14 px (mano), a 768 è 15 px (tablet);
la fascia c'è in entrambi, nessuno scroll orizzontale, console pulita.

## 5 · Che cosa NON ho rinumerato, e perché

- **`dictionary.html` a 1024** (due colonne → una). Il canone direbbe 1280, ma
  fra 1024 e 1279 il dizionario lavora bene in due colonne: la sua rail è di
  320 px ausiliari, e a 1100 px ci sta. Rinumerarlo toglierebbe un impianto che
  funziona per far quadrare una tabella. **Le classi sono nate per il banco** —
  un testo più un pannello — e non vanno imposte a una superficie che ha un altro
  problema.
- **`corpus.html` a 860**, **`app.html` a 900**: idem, sono i punti in cui *quel*
  contenuto sta stretto.
- **tutte le soglie sotto i 700**: sono componenti, non classi.

Consolidare non vuol dire far flettere tutte le superfici allo stesso pixel: vuol
dire che i numeri che esprimono una **classe** vengono da un elenco solo, scritto
in un posto solo, e che chi ne usa un altro sa di star parlando di un componente.
