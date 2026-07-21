# -*- coding: utf-8 -*-
"""S.3/⑥ · applica le risoluzioni di lemmatizzazione L&S giudicate dagli agenti.

Ingresso: _build/reports/ls_risoluzioni.json  {chiave_nostra: {key_ls, confidenza, motivo}}
Sono i lemmi che L&S lemmatizza altrove (aerarium→aerarius, aperte→apertus,
angustia→angustiae, admiro→admiror): l'aggancio automatico non poteva trovarli.

Valgono le stesse guardie del passaggio automatico:
 · si segue l'eventuale rimando della voce di destinazione;
 · non si sostituisce mai con un testo PIÙ POVERO di quello troncato.
Uso: python ls_resolve_apply.py [--dry]
"""
import os, sys, re, json, glob, shutil, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

DRY = "--dry" in sys.argv
BUILD = os.path.dirname(os.path.abspath(__file__))
NORM = os.path.join(BUILD, "sources", "normalized", "lewis_short.jsonl")
RIS = os.path.join(BUILD, "reports", "ls_risoluzioni.json")
BACKUP = os.path.join(BUILD, "backup", "ls_risoluzioni")
_RINVIO = re.compile(
    r"(?:(?:v\.|see|cf\.)\s+(?:\d+\.\s*)?([A-Za-z]+))"
    r"|(?:(?:Part|P\.\s*a|Partic|adv|Adv)\b[^A-Za-z]{0,12}?(?:of|from)\s+(?:\d+\.\s*)?([A-Za-z]+))", re.I)
STUB = 160


def main():
    ris = json.load(open(RIS, encoding="utf-8"))
    per_key, per_norm = {}, collections.defaultdict(list)
    for line in open(NORM, encoding="utf-8"):
        v = json.loads(line)
        if not v.get("definition_full"):
            continue
        per_key.setdefault(v["key_ls"], v)
        per_norm[C.norm_lat(re.sub(r"\d+$", "", v["key_ls"]))].append(v)

    def risolvi(key_ls):
        """chiave L&S → voce; accetta anche la forma senza numero d'omografo
        (l'agente scrive «apertus», in L&S può essere «apertus1»/«apertus2»)."""
        v = per_key.get(key_ls)
        if v:
            return v
        lst = per_norm.get(C.norm_lat(re.sub(r"\d+$", "", key_ls))) or []
        if not lst:
            return None
        if len(lst) == 1:
            return lst[0]
        lst = sorted(lst, key=lambda x: x["key_ls"])
        testo = "  ‖  ".join(f"[{i}] {x['definition_full']}" for i, x in enumerate(lst[:4], 1))
        out = dict(lst[0]); out["definition_full"] = testo
        return out

    def segui(v, salti=2):
        for _ in range(salti):
            t = v.get("definition_full") or ""
            if len(t) > STUB:
                break
            m = _RINVIO.search(t)
            if not m:
                break
            b = (m.group(1) or m.group(2)).lower()
            lst = [x for x in (per_norm.get(C.norm_lat(b)) or []) if len(x.get("definition_full") or "") > len(t)]
            if not lst:
                break
            nuovo = dict(max(lst, key=lambda x: len(x["definition_full"])))
            nuovo["definition_full"] = f"{t} → {nuovo['definition_full']}"
            v = nuovo
        return v

    files = [f for f in glob.glob(os.path.join(C.DATA, "latin", "*.json")) if not os.path.basename(f).startswith("_")] \
        + [f for f in glob.glob(os.path.join(C.DATA, "latin", "archive", "*.json")) if not os.path.basename(f).startswith("_")]

    sost, saltati = 0, collections.Counter()
    da_scrivere = {}
    for f in files:
        data = json.load(open(f, encoding="utf-8"))
        dd = data.get("dict") or {}
        cambi = 0
        for k, e in dd.items():
            r = ris.get(k)
            if not r or not r.get("key_ls"):
                continue
            d = (e.get("definition") or "").rstrip()
            if not d.endswith(("…", "...")):
                saltati["non più troncata"] += 1; continue
            v = risolvi(r["key_ls"])
            if not v:
                saltati["chiave L&S inesistente"] += 1; continue
            v = segui(v)
            nuovo = v.get("definition_full") or ""
            if len(nuovo) <= len(d.rstrip("… .")):
                saltati["sarebbe più povera"] += 1; continue
            e["definition"] = nuovo
            e["src"] = "L&S"
            sost += 1; cambi += 1
        if cambi:
            da_scrivere[f] = data

    print(f"risoluzioni in ingresso: {len(ris)}")
    print(f"  definizioni sostituite: {sost}")
    print(f"  saltate: {dict(saltati)}")
    print(f"  shard da riscrivere: {len(da_scrivere)}")
    if DRY:
        print("\n(--dry: nessuna scrittura)")
        return
    os.makedirs(BACKUP, exist_ok=True)
    for f in da_scrivere:
        shutil.copy2(f, os.path.join(BACKUP, ("archive_" if "archive" in f else "core_") + os.path.basename(f)))
    for f, data in da_scrivere.items():
        json.dump(data, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"\nbackup in {BACKUP} · shard riscritti: {len(da_scrivere)}")


if __name__ == "__main__":
    main()
