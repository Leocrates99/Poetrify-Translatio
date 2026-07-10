# -*- coding: utf-8 -*-
"""P0.1 — Ricalcola data/<lang>/_index.json dai conteggi REALI degli shard e
rigenera i numeri nel README. Contratto: _build/BUILD_SPEC.md (regola d'oro §10:
"indici sempre sincronizzati").

NON tocca i dati degli shard. Scrive solo:
  data/latin/_index.json, data/greek/_index.json   (campi letti dall'engine
    preservati con gli STESSI nomi: total_forms/total_lemmas/archived_lemmas;
    aggiunti total_form_entries/total_paradigms/total_glosses_it)
  data/README.md   (blocco conteggi auto-generato, delimitato e idempotente)

Verifica: esegue _build/check_stats.mjs (il VERO LexiconEngine) e asserisce che
LexiconEngine.stats() combaci coi conteggi reali. Report: tabella prima/dopo.
"""
import os, sys, glob, json, re, subprocess
sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
LANGS = {"latin": "latino", "greek": "greco"}   # cartella -> nome engine


def _shards(lang, sub=""):
    p = os.path.join(DATA, lang, sub, "*.json") if sub else os.path.join(DATA, lang, "*.json")
    return [f for f in sorted(glob.glob(p)) if not os.path.basename(f).startswith("_")]


def count_lang(lang):
    lemmas = forms = form_entries = 0
    for f in _shards(lang):
        j = json.load(open(f, encoding="utf-8"))
        lemmas += len(j.get("dict", {}))
        ff = j.get("forms", {})
        forms += len(ff)
        form_entries += sum(len(v) for v in ff.values())
    archived  = sum(len(json.load(open(f, encoding="utf-8")).get("dict", {}))      for f in _shards(lang, "archive"))
    paradigms = sum(len(json.load(open(f, encoding="utf-8")).get("paradigms", {})) for f in _shards(lang, "paradigms"))
    glosses   = sum(len(json.load(open(f, encoding="utf-8")).get("glosses", {}))   for f in _shards(lang, "glosses_it"))
    letters      = [os.path.splitext(os.path.basename(f))[0] for f in _shards(lang)]
    arch_letters = [os.path.splitext(os.path.basename(f))[0] for f in _shards(lang, "archive")]
    return {
        "total_lemmas": lemmas, "total_forms": forms, "total_form_entries": form_entries,
        "archived_lemmas": archived, "total_paradigms": paradigms, "total_glosses_it": glosses,
        "shard_count": len(letters), "letters": letters, "archive_letters": arch_letters,
    }


def fmt(n):
    return f"{n:,}".replace(",", ".")


def main():
    before, after = {}, {}
    for lang, name in LANGS.items():
        idx_path = os.path.join(DATA, lang, "_index.json")
        old = json.load(open(idx_path, encoding="utf-8")) if os.path.exists(idx_path) else {}
        before[lang] = old.get("meta", {})
        c = count_lang(lang)
        meta = {
            "lang": before[lang].get("lang", name),
            "shard_count": c["shard_count"],
            "total_lemmas": c["total_lemmas"],
            "total_forms": c["total_forms"],
            "total_form_entries": c["total_form_entries"],
            "archived_lemmas": c["archived_lemmas"],
            "total_paradigms": c["total_paradigms"],
            "total_glosses_it": c["total_glosses_it"],
            "scholastic": before[lang].get("scholastic", True),
        }
        json.dump({"meta": meta, "letters": c["letters"], "archive_letters": c["archive_letters"]},
                  open(idx_path, "w", encoding="utf-8"), ensure_ascii=False)
        after[lang] = {**meta, **c}

    # --- README: blocco conteggi auto, delimitato e idempotente ---
    rows = "\n".join(
        f"| {LANGS[l]} | {fmt(after[l]['total_lemmas'])} | {fmt(after[l]['total_forms'])} | "
        f"{fmt(after[l]['total_form_entries'])} | {fmt(after[l]['archived_lemmas'])} | "
        f"{fmt(after[l]['total_paradigms'])} | {fmt(after[l]['total_glosses_it'])} |"
        for l in LANGS
    )
    block = ("<!-- COUNTS:START (auto · _build/rebuild_index.py · non editare a mano) -->\n"
             "| lingua | lemmi core | forme | form-entries | archivio | paradigmi | glosse it |\n"
             "|---|--:|--:|--:|--:|--:|--:|\n" + rows + "\n"
             "<!-- COUNTS:END -->")
    readme = os.path.join(DATA, "README.md")
    txt = open(readme, encoding="utf-8").read()
    if "<!-- COUNTS:START" in txt:
        txt = re.sub(r"<!-- COUNTS:START.*?<!-- COUNTS:END -->", block, txt, flags=re.S)
    else:
        txt = txt.rstrip() + "\n\n## Conteggi reali\n\n" + block + "\n"
    open(readme, "w", encoding="utf-8").write(txt)

    # --- report prima/dopo ---
    print("P0.1 · rebuild _index.json — tabella prima/dopo")
    keys = [("total_lemmas", "lemmi core"), ("total_forms", "forme"),
            ("total_form_entries", "form-entries"), ("archived_lemmas", "archivio"),
            ("total_paradigms", "paradigmi"), ("total_glosses_it", "glosse it"),
            ("shard_count", "shard")]
    for lang, name in LANGS.items():
        print(f"  [{name}]")
        for k, label in keys:
            ov = before[lang].get(k, "—")
            nv = after[lang][k]
            flag = "" if str(ov) == str(nv) else "  <-- AGGIORNATO"
            print(f"     {label:<13} {str(ov):>10} -> {nv:>10}{flag}")

    # --- verifica: il VERO LexiconEngine.stats() combacia coi conteggi reali ---
    print("\n  Verifica LexiconEngine.stats() (motore reale, Node)…")
    try:
        r = subprocess.run(["node", os.path.join(ROOT, "_build", "check_stats.mjs"), ROOT],
                           capture_output=True, text=True, timeout=60)
    except Exception as e:
        print(f"  !! impossibile eseguire il check Node: {e}"); sys.exit(1)
    if r.returncode != 0:
        print("  !! check_stats.mjs errore:\n", r.stderr.strip()); sys.exit(1)
    stats = json.loads(r.stdout)
    problems = []
    for lang, name in LANGS.items():
        s = stats.get(name, {})
        checks = [("total_forms", s.get("total_forms"), after[lang]["total_forms"]),
                  ("total_lemmas", s.get("total_lemmas"), after[lang]["total_lemmas"]),
                  ("total_shards", s.get("total_shards"), after[lang]["shard_count"])]
        for field, got, exp in checks:
            mark = "OK" if got == exp else "XX"
            print(f"     stats().{name}.{field} = {got}  (atteso {exp})  {mark}")
            if got != exp:
                problems.append(f"{name}.{field}: {got} != {exp}")
    if problems:
        print("  !! stats() NON combacia:", problems); sys.exit(1)
    print("  ✓ LexiconEngine.stats() combacia coi conteggi reali.")


if __name__ == "__main__":
    main()
