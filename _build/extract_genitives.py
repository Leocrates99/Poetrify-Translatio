# -*- coding: utf-8 -*-
"""S.3/④ · ESTRATTORE DI GENITIVI dal testo Lewis & Short.

Il censimento (census.py) ricavava dal genitivo solo la DECLINAZIONE e buttava
via il token: senza il genitivo pieno non si può generare il paradigma (il tema
della 3ª è imprevedibile dal nominativo: corpus→corporis, Carthago→Carthaginis).
Qui il token si estrae e si RICOMPONE col tema.

Due stadi:
  (1) NOTAZIONE  → dal testo L&S il token del genitivo + il genere.
      Formati attestati: «aqua ae, f» · «Caesar, -aris m» · «Arctophylax (acis), m»
      · «baca (not bacca), ae, f» · «barbaria ae (nom. also -ies), f» · «Aborigines um, m»
  (2) ALLINEAMENTO → dal token all'uscita piena (quanti caratteri togliere al lemma).
      Più strategie in gara, misurate sul GOLD dei paradigmi già corretti.

Uso:  python extract_genitives.py            # valuta sul gold e riporta
      python extract_genitives.py --dump     # scrive anche _build/reports/genitivi.json
"""
import os, sys, json, glob, re, unicodedata, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

DATA = C.DATA
BUILD = os.path.dirname(os.path.abspath(__file__))
LANG = "latin"

# genere come lo scrive L&S, isolato: m. f. n. c. (anche «m,» «f:» «n »)
_GENDER = re.compile(r"\b([mfnc])\b\s*[,.:;]?")
_PAREN = re.compile(r"\([^)]*\)")
# uscite di genitivo plausibili (sing. + plurali tantum)
_GEN_END = ("arum", "orum", "erum", "uum", "ium", "um", "ae", "ei", "is", "us", "i", "e")


def strip_diac(s):
    """via macron/brevi: bāca→baca, Carthāgō→Carthago (l'ASCII resta)."""
    return "".join(c for c in unicodedata.normalize("NFD", s or "")
                   if unicodedata.category(c) != "Mn")


def norm(s):
    return strip_diac(s).lower().strip()


def parse_notation(lemma, defn):
    """→ (token_genitivo, genere) dal testo L&S, o (None, genere/None).

    Regola: si guarda il testo SENZA le parentetiche (che spesso portano note
    ortografiche: «(not bacca)», «(nom. also -ies)»); se lì il genitivo non c'è,
    lo si cerca DENTRO la parentetica («Arctophylax (acis), m»).
    """
    if not defn:
        return None, None
    d = strip_diac(defn)
    nl = norm(lemma)

    def cerca(testo):
        m = _GENDER.search(testo)
        if not m:
            return None, None
        gen = m.group(1)
        testa = testo[:m.start()]
        # token candidati: parole prima del genere, ripulite
        toks = [t.strip(" ,.:;'\"()") for t in testa.replace(",", " ").split()]
        toks = [t for t in toks if t]
        if not toks:
            return None, gen
        cand = toks[-1]
        c = cand.lstrip("-").lower()
        # il token non deve essere il lemma stesso (= genitivo non dato lì)
        if c == nl or not c.isalpha():
            return None, gen
        if not c.endswith(_GEN_END):
            return None, gen
        return c, gen

    senza = _PAREN.sub(" ", d)
    tok, gen = cerca(senza)
    if tok:
        return tok, gen
    # ripiego: il genitivo sta nella parentetica
    for p in _PAREN.findall(d):
        inner = p.strip("()")
        c = inner.strip(" ,.:;-").lower()
        c = c.split()[0].strip(" ,.:;") if c.split() else ""
        if c and c.isalpha() and c != nl and c.endswith(_GEN_END):
            return c, (gen or (cerca(d)[1]))
    return None, gen


# ───────────────── strategie di allineamento token → genitivo pieno ─────────────────
def align_overlap(lemma, tok):
    """Massima sovrapposizione: togli dal lemma la coda che ricompare in testa al token.
    caesar + aris → caes|aris (la coda «ar» apre il token)."""
    L = norm(lemma)
    for k in range(min(len(L), len(tok)), 0, -1):
        if L.endswith(tok[:k]):
            return L[:-k] + tok
    return L + tok


def align_by_decl(lemma, tok, decl):
    """Taglio guidato dalla declinazione: si toglie l'uscita del NOMINATIVO."""
    L = norm(lemma)
    if decl == 1:
        base = L[:-1] if L.endswith(("a", "e")) else (L[:-2] if L.endswith("es") else L)
    elif decl == 2:
        if L.endswith(("us", "um", "os", "on")):
            base = L[:-2]
        elif L.endswith("ius"):
            base = L[:-3]
        elif L.endswith("er"):
            base = L            # puer→pueri (l'eventuale sincope ager→agri la dà il token)
        else:
            base = L
    elif decl == 4:
        base = L[:-2] if L.endswith("us") else (L[:-1] if L.endswith("u") else L)
    elif decl == 5:
        base = L[:-2] if L.endswith("es") else L
    else:                        # 3ª: il tema non è deducibile → sovrapposizione
        return align_overlap(lemma, tok)
    return base + tok


def align_min_k(lemma, tok):
    """Il taglio più piccolo che non duplichi materiale: k = 1 se il token
    riparte da vocale/consonante già presente, altrimenti 0."""
    L = norm(lemma)
    if L and tok and L[-1] == tok[0]:
        return L[:-1] + tok
    return L + tok


# uscita attesa del genitivo sg. per declinazione (per il punteggio)
_END_DECL = {1: ("ae",), 2: ("i",), 3: ("is",), 4: ("us",), 5: ("ei", "i")}


def candidati(lemma, tok):
    """Tutti gli allineamenti possibili: si toglie k al lemma e si appende il
    token (k=0…6), più il token da solo (casi in cui L&S dà il genitivo INTERO:
    aper→apri). Nessuna regola a priori: la scelta la fa il punteggio."""
    L = norm(lemma)
    out = {L[:len(L) - k] + tok for k in range(0, min(len(L), 6) + 1)}
    out.add(tok)
    return out


def align_scan(lemma, tok, decl, attested=None):
    """Genera i candidati e sceglie col punteggio. Il segnale più forte è
    l'ATTESTAZIONE: se la forma esiste già nell'indice delle forme di quel
    lemma, è quella giusta — è dato, non congettura."""
    L = norm(lemma)
    att = attested or set()
    best, bestscore = None, None
    for c in candidati(lemma, tok):
        s = 0
        if c in att:
            s += 100                                    # attestata: prova documentale
        if c.endswith(_END_DECL.get(decl, ())):
            s += 20                                     # uscita coerente con la declinazione
        cp = os.path.commonprefix([L, c])
        s += 2 * len(cp)                                # deve condividere il tema col nominativo
        if c == L and decl != 4:
            s -= 30                                     # gen = nom solo alla 4ª (manus, manus)
        s -= abs(len(c) - len(L))                       # a parità, il più vicino al nominativo
        s -= 0.1 * len(c)                               # a parità, il più breve (anti «agergri»)
        if bestscore is None or s > bestscore:
            best, bestscore = c, s
    return best


STRATEGIE = {
    "overlap": lambda l, t, d, a=None: align_overlap(l, t),
    "by_decl": lambda l, t, d, a=None: align_by_decl(l, t, d),
    "min_k": lambda l, t, d, a=None: align_min_k(l, t),
    "scan": align_scan,
}


def load_paradigms():
    par = {}
    for f in glob.glob(os.path.join(DATA, LANG, "paradigms", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        par.update(json.load(open(f, encoding="utf-8")).get("paradigms", {}))
    return par


def load_defs():
    dd = {}
    for f in glob.glob(os.path.join(DATA, LANG, "*.json")) + glob.glob(os.path.join(DATA, LANG, "archive", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for k, e in json.load(open(f, encoding="utf-8")).get("dict", {}).items():
            dd.setdefault(k, e.get("definition", "") or "")
    return dd


def gold_gen(par):
    """genitivo singolare vero dal paradigma (concatenazione dei segmenti)."""
    try:
        return norm("".join(s[0] for s in par["nome"]["sg"]["gen"]))
    except Exception:
        return None


def load_attested(keys):
    """{chiave_lemma: set(forme attestate)} dall'indice piatto delle forme.
    È la prova documentale su cui si appoggia il punteggio dell'allineamento."""
    want = set(keys)
    att = collections.defaultdict(set)
    for f in glob.glob(os.path.join(DATA, LANG, "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for forma, cands in json.load(open(f, encoding="utf-8")).get("forms", {}).items():
            for c in cands:
                lem = c.get("lemma")
                if lem in want:
                    att[lem].add(norm(forma))
    return att


def segmento():
    """worklist LAT-N → {chiave_sorgente: (decl, id, lemma)}."""
    idmap = C.load_id_map("lat")
    rev = {v: k for k, v in idmap.items()}
    out = {}
    for s in ("1", "2", "3", "4", "5"):
        p = os.path.join(DATA, LANG, "_worklist", f"LAT-N-{s}.json")
        if not os.path.exists(p):
            continue
        for r in json.load(open(p, encoding="utf-8")).get("lemmi", []):
            k = rev.get(r["id"])
            if k:
                out[k] = (int(s), r["id"], r["lemma"])
    return out


def main():
    par = load_paradigms()
    defs = load_defs()
    seg = segmento()

    gold, target = [], []
    for key, (decl, rid, lemma) in seg.items():
        d = defs.get(key, "")
        p = par.get(key)
        g = gold_gen(p) if p else None
        (gold if g else target).append({"key": key, "lemma": lemma, "decl": decl, "id": rid, "defn": d, "gold": g})

    # ---- stadio 1: notazione ----
    est = 0
    for r in gold + target:
        tok, gen = parse_notation(r["lemma"], r["defn"])
        r["tok"], r["gen_gramm"] = tok, gen
        if tok:
            est += 1
    print(f"GOLD (paradigma già corretto): {len(gold)} · TARGET (senza paradigma): {len(target)}")
    print(f"\n① NOTAZIONE · token estratto: {est}/{len(gold)+len(target)} "
          f"({100*est/max(len(gold)+len(target),1):.1f}%)")
    tg = sum(1 for r in target if r["tok"])
    print(f"   di cui sui TARGET: {tg}/{len(target)} ({100*tg/max(len(target),1):.1f}%)")

    # ---- stadio 2: allineamento, misurato sul gold ----
    attested = load_attested([r["key"] for r in gold + target])
    n_att = sum(1 for r in gold + target if attested.get(r["key"]))
    print(f"   forme attestate disponibili per {n_att}/{len(gold)+len(target)} lemmi")

    print(f"\n② ALLINEAMENTO · accuratezza sul gold (solo dove il token c'è):")
    valutabili = [r for r in gold if r["tok"]]
    best, bestname = -1, None
    for nome, fn in STRATEGIE.items():
        ok = sum(1 for r in valutabili
                 if fn(r["lemma"], r["tok"], r["decl"], attested.get(r["key"])) == r["gold"])
        pct = 100.0 * ok / max(len(valutabili), 1)
        print(f"   {nome:9s} {ok:5d}/{len(valutabili)}  {pct:5.1f}%")
        if ok > best:
            best, bestname = ok, nome
    print(f"   → migliore: {bestname}")

    # per declinazione, con la strategia migliore
    fn = STRATEGIE[bestname]
    perd = collections.defaultdict(lambda: [0, 0])
    errori = []
    for r in valutabili:
        got = fn(r["lemma"], r["tok"], r["decl"], attested.get(r["key"]))
        perd[r["decl"]][1] += 1
        if got == r["gold"]:
            perd[r["decl"]][0] += 1
        elif len(errori) < 12:
            errori.append(f"{r['lemma']} (d{r['decl']}) tok={r['tok']!r} → {got!r} ≠ {r['gold']!r}")
    print(f"\n   per declinazione ({bestname}):")
    for d in sorted(perd):
        o, t = perd[d]
        print(f"     {d}ª  {o:5d}/{t:5d}  {100*o/max(t,1):5.1f}%")
    print("\n   errori campione:")
    for e in errori:
        print("     ✗", e)

    # token mancanti sul gold: quanto perdiamo in notazione
    senza_tok = [r for r in gold if not r["tok"]]
    print(f"\n   gold senza token estratto: {len(senza_tok)} — campione:")
    for r in senza_tok[:6]:
        print(f"     {r['lemma']:16s} ({r['gold']}) ← {r['defn'][:70]}")

    if "--dump" in sys.argv:
        os.makedirs(os.path.join(BUILD, "reports"), exist_ok=True)
        json.dump({"gold": gold, "target": target, "strategia": bestname},
                  open(os.path.join(BUILD, "reports", "genitivi.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"\n→ _build/reports/genitivi.json")


if __name__ == "__main__":
    main()
