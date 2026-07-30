/* ════════════════════════════════════════════════════════════════════════════
   ocr.js · Motore OCR client-side per Poetrify

   Riconoscimento ottico del testo (foto da telefono/tablet/fotocamera, immagini
   incollate, file trascinati) interamente DENTRO il browser, via Tesseract.js.

   SISTEMA INTERNO (vendoring): motore, worker, core WASM e dati lingua sono
   serviti dai file locali in vendor/tesseract/ (stesso GitHub Pages, stessa
   origine). NESSUNA dipendenza da CDN o server esterni, né a runtime né al primo
   uso → funziona anche completamente offline. Tutti i componenti sono Apache-2.0
   (file di licenza in vendor/tesseract/, vedi vendor/tesseract/README.md).

   Principio cardine — coerente con la promessa "Nessun dato lascia il tuo
   dispositivo": l'immagine non viene mai inviata a un server. Tutto il calcolo
   (WASM + dati lingua) gira in locale.

   Lingue supportate: 'lat' (latino) e 'grc' (greco antico politonico).
   ────────────────────────────────────────────────────────────────────────────
   Esposto dal translator come window.PoetrifyOCR (vedi blocco module in fondo a
   translator.html). API principale:
     recognize(imageSource, projectLang, onProgress) → { text, rawText, confidence, lang }
     prepareImage(file|url, maxDim) → dataURL ridotto
     cleanupText(text, projectLang) → testo ripulito
   ═══════════════════════════════════════════════════════════════════════════ */

export const OCR_META = {
  version: '0.4.0', // 0.3.0: vendoring · zero CDN, tutto servito in locale (offline)
  engine: 'tesseract.js',
  engineVersion: '5.1.1',
  selfHosted: true,
  languages: ['lat', 'grc'],
};

/* Base locale dei file vendored, risolta rispetto a questo modulo:
   ocr.js sta in /modules/translator/ → i file stanno in /vendor/tesseract/.
   Niente URL assoluti hard-coded: funziona a qualsiasi sotto-percorso (es. il
   project page GitHub /Poetrify-Translatio/). */
const VENDOR_BASE = new URL('../../vendor/tesseract/', import.meta.url).href;
const TESSERACT_SCRIPT = VENDOR_BASE + 'tesseract.min.js';

// Mappa lingua-di-progetto → traineddata Tesseract.
const LANG_MAP = { greco: 'grc', latino: 'lat' };

let _tesseractPromise = null;
const _workers = new Map(); // lang → worker riutilizzabile

/* Traduce la lingua interna del progetto ('greco'/'latino') nel codice
   traineddata di Tesseract. Default prudente: latino. */
export function tesseractLangFor(projectLang) {
  return LANG_MAP[projectLang] || 'lat';
}

/* Carica una sola volta lo script UMD di Tesseract iniettando un <script> dal
   file locale vendored. Idempotente: chiamate successive riusano la stessa
   Promise / il global già presente. In caso di errore azzera la cache (retry). */
export function loadTesseract() {
  if (typeof window !== 'undefined' && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (_tesseractPromise) return _tesseractPromise;
  _tesseractPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TESSERACT_SCRIPT;
    s.async = true;
    s.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else { _tesseractPromise = null; reject(new Error('Tesseract non disponibile dopo il caricamento')); }
    };
    s.onerror = () => {
      _tesseractPromise = null;
      reject(new Error('Impossibile caricare il motore OCR locale (vendor/tesseract/)'));
    };
    document.head.appendChild(s);
  });
  return _tesseractPromise;
}

/* Crea (o riusa) un worker Tesseract per la lingua data, puntando worker, core
   WASM e dati lingua ai file LOCALI vendored (nessuna CDN). corePath è la cartella
   core/: Tesseract sceglie da sé la variante (SIMD/LSTM) adatta al browser.
   langPath è la cartella lang/ con i {lang}.traineddata.gz. Riusare il worker tra
   scansioni successive evita di ricaricare core+dati ogni volta. */
async function getWorker(lang, onProgress) {
  if (_workers.has(lang)) return _workers.get(lang);
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker(lang, 1, {
    workerPath: VENDOR_BASE + 'worker.min.js',
    corePath: VENDOR_BASE + 'core',
    langPath: VENDOR_BASE + 'lang',
    logger: m => { if (typeof onProgress === 'function') onProgress(m); },
  });
  _workers.set(lang, worker);
  return worker;
}

/* Riduce immagini enormi da fotocamera (anche 4000+ px) per velocizzare l'OCR
   senza perdere leggibilità, e le normalizza in PNG (dataURL). Accetta un File,
   un Blob o un URL/dataURL. */
export function prepareImage(fileOrUrl, maxDim = 2200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl = null;
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      if (scale < 1) { width = Math.round(width * scale); height = Math.round(height * scale); }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      try { resolve(canvas.toDataURL('image/png')); }
      catch (e) { reject(new Error('Impossibile elaborare l’immagine')); }
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('File immagine non valido o non leggibile'));
    };
    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      objectUrl = URL.createObjectURL(fileOrUrl);
      img.src = objectUrl;
    }
  });
}

/* Esegue il riconoscimento. imageSource può essere un dataURL, un canvas, un
   File/Blob o un'Image. Restituisce testo ripulito + testo grezzo + confidenza. */
export async function recognize(imageSource, projectLang, onProgress) {
  const lang = tesseractLangFor(projectLang);
  const worker = await getWorker(lang, onProgress);
  const { data } = await worker.recognize(imageSource);
  return {
    text: cleanupText(data.text, { compact: true }),
    rawText: data.text,
    confidence: typeof data.confidence === 'number' ? Math.round(data.confidence) : null,
    lang,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   RICONOSCIMENTO STRUTTURATO · la pagina di un manuale non è un blocco di testo
   ────────────────────────────────────────────────────────────────────────────
   Su una pagina di manuale, accanto alla versione ci sono cose che NON vanno
   tradotte: il numero della versione in testa, i numeri di verso a margine,
   le note e l'apparato in fondo. Prendere tutto e incollarlo insieme obbliga
   poi a ripulire a mano proprio mentre si vorrebbe cominciare.
   Qui si chiedono a Tesseract i dati per PAROLA (riquadro + confidenza) e si
   classificano le righe. La divisione in colonne resta a Tesseract, che la fa
   bene: non la si reimplementa, la si sfrutta e si dichiara quante ne ha viste.
   Le esclusioni non sono mai definitive: la revisione le mostra e si possono
   riportare dentro — un'euristica sbaglia, e deve poter essere smentita. */
export async function recognizeLayout(imageSource, projectLang, onProgress) {
  const lang = tesseractLangFor(projectLang);
  const worker = await getWorker(lang, onProgress);
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '3',        // pagina intera, analisi automatica (regge le colonne)
      preserve_interword_spaces: '1',
    });
  } catch (e) { /* parametri non applicabili: si prosegue col default */ }

  const { data } = await worker.recognize(imageSource, {}, { blocks: true, text: true });

  /* Appiattisce blocchi → paragrafi → righe, conservando l'ordine di lettura
     stabilito da Tesseract (è quello che risolve le colonne). */
  const righe = [];
  let nBlocchi = 0;
  (data.blocks || []).forEach((b) => {
    nBlocchi++;
    (b.paragraphs || []).forEach((p) => {
      (p.lines || []).forEach((l) => {
        const parole = (l.words || []).map((w) => ({
          testo: w.text, conf: typeof w.confidence === 'number' ? w.confidence : null, bbox: w.bbox,
        }));
        if (!parole.length && !(l.text || '').trim()) return;
        righe.push({
          testo: (l.text || '').replace(/\s+$/, ''),
          bbox: l.bbox,
          conf: typeof l.confidence === 'number' ? l.confidence : null,
          parole,
        });
      });
    });
  });

  return {
    righe,
    nBlocchi,
    text: data.text || '',
    confidence: typeof data.confidence === 'number' ? Math.round(data.confidence) : null,
    lang,
    /* Se il bundle non restituisce i blocchi si resta col solo testo: l'analisi
       dell'impaginato si disattiva da sé invece di produrre risultati inventati. */
    strutturato: righe.length > 0,
  };
}

const RE_SOLO_NUMERO = /^\s*[\[(]?\s*\d{1,4}\s*[.)\]]?\s*$/;
const RE_ROMANO = /^\s*[IVXLCDM]{1,7}\s*[.)]?\s*$/;

function mediana(v) {
  if (!v.length) return 0;
  const a = v.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/* Classifica ogni riga in: corpo · numeroVerso · nota · titolo.
   Le soglie sono dichiarate qui in chiaro, non sparse nel codice. */
export function analizzaPagina(righe, opts) {
  opts = opts || {};
  const out = { corpo: [], numeriVerso: [], note: [], titolo: [], versioneNum: null, pagina: null, colonne: 1 };
  if (!righe || !righe.length) return out;

  const y1 = Math.max(...righe.map(r => (r.bbox && r.bbox.y1) || 0));
  const x0min = Math.min(...righe.map(r => (r.bbox && r.bbox.x0) || 0));
  const x1max = Math.max(...righe.map(r => (r.bbox && r.bbox.x1) || 0));
  const larghezza = Math.max(1, x1max - x0min);
  const altezze = righe.map(r => r.bbox ? (r.bbox.y1 - r.bbox.y0) : 0).filter(Boolean);
  const H = mediana(altezze) || 1;

  /* Quante colonne ha visto Tesseract: si stima dal numero di righe che
     cominciano ben dentro la metà destra della pagina. */
  const inizioDestra = righe.filter(r => r.bbox && (r.bbox.x0 - x0min) > larghezza * 0.52).length;
  out.colonne = inizioDestra >= Math.max(3, righe.length * 0.25) ? 2 : 1;

  righe.forEach((r, idx) => {
    const t = (r.testo || '').trim();
    if (!t) return;
    r._i = idx;   // posizione originale: serve a ricomporre l'ordine se si riammette una categoria
    const bb = r.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
    const h = bb.y1 - bb.y0;
    const inAlto = bb.y1 < y1 * 0.16;
    const inBasso = bb.y0 > y1 * 0.68;
    const largRiga = bb.x1 - bb.x0;

    // ① numero di verso o di paragrafo isolato a margine: riga cortissima, tutta cifre
    if ((RE_SOLO_NUMERO.test(t) || RE_ROMANO.test(t)) && largRiga < larghezza * 0.10 && !inAlto) {
      out.numeriVerso.push(r); return;
    }
    /* ② testa della pagina · titolo della versione.
       NON si usa l'altezza del riquadro come spia del corpo: misurata, non
       regge — una riga di testo con lettere discendenti (p, q, g) risulta più
       ALTA di un titolo in grassetto senza discendenti (31px contro 27px sul
       campione di prova). Il segnale affidabile è la FORMA con cui i manuali
       intestano le versioni: «148. Il titolo», cioè un numero d'ordine seguito
       da punteggiatura, nelle prime righe della pagina. */
    const haNumeroDOrdine = /^\s*(\d{1,4})\s*[.)·:–—-]\s*\S/.test(t);
    if (inAlto && idx < 3 && (haNumeroDOrdine || RE_SOLO_NUMERO.test(t) || /versione|vers\./i.test(t))) {
      out.titolo.push(r);
      const m = t.match(/^\s*[\[(]?\s*(\d{1,4})/);
      if (m && out.versioneNum == null) out.versioneNum = m[1];
      return;
    }
    // ③ note e apparato: in fondo alla pagina e in corpo minore del testo
    if (inBasso && h < H * 0.82) { out.note.push(r); return; }

    out.corpo.push(r);
  });

  /* Numero di verso appiccicato in coda alla riga (colonna di poesia): ultima
     parola tutta cifre, staccata e appoggiata al margine destro. */
  out.corpo.forEach((r) => {
    const p = r.parole || [];
    if (p.length < 2) return;
    const ult = p[p.length - 1], pen = p[p.length - 2];
    if (!ult.bbox || !pen.bbox) return;
    const stacco = ult.bbox.x0 - pen.bbox.x1;
    if (/^\d{1,4}$/.test((ult.testo || '').trim()) && stacco > H * 1.2) {
      r.numeroInCoda = ult.testo.trim();
      r.parole = p.slice(0, -1);
      r.testo = r.parole.map(w => w.testo).join(' ');
    }
  });

  return out;
}

/* Ricompone il testo dalle sole righe scelte, riusando la pulizia esistente. */
export function componiTesto(righe, opts) {
  const grezzo = (righe || []).map(r => r.testo).join('\n');
  return cleanupText(grezzo, opts || { compact: true });
}

/* Parole sotto soglia: sono i punti dove conviene guardare prima di procedere. */
export function paroleIncerte(righe, soglia) {
  const s = typeof soglia === 'number' ? soglia : 75;
  const fuori = [];
  (righe || []).forEach(r => (r.parole || []).forEach(w => {
    if (typeof w.conf === 'number' && w.conf < s && /\S/.test(w.testo || '')) fuori.push(w);
  }));
  return fuori;
}

// Insieme di caratteri "lettera" per latino esteso + greco (incluso politonico).
const LETTER = 'A-Za-z\\u00C0-\\u024F\\u0370-\\u03FF\\u1F00-\\u1FFF';
const RE_HYPHEN_BREAK = new RegExp('([' + LETTER + '])-\\n\\s*([' + LETTER + '])', 'g');
const RE_SPACE_BEFORE_PUNCT = /\s+([,.;:·!?])/g; // · = punto in alto greco

/* Pulizia post-OCR conservativa. Volutamente prudente: non tenta di "correggere"
   lettere, per non introdurre errori nel testo classico. Ricuce sempre le parole
   spezzate da trattino a fine riga ("popu-\nlus" → "populus") e toglie gli spazi
   prima della punteggiatura. Con { compact: true } (default per le versioni in
   prosa) unisce TUTTI gli a capo in un flusso continuo; senza, preserva le righe. */
export function cleanupText(text, opts) {
  opts = opts || {};
  if (!text) return '';
  let t = text.replace(/\r\n?/g, '\n');
  t = t.replace(RE_HYPHEN_BREAK, '$1$2');       // ricuci sillabazione di fine riga
  if (opts.compact) {
    t = t.replace(/\n+/g, ' ');                 // prosa: ogni a capo → spazio
  } else {
    t = t.replace(/\n{3,}/g, '\n\n');           // max una riga vuota
  }
  t = t.replace(/[ \t]{2,}/g, ' ');             // spazi multipli → uno
  t = t.replace(RE_SPACE_BEFORE_PUNCT, '$1');   // niente spazio prima di , . ; : · ! ?
  if (opts.compact) t = t.trim();
  else t = t.split('\n').map(l => l.trim()).join('\n').trim();
  return t;
}

/* ── Geometria per il ritaglio + raddrizzamento (tutto su <canvas>, niente libs) ──
   Dimensioni del rettangolo che contiene l'immagine ruotata di theta radianti. */
export function rotatedBoundingBox(w, h, theta) {
  const c = Math.abs(Math.cos(theta)), s = Math.abs(Math.sin(theta));
  return { w: w * c + h * s, h: w * s + h * c };
}

/* Estrae una regione dell'immagine ruotata e la restituisce come dataURL PNG.
   img          = HTMLImageElement sorgente
   srcW, srcH   = dimensioni reali dell'immagine
   theta        = rotazione in radianti
   region       = { sx, sy, sw, sh } in coordinate del bounding box ruotato a
                  piena risoluzione; se null → tutta l'immagine ruotata.
   Lo sfondo è bianco così gli angoli "vuoti" creati dalla rotazione non
   diventano neri/trasparenti (meglio per l'OCR). */
export function extractRegion(img, srcW, srcH, theta, region) {
  const bb = rotatedBoundingBox(srcW, srcH, theta);
  const sx = region ? region.sx : 0;
  const sy = region ? region.sy : 0;
  const sw = region ? region.sw : bb.w;
  const sh = region ? region.sh : bb.h;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw));
  out.height = Math.max(1, Math.round(sh));
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(-sx, -sy);          // porta l'origine della regione su (0,0)
  ctx.translate(bb.w / 2, bb.h / 2); // centro del bounding box ruotato
  ctx.rotate(theta);
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
  return out.toDataURL('image/png');
}

/* Chiude i worker e libera la memoria (utile su mobile). Idempotente. */
export async function terminate() {
  for (const w of _workers.values()) {
    try { await w.terminate(); } catch (e) { /* no-op */ }
  }
  _workers.clear();
}
