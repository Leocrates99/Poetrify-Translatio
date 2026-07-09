# Poetrify · Dizionario totale — ROADMAP OPERATIVA DEFINITIVA

> **Contratto unico di costruzione.** Questo file è la fonte di verità. Va **riletto prima di eseguire qualsiasi prompt**. Ogni record prodotto DEVE conformarsi. Nessuna svista, nessun errore: se un input è ambiguo rispetto a questo documento, ci si ferma e si chiede, non si improvvisa.
>
> Artifact visivo di accompagnamento: https://claude.ai/code/artifact/b610821d-7efd-4d59-831b-c0b2cd930769

---

## 0. Come funziona (il loop)

Il database si costruisce come **spazzata segmentata deterministica**. Due fasi *una-tantum* (F0 fondazione, F1 preparazione) poi il **ciclo per segmento** (S.1→S.2→S.3) che realizza F2 (fusione dei sensi) **e** F3 (morfologia) **insieme, dentro ogni segmento**, producendo la scheda-lemma completa con il suo ID. F4 (finestre + proattivo) e F5 (innesti) vengono dopo.

```
F0 (una volta) → F1 (una volta) → [ per ogni SEGMENTO nell'ordine:  S.1 → S.2 → S.3 ] → F4 → F5
                                     └── costruisce la scheda COMPLETA + ID + analizzatore ──┘
```

**Ogni fase d'espansione è agganciata alla costruzione segmentata:** F2 e F3 *sono* la spazzata; F0/F1 sono le fondamenta che la spazzata presuppone; F4/F5 leggono ciò che la spazzata ha prodotto.

---

## 1. Regole d'oro (invarianti — non negoziabili)

1. **ID prima di tutto.** Nessun record si scrive senza il suo `id` (§3). L'ID non cambia mai.
2. **Niente esclusioni.** Dizionario completo: *tutti* i lemmi presenti e visibili. La frequenza **ordina**, non nasconde. Nessun livello di difficoltà.
3. **Niente significati scartati.** Le fonti si **fondono e gerarchizzano** (§5), mai si eliminano. Divergenze segnalate.
4. **Niente troncamenti.** Mai `…` nelle definizioni: si riporta il testo integrale della fonte.
5. **Bilingue minimo garantito.** Ogni senso ha almeno `tr.en` **e** `tr.it`. Le altre lingue sono additive.
6. **Morfologia completa e corretta.** Ogni lemma flessibile ha il paradigma **integrale**; i verbi per intero (tutti i modi/tempi/diatesi) + participi declinati. Per il greco l'ID conserva i **temi verbali**.
7. **Analizzatore accoppiato.** Generare il paradigma popola l'indice inverso `forma → {id, parsing}`. **Round-trip obbligatorio**: ogni forma generata deve ricondurre al proprio ID con parsing corretto.
8. **Legalità tracciata.** Solo fonti **PD / CC BY-SA / MIT** (§9). Ogni dato porta `prov` (fonte + licenza). Le fonti NC sono vietate.
9. **Un segmento alla volta.** Si lavora nell'ordine (§4). Un segmento si **chiude** solo dopo la checklist S.3 tutta verde; poi si passa al successivo.
10. **Indici sempre sincronizzati.** Ogni scrittura aggiorna `_index.json` e le stats dai conteggi **reali** (mai lasciarli stale).

---

## 2. Schema della scheda-lemma (contratto esatto)

File canonico: `data/<lang>/unified/<lettera>.json` = mappa `{ id: RECORD }`.
`<lang>` ∈ `lat` | `grc`. `<lettera>` = prima lettera normalizzata (NFD, strip diacritici, lowercase).

```jsonc
{
  // — IDENTITÀ (obbligatoria, §3) —
  "id":    "lat:amor",             // chiave canonica, univoca
  "uid":   "poe-000128437",        // permanente, immutabile, mai riusato
  "uri":   "http://lila-erc.eu/data/id/lemma/…",  // autorità esterna | null
  // — ANAGRAFICA —
  "lemma": "amor",                 // forma di citazione (con diacritici/macron per il greco)
  "lang":  "lat",                  // lat | grc
  "pos":   "sostantivo",           // vocabolario chiuso: sostantivo|aggettivo|pronome|verbo|avverbio|preposizione|congiunzione|interiezione|numerale
  // — MORFOLOGIA (§ paradigma) —
  "morph": { "genere":"m", "flessione":"3ª decl.", "classe":"consonantica", "testa":"amor, amoris m" },
  "temi":  null,                   // SOLO verbi (obbligatorio per i verbi); vedi esempio greco
  "quantita": "amŏr, amōris",      // quantità vocaliche strutturate (macron/breve)
  "reggenza": null,                // valenza/casi retti (verbi, preposizioni); null se non pertinente
  "paradigma": "a#lat:amor",       // ref data/<lang>/paradigms/<lettera>.json (chiave = id) ; null se indeclinabile
  // — SEMANTICA (§5, fusione) —
  "freq": { "rank": 312 },         // solo ordinamento; MAI esclusione
  "gloss": { "en":["love"], "it":["amore","affetto"] },   // sintesi rapida bilingue+
  "campi": [
    { "campo":"sentimento / affetto", "rank":1,
      "sensi":[ { "tr":{ "en":["love"], "it":["amore","affetto"], "fr":["amour"], "es":["amor"] },
                 "registro":"generale", "fonti":["L&S","Whitaker","WiktIT"], "esempi":[] } ] }
    // … altri campi semantici, per rango …
  ],
  "applicazione": [ "soggetto astratto → spesso reso con verbo", "al pl. amores = relazione" ],
  // — APPARATO (confronto conservato) —
  "senses_raw": { "L&S":"…testo integrale…", "WiktIT":"…" },
  "prov": { "autorita":"L&S", "src":["Lewis1890·PD","WiktIT·CC-BY-SA"], "lic":"CC BY-SA 4.0" }
}
```

**Obbligatorietà per PoS:** `id/uid/lemma/lang/pos/gloss/campi/prov` sempre. `paradigma` per tutti i flessibili (nomi, aggettivi, pronomi, verbi); `null` per indeclinabili. `temi` obbligatorio e non-null per i **verbi**. `reggenza` atteso per verbi e preposizioni.

**Esempio verbo greco (temi → sistema completo):**
```jsonc
{
  "id":"grc:λύω", "uid":"poe-000390014", "uri":null,
  "lemma":"λύω", "lang":"grc", "pos":"verbo",
  "morph":{ "classe":"tematico (-ω)" },
  "temi":{ "pres":"λυ-", "fut":"λυσ-", "aor":"ἐλυσ-", "perf":"λελυκ-", "aor_pass":"ἐλυθ-" },
  "reggenza":"transitivo (+ acc.)",
  "paradigma":"λ#grc:λύω",         // sistema intero: ind/cong/opt/imv/inf/ptc × att/med/pass + participi declinati
  "freq":{ "rank":58 },
  "gloss":{ "en":["loosen","release"], "it":["sciogliere","liberare"] },
  "campi":[ /* … per campo semantico, per rango … */ ],
  "prov":{ "autorita":"LSJ", "src":["LSJ·CC-BY-SA","greek-inflexion·MIT"], "lic":"CC BY-SA 4.0" }
}
```

**File collegati (architettura shard esistente):**
- Paradigmi: `data/<lang>/paradigms/<lettera>.json` = `{ id: TABELLA_SEGMENTATA }`
- Indice inverso (analizzatore): `data/<lang>/forms/<lettera>.json` = `{ forma: [ { id, parsing } ] }`
- Worklist di segmento: `data/<lang>/_worklist/<SEG>.json`
- Gold di riferimento: `_build/gold/<lang>-<pos>.json`
- Registro UID: `data/_uid_ledger.json` = `{ id: uid }` (append-only, mai riscritto)

---

## 3. Regole dell'ID (esatte, deterministiche)

**Chiave canonica** `id = "<lang>:<slug>"` :
- `lang` = `lat` | `grc`.
- `slug` (latino): lemma in minuscolo, `j→i`, `v` mantenuto com'è nella testata L&S, **macron rimossi** (non distintivi al livello di lemma).
- `slug` (greco): lemma in minuscolo, **NFC**, **accenti e spiriti CONSERVATI** (distintivi: `βίος` ≠ `βιός`), iota sottoscritto conservato.

**Disambiguazione (suffisso `#…`, solo se collisione):**
- Omografi di **PoS diversa** → tag PoS: `lat:malus#arbor` (sost.) vs `lat:malus#agg`; `grc:…#nome` / `#verbo`.
- Omografi di **stessa PoS** → numerico seguendo la numerazione dell'autorità (L&S/LSJ): `lat:oro#1`, `lat:oro#2`.
- **Mai fondere silenziosamente** due lemmi che collidono: P0.0 li mette in un report per disambiguazione manuale.

**`uid`** = `poe-` + intero progressivo a 9 cifre, assegnato **una sola volta** in `data/_uid_ledger.json`, **mai riusato né cambiato** anche se lo slug viene poi normalizzato diversamente.

**`uri`** = URI della **LiLa Lemma Bank** per il latino dove esiste un match (per lemma + PoS); testata **LSJ/Perseus** per il greco; `null` se non c'è (non blocca mai).

---

## 4. La traversata segmentata — ordine e matrice

**Ordine a 4 livelli:** ① lingua (latino → greco) · ② parte del discorso (sostantivi → aggettivi → pronomi → indeclinabili → verbi) · ③ suddivisione grammaticale · ④ alfabetico.

Ogni cella «suddivisione» è un **segmento** con un **codice stabile** (referenziabile nei prompt). Si scende dall'alto in basso.

### LATINO
| Codice | PoS · suddivisione |
|---|---|
| `LAT-N-1` … `LAT-N-5` | Sostantivi 1ª–5ª declinazione |
| `LAT-N-X` | Sostantivi indeclinabili / irregolari |
| `LAT-A-1` | Aggettivi 1ª classe (1ª-2ª decl.) |
| `LAT-A-2` | Aggettivi 2ª classe (3ª decl.) |
| `LAT-A-C` | Comparativi / superlativi |
| `LAT-A-X` | Aggettivi irregolari |
| `LAT-P-PERS/POSS/DIM/REL/INT/IND` | Pronomi: personali · possessivi · dimostrativi · relativi · interrogativi · indefiniti |
| `LAT-I-ADV/PREP/CONG/INT` | Indeclinabili: avverbi · preposizioni · congiunzioni · interiezioni |
| `LAT-V-1/2/3/3IO/4` | Verbi 1ª · 2ª · 3ª · 3ª in -io · 4ª coniugazione |
| `LAT-V-DEP/ANOM/DIF` | Verbi deponenti · anomali (sum, possum, fero, eo, volo/nolo/malo, fio) · difettivi |

### GRECO
| Codice | PoS · suddivisione |
|---|---|
| `GRC-N-1` | Sostantivi 1ª decl. (ᾱ/η) |
| `GRC-N-2` | Sostantivi 2ª decl. (tematica / contratta / attica) |
| `GRC-N-3A`…`3E` | Sostantivi 3ª decl.: muta · liquida-nasale · in -ς · in vocale ι/υ · in dittongo |
| `GRC-A-1/2/2U/CONTR/X/C` | Aggettivi: 1ª cl. (3 uscite) · 2ª cl. (3ª) · a 2 uscite · contratti · irregolari (μέγας, πολύς) · comparativi |
| `GRC-P-PERS/DIM/REL/INT/RIFL/AUT/REC` | Pronomi: personali · dimostrativi · relativi · interr.-indef. · riflessivi · αὐτός · reciproci |
| `GRC-I-ADV/PREP/CONG/PART/INT` | Indeclinabili: avverbi · preposizioni · congiunzioni · **particelle** · interiezioni |
| `GRC-V-OMEGA/CONTR/MI/DEP/ANOM` | Verbi: tematici -ω · contratti (-έω/-άω/-όω) · in -μι · deponenti · anomali — per ciascuno i 5 sistemi (pres · fut · aor · perf · aor. pass.) |

Dentro ogni segmento si procede in **lotti alfabetici** (es. `a`, `b`, …). I verbi, per mole, si spezzano sempre in lotti alfabetici piccoli.

---

## 5. Il motore filologico (fusione dei sensi)

Per ogni lemma: si elegge l'**autorità** (`L&S` per il latino, `LSJ` per il greco = l'edizione «sottomano»), si **collazionano** le altre fonti come varianti d'apparato, si raccolgono **tutti** i sensi, si **raggruppano per campo semantico** e si **ordinano per rango** (frequenza · centralità · applicazione). Ogni senso porta `tr` multilingua, `registro`, `fonti`. Un asse `applicazione` isola le rese idiomatiche/costruzioni. Le divergenze vanno in `senses_raw` + segnalate, mai appiattite.

---

## 6. Il ciclo per segmento (procedura esatta)

### S.1 — Ricerca & censimento lemmi
- **Input:** `<SEG>`.
- **Fa:** raccoglie da tutte le fonti (§9) l'elenco **esaustivo** dei lemmi del segmento; aggancia `id` (§3), `uid`, fonte, e il **marcatore** che conferma la suddivisione (es. gen. `-ae` → `LAT-N-1`; uscita `-ω` → `GRC-V-OMEGA`). Dedup per `id`, **ordina alfabeticamente**.
- **Output:** `data/<lang>/_worklist/<SEG>.json` = `[ {id, lemma, marcatore, fonti[]} ]` + conteggio + lista `ambigui[]` (collisioni/PoS incerta) da sciogliere a mano.

### S.2 — Implementazione (per lotto alfabetico)
- **Input:** `<SEG> <lettere>`.
- **Fa**, per ogni lemma della worklist in ordine: (a) **fusione filologica** dei sensi (§5) → `campi[]` con `tr` (min. en+it); (b) **morfologia**: genera la tabella completa col paradigma della suddivisione (verbi: dai `temi` l'intero sistema + participi); (c) **indice inverso**: per ogni forma generata scrive `forma → {id, parsing}`.
- **Output:** record in `unified/<lettera>.json`, tabella in `paradigms/<lettera>.json`, voci in `forms/<lettera>.json`.

### S.3 — Creazione DB + verifica (checklist di chiusura)
Scrive/consolida gli shard, aggiorna gli indici, e **valida** (tutto verde o il segmento NON si chiude):
- ☐ ① ogni record ha `id` univoco + `uid` dal ledger
- ☐ ② ogni record ha ≥1 `campo` e ≥1 senso
- ☐ ③ ogni senso ha `tr.en` **e** `tr.it`
- ☐ ④ paradigma completo e corretto per la suddivisione (verbi: sistema intero + participi)
- ☐ ⑤ `prov` con fonte + licenza su ogni record
- ☐ ⑥ nessun `…` nelle definizioni
- ☐ ⑦ **round-trip**: ogni forma generata → `forms/` → riporta all'`id` con parsing corretto
- ☐ ⑧ `_index.json`/stats aggiornati ai conteggi reali
- **Output:** report di chiusura (conteggi, conflitti, scarti). Segmento **CHIUSO**.

---

## 7. Contratto dei prompt (come mi mandi gli input)

Sintassi essenziale — deterministica, senza margine d'interpretazione:

| Comando | Significato | Cosa restituisco |
|---|---|---|
| `P0.0` | assegna ID a tutti i lemmi | `assign_ids.py`, mappa id→uid, report collisioni |
| `P0.1` | rebuild indici & stats | `rebuild_index.py`, indici allineati |
| `P0.2` | unifica core+archivio (dizionario completo) | indice unico, tutti visibili |
| `P1.1` | schema + `build_unified.py` | scaffold record unificati |
| `P1.2` | ingest fonti esterne | fonti normalizzate a formato comune |
| `S.1 <SEG>` | censimento lemmi del segmento | worklist ordinata + ambigui |
| `S.2 <SEG> <lettere>` | costruisci le schede del lotto | record + paradigmi + indice inverso |
| `S.3 <SEG>` | scrivi DB + verifica | shard + report checklist |

Esempi: `S.1 LAT-N-1` · `S.2 LAT-N-1 a` · `S.3 LAT-N-1` · `S.2 GRC-V-OMEGA λ`.

**Regole d'ingaggio (per la «perfezione»):**
- Prima di ogni esecuzione **rileggo questo file** e applico le regole d'oro (§1) e lo schema (§2).
- Se l'input contraddice il contratto o è ambiguo (segmento inesistente, lettera fuori worklist, PoS incerta), **mi fermo e lo segnalo** — non improvviso.
- Ogni esecuzione termina con il **report** (file scritti, conteggi, checklist). Un segmento è chiuso solo con S.3 verde.
- Verifica tecnica del translator/JS con `node --check` + `_build/brace_check.py` (baseline note in memoria); dati con conteggi reali + gold + round-trip.

---

## 8. Fasi d'espansione ↔ segmenti (mappa)

- **F0** (una volta): `P0.0`→`P0.1`→`P0.2`. Fondazione: identità, numeri veri, dizionario completo.
- **F1** (una volta): `P1.1`→`P1.2`. Schema + fonti pronte + worklist.
- **F2+F3** (il grosso): la **spazzata** — per ogni `<SEG>` nell'ordine §4: `S.1`→`S.2`(×lotti)→`S.3`. Ogni segmento costruisce la **scheda completa + ID + analizzatore**.
- **F4** (dopo copertura sufficiente): finestre multilingua (toggle it/en→fr/es), proattivo sempre-attivo + contesto + offline.
- **F5**: innesti (esercizi per campo, cognati, export, API) — tutti agganciati all'`id`.

---

## 9. Fonti & licenze (sintesi operativa)

**Latino:** LiLa Lemma Bank (CC BY-SA, → ID/URI) · Whitaker/open_words (MIT) · Lewis & Short (CC BY-SA, **autorità**) · UniMorph-lat (CC BY-SA) · Collatinus (GPL, reggenze) · Wiktionary IT (CC BY-SA, **it**).
**Greco:** LSJ (CC BY-SA, **autorità**) · Middle Liddell (PD) · greek-inflexion (MIT, temi/paradigmi) · Diorisis (frequenze) · Bailly (PD, fr).
**Finestre future:** Digital Gaffiot (lat-fr, PD) · Valbuena (lat-es, PD) · poi ru/zh/ja/ar da fonti open.
**Vietato:** IL / Castiglioni-Mariotti · Rocci · Montanari GI · Olivetti (copyright) · qualsiasi licenza **NC**.

---

*Poetrify · contratto di costruzione del dizionario totale · luglio 2026.*
