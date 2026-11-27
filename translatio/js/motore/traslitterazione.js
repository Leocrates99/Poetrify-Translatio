/* ============================================================================
   TRASLITTERAZIONE · il greco in lettere latine, alla maniera della scuola
   ----------------------------------------------------------------------------
   Serve alla nota di lessico (parola · traslitterazione · «traduzione»).
   Convenzione: η ē, ω ō; con il circonflesso ê, ô; υ y, ma u nei dittonghi
   (au, eu, ēu, ou); θ th, φ ph, χ ch, ψ ps; γ nasale davanti a γ κ ξ χ → n;
   spirito aspro → h davanti alla vocale (o al dittongo) e dopo ρ iniziale
   (rh); iota sottoscritto → i; accento acuto e grave dove stanno nel greco.
   Il modulo condiviso (modules/dictionary/transliteration.js) posa l'accento
   sulla h e sbaglia lo spirito sui dittonghi (ohŷtos per οὗτος): qui no.
   ============================================================================ */

const LETTERE = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k',
  λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't',
  υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō', ϝ: 'w', ϲ: 's',
};
const VOCALI = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
const ACUTO = '́', GRAVE = '̀', PERISPOMENI = '͂', ASPRO = '̔',
  DOLCE = '̓', SOTTOSCRITTO = 'ͅ', DIERESI = '̈';

/* Una lettera greca con i suoi segni: { base, maiuscola, accento, aspro, iota, dieresi } */
function segmenta(parola) {
  const out = [];
  for (const ch of parola.normalize('NFD')) {
    const base = ch.toLowerCase();
    if (LETTERE[base] || VOCALI.has(base)) {
      out.push({ base, maiuscola: ch !== base, accento: '', aspro: false, iota: false, dieresi: false });
      continue;
    }
    const ultima = out[out.length - 1];
    if (!ultima) continue;
    if (ch === ACUTO || ch === GRAVE || ch === PERISPOMENI) ultima.accento = ch;
    else if (ch === ASPRO) ultima.aspro = true;
    else if (ch === SOTTOSCRITTO) ultima.iota = true;
    else if (ch === DIERESI) ultima.dieresi = true;
    /* lo spirito dolce, la lunga e la breve non si scrivono */
    else if (ch !== DOLCE && !/[̀-ͯ]/.test(ch)) out.push({ altro: ch });
  }
  return out;
}

function vocale(l) {
  const base = LETTERE[l.base];
  /* la dieresi prima dell'accento: ΐ → ḯ, non í̈ */
  let s = base + (l.dieresi ? DIERESI : '');
  if (l.accento === PERISPOMENI) {
    /* il circonflesso prende il posto della lunga: ῆ → ê, ῶ → ô */
    s = ({ 'ē': 'e', 'ō': 'o' }[base] || base) + (l.dieresi ? DIERESI : '') + '\u0302';
  } else if (l.accento) s += l.accento === GRAVE ? GRAVE : ACUTO;
  if (l.iota) s += 'i';
  return s;
}

function parolaInLatino(parola) {
  const L = segmenta(parola);
  let s = '';
  let inizio = true;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (l.altro != null) { s += l.altro; inizio = true; continue; }
    const prossima = L[i + 1] && L[i + 1].base;
    let pezzo;
    if (VOCALI.has(l.base)) {
      /* dittongo con υ: au eu ēu ou, e lo spirito e l'accento stanno sulla seconda */
      const ditt = ['α', 'ε', 'η', 'ο'].includes(l.base) && prossima === 'υ' && !L[i + 1].dieresi;
      const dittIota = ['α', 'ε', 'ο', 'υ'].includes(l.base) && prossima === 'ι' && !L[i + 1].dieresi;
      const aspro = inizio && (l.aspro || ((ditt || dittIota) && L[i + 1].aspro));
      if (ditt) {
        const u = { ...L[i + 1] };
        pezzo = vocale({ ...l, accento: '' }) + ('u' + (u.accento === PERISPOMENI ? '̂' : u.accento ? (u.accento === GRAVE ? GRAVE : ACUTO) : ''));
        i++;
      } else if (dittIota) {
        pezzo = vocale({ ...l, accento: '' }) + vocale(L[i + 1]);
        i++;
      } else pezzo = vocale(l);
      if (aspro) pezzo = 'h' + pezzo;
    } else if (l.base === 'γ' && ['γ', 'κ', 'ξ', 'χ'].includes(prossima)) {
      pezzo = 'n';
    } else if (l.base === 'ρ' && l.aspro) {
      pezzo = 'rh';
    } else {
      pezzo = LETTERE[l.base] || '';
    }
    if (l.maiuscola) pezzo = pezzo.charAt(0).toUpperCase() + pezzo.slice(1);
    s += pezzo;
    inizio = false;
  }
  return s.normalize('NFC');
}

/** Traslittera un testo greco, parola per parola; il resto passa com'e'. */
export function traslittera(testo) {
  return String(testo || '').replace(/[\p{Script=Greek}̀-ͯ᾽᾿῾]+/gu, parolaInLatino);
}
