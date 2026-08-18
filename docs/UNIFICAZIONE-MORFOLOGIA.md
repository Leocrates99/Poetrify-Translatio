# Unificazione della morfologia classica

> Chiude il reperto aperto dalla whitelist degli orfani: *la morfologia greca è
> implementata due volte*. Lo era, e le due copie erano già divergenti — con
> una che emetteva **forme sbagliate**.

## 1 · Che cosa divergeva, misurato

Venti funzioni esistevano in entrambe le copie (`translator.html` e
`modules/engine/paradigm.js`). Confrontando i corpi a meno di commenti e spazi:

- **13 identiche** — pura duplicazione;
- **2 divergenti solo in apparenza**: `_grStrip` e `_placeRecessiveAccent`
  scrivevano l'intervallo dei segni combinanti con gli escape `̀-ͯ`
  da un lato e coi caratteri letterali dall'altro. Stesso comportamento (ed è
  la ragione dei due delta di −10 caratteri identici, che all'inizio sembravano
  la stessa modifica);
- **5 divergenti davvero.**

### Le divergenze vere

| Dove | Monolite (translator) | Modulo (dizionario) |
|---|---|---|
| `buildVerbParadigm` | `supStem + 'urus esse'` → *amaturus esse* | `supStem + 'urum esse'` → **amaturum esse** |
| `buildIrregularVerbParadigm` | `futurus, -a, -um esse` · `laturus esse` · `iturus esse` | **`futurum esse`** · **`laturum esse`** · **`iturum esse`** |
| `parseGreekLemma` (III decl.) | `/^(πατ\|μητ\|θυγατ\|ανδ\|γαστ)$/` | **`/^(πατρ\|μητρ\|θυγατρ\|ανδρ\|γαστρ)$/`** |
| `parseGreekLemma` (aggettivi) | senza `nom` | con **`nom: masc`** (serve all'accento persistente) |
| `buildGreekNounParadigm` | — | **tutta la macchina dell'accento persistente** (`_grAccentRead`, `_grAccentThirdForm`, `kStart3`, `acc3`) |

**Il monolite aveva torto in tutti e cinque i casi.**

- L'**infinito futuro latino** vuole il participio futuro in *accusativo*, perché
  nell'infinitiva regge l'accusativo del soggetto: *dicit se amaturum esse*, non
  *amaturus esse*. Sbagliato in quattro punti, fra i regolari e gli irregolari
  `sum` · `fero` · `eo`.
- La **regex degli apofonici della III** non poteva combaciare **mai**: il tema
  si ricava dal genitivo a grado zero (*μητρός* → `μητρ`), e la regex cercava
  `μητ`. Conseguenza: *πατήρ, μήτηρ, θυγάτηρ, ἀνήρ, γαστήρ* finivano fra i
  regolari, e si declinavano come *ῥήτωρ*.
- L'**accento persistente** greco non c'era affatto: è il lavoro registrato come
  «accenti greci corretti, lug 2026», che era entrato solo nel modulo.

## 2 · La direzione scelta, e perché

**Fonte unica = il modulo**, che è la copia corretta e più ricca. Ma il grosso
del translator è uno script **classico**, che non può `import`. Da qui il
disegno:

1. La morfologia esce da `paradigm.js` in un modulo suo,
   **`modules/engine/morfologia-classica.js`** — 32 entità (28 funzioni +
   4 tabelle), il 74% di `paradigm.js`. Non è un travaso arbitrario: è la
   separazione fra **morfologia** (quali forme) e **presentazione** (come si
   mostrano). `paradigm.js` resta il livello di presentazione del dizionario e
   importa da lì.
2. `translator.html` perde le sue 20 copie: diventano **deleganti** di tre righe
   verso il modulo, che il suo blocco `<script type="module">` importa e posa sul
   globale `_MORF`.

Ogni pagina conserva i propri renderer e le proprie etichette: unificare anche
quelli avrebbe cambiato l'interfaccia oltre la richiesta.

### La guardia, e perché non è pigrizia

I moduli sono differiti: per qualche millisecondo dopo il caricamento la
morfologia non c'è. In quella finestra il delegante restituisce `null` e il
pannello mostra il proprio messaggio «paradigma non generabile» — non un errore
in console. Verificato che **nessuna** chiamata morfologica avvenga al boot: le
vie sono tutte innescate dall'utente.

E poiché un `null` silenzioso è peggio di un errore, il blocco di
autodiagnostica del translator ha ora un allarme: se l'import si rompesse, il
test «morfologia caricata» fallisce invece di far sparire i paradigmi in
silenzio.

## 3 · Come è stato provato che il dizionario non è cambiato

Prima di toccare `paradigm.js` ho catturato una **rete di forme d'oro**: 54 casi
— 20 sostantivi greci (comprese tutte e cinque le III apofoniche), 6 aggettivi,
10 verbi (tematici, contratti in -άω/-έω/-όω, atematici in -μι, `εἰμί`), 8 verbi
latini, 7 sostantivi, 3 aggettivi — passati per `parse` e poi per `build`, con
l'impronta dell'intero risultato.

- **prima dell'estrazione: `1875218424`**
- **dopo l'estrazione: `1875218424`**

Identica, 54 casi su 54, zero errori. E dopo, sulla pagina del dizionario:
`buildClassicalParadigm` e `renderClassicalParadigm` intatte, citazioni ed
etichette invariate (*λύω, λύσω, ἔλυσα, λέλυκα* · *verbo tematico regolare*).

## 4 · Che cosa è cambiato per chi usa il translator, in meglio

Verificato nel browser, sul translator:

| | prima | ora |
|---|---|---|
| infinito futuro di *amo* | *amaturus esse* | **amaturum esse** |
| infinito futuro di *sum* | *futurus, -a, -um esse* | **futurum esse (o fore)** |
| `πατήρ` | `III-r` (come *ῥήτωρ*) | **`III-r-apof`** |
| `ῥήτωρ` | `III-r` | `III-r` (invariato, ed è giusto) |
| declinazione di `πατήρ` | senza apofonia | **πατήρ, πατρός, πατρί, πατέρα, πάτερ / πατέρες, πατέρων, πατράσι(ν), πατέρας** |
| declinazione di `μῦθος` | senza accento persistente | **μῦθος, μύθου, μύθῳ, μῦθον, μῦθε** |

## 5 · Bilancio

- `modules/engine/morfologia-classica.js` — **nuovo**, 131 KB, fonte unica;
- `modules/engine/paradigm.js` — da 156 KB a 39 KB, solo presentazione;
- `translator.html` — 105 KB in meno, 20 deleganti al posto di 20 copie stale;
- zero funzioni orfane, `brace_check` 10, `node --check` OK, console pulita su
  translator (latino e greco) e dizionario.

Da qui in avanti **la divergenza non può ripetersi**: di morfologia ce n'è una
copia, e chi la cambia la cambia per tutti.
