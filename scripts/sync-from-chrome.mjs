/**
 * Synchronise le code livré depuis la référence Chrome, puis réapplique les
 * divergences assumées de scripts/divergences.mjs.
 *
 *   node scripts/sync-from-chrome.mjs           # simulation
 *   node scripts/sync-from-chrome.mjs --write   # applique
 *
 * POURQUOI CE SCRIPT EXISTE
 * Le portage a d'abord été fait fichier par fichier, au jugé. Il a laissé
 * passer les 44 chaînes i18n de YouTube, le nom de l'extension, le panneau
 * de réglages « Lecteur » et le défaut d'annulation des raids. Recopier puis
 * réappliquer une liste écrite est vérifiable ; juger fichier par fichier ne
 * l'est pas.
 *
 * Le script s'arrête si un correctif ne s'applique plus : mieux vaut une
 * synchronisation qui échoue qu'un port silencieusement faux.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  NEVER_COPY, PORT_ONLY, GENERATED, PATCHES, BROWSER_NAME_KEYS, TAGLINES, LANGUAGES,
} from "./divergences.mjs";

const WRITE = process.argv.includes("--write");
const PORT = path.resolve(new URL("..", import.meta.url).pathname);
const REF = process.env.STREAMPULSE_CHROME_DIR || path.join(os.homedir(), "dev/StreamPulseExtension");

/**
 * Ce qui est synchronisé : le code livré, et les tests qui le couvrent. Les
 * tests comptent, sinon un correctif recopié arrive avec l'ancien test et
 * casse la suite, ou pire, passe avec une assertion périmée.
 * Les scripts, docs et visuels de boutique divergent exprès et restent dehors.
 */
const SYNCED = /^(js|css|html|i18n|_locales|tests)\//;

function die(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function tracked(repo) {
  return execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" }).trim().split("\n");
}

if (!fs.existsSync(REF)) die(`dépôt de référence introuvable : ${REF}`);
for (const file of PORT_ONLY) {
  if (!fs.existsSync(path.join(PORT, file))) die(`fichier propre au port disparu : ${file}`);
}

const refFiles = new Set(tracked(REF));
const generated = new Set(GENERATED.map((entry) => entry.file));
const skip = new Set([...NEVER_COPY, ...PORT_ONLY, ...generated]);

const portFiles = new Set(tracked(PORT));
const candidates = [...refFiles].filter((file) => SYNCED.test(file) && !skip.has(file));

// Un fichier neuf cote reference doit arriver : ne comparer que l'existant
// laisserait le port sans les fichiers ajoutes depuis le dernier portage.
const added = candidates.filter((file) => !portFiles.has(file));
const changed = candidates.filter((file) => {
  if (!portFiles.has(file)) return false;
  const a = fs.readFileSync(path.join(PORT, file));
  const b = fs.readFileSync(path.join(REF, file));
  return !a.equals(b);
});

console.log(`Référence : ${REF}`);
console.log(`${candidates.length} fichiers comparés : ${changed.length} à resynchroniser, ${added.length} à ajouter.`);
for (const file of changed) console.log(`  ~ ${file}`);
for (const file of added) console.log(`  + ${file}`);
console.log(`\nJamais recopiés : ${[...skip].join(", ")}`);

if (!WRITE) {
  console.log("\nSimulation : rien n'a été écrit. Relancer avec --write.");
  process.exit(0);
}

for (const file of [...changed, ...added]) {
  fs.mkdirSync(path.dirname(path.join(PORT, file)), { recursive: true });
  fs.copyFileSync(path.join(REF, file), path.join(PORT, file));
}
console.log(`\n${changed.length} fichiers recopiés, ${added.length} ajoutés.`);

// ─── Réapplication des divergences ──────────────────────────────────────────

for (const { file, why, edits } of PATCHES) {
  const full = path.join(PORT, file);
  let source = fs.readFileSync(full, "utf8");
  for (const { find, replace, count = 1 } of edits) {
    const seen = source.split(find).length - 1;
    if (seen !== count) {
      die(
        `${file} : ancre introuvable ou ambiguë (${seen} occurrence(s), ${count} attendue(s)).\n` +
          `  Divergence concernée : ${why}\n` +
          `  La référence a probablement changé ce code. Mettre à jour scripts/divergences.mjs.`,
      );
    }
    source = source.replace(find, replace);
  }
  fs.writeFileSync(full, source, "utf8");
  console.log(`  correctif appliqué : ${file}`);
}

// Textes : le nom du navigateur, borné aux clés concernées.
const i18nPath = path.join(PORT, "i18n/translations.js");
let i18n = fs.readFileSync(i18nPath, "utf8");
let renamed = 0;
i18n = i18n.replace(
  new RegExp(`^(\\s*)"(${BROWSER_NAME_KEYS.join("|")})": "(.*?)"(,?)$`, "gm"),
  (line, indent, key, value, comma) => {
    if (!value.includes("Chrome")) return line;
    renamed += 1;
    return `${indent}"${key}": "${value.replaceAll("Chrome", "Firefox")}"${comma}`;
  },
);

let taglines = 0;
let language = null;
i18n = i18n
  .split("\n")
  .map((line) => {
    const lang = /^ {2}"([a-zA-Z-]+)": \{$/.exec(line);
    if (lang) language = lang[1];
    const tag = /^(\s*)"welcomeTagline": ".*?"(,?)$/.exec(line);
    if (!tag) return line;
    const value = TAGLINES[language] || die(`pas de welcomeTagline Firefox pour ${language}`);
    taglines += 1;
    return `${tag[1]}"welcomeTagline": "${value}"${tag[2]}`;
  })
  .join("\n");

if (taglines !== LANGUAGES.length) die(`welcomeTagline : ${taglines} réécrits, ${LANGUAGES.length} attendus.`);
fs.writeFileSync(i18nPath, i18n, "utf8");
console.log(`  textes : ${renamed} mentions de navigateur et ${taglines} accroches passées à Firefox`);

for (const { file, script } of GENERATED) {
  execFileSync("node", [script], { cwd: PORT, stdio: "inherit" });
  if (!fs.existsSync(path.join(PORT, file))) die(`${script} n'a pas produit ${file}`);
}

console.log("\nSynchronisation terminée. Lancer : npm run lint && npm test && npm run verify");
