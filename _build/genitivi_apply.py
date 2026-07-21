# -*- coding: utf-8 -*-
"""S.3/④ · APPLICA i genitivi giudicati: rigenera i paradigmi e ripulisce
l'indice delle forme dalle voci prodotte col genitivo sbagliato.

Ingresso: _build/reports/genitivi_giudizi.json  {key: {genitivo,numero,declinazione,genere,confidenza,fonte}}
Per ogni lemma:
  · ricostruisce la tabella con gen_paradigms.lat_noun_table(genitivo CORRETTO)
  · calcola le forme VECCHIE (dal genitivo memorizzato) e le NUOVE
  · toglie dal core le forme «vecchie e non più valide» e aggiunge le nuove

GUARDIA: si cancellano solo le voci-forma col parsing del GENERATORE (contiene
«decl.»); quelle attestate dal corpus (parsing vuoto, da CLTK) non si toccano mai.
Uso: python genitivi_apply.py [--dry]
"""
import os, sys, json, glob, shutil, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
from gen_paradigms import lat_noun_table, _cat_nominale
from gen_latin_forms import gen_noun
import extract_genitives as X
sys.stdout.reconfigure(encoding="utf-8")

DRY = "--dry" in sys.argv
DATA = X.DATA
BUILD = os.path.dirname(os.path.abspath(__file__))
GIUD = os.path.join(BUILD, "reports", "genitivi_giudizi.json")
for _i, _a in enumerate(sys.argv):        # --in <file>: sorgente alternativa dei giudizi
    if _a == "--in" and _i + 1 < len(sys.argv):
        GIUD = os.path.abspath(sys.argv[_i + 1])
BACKUP = os.path.join(BUILD, "backup", "genitivi")


def raw_for(gen_full, decl):
    """gen_raw pilota i rami 4ª (serve la ū lunga) e nulla più."""
    return "ūs" if decl == 4 else gen_full[-2:]


def _c(st, d):
    return [[st, "t"], [d, "d"]]


def lat_noun_table_pl(lemma, gen_pl, decl, gender):
    """PLURALIA TANTUM: il lemma non ha singolare, la tabella è il solo blocco
    plurale, ricostruito dal genitivo PLURALE che L&S dà come uscita del lemma
    («Abdera ōrum» → abderorum; «sordes ium» → sordium)."""
    g = X.norm(gen_pl)
    if decl == 1 and g.endswith("arum"):
        st = g[:-4]; cl = "1ª declinazione (plurale tantum)"
        ae = _c(st, "ae")
        pl = dict(nom=ae, gen=_c(st, "arum"), dat=_c(st, "is"), acc=_c(st, "as"), voc=ae, abl=_c(st, "is"))
    elif decl == 2 and g.endswith("orum"):
        st = g[:-4]
        if gender == "n":
            cl = "2ª declinazione (neutro, plurale tantum)"
            a = _c(st, "a")
            pl = dict(nom=a, gen=_c(st, "orum"), dat=_c(st, "is"), acc=a, voc=a, abl=_c(st, "is"))
        else:
            cl = "2ª declinazione (plurale tantum)"
            i = _c(st, "i")
            pl = dict(nom=i, gen=_c(st, "orum"), dat=_c(st, "is"), acc=_c(st, "os"), voc=i, abl=_c(st, "is"))
    elif decl == 3 and g.endswith(("ium", "um")):
        istem = g.endswith("ium")
        st = g[:-3] if istem else g[:-2]
        gpl = "ium" if istem else "um"
        cl = "3ª declinazione" + (" (tema in -i)" if istem else "") + " (plurale tantum)"
        if gender == "n":
            a = _c(st, "ia" if istem else "a")
            pl = dict(nom=a, gen=_c(st, gpl), dat=_c(st, "ibus"), acc=a, voc=a, abl=_c(st, "ibus"))
        else:
            es = _c(st, "es")
            pl = dict(nom=es, gen=_c(st, gpl), dat=_c(st, "ibus"), acc=es, voc=es, abl=_c(st, "ibus"))
    elif decl == 4 and g.endswith("uum"):
        st = g[:-3]; cl = "4ª declinazione (plurale tantum)"
        us = _c(st, "us")
        pl = dict(nom=us, gen=_c(st, "uum"), dat=_c(st, "ibus"), acc=us, voc=us, abl=_c(st, "ibus"))
    elif decl == 5 and g.endswith("erum"):
        st = g[:-4]; cl = "5ª declinazione (plurale tantum)"
        es = _c(st, "es")
        pl = dict(nom=es, gen=_c(st, "erum"), dat=_c(st, "ebus"), acc=es, voc=es, abl=_c(st, "ebus"))
    else:
        return None
    return dict(classe=cl, tab={"pl": pl})


def forme_da_tabella(tab, decl):
    """forma → parsing, dal blocco plurale (i casi omografi si fondono)."""
    out = collections.defaultdict(list)
    for caso, cell in tab.get("pl", {}).items():
        forma = "".join(s[0] for s in cell)
        out[forma].append(f"{caso}. pl.")
    return {f: [f"{' · '.join(sorted(set(p)))} ({decl}ª decl.)"] for f, p in out.items()}


def j(c):
    return "".join(x[0] for x in c).lower()


def main():
    giud = json.load(open(GIUD, encoding="utf-8"))
    par_files = {}
    for f in glob.glob(os.path.join(DATA, "latin", "paradigms", "*.json")):
        if not os.path.basename(f).startswith("_"):
            par_files[os.path.splitext(os.path.basename(f))[0]] = json.load(open(f, encoding="utf-8"))
    par = {}
    for letter, d in par_files.items():
        for k, v in d.get("paradigms", {}).items():
            par[k] = (letter, v)

    seg = X.segmento()
    rigenerati, saltati, plurali = 0, [], []
    purge = collections.defaultdict(list)   # lettera → [(forma, lemma)]
    aggiunte = collections.defaultdict(list)  # lettera → [(forma, lemma, parsing)]
    nuovi_par = {}                          # key → (letter, entry)

    for key, g in giud.items():
        if key not in seg:
            saltati.append((key, "fuori segmento")); continue
        if g.get("confidenza") == "bassa":
            saltati.append((key, "confidenza bassa")); continue
        gen_new = X.norm(g.get("genitivo") or "")
        genere = (g.get("genere") or "m")[:1]
        decl = int(g.get("declinazione") or 0)
        pl_tantum = g.get("numero") == "pl"
        if not gen_new or decl not in (1, 2, 3, 4, 5):
            saltati.append((key, "indeclinabile / giudizio senza declinazione")); continue

        # la CHIAVE può portare il numero d'omografo (accensus1): per la
        # morfologia serve il lemma pulito, altrimenti il nominativo esce col «1».
        lemma = seg[key][2]
        tab = (lat_noun_table_pl(lemma, gen_new, decl, genere) if pl_tantum
               else lat_noun_table(lemma, gen_new, raw_for(gen_new, decl), genere))
        if not tab:
            saltati.append((key, f"tabella non costruibile da {gen_new!r}")); continue
        if pl_tantum:
            plurali.append(key)

        letter, old = par.get(key, (X.norm(key)[:1], None))
        # forme vecchie (dal genitivo memorizzato) vs nuove
        old_forms = {}
        if old and "nome" in old:
            nome_old = old["nome"]
            if "sg" in nome_old:
                gen_old = j(nome_old["sg"]["gen"])
                try:
                    old_forms = gen_noun(lemma, gen_old, raw_for(gen_old, decl), genere)
                except Exception:
                    old_forms = {}
            elif "pl" in nome_old:
                # il paradigma precedente era un plurale tantum: le forme vecchie
                # sono le sue stesse celle (caso dei falsi plurali, es. lamenta)
                old_forms = forme_da_tabella({"pl": nome_old["pl"]}, decl)
        new_forms = (forme_da_tabella(tab["tab"], decl) if pl_tantum
                     else gen_noun(lemma, gen_new, raw_for(gen_new, decl), genere))

        for forma in set(old_forms) - set(new_forms):
            purge[X.norm(forma)[:1]].append((forma, key))
        for forma, plist in new_forms.items():
            aggiunte[X.norm(forma)[:1]].append((forma, key, " / ".join(sorted(set(plist)))))

        nuovi_par[key] = (letter, {
            "pos": "Sostantivo",
            "cat": _cat_nominale(tab["classe"]),
            "classe": tab["classe"],
            "testa": f"{lemma}, {gen_new} {genere}",
            "nome": tab["tab"],
            **({"nota": "plurale tantum: privo di singolare"} if pl_tantum else {}),
        })
        rigenerati += 1

    n_purge = sum(len(v) for v in purge.values())
    n_add = sum(len(v) for v in aggiunte.values())
    print(f"paradigmi da (ri)generare: {rigenerati}")
    print(f"  plurali tantum trattati: {len(plurali)} · saltati: {len(saltati)}")
    for m, c in collections.Counter(r for _, r in saltati).most_common():
        print(f"     {c:4d} {m}")
    print(f"forme fantasma da purgare: {n_purge} · forme da (ri)scrivere: {n_add}")
    if DRY:
        print("\n(--dry: nessuna scrittura)")
        for k in list(nuovi_par)[:5]:
            print(f"   {k}: {nuovi_par[k][1]['testa']}  cat={nuovi_par[k][1]['cat']}")
        return

    os.makedirs(BACKUP, exist_ok=True)
    tocca = {l for l in purge} | {l for l in aggiunte} | {l for l, _ in nuovi_par.values()}
    for letter in sorted(tocca):
        for sub in ("", "paradigms"):
            src = os.path.join(DATA, "latin", sub, f"{letter}.json") if sub else os.path.join(DATA, "latin", f"{letter}.json")
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(BACKUP, f"{sub or 'core'}_{letter}.json"))
    print(f"backup in {BACKUP}")

    # ── paradigmi ──
    for key, (letter, entry) in nuovi_par.items():
        par_files.setdefault(letter, {"meta": {}, "paradigms": {}})
        par_files[letter].setdefault("paradigms", {})[key] = entry
    for letter, d in par_files.items():
        if letter in {l for l, _ in nuovi_par.values()}:
            json.dump(d, open(os.path.join(DATA, "latin", "paradigms", f"{letter}.json"), "w", encoding="utf-8"),
                      ensure_ascii=False, indent=0)

    # ── forme nel core ──
    tolte = messe = protette = 0
    for letter in sorted(set(purge) | set(aggiunte)):
        path = os.path.join(DATA, "latin", f"{letter}.json")
        if not os.path.exists(path):
            continue
        data = json.load(open(path, encoding="utf-8"))
        fdict = data.setdefault("forms", {})
        for forma, lemma in purge.get(letter, []):
            voci = fdict.get(forma)
            if not voci:
                continue
            tenute = []
            for v in voci:
                if v.get("lemma") == lemma and "decl." in (v.get("parsing") or ""):
                    tolte += 1                       # voce del generatore: si toglie
                else:
                    if v.get("lemma") == lemma:
                        protette += 1                # attestata dal corpus: si protegge
                    tenute.append(v)
            if tenute:
                fdict[forma] = tenute
            else:
                del fdict[forma]
        for forma, lemma, parsing in aggiunte.get(letter, []):
            voci = fdict.setdefault(forma, [])
            if not any(v.get("lemma") == lemma and v.get("parsing") == parsing for v in voci):
                voci.append({"lemma": lemma, "parsing": parsing})
                messe += 1
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)

    print(f"\nforme fantasma rimosse: {tolte} · forme corrette scritte: {messe} · voci attestate protette: {protette}")
    print(f"paradigmi scritti: {len(nuovi_par)}")
    if plurali:
        json.dump(plurali, open(os.path.join(BUILD, "reports", "genitivi_plurali_tantum.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"→ plurali tantum da trattare a parte: _build/reports/genitivi_plurali_tantum.json ({len(plurali)})")


if __name__ == "__main__":
    main()
