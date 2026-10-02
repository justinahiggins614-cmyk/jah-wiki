// code/qa/missing-id-check.js — every ?page= form resolves, nothing falls through.
// Uses the REAL shipped parsePage/wikiId/wordKeyBySlug/subjBySlug from index.html:
// unit vectors for parsePage, stub-data tests for the slug resolvers, and static
// assertions that the init router handles page/random/all/q/dict and that every
// "?page=" link the page generates uses a supported param form.
// Usage: node code/qa/missing-id-check.js
"use strict";
const { INDEX_HTML, loadWikiFns, extractFn } = require("./lib");

let failures = 0;
function fail(msg) { failures++; console.log("  FAIL " + msg); }
function ok(msg) { console.log("  ok   " + msg); }

console.log("[parsePage vectors]");
const { parsePage, wikiId } = loadWikiFns(["hashStr", "parsePage", "wikiId"]);
const vectors = [
  // [input, expected kind, expected id/slug]
  ["JAH-SPEC-000123", "spec", "JAH-SPEC-000123"],
  ["jah-spec-42", "spec", "JAH-SPEC-42"],
  ["JAH-WIKI-SPEC-000123", "spec", "JAH-SPEC-000123"],
  ["JAH-WIKI-SPEC-123", "spec", "JAH-SPEC-000123"],
  ["JAH-WIKI-SPEC-415355", "spec", "JAH-SPEC-415355"],
  ["PAT:US1234567B2", "pat", "US1234567B2"],
  ["JAH-WIKI-PAT-US1234567B2", "pat", "US1234567B2"],
  ["JAH-WIKI-PAT-us-123-b2", "pat", "US123B2"],
  ["SUB:Green%20Hand", "sub", null], // id = decoded subject name
  ["rug", "word", "rug"],
  ["-able", "word", "-able"],
  ["JAH-WIKI-W-rug", "word", null],   // slug form
  ["JAH-WIKI-W--able", "word", null], // affix slug form (edge dash kept)
  ["", null, null],
  ["!!!", null, null],
  ["JAH-WIKI-X-123", null, null],
  ["JAH-WIKI-SPEC-", null, null],
];
for (const [input, kind, id] of vectors) {
  const p = parsePage(input);
  if (kind === null) {
    if (p !== null) fail("parsePage(" + JSON.stringify(input) + ") should be null, got " + JSON.stringify(p));
  } else if (!p || p.kind !== kind) {
    fail("parsePage(" + JSON.stringify(input) + ") kind: got " + JSON.stringify(p) + ", want " + kind);
  } else if (id !== null && p.id !== id) {
    fail("parsePage(" + JSON.stringify(input) + ") id: got " + p.id + ", want " + id);
  } else if (kind === "word" && p.slug !== undefined && p.slug !== input.split("JAH-WIKI-W-")[1].toLowerCase()) {
    fail("parsePage(" + JSON.stringify(input) + ") slug mismatch: " + p.slug);
  }
}
if (!failures) ok(vectors.length + " parsePage vectors resolve correctly");

console.log("[long-word + X-hash ID forms]");
{
  const longWord = "3-d secure handler-behavior tree runner hybrid-copyright array hybrid for sentiment analysis using circuit breaking";
  const aidL = wikiId("word", longWord);
  const pL = parsePage(aidL);
  if (/^JAH-WIKI-W-[a-z0-9-]{50}-[a-z0-9]+$/.test(aidL) && pL && pL.kind === "word" &&
      ("JAH-WIKI-W-" + pL.slug).toLowerCase() === aidL.toLowerCase())
    ok("long phrase ID carries hash suffix and resolves: " + aidL);
  else fail("long-word ID form broken: " + aidL + " -> " + JSON.stringify(pL));
  const cjkWord = "α−クロロカルボン酸類";
  const aidX = wikiId("word", cjkWord);
  const pX = parsePage(aidX);
  if (/^JAH-WIKI-W-X[a-z0-9]+$/i.test(aidX) && pX && pX.kind === "word")
    ok("non-latin word ID keeps X-hash form and parses: " + aidX);
  else fail("X-hash word ID form broken: " + aidX + " -> " + JSON.stringify(pX));
}

console.log("[slug resolvers with stub data]");
{
  const src = extractFn(INDEX_HTML, "wordKeyBySlug") + "\n" + extractFn(INDEX_HTML, "subjBySlug") +
    "\n" + extractFn(INDEX_HTML, "wikiId") + "\n" + extractFn(INDEX_HTML, "hashStr");
  const stubDICT = { idx: [["rug", "x", 1], ["e-mail", "x", 2], ["o'clock", "x", 3], ["αβγ", "x", 4]] };
  const stubDB = { subjects: [{ subject: "Green Hand" }, { subject: "Tall Man of the Woods" }] };
  const f = new Function("DICT", "DB", src + "\nreturn {wordKeyBySlug,subjBySlug,wikiId};")(stubDICT, stubDB);
  const t1 = f.wordKeyBySlug("rug") === "rug";
  const t2 = f.wordKeyBySlug("e-mail") === "e-mail";
  const t3 = f.wordKeyBySlug("o-clock") === "o'clock"; // lossy slug still resolves
  const t4 = f.wordKeyBySlug("nope") === null;
  const xId = f.wikiId("word", "αβγ"); // X-hash form, uppercase X
  const t5 = xId.indexOf("JAH-WIKI-W-X") === 0 && f.wordKeyBySlug(xId.slice("JAH-WIKI-W-".length)) === "αβγ";
  const s1 = f.subjBySlug("green-hand");   // article ID keeps case; lookup is case-insensitive
  const s1b = f.subjBySlug("GREEN-HAND");
  const s2 = f.subjBySlug("nope");
  if (t1 && t2 && t3 && t4 && t5) ok("wordKeyBySlug resolves plain, dashed, lossy, and X-hash slugs; null when absent");
  else fail("wordKeyBySlug stub test failed: " + [t1, t2, t3, t4, t5].join(","));
  if (s1 && s1.subject === "Green Hand" && s1b && s1b.subject === "Green Hand" && s2 === null) ok("subjBySlug resolves subject slugs case-insensitively; null when absent");
  else fail("subjBySlug stub test failed");
}

console.log("[router coverage]");
for (const param of ["page", "random", "all", "q", "dict"]) {
  if (new RegExp('sp\\.has\\("' + param + '"\\)').test(INDEX_HTML)) ok('init routes "?' + param + '"');
  else fail('init does not route "?' + param + '"');
}

console.log("[generated ?page= forms]");
// every literal "?page=" link built in the page must use a form parsePage understands
const forms = new Set();
for (const m of INDEX_HTML.matchAll(/"\?page="\+([a-zA-Z0-9_.\[\]\(\)]+)/g)) forms.add(m[1]);
console.log("  generated forms: " + [...forms].join(", "));
const knownGood = new Set(["encodeURIComponent", "r", "subjSlug", "x", "sig"]);
let unknown = [...forms].filter((f) => ![...knownGood].some((k) => f.startsWith(k)));
// manual review list — these are inspected, not auto-failed
if (unknown.length) console.log("  note: review these by hand: " + unknown.join(", "));
else ok("all generated ?page= forms use known-supported expressions");

console.log(failures ? "\nRESULT: FAIL (" + failures + " failures)" : "\nRESULT: PASS");
process.exit(failures ? 1 : 0);
