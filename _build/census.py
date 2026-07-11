# -*- coding: utf-8 -*-
"""S.1 · Censimento lemmi per segmento (BUILD_SPEC §6). Qui: SOSTANTIVI LATINI
per declinazione → LAT-N-1..5 + LAT-N-X (indeclinabili/irregolari).

Segnali di declinazione, in ordine di autorità:
  1) GENITIVO da L&S (la nostra AUTORITÀ): la definizione inizia con
     «lemma <gen>, <genere> …» → il gen (sing. -ae/-i/-is/-us/-ei o
     plur. -arum/-orum/-ium/-uum/-erum per i plurale tantum) dà la declinazione;
  2) il nostro PARADIGMA (cat «Nª decl.»);
  3) Whitaker n[0] (9 = indeclinabile → X).
Concordanza ≥2 segnali = alta confidenza; conflitto → decide L&S; nessun
segnale → ambiguo. I lemmi con PoS vuota da noi ma con pattern-nome L&S (o
Whitaker=Nome) vengono recuperati come nomi (PoS inferita). Deterministico.
Output: data/latin/_worklist/LAT-N-{1..5,X}.json + LAT-N-_ambigui.json.
"""
import os, sys, json, glob, re, collections, unicodedata
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

DATA = C.DATA
WL = os.path.join(DATA, "latin", "_worklist")
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources", "cache", "whitaker_data.json")
GEN = {1: "-ae", 2: "-i", 3: "-is", 4: "-us", 5: "-ei"}
SEGMAP = {1: "LAT-N-1", 2: "LAT-N-2", 3: "LAT-N-3", 4: "LAT-N-4", 5: "LAT-N-5", "X": "LAT-N-X"}
_DECL = re.compile(r"([1-5])ª\s*decl")
_GENDER = re.compile(r",\s*([mfn])\b")
_strip = lambda s: "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")
# uscite del genitivo (plurali PRIMA dei singolari per non confondere -orum/-um)
_GEN_SUFFIX = (("arum", 1), ("orum", 2), ("uum", 4), ("erum", 5), ("ium", 3),
               ("ae", 1), ("ei", 5), ("us", 4), ("is", 3), ("um", 3), ("i", 2))


def load_dict():
    dd = {}
    for f in glob.glob(os.path.join(DATA, "latin", "*.json")) + glob.glob(os.path.join(DATA, "latin", "archive", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for k, e in json.load(open(f, encoding="utf-8")).get("dict", {}).items():
            dd.setdefault(k, (e.get("pos", ""), e.get("definition", "") or ""))
    return dd


def load_cat():
    cat = {}
    for f in glob.glob(os.path.join(DATA, "latin", "paradigms", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for k, p in json.load(open(f, encoding="utf-8")).get("paradigms", {}).items():
            cat.setdefault(k, p.get("cat"))
    return cat


def lewis_gen_decl(defn):
    """(declinazione, genere) dal pattern «lemma <gen>, <genere>» di L&S."""
    m = _GENDER.search(defn or "")
    if not m:
        return None, None
    gender = m.group(1)
    toks = defn[:m.start()].strip().split()
    if not toks:
        return None, gender
    g = _strip(toks[-1]).lower().rstrip(".,;:()")
    for suf, d in _GEN_SUFFIX:
        if g.endswith(suf):
            return d, gender
    return None, gender


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
    data = json.load(open(CACHE, encoding="utf-8"))
    id_n0, attested, empty_noun = {}, set(), {}
    for e in data:
        wpos = C.POS_MAP_WHITAKER.get(e.get("pos"), "")
        rid = rid_empty = None
        for cand in sorted(whitaker_candidates(e)):
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
    dd = load_dict()
    cat = load_cat()
    idmap = C.load_id_map("lat")
    rev = {rid: key for key, rid in idmap.items()}
    ledger = json.load(open(os.path.join(DATA, "_uid_ledger.json"), encoding="utf-8"))
    idx = C.build_lemma_pos_index("lat")
    id_n0, attested, empty_noun = whitaker_noun_signals(idx)

    segments = {k: [] for k in SEGMAP}
    ambigui = []
    used = collections.Counter()

    def classify(key, defn, rid):
        """→ (decl, segno, genere) oppure (None, motivo, None) se ambiguo."""
        s_par = None
        m = _DECL.search(cat.get(key) or "")
        if m:
            s_par = int(m.group(1))
        s_lew, gender = lewis_gen_decl(defn)
        s_whit = id_n0.get(rid)
        whit_d = s_whit if s_whit in (1, 2, 3, 4, 5) else None

        if s_par:
            others = [x for x in (s_lew, whit_d) if x is not None]
            if others and all(o != s_par for o in others):        # paradigma isolato
                if s_lew:                                          # L&S (autorità) corregge
                    return s_lew, "lewis(corregge paradigma)", gender
                return s_par, "paradigma(conflitto Whitaker, L&S muto)", gender
            return s_par, ("paradigma+lewis" if s_lew == s_par else "paradigma"), gender
        if s_lew:
            return s_lew, ("lewis+whitaker" if whit_d == s_lew else "lewis"), gender
        if whit_d:
            return whit_d, "whitaker", gender
        if s_whit == 9:
            return "X", "whitaker(indecl.)", gender
        return None, "nessun segnale (né L&S né paradigma né Whitaker)", gender

    def add(decl, entry):
        segments[decl].append(entry)
        used[entry["segno"]] += 1

    # ---- nomi dichiarati (pos=sostantivo) ----
    for key, (pos, defn) in dd.items():
        if pos != "sostantivo":
            continue
        rid = idmap.get(key)
        if not rid:
            continue
        base = {"id": rid, "lemma": C.base_lat(key), "uid": ledger.get(rid),
                "fonti": ["lewis"] + (["whitaker"] if rid in attested else [])}
        decl, segno, gender = classify(key, defn, rid)
        if decl is None:
            ambigui.append({**base, "cat": "no-declinazione", "motivo": segno})
            continue
        add(decl, {**base, "marcatore": (f"gen. {GEN[decl]}" if decl in GEN else "indeclinabile/irregolare"),
                   "genere": gender, "segno": segno})

    # ---- nomi «nascosti»: PoS vuota da noi ma pattern-nome L&S / Whitaker=Nome ----
    rescued = ambig_pos = 0
    for rid, n0 in empty_noun.items():
        key = rev.get(rid)
        pos, defn = dd.get(key, ("", ""))
        s_lew, gender = lewis_gen_decl(defn)
        base = {"id": rid, "lemma": C.base_lat(key) if key else rid, "uid": ledger.get(rid),
                "fonti": ["lewis", "whitaker"]}
        if s_lew:                                              # L&S conferma nome + declinazione
            add(s_lew, {**base, "marcatore": f"gen. {GEN[s_lew]}", "genere": gender,
                        "segno": "lewis(pos inferita)"})
            rescued += 1
        elif n0 in (1, 2, 3, 4, 5):                            # solo Whitaker: candidato, non certo
            ambigui.append({**base, "cat": "pos-incerta",
                            "motivo": f"PoS vuota da noi; Whitaker=Nome decl {n0}; L&S senza pattern-nome → confermare"})
            ambig_pos += 1
        # (n0=9 o assente e senza L&S → si scarta dai nomi)

    # ---- scrittura worklist (deterministica) ----
    os.makedirs(WL, exist_ok=True)
    for d, seg in SEGMAP.items():
        lst = sorted(segments[d], key=lambda r: (C.norm_lat(r["lemma"]), r["id"]))
        json.dump({"segment": seg, "count": len(lst), "lemmi": lst},
                  open(os.path.join(WL, f"{seg}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    amb = sorted(ambigui, key=lambda r: (C.norm_lat(r.get("lemma", r["id"])), r["id"]))
    json.dump({"count": len(amb), "ambigui": amb},
              open(os.path.join(WL, "LAT-N-_ambigui.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)

    # ---- report ----
    print("S.1 · LAT-N-1..5 + X — censimento sostantivi latini (ambigui risolti via genitivo L&S)\n")
    tot = sum(len(segments[d]) for d in SEGMAP)
    for d, seg in SEGMAP.items():
        print(f"    {seg:<9} {len(segments[d]):>6}  (marcatore {('gen. ' + GEN[d]) if d in GEN else 'indecl./irreg.'})")
    print(f"    {'TOTALE':<9} {tot:>6}   (nomi dichiarati + {rescued} recuperati da PoS vuota)")
    print(f"\n  segnale usato: {dict(used.most_common())}")
    ambcat = collections.Counter(a.get("cat", "?") for a in amb)
    print(f"  ambigui residui: {len(amb)}  {dict(ambcat)}  → LAT-N-_ambigui.json")
    perletter = collections.Counter(C.norm_lat(r["lemma"])[:1] for d in SEGMAP for r in segments[d])
    print("\n  distribuzione per lettera:")
    print("    " + "  ".join(f"{l}:{perletter[l]}" for l in sorted(perletter)))


if __name__ == "__main__":
    main()
