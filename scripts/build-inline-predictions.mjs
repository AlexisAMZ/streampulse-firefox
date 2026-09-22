/**
 * Génère js/inject/predictions-data-inline.js depuis js/predictions-data.js.
 *
 * POURQUOI CE FICHIER EXISTE
 * predictionsAssist.js est un content script. Il chargeait le module par un
 * `import(chrome.runtime.getURL(...))` dynamique : Chrome l'accepte, Firefox
 * non. La promesse était rejetée, le `.catch` l'avalait, et l'assistance aux
 * prédictions ne démarrait jamais, sans le moindre message.
 *
 * Le module est pur et autonome (aucun chrome.*, aucun DOM, aucun import) :
 * l'émettre en script classique est une transformation mécanique, on retire
 * les mots-clés `export` et on expose les noms sur window.__SP_PREDICTIONS__.
 * js/predictions-data.js reste la source unique de vérité, importée telle
 * quelle par l'arrière-plan et par les tests.
 *
 * Relancer après toute modification du module :
 *   node scripts/build-inline-predictions.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const SRC = new URL("../js/predictions-data.js", import.meta.url);
const OUT = new URL("../js/inject/predictions-data-inline.js", import.meta.url);
const GLOBAL = "__SP_PREDICTIONS__";

const source = await readFile(SRC, "utf8");

// Le module n'a aucun `import` : s'il en gagne un, la transformation ne tient
// plus et il vaut mieux s'arrêter que d'émettre un fichier silencieusement faux.
if (/^\s*import[\s{*]/m.test(source)) {
  throw new Error(
    "js/predictions-data.js a gagné un import : ce générateur ne sait pas le résoudre."
  );
}
if (/\bexport\s+default\b/.test(source)) {
  throw new Error("export default non supporté : n'utiliser que des exports nommés.");
}

// Noms exportés : `export const X`, `export let X`, `export function X`.
const names = [...source.matchAll(/^export\s+(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)]
  .map((match) => match[1]);
if (!names.length) throw new Error("aucun export nommé trouvé dans js/predictions-data.js");

const body = source.replace(/^export\s+/gm, "");
const banner = `/* GÉNÉRÉ par scripts/build-inline-predictions.mjs. Ne pas éditer à la main.\n   Source : js/predictions-data.js */\n`;
const assigns = names.map((name) => `    ${name},`).join("\n");

await writeFile(
  OUT,
  `${banner}(function () {\n${body.trimEnd()}\n\n  window.${GLOBAL} = {\n${assigns}\n  };\n})();\n`,
  "utf8"
);

console.log(
  `js/inject/predictions-data-inline.js généré : ${names.length} exports exposés sur window.${GLOBAL}`
);
