# -*- coding: utf-8 -*-
"""P0.0 — Assegna un ID canonico a OGNI lemma (latino + greco, core + archivio).
Contratto: _build/BUILD_SPEC.md §3.

NON modifica i dati sorgente. Scrive soltanto:
  data/_id_map.lat.json   { chiave_originale -> id }
  data/_id_map.grc.json   { chiave_originale -> id }
  data/_uid_ledger.json   { id -> uid }         (append-only, mai riusare un uid)
  _build/reports/id_collisions.json             (omografi da disambiguare a mano)

Regole (§3):
- id = "<lang>:<slug>"; lang in {lat, grc}.
- slug latino: NFD, rimozione macron/diacritici combinanti, minuscolo, j->i, v mantenuto.
- slug greco : NFC, minuscolo, accenti/spiriti/iota sottoscritto CONSERVATI (distintivi).
- disambiguazione "#": si aggiunge SOLO quando serve (omografi). Il latino porta già
  numeri di omografo nella chiave (cum1, cum2): li si preserva come "#1", "#2".
  Collisione non pre-numerata dal sorgente -> #pos se le PoS differiscono, altrimenti
  #1/#2 sequenziale; in ogni caso VIENE SEGNALATA nel report (mai fusione silenziosa).
- core+archivio con la STESSA stringa-lemma = stesso lemma -> un solo id (merge), non collisione.
- uid = "poe-" + 9 cifre progressive dal ledger, assegnate in ordine stabile.
- uri = null in questa fase: l'aggancio a LiLa (lat) / testata LSJ-Perseus (grc)
  richiede il download di quei dataset ed e' compito di P1.2 (ingest). Il campo resta
  predisposto; qui non si inventano URI.
"""
import os, sys, glob, json, re, unicodedata
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # radice repo (padre di _build)
DATA = os.path.join(ROOT, "data")
REPORTS = os.path.join(ROOT, "_build", "reports")
LANGS = {"latin": "lat", "greek": "grc"}
POS_TAG = {  # PoS italiana -> tag breve per la disambiguazione #pos
    "sostantivo": "nome", "aggettivo": "agg", "verbo": "verbo", "avverbio": "avv",
    "preposizione": "prep", "congiunzione": "cong", "pronome": "pron",
    "interiezione": "int", "numerale": "num", "particella": "part", "articolo": "art",
}
_DIGIT = re.compile(r"^(.*?)(\d+)$")


def norm_slug(base, lc):
    if lc == "lat":
        s = unicodedata.normalize("NFD", base)
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # via macron/diacritici
        return s.lower().replace("j", "i")                            # v mantenuto
    return unicodedata.normalize("NFC", base).lower()                 # greco: accenti conservati


def split_srcnum(key, lc):
    """Il latino puo' portare un numero di omografo in coda alla chiave (cum1 -> cum,1).
    Il greco non ne ha mai."""
    if lc == "lat":
        m = _DIGIT.match(key)
        if m and m.group(1):
            return m.group(1), m.group(2)
    return key, None


def load_entries(lang_dir):
    """Raccoglie tutte le chiavi-lemma di core + archivio, deduplicando le stringhe
    identiche (stesso lemma in due posti) e ricordandone l'origine."""
    entries = {}  # chiave_originale -> {"pos":..., "origins":set()}
    def scan(pattern, origin):
        for f in sorted(glob.glob(pattern)):
            if os.path.basename(f).startswith("_"):
                continue
            dd = json.load(open(f, encoding="utf-8")).get("dict", {})
            for k, v in dd.items():
                e = entries.setdefault(k, {"pos": v.get("pos", ""), "origins": set()})
                e["origins"].add(origin)
                if origin == "core" and v.get("pos"):
                    e["pos"] = v.get("pos", "")  # il core ha priorita' sulla PoS
    scan(os.path.join(DATA, lang_dir, "*.json"), "core")
    scan(os.path.join(DATA, lang_dir, "archive", "*.json"), "archive")
    return entries


def assign_language(lang_dir, lc):
    entries = load_entries(lang_dir)
    recs = {}
    groups = defaultdict(list)  # slug -> [chiave_originale, ...]
    for key, e in entries.items():
        base, num = split_srcnum(key, lc)
        slug = norm_slug(base, lc)
        recs[key] = {"num": num, "slug": slug, "pos": e["pos"], "origins": e["origins"]}
        groups[slug].append(key)

    id_map, collisions = {}, []
    for slug, keys in groups.items():
        if len(keys) == 1 and recs[keys[0]]["num"] is None:
            id_map[keys[0]] = f"{lc}:{slug}"                       # singleton pulito
            continue
        nums = [recs[k]["num"] for k in keys]
        if all(n is not None for n in nums) and len(set(nums)) == len(nums):
            for k in keys:                                        # omografi gia' numerati dal sorgente
                id_map[k] = f"{lc}:{slug}#{recs[k]['num']}"
            continue
        # collisione non pre-numerata: disambigua e SEGNALA
        poss = [recs[k]["pos"] for k in keys]
        if all(poss) and len(set(poss)) == len(keys):
            for k in keys:  # PoS distinte -> disambiguazione parlante e stabile (dum#cong / dum#avv)
                id_map[k] = f"{lc}:{slug}#{POS_TAG.get(recs[k]['pos'], recs[k]['pos'])}"
        else:
            for i, k in enumerate(sorted(keys), 1):  # posizionale puro: unicita' garantita
                id_map[k] = f"{lc}:{slug}#{i}"
        collisions.append({
            "slug": f"{lc}:{slug}", "chiavi": keys, "pos": poss,
            "ids": [id_map[k] for k in keys],
            "nota": "omografi non pre-numerati dal sorgente / PoS ambigua: verifica manuale",
        })

    stats = {
        "lemmi_totali": len(entries),
        "solo_core": sum(1 for e in entries.values() if e["origins"] == {"core"}),
        "solo_archivio": sum(1 for e in entries.values() if e["origins"] == {"archive"}),
        "merge_core_archivio": sum(1 for e in entries.values() if e["origins"] == {"core", "archive"}),
        "id_distinti": len(set(id_map.values())),
    }
    return id_map, collisions, stats


def main():
    os.makedirs(REPORTS, exist_ok=True)
    ledger_path = os.path.join(DATA, "_uid_ledger.json")
    ledger = json.load(open(ledger_path, encoding="utf-8")) if os.path.exists(ledger_path) else {}

    results, all_collisions, report = {}, [], {}
    for lang_dir, lc in LANGS.items():
        id_map, collisions, stats = assign_language(lang_dir, lc)
        results[lc] = id_map
        all_collisions.extend(collisions)
        report[lc] = {**stats, "collisioni": len(collisions)}

    # --- ledger: assegna uid ai nuovi id, in ordine stabile, senza riusare ---
    next_n = max((int(v.split("-")[1]) for v in ledger.values()), default=0) + 1
    new_ids = sorted({i for m in results.values() for i in m.values()} - set(ledger))
    for i in new_ids:
        ledger[i] = f"poe-{next_n:09d}"
        next_n += 1

    # --- verifiche interne (fallisce rumorosamente se qualcosa non torna) ---
    problems = []
    for lc, m in results.items():
        ids = list(m.values())
        # un id puo' ripetersi SOLO se e' lo stesso lemma (merge core/archivio, stessa chiave)
        # qui le chiavi sono uniche per costruzione, quindi ogni chiave->un id.
        assert len(m) == len(set(m.keys())), f"{lc}: chiavi duplicate"
        # UNICITA' ID: ogni chiave = un lemma distinto (i merge core/archivio sono gia'
        # collassati a monte) -> gli id devono essere TUTTI distinti.
        if len(set(ids)) != len(ids):
            problems.append(f"{lc}: id duplicati ({len(ids) - len(set(ids))})")
        # ogni id ha un uid
        for i in set(ids):
            if i not in ledger:
                problems.append(f"{lc}: id senza uid: {i}")
    uids = list(ledger.values())
    if len(uids) != len(set(uids)):
        problems.append("uid duplicati nel ledger")
    # conteggi attesi (audit)
    expect = {"lat": (17443, 487), "grc": (25086, 110225)}
    for lc, (c, a) in expect.items():
        if report[lc]["solo_core"] + report[lc]["merge_core_archivio"] != c:
            problems.append(f"{lc}: core conteggio {report[lc]['solo_core']}+{report[lc]['merge_core_archivio']} != atteso {c}")

    # --- scrittura output ---
    json.dump(results["lat"], open(os.path.join(DATA, "_id_map.lat.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    json.dump(results["grc"], open(os.path.join(DATA, "_id_map.grc.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    json.dump(ledger, open(ledger_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    json.dump(all_collisions, open(os.path.join(REPORTS, "id_collisions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # --- report ---
    print("P0.0 · assegnazione ID — report")
    for lc in ("lat", "grc"):
        r = report[lc]
        print(f"  [{lc}] lemmi={r['lemmi_totali']}  (core {r['solo_core']} + archivio {r['solo_archivio']} + merge {r['merge_core_archivio']})  id_distinti={r['id_distinti']}  collisioni={r['collisioni']}")
    print(f"  uid nel ledger: {len(ledger)}  (nuovi assegnati: {len(new_ids)})")
    print(f"  uri agganciati: 0  (LiLa/LSJ rimandati a P1.2 — nessun URI inventato)")
    print(f"  collisioni totali da verificare: {len(all_collisions)} -> _build/reports/id_collisions.json")
    if problems:
        print("  !! PROBLEMI DI VERIFICA:")
        for p in problems:
            print("     -", p)
        sys.exit(1)
    print("  verifica interna: OK")


if __name__ == "__main__":
    main()
