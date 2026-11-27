/* ============================================================================
   STILE DEL DOCUMENTO · la veste C2 compatta, alla misura del foglio
   ----------------------------------------------------------------------------
   Sta in una stringa perche' deve viaggiare con il documento: Translatio la
   inietta nella pagina per l'anteprima e la stampa, e la copia dentro il file
   .html che lo studente scarica, che cosi' non ha bisogno di altri file.

   Le misure sono quelle della C2 sul foglio A4 (96 dpi): corpo 10 pt
   (13,33 px), 9 pt (12 px), note 7 pt (9,33 px); colonna di margine 120 px,
   canale 18 px; filetti 4 · 2 · 1 px; nessun fondo, nessuna ombra, nessun
   angolo arrotondato. Il foglio e' sempre bianco, anche col tema scuro: e'
   la carta che si consegna.

   I colori delle categorie restano quelli della casa (le undici tinte delle
   parti del discorso, i pigmenti dei casi, la palette dei morfemi): sono
   ricopiati qui, con nomi propri (--d-…), perche' il file scaricato non vede
   i token di Poetrify e perche' il tema scuro dell'applicazione non li tocchi.
   ============================================================================ */
export const CSS_DOCUMENTO = `
.documento {
  --d-ink: #111111; --d-muted: #444444; --d-note: #555555; --d-rule: #9a9a9a; --d-rule-soft: #d6d6d6;
  --d-accent: #b8400e;
  --d-sans: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --d-classico: 'Times New Roman', Times, 'Liberation Serif', Tinos, 'GFS Didot', serif;
  --d-margine: 120px; --d-canale: 18px;
  --d-m-p: #4d7c0f; --d-m-a: #7c3aed; --d-m-t: #111111; --d-m-v: #b45309; --d-m-s: #0f766e; --d-m-d: var(--d-accent);
  container-type: inline-size;
  box-sizing: border-box;
  max-width: 794px; margin: 0 auto; padding: 52px 56px 40px;
  background: #ffffff; color: var(--d-ink);
  font-family: var(--d-sans); font-size: 13.33px; line-height: 16px; font-weight: 400;
  text-align: left; font-kerning: normal;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.documento[data-lingua="greco"] { --d-accent: #1d4ed8; }
.documento *, .documento *::before, .documento *::after { box-sizing: border-box; }
.documento [lang="la"], .documento [lang="grc"] { font-family: var(--d-classico); }
.documento p, .documento ul, .documento dl, .documento dd, .documento h1, .documento h2 { margin: 0; padding: 0; }
.documento ul { list-style: none; }

/* testatina */
.documento .d-testa { padding-bottom: 14px; border-bottom: 4px solid var(--d-ink); margin-bottom: 18px; }
.documento .d-occhiello { font-size: 9.33px; line-height: 11.2px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--d-accent); }
.documento .d-titolo { margin-top: 6px; font-size: 26px; line-height: 30px; font-weight: 800; letter-spacing: -0.01em; color: var(--d-ink); }
.documento .d-autore { margin-top: 4px; font-size: 13.33px; color: var(--d-muted); }
.documento .d-dati { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0 18px; margin-top: 14px; border-top: 1px solid var(--d-rule); padding-top: 6px; }
.documento .d-dati dt { font-size: 9.33px; line-height: 11.2px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--d-note); }
.documento .d-dati dd { font-size: 13.33px; font-weight: 600; }

/* le sezioni: la colonna di margine appesa a sinistra; la prima sta gia'
   sotto il filetto di 4 px della testatina */
.documento .d-sez { display: grid; grid-template-columns: var(--d-margine) minmax(0, 1fr); column-gap: var(--d-canale); padding: 12px 0 14px; border-top: 1px solid var(--d-rule); }
.documento .d-testa + .d-sez { border-top: 0; padding-top: 0; }
.documento .d-margine { font-size: 9.33px; line-height: 11.2px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--d-accent); padding-top: 3px; }
.documento .d-numero { font-size: 30px; line-height: 30px; font-weight: 800; letter-spacing: -0.02em; text-transform: none; }
.documento .d-corpo { min-width: 0; }
.documento .d-brano { font-family: var(--d-classico); font-size: 15px; line-height: 21px; }
.documento .d-brano sup { font-family: var(--d-sans); font-size: 8px; font-weight: 700; color: var(--d-accent); margin-right: 2px; }
.documento .d-blocco { margin-top: 12px; }
.documento .d-blocco > .d-parole { margin-top: 2px; }
.documento .d-etichetta { font-size: 9.33px; line-height: 11.2px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--d-note); margin-bottom: 4px; }
.documento .d-nota { margin-top: 4px; font-size: 9.33px; line-height: 11.2px; color: var(--d-note); }
.documento .d-manca { color: var(--d-note); font-style: italic; }

/* la frase disegnata */
.documento .d-banco { display: flex; flex-wrap: wrap; align-items: flex-start; row-gap: 12px; padding: 4px 0 2px; }
.documento .d-cella { display: inline-flex; flex-direction: column; align-items: flex-start; padding: 0 5px; min-width: 0; }
.documento .d-cella-p { padding: 0 2px 0 0; margin-left: -5px; }
.documento .d-forma { font-family: var(--d-classico); font-size: 18px; line-height: 22px; padding-bottom: 2px; border-bottom: 2px solid var(--d-pos, var(--d-ink)); white-space: nowrap; }
.documento .d-cella-p .d-forma { border-bottom-color: transparent; color: var(--d-muted); }
.documento .d-forma.d-da-fare { border-bottom: 2px dotted var(--d-rule); }
/* l'analisi periodale: la sbarra dove comincia una proposizione, il riquadro
   del connettivo */
.documento .d-forma { position: relative; }
.documento .d-dopo-taglio::before { content: "/"; position: absolute; left: -0.5em; top: 0; font-weight: 700; color: var(--d-accent); }
.documento .d-connettivo { outline: 1px solid var(--d-ink); outline-offset: 1px; }
.documento .d-dati-periodo { margin-bottom: 4px; font-size: 12px; line-height: 14.5px; color: var(--d-muted); }
.documento .d-campione-sbarra { display: inline-block; width: 14px; font-family: var(--d-classico); font-weight: 700; font-size: 14px; color: var(--d-accent); text-align: center; }
.documento .d-campione-riquadro { display: inline-block; padding: 0 2px; font-family: var(--d-classico); font-size: 12px; line-height: 13px; outline: 1px solid var(--d-ink); }
.documento .d-sotto { display: grid; gap: 0; margin-top: 3px; min-height: 12px; font-size: 9.33px; line-height: 11.5px; }
.documento .d-pos { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: color-mix(in srgb, var(--d-pos, var(--d-note)) 58%, #000); }
.documento .d-lemma { font-family: var(--d-classico); font-size: 11px; color: var(--d-muted); }
.documento .d-an { color: var(--d-note); }
.documento .d-senso { font-style: italic; color: var(--d-ink); }
.documento .d-fili { display: grid; gap: 2px; width: 100%; margin-top: 4px; }
.documento .d-fili.d-sopra { margin: 0 0 4px; }
.documento .d-filo { display: block; height: 3px; margin: 0 -5px; background: var(--d-filo, var(--d-ink)); }
.documento .d-cella-p .d-filo { margin: 0; }
.documento .d-filo.d-vuoto { background: transparent; }
.documento .d-filo.d-inizio { margin-left: 1px; }
.documento .d-filo.d-fine { margin-right: 1px; }
.documento .d-etichetta-filo { display: block; position: relative; height: 10px; margin: 1px 0 0 1px; font-size: 8px; line-height: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--d-accent); }
.documento .d-etichetta-filo > span { position: absolute; left: 0; top: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.documento .d-sopra .d-etichetta-filo { margin: 0 0 1px 1px; }
.documento .d-etichetta-filo.d-vuoto { visibility: hidden; }
.documento .d-sopra .d-filo { height: 2px; }
.documento .d-sopra .d-filo.d-prop-subordinata { height: 1px; margin-top: 1px; }

/* le categorie: parti del discorso, casi, proposizioni, morfemi */
.documento [data-pos="sostantivo"] { --d-pos: #1F63D6; }
.documento [data-pos="verbo"] { --d-pos: #DC2B2B; }
.documento [data-pos="aggettivo"] { --d-pos: #0FA3A3; }
.documento [data-pos="pronome"] { --d-pos: #D19A16; }
.documento [data-pos="avverbio"] { --d-pos: #1FA24F; }
.documento [data-pos="preposizione"] { --d-pos: #9C2D8E; }
.documento [data-pos="congiunzione"] { --d-pos: #4A45C0; }
.documento [data-pos="numerale"] { --d-pos: #E9720C; }
.documento [data-pos="interiezione"] { --d-pos: #E5389A; }
.documento [data-pos="articolo"] { --d-pos: #17B4CE; }
.documento [data-pos="particella"] { --d-pos: #6B7280; }
.documento .d-caso-nom { --d-filo: #003153; }
.documento .d-caso-gen { --d-filo: #66023C; }
.documento .d-caso-dat { --d-filo: #FADA5E; }
.documento .d-caso-acc { --d-filo: #E3A857; }
.documento .d-caso-voc { --d-filo: #477D3B; }
.documento .d-caso-abl { --d-filo: #8E5A3C; }
.documento .d-caso-pred { --d-filo: #DC2B2B; }
.documento .d-caso-altro { --d-filo: #9a9a9a; }
.documento .d-prop-principale { --d-filo: var(--d-ink); }
.documento .d-prop-coordinata { --d-filo: var(--d-ink); }
.documento .d-filo.d-prop-coordinata, .documento .d-campione-linea.d-prop-coordinata { background: repeating-linear-gradient(90deg, var(--d-ink) 0 5px, transparent 5px 8px); }
.documento .d-prop-subordinata { --d-filo: var(--d-ink); }
.documento .d-m { padding: 0 0.5px; border-bottom: 1px solid currentColor; }
.documento .d-forma .d-m { border-bottom: 0; }
.documento .d-m-p { color: var(--d-m-p); }
.documento .d-m-a { color: var(--d-m-a); }
.documento .d-m-t { color: var(--d-m-t); }
.documento .d-m-v { color: var(--d-m-v); }
.documento .d-m-s { color: var(--d-m-s); }
.documento .d-m-d { color: var(--d-m-d); }
.documento .d-m-x { color: var(--d-ink); }
.documento .d-m + .d-m { margin-left: 1px; }

/* la tavola delle parole: fra filetto nero di 2 px e di 1 px, righe in grigio */
.documento .d-parole { width: 100%; margin-top: 12px; border-collapse: collapse; border-top: 2px solid var(--d-ink); border-bottom: 1px solid var(--d-ink); font-size: 12px; line-height: 14.5px; }
.documento .d-parole th { padding: 4px 6px 3px 0; text-align: left; vertical-align: bottom; font-size: 9.33px; line-height: 11.2px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--d-note); border-bottom: 1px solid var(--d-ink); }
.documento .d-parole td { padding: 4px 6px 4px 0; vertical-align: top; border-bottom: 1px solid var(--d-rule-soft); }
.documento .d-parole tr:last-child td { border-bottom: 0; }
.documento .d-parole .d-n { width: 22px; color: var(--d-note); font-size: 9.33px; }
.documento .d-parole tr[data-pos] .d-n { box-shadow: inset 3px 0 0 var(--d-pos); padding-left: 6px; }
.documento .d-parole thead .d-n { padding-left: 0; }
.documento .d-forma-tav { font-family: var(--d-classico); font-size: 14px; white-space: nowrap; }
.documento .d-lemma-tav { font-family: var(--d-classico); font-size: 13px; }
.documento .d-pos-tav { font-weight: 700; color: color-mix(in srgb, var(--d-pos, var(--d-ink)) 58%, #000); }
.documento .d-note { margin-top: 8px; display: grid; gap: 3px; font-size: 12px; line-height: 14.5px; }
.documento .d-note div { display: grid; grid-template-columns: max-content 1fr; gap: 0 8px; }
.documento .d-note dt { font-family: var(--d-classico); font-weight: 700; color: var(--d-accent); }

/* periodo e costruzione */
.documento .d-periodo { display: grid; gap: 3px; font-size: 12px; line-height: 14.5px; }
.documento .d-periodo li { display: grid; grid-template-columns: 22px 1fr; gap: 0 6px; align-items: baseline; }
.documento .d-periodo li > span[lang] { grid-column: 2; font-size: 13px; }
.documento .d-segno-prop { display: block; height: 2px; margin-top: 6px; background: var(--d-filo, var(--d-ink)); }
.documento .d-prop-coordinata .d-segno-prop { background: repeating-linear-gradient(90deg, var(--d-ink) 0 5px, transparent 5px 8px); }
.documento .d-prop-subordinata .d-segno-prop { height: 1px; }
.documento .d-ordo { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.documento .d-ordo-blocco { display: grid; padding-top: 3px; border-top: 3px solid var(--d-filo, var(--d-ink)); }
.documento .d-ordo-blocco b { font-size: 8px; line-height: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--d-note); }
.documento .d-ordo-blocco span { font-size: 14px; line-height: 18px; }

/* le rese */
.documento .d-resa { font-size: 13.33px; line-height: 18px; white-space: pre-line; }
.documento .d-bella { font-size: 14px; line-height: 20px; }
.documento .d-traduzione .d-bella { font-size: 14px; line-height: 21px; }

/* lessico e legenda */
.documento .d-lessico { columns: 2 220px; column-gap: 18px; font-size: 12px; line-height: 15px; }
.documento .d-lessico li { break-inside: avoid; padding-bottom: 3px; }
.documento .d-lessico b { font-weight: 700; color: var(--d-accent); font-size: 13px; }
.documento .d-lessico i { color: var(--d-note); font-size: 9.33px; }
.documento .d-legenda { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px 18px; }
.documento .d-legenda ul { display: grid; gap: 2px; font-size: 12px; line-height: 14px; }
.documento .d-legenda li { display: flex; align-items: center; gap: 6px; }
.documento .d-campione { display: inline-block; width: 14px; height: 10px; background: var(--d-filo, var(--d-pos)); outline: 1px solid rgba(0, 0, 0, 0.28); outline-offset: -1px; flex: none; }
.documento .d-campione-pos { height: 3px; outline: 0; background: var(--d-pos); }
.documento .d-campione-linea { display: inline-block; width: 22px; height: 2px; background: var(--d-ink); flex: none; }
.documento .d-campione-linea.d-prop-subordinata { height: 1px; }
.documento .d-legenda .d-m { font-family: var(--d-classico); font-size: 13px; }

.documento .d-piede { margin-top: 18px; padding-top: 6px; border-top: 2px solid var(--d-ink); font-size: 9.33px; line-height: 11.2px; color: var(--d-note); }

/* il foglio stretto (telefono): la colonna di margine va sopra */
@container (max-width: 560px) {
  .documento .d-sez { display: block; }
  .documento .d-margine { margin-bottom: 6px; }
  .documento .d-numero { font-size: 24px; line-height: 24px; }
  .documento .d-parole thead { display: none; }
  .documento .d-parole, .documento .d-parole tbody, .documento .d-parole td { display: block; width: auto; }
  .documento .d-parole tr { display: grid; grid-template-columns: 22px auto 1fr; gap: 0 8px; padding: 5px 0; border-bottom: 1px solid var(--d-rule-soft); }
  .documento .d-parole td { border: 0; padding: 0; }
  .documento .d-parole td:nth-child(n+3) { grid-column: 2 / -1; }
}
@media screen and (max-width: 700px) {
  .documento { padding: 24px 16px; }
}

/* la stampa: il foglio e' gia' la pagina */
@page { size: A4; margin: 14mm 13mm 15mm; }
@media print {
  .documento { max-width: none; padding: 0; margin: 0; }
  .documento .d-testa { break-after: avoid; }
  .documento .d-sez { break-inside: auto; }
  .documento .d-margine { break-after: avoid; }
  .documento .d-banco, .documento .d-parole tr, .documento .d-blocco, .documento .d-legenda > div { break-inside: avoid; }
  /* la tavola delle parole puo' passare alla pagina dopo, riga per riga */
  .documento .d-blocco-tavola { break-inside: auto; }
  .documento .d-blocco-tavola > .d-etichetta { break-after: avoid; }
}
`;
