# -*- coding: utf-8 -*-
"""P1.2 · Fonte GRECA già presente: LSJ 9ª ed. (Liddell-Scott-Jones, pubblico
dominio) — le definizioni nel dict del repo. Formato comune; id = chiave-sorgente
(aggancio diretto). Core+archivio deduplicati (i 19 overlap greci: vince il core)."""
import os, sys, glob, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
sys.stdout.reconfigure(encoding="utf-8")


def main():
    idmap = C.load_id_map("grc")
    records, hooked, seen = [], 0, set()
    core = sorted(glob.glob(os.path.join(C.DATA, "greek", "*.json")))
    arch = sorted(glob.glob(os.path.join(C.DATA, "greek", "archive", "*.json")))
    for f in core + arch:                 # core prima → vince sugli overlap
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
                "fonte": "lsj", "id": rid, "lemma": key, "pos": e.get("pos", ""),
                "tr": {}, "senses": [definition] if definition else [],
                "lic": "PD · LSJ 9 (Liddell-Scott-Jones)",
            })
    C.write_jsonl("lsj", records)
    C.report_line("lsj", len(records), "PD (LSJ 9)", hooked)


if __name__ == "__main__":
    main()
