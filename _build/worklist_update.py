# -*- coding: utf-8 -*-
"""S.3/④ · allinea le worklist di S.1 ai genitivi giudicati.

Due effetti:
  (1) SCRIVE IL GENITIVO VERO nella voce (campo «genitivo» + «numero» + «genere»),
      chiudendo la perdita d'informazione originaria: census.py ricavava dal
      genitivo la sola declinazione e scartava il token, per cui il paradigma
      non era più generabile. Ora il dato resta.
  (2) SPOSTA i lemmi la cui declinazione è stata corretta dal giudizio (il
      censimento si basava su un'euristica, il giudizio su L&S + doppia lettura).
Uso: python worklist_update.py [--dry]
"""
import os, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import extract_genitives as X
import common as C
sys.stdout.reconfigure(encoding="utf-8")

DRY = "--dry" in sys.argv
WL = os.path.join(X.DATA, "latin", "_worklist")
GIUD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports", "genitivi_giudizi.json")
SUBS = ("1", "2", "3", "4", "5", "X")


def main():
    giud = json.load(open(GIUD, encoding="utf-8"))
    idmap = C.load_id_map("lat")
    rev = {v: k for k, v in idmap.items()}

    files = {}
    for s in SUBS:
        p = os.path.join(WL, f"LAT-N-{s}.json")
        files[s] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {"meta": {}, "lemmi": []}

    # indicizza per id e ricorda la provenienza
    voci = {}
    for s, d in files.items():
        for r in d.get("lemmi", []):
            voci[r["id"]] = (s, r)

    arricchiti = spostati = 0
    mosse = []
    for key, g in giud.items():
        rid = idmap.get(key)
        if not rid or rid not in voci:
            continue
        s_old, r = voci[rid]
        if g.get("confidenza") != "bassa" and g.get("genitivo"):
            r["genitivo"] = X.norm(g["genitivo"])
            r["numero"] = g.get("numero", "sg")
            if g.get("genere"):
                r["genere"] = g["genere"]
            r["fonte_genitivo"] = "L&S · giudizio A+B"
            arricchiti += 1
        d_new = int(g.get("declinazione") or 0)
        if g.get("confidenza") != "bassa" and d_new in (1, 2, 3, 4, 5) and str(d_new) != s_old:
            mosse.append((r["lemma"], s_old, str(d_new)))
            files[s_old]["lemmi"] = [x for x in files[s_old]["lemmi"] if x["id"] != rid]
            files[str(d_new)]["lemmi"].append(r)
            spostati += 1

    for s, d in files.items():
        d["lemmi"].sort(key=lambda r: (C.norm_lat(r["lemma"]), r["id"]))
        if d.get("meta") is not None:
            d["meta"]["totale"] = len(d["lemmi"])

    print(f"voci arricchite col genitivo vero: {arricchiti}")
    print(f"lemmi spostati di suddivisione: {spostati}")
    for lem, a, b in mosse:
        print(f"   {lem}: LAT-N-{a} → LAT-N-{b}")
    print("\nconteggi finali per suddivisione:")
    for s in SUBS:
        print(f"   LAT-N-{s}: {len(files[s]['lemmi'])}")
    if DRY:
        print("\n(--dry: nessuna scrittura)")
        return
    for s, d in files.items():
        json.dump(d, open(os.path.join(WL, f"LAT-N-{s}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\nworklist riscritte.")


if __name__ == "__main__":
    main()
