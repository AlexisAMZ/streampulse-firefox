/**
 * Le jumeau en script classique livré aux content scripts doit rester
 * identique au module. S'il dérive, la récupération des points tourne avec une
 * vieille règle sans que rien ne le signale : ce test est le garde-fou.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as module from "../js/points-bonus.js";

const INLINE = new URL("../js/inject/points-bonus-inline.js", import.meta.url);

function loadInline() {
  const window = {};
  new Function("window", readFileSync(INLINE, "utf8"))(window);
  return window.__SP_POINTS_BONUS__;
}

test("le jumeau expose exactement les mêmes noms que le module", () => {
  const inline = loadInline();
  assert.ok(inline, "window.__SP_POINTS_BONUS__ absent : relancer scripts/build-inline-points-bonus.mjs");
  assert.deepEqual(Object.keys(inline).sort(), Object.keys(module).sort());
});

test("le jumeau n'est pas périmé : mêmes constantes, mêmes fonctions", () => {
  const inline = loadInline();
  for (const [name, value] of Object.entries(module)) {
    if (typeof value === "function") {
      assert.equal(String(inline[name]), String(value), `${name} a dérivé`);
    } else {
      assert.deepEqual(inline[name], value, `${name} a dérivé`);
    }
  }
});

test("le jumeau écarte le bouton cadeau et trouve la caisse comme le module", () => {
  const inline = loadInline();
  const buttons = [
    { label: "Gift Bonus Subs", dataTarget: "gift-button", inPointsSummary: false },
    { label: "Soldes de Bits et de points", inPointsSummary: true },
    { label: "Claim Bonus", hasBonusIcon: true, inPointsSummary: true },
  ];
  assert.equal(inline.pickBonusChest(buttons), 2);
  assert.equal(inline.pickBonusChest(buttons), module.pickBonusChest(buttons));
});
