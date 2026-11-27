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

    /* Parole: la prima a mano, col mouse o col dito */
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

    /* la seconda con la tastiera: i numeri compilano il primo gruppo vuoto */
    if (tastiera) {
      await page.focus('.parola[data-i="1"]');
      /* verbo (il quarto in latino, che non ha l'articolo; il quinto in greco) · indicativo · presente · passivo */
      for (const k of [nome.includes('greco') ? '5' : '4', '1', '1', '2']) await page.keyboard.press(k);
      const ok = await page.evaluate(() => ['.scelta.pos-verbo', '[data-g="modo"][data-x="ind"]', '[data-g="tempo"][data-x="pres"]']
        .every(s => document.querySelector(s) && document.querySelector(s).getAttribute('aria-pressed') === 'true'));
      if (!ok) guasti.push(`${nome}: la tastiera non compila il primo gruppo vuoto`);
    }

    /* Sintagmi e proposizioni, scelti dallo studente: nessuna proposta */
    await page.click('[data-az="lente"][data-lente="sintagmi"]');
    await page.click('.parola[data-i="0"]');
    await page.click('.parola[data-i="1"]');
    if (await page.$('.stella')) guasti.push(`${nome}: compaiono proposte nella scheda del sintagma`);
    await page.click('.tendina-voce[data-funzione="Soggetto"]');
    await page.click('[data-az="lente"][data-lente="proposizioni"]');
    await page.click('.parola[data-i="0"]');
    await page.click('.parola[data-i="2"]');
    await page.click('[data-az="ruolo"][data-ruolo="Principale"]');
    await page.click('[data-az="tipo-prop"][data-tipo="Enunciativa"]');
    if (!await page.$('.fili-sopra .filo.prop-principale')) guasti.push(`${nome}: la proposizione non e' disegnata`);
    await page.click('[data-az="lente"][data-lente="resa"]');
    await page.fill('[data-campo="brutta"]', 'prova di brutta');
    await page.fill('[data-campo="bella"]', 'prova di bella');

    await page.click('.tappa:has-text("Traduzione")');
    await page.waitForSelector('.edizione-riga');
    await misura(page, nome, 'traduzione', guasti);

    /* Consegna: il foglio, il controllo, la pagina scaricata */
    await page.click('.tappa:has-text("Consegna")');
    await page.waitForSelector('.documento .d-titolo');
    await page.fill('[data-campo="consegna"][data-k="studente"]', 'Anna Rossi');
    await page.waitForTimeout(400);
    const foglio = await page.textContent('#anteprima-documento');
    if (!/Anna Rossi/.test(foglio) || !/significato di prova/.test(foglio) || !/prova di bella/.test(foglio)) guasti.push(`${nome}: il foglio non riporta il lavoro dello studente`);
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
