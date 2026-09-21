/**
 * Le jumeau en script classique livré aux content scripts doit rester
 * identique au module. S'il dérive, l'assistance aux prédictions tourne avec
 * une vieille logique sans que rien ne le signale : ce test est le garde-fou.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as module from "../js/predictions-data.js";

const INLINE = new URL("../js/inject/predictions-data-inline.js", import.meta.url);

function loadInline() {
  const window = {};
  new Function("window", readFileSync(INLINE, "utf8"))(window);
  return window.__SP_PREDICTIONS__;
}

test("le jumeau expose exactement les mêmes noms que le module", () => {
  const inline = loadInline();
  assert.ok(inline, "window.__SP_PREDICTIONS__ absent : relancer scripts/build-inline-predictions.mjs");
  const expected = Object.keys(module).sort();
  assert.deepEqual(Object.keys(inline).sort(), expected);
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

test("le jumeau produit les mêmes décisions que le module", () => {
  const inline = loadInline();
  const rule = module.normalizeRule({ strategy: "majority" });
  const event = module.parseEvent({
    id: "evt-1",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    prediction_window_seconds: 120,
    outcomes: [
      { id: "a", total_points: 900, total_users: 30 },
      { id: "b", total_points: 100, total_users: 5 },
    ],
  });
  assert.ok(event, "l'événement de test doit être analysable");
  assert.deepEqual(inline.decideBet(event, 5000, rule, [], Date.now()),
                   module.decideBet(event, 5000, rule, [], Date.now()));
  assert.deepEqual(inline.chooseOutcome(event, rule), module.chooseOutcome(event, rule));
});
