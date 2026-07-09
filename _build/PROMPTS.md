# Poetrify · Dizionario totale — LIBRERIA DEI PROMPT

> Prompt pronti da incollare, uno per passaggio. Tutti si appoggiano al contratto `_build/BUILD_SPEC.md` (regole d'oro, schema, ID, matrice segmenti, checklist).
>
> **Come si usa:** incolla i prompt **nell'ordine**. Nei prompt di segmento sostituisci `<SEG>` con un codice della matrice (BUILD_SPEC §4, es. `LAT-N-1`) e `<lettere>` con una lettera o un piccolo gruppo (es. `a` o `a-b`). Ogni esecuzione finisce con un report.
>
> **Sequenza generale:** `P0.0 → P0.1 → P0.2 → P1.1 → P1.2` → poi, per ogni segmento nell'ordine della matrice: `S.1 <SEG>` → `S.2 <SEG> <lettere>` (ripeti per tutte le lettere) → `S.3 <SEG>` → passa al segmento dopo → infine `F4.1 → F4.2 → F5.1`.

---

## A · Fondazione (una volta sola, in quest'ordine)

### P0.0 — Assegna un ID a ogni lemma
```
Esegui P0.0 secondo _build/BUILD_SPEC.md.
Scrivi _build/assign_ids.py che: (1) percorre TUTTI i lemmi latini e greci, core + archivio, in ogni shard; (2) assegna a ciascuno l'id canonico secondo le regole §3 (chiave lat:/grc: con normalizzazione, disambiguazione omografi #pos oppure #1/#2), l'uid permanente da data/_uid_ledger.json (creandolo se assente, append-only, mai riusare), e l'uri (LiLa per il latino dove combacia lemma+PoS, testata LSJ/Perseus per il greco, altrimenti null); (3) NON fonde mai lemmi che collidono: li elenca in _build/reports/id_collisions.json per disambiguazione manuale; (4) produce data/_id_map.lat.json e data/_id_map.grc.json = { chiave_originale: id }.
Verifica: nessun id duplicato (salvo collisioni segnalate), ledger coerente, conteggi = audit. Chiudi con report: conteggi lat/grc, n. collisioni, n. uri agganciati.
```

### P0.1 — Rebuild indici & stats
```
Esegui P0.1 secondo _build/BUILD_SPEC.md.
Scrivi _build/rebuild_index.py che ricalcola _index.json (per lat e grc: lemmi core, forme, form-entries, archivio, paradigmi, glosse) dai conteggi REALI contati sugli shard, e rigenera i numeri nei README dei dati. Aggiungi un controllo che LexiconEngine.stats() combaci coi conteggi reali. Non modificare i dati, solo gli indici. Report: tabella prima/dopo dei conteggi.
```

### P0.2 — Un solo dizionario completo (via i livelli)
```
Esegui P0.2 secondo _build/BUILD_SPEC.md.
Dissolvi la separazione core/archivio: fa' sì che TUTTI i lemmi (inclusi i ~110k greci in archive/) siano presenti e consultabili in un unico indice completo, con la frequenza come solo criterio d'ordinamento, mai di esclusione. Aggiorna LexiconEngine e la ricerca del dizionario perché non nascondano nulla per livello. Verifica: un lemma prima archiviato è ora trovato dalla ricerca normale. Report: conteggi unificati.
```

### P1.1 — Schema + builder unificato
```
Esegui P1.1 secondo _build/BUILD_SPEC.md.
Implementa lo schema della scheda-lemma (§2) e scrivi _build/build_unified.py che assembla, per ogni id, un record unificato in data/<lang>/unified/<lettera>.json a partire dagli alberi esistenti (core dict+forms, paradigms/, glosses_it/, archive/). senses_raw = definizioni integrali per-fonte, SENZA troncamenti. Testa su amor, virtus, λόγος, λύω e mostrami i 4 record. Report: campi coperti/mancanti per PoS.
```

### P1.2 — Ingest delle fonti esterne
```
Esegui P1.2 secondo _build/BUILD_SPEC.md.
Per ciascuna fonte di §9 scrivi _build/sources/<fonte>.py che scarica/parsa e normalizza a un formato comune { id?, lemma, pos, tr:{en,it,fr,...}, senses[], lic }, agganciando gli id via _id_map/LiLa/testate. Parti dalle fonti già presenti (Lewis, LSJ) e da Whitaker/open_words. Report: per fonte n. lemmi normalizzati, licenza, % agganciati a un id.
```

---

## B · Ciclo per segmento (si ripete per ogni segmento)

### S.1 — Ricerca & censimento lemmi
```
Esegui S.1 <SEG> secondo _build/BUILD_SPEC.md (§6).
Raccogli da tutte le fonti (§9) l'elenco ESAUSTIVO dei lemmi del segmento <SEG>; per ciascuno aggancia id+uid, la/e fonte/i e il marcatore morfologico che conferma la suddivisione (es. gen. -ae → LAT-N-1; uscita -ω → GRC-V-OMEGA). Dedup per id, ordina alfabeticamente, salva data/<lang>/_worklist/<SEG>.json ed elenca gli ambigui (collisioni / PoS incerta) da sciogliere. Report: n. lemmi, distribuzione per lettera, n. ambigui.
```

### S.2 — Implementazione (per lotto alfabetico)
```
Esegui S.2 <SEG> <lettere> secondo _build/BUILD_SPEC.md (§5 e §6).
Per ogni lemma della worklist <SEG> nelle lettere <lettere>, in ordine alfabetico:
(a) FUSIONE FILOLOGICA dei sensi: eleggi l'autorità (L&S per il latino, LSJ per il greco), collaziona le altre fonti come varianti, raccogli TUTTI i sensi senza scartarne nessuno, raggruppali per campo semantico e ordinali per rango; ogni senso con tr (almeno en+it), registro e fonti; isola l'asse "applicazione"; conserva senses_raw; segnala le divergenze.
(b) MORFOLOGIA: genera la tabella completa col paradigma della suddivisione (sostantivi/aggettivi/pronomi: tutti i casi; verbi: dai temi l'INTERO sistema — ind/cong/opt/imv/inf/ptc × diatesi — più i participi declinati).
(c) INDICE INVERSO: per ogni forma generata scrivi forma→{id,parsing} in data/<lang>/forms/<lettera>.json.
Scrivi i record in unified/ e i paradigmi in paradigms/. Report: n. schede prodotte, conflitti, forme indicizzate.
```

### S.3 — Creazione DB + verifica (chiusura del segmento)
```
Esegui S.3 <SEG> secondo _build/BUILD_SPEC.md (§6).
Consolida gli shard del segmento <SEG>, aggiorna _index.json/stats, e valida la CHECKLIST a 8 punti: ① id univoco + uid dal ledger; ② ≥1 campo semantico e ≥1 senso; ③ ogni senso ha tr.en E tr.it; ④ paradigma completo e corretto per la suddivisione (verbi: sistema intero + participi); ⑤ prov con fonte+licenza; ⑥ nessun «…» nelle definizioni; ⑦ round-trip: ogni forma generata → forms/ → riconduce all'id con parsing corretto; ⑧ indici aggiornati ai conteggi reali. Se tutto verde chiudi il segmento; altrimenti elenca i punti falliti e correggili. Report: checklist punto per punto + conteggi finali.
```

**Esempio d'istanza (primo segmento reale):**
`S.1 LAT-N-1` → `S.2 LAT-N-1 a` → `S.2 LAT-N-1 b` → … → `S.3 LAT-N-1`

---

## C · Ordine dei segmenti (la matrice da percorrere)

Latino, poi greco. Dentro ogni lingua, in quest'ordine (BUILD_SPEC §4):

**LATINO:** `LAT-N-1` `LAT-N-2` `LAT-N-3` `LAT-N-4` `LAT-N-5` `LAT-N-X` · `LAT-A-1` `LAT-A-2` `LAT-A-C` `LAT-A-X` · `LAT-P-PERS` `LAT-P-POSS` `LAT-P-DIM` `LAT-P-REL` `LAT-P-INT` `LAT-P-IND` · `LAT-I-ADV` `LAT-I-PREP` `LAT-I-CONG` `LAT-I-INT` · `LAT-V-1` `LAT-V-2` `LAT-V-3` `LAT-V-3IO` `LAT-V-4` `LAT-V-DEP` `LAT-V-ANOM` `LAT-V-DIF`

**GRECO:** `GRC-N-1` `GRC-N-2` `GRC-N-3A` `GRC-N-3B` `GRC-N-3C` `GRC-N-3D` `GRC-N-3E` · `GRC-A-1` `GRC-A-2` `GRC-A-2U` `GRC-A-CONTR` `GRC-A-X` `GRC-A-C` · `GRC-P-PERS` `GRC-P-DIM` `GRC-P-REL` `GRC-P-INT` `GRC-P-RIFL` `GRC-P-AUT` `GRC-P-REC` · `GRC-I-ADV` `GRC-I-PREP` `GRC-I-CONG` `GRC-I-PART` `GRC-I-INT` · `GRC-V-OMEGA` `GRC-V-CONTR` `GRC-V-MI` `GRC-V-DEP` `GRC-V-ANOM`

Per ogni codice: `S.1` una volta → `S.2` per tutte le lettere → `S.3` per chiudere.

---

## D · Fasi finali (dopo copertura sufficiente)

### F4.1 — Finestre linguistiche
```
Esegui F4.1 secondo _build/BUILD_SPEC.md.
Aggiungi a dictionary.html e al translator un toggle lingua-INTERFACCIA (it⇄en) separato dalla lingua-oggetto (lat/gr), persistito; glosse e stringhe UI leggono tr[lingua] con fallback incrociato; predisponi l'architettura ad aggiungere fr ed es (da Digital Gaffiot / Valbuena) senza toccare gli id. Verifica nel dizionario che il toggle cambi la lingua delle glosse. Report: stringhe i18n coperte.
```

### F4.2 — Proattivo sempre-attivo
```
Esegui F4.2 secondo _build/BUILD_SPEC.md.
Rendi il glossario proattivo del brano sempre attivo (pre-warm), con evidenza di rari/hapax e copertura live; aggiungi la disambiguazione del lemma e del campo semantico guidata dal contesto della frase; hint di reggenza/tema in linea; bundle offline del nucleo per far funzionare tutto anche su file://. Report: copertura media, casi ambigui risolti dal contesto.
```

### F5.1 — Innesti
```
Esegui F5.1 secondo _build/BUILD_SPEC.md.
Sull'ID stabile costruisci: esercizi per campo semantico, cognati lat-gr e famiglie etimologiche, export (Anki, PDF vocabolario per brano) e un'API interna per id, riusabile da translator e dizionario. Report: cosa esposto e come.
```

---

*Poetrify · libreria dei prompt · da usare con _build/BUILD_SPEC.md · luglio 2026.*
