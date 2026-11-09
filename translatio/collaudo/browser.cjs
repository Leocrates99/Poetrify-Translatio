/* Collaudo nel browser: il flusso intero su quattro classi di schermo.
   Uso (dalla radice del repo, con un server statico acceso):
     python3 -m http.server 8765 --bind 127.0.0.1
     node translatio/collaudo/browser.cjs [http://127.0.0.1:8765/translatio/]
   Richiede Playwright con Chromium. Esce con codice 1 se la console ha errori,
   se una pagina scorre in orizzontale o se un comando e' sotto i 24px. */
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8765/translatio/';
const CLASSI = [
  ['la mano (greco)', { ...devices['iPhone 13'] }, 2],
  ['il tablet (latino)', { viewport: { width: 1024, height: 768 } }, 1],
  ['il leggio (greco, scuro)', { viewport: { width: 1536, height: 864 }, colorScheme: 'dark' }, 3],
  ['il tavolo (latino)', { viewport: { width: 1920, height: 1080 } }, 0],
];
(async () => {
  const browser = await chromium.launch();
  const guasti = [];
  for (const [nome, opts, esempio] of CLASSI) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') guasti.push(`${nome}: console · ${m.text()}`); });
    page.on('pageerror', e => guasti.push(`${nome}: eccezione · ${e.message}`));
    await page.goto(BASE);
    await page.click(`[data-az="esempio"][data-i="${esempio}"]`);
    await page.waitForFunction(() => !document.querySelector('.stato-lavoro'), null, { timeout: 90000 });
    await page.click('.parola[data-i="1"]');
    await page.click('[data-az="conferma"]');
    for (const lente of ['sintagmi', 'proposizioni']) {
      await page.click(`[data-az="lente"][data-lente="${lente}"]`);
      await page.click('.parola[data-i="0"]');
      await page.click('.parola[data-i="1"]');
      const prima = await page.$(lente === 'sintagmi' ? '.tendina-voce' : '[data-az="tipo-prop"]');
      await prima.click();
    }
    await page.click('[data-az="lente"][data-lente="resa"]');
    await page.fill('[data-campo="brutta"]', 'prova di brutta');
    await page.click('.tappa:has-text("Traduzione")');
    await page.waitForSelector('.edizione-riga');
    const largo = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (largo > 0) guasti.push(`${nome}: la pagina scorre in orizzontale di ${largo}px`);
    const piccoli = await page.evaluate(() => [...document.querySelectorAll('button, a, input, textarea')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 24 || r.width < 24); })
      .map(e => e.className || e.tagName));
    if (piccoli.length) guasti.push(`${nome}: comandi sotto i 24px · ${piccoli.join(', ')}`);
    console.log(`${nome}: percorso completo`);
    await ctx.close();
  }
  await browser.close();
  console.log(guasti.length ? `NON CONFORME\n${guasti.join('\n')}` : 'CONFORME · nessun errore, nessuno scorrimento orizzontale, nessun comando sotto i 24px');
  process.exit(guasti.length ? 1 : 0);
})();
