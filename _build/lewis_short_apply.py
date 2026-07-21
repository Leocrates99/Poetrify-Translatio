# -*- coding: utf-8 -*-
"""S.3/⑥ · sostituisce le definizioni TRONCATE con la voce Lewis & Short integrale.

Il dizionario porta Lewis *Elementary* tagliato meccanicamente a ~200 caratteri
(«…»): 5.661 voci latine, il 31,6%. Qui ogni voce troncata riceve il testo
INTEGRALE del L&S maggiore (Perseus, PD + CC BY-SA 4.0), col greco già convertito
da betacode a politonico Unicode.

Aggancio a cascata: id → chiave esatta → chiave normalizzata → VARIANTI DI
ASSIMILAZIONE (adsisto↔assisto, adfingo↔affingo…), che da sole recuperano le
voci in ad- che L&S lemmatizza nella forma assimilata.

Le definizioni NON troncate restano intatte: la glossa breve di Elementary è
adatta alla consultazione rapida, e il L&S integrale entrerà per tutti con la
fusione (F2) attraverso senses_raw.

Uso: python lewis_short_apply.py [--dry]
"""
import os, sys, re, json, glob, shutil, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

DRY = "--dry" in sys.argv
BUILD = os.path.dirname(os.path.abspath(__file__))
NORM = os.path.join(BUILD, "sources", "normalized", "lewis_short.jsonl")
BACKUP = os.path.join(BUILD, "backup", "lewis_short")
SRC_TAG = "L&S"
TRONCO = ("…", "...")

# assimilazione dei preverbi latini: L&S lemmatizza spesso la forma assimilata
_ASSIM = [
    (r"^ads", "ass"), (r"^adf", "aff"), (r"^adl", "all"), (r"^adp", "app"),
    (r"^adr", "arr"), (r"^adt", "att"), (r"^adc", "acc"), (r"^adg", "agg"),
    (r"^adn", "ann"), (r"^adm", "amm"), (r"^adq", "acq"),
    (r"^conl", "coll"), (r"^conr", "corr"), (r"^conm", "comm"), (r"^conp", "comp"),
    (r"^inl", "ill"), (r"^inr", "irr"), (r"^inm", "imm"), (r"^inp", "imp"),
    (r"^exs", "exs"), (r"^obp", "opp"), (r"^subf", "suff"), (r"^subp", "supp"),
]


def varianti(k):
    """la chiave e le sue forme assimilate/de-assimilate."""
    out = [k]
    b = k.lower()
    for pat, rep in _ASSIM:
        if re.match(pat, b):
            out.append(re.sub(pat, rep, b))
        if b.startswith(rep):
            out.append(re.sub("^" + rep, pat[1:], b))
    return out


def troncata(d):
    return any(t in (d or "") for t in TRONCO)


def main():
    idmap = C.load_id_map("lat")
    per_id, per_key, per_norm = {}, {}, collections.defaultdict(list)
    for line in open(NORM, encoding="utf-8"):
        v = json.loads(line)
        if not v.get("definition_full"):
            continue
        if v.get("id"):
            per_id.setdefault(v["id"], v)
        per_key.setdefault(v["key_ls"], v)
        per_norm[C.norm_lat(re.sub(r"\d+$", "", v["key_ls"]))].append(v)

    # voce di puro RIMANDO: «băsĭlĭca, v. basilicus, II. B.» — sostituirci una
    # definizione informativa sarebbe un peggioramento: si segue il rinvio.
    # il rinvio può stare dopo le indicazioni grammaticali e portare il numero
    # d'omografo: «album, i, n., v. albus, III.» · «acriter, adv., v. 2. acer»
    # …e il rimando participiale: «accessus, a, um, Part. of accedo.» ·
    # «constratus, a, um, Part., from 1. consterno.» — participi e avverbi che
    # L&S non lemmatizza ma manda al verbo o all'aggettivo di base.
    _RINVIO = re.compile(
        r"(?:(?:v\.|see|cf\.)\s+(?:\d+\.\s*)?([A-Za-z]+))"
        r"|(?:(?:Part|P\.\s*a|Partic|adv|Adv)\b[^A-Za-z]{0,12}?(?:of|from)\s+(?:\d+\.\s*)?([A-Za-z]+))", re.I)
    STUB = 160

    def bersaglio_rinvio(t):
        m = _RINVIO.search(t)
        return (m.group(1) or m.group(2)).lower() if m else None

    def arricchisci(v, key):
        """se l'aggancio è finito su uno STUB (un omografo magro: accendo1 «un
        istigatore» invece di accendo2 «accendere»), passa all'omografo più
        sostanzioso: la voce troncata esiste perché la parola è in uso."""
        t = v.get("definition_full") or ""
        if len(t) >= STUB:
            return v
        base = C.norm_lat(re.sub(r"\d+$", "", v.get("key_ls") or key))
        fratelli = [x for x in (per_norm.get(base) or []) if len(x.get("definition_full") or "") > len(t)]
        if not fratelli:
            return v
        ricco = max(fratelli, key=lambda x: len(x["definition_full"]))
        out = dict(ricco)
        out["definition_full"] = f"{t} → {ricco['definition_full']}"
        return out

    def segui_rinvio(v, salti=2):
        for _ in range(salti):
            t = v.get("definition_full") or ""
            if len(t) > STUB:
                break
            bersaglio = bersaglio_rinvio(t)
            if not bersaglio:
                break
            lst = per_norm.get(C.norm_lat(bersaglio)) or []
            lst = [x for x in lst if len(x.get("definition_full") or "") > len(t)]
            if not lst:
                break
            nuovo = max(lst, key=lambda x: len(x["definition_full"]))
            nuovo = dict(nuovo)
            nuovo["definition_full"] = f"{t} → {nuovo['definition_full']}"
            v = nuovo
        return v

    def trova(key, rid):
        if rid and rid in per_id:
            return per_id[rid], "id"
        if key in per_key:
            return per_key[key], "chiave"
        for cand in varianti(key):
            n = C.norm_lat(re.sub(r"\d+$", "", cand))
            lst = per_norm.get(n) or []
            if len(lst) == 1:
                return lst[0], ("assimilazione" if cand != key else "normalizzata")
            if 2 <= len(lst) <= 4:
                # L&S spacca in OMOGRAFI numerati ciò che noi teniamo come un
                # lemma solo (assiduus1 agg. / assiduus2 sost.): unirli è più
                # completo e non può essere sbagliato, mentre sceglierne uno sì.
                lst = sorted(lst, key=lambda v: v["key_ls"])
                testo = "  ‖  ".join(f"[{i}] {v['definition_full']}" for i, v in enumerate(lst, 1))
                unito = dict(lst[0])
                unito["definition_full"] = testo
                return unito, ("omografi:" + ("assimilazione" if cand != key else "normalizzata"))
        return None, None

    files = [f for f in glob.glob(os.path.join(C.DATA, "latin", "*.json")) if not os.path.basename(f).startswith("_")] \
        + [f for f in glob.glob(os.path.join(C.DATA, "latin", "archive", "*.json")) if not os.path.basename(f).startswith("_")]

    tot = tronc = sost = 0
    vie = collections.Counter()
    irrisolte, piu_povere = [], []
    da_scrivere = {}
    for f in files:
        data = json.load(open(f, encoding="utf-8"))
        dd = data.get("dict") or {}
        cambi = 0
        for k, e in dd.items():
            tot += 1
            d = e.get("definition") or ""
            if not troncata(d):
                continue
            tronc += 1
            v, via = trova(k, idmap.get(k))
            if v:
                v = arricchisci(v, k)      # dallo stub all'omografo sostanzioso
                v = segui_rinvio(v)        # poi segui gli eventuali rimandi
            nuovo = (v or {}).get("definition_full") or ""
            # GUARDIA: non si sostituisce mai con un testo PIÙ POVERO dell'originale.
            # Senza di essa le voci di rimando di L&S impoverivano il dizionario.
            if not v or len(nuovo) <= len(d.rstrip("… .")):
                (irrisolte if not v else piu_povere).append(k)
                continue
            e["definition"] = nuovo
            e["src"] = SRC_TAG
            vie[via] += 1
            sost += 1
            cambi += 1
        if cambi:
            da_scrivere[f] = data

    print(f"lemmi latini esaminati: {tot} · troncati: {tronc}")
    print(f"  sostituiti con L&S integrale: {sost} ({100*sost/max(tronc,1):.1f}%)")
    print(f"  vie d'aggancio: {dict(vie)}")
    print(f"  scartati perche' L'&S sarebbe stato PIU' POVERO: {len(piu_povere)}  es. {piu_povere[:6]}")
    print(f"  irrisolti (nessuna voce L&S): {len(irrisolte)}  es. {irrisolte[:8]}")
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
    json.dump(irrisolte, open(os.path.join(BUILD, "reports", "lewis_short_irrisolti.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
