# `poetrify/data/` · Corpora lessicali shardati per lettera

Questa cartella contiene i dati lessicali e morfologici di **latino** e
**greco antico** caricati on-demand dalla SPA. La strategia di archiviazione
è **shard per prima lettera** (NFD + strip diacritici + lowercase), così che
il browser fetchi solo il file relativo alla parola cercata, mantenendo
basso il time-to-first-result e l'occupazione di memoria.

## Layout

```
data/
├─ latin/
│  ├─ _index.json          ← elenco delle lettere disponibili + totali
│  ├─ a.json · 1.5 MB  · 28 k forme · nucleo scolastico
│  ├─ b.json · 189 KB  ·  3 k forme · nucleo scolastico
│  ├─ c.json · 1.9 MB  · 33 k forme · nucleo scolastico
│  ├─ …
│  ├─ z.json
│  └─ archive/            ← voci epigrafiche/testimonia archiviate (NON cancellate)
│     ├─ a.json · {dict} solo (niente forms)
│     └─ …
└─ greek/
   ├─ _index.json
   ├─ α.json · 2.3 MB  ·  2 k forme · nucleo scolastico
   ├─ β.json · 263 KB
   ├─ γ.json · 190 KB
   ├─ …
   ├─ ω.json
   ├─ ϝ.json              ← digamma (lemmi rari arcaici)
   └─ archive/            ← voci epigrafiche/testimonia archiviate
      ├─ α.json
      └─ …
```

**Totale (nucleo scolastico, dopo la semplificazione)**: 23 shard latini
(270k forme intatte · **11.746 lemmi** nel nucleo) + 25 shard greci (13k
forme intatte · **10.500 lemmi** nel nucleo). Le forme flesse non sono mai
toccate: la morfologia del translator resta completa. I lemmi archiviati
(5.836 latini + 124.680 greci) vivono in `archive/<lettera>.json` e restano
consultabili (vedi *Semplificazione scolastica & archivio* più sotto).

## Schema di ciascun file `<lettera>.json`

```json
{
  "meta": {
    "lang": "latino|greco",
    "letter": "a",
    "forms_count": 28361,
    "lemmas_count": 1668
  },
  "forms": {
    "fecerunt": [{ "lemma": "facio", "parsing": "" }],
    "ἔβην":     [{ "lemma": "βαίνω", "parsing": "aor. att. ind. 1S" }]
  },
  "dict": {
    "facio":  { "pos": "verbo",       "definition": "faciō fēcī, factus, ere…" },
    "βαίνω":  { "pos": "verbo",       "definition": "walk, step, take steps…" }
  }
}
```

Ogni shard contiene **sia** `forms` (forma flessa → lemma) **sia** `dict`
(lemma → POS + definizione) per le entrate che cominciano con quella lettera.
Quando una forma rimanda a un lemma che inizia con un'altra lettera (es.
`ἔβην` → `βαίνω`, ε→β), il `LexiconEngine` fetcha *anche* lo shard del lemma
con un secondo round trip e mantiene entrambi in cache.

## File `_index.json`

```json
{
  "meta": { "lang": "latino", "shard_count": 23,
            "total_forms": 270227, "total_lemmas": 11746,
            "archived_lemmas": 5836, "scholastic": true },
  "letters": ["a","b","c","d","e","f","g","h","i","k","l","m","n",
              "o","p","q","r","s","t","u","v","x","z"],
  "archive_letters": ["a","b","c","d","e","f","g","h","i","l","m","n",
                      "o","p","q","r","s","t","u","v","x"]
}
```

Il `LexiconEngine` carica solo questo file al `loadLanguageData(lang)`
iniziale; gli shard veri restano lazy. `archive_letters` elenca le lettere
per cui esiste uno shard di archivio (fallback caricato solo se serve).

## Semplificazione scolastica & archivio

Poiché il dizionario ha una funzione **prettamente scolastica e pratica**, i
corpora integrali (Lewis 17.5k · LSJ9 135k) sono stati ridotti a un **nucleo
di ~10k lemmi per lingua**. Le voci **epigrafiche / papirologiche** (IG, SEG,
P.Oxy, PSI, BGU…) e le **testimonianze troppo specifiche** (glossografi,
nomi propri, sotto-voci composte, voci sovraccariche di citazioni) — ridondanti
per la didattica — sono **archiviate, non cancellate**.

Lo script `_build/prune.py` (Python; `--dry-run` per i soli conteggi):

- **Latino** (Lewis, già scolastico): tiene tutti i lemmi *attestati* (con
  forme flesse nel corpus) + l'alta frequenza + le parole-funzione.
- **Greco** (LSJ9 integrale): tiene il top ~10.500 per punteggio scolastico
  (frequenza + forme attestate, penalizzando marcatori epigrafici/testimonia,
  nomi propri, voci ipertrofiche), più le ancore obbligatorie.

Per ogni lingua lo script:
1. fa un **backup** dei `dict` originali in `_build/backup/<lang>/<lettera>.json`;
2. riscrive ogni shard principale con `dict` = solo nucleo (le `forms` restano
   **intatte**) e aggiorna `meta.lemmas_count` / `meta.archived_count`;
3. scrive le voci rimosse in `data/<lang>/archive/<lettera>.json`
   (`{meta, dict}`, senza `forms`);
4. aggiorna `_index.json` (`total_lemmas`, `archived_lemmas`, `scholastic`,
   `archive_letters`).

Schema di `archive/<lettera>.json`:

```json
{
  "meta": { "lang": "greco", "letter": "δ", "archived_count": 9876 },
  "dict": { "δέλφος": { "pos": "sostantivo", "definition": "…IG…" } }
}
```

**Fallback in lettura**: se un lookup diretto non trova il lemma nel nucleo,
il `LexiconEngine` carica al volo lo shard di archivio della lettera e, se lo
trova lì, restituisce l'entrata con `source: 'archived'` e `archived: true`.
Così nulla è perso: una parola archiviata resta cercabile, solo segnalata come
fuori dal nucleo scolastico. L'operazione è completamente reversibile (backup +
archivio).

## Fonti dei dati

- **Latino · forme flesse**: [`cltk/latin_pos_lemmata_cltk`](https://github.com/cltk/latin_pos_lemmata_cltk) ·
  `latin_lemmata_cltk.py` — 270.227 forme → 34.359 lemmi (MIT)
- **Latino · dizionario**: [`cltk/cltk_lat_lewis_elementary_lexicon`](https://github.com/cltk/cltk_lat_lewis_elementary_lexicon) ·
  `lewis.yaml` — 17.582 lemmi (Charlton T. Lewis, 1890 · pubblico dominio)
- **Greco · forme flesse**: [`jtauber/greek-inflexion`](https://github.com/jtauber/greek-inflexion) ·
  `homer-data/verbs.tsv` — 13.267 forme con parsing morfologico MorphGNT (MIT)
- **Greco · dizionario**: [`ciscoriordan/lsj9`](https://github.com/ciscoriordan/lsj9) ·
  `lsj9_short_defs.json` + `lsj9_headword_pos.json` + `lsj9_glosses_flat.json`
  — 135.180 lemmi (LSJ 9ª ed., Liddell-Scott-Jones, pubblico dominio)

## Riproducibilità della build

Il file `_build/split_lemmata.js` (script Node.js ≥ 14) effettua lo split:

```bash
cd poetrify/_build
node split_lemmata.js
```

(Su sistemi senza Node è disponibile l'equivalente Python `_build/run_split.py`.)

Lo script:
1. Legge i 4 file sorgente in `_build/` (devono essere scaricati con `curl`,
   vedi sezione "Fonti" sopra)
2. Costruisce dizionari `latin_dict[lemma] = {pos, definition}` e
   `greek_dict[lemma] = {pos, definition}` con inferenza PoS euristica
3. Distribuisce forme e dict per prima lettera normalizzata
4. Scrive `data/{latin,greek}/<letter>.json` + `_index.json`

## Uso runtime

```js
import { LexiconEngine } from './modules/engine/lexicon-engine.js';
const lex = new LexiconEngine();

await lex.loadLanguageData('latino');     // carica solo _index.json
const hit = await lex.lookUpWord('fecerunt', 'latino');
// Internamente:
//   1. norm = 'fecerunt' → prima lettera 'f'
//   2. fetcha data/latin/f.json (cache miss) → forms['fecerunt']
//   3. lemma = 'facio' → prima lettera 'f' (stesso shard, niente 2° fetch)
//   4. dict['facio'] → pos + definition
//
// → { word: 'fecerunt', lemma: 'facio', parsing: '',
//     pos: 'verbo', definition: 'faciō fēcī…',
//     source: 'lemmata+dict', shards: ['f'] }
```

Tutti gli shard fetchati restano in cache (Map per lingua) per la durata
della sessione; ricerche successive sulla stessa lettera sono O(1) in
memoria.
