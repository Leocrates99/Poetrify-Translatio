/* Collaudo nel browser: il lavoro dello studente, dall'esempio alla consegna,
   su quattro classi di schermo.
   Uso (dalla radice del repo, con un server statico acceso):
     python3 -m http.server 8765 --bind 127.0.0.1
     node translatio/collaudo/browser.cjs [http://127.0.0.1:8765/translatio/]
   Richiede Playwright con Chromium. Esce con codice 1 se la console ha errori,
   se una pagina scorre in orizzontale, se un comando e' sotto i 24px, o se il
   documento scaricato non contiene (o non riapre) il lavoro fatto. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8765/translatio/';
const CLASSI = [
  ['la mano (greco)', { ...devices['iPhone 13'] }, 2],
  ['il tablet (latino)', { viewport: { width: 1024, height: 768 } }, 1],
  ['il leggio (greco, scuro)', { viewport: { width: 1536, height: 864 }, colorScheme: 'dark' }, 3],
  ['il tavolo (latino)', { viewport: { width: 1920, height: 1080 } }, 0],
];
const CARTELLA = fs.mkdtempSync(path.join(os.tmpdir(), 'translatio-'));

async function misura(page, nome, dove, guasti) {
  const largo = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (largo > 0) guasti.push(`${nome} · ${dove}: la pagina scorre in orizzontale di ${largo}px`);
  const piccoli = await page.evaluate(() => [...document.querySelectorAll('button, a, input, textarea, select')]
    .filter(e => !e.closest('.sr') && !e.classList.contains('sr') && getComputedStyle(e).visibility !== 'hidden')
    /* un link dentro una frase e' testo (WCAG 2.5.8, eccezione «inline») */
    .filter(e => !(e.tagName === 'A' && getComputedStyle(e).display === 'inline'))
    /* una casella dentro un'etichetta si tocca su tutta l'etichetta */
    .map(e => (e.matches('input[type="checkbox"], input[type="radio"]') && e.closest('label') ? e.closest('label') : e))
    .filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 24 || r.width < 24); })
    .map(e => `${e.tagName.toLowerCase()}.${e.className || ''}`));
  if (piccoli.length) guasti.push(`${nome} · ${dove}: comandi sotto i 24px · ${[...new Set(piccoli)].join(', ')}`);
}

(async () => {
  const browser = await chromium.launch();
  const guasti = [];
  let paginaScaricata = null;
  for (const [nome, opts, esempio] of CLASSI) {
    const ctx = await browser.newContext({ ...opts, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') guasti.push(`${nome}: console · ${m.text()}`); });
    page.on('pageerror', e => guasti.push(`${nome}: eccezione · ${e.message}`));
    /* ogni modulo si chiede con la versione: niente file vecchi mescolati ai nuovi */
    page.on('request', r => { const u = r.url(); if (/\/translatio\/js\/.+\.js(\?|$)/.test(u) && !/\?v=/.test(u)) guasti.push(`${nome}: modulo chiesto senza versione · ${u}`); });
    const tastiera = !opts.hasTouch;

    await page.goto(BASE);
    await page.click(`[data-az="esempio"][data-i="${esempio}"]`);
    await page.waitForSelector('.parola[data-i="0"]');
    if (await page.$('.parola.analizzata')) guasti.push(`${nome}: una parola risulta analizzata prima che lo studente la tocchi`);
    const avanti = async atteso => {
      const b = await page.$('.barra-passi .btn-primario');
      const t = b ? (await b.textContent()).trim() : '';
      if (!t.includes(atteso)) guasti.push(`${nome}: il passo dopo dice «${t}», non «${atteso}»`);
      const href = await b.getAttribute('href');
      await b.click();
      /* ridisegnato: il passo dopo non e' piu' quello appena fatto */
      await page.waitForFunction(h => { const x = document.querySelector('.barra-passi .btn-primario'); return x && x.getAttribute('href') !== h; }, href);
    };

    /* 1 · Scomposizione in frasi: la sbarra */
    const primo = await page.getAttribute('.livelli-analisi [role="tab"][aria-selected="true"]', 'data-lente');
    if (primo !== 'segmenti') guasti.push(`${nome}: l'analisi non comincia dalla scomposizione (${primo})`);
    await page.click('.parola[data-i="2"]');
    if (!await page.$('.parola[data-i="2"].dopo-taglio')) guasti.push(`${nome}: la sbarra della scomposizione non compare`);
    await avanti('Analisi periodale');

    /* 2 · Analisi periodale: un tocco prende la frase intera; ruolo, tipo,
       reggente, connettivo; l'albero cresce */
    await page.click('.parola[data-i="0"]');
    const scelte = await page.$$eval('.parola.in-selezione', b => b.map(x => x.dataset.i).join(','));
    if (scelte !== '0,1') guasti.push(`${nome}: il tocco non seleziona la frase intera (${scelte})`);
    if (await page.$('.stella')) guasti.push(`${nome}: compaiono proposte nella scheda della proposizione`);
    await page.click('[data-az="ruolo"][data-ruolo="Principale"]');
    await page.click('[data-az="tipo-prop"][data-tipo="Enunciativa"]');
    await page.click('.parola[data-i="2"]');
    await page.click('[data-az="ruolo"][data-ruolo="Subordinata"]');
    await page.click('[data-az="dipende"]');
    await page.click('[data-az="connettivo"][data-i="2"]');
    if (!await page.$('.fili-sopra .filo.prop-principale')) guasti.push(`${nome}: la proposizione non e' disegnata sopra la frase`);
    if (!await page.$('.albero > li > .nodo-principale') || !await page.$('.albero ul .nodo-subordinata')) guasti.push(`${nome}: l'albero sintattico non mostra la subordinata sotto la reggente`);
    const sigle = await page.$$eval('.albero .sigla', b => b.map(x => x.textContent.trim()).join(','));
    if (sigle !== 'A₁,B₁') guasti.push(`${nome}: sigle dell'albero inattese (${sigle})`);
    if (!await page.$('.parola[data-i="2"].connettivo')) guasti.push(`${nome}: il connettivo segnato non si riquadra`);
    await page.keyboard.press('Escape');
    await avanti('Forme verbali');

    /* 3 · Forme verbali: si comincia dal modo; finiti pieni, indefiniti a tratteggio */
    await page.click('.parola[data-i="1"]');
    await page.click('[data-az="modo-verbale"][data-x="ind"]');
    if (!await page.$('.parola[data-i="1"].verbo-finito.pos-verbo')) guasti.push(`${nome}: il verbo di modo finito non si evidenzia`);
    if (tastiera) {
      for (const k of ['1', '1']) await page.keyboard.press(k);      // presente · attivo
      if (await page.getAttribute('[data-g="tempo"][data-x="pres"]', 'aria-pressed') !== 'true') guasti.push(`${nome}: la tastiera non compila il primo gruppo vuoto della forma verbale`);
    }
    await page.click('.parola[data-i="3"]');
    await page.click('[data-az="modo-verbale"][data-x="inf"]');
    if (!await page.$('.parola[data-i="3"].verbo-indefinito')) guasti.push(`${nome}: il verbo di modo indefinito non si evidenzia a tratteggio`);
    await page.keyboard.press('Escape');
    await avanti('Soggetto e gruppo del nominativo');

    /* 4 · Analisi logica nell'ordine: nominativo, accusativo, obliqui */
    await page.click('.parola[data-i="0"]');
    await page.click('.parola[data-i="0"]');
    if (await page.$('.tendina-voce[data-funzione="Complemento oggetto"]')) guasti.push(`${nome}: nel gruppo del nominativo si offre il complemento oggetto`);
    await page.click('.tendina-voce[data-funzione="Soggetto"]');
    if (!await page.$('.fili-sopra.contesto .filo.prop-principale')) guasti.push(`${nome}: nell'analisi logica la proposizione non resta sopra la frase`);
    await avanti('Oggetto e gruppo');
    await page.click('.parola[data-i="2"]');
    await page.click('.parola[data-i="2"]');
    await page.click('.tendina-voce[data-funzione="Complemento oggetto"]');
    await avanti('Complementi obliqui');
    if (!await page.$('.tendina-voce, .scheda-invito')) guasti.push(`${nome}: il passo degli obliqui non si apre`);
    await avanti('Analisi grammaticale');

    /* 5 · Analisi grammaticale: la prima parola a mano; il verbo arriva gia' analizzato */
    if (!await page.$('.fili.contesto .filo.caso-nom') || !await page.$('.fili-sopra.contesto')) guasti.push(`${nome}: nell'analisi grammaticale non restano i passi di prima`);
    await page.click('.parola[data-i="0"]');
    await page.click('.scelta.pos-sostantivo');
    await page.click('[data-az="tratto"][data-g="caso"][data-x="nom"]');
    await page.fill('[data-campo="lemma"]', 'lemma di prova');
    await page.fill('[data-campo="senso"]', 'significato di prova');
    await page.click('details[data-apri="morfemi"] > summary');
    await page.click('.lettera[data-k="1"]');
    await page.click('[data-az="ruolo-morfema"][data-n="0"][data-r="t"]');
    await page.waitForTimeout(200);
    const sotto = await page.textContent('.parola[data-i="0"] .sotto');
    if (!/lemma di prova/.test(sotto) || !/significato di prova/.test(sotto)) guasti.push(`${nome}: la riga sotto la parola non mostra lemma e significato`);
    if (!await page.$('.parola[data-i="0"].analizzata.pos-sostantivo')) guasti.push(`${nome}: il filetto della parola non ha preso la parte del discorso`);
    await misura(page, nome, 'analisi con la scheda', guasti);
    await page.click('[data-az="prossima"]');
    if (!await page.$('.parola[data-i="1"][aria-pressed="true"]')) guasti.push(`${nome}: «Parola successiva» non e' andata avanti`);
    if (!await page.$('.scelta.pos-verbo[aria-pressed="true"]') || await page.getAttribute('[data-g="modo"][data-x="ind"]', 'aria-pressed') !== 'true') guasti.push(`${nome}: la forma verbale non arriva analizzata alla grammatica`);
    await page.keyboard.press('Escape');
    await avanti('Ordo verborum');

    /* 6 · Ordo verborum: lo compone lo studente */
    await page.click('.parola[data-i="1"]');
    await page.click('.parola[data-i="0"]');
    const ordo = await page.$$eval('.riga-ordo .parola-ordo', b => b.length);
    const numeri = await page.$$eval('.ordo-n', b => b.map(x => x.textContent).join(','));
    if (ordo !== 2 || numeri !== '2,1') guasti.push(`${nome}: l'ordo non segue i tocchi (${ordo} parole, numeri ${numeri})`);
    await avanti('Traduzione');

    /* 7 · Traduzione, poi la frase dopo dalla scomposizione */
    if (!await page.$('.resa .riga-ordo')) guasti.push(`${nome}: la traduzione non mostra l'ordo come traccia`);
    await page.fill('[data-campo="brutta"]', 'prova di brutta');
    await page.fill('[data-campo="bella"]', 'prova di bella');
    await avanti('Frase 2');
    const dopo = await page.evaluate(() => location.hash);
    if (!/\/analisi\/2\/segmenti$/.test(dopo)) guasti.push(`${nome}: dopo la traduzione non si passa alla frase 2 dalla scomposizione (${dopo})`);

    await page.click('.tappa:has-text("Versione")');
    await page.waitForSelector('.edizione-riga');
    await misura(page, nome, 'versione', guasti);

    /* Consegna: il foglio, il controllo, la pagina scaricata */
    await page.click('.tappa:has-text("Consegna")');
    await page.waitForSelector('.documento .d-titolo');
    await page.fill('[data-campo="consegna"][data-k="studente"]', 'Anna Rossi');
    await page.waitForTimeout(400);
    const foglio = await page.textContent('#anteprima-documento');
    if (!/Anna Rossi/.test(foglio) || !/significato di prova/.test(foglio) || !/prova di bella/.test(foglio)) guasti.push(`${nome}: il foglio non riporta il lavoro dello studente`);
    if (!await page.$('#anteprima-documento .d-albero .d-nodo-principale') || !await page.$('#anteprima-documento .d-verbo-finito') || !await page.$('#anteprima-documento .d-riga-ordo')) guasti.push(`${nome}: il foglio non porta albero, verbi evidenziati e ordo`);
    await misura(page, nome, 'consegna', guasti);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-az="scarica-html"]')]);
    const file = path.join(CARTELLA, `${esempio}-${dl.suggestedFilename()}`);
    await dl.saveAs(file);
    const pagina = fs.readFileSync(file, 'utf8');
    if (!/id="translatio-dati"/.test(pagina) || !/Anna Rossi/.test(pagina) || /<link|<script src/.test(pagina)) guasti.push(`${nome}: la pagina scaricata non e' autonoma o non contiene il lavoro`);
    paginaScaricata = paginaScaricata || file;
    await page.emulateMedia({ media: 'print' });
    const stampa = await page.evaluate(() => ({
      modulo: getComputedStyle(document.querySelector('.cons-modulo')).display,
      foglio: getComputedStyle(document.querySelector('.documento')).display,
      testata: getComputedStyle(document.querySelector('.testata')).display,
    }));
    if (stampa.modulo !== 'none' || stampa.testata !== 'none' || stampa.foglio === 'none') guasti.push(`${nome}: in stampa non resta il foglio solo`);
    console.log(`${nome}: percorso completo`);
    await ctx.close();
  }

  /* la pagina consegnata si riapre in Translatio, con tutto il lavoro */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => guasti.push(`riapertura: eccezione · ${e.message}`));
    await page.goto(BASE);
    await page.setInputFiles('[data-az="importa"]', paginaScaricata);
    await page.waitForSelector('.parola[data-i="0"]');
    if (!await page.$('.parola[data-i="0"].analizzata')) guasti.push('riapertura: la pagina .html non ha riportato l’analisi');
    console.log('riapertura della pagina consegnata: fatta');
    await ctx.close();
  }

  await browser.close();
  fs.rmSync(CARTELLA, { recursive: true, force: true });
  console.log(guasti.length ? `NON CONFORME\n${guasti.join('\n')}` : 'CONFORME · nessun errore, nessuno scorrimento orizzontale, nessun comando sotto i 24px, la consegna si scarica e si riapre');
  process.exit(guasti.length ? 1 : 0);
})();
