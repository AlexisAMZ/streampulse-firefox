/**
 * Génère js/inject/points-bonus-inline.js depuis js/points-bonus.js.
 *
 * POURQUOI CE FICHIER EXISTE
 * channelPointsClaimer.js est un content script. Côté Chrome, il charge le
 * module par un `import(chrome.runtime.getURL(...))` dynamique, que Firefox
 * refuse : la récupération des points ne démarrerait jamais. Même cas que
 * scripts/build-inline-predictions.mjs, même remède : on retire les mots-clés
 * `export` et on expose les noms sur window.__SP_POINTS_BONUS__.
 * js/points-bonus.js reste la source unique de vérité, importée par les tests.
 *
 * Relancer après toute modification du module :
 *   node scripts/build-inline-points-bonus.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const SRC = new URL("../js/points-bonus.js", import.meta.url);
const OUT = new URL("../js/inject/points-bonus-inline.js", import.meta.url);
const GLOBAL = "__SP_POINTS_BONUS__";

const source = await readFile(SRC, "utf8");

// Le module n'a aucun `import` : s'il en gagne un, la transformation ne tient
// plus et il vaut mieux s'arrêter que d'émettre un fichier silencieusement faux.
if (/^\s*import[\s{*]/m.test(source)) {
  throw new Error("js/points-bonus.js a gagné un import : ce générateur ne sait pas le résoudre.");
}
if (/\bexport\s+default\b/.test(source)) {
  throw new Error("export default non supporté : n'utiliser que des exports nommés.");
}

const names = [...source.matchAll(/^export\s+(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)]
  .map((match) => match[1]);
if (!names.length) throw new Error("aucun export nommé trouvé dans js/points-bonus.js");

const body = source.replace(/^export\s+/gm, "");
const banner = `/* GÉNÉRÉ par scripts/build-inline-points-bonus.mjs. Ne pas éditer à la main.\n   Source : js/points-bonus.js */\n`;
const assigns = names.map((name) => `    ${name},`).join("\n");

await writeFile(
  OUT,
  `${banner}(function () {\n${body.trimEnd()}\n\n  window.${GLOBAL} = {\n${assigns}\n  };\n})();\n`,
  "utf8"
);

console.log(`js/inject/points-bonus-inline.js généré : ${names.length} exports exposés sur window.${GLOBAL}`);
