import test from "node:test";
import assert from "node:assert/strict";
import { PLATFORM_DEFINITIONS, isYoutubeChannelId } from "../js/platforms.js";

const yt = PLATFORM_DEFINITIONS.youtube;

test("un handle @ est replié en minuscules", () => {
  assert.equal(yt.sanitizeHandle("@MaChaine"), "machaine");
});

test("un identifiant de chaîne UC garde sa casse", () => {
  const id = "UCabcdefghij1234567890";
  assert.equal(yt.sanitizeHandle(id), id);
  assert.ok(isYoutubeChannelId(id));
});

test("une URL collée est réduite au handle", () => {
  assert.equal(yt.sanitizeHandle("https://www.youtube.com/@MaChaine"), "machaine");
});

test("l'URL construite distingue handle et identifiant", () => {
  assert.equal(yt.buildUrl("@machaine"), "https://www.youtube.com/@machaine");
  assert.equal(
    yt.buildUrl("UCabcdefghij1234567890"),
    "https://www.youtube.com/channel/UCabcdefghij1234567890",
  );
});
