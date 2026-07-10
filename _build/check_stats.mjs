// P0.1 · verifica: esegue il VERO LexiconEngine.stats() sui dati locali.
// Stub di fetch -> legge i file dal filesystem (l'engine e' pensato per il browser).
// Uso: node _build/check_stats.mjs <REPO_ROOT>   -> stampa JSON di stats().
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = process.argv[2];
if (!ROOT) { console.error("uso: node check_stats.mjs <REPO_ROOT>"); process.exit(2); }

globalThis.fetch = async (url) => {
  const p = decodeURIComponent(String(url));
  const txt = readFileSync(p, "utf8");
  return { ok: true, status: 200, json: async () => JSON.parse(txt) };
};

const engineUrl = pathToFileURL(ROOT.replace(/\\/g, "/") + "/modules/engine/lexicon-engine.js").href;
const { LexiconEngine } = await import(engineUrl);

const lex = new LexiconEngine({ baseUrl: ROOT.replace(/\\/g, "/") + "/data/" });
await lex.loadLanguageData("latino");
await lex.loadLanguageData("greco");
process.stdout.write(JSON.stringify(lex.stats()));
