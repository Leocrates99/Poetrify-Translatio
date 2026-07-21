# -*- coding: utf-8 -*-
"""Betacode → greco politonico Unicode.

I testi Perseus (L&S, LSJ) scrivono il greco in BETACODE, la traslitterazione
ASCII usata prima di Unicode: «lo/gos» = λόγος, «basilikh/» = βασιλική,
«*)aqh=nai» = Ἀθῆναι. Senza conversione le etimologie greche di L&S entrerebbero
nel dizionario come rumore ASCII.

Convenzione: la lettera precede i suoi segni · ) spirito dolce · ( aspro ·
/ acuto · \\ grave · = circonflesso · + dieresi · | iota sottoscritto ·
* prefisso di maiuscola. Il sigma finale si risolve dalla posizione.

Uso come modulo:  from betacode import beta2gr
Uso da riga di comando:  python betacode.py --test
"""
import re, unicodedata

_L = {
    "a": "α", "b": "β", "g": "γ", "d": "δ", "e": "ε", "z": "ζ", "h": "η", "q": "θ",
    "i": "ι", "k": "κ", "l": "λ", "m": "μ", "n": "ν", "c": "ξ", "o": "ο", "p": "π",
    "r": "ρ", "s": "σ", "t": "τ", "u": "υ", "f": "φ", "x": "χ", "y": "ψ", "w": "ω",
    "v": "ϝ",
}
_D = {")": "̓", "(": "̔", "/": "́", "\\": "̀",
      "=": "͂", "+": "̈", "|": "ͅ"}
# ordine canonico dei segni: dieresi → spirito → accento → iota
_ORD = {"̈": 0, "̓": 1, "̔": 1, "́": 2, "̀": 2, "͂": 2, "ͅ": 3}

_SEGNI = ")(/\\=+|"
_ACCENTI = "/\\="
_SPIRITI = ")("


def _componi(ch, segni, maiusc):
    base = _L.get(ch.lower())
    if not base:
        return None
    if maiusc:
        base = base.upper()
    marks = [_D[c] for c in segni if c in _D]
    marks.sort(key=lambda m: _ORD.get(m, 9))
    return unicodedata.normalize("NFC", base + "".join(marks))


def _parola(w):
    """converte una parola betacode risolvendo due ambiguità:
    · MAIUSCOLE: i segni PRECEDONO la lettera dopo l'asterisco (*)a = Ἀ);
    · PARENTESI del testo: uno spirito ) ( che segue un ACCENTO non è uno
      spirito (l'ordine betacode è spirito-poi-accento) ma punteggiatura:
      in «stoa/), the hall» quella ) chiude l'inciso, non aspira l'alfa."""
    out, i, n = [], 0, len(w)
    while i < n:
        c = w[i]
        if c == "*":                       # maiuscola: * segni lettera
            j = i + 1
            segni = ""
            while j < n and w[j] in _SEGNI:
                segni += w[j]; j += 1
            if j < n and w[j].isalpha():
                g = _componi(w[j], segni, True)
                out.append(g if g else w[i:j + 1])
                i = j + 1
                continue
            out.append(c); i += 1; continue
        if c.isalpha():
            j = i + 1
            segni = ""
            visto_accento = False
            while j < n and w[j] in _SEGNI:
                if w[j] in _SPIRITI and visto_accento:
                    break                  # è punteggiatura, non uno spirito
                if w[j] in _ACCENTI:
                    visto_accento = True
                segni += w[j]; j += 1
            g = _componi(c, segni, False)
            out.append(g if g else w[i:j])
            i = j
            continue
        out.append(c); i += 1
    s = "".join(out)
    # σ finale → ς (anche prima di punteggiatura)
    s = re.sub(r"σ(?=$|[^\wΑ-Ωα-ωἀ-ῼ])", "ς", s)
    return s


# parole plausibilmente betacode: contengono un segno diacritico betacode,
# oppure sono sequenze di sole lettere greche traslitterate dopo un marcatore.

# Il candidato deve iniziare con l'asterisco di maiuscola o con una LETTERA:
# uno spirito iniziale isolato è la parentesi del testo, non betacode
# (in «(sc. stoa/)» quella ( apre l'inciso).
_CAND = re.compile(r"(?<![A-Za-z0-9])((?:\*[)(/\\=+|]*)?[a-zA-Z][a-zA-Z)(/\\=+|]*)")


def beta2gr(testo):
    """converte le sequenze betacode dentro un testo misto latino/inglese."""
    if not testo:
        return testo

    def sub(m):
        w = m.group(1)
        if not any(c in w for c in ")(/\\=+|"):
            return w
        g = _parola(w)
        return g if g != w else w

    return _CAND.sub(sub, testo)


_PROVE = [
    ("lo/gos", "λόγος"),
    ("basilikh/", "βασιλική"),
    ("lapa/ra", "λαπάρα"),
    ("a)nh/r", "ἀνήρ"),
    ("stoa/", "στοά"),
    ("*)aqh=nai", "Ἀθῆναι"),
    ("th=|", "τῇ"),
    ("kai/", "καί"),
    ("yuxh/", "ψυχή"),
    ("o(do/s", "ὁδός"),
    ("ei)mi/", "εἰμί"),
    ("a)/nqrwpos", "ἄνθρωπος"),
    ("*(rw/mh", "Ῥώμη"),
    ("gnw=qi", "γνῶθι"),
]


def _test():
    ok = 0
    for b, atteso in _PROVE:
        got = beta2gr(b)
        good = unicodedata.normalize("NFC", got) == unicodedata.normalize("NFC", atteso)
        ok += good
        print(f"  {'OK ' if good else 'NO '} {b:14s} → {got:12s} (atteso {atteso})")
    print(f"\n  {ok}/{len(_PROVE)} conversioni corrette")
    # il testo misto non deve essere toccato dove non c'è betacode
    misto = "a portico, basilica; in Rome, basilikh/ (sc. stoa/), the hall"
    print(f"\n  misto: {beta2gr(misto)}")
    return ok == len(_PROVE)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(0 if _test() else 1)
