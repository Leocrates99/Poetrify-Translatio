# Poetrify · Roadmap UX/UI — prompt operativi (allineati allo stato reale)

Serie di **7 prompt** (Passi 0→6) per **completare** la migrazione UX/UI già avviata, non per rifarla. Incollane **uno per sessione** Claude Code aperta sul repo, **in ordine**. Ogni prompt è autoportante.

## Stato reale della migrazione (lug 2026)

La migrazione è il **§8 del «Protocollo UX/UI»** (`05 - Officina/05.01 Protocollo UX-UI/`), in corso sul branch **`migrazione-protocollo-ux`**. **Già committato:**

- **`shared/poetrify-tokens.css`** — fonte unica dei token (colori, accenti-lingua `--dacc`/`--accent`, ottone `--brass`, superfici calde, semantici con varianti testo `--*-ink` a norma AA, raggi, scala 8pt, ombre, tipografia). Debiti sanati **D1/D2/D3/D4/D7/D8/D10**.
- **`shared/poetrify-theme.js`** — IIFE condiviso, API `window.PoetrifyTheme.{toggle,set,current}`, attributo `data-inject-toggle`, dark **stateful** su `:root[data-theme="dark"]` (su `<html>`) + **script anti-flash** in `<head>`.
- **Pagine agganciate:** `app.html`, `corpus.html`, `dictionary.html`. Font **già deciso** (Source Sans 3 UI · Source Serif 4 · Playfair · GFS Didot per il greco). Contrasti, dark e reduced-motion **già fatti**.
- **`_build/`** ha già la terna validatori del translator: `brace_check.py` · `balance.py` · `check_refs.py`.

**Cosa resta** (bersaglio di questa roadmap): agganciare il **translator** (unica pagina fuori da `shared/`), il **cache-bust `?v=N`**, il **layer dei componenti** (`shared/poetrify-components.css`, ancora assente), l'**armonizzazione dei contenuti UX** (gli 11 aspetti dell'audit: header, nav, controllo lingua, livello, naming, gate, ricerca), gli **a11y residui** della CHECKLIST, e la **governance anti-drift**.

## Nomi & pattern reali (usa SOLO questi)

| Concetto | Nome/pattern reale | ⚠️ Mai usare |
|---|---|---|
| Token | `shared/poetrify-tokens.css` | ~~poetrify-variables.css~~ |
| Componenti (da creare) | `shared/poetrify-components.css` | ~~poetrify-ui.css~~ |
| JS condiviso / tema | `shared/poetrify-theme.js` · `window.PoetrifyTheme` · `data-inject-toggle` (IIFE) | ~~modules/ui/shell.js~~ · ~~mountShell~~ |
| Dark | `:root[data-theme="dark"]` su `<html>` + anti-flash in `<head>` | ~~body-class multipli~~ |
| Lingua | `body[data-lang]` doppio `la\|latino` / `grc\|greco` | — |
| Validatori translator | `_build/brace_check.py` + `balance.py` + `check_refs.py` | — |
| Definition of Done | `_Protocollo-UX-UI/CHECKLIST.md` (non crearne altre) | — |

## Invarianti (a ogni passo)

- **Colore = lingua**, costante e **sempre con etichetta** (WCAG 1.4.1); ottone `--brass` neutro per le sezioni bilingui.
- **«Duplicato ≠ divergente»:** valori letti dal sorgente, mai a memoria.
- Token/classi canoniche **solo in `shared/*`**, mai in uno `<style>` inline.
- Una modifica non è «done» finché non vale su **tutte e 4 le superfici**.
- **Ogni tocco a `translator.html`** (~2 MB) passa la **terna** (baseline prima, net-0 dopo).
- **Cache-bust:** ogni commit che modifica `shared/*` incrementa `?v=N` su tutte e 4 le pagine nello stesso commit.
- Repo dell'utente: **commit + push** sul branch `migrazione-protocollo-ux` senza chiedere. Decisioni non ovvie → archiviate in `aisthesis`.

## Indice dei passi

0. **Ricognizione residua della migrazione (read-only)** — Ricognizione READ-ONLY delle 4 pagine: aggancio a shared/*, token inline residui, cache-bust, coerenza rename D5 del translator → report docs/UX-STATO-MIGRAZIONE.md, zero modifiche al codice.  
   *Dipende da:* — (nessuna dipendenza: è il passo d'avvio; produce la base per dimensionare i passi 1-6)
1. **Translator su shared/ — dedup token + verifica cablaggio tema + terna** — Completa la migrazione di translator.html a shared/: rimuovi dallo <style> inline i token canonici ora duplicati da shared/poetrify-tokens.css, verifica il cablaggio già committato di #dark-mode-toggle a PoetrifyTheme e dell'anti-flash, e chiudi con la terna brace_check+balance+check_refs a net-0.  
   *Dipende da:* 0
2. **Cache-bust ?v=N su tutti i riferimenti shared/* delle 4 pagine + regola del bump** — Aggiungere ?v=1 a ogni riferimento shared/* (CSS + JS) nelle 4 pagine e fissare la regola: chi tocca un file shared/* incrementa N su tutte e 4 nello stesso commit.  
   *Dipende da:* Passo 1 (translator.html agganciato a shared/poetrify-tokens.css + poetrify-theme.js + script anti-flash, toggle cablato a PoetrifyTheme). Il Passo 2 tocca gli stessi <link>/<script> shared/* su tutte e 4 le superfici, quindi deve partire da un translator già migrato.
3. **Layer componenti condiviso — shared/poetrify-components.css estratto dal dizionario** — Estrarre dal dictionary (ramo canone) le classi-componente condivise in shared/poetrify-components.css — che consumano SOLO i token di poetrify-tokens.css — e agganciarlo (dopo i token, con ?v=N) alle 4 pagine, rimuovendo i duplicati locali; terna sul translator.  
   *Dipende da:* 1, 2
4. **Armonizzazione dei contenuti UX su tutte e 4 le superfici** — Uniforma i contenuti UX delle 4 pagine (header, contratto di navigazione, unico controllo lingua, tassonomia livello, naming, copy del gate, barra di ricerca) usando i componenti condivisi del Passo 3; terna sul translator; commit+push su migrazione-protocollo-ux.  
   *Dipende da:* Passo 3 (shared/poetrify-components.css estratto dal dizionario e agganciato alle 4 pagine)
5. **Accessibilità residua per la CHECKLIST (focus-ring, aria/role, skip-link, 44px, lang per-porzione, gate dialog)** — Chiudere gli a11y ancora aperti della CHECKLIST — focus-ring come box-shadow via token, role=tablist/aria-selected sulla navigazione, skip-link, target 44px su (pointer:coarse), lang="grc"/"la" per-porzione, gate lingua come role=dialog con focus-trap/Esc/return-focus — nei layer shared/poetrify-tokens.css, shared/poetrify-components.css e IIFE shared/poetrify-*.js, con la terna di validatori obbligatoria sul translator.  
   *Dipende da:* Passo 3 (shared/poetrify-components.css estratto e agganciato alle 4 pagine) e Passo 4 (armonizzazione contenuti UX: header/nav/controllo-lingua/gate/search già unificati). A monte: Passo 1 (translator su shared/) e Passo 2 (cache-bust ?v=N).
6. **Governance: check_design_drift.py + hook/CI + regola cache-bust + DoD=CHECKLIST** — Blinda la migrazione: un validatore che boccia i token canonici ridefiniti inline e le pagine non agganciate a shared/*, installato come hook pre-push + CI d'allarme, con la regola cache-bust formalizzata e le decisioni archiviate.  
   *Dipende da:* Passi 1-5 (translator su shared/, cache-bust, layer componenti, armonizzazione contenuti UX, a11y residui). Ultimo passo della sequenza 0-6.

---

## Passo 0 — Ricognizione residua della migrazione (read-only)

> Incolla questo prompt in una **nuova sessione Claude Code** aperta sul repo `Poetrify-SPA-Dizionario` (working copy: `Leonardo-Claude/04 - Prodotti Digitali/04.01 Dizionario`; repo GitHub `Leocrates99/Poetrify-Translatio`), branch di lavoro **`migrazione-protocollo-ux`**.

### Obiettivo
Fotografare lo **stato reale** della migrazione UX/UI (Protocollo §8) leggendo il sorgente, **senza toccare una riga di codice**, e depositare il risultato in **`docs/UX-STATO-MIGRAZIONE.md`**. Il report deve dire, pagina per pagina, cosa è già fatto e cosa resta, così da dimensionare con precisione i passi 1-6 della sequenza. È l'unico deliverable; nessun refactor, nessun aggancio, nessuna correzione qui.

### Dipende da
Niente. È il passo 0, punto d'avvio. Alimenta tutti i successivi (1 translator su shared/ · 2 cache-bust · 3 layer componenti · 4 armonizzazione contenuti · 5 a11y residui · 6 governance).

### Contesto essenziale (nomi e pattern REALI — usa SOLO questi)
Il sito è **statico, multi-pagina, senza build step** (GitHub Pages). Le **4 superfici a radice** sono: `app.html` (home), `dictionary.html` (ramo canone del design), `translator.html` (~2 MB, **mai leggerlo intero**: solo grep mirati), `corpus.html`. A radice esiste anche `index.html` (probabile redirect/landing): **glossalo** nel report ma non è una delle 4 superfici migrate.

Stato già committato sul branch (da **verificare**, non dare per scontato):
- **`shared/poetrify-tokens.css`** = fonte unica dei token (brand/accenti-lingua `--primary`/`--accent`/`--dacc`, ottone `--brass`, superfici calde `--paper`/`--ivory`/`--cream`/`--parchment`, semantici con varianti testo `--success-ink`/`--warning-ink`/`--danger-ink`, raggi `--radius-sm|md|lg`, scala 8pt `--sp-1..7`, tipografia `--font-display`/`--font-body`/`--font-ui`/`--font-classical`, `--transition`). Dark unificato su `:root[data-theme="dark"]` applicato su `<html>`.
- **`shared/poetrify-theme.js`** = IIFE condiviso (NON un ES module). Espone `window.PoetrifyTheme` con `toggle()`/`set()`/`current()`; persiste su `localStorage` chiave `poetrify-theme`; con l'attributo **`data-inject-toggle`** inietta un pulsante flottante (`#poetrify-theme-toggle`, glifi ☾/☀, `aria-pressed`) **solo** nei file senza toggle proprio (app, corpus); nei file col toggle proprio (dictionary, translator) va linkato **senza** `data-inject-toggle`, cablando il bottone a `PoetrifyTheme.toggle()`/`set()`.
- **Script anti-flash** inline in `<head>`: imposta `[data-theme]` prima del paint leggendo `localStorage`/`prefers-color-scheme`.
- **Colore = lingua** con doppio supporto durante la migrazione: `body[data-lang="la"|"latino"]` (rosso `#A22E37`, dark `#e58a90`) e `body[data-lang="grc"|"greco"]` (blu `#1800AC`, dark `#8b7dff`); neutro bilingue = ottone `--brass` `#9c6b3c`.
- Validatori del translator (la «terna»): **`_build/brace_check.py`**, **`_build/balance.py`**, **`_build/check_refs.py`**.
- Stato dichiarato: app/corpus/dictionary agganciati a `shared/` + `[data-theme]`; **translator ha ricevuto solo il rename namespace D5** (`--poetrify-*` → `--*`) e **NON è ancora linkato a `shared/`**. Il layer componenti condiviso (`shared/poetrify-components.css`) **non esiste ancora**. Il **cache-bust `?v=N`** sui `<link>`/`<script>` shared è **assente** ovunque.

La **Definition of Done** del progetto è già scritta: `05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md` (con `PROTOCOLLO.md` §1-§9). Non creare DoD parallele.

⚠️ Nomi VIETATI (non esistono, non usarli mai): `poetrify-variables.css`, `poetrify-ui.css`, `modules/ui/shell.js`, `mountShell`. La cartella `modules/ui/` è vuota: ignorala.

### Compiti (concreti, tutti a sola lettura)
1. **Inventario aggancio shared/** — per ciascuna delle 4 pagine (`app.html`, `dictionary.html`, `translator.html`, `corpus.html`) verifica con grep mirati se contiene: (a) `<link>` a `shared/poetrify-tokens.css`; (b) `<script>` a `shared/poetrify-theme.js` e se usa/omette `data-inject-toggle` coerentemente col pattern (inject solo app/corpus; link nudo + cablaggio manuale su dictionary/translator); (c) lo **script anti-flash** in `<head>` che setta `[data-theme]`. Registra sì/no per ogni cella.
2. **Token inline divergenti** — in ogni pagina cerca definizioni di custom properties nello `<style>` inline (pattern `--nome:`) che **ridefiniscono** token già canonici in `poetrify-tokens.css`. Distingui **duplicato** (stesso nome, stesso valore → debito di pulizia) da **divergente** (stesso nome, valore diverso → rischio di drift): è la distinzione «duplicato ≠ divergente». Per il translator lavora **solo con grep** (mai lettura integrale). Elenca i nomi trovati e classificali.
3. **Cache-bust** — verifica se i riferimenti a `shared/*` portano un `?v=N`. Attualmente atteso assente su tutte e 4: conferma o smentisci per ognuna.
4. **Coerenza rename D5 del translator** — estrai (grep) i nomi dei token usati nel `translator.html` dopo il rename `--poetrify-*` → `--*` e confrontali con l'elenco reale dei nomi in `shared/poetrify-tokens.css`. Segnala eventuali nomi che **non combaciano** (token orfani o rinominati male) che complicherebbero il Passo 1.
5. **Toggle tema per pagina** — annota, per dictionary e translator, se hanno un toggle proprio nel markup (a cui andrà cablato `PoetrifyTheme`), e per app/corpus se dipendono dall'iniezione via `data-inject-toggle`.
6. **`index.html`** — controlla in una riga se è un semplice redirect o contiene UI da migrare; annotalo.
7. **Scrivi il report** `docs/UX-STATO-MIGRAZIONE.md` (crea la cartella `docs/` se manca) con: una **tabella-matrice** (righe = 4 pagine + index; colonne = tokens.css · theme.js · anti-flash · `data-inject-toggle` corretto · token inline duplicati · token inline divergenti · `?v=`); una sezione **«Coerenza D5 translator»** con l'esito del confronto nomi; e una sezione **«Dimensionamento passi 1-6»** che, per ciascun passo della sequenza, dice in 1-2 righe quanto lavoro resta alla luce dei riscontri.

### Guardrail
- **READ-ONLY assoluto**: nessuna Edit/Write sui file del sito, nessun aggancio, nessuna rimozione di token, nessun `?v=`. L'**unico** file creato è `docs/UX-STATO-MIGRAZIONE.md`.
- **Mai leggere `translator.html` per intero** (~2 MB): solo `grep`/`Grep` mirati.
- Non eseguire la terna dei validatori qui (nessuna modifica da validare); citala solo come vincolo del Passo 1.
- **Leggi dal sorgente**, non dalla memoria: se lo stato reale diverge da quanto dichiarato nel contesto, **vince il sorgente** e va segnalato.
- Usa esclusivamente i nomi reali (`shared/poetrify-tokens.css`, `shared/poetrify-theme.js`, `PoetrifyTheme`, `data-inject-toggle`, `:root[data-theme]` su `<html>`, `body[data-lang]` la|grc, `_build/brace_check.py`+`balance.py`+`check_refs.py`). Zero nomi vietati.
- Invariante colore=lingua e ottone-neutro: qui non si applica (non si modifica), ma verificane la **presenza** come dato del report.

### Definition of Done → `05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md`
Questo è un passo diagnostico: la maggior parte delle voci di CHECKLIST si spunta nei passi 1-6. Voci pertinenti **ora**:
- [x] «leggi dal sorgente / duplicato ≠ divergente»: la classificazione token inline è fatta sul codice reale.
- [x] «armonizzazione totale come lente»: il report copre **tutte e 4** le superfici (+ index), non un sottoinsieme.
- [x] «provenienza / archiviazione decisioni»: il report è tracciabile in `docs/` e riallineato alla sequenza 0-6.
- [ ] Le voci token/tipografia, colore&contrasto AA, dark+anti-flash, a11y (focus-ring/aria/skip-link/44px), responsive overflow-x, anti-slop, icone inline-SVG **restano da spuntare nei passi 1-6** — qui vanno solo *misurate*, non soddisfatte.

### Consegna
- **File toccati**: unicamente `docs/UX-STATO-MIGRAZIONE.md` (nuovo; crea `docs/` se assente). Nessun altro file modificato.
- **Commit** (secondo la regola del repo utente = commit+push **senza chiedere** sul branch di lavoro):
  - branch: `migrazione-protocollo-ux`
  - messaggio suggerito: `docs(ux): Passo 0 — ricognizione residua migrazione (stato reale 4 superfici)`
- **Push** sul branch `migrazione-protocollo-ux` (il push su Pages non serve qui: è solo un doc, ma la consuetudine è comunque committare+pushare il lavoro).
- Chiudi segnalando in chat le eventuali **divergenze sorgente vs. contesto dichiarato** trovate, perché tarano i prompt dei passi 1-6.

---

## Passo 1 — Translator su `shared/`: dedup token, verifica cablaggio tema, terna

> Repo: **Leocrates99/Poetrify-Translatio**, working copy in `Leonardo-Claude/04 - Prodotti Digitali/04.01 Dizionario`. Sito STATICO multi-pagina su GitHub Pages, **nessun build step**. Branch di lavoro: **`migrazione-protocollo-ux`**. `translator.html` è ~2 MB / ~40.000 righe: **non leggerlo mai intero**, solo grep mirati e `sed -n`/Read su intervalli.

### Obiettivo
Portare a compimento la migrazione di `translator.html` al design system condiviso `shared/`, che è l'ultima pagina rimasta. **Attenzione: il grosso è già fatto e committato** (vedi Contesto). Il lavoro residuo reale di questo passo è:
1. **rimuovere dallo `<style>` inline i token canonici ora duplicati** da `shared/poetrify-tokens.css` (il file redefinisce ancora nel suo `:root` decine di variabili che appartengono alla fonte unica);
2. **verificare** (e correggere solo se serve) il cablaggio — già presente in commit — del toggle `#dark-mode-toggle` a `window.PoetrifyTheme` e dello script anti-flash;
3. **chiudere con la terna di validatori a net-0** perché è un file enorme e ogni tocco è a rischio parentesi.

Non rifare da zero ciò che è già committato: **completa**, non ricostruire.

### Dipende da
**Passo 0** (ricognizione read-only → `docs/UX-STATO-MIGRAZIONE.md`). Prima di iniziare, apri quel report per confermare quali token del `:root` inline sono duplicati canonici e quali sono translator-only. Sblocca il **Passo 2** (cache-bust `?v=N` sulle 4 pagine).

### Contesto essenziale (stato reale verificato dal sorgente — nomi REALI)
Cosa è **GIÀ FATTO e COMMITTATO** su `translator.html` (commit `570585f` rename namespace D5 `--poetrify-*`→`--*`, e `1a51e1c` «translator dark [data-theme] + shared»):
- `<link rel="stylesheet" href="shared/poetrify-tokens.css">` già presente in `<head>` (riga ~15).
- `<script src="shared/poetrify-theme.js"></script>` già presente (riga ~17), **senza** `data-inject-toggle` — corretto, perché translator ha un **toggle proprio** `#dark-mode-toggle`.
- **Script anti-flash inline** già in `<head>` (righe ~9-10): imposta `[data-theme]` su `document.documentElement` prima del paint leggendo `localStorage['poetrify-theme']` / `prefers-color-scheme`.
- Toggle proprio `#dark-mode-toggle` (`<button ... onclick="toggleDarkMode()">`, riga ~11351) già **cablato** a `window.PoetrifyTheme.set(on ? 'dark' : 'light')` (riga ~14605) con sync del bottone (riga ~14610 ss.).
- Dark unificato su `:root[data-theme="dark"]` su `<html>`.

Cosa **RESTA** (il vero bersaglio di questo passo): lo `<style>` inline apre un `:root { … }` (riga ~27) che **ridefinisce token canonici già forniti da `shared/poetrify-tokens.css`**, e un blocco `:root[data-theme="dark"] { … }` (riga ~83 ss.) che fa lo stesso per il dark. Vanno rimossi i **duplicati canonici**, tenendo solo i token **translator-only**.

Nomi/pattern REALI da usare (mai i nomi vecchi):
- Token: **`shared/poetrify-tokens.css`** (fonte unica). NON `poetrify-variables.css`.
- Tema: **`window.PoetrifyTheme`** con `PoetrifyTheme.toggle()` / `.set('dark'|'light')` / `.current()`; persistenza `localStorage['poetrify-theme']`; `:root[data-theme="dark"]` su `<html>`; attributo `data-inject-toggle` **solo** per le pagine senza toggle proprio (app/corpus) — **qui NON si usa**.
- JS condiviso IIFE `shared/poetrify-theme.js` con API su `window.Poetrify*`. NIENTE ES module, NIENTE `modules/ui/shell.js`, NIENTE `mountShell`.
- Lingua = colore: `body[data-lang]` con doppio valore `la|latino` (rosso) / `grc|greco` (blu), ottone `--brass` per il neutro.
- Validatori: **`_build/brace_check.py` + `_build/balance.py` + `_build/check_refs.py`** (la «terna» del translator).
- DoD: **`_Protocollo-UX-UI/CHECKLIST.md`** (in `05 - Officina/05.01 Protocollo UX-UI`) — è già la Definition of Done, **non crearne una parallela**.

Elenco canonico dei token di `shared/poetrify-tokens.css` (56 nomi — questi vivono in `shared/`, quindi le loro ridefinizioni nell'inline `:root` di translator sono candidate alla rimozione se il valore coincide):
`--primary --primary-dark --primary-pale --accent --accent-lat --accent-gr --dacc --dacc-pale --dacc-deep --dacc-border --brass --brass-light --paper --ivory --cream --parchment --parchment-edge --sepia --sepia-soft --ink --ink-soft --on-primary --mark --rule --rule-soft --success --success-ink --warning --warning-ink --danger --danger-ink --radius-sm --radius-md --radius-lg --radius-pill --sp-1 … --sp-7 --shadow --shadow-sm --shadow-lift --shadow-strong --transition --font-display --font-body --font-ui --font-mono --font-code --font-read --font-read-gr --font-classical --font-classical-size-boost`.

Token **translator-only** osservati nell'inline `:root` che NON sono in shared e vanno **TENUTI**: `--primary-soft`, `--primary-tint`, `--primary-border`, e l'intera famiglia degli alias di lingua `--lang-accent`, `--lang-accent-soft`, `--lang-accent-pale`, `--lang-accent-dark`, `--lang-accent-border` (sono il meccanismo con cui `body[data-lang="latino"|"greco"]` ridipinge l'accento: **non toccarli**).

### Compiti (concreti, in ordine)
1. **Baseline terna (prima di ogni modifica).** Esegui e annota i conteggi di partenza:
   - `python _build/brace_check.py translator.html`
   - `python _build/balance.py translator.html`
   - `python _build/check_refs.py translator.html`
   Salva i numeri: dopo le modifiche dovranno essere **identici (net-0)**.
2. **Conferma dello stato già migrato** (grep, nessuna modifica): verifica che esistano `shared/poetrify-tokens.css` e `shared/poetrify-theme.js` nel `<head>`, lo script anti-flash, il toggle `#dark-mode-toggle` e la chiamata `window.PoetrifyTheme.set(...)`. Se **tutto** è presente e coerente, **non riaggiungerlo** (eviti duplicati); passa oltre.
3. **Verifica cablaggio tema (correggi solo se rotto).**
   - Il toggle deve chiamare `PoetrifyTheme.set()`/`toggle()`, non una logica di tema locale che scavalchi `localStorage['poetrify-theme']`.
   - Allo `load`, lo stato visivo del bottone (`.active` / `aria-pressed`) deve riflettere `PoetrifyTheme.current()`. Se `aria-pressed` manca sul `#dark-mode-toggle`, aggiungilo e sincronizzalo (è anche voce a11y del Passo 5, ma se è a portata di mano qui, meglio).
   - Il link a `poetrify-theme.js` deve restare **senza** `data-inject-toggle`.
4. **Dedup dei token duplicati** (il cuore del passo). Nell'inline `:root { … }` (light) e in `:root[data-theme="dark"] { … }`:
   - Per ogni token il cui nome è nell'elenco canonico di `shared/poetrify-tokens.css` **e** il cui valore **coincide** con quello di shared → **rimuovi la riga inline** (lascia che erediti dalla fonte unica).
   - **`duplicato ≠ divergente`**: se un token canonico ha nell'inline un valore **diverso** da shared, **non cancellarlo silenziosamente**. Leggi entrambi i valori dal sorgente, decidi: se è una vera divergenza non voluta → allinea alla canon (vince `shared/`); se translator ha davvero bisogno di un valore proprio → **lascialo e annotalo** nel commit come divergenza legittima (non è un dedup). Non inventare: confronta i valori reali.
   - **TIENI** i token translator-only (`--primary-soft`, `--primary-tint`, `--primary-border`, tutta la famiglia `--lang-accent*`) e ogni override `body[data-lang="latino"|"greco"]` degli accenti di lingua.
   - Non toccare selettori/valori non-token (layout, componenti locali): questo passo estrae **solo** i token duplicati; il layer componenti condiviso è il **Passo 3**.
5. **Terna finale a net-0.** Riesegui i tre validatori: i conteggi devono combaciare con la baseline del punto 1. Se `check_refs.py` segnala riferimenti orfani introdotti (es. un token rimasto usato ma la cui ridefinizione hai tolto senza che shared lo copra), risolvi prima di procedere.
6. **Verifica visiva rapida** (se disponibile un preview locale): apri `translator.html`, alterna il tema col toggle, verifica che (a) non ci sia flash al reload, (b) le superfici calde e l'accento restino corretti in chiaro e scuro, (c) `body[data-lang]` latino=rosso / greco=blu funzioni ancora, (d) l'ottone `--brass` regga il neutro. Il file ~2 MB può non caricarsi in alcuni preview: in tal caso affidati alla terna + ispezione statica.

### Guardrail
- **Terna obbligatoria** in apertura (baseline) e chiusura (net-0). Nessun commit se i conteggi non combaciano.
- **Non leggere `translator.html` per intero**: grep mirati + `sed -n`/Read su range.
- **`duplicato ≠ divergente`**: rimuovi solo ciò che shared copre con lo **stesso** valore; le divergenze si riconciliano, non si cancellano di nascosto.
- Colore = lingua **sempre etichettato** (WCAG 1.4.1): non rimuovere gli override `body[data-lang]`.
- Token canonici **solo** in `shared/*`, mai reintrodotti inline. Ma i token **translator-only** restano inline finché non esiste un motivo per condividerli.
- Nessun `data-inject-toggle` su questa pagina (ha toggle proprio).
- Solo nomi/pattern reali: **mai** `poetrify-variables.css`, `poetrify-ui.css`, `modules/ui/shell.js`, `mountShell`.
- Nessun altro contenuto UX in questo passo: header/nav/naming/gate/search = **Passo 4**; layer `shared/poetrify-components.css` = **Passo 3**; a11y residui = **Passo 5**; `?v=N` cache-bust = **Passo 2**.

### Definition of Done — spunta `_Protocollo-UX-UI/CHECKLIST.md`
Non creare una DoD parallela: apri `_Protocollo-UX-UI/CHECKLIST.md` e verifica le voci pertinenti a questo passo:
- [ ] **Token/tipografia**: nessun token canonico ridefinito inline in `translator.html`; tutti ereditati da `shared/poetrify-tokens.css`; translator-only chiaramente circoscritti.
- [ ] **Dark su `[data-theme]` + anti-flash**: dark su `:root[data-theme="dark"]` (su `<html>`), script anti-flash attivo, nessun FOUC al reload.
- [ ] **Colore & contrasto (colore=lingua)**: `body[data-lang]` la/grc intatto ed etichettato; ottone neutro `--brass` per le sezioni bilingui.
- [ ] **a11y (parziale qui)**: `#dark-mode-toggle` riflette `PoetrifyTheme.current()` con `aria-pressed` sincronizzato.
- [ ] **Armonizzazione totale**: la modifica vale su translator senza rompere l'allineamento con app/dictionary/corpus (che già ereditano da `shared/`).
- [ ] **Validatori**: terna `brace_check`+`balance`+`check_refs` a **net-0**.
- [ ] **Commit+push = deploy** sul branch `migrazione-protocollo-ux`.

### Consegna
- **File toccati**: `translator.html` (rimozione token duplicati dall'inline `:root`/`:root[data-theme="dark"]`; eventuale piccola correzione di cablaggio/`aria-pressed` del toggle). Nessun altro file di norma; se emergesse un token che translator usava e shared non copre, valutare se aggiungerlo a `shared/poetrify-tokens.css` (e in tal caso annotarlo).
- **Messaggio commit** (esempio): `Migrazione protocollo §8 · translator dedup token su shared/ (net-0 terna)`.
- **Nota**: `commit + push` sul branch **`migrazione-protocollo-ux`** senza chiedere conferma (repo dell'utente = deploy Pages). Allega nel corpo del commit i conteggi baseline/finali della terna a riprova del net-0.
- Al termine, archivia in **aisthesis** l'unica decisione non ovvia (criterio di dedup «duplicato ≠ divergente» applicato ai token del translator) e aggiorna, se pertinente, i debiti del Protocollo. Sblocca il **Passo 2** (cache-bust `?v=N`).

---

## Passo 2 — Cache-bust `?v=N` sui riferimenti `shared/*` delle 4 pagine + regola del bump

**Obiettivo.** Aggiungere una query-string di versione `?v=N` (si parte da `?v=1`) a **ogni** riferimento ai file condivisi `shared/*` — sia il `<link rel="stylesheet">` sia lo `<script>` — nelle 4 superfici a radice del repo, così che un aggiornamento di un file in `shared/` non venga servito stantìo dalla cache del browser/CDN di GitHub Pages. In più: **definire e documentare la regola del bump** — ogni commit che modifica un file `shared/*` incrementa `N` su tutte e 4 le pagine **nello stesso commit** (un unico proprietario della versione, mai bump parziali). Nessuna modifica visiva o funzionale: è puro versioning degli asset.

**Dipende da.** Passo 1 (translator.html già agganciato a `shared/poetrify-tokens.css` + `shared/poetrify-theme.js` + script anti-flash, con il suo toggle cablato a `PoetrifyTheme`). Questo passo tocca gli stessi `<link>/<script>` shared su tutte e 4 le superfici, perciò il translator deve già essere migrato prima di partire. Fa parte della **sequenza 0–6** della migrazione (0 ricognizione · 1 translator su shared/ · **2 cache-bust ← sei qui** · 3 layer componenti `shared/poetrify-components.css` · 4 armonizzazione contenuti UX · 5 a11y residui · 6 governance). Il Passo 6 formalizzerà la regola del bump anche in `_build/check_design_drift.py`; qui la si istituisce e documenta.

### Contesto essenziale (nomi e pattern REALI — usare solo questi)

- **Repo:** `Leocrates99/Poetrify-Translatio`; working copy in `04 - Prodotti Digitali/04.01 Dizionario`. Sito **statico** multi-pagina su GitHub Pages, **nessun build step**. Branch di lavoro: **`migrazione-protocollo-ux`**.
- **Le 4 superfici** (a radice) su cui agire: `app.html`, `dictionary.html`, `translator.html` (~2 MB, **mai leggere intero**: solo grep mirati), `corpus.html`. `index.html` **non** referenzia `shared/*` e **non** va toccato in questo passo.
- **Fonte unica dei token:** `shared/poetrify-tokens.css` (NON «poetrify-variables.css»). **JS tema condiviso:** `shared/poetrify-theme.js`, IIFE che espone `window.PoetrifyTheme = {toggle, set, current}`, persiste su `localStorage 'poetrify-theme'`, e con l'attributo `data-inject-toggle` inietta il pulsante flottante solo dove serve. **Tema** su `:root[data-theme="dark"]` applicato a `<html>` + **script anti-flash** inline in `<head>`. **Lingua** su `body[data-lang]` con doppio valore `la|latino` / `grc|greco`. (Nessun ES module `modules/ui/shell.js`, nessun `mountShell`: quel pattern **non esiste** nel repo.)
- **Stato reale VERIFICATO dei riferimenti shared (baseline, nessun `?v=` presente):**
  - `app.html` → `<link rel="stylesheet" href="shared/poetrify-tokens.css">` (riga ~12) · `<script src="shared/poetrify-theme.js" data-inject-toggle></script>` (riga ~376)
  - `dictionary.html` → `<link ... href="shared/poetrify-tokens.css">` (~12) · `<script src="shared/poetrify-theme.js"></script>` (~14, **senza** `data-inject-toggle` perché ha il toggle proprio)
  - `corpus.html` → `<link ... href="shared/poetrify-tokens.css">` (~12) · `<script src="shared/poetrify-theme.js" data-inject-toggle></script>` (~631)
  - `translator.html` → `<link ... href="shared/poetrify-tokens.css">` (~15) · `<script src="shared/poetrify-theme.js"></script>` (~17, **senza** `data-inject-toggle`)
  - Totale atteso: **8 riferimenti** (2 per pagina × 4 pagine). I numeri di riga sono orientativi: confermali con grep prima di editare.
- **Validatori del translator (la «terna»):** `_build/brace_check.py`, `_build/balance.py`, `_build/check_refs.py`. Da eseguire **prima** (baseline) e **dopo** (net-0) ogni tocco a `translator.html`.
- **Definition of Done** = `05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md` (non creare una DoD parallela).

### Compiti (numerati, concreti)

1. **Ricognizione (read-only).** Esegui un grep mirato su tutte e 4 le pagine per censire i riferimenti attuali e confermare che **nessuno** porta già `?v=`:
   - `grep -n "shared/poetrify" app.html dictionary.html corpus.html translator.html`
   - Verifica di trovare esattamente gli 8 riferimenti sopra (link tokens + script theme per ciascuna). Se ne trovi altri (es. un futuro `shared/poetrify-components.css` — **non** dovrebbe esistere ancora al Passo 2), fermati e segnala: il Passo 3 lo introdurrà, ma se già presente va incluso nel cache-bust con lo stesso `N`.
2. **Baseline terna sul translator.** Prima di editare `translator.html`, esegui e annota l'esito di `python _build/brace_check.py translator.html`, `python _build/balance.py translator.html`, `python _build/check_refs.py translator.html` (conteggi di partenza).
3. **Applica `?v=1` — app.html.** In `app.html` aggiorna:
   - `href="shared/poetrify-tokens.css"` → `href="shared/poetrify-tokens.css?v=1"`
   - `src="shared/poetrify-theme.js"` → `src="shared/poetrify-theme.js?v=1"` (**preserva** `data-inject-toggle` invariato)
4. **Applica `?v=1` — dictionary.html.** Stessa sostituzione su `link` tokens e `script` theme. **Non** aggiungere `data-inject-toggle` (dictionary ha il toggle proprio): tocca solo la query-string.
5. **Applica `?v=1` — corpus.html.** Stessa sostituzione su `link` tokens e `script` theme (**preserva** `data-inject-toggle`).
6. **Applica `?v=1` — translator.html.** Stessa sostituzione su `link` tokens e `script` theme (edit chirurgico sul solo `href`/`src`, senza toccare altro nello `<style>` inline o nel body). **Non** aggiungere `data-inject-toggle`.
7. **Ri-verifica coerenza.** Nuovo grep `grep -n "shared/poetrify" app.html dictionary.html corpus.html translator.html`: tutti e 8 i riferimenti devono ora terminare in `?v=1`, identico su tutte le pagine. Nessun riferimento residuo senza versione.
8. **Terna post-edit sul translator.** Riesegui i tre validatori su `translator.html`: l'esito deve essere **net-0** rispetto alla baseline del compito 2 (nessuna graffa/parentesi/ref rotta introdotta).
9. **Documenta la regola del bump.** Registra la regola in modo che sopravviva alla sessione. Scegli il punto già canonico del progetto invece di inventare un file nuovo:
   - aggiungi una nota nel report di stato **`docs/UX-STATO-MIGRAZIONE.md`** (creato al Passo 0) sotto una sezione «Cache-bust `?v=N`»;
   - e/o annota la regola come debito/convenzione nel **Protocollo UX/UI** (`05 - Officina/05.01 Protocollo UX-UI/PROTOCOLLO.md`, es. in §5 contratto token o §8 debiti), così che il Passo 6 possa trasformarla in check automatico.
   - **Testo della regola (canonico):** «I file in `shared/*` sono versionati con una singola query-string `?v=N` replicata identica su tutti i loro riferimenti nelle 4 pagine (`app`, `dictionary`, `corpus`, `translator`). Ogni commit che modifica **qualsiasi** file `shared/*` incrementa `N` di 1 su **tutte e 4** le pagine **nello stesso commit** (proprietario unico della versione; vietati bump parziali o `N` divergenti tra pagine). Il valore corrente è `N=1`.»

### Guardrail

- **Solo query-string.** Tocca esclusivamente il valore di `href`/`src` dei riferimenti `shared/*`. Non riordinare i tag, non toccare `data-inject-toggle`, non toccare lo script anti-flash, non spostare gli script, non modificare token o classi.
- **`N` identico ovunque.** Il numero di versione deve essere lo stesso su tutte e 4 le pagine e su entrambi i tipi di asset (CSS e JS). «duplicato ≠ divergente»: la ripetizione è voluta, la divergenza è un bug.
- **Translator con la terna.** Ogni tocco a `translator.html` passa `brace_check.py` + `balance.py` + `check_refs.py` con esito net-0; **mai** aprire/leggere il file intero (solo grep mirati ed edit chirurgico).
- **`index.html` fuori scope.** Non referenzia `shared/*`; non aggiungere `?v=` lì.
- **Nessun `shared/poetrify-components.css` da inventare.** Non ancora esiste (arriva al Passo 3). Se già presente, includilo nel cache-bust con lo stesso `N`; altrimenti ignoralo.
- **Nomi reali soltanto.** Mai `poetrify-variables.css`, `poetrify-ui.css`, `modules/ui/shell.js`, `mountShell`.
- **Invarianti generali:** colore = lingua con etichetta; ottone neutro per i bilingui; token/classi canoniche solo in `shared/*`; una modifica non è «done» finché non vale su tutte e 4 le superfici.

### Definition of Done

Spunta le voci pertinenti di **`05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md`** (è la DoD; non crearne una parallela). In particolare per questo passo:

- [ ] **Armonizzazione totale:** i riferimenti `shared/*` di tutte e 4 le pagine portano `?v=1`, identico e completo (8/8 riferimenti).
- [ ] **Dark su `[data-theme]` + anti-flash:** invariati e ancora funzionanti (il cache-bust non deve rompere il caricamento di `poetrify-theme.js` né dello script anti-flash).
- [ ] **Terna translator net-0:** `brace_check.py` + `balance.py` + `check_refs.py` su `translator.html` senza regressioni rispetto alla baseline.
- [ ] **Nessuna divergenza:** grep finale conferma `?v=1` uniforme; nessun riferimento `shared/*` privo di versione.
- [ ] **Regola documentata:** la convenzione del bump coordinato è scritta in `docs/UX-STATO-MIGRAZIONE.md` e/o nel `PROTOCOLLO.md`, pronta per l'automazione del Passo 6.
- [ ] **Commit + push = deploy** sul branch di lavoro `migrazione-protocollo-ux` (per i repo dell'utente si committa e pusha senza chiedere conferma).

### Consegna

- **File toccati:** `app.html`, `dictionary.html`, `corpus.html`, `translator.html` (query-string `?v=1` sui riferimenti `shared/*`) + `docs/UX-STATO-MIGRAZIONE.md` e/o `05 - Officina/05.01 Protocollo UX-UI/PROTOCOLLO.md` (regola del bump).
- **Messaggio commit (suggerito):**

  ```
  Passo 2 · cache-bust ?v=1 sugli asset shared/* (4 pagine) + regola del bump coordinato

  - Aggiunge ?v=1 a link poetrify-tokens.css e script poetrify-theme.js su
    app/dictionary/corpus/translator (8/8 riferimenti, N uniforme).
  - Documenta la regola: ogni commit che tocca shared/* incrementa N su tutte
    e 4 le pagine nello stesso commit (proprietario unico, no bump parziali).
  - Translator: terna brace_check/balance/check_refs net-0.
  ```
- **Nota:** commit + push sul branch **`migrazione-protocollo-ux`** (deploy GitHub Pages), senza chiedere conferma. Prossimo passo della sequenza: **3 — layer componenti `shared/poetrify-components.css`** (quando arriverà, andrà anch'esso versionato con lo stesso `N` secondo la regola appena fissata).

---

## Passo 3 — Layer componenti condiviso: `shared/poetrify-components.css`

**Obiettivo**
Creare `shared/poetrify-components.css`, la FONTE UNICA delle classi-componente condivise, estraendole dal ramo canone (`dictionary.html`): la card-lemma della lista risultati, la scheda lessicale, la topbar/header, il gate lingua, i chip PoS con la loro palette a spettro ordinale, e le targhette di categoria. Queste classi devono consumare **solo** i token di `shared/poetrify-tokens.css` (nessun hex hardcoded). Linkarlo **dopo** `poetrify-tokens.css` (e con cache-bust `?v=N`) in tutte e 4 le superfici, rimuovendo le definizioni locali ora duplicate. È il pezzo strutturale ancora mancante: i token sono già condivisi, i componenti no.

**Dipende da**
- **Passo 1** (translator agganciato a `shared/poetrify-tokens.css` + `poetrify-theme.js` + script anti-flash, toggle cablato a `PoetrifyTheme`, token inline duplicati rimossi, terna a net-0): deve essere già chiuso, perché qui si rimuovono altre definizioni inline dal `<style>` del translator.
- **Passo 2** (cache-bust `?v=N` presente sui `<link>`/`<script>` di `shared/*` in tutte e 4 le pagine + regola del bump coordinato): qui il nuovo `<link>` a `poetrify-components.css` deve nascere già con lo stesso `?v=N` e il bump va coordinato con gli altri asset shared.

Questo è il **Passo 3** della sequenza 0–6 della migrazione (Protocollo UX/UI §8). Restano dopo: **4** armonizzazione dei contenuti UX, **5** a11y residui per CHECKLIST, **6** governance (`_build/check_design_drift.py` + DoD + hook/CI).

**Contesto essenziale (nomi e pattern REALI — usare SOLO questi)**
- Repo `Leocrates99/Poetrify-Translatio`, working copy in `Leonardo-Claude/04 - Prodotti Digitali/04.01 Dizionario`. Sito **statico** multi-pagina su GitHub Pages, **nessun build step**. Branch di lavoro: **`migrazione-protocollo-ux`**.
- 4 superfici a radice: `app.html`, `dictionary.html`, `translator.html` (~2 MB — **mai leggere intero**: solo `grep` mirati e `_build/` per validare), `corpus.html`. (`index.html` è redirect/landing, fuori scope componenti.)
- Token: **`shared/poetrify-tokens.css`** — FONTE UNICA dei token, già condivisa. (MAI il nome vecchio `poetrify-variables.css`.)
- Componenti condivisi da CREARE: **`shared/poetrify-components.css`** (MAI `poetrify-ui.css`).
- JS tema: **`shared/poetrify-theme.js`**, IIFE, espone `window.PoetrifyTheme = {toggle, set, current}`; persiste su `localStorage 'poetrify-theme'`; inietta il toggle flottante `#poetrify-theme-toggle` (glifi ☾/☀, `aria-pressed`) **solo** con l'attributo `data-inject-toggle` (usato da app/corpus); dictionary e translator hanno toggle proprio (link **senza** `data-inject-toggle`, bottone cablato a `PoetrifyTheme.toggle()/set()`). NON toccare questo file in Passo 3, NON introdurre ES module né `mountShell`: il pattern è `shared/poetrify-*.js` IIFE con API su `window.Poetrify*` + attributi `data-*`.
- Tema: dark unificato su **`:root[data-theme="dark"]`** su `<html>`, impostato prima del paint dallo script anti-flash inline in `<head>`. Il dark dei componenti va scritto solo come override su `:root[data-theme="dark"]`, mai su classi/media alternativi.
- Colore = LINGUA: **`body[data-lang]`** con doppio valore in migrazione — `la|latino` (rosso, `--dacc:#A22E37`) e `grc|greco` (blu, `--dacc:#1800AC`); ottone `--brass` per il neutro bilingue. Le classi-componente non devono fissare il colore-lingua: lo ereditano dai token che seguono `body[data-lang]`.
- Validatori translator (la «terna», già esistente): **`_build/brace_check.py`**, **`_build/balance.py`**, **`_build/check_refs.py`**. Baseline **prima**, net-**0** **dopo** ogni tocco al translator.
- DoD = **`05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md`** (spuntala; non creare una DoD parallela).

**Token realmente disponibili in `shared/poetrify-tokens.css`** (usa questi, non inventarne): `--paper --ivory --cream --parchment --parchment-edge`, `--ink --ink-soft --sepia --sepia-soft`, `--rule --rule-soft`, `--primary --primary-dark --primary-pale --accent`, `--dacc --dacc-deep --dacc-pale --dacc-border`, **`--on-primary`** (testo su fondo pieno: bianco in light, scuro nel dark — è il rimpiazzo corretto degli `#fff` sulle targhette colorate), `--brass`, raggi `--radius-sm/md/lg`, scala `--sp-1..7`, ombre tinte, tipografia `--font-display/--font-body/--font-ui/--font-classical`, `--transition`.

**Classi-componente REALI da estrarre da `dictionary.html`** (ramo canone — leggile dal sorgente, «duplicato ≠ divergente»):
- **Topbar/header**: `header.topbar` (pergamena sticky, pallino-lingua via `::before`), `.topbar-spacer`, `.topbar-link`, `.topbar-btn`, `.topbar-btn.is-active`, `header.topbar h1 / small` + il media `max-width:640px` che nasconde `small`.
- **Card-lemma lista risultati**: `.lx-item` (bordo-sinistro 4px `var(--pos-c, var(--rule))`, fondo `var(--paper)`, hover con `border-color:var(--dacc)`), figli `.lx-item .itx`, `.lx-item .il` (iniziale/lemma), `.lx-item.greek .il`, `.lx-item .ig`, e la targhetta `.lx-catchip`.
- **Scheda lessicale (stile laboratorio)**: famiglia `.lx-entry` e figli — `.lx-back`, `.lx-lemma-row`, `.lx-lemma`, `.lx-lemma .lx-init`, `.lx-meta`, `.lx-postag`, `.lx-catbox`, `.lx-principal`, `.lx-parts` (+ le regole `.greek`/`Times New Roman` per il politonico) e l'override dark `:root[data-theme="dark"] .lx-entry`.
- **Gate lingua a due card**: `.langgate`, `.langgate-box`, `.langgate-grid`, `.langgate-card`.
- **Chip PoS + filtro + legenda**: `.pos-filter`, `.pos-chip`, `.pos-chip:hover`, `.pos-chip.is-active`, `.pos-legend` (+ `.pos-legend span/i`), e l'override `:root[data-theme="dark"] body .pos-chip`.
- **Targhetta categoria + browse categorie**: `.dict-cat` (spettro ordinale via `--cat-c`/`--pos-c`), `.dz-cat` (+ `.dz-examples`, `.dz-cats`).
- **Palette PoS a spettro ordinale** (imposta `--pos-c`, ereditata dai figli): `.pos-sostantivo .pos-verbo .pos-aggettivo .pos-pronome .pos-avverbio .pos-preposizione .pos-congiunzione .pos-numerale .pos-interiezione .pos-articolo .pos-particella`.

> Nota: `--pos-c` e `--cat-c` sono custom-property **scoped di componente** (settate dalle classi `.pos-*`), non token globali — vanno tenute nel file componenti, va bene. Il problema sono gli **hex letterali** dentro la palette (`#1F63D6`…`#6B7280`) e i vari `#fff`/`rgba(...)`.

**Compiti (numerati, concreti)**
1. **Ricognizione (read-only)**: apri `dictionary.html`, individua i blocchi CSS delle classi elencate sopra e annota per ciascuna quali token consumano già e dove ci sono hex letterali (`#fff` sulle targhette, `rgba(...)` in ombre/testo, e soprattutto la palette PoS `#1F63D6…`). Verifica in parallelo quali di queste classi compaiono, magari con lievi divergenze, in `app.html`/`translator.html`/`corpus.html`: «duplicato ≠ divergente», il canone è il dizionario.
2. **Crea `shared/poetrify-components.css`** con un header di provenienza (che dice: estratto dal ramo canone `dictionary.html`, consuma solo i token di `poetrify-tokens.css`, dark solo su `:root[data-theme="dark"]`). Incolla le classi del canone e **sostituisci ogni hex letterale con il token corretto**:
   - `#fff` su fondi pieni colorati (`.lx-catbox`, `.lx-catchip`, `.dz-cat`) → **`var(--on-primary)`**.
   - grigi/righe/inchiostri hardcoded → `--rule/--rule-soft/--ink/--ink-soft/--sepia`.
   - le ombre `rgba(...)` → le ombre tinte dei token se presenti; se un valore non ha token equivalente, mantienilo ma **documentalo come costante di componente** nell'header del file.
3. **Palette PoS (decisione di sistema)**: lo spettro ordinale a 11 voci è un sistema di colore semantico → **promuovilo in `shared/poetrify-tokens.css`** come gruppo token dedicato (es. `--pos-sostantivo … --pos-particella`) e in `poetrify-components.css` scrivi `.pos-sostantivo{ --pos-c: var(--pos-sostantivo); }` ecc. Verifica la **leggibilità nel dark** dei valori promossi (se un colore dell'ordinale scende sotto contrasto su fondo scuro, aggiungi l'override nel blocco `:root[data-theme="dark"]` dei token). Archivia questa scelta in **aisthesis** (skill) come decisione UX non ovvia. (Se, leggendo il canone, emergesse un vincolo che sconsiglia la promozione, tienila come costante ordinale documentata nel file componenti e spiega perché — ma la via preferita è il token.)
4. **Aggancia il layer alle 4 pagine**: in `app.html`, `dictionary.html`, `translator.html`, `corpus.html` aggiungi `<link rel="stylesheet" href="shared/poetrify-components.css?v=N">` **subito dopo** il link a `shared/poetrify-tokens.css?v=N`, con lo **stesso `?v=N`** degli altri asset shared (regola di Passo 2). Bump coordinato del numero di versione su tutti i `shared/*` delle 4 pagine.
5. **Rimuovi i duplicati locali**: elimina dai `<style>` inline delle 4 pagine le definizioni delle classi ora centralizzate. Nel canone (`dictionary.html`) resta solo ciò che è genuinamente specifico di pagina; nelle altre pagine, dove le classi divergevano, **allinea al canone** (non conservare la variante divergente). Ogni volta che una classe estratta esiste anche altrove, la sua unica definizione deve vivere in `poetrify-components.css`.
6. **Terna sul translator (obbligatoria)**: `python _build/brace_check.py`, `python _build/balance.py`, `python _build/check_refs.py` su `translator.html` — **baseline** prima di toccarlo, **net-0** dopo. Se un tocco al translator sposta un contatore, correggi finché torna a zero.
7. **Verifica visiva end-to-end** nel browser locale sulle 4 superfici, in **light e dark** e su **entrambe le lingue** (`body[data-lang]` la e grc): topbar, gate, card-lemma con bordo-PoS, scheda, chip PoS, targhette categoria devono rendere identiche prima/dopo l'estrazione. Nessuna regressione di colore-lingua né di dark.

**Guardrail**
- Token e classi canoniche **solo** in `shared/*`, **mai** inline: dopo il Passo 3 nessuna delle classi estratte deve restare ridefinita nei `<style>` delle pagine.
- Nel file componenti: **nessun hex hardcoded** salvo costanti esplicitamente documentate nell'header (e la palette PoS deve preferibilmente essere token in `poetrify-tokens.css`).
- Le classi **non** fissano il colore-lingua: lo ereditano dai token che seguono `body[data-lang]`. Colore = lingua **sempre con etichetta** (WCAG 1.4.1); ottone `--brass` per le sezioni bilingui.
- Dark **solo** come override `:root[data-theme="dark"]` su `<html>`; non introdurre media-query alternativi né toggiare classi.
- **Non** toccare `shared/poetrify-theme.js`; **non** creare ES module né `modules/ui/`; niente `mountShell`. Il layer di Passo 3 è **solo CSS**.
- `translator.html`: mai leggerlo intero; ogni tocco passa la terna a net-0.
- «duplicato ≠ divergente»: leggi sempre dal sorgente del canone prima di spostare; se due pagine divergono, vince il dizionario.
- Una modifica non è «done» finché non vale su **tutte e 4** le superfici.
- Cache-bust: il nuovo `<link>` nasce con `?v=N`; bump coordinato su tutti gli asset shared delle 4 pagine (regola formalizzata al Passo 6).

**Definition of Done** — spunta su `05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md`; voci pertinenti a questo passo:
- [ ] Token/tipografia: i componenti consumano **solo** token di `poetrify-tokens.css` (nessun hex inline residuo; palette PoS promossa a token o costante documentata).
- [ ] Colore & contrasto AA: targhette/chip usano `--on-primary`; contrasto verificato su fondo pieno anche nel dark.
- [ ] Dark su `[data-theme]` + anti-flash: override componenti solo su `:root[data-theme="dark"]`; nessun flash.
- [ ] Responsive/overflow-x interno: la topbar e le liste mantengono il comportamento responsive del canone.
- [ ] Armonizzazione totale: le classi estratte hanno **una** definizione condivisa e valgono su tutte e 4 le pagine.
- [ ] Anti-slop / provenienza: header di provenienza in `poetrify-components.css`; nessun duplicato locale.
- [ ] Cache-bust `?v=N` presente e coordinato sui `shared/*` delle 4 pagine.
- [ ] Terna translator a net-0.
- [ ] Decisione palette PoS archiviata in aisthesis.

**Consegna**
- **File toccati**: `shared/poetrify-components.css` (nuovo), `shared/poetrify-tokens.css` (se promuovi la palette PoS), `app.html`, `dictionary.html`, `translator.html`, `corpus.html` (nuovo `<link>` + rimozione duplicati + bump `?v=N`).
- **Commit + push** sul branch **`migrazione-protocollo-ux`** senza chiedere conferma (= deploy Pages). Messaggio suggerito:
  `Migrazione protocollo §8 · layer componenti shared/poetrify-components.css + aggancio 4 pagine (Passo 3)`
- In coda: aggiorna i debiti del Protocollo e archivia in aisthesis la scelta sulla palette PoS. Prossimo: **Passo 4 — armonizzazione dei contenuti UX** (header unico, contratto di navigazione, controllo lingua unico, tassonomia livello, naming, copy del gate, barra di ricerca condivisa).

---

## Passo 4 — Armonizzazione dei contenuti UX su tutte e 4 le superfici

**Obiettivo**
Far parlare la stessa lingua alle quattro superfici del sito (`app.html`, `dictionary.html`, `translator.html`, `corpus.html`) sul piano dei *contenuti* di interfaccia — cioè gli 11 aspetti dell'audit UX che i soli token non risolvono. Al termine header, navigazione, controllo lingua, tassonomia di livello, glossario dei nomi, copy del gate e barra di ricerca devono essere identici (o simmetrici) su tutte e quattro le pagine, realizzati con le CLASSI-componente condivise già estratte al Passo 3. Nessuna superficie può restare indietro: una modifica non è «done» finché non vale su tutte e quattro.

**Dipende da**
Passo 3 — `shared/poetrify-components.css` esiste già, è estratto dal ramo canone (il dizionario) e linkato DOPO i token nelle 4 pagine; contiene le classi che consumano SOLO i token (card `.lx-item` con bordo-PoS, header/topbar `.pf-header`, gate lingua, chip PoS, targhetta categoria). In questo passo si RIUSANO quelle classi, non se ne inventano di nuove salvo dove indicato.
Rimandi alla sequenza della migrazione: 0 ricognizione · 1 translator su shared/ · 2 cache-bust · **3 layer componenti** · **4 questo passo** · 5 a11y residui · 6 governance. NON anticipare il Passo 5 (a11y: focus-ring, role/aria, skip-link, 44px, `lang` per-porzione, gate come `role="dialog"`): qui si tocca il *contenuto/markup semantico* dei controlli, non il loro comportamento a11y completo — se un ritocco al markup rende gratuito un attributo `aria`/`role`, mettilo, ma la copertura a11y sistematica è il Passo 5.

**Contesto essenziale (nomi e pattern REALI — usa SOLO questi)**
- Sito STATICO multi-pagina su GitHub Pages, NESSUN build step. Repo `Leocrates99/Poetrify-Translatio`, working copy in `Leonardo-Claude/04 - Prodotti Digitali/04.01 Dizionario`. Branch di lavoro: **`migrazione-protocollo-ux`**.
- Token: **`shared/poetrify-tokens.css`** (fonte unica; NON esiste alcun «poetrify-variables.css»).
- Componenti: **`shared/poetrify-components.css`** (dal Passo 3; NON esiste alcun «poetrify-ui.css»).
- JS condiviso: **`shared/poetrify-theme.js`**, IIFE, espone `window.PoetrifyTheme` con `toggle()/set()/current()`; inietta il pulsante flottante SOLO dove c'è `data-inject-toggle` (app, corpus); dove il toggle è proprio (dictionary, translator) si LINKA senza `data-inject-toggle` e il bottone è cablato a `PoetrifyTheme.toggle()/set()`. Script anti-flash inline in `<head>`. Dark unificato su `:root[data-theme="dark"]` su `<html>`. Eventuali nuovi comportamenti condivisi seguono lo stesso stile IIFE `shared/poetrify-*.js` con API su `window.Poetrify*` + attributi `data-*` — NIENTE ES module «modules/ui/shell.js», NIENTE funzione «mountShell», NON usare `modules/ui/` (è vuota).
- Colore = LINGUA, SEMPRE con etichetta testuale (WCAG 1.4.1): `body[data-lang]` con doppio valore in migrazione `la|latino` (rosso `#A22E37`, dark `#e58a90`) e `grc|greco` (blu `#1800AC`, dark `#8b7dff`); ottone `--brass` (`#9c6b3c`) come neutro per le sezioni bilingui.
- `translator.html` è ~2 MB: **mai leggerlo intero**, usa grep mirati. Ogni tocco al translator passa la **terna** di validatori: `_build/brace_check.py` + `_build/balance.py` + `_build/check_refs.py` (baseline PRIMA, net-0 DOPO).
- **Definition of Done = `05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md`** (è già la DoD ufficiale; NON crearne una parallela). La migrazione è il §8 del `PROTOCOLLO.md`.

**Compiti** (numerati, concreti; ogni compito va applicato a TUTTE e 4 le superfici pertinenti)

1. **Header unico.** Porta le quattro pagine allo stesso header basato sulla classe `.pf-header` (dal Passo 3). Le azioni dell'header devono essere **icona + etichetta** (icone inline-SVG via skill `iconography`, mai icon-font né emoji), non icona-sola. Stesso ordine, stessa gerarchia visiva, stesso posizionamento del toggle tema. Non duplicare stili di header negli `<style>` inline delle singole pagine: tutto ciò che è strutturale sta in `shared/poetrify-components.css`.

2. **Contratto di navigazione.** Distingui due azioni oggi confuse: «**Torna alla home**» (destinazione fissa `app.html`, presente su dictionary/translator/corpus) e «**Indietro**» (navigazione relativa nel flusso della pagina, es. dalla scheda lemma alla lista). Devono avere etichette diverse, icone diverse e non sovrapporsi mai. `app.html`, essendo la home, non mostra «Torna alla home». Uniforma le stringhe esatte su tutte le pagine.

3. **UN solo controllo lingua, simmetrico.** Elimina le TRE notazioni oggi presenti nel dizionario per scegliere la lingua (il commutatore `Σ ↔ S`, la variante a tab, la variante a chip): resta **un unico** controllo, identico nelle quattro superfici, che espone latino e greco in modo simmetrico. Il controllo mostra SEMPRE colore + etichetta testuale (rosso «Latino» / blu «Greco»), pilotato via `body[data-lang]` (accetta ancora il doppio valore `la|latino` / `grc|greco` finché la migrazione non è chiusa). Realizzalo come componente condiviso in `shared/poetrify-components.css` (+ eventuale comportamento in uno `shared/poetrify-*.js` IIFE se serve stato, in stile `PoetrifyTheme`). Le sezioni realmente bilingui restano in ottone `--brass`.

4. **Tassonomia di livello UNICA ed ESTESA.** Uniforma le etichette di difficoltà a esattamente tre voci per esteso: **Principiante · Intermedio · Avanzato**. Elimina ogni forma abbreviata o divergente (`Interm.`, `Avvio`, ecc.) ovunque compaia (dizionario, translator, corpus, app). Se c'è un attributo/dato che veicola il livello, mantienilo stabile ma cambia solo la STRINGA visibile e il chip.

5. **Glossario dei nomi (naming unico).** Applica il vocabolario canonico su tutte le superfici: la superficie di traduzione si chiama «**Traduttore**» (mai «Translator»); la **tab interna del translator oggi «Dizionario» diventa «Lessico»** (per non collidere col Dizionario come superficie a sé); il Dizionario resta «Dizionario»; il Corpus resta «Corpus» con **una sola** tagline/sottotitolo condiviso. Rendi i tre nomi di superficie coerenti in header, titoli di pagina (`<title>`), link di navigazione reciproci e testi di rimando.

6. **Copy unico del gate lingua.** Il gate/schermata di scelta lingua deve avere lo **stesso testo** su tutte le pagine che lo mostrano; l'unica differenza ammessa è il verbo d'azione secondo il contesto della superficie (es. «**consultare**» per il Dizionario/Corpus vs «**lavorare**» per il Traduttore). Estrai il copy in un unico blocco componente e parametrizza solo quel verbo. (Il markup a11y completo del gate — `role="dialog"`, `aria-modal`, focus-trap, `Esc`, return-focus — è competenza del Passo 5: qui uniforma solo testo e struttura.)

7. **Barra di ricerca condivisa.** Usa un'unica barra di ricerca (classe condivisa dal layer componenti) con, **accanto al campo**, la nota che la ricerca è **accent-insensitive** (per il greco: insensibile anche a spiriti/accenti — «accento/spirito-insensitive»). Stessa collocazione della nota, stesso wording, su tutte le pagine che offrono ricerca. Non reintrodurre stili di input inline: consumano i token.

8. **Verifica di non-divergenza prima di modificare** («duplicato ≠ divergente»): per header, controllo lingua, gate e search, LEGGI dal sorgente le quattro varianti attuali (per il translator con grep mirati) e riconcilia verso la forma canonica del dizionario, senza presumere. Rimuovi dagli `<style>` inline i pezzi ora coperti da `shared/poetrify-components.css`.

9. **Translator — terna obbligatoria.** Prima di toccare `translator.html` esegui la baseline con `_build/brace_check.py`, `_build/balance.py`, `_build/check_refs.py`; dopo le modifiche riesegui e verifica **net-0** (nessun nuovo squilibrio/ref rotto). Lavora sul translator solo con grep mirati, mai leggendolo intero.

**Guardrail**
- Colore = lingua SEMPRE accompagnato da etichetta testuale (WCAG 1.4.1); ottone `--brass` come neutro per il bilingue.
- Token e classi canoniche vivono SOLO in `shared/poetrify-tokens.css` e `shared/poetrify-components.css`, MAI ridefiniti inline. Non ridichiarare un token canonico dentro uno `<style>` di pagina.
- Nessun nome legacy: MAI `poetrify-variables.css`, `poetrify-ui.css`, `modules/ui/shell.js`, `mountShell`. JS condiviso solo come IIFE `shared/poetrify-*.js` con API su `window.Poetrify*` + `data-*`.
- Nessuna pagina resta indietro: ogni ritocco vale su tutte e quattro le superfici (armonizzazione totale).
- Ogni tocco al translator passa la terna (baseline → net-0). Non leggere `translator.html` per intero.
- Non anticipare il Passo 5 (copertura a11y sistematica) né il Passo 6 (governance/drift/cache-bust); il cache-bust `?v=N` sui link shared è già stato introdotto al Passo 2 — se aggiungi/riordini `<link>`/`<script>` shared, mantieni il parametro `?v=N` coerente col resto, senza inventare una nuova regola.
- Repo dell'utente: a lavoro finito **commit + push** sul branch `migrazione-protocollo-ux` senza chiedere conferma (= deploy Pages). Decisioni UX non ovvie (es. wording finale del gate, forma del controllo lingua unico) vanno archiviate nel canone via skill `aisthesis`.

**Definition of Done**
Spunta `05 - Officina/05.01 Protocollo UX-UI/CHECKLIST.md` (è la DoD; non crearne un'altra). Voci pertinenti a questo passo:
- Token & tipografia: nessun colore/spacing/tipo hardcoded reintrodotto; tutto via i token di `shared/poetrify-tokens.css`.
- Colore & contrasto AA: lingua sempre con etichetta; testo su superfici calde ≥ 4.5:1 (usa le varianti `--*-ink` dove serve).
- Dark su `[data-theme]` + anti-flash: intatti su tutte e quattro le pagine dopo le modifiche.
- Armonizzazione totale: header, contratto di navigazione, controllo lingua unico, tassonomia livello (Principiante/Intermedio/Avanzato), naming (Traduttore/Dizionario/Corpus; tab «Lessico»), copy del gate, barra di ricerca con nota accent/spirito-insensitive — identici o simmetrici sulle 4 superfici.
- Anti-slop e icone inline-SVG via skill `iconography` (icona + etichetta nell'header).
- Responsive: overflow-x interno, nessuno scroll orizzontale del body.
- Translator: terna passata a net-0.
- Commit + push su `migrazione-protocollo-ux` (= deploy); decisioni archiviate in `aisthesis`.
(Gli item a11y ancora scoperti — focus-ring, role/aria completi, skip-link, 44px, `lang` per-porzione, gate come `role="dialog"` — restano al Passo 5 e non bloccano la DoD di questo passo, salvo quelli resi gratuiti dai ritocchi di markup qui.)

**Consegna**
- File toccati (attesi): `app.html`, `dictionary.html`, `translator.html`, `corpus.html`, `shared/poetrify-components.css` (aggiunta/rifinitura delle classi condivise di header/nav/controllo-lingua/gate/search), ed eventuale nuovo `shared/poetrify-*.js` IIFE se il controllo lingua unico richiede stato condiviso.
- Messaggio di commit suggerito:
  ```
  UX: armonizzazione contenuti su 4 superfici (Passo 4) — header unico icona+etichetta, contratto nav (Torna alla home vs Indietro), controllo lingua unico simmetrico, livelli Principiante/Intermedio/Avanzato, naming Traduttore/Lessico/Corpus, copy gate unificato, barra di ricerca con nota accent/spirito-insensitive; terna translator net-0
  ```
- **Commit + push sul branch `migrazione-protocollo-ux`** (deploy Pages) senza chiedere conferma. Poi archivia in `aisthesis` le decisioni UX non ovvie e, se pertinente, annota lo stato dei debiti nel `PROTOCOLLO.md` (§8).

---

## Passo 5 — Accessibilità residua per la CHECKLIST (focus-ring, aria/role, skip-link, 44px, lang per-porzione, gate dialog)

**Obiettivo**
Chiudere le voci di accessibilità della `_Protocollo-UX-UI/CHECKLIST.md` ancora aperte dopo la migrazione, portandole a livello WCAG AA su **tutte e 4 le superfici** (`app.html`, `dictionary.html`, `translator.html`, `corpus.html`). Reduced-motion (debito D1) e contrasti con le varianti testo `--success-ink/--warning-ink/--danger-ink` (≥4.5:1) sono **GIÀ fatti nei token** e non vanno rifatti: qui si aggiungono solo i pezzi mancanti.
- focus-ring visibile e uniforme come `box-shadow` (token dedicato) su **ogni** controllo interattivo;
- semantica di navigazione: `role="tablist"` + `role="tab"` + `aria-selected` sui controlli-tab (l'`aria-pressed` sul toggle tema è **già** in `shared/poetrify-theme.js`, non toccarlo);
- **skip-link** «Salta al contenuto» come primo focusable, verso il landmark `<main>`;
- **target 44×44px** su puntatori grossolani `@media (pointer: coarse)`;
- attributo `lang="grc"` / `lang="la"` **per-porzione** sui passi in lingua classica (screen reader + selezione font politonico);
- **gate lingua** promosso a dialog accessibile: `role="dialog"` + `aria-modal="true"` + focus-trap + chiusura con `Esc` + return-focus all'elemento che l'ha aperto.

**Dipende da**
Passo 3 (il layer `shared/poetrify-components.css` esiste già ed è linkato dopo i token nelle 4 pagine: le classi-componente su cui appoggiare il focus-ring e la semantica gate/tab sono al loro posto) e Passo 4 (header unico, contratto di navigazione, un solo controllo lingua, copy unico del gate e barra di ricerca condivisa sono già cablati, quindi qui si decorano superfici stabili). A monte servono anche il Passo 1 (translator agganciato a `shared/`) e il Passo 2 (cache-bust `?v=N` sui `<link>`/`<script>` shared). Riferimento alla sequenza allineata 0→6 della mappa di migrazione.

**Contesto essenziale (nomi e pattern REALI — usare solo questi)**
- Repo `Leocrates99/Poetrify-Translatio`, working copy in `04 - Prodotti Digitali/04.01 Dizionario`. Sito **statico multi-pagina**, nessun build step. Branch di lavoro: **`migrazione-protocollo-ux`**.
- Token: **`shared/poetrify-tokens.css`** = fonte unica dei token (brand/accenti-lingua, `--brass` ottone, superfici calde, semantici con `-ink`, raggi `--radius-sm/md/lg`, scala 8pt `--sp-1..7`, tipografia `--font-display`/`--font-body`/`--font-ui`/`--font-classical`, `--transition`, reduced-motion). Dark unificato su `:root[data-theme="dark"]` applicato a `<html>`.
- Componenti condivisi: **`shared/poetrify-components.css`** (classi che consumano SOLO i token: card `.lx-item` con bordo-PoS, header `.pf-header`, gate lingua, chip PoS, targhetta categoria). È qui che vive la CSS del focus-ring e degli stati a11y statici.
- JS condiviso: IIFE in **`shared/poetrify-*.js`** con API su `window.Poetrify*` + attributi `data-*`. Il tema è **`shared/poetrify-theme.js`** → `window.PoetrifyTheme.{toggle,set,current}`, persiste su `localStorage 'poetrify-theme'`, con `data-inject-toggle` inietta il pulsante flottante `#poetrify-theme-toggle` (glifi ☾/☀, `aria-pressed`) **solo** dove manca un toggle proprio (app, corpus); dove il toggle è proprio (dictionary, translator) si LINKA senza `data-inject-toggle` e si cabla il bottone a `PoetrifyTheme`. **NON** esistono ES module `modules/ui/shell.js` né funzione `mountShell`: la cartella `modules/ui/` è vuota, non usarla. Il comportamento nuovo (focus-trap del gate, gestione `Esc`/return-focus) va in un IIFE `shared/poetrify-*.js` nello stesso stile.
- Colore = LINGUA sempre con etichetta: `body[data-lang]` con **doppio valore** durante la migrazione (`la|latino` rosso, `grc|greco` blu); ottone `--brass` per le sezioni bilingui. Il `lang=""` HTML per-porzione è cosa distinta da `data-lang` e va aggiunto sui frammenti di testo classico.
- Anti-flash: script inline in `<head>` che imposta `[data-theme]` prima del paint (già presente sulle pagine migrate). Non rimuoverlo né duplicarlo.
- Validatori translator (la «terna»): **`_build/brace_check.py`** + **`_build/balance.py`** + **`_build/check_refs.py`**. `translator.html` è ~2 MB: **non leggerlo mai intero**, usa grep mirati. Baseline PRIMA di toccarlo, net-0 DOPO.
- DoD = **`_Protocollo-UX-UI/CHECKLIST.md`** (spuntare lì, non creare una DoD parallela). Governance nel «Protocollo UX/UI» (`PROTOCOLLO.md`, §6 DoD, §8 debiti D1–D10).

**Compiti (concreti, numerati)**
1. **Token focus-ring in `shared/poetrify-tokens.css`.** Aggiungere un token dedicato per l'anello di focus, es. `--focus-ring` (spessore + colore ad alto contrasto sulle superfici calde) e, se serve, `--focus-ring-offset`. Definirlo anche nel blocco dark `:root[data-theme="dark"]` così che resti visibile su fondo scuro. Rispettare `prefers-reduced-motion` già impostato: il focus-ring non deve animare in violazione di D1.
2. **Focus-ring uniforme in `shared/poetrify-components.css`.** Su **ogni** controllo interattivo (bottoni, link-azione, tab, chip PoS cliccabili, campo di ricerca, controllo lingua, toggle) applicare `:focus-visible { box-shadow: var(--focus-ring); outline: none; }` (box-shadow, non outline, per seguire i raggi delle card/chip). Neutralizzare eventuali `outline:none` orfani già presenti. Verificare che l'anello non sia mai tagliato da `overflow:hidden` dei contenitori componente.
3. **Skip-link condiviso.** Introdurre come **primo elemento focusable** di ciascuna pagina un link «Salta al contenuto» (`.pf-skip-link`) che punta al landmark `<main id="main">`; stile in `poetrify-components.css`: fuori schermo finché non riceve focus, poi visibile in alto a sinistra. Assicurarsi che ogni pagina abbia un `<main id="main">` (aggiungerlo/annotarlo dove manca) e un solo `role="main"` implicito.
4. **Semantica di navigazione (tab).** Dove il Passo 4 ha unificato i controlli a tab (es. tassonomia livello unica, le 3 notazioni del dizionario, tab «Lessico»/naming), marcare il contenitore `role="tablist"`, ogni tab `role="tab"` con `aria-selected="true|false"` e `tabindex` roving; il pannello associato `role="tabpanel"` con `aria-labelledby`. Cablare l'aggiornamento di `aria-selected` nel gestore già esistente (senza introdurre framework). **Non** toccare l'`aria-pressed` del toggle tema, che è già gestito in `shared/poetrify-theme.js`.
5. **Target 44px.** In `poetrify-components.css`, dentro `@media (pointer: coarse)`, garantire `min-height:44px; min-width:44px` (o padding equivalente) a bottoni, tab, toggle, controllo lingua e ai link-azione dell'header, senza rompere il layout desktop `(pointer:fine)`.
6. **`lang` per-porzione sui passi classici.** Nei renderer/markup che emettono testo latino o greco (i passi in `translator.html`, i lemmi/esempi in `dictionary.html`, i loci del `corpus.html`), annotare i frammenti con `lang="la"` o `lang="grc"` sull'elemento che avvolge il testo classico. Il greco politonico deve così ereditare `--font-classical` (GFS Didot/EB Garamond) anche via selettore `:lang(grc)` se utile. Questo è distinto da `body[data-lang]`: `data-lang` guida il colore-lingua, `lang` guida screen reader e font.
7. **Gate lingua come dialog accessibile.** Sul gate (copy unico già dal Passo 4) applicare `role="dialog"` + `aria-modal="true"` + `aria-labelledby`/`aria-describedby` verso il suo titolo/testo. Implementare in un IIFE `shared/poetrify-*.js` (stile `window.Poetrify*` + `data-*`, non ES module): **focus-trap** entro il gate, chiusura con **`Esc`**, **return-focus** all'elemento che l'ha aperto, e focus iniziale sul primo controllo del gate all'apertura. Se serve un attributo di aggancio, usare un `data-*` coerente coi pattern esistenti.
8. **Translator con la terna.** Prima di modificare `translator.html`, salvare la **baseline** con `_build/brace_check.py`, `_build/balance.py`, `_build/check_refs.py`; applicare focus-ring, skip-link, tab semantics, `lang` per-porzione e gate-dialog anche lì (con grep mirati, mai lettura integrale); rieseguire la terna e confermare **net-0** rispetto alla baseline.
9. **Cache-bust.** Se si aggiunge un nuovo IIFE `shared/poetrify-*.js`, linkarlo nelle 4 pagine con `?v=N` coerente con la regola del bump coordinato del Passo 2, e bumpare `N` sulle risorse shared toccate.

**Guardrail**
- **Armonizzazione totale**: nessuna voce è «done» finché non vale su tutte e 4 le superfici (`app`, `dictionary`, `translator`, `corpus`). Una correzione a11y circoscritta a una pagina è incompleta.
- **Token e classi canoniche SOLO in `shared/*`, mai inline**: il `--focus-ring` sta nei token, la sua applicazione nei componenti; non ridefinire token inline negli `<style>` delle pagine.
- **Duplicato ≠ divergente**: leggere dal sorgente prima di aggiungere; non reintrodurre stili di focus/gate già presenti localmente — consolidarli in `shared/*` e rimuovere i doppioni.
- **Colore = lingua sempre con etichetta** (WCAG 1.4.1): l'a11y aggiunta non deve introdurre significato veicolato dal solo colore; ottone `--brass` resta il neutro bilingue.
- **Non toccare** l'anti-flash in `<head>`, l'`aria-pressed` del toggle (già in `poetrify-theme.js`), né la cartella vuota `modules/ui/`. Niente `mountShell`, niente ES module per la UI.
- **Reduced-motion (D1)** già attivo: focus-ring e transizioni del gate devono rispettarlo.
- **Ogni tocco a `translator.html`** passa la terna (`brace_check.py` + `balance.py` + `check_refs.py`), baseline→net-0; non leggerlo intero.
- Repo dell'utente: **commit + push** sul branch `migrazione-protocollo-ux` senza chiedere conferma. Decisioni non ovvie (es. scelta del valore/offset del focus-ring, pattern del focus-trap) archiviate nella skill **aisthesis**; aggiornare i debiti pertinenti nel Protocollo.

**Definition of Done** (spunta le voci pertinenti di `_Protocollo-UX-UI/CHECKLIST.md`, non creare una DoD parallela)
- [ ] **A11y — focus-ring**: `box-shadow` via token `--focus-ring` su ogni controllo, visibile in light e dark, non tagliato dai contenitori.
- [ ] **A11y — aria/role**: `role="tablist"`/`role="tab"`/`aria-selected` sulla navigazione a tab; `role="tabpanel"` + `aria-labelledby`; `aria-pressed` del toggle intatto.
- [ ] **A11y — skip-link**: primo focusable, verso `<main id="main">` presente su tutte le pagine.
- [ ] **A11y — target 44px**: garantito sotto `@media (pointer: coarse)` senza regressioni su desktop.
- [ ] **A11y — lingua per-porzione**: `lang="la"`/`lang="grc"` sui frammenti classici; greco politonico su `--font-classical`.
- [ ] **A11y — gate dialog**: `role="dialog"` + `aria-modal` + focus-trap + `Esc` + return-focus + focus iniziale.
- [ ] **Reduced-motion**: già rispettato, non regredito.
- [ ] **Dark su `[data-theme]` + anti-flash**: intatti; il focus-ring definito anche nel blocco dark.
- [ ] **Armonizzazione totale**: verificato su `app.html`, `dictionary.html`, `translator.html`, `corpus.html`.
- [ ] **Token/classi canoniche solo in `shared/*`**: nessun token inline aggiunto; doppioni consolidati.
- [ ] **Terna translator**: baseline salvata, net-0 confermato dopo le modifiche.
- [ ] **Cache-bust**: `?v=N` bumpato in modo coordinato sulle risorse `shared/*` toccate.

**Consegna**
- File toccati (attesi):
  - `shared/poetrify-tokens.css` — token `--focus-ring` (+ eventuale `--focus-ring-offset`), definito anche in dark.
  - `shared/poetrify-components.css` — regole `:focus-visible` con box-shadow, `.pf-skip-link`, stili tab (`role`/`aria-selected`), min 44px su `(pointer:coarse)`, stile gate dialog.
  - `shared/poetrify-*.js` (nuovo IIFE, stile `window.Poetrify*`) — focus-trap + `Esc` + return-focus del gate; aggancio via `data-*`.
  - `app.html`, `dictionary.html`, `translator.html`, `corpus.html` — skip-link + `<main id="main">`, attributi `role`/`aria-*` sulle tab, `lang` per-porzione sui passi classici, gate promosso a dialog, link al nuovo IIFE con `?v=N`.
  - `_Protocollo-UX-UI/CHECKLIST.md` — voci a11y spuntate; note nei debiti del Protocollo se pertinenti.
- Messaggio di commit suggerito:
  ```
  a11y(§8): focus-ring token + skip-link + tab semantics + 44px + lang per-porzione + gate dialog su tutte e 4 le superfici

  - --focus-ring in poetrify-tokens.css (light+dark), :focus-visible box-shadow in poetrify-components.css
  - skip-link .pf-skip-link -> <main id="main">; role=tablist/tab + aria-selected sulla navigazione
  - min 44px su (pointer:coarse); lang="la"/"grc" per-porzione sui passi classici (font-classical)
  - gate lingua role=dialog + aria-modal + focus-trap + Esc + return-focus (nuovo IIFE shared/poetrify-*.js)
  - translator: terna net-0 (brace_check/balance/check_refs); cache-bust ?v=N coordinato

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- **commit + push sul branch `migrazione-protocollo-ux`** (= deploy Pages) senza chiedere conferma. Archiviare le decisioni non ovvie (valore/offset del focus-ring, pattern del focus-trap) nella skill **aisthesis** e aggiornare i debiti del Protocollo UX/UI.

---

## Passo 6 — Governance: `check_design_drift.py`, hook/CI, regola cache-bust, DoD = CHECKLIST

**Obiettivo**
Rendere la migrazione UX/UI *auto-difesa*: nessuno deve poter riaprire la deriva già sanata nei passi 1-5. Aggiungi al `_build/` (dove la «terna» validatori esiste già) un nuovo validatore che **boccia** ogni pagina che (a) ridefinisce inline un token canonico di `shared/poetrify-tokens.css`, oppure (b) non linka `shared/poetrify-tokens.css` / `shared/poetrify-components.css`, oppure (c) riscrive localmente le classi-componente condivise (`.lx-item`, `.pf-*`). Installalo come **hook pre-push locale** e come **CI d'allarme**. **Formalizza** la regola di cache-bust (`?v=N`, proprietario unico, N corrente). Chiudi il ciclo aggiornando i debiti §8 del Protocollo e archiviando le decisioni in aisthesis. La Definition of Done **è** `_Protocollo-UX-UI/CHECKLIST.md`: la spunti, non ne crei una parallela.

**Dipende da**
Passi 1-5 completati: translator agganciato a `shared/` (1), cache-bust `?v=N` presente su tutte e 4 le pagine (2), `shared/poetrify-components.css` estratto dal dizionario e linkato (3), contenuti UX armonizzati (4), a11y residui chiusi (5). Questo è l'ultimo passo (6) della sequenza 0-6.

**Contesto essenziale (nomi e pattern REALI — usa SOLO questi)**
- Repo: `Leocrates99/Poetrify-Translatio`. Working copy: `Leonardo-Claude/04 - Prodotti Digitali/04.01 Dizionario`. Sito **statico** multi-pagina su GitHub Pages, **nessun build step**. Branch di lavoro: **`migrazione-protocollo-ux`** (push diretto, niente branch-protection).
- 4 superfici a radice: `app.html`, `dictionary.html` (ramo **canone**), `translator.html` (~2 MB, **mai leggere intero**: solo grep mirati), `corpus.html`.
- Token, fonte unica: `shared/poetrify-tokens.css` (brand/accenti-lingua `--primary`/`--accent`/`--dacc`, `--brass` ottone neutro, superfici calde `--paper`/`--ivory`/`--cream`/`--parchment`, semantici con varianti testo `--success-ink`/`--warning-ink`/`--danger-ink`, raggi `--radius-sm/md/lg`, scala 8pt `--sp-1..7`, tipografia `--font-display`/`--font-body`/`--font-ui`/`--font-classical`, `--transition`). Dark unificato su `:root[data-theme="dark"]` su `<html>`.
- Componenti condivisi: `shared/poetrify-components.css` (creato al passo 3: `.lx-item` card con bordo-PoS, header/topbar `.pf-header`, gate lingua, chip PoS, targhetta categoria; consuma **solo** i token). Linkato **dopo** i token nelle 4 pagine.
- JS condiviso: `shared/poetrify-theme.js` — IIFE (**non** ES module). Espone `window.PoetrifyTheme = {toggle, set, current}`; persiste su `localStorage 'poetrify-theme'`; con l'attributo `data-inject-toggle` inietta il pulsante flottante solo dove manca un toggle proprio; script **anti-flash** inline in `<head>` che imposta `[data-theme]` prima del paint.
- Lingua = colore, sempre etichettata: `body[data-lang]` con doppio valore `la|latino` (rosso) e `grc|greco` (blu); `--brass` per le sezioni bilingui.
- Validatori già esistenti (la «terna» del translator): `_build/brace_check.py`, `_build/balance.py`, `_build/check_refs.py`. Altri: `_build/check_stats.mjs`, `_build/check_unified.mjs`.
- **DoD = `_Protocollo-UX-UI/CHECKLIST.md`** (già la Definition of Done). Governance narrativa: `_Protocollo-UX-UI/PROTOCOLLO.md` (§8 = debiti D1-D10, la migrazione stessa).
- Esiste `.github/` nel repo (per il workflow CI).

**Compiti (concreti, numerati)**

1. **Baseline read-only prima di toccare.** Con grep mirati accerta lo stato reale che il validatore dovrà dare per «verde»: ogni pagina linka `shared/poetrify-tokens.css` e `shared/poetrify-components.css`; nessuna ridefinisce inline un token canonico; nessuna riscrive `.lx-item`/`.pf-*` nel proprio `<style>`. Se qualcosa è ancora rosso, è un residuo dei passi 1-5 da chiudere **prima**, non da tollerare nel validatore.

2. **Crea `_build/check_design_drift.py`** (Python 3, stdlib pura, zero dipendenze; deve girare identico su Windows/PowerShell e in CI Ubuntu). Contratto:
   - **Input**: le 4 pagine a radice (`app.html`, `dictionary.html`, `translator.html`, `corpus.html`). Per `translator.html` opera **a stream/riga per riga o via regex mirata**, mai caricando 2 MB in memoria d'un fiato per costruire strutture — resta coerente con la regola «mai leggere il translator intero».
   - **Sorgente di verità dei token canonici**: parsa i nomi `--*` **dal blocco `:root` di `shared/poetrify-tokens.css`** (non hardcodare l'elenco: leggilo dal file, così il set resta vivo). Idem per le classi-componente canoniche: estrai i selettori `.lx-item` e `.pf-*` da `shared/poetrify-components.css`.
   - **Regola A (token inline)**: FAIL se una pagina, dentro un proprio `<style>` inline, **assegna** (`--nome: valore;` in un blocco di regole, cioè una *ridefinizione*, non un semplice `var(--nome)` in consumo) un token che appartiene al set canonico. Consumare i token con `var()` è lecito e non deve mai fallire.
   - **Regola B (aggancio mancante)**: FAIL se una pagina non contiene un `<link>` a `shared/poetrify-tokens.css` **e** uno a `shared/poetrify-components.css` (accetta il suffisso `?v=N`).
   - **Regola C (componenti riscritti)**: FAIL se una pagina ridefinisce inline un selettore canonico (`.lx-item`, `.pf-*`) nel proprio `<style>`.
   - **Output**: elenco leggibile `FILE — REGOLA — dettaglio (riga)`; exit code `0` se pulito, `1` se una o più violazioni. Zero falsi positivi sul consumo `var()` (è il punto delicato: distingui *assegnazione dentro un ruleset di pagina* da *uso*).
   - Aggiungi un flag `--list-canonical` che stampa il set di token/classi canonici desunti, così l'hook e la CI sono ispezionabili.

3. **Hook pre-push locale.** Crea `_build/hooks/pre-push` (shell POSIX, con shebang; deve funzionare via Git for Windows) che esegue `python _build/check_design_drift.py` e, **se il push tocca `translator.html`**, anche la terna `brace_check.py`+`balance.py`+`check_refs.py` (net-0 atteso). Su fallimento: exit ≠ 0 e messaggio che indica il file/regola. Attiva l'hook nel repo con `git config core.hooksPath _build/hooks` (documenta il comando; l'hook è versionato, quindi vive nel repo). Verifica che l'hook sia eseguibile.

4. **CI d'allarme.** Crea `.github/workflows/design-drift.yml`: su `push`/`pull_request` verso `migrazione-protocollo-ux` (e opzionalmente `main`), job Ubuntu con Python che lancia `check_design_drift.py`. È **allarme**, non gate bloccante di merge: **niente branch-protection** (il flusso resta push diretto sul branch di lavoro). Il rosso in CI serve a farsi vedere, non a impedire il push.

5. **Formalizza la regola cache-bust.** Il passo 2 ha introdotto `?v=N` sui `<link>`/`<script>` di `shared/*`. Scrivi la regola in `_Protocollo-UX-UI/PROTOCOLLO.md` (sezione governance/§ pertinente): **proprietario unico** del contatore, **N corrente** dichiarato, **bump coordinato** su tutte e 4 le pagine ad ogni modifica di un file `shared/*`. Se pratico, fai controllare a `check_design_drift.py` (o a un mini-check dedicato) che i `?v=` di `shared/*` siano **allineati fra le 4 pagine** (drift di versione = warning).

6. **DoD = CHECKLIST, non parallela.** Apri `_Protocollo-UX-UI/CHECKLIST.md` e **spunta** le voci ora soddisfatte a fine migrazione (token/tipografia, colore&contrasto AA con `--*-ink`, dark su `[data-theme]`+anti-flash, a11y focus-ring/aria/skip-link/44px, responsive overflow-x interno, armonizzazione totale, anti-slop, icone inline-SVG, commit+push=deploy, archiviazione in aisthesis). **Non creare** un file DoD nuovo.

7. **Chiudi i debiti nel Protocollo.** In `_Protocollo-UX-UI/PROTOCOLLO.md` §8 aggiorna lo stato dei debiti D1-D10 alla luce dei passi 1-6 (la migrazione È il §8): segna come sanati quelli chiusi, annota il presidio (`check_design_drift.py` + hook + CI) che ne impedisce la ricomparsa.

8. **Archivia le decisioni in aisthesis.** Invoca la skill **aisthesis** e deposita nel canone le scelte non ovvie di questo passo: il *drift-check come guardia dei token/componenti canonici*, la *regola cache-bust a proprietario unico*, la scelta *CI-allarme senza branch-protection su push diretto*. È il chiudi-cerchio richiesto dal Protocollo.

**Guardrail**
- **Solo nomi reali**: `shared/poetrify-tokens.css`, `shared/poetrify-components.css`, `shared/poetrify-theme.js`, `window.PoetrifyTheme`/`data-inject-toggle`, `:root[data-theme]` su `<html>`, `body[data-lang]` `la|grc`, `_build/brace_check.py`+`balance.py`+`check_refs.py`, `_Protocollo-UX-UI/CHECKLIST.md`. **Mai** `poetrify-variables.css`, `poetrify-ui.css`, `modules/ui/shell.js`, `mountShell` — non esistono e non vanno introdotti (`modules/ui/` è vuota, non usarla).
- `translator.html` **non si legge intero**: grep/stream mirati; ogni tocco al translator passa la terna (net-0).
- **Duplicato ≠ divergente**: leggi il set canonico *dal sorgente* (`poetrify-tokens.css`/`poetrify-components.css`), non da un elenco hardcoded che invecchia.
- Il validatore non deve produrre **falsi positivi sul consumo `var()`**: fallisce solo la *ridefinizione* inline di un token canonico, mai l'uso.
- **Niente branch-protection**: la CI è allarme, il push resta diretto su `migrazione-protocollo-ux`.
- **Colore = lingua sempre etichettato** (WCAG 1.4.1); `--brass` neutro per le sezioni bilingui — invarianti che il presidio non deve indebolire.
- Non reinventare la governance: `PROTOCOLLO.md`/`CHECKLIST.md` esistono già, si estendono.

**Definition of Done — `_Protocollo-UX-UI/CHECKLIST.md`** (spunta le voci pertinenti; non crearne una nuova):
- [ ] `_build/check_design_drift.py` esiste, gira su Windows e in CI, exit 0 sullo stato attuale delle 4 pagine, exit 1 su una violazione simulata (token canonico ridefinito inline, o aggancio `shared/*` mancante, o `.lx-item`/`.pf-*` riscritto) — verificato con un caso di prova volante, poi ripulito.
- [ ] Set canonico letto **dal sorgente** (`poetrify-tokens.css` + `poetrify-components.css`), verificabile con `--list-canonical`; zero falsi positivi sul consumo `var()`.
- [ ] `_build/hooks/pre-push` presente, eseguibile, esegue il drift-check e (se tocca il translator) la terna; `git config core.hooksPath _build/hooks` documentato e attivo.
- [ ] `.github/workflows/design-drift.yml` presente, lancia il drift-check su push/PR verso `migrazione-protocollo-ux` come **allarme** (niente branch-protection).
- [ ] Regola cache-bust `?v=N` formalizzata in `PROTOCOLLO.md` (proprietario unico, N corrente, bump coordinato); allineamento `?v=` fra le 4 pagine controllato.
- [ ] Debiti §8 (D1-D10) aggiornati in `PROTOCOLLO.md`; presidio anti-ricomparsa annotato.
- [ ] Voci pertinenti di `CHECKLIST.md` spuntate (nessuna DoD parallela creata).
- [ ] Decisioni archiviate in aisthesis (drift-check, cache-bust owner-unico, CI-allarme).

**Consegna**
- File toccati/creati: `_build/check_design_drift.py` (nuovo), `_build/hooks/pre-push` (nuovo), `.github/workflows/design-drift.yml` (nuovo), `_Protocollo-UX-UI/PROTOCOLLO.md` (regola cache-bust + §8 debiti), `_Protocollo-UX-UI/CHECKLIST.md` (voci spuntate), più l'aggiornamento del canone via skill aisthesis.
- Messaggio commit suggerito:

  ```
  chore(governance): drift-check + hook/CI + regola cache-bust; chiudo §8

  - _build/check_design_drift.py: FAIL su token canonici ridefiniti inline,
    aggancio shared/* mancante, .lx-item/.pf-* riscritti; set letto dal sorgente
  - _build/hooks/pre-push + core.hooksPath: drift-check locale (+ terna sul translator)
  - .github/workflows/design-drift.yml: CI d'allarme su migrazione-protocollo-ux
  - PROTOCOLLO.md: regola cache-bust (owner unico, N corrente, bump coordinato) + §8 D1-D10
  - CHECKLIST.md: DoD spuntata

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- **Commit + push sul branch `migrazione-protocollo-ux`** senza chiedere conferma (repo dell'utente: push = deploy). Nessuna branch-protection.

---

> Allineato allo stato reale del repo (migrazione Protocollo §8). Deliverable gemelli: `docs/UX-AUDIT.html` (diagnosi + governance) · `docs/UX-SOLUTIONS.html` (mockup «prima→dopo»).
