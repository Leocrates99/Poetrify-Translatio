# CORPUS_SPEC · contratto operativo del ramo Corpus

Fonte di verità per l'import e la manutenzione del **corpus dei testi antichi**.
Da rileggere prima di ogni intervento sul ramo. Gemello di `BUILD_SPEC.md` (dizionario).

Ultimo audit: **30 luglio 2026** — artifact di riferimento:
<https://claude.ai/code/artifact/da8e7057-70f1-4bdf-8f2c-da310cb85429>

---

## 1 · Perimetro deciso (30 lug 2026)

| Decisione | Scelta | Perché |
|---|---|---|
| **Ampiezza** | **solo il canone Perseus** — `canonical-latinLit` + `canonical-greekLit` | ~1.169 opere, ~174 MB di JSON: copre il liceo per intero e lascia ampio margine sotto il tetto di 1 GB di GitHub Pages |
| **First1KGreek** | **escluso** (per ora) | 1.091 opere, 376 MB di XML (61% del volume open): patristica, bizantini, scoli — uso scolastico raro. Innestabile in seguito aggiungendo una riga a `REPOS` |
| **Genere ed epoca** | **dedotti dall'autore, dichiarati** | I file CTS non li contengono; su 1.169 opere la curatela manuale è impraticabile. Il dato esce con `inferred: true` e l'interfaccia lo mostra come dedotto |
| **Identificativo** | `<textgroup>.<work>` (es. `phi0448.phi001`) | Canonico CTS, univoco, senza collisioni: è la stessa spina dorsale del *locus* |

**Fuori portata per legge:** TLG e PHI (consultabili ma non ridistribuibili),
edizioni critiche recenti (sotto copyright). Quello che importiamo *è* il corpus open.

---

## 1-bis · Risultato dell'import (ultimo giro: 1 ago 2026)

| | |
|---|---|
| **Opere importate** | **1.120** (349 latine · 771 greche) |
| **Autori** | **150**, tutti con nome italiano e classificazione |
| **Parole** | **15.476.974** in **614.879** unità citabili |
| **Peso** | testi 166,8 MB + indice 28,7 MB = **195 MB**; sito totale **431 MB** su 1.024 |
| **Indice** | 704.752 forme distinte · 3.970.217 coppie forma-opera · 65 spicchi |
| **Scartate** | 106: 57 solo-traduzioni · **46 doppioni** (45 di Livio, 1 di Sulpicia) · 2 XML rotti · 1 bilingue |

Prove di ricerca superate:
`virtus` → 187 opere ristrette, Cicerone in testa con 44 ·
`μηνιν` (senza accenti) → 49 opere ·
`Gallia est omnis` (frase) → 88 opere candidate al primo stadio, **1 solo passo** al
secondo: Cesare 1,1,1. È la prova che l'architettura a due stadi funziona — l'indice
restringe, il browser conferma.

> **Il conteggio scende da 1.166 a 1.120 e non è una perdita.** Livio era importato due
> volte (§1-ter): togliendo i 45 doppioni si perdono 494.723 parole di testo ridondante
> e se ne guadagnano 11.917 di testo che prima non entrava affatto. Il quarantaseiesimo
> scarto è Sulpicia (§1-quater). Le opere latine passano da 395 a 349; le greche non si
> toccano.

### 1-quater · Le sovrapposizioni che NON sono doppioni d'import (1 ago 2026)

Una scansione a 5-grammi su tutte le opere ha trovato, oltre a Livio, tre coppie ad alto
contenimento. **Nessuna nasce da un difetto del codice** — hanno tutte il loro
`__cts__.xml` — ma per chi cerca il sintomo è identico: lo stesso testo due volte.
Vanno decise una per una, e le tre decisioni sono diverse:

| Coppia | Contenimento | Decisione |
|---|---|---|
| Tibullo *Elegie* ⊃ *Carmina omnia* | **0,960** | **potata**: sono le sei elegie di Sulpicia, già in III 13-18 |
| Ausonio *Eclogarum liber* ⊃ AV *De institutione viri boni* | 0,800 | **tenuta** |
| idem ⊃ AV *De est et non* | 0,639 | **tenuta** |

La differenza è di natura, non di soglia. La scheda di Sulpicia ripeteva lo **stesso**
testo dello **stesso** autore rinumerandolo da 1 a 6 sotto il titolo «Carmina omnia»:
insegnava una citazione che non esiste. Le due dell'Appendix Vergiliana no — sono la
stessa poesia sotto **due attribuzioni diverse**, con varianti reali («nihil est hominum»
contro «nil est, hominum»): cancellarle toglierebbe dal catalogo un fatto di tradizione.
Restano dunque, col difetto dichiarato che il loro file non ha marcatura di verso
(`body` → `head` + un solo `<p>`) e la scheda esce con una unità sola e il locus vuoto.
Irreparabile dalla fonte: la versione citabile per verso è quella ausoniana.

> **Non usare il contenimento come regola automatica.** A soglia 0,60 cadrebbero anche
> nove delle dieci periochae di Livio e le due dell'Appendix Vergiliana. La sovrapposizione
> dice dove guardare, non che cosa fare.

### 1-ter · Livio, e i due difetti che ha scoperchiato (1 ago 2026)

Livio è l'**unico** textgroup del canone — uno su 1.226 directory d'opera — in cui
accanto all'opera dichiarata dal catalogo CTS stanno altre 46 cartelle senza
`__cts__.xml`, che l'enumeratore promuoveva a opere. Mezzo milione di parole in
catalogo due volte: ogni passo di Livio usciva doppio dalla ricerca. Si tiene il
Teubner Weissenborn-Müller (`phi0914.phi001`), uniforme e con l'edizione dichiarata;
le 45 cartelle stanno in `ESCLUSE` (`import_corpus.py`) e l'esclusione è **dichiarata**
nel registro d'import, non silenziosa. Nulla di ciò che davano va perduto: le 45
Periochae dei libri I-XLV erano già dentro `phi001` (loci «1s»…«45s»).

Scavando sono usciti due difetti che non riguardavano Livio soltanto:

1. **`edition_root()` teneva un solo `<div>` fratello.** Dove il `<body>` non ha un
   `div type="edition"` ma direttamente le partizioni, si scendeva nella prima e si
   buttavano le altre. Costava due opere quasi intere: le Periochae dei 97 libri
   perduti di Livio entravano con 210 parole su 11.691, i *Fragmenta* di Petronio con
   una unità su 26. **+11.917 parole recuperate.**
2. **Il livello di struttura finiva nel *locus*.** Il `refsDecl` CTS dichiara da quale
   `<div>` comincia il riferimento canonico; `extract()` invece concatenava ogni `@n`
   che incontrava. In 18 file su 1.796 c'è un livello di troppo, e lì la citazione era
   inservibile — **17 opere in uso, tutte di canone**: Catullo si citava «lyrics.5.1»
   invece di 5,1; Giovenale «5.16.60» col numero del libro davanti; le *Lettere a
   Lucilio* «20.124.24»; gli otto *Dialoghi* di Seneca col numero del dialogo in testa
   («10.1.1» per *Brev.* 1,1); Livio con la *pars* del Teubner («2.21.35.1» per 21,35,1).
   Ora `structural_divs()` legge il `refsDecl` e `extract()` attraversa quei livelli
   senza citarli. Livio comincia da `1.pr.1` — la *praefatio* — e finisce a `45.44.21`.

E uno che si è deciso di NON correggere: `<del>` resta in `SKIP_TEXT`. Nel TEI marca
testo espunto dall'editore, e il campione allargato mostra che la fonte lo usa proprio
così — versi interpolati interi nell'*Eneide* e nelle *Metamorfosi*, parole secluse nel
Livio del Teubner. Tenerlo avrebbe rimesso 28.806 parole di testo espunto in 384 opere.
Il prezzo dichiarato: la *periocha* del libro I resta senza il proprio incipit, 145
parole che quel file racchiude in un `<del>` — un caso singolo, non una regola.

### Quattro trappole pagate, da non ripetere

1. **Entità HTML non dichiarate** (`&dagger;` `&mdash;` `&iacute;`…): un parser rigoroso
   rifiuta l'intero file. Costavano 17 opere — nove di un solo autore, una di Tacito,
   una di Cicerone — per una croce tipografica. → `parse_tei()` risana e ritenta.
2. **Il titolo originale non sta in `<title>`** ma nella `<label>` dell'`<edition>`:
   solo 8 opere greche su 772 hanno un `<title xml:lang="grc">`. Senza questo, Tucidide
   entrava in catalogo come «History of the Peloponnesian War».
3. **18 opere in catalogo non hanno `__cts__.xml`** (tutta l'Appendix Vergiliana, Apicio,
   Catone, Beda, Agostino, Sidonio, le Periochae di Livio, i Fragmenta di Petronio): il
   titolo va preso dall'intestazione TEI del testo, o finiscono in catalogo con
   l'identificativo al posto del titolo. Erano 63 prima della potatura di Livio, che ne
   contava 46 da sola — ma **l'assenza del file CTS non è un criterio di scarto**: di
   quelle 63, 45 erano doppioni e 18 sono opere reali senza gemello.
4. **La soglia del cancello distingue il vuoto dal breve.** A 200 caratteri scartava gli
   Inni omerici 13 e 23 — opere complete di tre versi. Sta a 50: i frammenti di Appiano
   (0 caratteri) restano fuori, gli inni entrano.

## 2 · Le sette fasi

Ogni fase ha un **criterio d'uscita verificabile**: se non lo soddisfa, non si passa oltre.

### C0 · Preflight — i cloni locali
L'API di GitHub concede **60 richieste l'ora**: con 1.169 opere è impraticabile.
Si lavora su cloni superficiali.

```bash
mkdir -p _build/corpus_sources && cd _build/corpus_sources
git clone --depth 1 --single-branch https://github.com/PerseusDL/canonical-latinLit.git
git clone --depth 1 --single-branch https://github.com/PerseusDL/canonical-greekLit.git
```

*Uscita:* le due cartelle esistono e contengono `data/`. Sono **gitignorate** (~250 MB).
*Nota:* evita `du -sh` su queste cartelle su Windows — impiega minuti.

### C1 · Catalogo — autore, titolo, edizione
Dai `__cts__.xml` locali. **Tre trappole già pagate**:

1. **Namespace incoerenti**: lo stesso repo usa `ti:`, `cts:` e il namespace di
   default. Filtrare per prefisso fa fallire a caso → si legge sempre per *nome locale*.
2. **Il titolo originale non sta in `<title>`**: solo 8 opere greche su 772 hanno un
   `<title xml:lang="grc">`. Il titolo greco/latino vive nella **`<label>` dell'`<edition>`**
   (Tucidide: `<title>` dà «History of the Peloponnesian War», l'edizione dà «Ἱστορίαι»).
3. **Nomi in forma bibliotecaria inglese** («Cicero, Marcus Tullius»): illeggibili in un
   catalogo per il liceo → tavola `NAMES` in `corpus_meta.py`.

*Uscita:* zero titoli vuoti; nessun identificativo duplicato.

### C2 · Import + cancello di fruibilità — **il punto di non ritorno**

```bash
PYTHONIOENCODING=utf-8 python _build/import_corpus.py            # tutto
PYTHONIOENCODING=utf-8 python _build/import_corpus.py --limit 40 # prova rapida
```

Il cancello (soglie in testa allo script) scarta:

| Criterio | Soglia | Che cosa intercetta |
|---|---|---|
| testo troppo breve | < 200 caratteri | scheda vuota, testo non estratto |
| unità citabili | < 1 | struttura non riconosciuta |
| lingua estranea | > 15% | **edizioni bilingui** (greco con versione latina a fronte) |

Il campione d'audit (30 opere) è risultato pulito al 100%, ma il caso patologico
esiste — `tlg1146` ha il 58,9% di caratteri latini in un testo greco. Per questo il
cancello è automatico e ogni scarto finisce nel registro con la sua ragione.

*Uscita:* **aver letto** `_build/reports/corpus_import.json`, non «il programma è
andato a buon fine». Da qui in poi sono migliaia di file: non si ispezionano più a occhio.

### C3 · Indice di ricerca
Indice inverso **forma → opere** (non le posizioni), diviso per prefisso, come gli shard
alfabetici del dizionario.
*Uscita:* `μηνιν` → Iliade; `Gallia` → Cesare; peso complessivo entro i 60 MB.

### C4 · Catalogo a faccette — **fatto**
Faccette genere ed epoca (i conteggi si calcolano sulla selezione dell'*altra* faccetta,
così dicono il vero), colonna autori con filtro, pagina d'autore, disegno **incrementale**
a blocchi di 60 con sentinella. La lingua NON è una faccetta: si sceglie a monte in
`lingua.html`, e gli switch interni sono stati deliberatamente rimossi dal progetto.

### C5 · Ricerca a due stadi — **fatto**
Sostituisce `loadAll()`. Una sola casella per due domande: prima i **risultati di
catalogo** (istantanei, sono già in memoria), poi i **passi nei testi** via indice.

**Ordine dei candidati per canone, non alfabetico** (`CANON_RANK` in `corpus.html`):
quando l'indice restringe a più opere di quante se ne aprano, chi resta fuori dal taglio
conta. In ordine alfabetico, cercando `virtus` il primo risultato era *Agostino* e
Cicerone rischiava di non entrare; con l'ordine per epoca il canone viene prima. È una
preferenza didattica **dichiarata**: la riga di stato dice sempre quante opere sono
state escluse.

*Tetti:* 60 opere aperte, 200 passi mostrati — entrambi annunciati in chiaro, mai taciuti.

### C6 · Pubblicazione
*Uscita:* sito sotto il tetto di Pages; ponti verso Translator e Dizionario verificati dal vivo.

---

## 3 · Forma del dato

```
data/corpus/
├─ _index.json              catalogo: counts · facets · authors · works
├─ la/<tg>.<wk>.json        una per opera
└─ grc/<tg>.<wk>.json
```

Per opera: `id · lang · author · authorId · title · titleEn · genre · epoch ·
inferred · kind (versi|prosa) · source{urn,repo,file,edition,license} · citation ·
units[{loc,t}] · stats{units,words}`.

`loc` = *locus* canonico (`1.1.1`, `libro.verso`…): è ciò che rende citabile ogni
passo e regge i ponti verso gli altri rami.

---

## 3-bis · Revisione avversariale (30 lug 2026) — che cosa è emerso

Il primo import «funzionava»: apriva, cercava, leggeva. Una revisione a lenti multiple
con verifica per confutazione ha però trovato che **il testo estratto era incompleto**,
e nessuno dei difetti era visibile dall'interfaccia. Recuperati con le correzioni:
**+9 opere · +64.720 parole · +48.940 unità citabili** (568.150 → 617.090).

| Difetto | Effetto reale | Correzione |
|---|---|---|
| Marcatura TEI antica `<div1>`/`<div2>` non riconosciuta | opere intere collassate in **una sola unità** con locus vuoto | `DIVLIKE = div\d*` in `extract` e `edition_root` |
| `<p>` fratelli di `<l>`/`<div>`/`<sp>` scartati | il vecchio `if handled: return` usciva prima di guardarli: paragrafi spariti nelle opere miste | un **unico ciclo** tratta versi e paragrafi insieme |
| `<cit>` in `SKIP_TEXT` | ~20.000 parole di **testo citato** buttate con la referenza | tolto `cit`; `bibl`/`ref` bastano a togliere la sola bibliografia |
| `<l>` dentro `<quote>`/`<cit>` mai estratti | ~17.000 **versi appiattiti in prosa**, opere classificate «prosa» a torto | si scende nei contenitori `quote`/`cit` |
| `<speaker>` ignorato | i nomi dei personaggi sparivano dal dramma | ramo dedicato: nel dramma il personaggio **è** testo |
| `abbr`/`expan` e `sic`/`corr` **fuori** da `<choice>` | nel testo comparivano **entrambe** le letture | `IMPLICIT_CHOICE`: fratelli trattati come scelta implicita |
| Contenitori senza `@n` | fino a **35 unità con lo stesso locus** → impossibile puntare al passo | la posizione entra nel locus + rete di sicurezza `dedupe_loci` |
| `source.edition` scelto per lingua | opere con più edizioni attribuite alla **stampa sbagliata** | corrispondenza esatta con l'`urn` del file importato |
| **`--limit` cancellava il corpus** | la «prova rapida» faceva `rmtree` di 1.157 opere per scriverne 40 | con `--limit` non si ripulisce e non si riscrive il catalogo |
| La cache memorizzava i **fallimenti** di rete | una connessione caduta su uno spicchio da 3 MB faceva rispondere «nessuna opera contiene questa forma» — falso — per tutta la sessione | si memorizza solo l'esito buono e il 404; richieste in volo condivise |
| `candidateWorks` confondeva «indice assente» e «query senza lettere» | cercare `1.1` accusava l'indice di essere rotto | due esiti distinti (`NO_INDEX` / `NO_WORDS`), due messaggi |

**Confutati** (nessuna modifica): prefisso vs sottostringa nei due stadi · ricerca in volo
non annullata · `shard[t]` e `Object.prototype` · l'import che non invalida `_idx/`.

## 4 · Regole d'oro del parser TEI

Tre correzioni pagate con bug reali — **non toccarle a cuor leggero**:

1. **Il `.tail` si aggiunge in UN solo punto** (il loop del genitore). Gestirlo anche nel
   ramo «elemento saltato» duplica il testo: era il bug per cui l'incipit dell'Iliade
   compariva due volte.
2. **Concatenare i nodi senza separatori.** Il TEI porta già i suoi spazi; unire con spazi
   spezza le parole tagliate da un elemento inline (`Ti<milestone/>tum` → «T itum»).
3. **`<choice>` = varianti mutuamente esclusive** (`abbr`/`expan`, `orig`/`reg`,
   `sic`/`corr`): se ne prende **una**, non tutte. Preferiamo la forma espansa
   («Titum», non «Ti. Titum»).

---

## 5 · Manutenzione

- **Aggiungere First1KGreek**: una riga in `REPOS` (`import_corpus.py`) + il clone in C0.
  Prima però va risolto il bivio del peso (vedi §1 e il capitolo 8 dell'audit).
- **Correggere genere/epoca di un'opera**: eccezione in `WORKS` (`corpus_meta.py`) —
  esce come curata (`inferred: false`), non dedotta.
- **Nuovo autore senza nome italiano**: riga in `NAMES`. Chi manca tiene il nome CTS
  (mai inventato) e viene elencato a fine import.
- **Escludere un doppione della fonte**: riga in `ESCLUSE` (`import_corpus.py`) con la
  ragione scritta per esteso. Passa dallo stesso canale degli scarti, quindi finisce
  **dichiarata** nel registro `_build/reports/corpus_import.json` invece di sparire.
- **Rigenerare tutto**: l'import è idempotente e ripulisce `data/corpus/<lang>/` prima
  di riscrivere. **Non basta:** `data/corpus/_idx/` è versionato e va ricostruito a
  parte con `python _build/build_corpus_index.py`, altrimenti il manifesto continua a
  puntare a opere che non esistono più e la ricerca porta a schede vuote. Il controllo
  è di una riga: `len(_manifest.json["works"]) == _index.json["counts"]["works"]`.
- **Cambiare il conteggio delle opere**: oltre a §1-bis qui sopra, il numero è scritto
  in chiaro in `app.html` (due punti, uno visibile all'utente), `corpus.html` (commento)
  e `translator.html` (visibile). Cercare la cifra vecchia in tutto il repo.
