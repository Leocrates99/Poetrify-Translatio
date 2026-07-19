# Stato reale della migrazione UX/UI — ricognizione (Passo 0)

> Ricognizione **read-only** delle superfici del sito, eseguita leggendo il sorgente.
> Nessun file del sito è stato modificato. Fonte del canone: **`shared/poetrify-tokens.css`**
> (**56** nomi-token distinti). Riferimenti: Protocollo UX/UI §8 · `CHECKLIST.md` = Definition of Done.

## 1 · Matrice di aggancio

| Superficie | `poetrify-tokens.css` | `poetrify-theme.js` | `data-inject-toggle` | anti-flash `<head>` | `?v=` | token inline |
|---|:--:|:--:|:--:|:--:|:--:|--:|
| `app.html` (15 KB) | ✅ | ✅ | ✅ *(corretto: nessun toggle proprio)* | ✅ | ❌ | **0** |
| `dictionary.html` (92 KB) | ✅ | ✅ | — *(corretto: ha toggle proprio)* | ✅ | ❌ | 31 |
| `translator.html` (1914 KB) | ✅ | ✅ | — *(corretto: ha toggle proprio)* | ✅ | ❌ | 41 |
| `corpus.html` (31 KB) | ✅ | ✅ | ✅ *(corretto: nessun toggle proprio)* | ✅ | ❌ | 4 |
| `index.html` (904 B) | n/a | n/a | n/a | n/a | n/a | 0 |

**Esiti principali**

- ✅ **L'aggancio a `shared/` è COMPLETO su tutte e 4 le superfici**, anti-flash incluso. Il pattern
  `data-inject-toggle` è applicato **correttamente ovunque**: iniettato dove non c'è un toggle proprio
  (app, corpus), omesso dove c'è (dictionary, translator).
- ❌ **Il cache-bust `?v=N` è assente su tutte e 4** (≈ 8 riferimenti da versionare).
- ⚠️ Restano **token inline che ridefiniscono il canone**: il debito non è più *l'aggancio*, ma la **dedup**.
- `index.html` è un **redirect puro** (904 byte, `<meta http-equiv="refresh">` → `app.html`): nessuna UI da migrare.

## 2 · Token inline residui — «duplicato ≠ divergente»

| Superficie | duplicati *(stesso nome e valore: solo debito)* | **divergenti** *(stesso nome, valore diverso: drift vero)* | locali *(nomi non canonici: legittimi)* |
|---|--:|--:|--:|
| `app.html` | 0 | **0** | 0 |
| `corpus.html` | 1 | **3** | 0 |
| `dictionary.html` | 5 | **10** | 15 |
| `translator.html` | 14 | **11** | 16 |

`app.html` è **completamente pulita** — è il modello di come devono restare le altre.

### 2.1 · `translator.html` — le divergenze che si vedono

Sono le più gravi perché toccano **forma e semantica**, non solo il dark:

| Token | nel translator | canone | Nota |
|---|---|---|---|
| `--radius-sm` | `3px` | `4px` | forma difforme |
| `--radius-md` | `6px` | **`8px`** | ⚠️ contraddice il debito **D8** (raggi 8/12) |
| `--radius-lg` | `10px` | **`12px`** | ⚠️ contraddice **D8** |
| `--warning` | `#fbbf24` | **`#b9791f`** | ⚠️ è **proprio il valore che D8 ha corretto** per contrasto |
| `--danger` | `#f87171` | `#c53030` | semantico difforme |
| `--ink-soft` | `#4a5568` | `#4a525a` | inchiostro difforme |
| `--parchment`, `--rule`, `--rule-soft`, `--primary-pale`, `--primary-dark` | valori propri | canone | override locali |

### 2.2 · `dictionary.html` — un blocco dark locale

Le 10 divergenze reali sono quasi tutte **valori scuri** (`--paper #232730`, `--ivory #1c1f24`,
`--rule #3b3f4a`, `--rule-soft #2c303a`, `--dacc-pale/-border/-deep`, `--accent`): il dizionario
mantiene un **proprio tema scuro** che ridefinisce i token invece di ereditare quelli di
`:root[data-theme="dark"]` del canone. È il residuo dei debiti **D2/D4**.

### 2.3 · `corpus.html` — tre override del lettore

`--parchment` `#24242c`, `--parchment-edge` `#34343f`, `--mark` `#6b5a1e`: override scuri del lettore.
Da decidere se promuoverli a token del canone o dichiararli **variazione legittima** (Protocollo §4).

## 3 · Coerenza del rename D5 nel translator

**Esito: i NOMI sono allineati; i VALORI no.** Il rename `--poetrify-*` → `--*` ha prodotto nomi
che combaciano col canone — prova ne sono i **14 token identici** (`brass`, `cream`, `font-body`,
`font-display`, `font-ui`, `font-mono`, `ink`, `ivory`, `paper`, `primary`, `sepia`, `sepia-soft`,
`success`, `font-classical-size-boost`). Nessun token orfano dovuto al rename.

Da verificare a parte: `var(--phase-color)` e `var(--sepia-strong)`, usati ma non definiti in un
blocco `<style>` (probabilmente impostati via JS o via attributo `style` inline).

## 4 · Limiti del metodo (onestà)

- Il parser legge le dichiarazioni dentro i blocchi `<style>`: **non vede** i token impostati via
  attributo `style="--x:…"` sui singoli elementi né quelli scritti da JS. Per questo alcuni `var()`
  risultano «orfani» pur essendo validi — es. `--cat-c`/`--segc` nel dizionario, che sono assegnati
  per-elemento dal renderer.
- Un caso segnalato come divergente su `--primary` nel dizionario è un **artefatto**: il regex ha
  catturato il testo di un commento CSS. Escluso dai conteggi reali.
- Non distingue *dove* un token è ridefinito (`:root` vs uno scope locale): una ridefinizione dentro
  un componente può essere legittima. Le voci qui sopra vanno lette come **candidati**, da confermare
  guardando il selettore che le contiene.

## 5 · Dimensionamento dei passi 1–6

| Passo | Stato | Lavoro residuo |
|---|---|---|
| **1 · Translator su `shared/`** | ✅ **GIÀ FATTO** | Nessuno: tutte e 4 le pagine sono agganciate, anti-flash e pattern toggle corretti. Il passo si chiude senza interventi. |
| **2 · Cache-bust `?v=N`** | ❌ da fare | Piccolo e meccanico: ~8 riferimenti (`tokens.css` + `theme.js` × 4 pagine) + la regola del bump coordinato. |
| **3 · Layer componenti** | ❌ da fare | `shared/poetrify-components.css` **non esiste**. **Da anteporre**: la *dedup* dei ~24 token divergenti (vedi §2), altrimenti i componenti condivisi verrebbero sovrascritti dagli inline. |
| **4 · Contenuti UX** | ❌ invariato | Gli 11 aspetti dell'audit (header, ritorno-home, controllo lingua, livello, naming, gate, ricerca). Non toccato dalla migrazione dei token. |
| **5 · a11y residui** | ⚠️ parziale | `reduced-motion` e contrasti `*-ink` **già nel canone**; ma il translator li **annulla** localmente (`--warning #fbbf24`): la dedup del Passo 3 è anche un fix di accessibilità. Restano focus-ring, `aria/role`, skip-link, 44px, `lang` per-porzione, gate `role="dialog"`. |
| **6 · Governance anti-drift** | ❌ da fare | Ora ha un bersaglio **misurabile**: 0 token canonici ridefiniti inline, 4/4 pagine agganciate, `?v=` presente. Le ~24 divergenze di oggi sono la baseline da azzerare. |

### Priorità suggerita

1. **Dedup dei token divergenti** — a partire dal **translator** (raggi `3/6/10` → `4/8/12` e semantici),
   perché è drift **visibile** e contraddice D8; poi il blocco dark del dizionario (D2/D4).
2. **Cache-bust** (rapido, abilita il resto in sicurezza).
3. **Layer componenti**, ora che i token non vengono più sovrascritti.
4. Contenuti UX → a11y → linter anti-drift.

> **Nota di metodo.** Il Passo 1 risultava «da fare» quando la roadmap è stata scritta: nel frattempo
> è stato completato. È esattamente il motivo per cui questo passo esiste — **misurare prima di agire**.
