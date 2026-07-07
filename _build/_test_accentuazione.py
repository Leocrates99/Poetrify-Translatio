# -*- coding: utf-8 -*-
"""Gold test del motore di accentazione: paradigmi nominali completi con accenti
corretti (acuto/circonflesso), incluse le quantità dei dichrona."""
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from accentuation import accent_nominal, nominal_idx_start

E = {
 '2':  dict(sg=[('nom','ος',0),('gen','ου',1),('dat','ῳ',1),('acc','ον',0),('voc','ε',0)],
            pl=[('nom','οι',0),('gen','ων',1),('dat','οις',1),('acc','ους',0),('voc','οι',0)]),
 '2n': dict(sg=[('nom','ον',0),('gen','ου',1),('dat','ῳ',1),('acc','ον',0),('voc','ον',0)],
            pl=[('nom','α',0),('gen','ων',1),('dat','οις',1),('acc','α',0),('voc','α',0)]),
 '1h': dict(sg=[('nom','η',0),('gen','ης',1),('dat','ῃ',1),('acc','ην',0),('voc','η',0)],
            pl=[('nom','αι',0),('gen','ων',1),('dat','αις',1),('acc','ας',0),('voc','αι',0)]),
 '1a': dict(sg=[('nom','α',0),('gen','ας',1),('dat','ᾳ',1),('acc','αν',0),('voc','α',0)],
            pl=[('nom','αι',0),('gen','ων',1),('dat','αις',1),('acc','ας',0),('voc','αι',0)]),
 '1am':dict(sg=[('nom','α',0),('gen','ης',1),('dat','ῃ',1),('acc','αν',0),('voc','α',0)],
            pl=[('nom','αι',0),('gen','ων',1),('dat','αις',1),('acc','ας',0),('voc','αι',0)]),
 '1m': dict(sg=[('nom','ης',0),('gen','ου',1),('dat','ῃ',1),('acc','ην',0),('voc','α',0)],
            pl=[('nom','αι',0),('gen','ων',1),('dat','αις',1),('acc','ας',0),('voc','αι',0)]),
 'ma': dict(sg=[('nom','α',0),('gen','ατος',1),('dat','ατι',1),('acc','α',0),('voc','α',0)],
            pl=[('nom','ατα',0),('gen','ατων',1),('dat','ασι',1),('acc','ατα',0),('voc','ατα',0)]),
 'es': dict(sg=[('nom','ος',0),('gen','ους',1),('dat','ει',1),('acc','ος',0),('voc','ος',0)],
            pl=[('nom','η',0),('gen','ων',1),('dat','εσι',1),('acc','η',0),('voc','η',0)]),
 'is': dict(sg=[('nom','ις',0),('gen','εως',1),('dat','ει',1),('acc','ιν',0),('voc','ι',0)],
            pl=[('nom','εις',0),('gen','εων',1),('dat','εσι',1),('acc','εις',0),('voc','εις',0)]),
}
E['3'] = dict(sg=[('nom','#',0),('gen','ος',1),('dat','ι',1),('acc','α',0),('voc','#',0)],
              pl=[('nom','ες',0),('gen','ων',1),('dat','_',1),('acc','ας',0),('voc','ες',0)])

# (lemma, klass, stem, atteso-sg, atteso-pl)  ·  dat.pl. 3ª decl. saltato (_)
GOLD = [
 ('χώρα','1a','χωρ',      'χώρα χώρας χώρᾳ χώραν χώρα',        'χῶραι χωρῶν χώραις χώρας χῶραι'),
 ('τιμή','1h','τιμ',      'τιμή τιμῆς τιμῇ τιμήν τιμή',        'τιμαί τιμῶν τιμαῖς τιμάς τιμαί'),
 ('θάλασσα','1am','θαλασσ','θάλασσα θαλάσσης θαλάσσῃ θάλασσαν θάλασσα','θάλασσαι θαλασσῶν θαλάσσαις θαλάσσας θάλασσαι'),
 ('λόγος','2','λογ',      'λόγος λόγου λόγῳ λόγον λόγε',       'λόγοι λόγων λόγοις λόγους λόγοι'),
 ('θεός','2','θε',        'θεός θεοῦ θεῷ θεόν θεέ',            'θεοί θεῶν θεοῖς θεούς θεοί'),
 ('ὁδός','2','ὁδ',        'ὁδός ὁδοῦ ὁδῷ ὁδόν ὁδέ',            'ὁδοί ὁδῶν ὁδοῖς ὁδούς ὁδοί'),
 ('ἄνθρωπος','2','ἀνθρωπ','ἄνθρωπος ἀνθρώπου ἀνθρώπῳ ἄνθρωπον ἄνθρωπε','ἄνθρωποι ἀνθρώπων ἀνθρώποις ἀνθρώπους ἄνθρωποι'),
 ('δῶρον','2n','δωρ',     'δῶρον δώρου δώρῳ δῶρον δῶρον',      'δῶρα δώρων δώροις δῶρα δῶρα'),
 ('μῦθος','2','μυθ',      'μῦθος μύθου μύθῳ μῦθον μῦθε',       'μῦθοι μύθων μύθοις μύθους μῦθοι'),   # υ lunga (inferenza)
 ('σῶμα','ma','σωμ',      'σῶμα σώματος σώματι σῶμα σῶμα',     'σώματα σωμάτων σώμασι σώματα σώματα'),
 ('γένος','es','γεν',     'γένος γένους γένει γένος γένος',    'γένη γενῶν γένεσι γένη γένη'),
 ('πόλις','is','πολ',     'πόλις πόλεως πόλει πόλιν πόλι',     'πόλεις πόλεων πόλεσι πόλεις πόλεις'),
 ('πολίτης','1m','πολιτ', 'πολίτης πολίτου πολίτῃ πολίτην πολῖτα','πολῖται πολιτῶν πολίταις πολίτας πολῖται'),  # ι lunga (-ίτης)
 ('ναύτης','1m','ναυτ',   'ναύτης ναύτου ναύτῃ ναύτην ναῦτα', 'ναῦται ναυτῶν ναύταις ναύτας ναῦται'),        # αυ dittongo
 ('φύλαξ','3','φυλακ',    'φύλαξ φύλακος φύλακι φύλακα φύλαξ', 'φύλακες φυλάκων _ φύλακας φύλακες'),
]

def gen(lemma, kl, stem, num):
    idx = nominal_idx_start(lemma)
    out = []
    for case, end, gd in E[kl][num]:
        if end == '#': out.append(lemma); continue
        if end == '_': out.append('_'); continue
        out.append(accent_nominal(lemma, kl, stem + end, end, bool(gd), idx))
    return ' '.join(out)

fails = 0
for lemma, kl, stem, exp_sg, exp_pl in GOLD:
    got_sg = gen(lemma, kl, stem, 'sg')
    got_pl = gen(lemma, kl, stem, 'pl')
    ok = got_sg == exp_sg and got_pl == exp_pl
    print(f"{'OK  ' if ok else 'FAIL'} {lemma}")
    if not ok:
        fails += 1
        if got_sg != exp_sg: print(f'      SG atteso: {exp_sg}\n         ottenuto: {got_sg}')
        if got_pl != exp_pl: print(f'      PL atteso: {exp_pl}\n         ottenuto: {got_pl}')

print(f"\n{'TUTTO OK' if not fails else str(fails)+' PARADIGMI FALLITI'}")
sys.exit(1 if fails else 0)
