# -*- coding: utf-8 -*-
"""P1.2 · Fonte LATINA già presente: Lewis Elementary (Charlton T. Lewis 1890,
pubblico dominio) — le definizioni nel dict del repo. Normalizza al formato
comune; l'id è la chiave-sorgente stessa (→ aggancio diretto). NB: definizioni
copiate VERBATIM (il «…» eventuale è del sorgente → lo riparerà il full L&S)."""
import os, sys, glob, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
sys.stdout.reconfigure(encoding="utf-8")


def main():
    idmap = C.load_id_map("lat")
    records, hooked, seen = [], 0, set()
    files = glob.glob(os.path.join(C.DATA, "latin", "*.json")) + glob.glob(os.path.join(C.DATA, "latin", "archive", "*.json"))
    for f in files:
        if os.path.basename(f).startswith("_"):
            continue
        for key, e in json.load(open(f, encoding="utf-8")).get("dict", {}).items():
            if key in seen:
                continue
            seen.add(key)
            rid = idmap.get(key)
            if rid:
                hooked += 1
            definition = (e.get("definition") or "").strip()
            records.append({
                "fonte": "lewis", "id": rid, "lemma": C.base_lat(key), "pos": e.get("pos", ""),
                "tr": {}, "senses": [definition] if definition else [],
                "lic": "PD · Lewis Elementary 1890",
            })
    C.write_jsonl("lewis", records)
    C.report_line("lewis", len(records), "PD (Lewis Elem.)", hooked)


if __name__ == "__main__":
    main()
