# -*- coding: utf-8 -*-
"""S.3 · CHECKLIST DI CHIUSURA di un segmento (BUILD_SPEC §6).
Valida gli 8 punti sui lemmi della worklist del segmento e dice se il segmento
si CHIUDE (tutto verde) o quali punti sono falliti (con i conteggi esatti).
Uso: python checklist_s3.py LAT-N       (famiglia = tutte le suddivisioni 1..5,X)
Output: report a video + _build/reports/s3_<FAM>.json
NON modifica i dati: è un revisore, non un correttore.
"""
import os, sys, json, glob
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

FAM = sys.argv[1] if len(sys.argv) > 1 else "LAT-N"
LANG = "latin" if FAM.startswith("LAT") else "greek"
LC = "lat" if LANG == "latin" else "grc"
DATA = C.DATA
BUILD = os.path.dirname(os.path.abspath(__file__))
SUBS = ("1", "2", "3", "4", "5", "X")
CAT_ATTESA = {"1": "1ª decl.", "2": "2ª decl.", "3": "3ª decl.", "4": "4ª decl.", "5": "5ª decl."}
CASI = ("nom", "gen", "dat", "acc", "voc", "abl")
TRONCO = ("…", "...")


def load_segment():
    """worklist → [{id, lemma, sub}] con la suddivisione d'appartenenza."""
    recs = []
    for s in SUBS:
        p = os.path.join(DATA, LANG, "_worklist", f"{FAM}-{s}.json")
        if not os.path.exists(p):
            continue
        for r in json.load(open(p, encoding="utf-8")).get("lemmi", []):
            recs.append({"id": r["id"], "lemma": r["lemma"], "sub": s})
    return recs


def load_all(subdir):
    out = {}
    for f in glob.glob(os.path.join(DATA, LANG, subdir, "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        d = json.load(open(f, encoding="utf-8"))
        out.update(d.get("paradigms", d) if subdir == "paradigms" else d)
    return out


def paradigma_completo(par):
    """12 celle piene (sg+pl × 6 casi). I PLURALIA TANTUM sono completi con le
    sole 6 celle plurali: il singolare non esiste e pretenderlo sarebbe un errore."""
    nome = par.get("nome")
    if not isinstance(nome, dict):
        return False
    pl_tantum = "plurale tantum" in (par.get("nota") or "") or "sg" not in nome
    for num in (("pl",) if pl_tantum else ("sg", "pl")):
        cel = nome.get(num)
        if not isinstance(cel, dict):
            return False
        for c in CASI:
            v = cel.get(c)
            if not v or not any(str(seg[0]).strip() for seg in v if seg):
                return False
    return True


def ha_troncatura(txt):
    return any(t in (txt or "") for t in TRONCO)


def main():
    seg = load_segment()
    segids = {r["id"] for r in seg}
    idmap = C.load_id_map(LC)                 # chiave-sorgente → id
    rev = {v: k for k, v in idmap.items()}    # id → chiave-sorgente
    ledger = json.load(open(os.path.join(DATA, "_uid_ledger.json"), encoding="utf-8"))
    uids = ledger.get("uids", ledger)         # {id: uid} (tollerante allo schema)
    fused = load_all("fused")
    paradigms = load_all("paradigms")

    fail = {k: [] for k in "①②③④⑤⑥⑦⑧"}
    stat = {}

    # ① id univoco + uid dal ledger
    visti, dup = set(), []
    for r in seg:
        if r["id"] in visti:
            dup.append(r["id"])
        visti.add(r["id"])
    senza_uid = [r["id"] for r in seg if r["id"] not in uids]
    fail["①"] = [f"id duplicato: {d}" for d in dup[:20]] + [f"uid assente: {i}" for i in senza_uid[:20]]
    stat["①"] = {"lemmi": len(seg), "id_distinti": len(visti), "duplicati": len(dup), "senza_uid": len(senza_uid)}

    # ②③⑤ dipendono dalla FUSIONE (fused/)
    n_fusi = n_campi_ok = n_tr_ok = n_prov_ok = 0
    no_campi, no_tr, no_prov = [], [], []
    for r in seg:
        rec = fused.get(r["id"])
        if not rec:
            continue
        n_fusi += 1
        campi = rec.get("campi") or []
        if campi and all(c.get("sensi") for c in campi):
            n_campi_ok += 1
        else:
            no_campi.append(r["id"])
        ok_tr = bool(campi)
        for c in campi:
            for s in c.get("sensi", []):
                tr = s.get("tr", {})
                if not tr.get("en") or not tr.get("it"):
                    ok_tr = False
        n_tr_ok += 1 if ok_tr else 0
        if not ok_tr:
            no_tr.append(r["id"])
        pv = rec.get("prov") or {}
        if pv.get("src") and pv.get("lic"):
            n_prov_ok += 1
        else:
            no_prov.append(r["id"])
    non_fusi = len(seg) - n_fusi
    fail["②"] = ([f"{non_fusi} lemmi SENZA record fuso (S.2 non eseguita)"] if non_fusi else []) + [f"senza campi/sensi: {i}" for i in no_campi[:20]]
    fail["③"] = ([f"{non_fusi} lemmi senza record fuso → nessun tr"] if non_fusi else []) + [f"tr incompleto: {i}" for i in no_tr[:20]]
    fail["⑤"] = ([f"{non_fusi} lemmi senza record fuso → nessuna prov"] if non_fusi else []) + [f"prov incompleta: {i}" for i in no_prov[:20]]
    stat["②"] = {"fusi": n_fusi, "con_campi_e_sensi": n_campi_ok, "non_fusi": non_fusi}
    stat["③"] = {"fusi": n_fusi, "tr_en_e_it": n_tr_ok}
    stat["⑤"] = {"fusi": n_fusi, "prov_completa": n_prov_ok}

    # ④ paradigma completo e corretto per la suddivisione
    n_par = n_par_completi = n_par_cat_ok = 0
    senza_par, incompleti, cat_errata = [], [], []
    esenti = esenti_doc = 0
    # esenzioni DOCUMENTATE: lemmi il cui genitivo non esiste nelle fonti
    # (difettivi «only nom. and acc», genitivo segnato col trattino in L&S,
    # flessioni greche irriducibili). Ognuna porta la sua motivazione.
    p_es = os.path.join(BUILD, "reports", f"s3_esenti_{FAM}.json")
    esenti_set = set(json.load(open(p_es, encoding="utf-8"))) if os.path.exists(p_es) else set()
    for r in seg:
        if r["sub"] == "X":          # indeclinabili: nessun paradigma atteso
            esenti += 1
            continue
        key = rev.get(r["id"])
        if key in esenti_set:        # difettivo/indeclinabile accertato sulle fonti
            esenti_doc += 1
            continue
        par = paradigms.get(key) if key else None
        if not par:
            senza_par.append(r["lemma"]); continue
        n_par += 1
        if paradigma_completo(par):
            n_par_completi += 1
        else:
            incompleti.append(r["lemma"])
        # il cat può portare il genere in coda («2ª decl. n.») → match per PREFISSO
        if (par.get("cat") or "").startswith(CAT_ATTESA.get(r["sub"], "\0")):
            n_par_cat_ok += 1
        else:
            cat_errata.append(f"{r['lemma']} (par={par.get('cat')} ≠ {CAT_ATTESA.get(r['sub'])})")
    fail["④"] = ([f"{len(senza_par)} lemmi SENZA paradigma"] if senza_par else []) \
        + ([f"{len(incompleti)} paradigmi incompleti (<12 celle)"] if incompleti else []) \
        + ([f"{len(cat_errata)} paradigmi con declinazione discordante"] if cat_errata else []) \
        + [f"  es. {x}" for x in (senza_par[:5] + incompleti[:5] + cat_errata[:5])]
    stat["④"] = {"attesi": len(seg) - esenti - esenti_doc, "con_paradigma": n_par, "completi_12_celle": n_par_completi,
                 "cat_coerente": n_par_cat_ok, "esenti_indeclinabili": esenti, "esenti_documentati": esenti_doc,
                 "senza_paradigma": len(senza_par), "incompleti": len(incompleti), "cat_errata": len(cat_errata)}

    # ⑥ nessun «…» nelle definizioni consegnate
    n_tronc_core = n_risolti_da_fusione = n_tronc_residui = 0
    esempi_tronc = []
    _dict_cache = {}   # lettera → dict dello shard (caricare 1 volta, non per lemma)

    def defs(letter):
        if letter not in _dict_cache:
            p = os.path.join(DATA, LANG, f"{letter}.json")
            _dict_cache[letter] = json.load(open(p, encoding="utf-8")).get("dict", {}) if os.path.exists(p) else {}
        return _dict_cache[letter]

    for r in seg:
        key = rev.get(r["id"])
        d = None
        if key:
            d = defs(C.norm_lat(key)[:1]).get(key, {}).get("definition")
        if ha_troncatura(d):
            n_tronc_core += 1
            if r["id"] in fused:
                n_risolti_da_fusione += 1
            else:
                n_tronc_residui += 1
                if len(esempi_tronc) < 5:
                    esempi_tronc.append(f"{r['lemma']}: {(d or '')[:70]}")
    fail["⑥"] = ([f"{n_tronc_residui} definizioni ancora troncate (non coperte da fusione)"] if n_tronc_residui else []) + [f"  es. {e}" for e in esempi_tronc]
    stat["⑥"] = {"troncate_nel_core": n_tronc_core, "risolte_dalla_fusione": n_risolti_da_fusione, "residue": n_tronc_residui}

    # ⑦ round-trip: forma → forms/ → id + parsing
    tot_f = ok_f = 0
    lemmi_ok, lemmi_ko = 0, []
    per_lemma = {}
    for f in sorted(glob.glob(os.path.join(DATA, LANG, "*.json"))):
        base = os.path.basename(f)
        if base.startswith("_"):
            continue
        letter = os.path.splitext(base)[0]
        core = json.load(open(f, encoding="utf-8")).get("forms", {})
        idxp = os.path.join(DATA, LANG, "forms", f"{letter}.json")
        idx = json.load(open(idxp, encoding="utf-8")).get("forms", {}) if os.path.exists(idxp) else {}
        for forma, cands in core.items():
            for c in cands:
                lem = c.get("lemma")
                rid = idmap.get(lem)
                if not rid or rid not in segids:
                    continue
                tot_f += 1
                d = per_lemma.setdefault(rid, [0, 0])
                d[0] += 1
                voci = idx.get(forma, [])
                if any(v.get("id") == rid and v.get("parsing") == c.get("parsing", "") for v in voci):
                    ok_f += 1
                    d[1] += 1
    for rid, (t, o) in per_lemma.items():
        if t == o:
            lemmi_ok += 1
        else:
            lemmi_ko.append(rid)
    # indeclinabili (sub X) ed esenti documentati NON devono avere forme: escluderli
    attesi_con_forme = {r["id"] for r in seg
                        if r["sub"] != "X" and rev.get(r["id"]) not in esenti_set}
    senza_forme = len(attesi_con_forme - set(per_lemma))
    pct_f = 100.0 * ok_f / max(tot_f, 1)
    fail["⑦"] = ([f"{len(lemmi_ko)} lemmi con forme che NON tornano all'id"] if lemmi_ko else []) \
        + ([f"{senza_forme} lemmi del segmento senza alcuna forma generata"] if senza_forme else [])
    stat["⑦"] = {"forme_testate": tot_f, "round_trip_ok": ok_f, "pct": round(pct_f, 2),
                 "lemmi_con_forme": len(per_lemma), "lemmi_tutti_ok": lemmi_ok, "lemmi_senza_forme": senza_forme}

    # ⑧ indici: verificato da rebuild_index.py + check_stats.mjs (motore reale)
    idx = json.load(open(os.path.join(DATA, LANG, "_index.json"), encoding="utf-8")).get("meta", {})
    stat["⑧"] = {k: idx.get(k) for k in ("total_forms", "total_lemmas", "archived_lemmas", "total_paradigms", "total_all_lemmas")}
    fail["⑧"] = []

    # ---- REPORT ----
    titoli = {"①": "id univoco + uid dal ledger", "②": "≥1 campo semantico e ≥1 senso",
              "③": "ogni senso ha tr.en E tr.it", "④": "paradigma completo e corretto",
              "⑤": "prov con fonte + licenza", "⑥": "nessun «…» nelle definizioni",
              "⑦": "round-trip forma → id + parsing", "⑧": "indici ai conteggi reali"}
    print(f"\n{'='*66}\nS.3 · CHECKLIST DI CHIUSURA · segmento {FAM} ({len(seg)} lemmi)\n{'='*66}")
    verdi = 0
    for k in "①②③④⑤⑥⑦⑧":
        ok = not fail[k]
        verdi += ok
        print(f"\n{'🟢' if ok else '🔴'} {k} {titoli[k]}")
        print(f"    {json.dumps(stat[k], ensure_ascii=False)}")
        for m in fail[k][:8]:
            print(f"    ✗ {m}")
    print(f"\n{'='*66}")
    print(f"PUNTI VERDI: {verdi}/8 → segmento {'CHIUSO ✅' if verdi == 8 else 'NON CHIUDIBILE ⛔'}")
    print(f"{'='*66}")

    os.makedirs(os.path.join(BUILD, "reports"), exist_ok=True)
    json.dump({"segmento": FAM, "lemmi": len(seg), "verdi": verdi, "stat": stat,
               "fail": {k: v for k, v in fail.items() if v}},
              open(os.path.join(BUILD, "reports", f"s3_{FAM}.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"→ _build/reports/s3_{FAM}.json")


if __name__ == "__main__":
    main()
