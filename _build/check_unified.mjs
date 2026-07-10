// P0.2 · verifica: un lemma PRIMA d'archivio è ora presente nel dict unificato
// (browse/autocomplete/lista) e trovato dalla ricerca normale (lookUpSmart).
// Uso: node _build/check_unified.mjs <REPO_ROOT>
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = process.argv[2];
if (!ROOT) { console.error("uso: node check_unified.mjs <REPO_ROOT>"); process.exit(2); }
const base = ROOT.replace(/\\/g, "/");

globalThis.fetch = async (url) => {
  const p = decodeURIComponent(String(url));
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(p, "utf8")) };
};

const { LexiconEngine } = await import(pathToFileURL(base + "/modules/engine/lexicon-engine.js").href);
const lex = new LexiconEngine({ baseUrl: base + "/data/" });

const lang = "greco", letter = "α";           // greco: 110k lemmi d'archivio
const archDict = JSON.parse(readFileSync(base + "/data/greek/archive/" + letter + ".json", "utf8")).dict;
const coreDict = JSON.parse(readFileSync(base + "/data/greek/" + letter + ".json", "utf8")).dict;
const archiveOnly = Object.keys(archDict).find((l) => !(l in coreDict));

await lex.loadLanguageData(lang);
const shard = await lex._loadShard(lang, letter);          // ora fonde l'archivio
const inMerged = archiveOnly in shard.dict;
const res = await lex.lookUpSmart(archiveOnly, lang);       // "ricerca normale"
const found = !!(res && res.lemma && res.source !== "none");

const report = {
  lemma_prima_archiviato: archiveOnly,
  core_dict_count: Object.keys(coreDict).length,
  merged_dict_count: Object.keys(shard.dict).length,
  aggiunti_dall_archivio: Object.keys(shard.dict).length - Object.keys(coreDict).length,
  presente_nel_dict_unificato: inMerged,
  trovato_da_lookUpSmart: found,
  source: res && res.source,
  lemma_risolto: res && res.lemma,
  definizione: res && (res.definition || "").slice(0, 60),
};
console.log(JSON.stringify(report, null, 2));
process.exit(inMerged && found ? 0 : 1);
