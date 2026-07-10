# -*- coding: utf-8 -*-
"""P1.2 · Fonte LATINA esterna: Whitaker's Words via open_words (MIT).
Scarica open_words/data/data.json (~7 MB), normalizza al formato comune e
aggancia l'id per LEMMA normalizzato (orth) contro _id_map. senses = liste
inglesi pulite (non troncate). Cache locale in _build/sources/cache/."""
import os, sys, json, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

URL = "https://raw.githubusercontent.com/ArchimedesDigital/open_words/master/open_words/data/data.json"
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache", "whitaker_data.json")


def load_data():
    if os.path.exists(CACHE):
        return json.load(open(CACHE, encoding="utf-8"))
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    raw = C.fetch(URL)
    open(CACHE, "wb").write(raw)
    return json.loads(raw)


def citation_candidates(e):
    """Whitaker conserva STEMI, non forme di citazione: ricostruiamo le uscite
    del nominativo/1sg per declinazione/coniugazione, così l'aggancio al lemma
    va oltre il caso stem==nominativo. Deterministico, uscite mirate → pochi
    falsi positivi (e la fusione F2 valida comunque i sensi sul lemma)."""
    parts = [p.strip() for p in (e.get("parts") or []) if p and p.strip()]
    orth = (e.get("orth") or (parts[0] if parts else "")).strip()
    n = e.get("n") or []
    decl = n[0] if n and isinstance(n[0], int) else None
    st = parts[0] if parts else orth
    cands = set(parts) | {orth}
    pos = e.get("pos")
    if pos == "N":
        cands |= {1: {st + "a", st + "ae", st + "e", st + "es"},
                  2: {st + "us", st + "um", st + "er", st + "os", st + "on", st + "ius"},
                  4: {st + "us", st + "u"},
                  5: {st + "es"}}.get(decl, set())          # 3ª: parts[0] è già il nom.
    elif pos == "V":
        cands |= {1: {st + "o", st + "or"}, 2: {st + "eo", st + "eor"},
                  3: {st + "o", st + "or", st + "io", st + "ior"},
                  4: {st + "io", st + "ior"}}.get(decl, {st + "o", st + "eo", st + "io"})
    elif pos == "ADJ":
        cands |= {st + "us", st + "a", st + "um", st + "er", st + "is", st + "e", st + "s", st + "x", st + "ns"}
    return cands


def main():
    data = load_data()
    idx = C.build_lemma_pos_index("lat")           # norm(lemma) -> [(id, pos)]
    records, hooked = [], 0
    for e in data:
        orth = (e.get("orth") or (e.get("parts") or [""])[0] or "").strip()
        if not orth:
            continue
        senses = e.get("senses") or []
        wpos = C.POS_MAP_WHITAKER.get(e.get("pos"), "")
        rid, fallback = None, None
        for cand in citation_candidates(e):        # preferisci match di STESSA PoS
            for i, p in idx.get(C.norm_lat(C.base_lat(cand)), []):
                if p == wpos:
                    rid = i
                    break
                if p == "" and fallback is None:
                    fallback = i                    # PoS vuota nel nostro dato: fallback prudente
            if rid:
                break
        rid = rid or fallback
        if rid:
            hooked += 1
        records.append({
            "fonte": "whitaker", "id": rid, "lemma": orth,
            "pos": C.POS_MAP_WHITAKER.get(e.get("pos"), ""),
            "tr": {"en": C.short_glosses(senses)}, "senses": senses,
            "lic": "MIT · open_words (Whitaker's Words)",
        })
    C.write_jsonl("whitaker", records)
    C.report_line("whitaker", len(records), "MIT (open_words)", hooked)


if __name__ == "__main__":
    main()
