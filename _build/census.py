# -*- coding: utf-8 -*-
"""S.1 · Censimento lemmi per segmento (BUILD_SPEC §6). Qui: SOSTANTIVI LATINI
per declinazione → LAT-N-1..5 + LAT-N-X (indeclinabili/irregolari).

Per ogni nome (pos=sostantivo nel dict): id+uid, marcatore morfologico e fonti,
classificando la declinazione con segnale PRIMARIO = il nostro paradigma (cat
«Nª decl.»), SECONDARIO = Whitaker n[0] (per i nomi senza paradigma). Conflitti
e nomi senza segnale → ambigui. Dedup per id, ordine alfabetico.
Output: data/latin/_worklist/LAT-N-{1..5,X}.json + LAT-N-_ambigui.json.
"""
import os, sys, json, glob, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

DATA = C.DATA
WL = os.path.join(DATA, "latin", "_worklist")
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources", "cache", "whitaker_data.json")
GEN = {1: "-ae", 2: "-i", 3: "-is", 4: "-us", 5: "-ei"}
SEGMAP = {1: "LAT-N-1", 2: "LAT-N-2", 3: "LAT-N-3", 4: "LAT-N-4", 5: "LAT-N-5", "X": "LAT-N-X"}
_DECL = re.compile(r"([1-5])ª\s*decl")


def load_pos():
    posof = {}
    for f in glob.glob(os.path.join(DATA, "latin", "*.json")) + glob.glob(os.path.join(DATA, "latin", "archive", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for k, e in json.load(open(f, encoding="utf-8")).get("dict", {}).items():
            posof.setdefault(k, e.get("pos", ""))
    return posof


def load_cat():
    cat = {}
    for f in glob.glob(os.path.join(DATA, "latin", "paradigms", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for k, p in json.load(open(f, encoding="utf-8")).get("paradigms", {}).items():
            cat.setdefault(k, p.get("cat"))
    return cat


def whitaker_candidates(e):
    parts = [p.strip() for p in (e.get("parts") or []) if p and p.strip()]
    orth = (e.get("orth") or (parts[0] if parts else "")).strip()
    n = e.get("n") or []
    decl = n[0] if n and isinstance(n[0], int) else None
    st = parts[0] if parts else orth
    cands = set(parts) | {orth}
    cands |= {1: {st + "a", st + "ae"}, 2: {st + "us", st + "um", st + "er", st + "ius"},
              4: {st + "us", st + "u"}, 5: {st + "es"}}.get(decl, set())
    return cands


def whitaker_noun_signals(idx):
    """Ritorna (id→n0 per i nomi, attested_ids, empty_pos_noun{id→n0})."""
    data = json.load(open(CACHE, encoding="utf-8"))
    id_n0, attested, empty_noun = {}, set(), {}
    for e in data:
        if e.get("pos") != "N":
            # per 'attested' teniamo comunque conto di ogni aggancio same-pos
            pass
        wpos = C.POS_MAP_WHITAKER.get(e.get("pos"), "")
        rid = rid_empty = None
        for cand in sorted(whitaker_candidates(e)):   # sorted → deterministico (i set hanno ordine casuale)
            for i, p in idx.get(C.norm_lat(C.base_lat(cand)), []):
                if p == wpos and rid is None:
                    rid = i
                if p == "" and rid_empty is None:
                    rid_empty = i
            if rid:
                break
        if rid:
            attested.add(rid)
        if e.get("pos") == "N":
            n = e.get("n") or []
            n0 = n[0] if n else None
            if rid and rid not in id_n0:
                id_n0[rid] = n0
            if not rid and rid_empty and rid_empty not in empty_noun:
                empty_noun[rid_empty] = n0
    return id_n0, attested, empty_noun


def main():
    posof = load_pos()
    cat = load_cat()
    idmap = C.load_id_map("lat")
    ledger = json.load(open(os.path.join(DATA, "_uid_ledger.json"), encoding="utf-8"))
    idx = C.build_lemma_pos_index("lat")
    id_n0, attested, empty_noun = whitaker_noun_signals(idx)

    segments = {k: [] for k in SEGMAP}
    ambigui = []
    by_signal = collections.Counter()

    for key, pos in posof.items():
        if pos != "sostantivo":
            continue
        rid = idmap.get(key)
        if not rid:
            continue
        entry_base = {"id": rid, "lemma": C.base_lat(key), "uid": ledger.get(rid),
                      "fonti": ["lewis"] + (["whitaker"] if rid in attested else [])}
        dcat = None
        m = _DECL.search(cat.get(key) or "")
        if m:
            dcat = int(m.group(1))
        wn0 = id_n0.get(rid)

        if dcat:
            decl, segno = dcat, "paradigma"
            if wn0 in (1, 2, 3, 4, 5) and wn0 != dcat:
                ambigui.append({**entry_base, "cat": "conflitto",
                                "motivo": f"conflitto declinazione: paradigma {dcat}ª vs Whitaker {wn0}ª",
                                "risolto_come": f"LAT-N-{dcat}"})
        elif wn0 in (1, 2, 3, 4, 5):
            decl, segno = wn0, "whitaker"
        elif wn0 == 9:
            decl, segno = "X", "whitaker(indecl.)"
        else:
            ambigui.append({**entry_base, "cat": "no-declinazione",
                            "motivo": "nessun segnale di declinazione (né paradigma né Whitaker)"})
            by_signal["ambiguo"] += 1
            continue

        by_signal[segno] += 1
        entry = {**entry_base, "marcatore": (f"gen. {GEN[decl]}" if decl in GEN else "indeclinabile/irregolare"),
                 "segno": segno}
        segments[decl].append(entry)

    # nomi «nascosti»: pos vuota da noi ma Whitaker=N → in ambigui (pos incerta)
    for rid, n0 in empty_noun.items():
        ambigui.append({"id": rid, "uid": ledger.get(rid), "fonti": ["lewis", "whitaker"], "cat": "pos-incerta",
                        "motivo": f"PoS incerta: nel nostro dato vuota, Whitaker=Nome (decl {n0}) — candidato al segmento nomi"})

    # scrittura worklist (ordine alfabetico normalizzato)
    os.makedirs(WL, exist_ok=True)
    for d, seg in SEGMAP.items():
        lst = sorted(segments[d], key=lambda r: (C.norm_lat(r["lemma"]), r["id"]))
        json.dump({"segment": seg, "count": len(lst), "lemmi": lst},
                  open(os.path.join(WL, f"{seg}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    amb = sorted(ambigui, key=lambda r: (C.norm_lat(r.get("lemma", r["id"])), r["id"]))
    json.dump({"count": len(amb), "ambigui": amb},
              open(os.path.join(WL, "LAT-N-_ambigui.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)

    # ---- report ----
    print("S.1 · LAT-N-1..5 + X — censimento sostantivi latini\n")
    tot = sum(len(segments[d]) for d in SEGMAP)
    print("  per segmento:")
    for d, seg in SEGMAP.items():
        print(f"    {seg:<9} {len(segments[d]):>6}  (marcatore {('gen. '+GEN[d]) if d in GEN else 'indecl./irreg.'})")
    print(f"    {'TOTALE':<9} {tot:>6}   classificati")
    print(f"\n  segnale usato: {dict(by_signal)}")
    ambcat = collections.Counter(a.get("cat", "?") for a in amb)
    print(f"  ambigui: {len(amb)}  → LAT-N-_ambigui.json   {dict(ambcat)}")
    print("     · no-declinazione = nome nostro senza segnale (da declinare a mano)")
    print("     · pos-incerta     = lemma con PoS vuota da noi ma Nome per Whitaker (da confermare)")
    print("     · conflitto       = paradigma vs Whitaker discordi (già assegnato al paradigma)")
    # distribuzione per lettera (di tutti i nomi classificati)
    perletter = collections.Counter()
    for d in SEGMAP:
        for r in segments[d]:
            perletter[C.norm_lat(r["lemma"])[:1]] += 1
    print("\n  distribuzione per lettera:")
    line = "    " + "  ".join(f"{ltr}:{perletter[ltr]}" for ltr in sorted(perletter))
    print(line)


if __name__ == "__main__":
    main()
