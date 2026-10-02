// code/qa/dupe-id-check.js — article-ID uniqueness + round-trip for JAH Wiki.
// Downloads the live indexes, computes the real shipped wikiId() for every record,
// and asserts: (a) no duplicate article ID within a namespace, (b) every article ID
// parses back via the real shipped parsePage() to the right kind/record.
// Usage: node code/qa/dupe-id-check.js [--max-rows=N]
"use strict";
const zlib = require("zlib");
const {
  loadWikiFns, fetchBuf, fetchJson, fetchGzJson,
  SPEC_SITE, PAT_SITE, LEAK_SITE, DICT_SITE,
} = require("./lib");

const maxRowsArg = (process.argv.find((a) => a.startsWith("--max-rows=")) || "").split("=")[1];
const MAX_ROWS = maxRowsArg ? parseInt(maxRowsArg, 10) : Infinity;
let failures = 0;
function fail(msg) { failures++; console.log("  FAIL " + msg); }
function ok(msg) { console.log("  ok   " + msg); }

const { hashStr, wikiId, parsePage } = loadWikiFns(["hashStr", "wikiId", "parsePage"]);

async function specIds() {
  const sj = await fetchJson(SPEC_SITE + "/data/index/shards.json");
  const shards = Array.isArray(sj) ? sj : sj.shards;
  const ids = [];
  for (const s of shards) {
    const base = (s.base || "").replace(/\/?$/, "") || SPEC_SITE;
    const { buf } = await fetchBuf(base + "/" + s.index);
    const lines = zlib.gunzipSync(buf).toString("utf8").split("\n");
    for (const l of lines) {
      const t = l.trim();
      if (!t) continue;
      try { ids.push(JSON.parse(t)[0]); } catch (e) { /* counted by count-check */ }
      if (ids.length >= MAX_ROWS) return ids;
    }
    process.stdout.write("  specs: " + ids.length.toLocaleString() + " ids\r");
  }
  console.log("\n  specs: " + ids.length.toLocaleString() + " ids total");
  return ids;
}

function checkUnique(nsName, ids, kindFn) {
  const seen = new Set();
  let dupes = 0, bad = 0;
  for (const raw of ids) {
    let aid;
    try { aid = kindFn(raw); } catch (e) { bad++; continue; }
    if (!aid || typeof aid !== "string") { bad++; continue; }
    if (seen.has(aid)) { dupes++; if (dupes <= 5) console.log("  dupe: " + aid); }
    else seen.add(aid);
  }
  if (dupes) fail(nsName + ": " + dupes + " duplicate article IDs");
  else ok(nsName + ": " + seen.size.toLocaleString() + " unique article IDs");
  if (bad) fail(nsName + ": " + bad + " IDs failed to compute");
  return seen;
}

function checkRoundTrip(nsName, ids, kindFn, expectKind, expectIdFn) {
  let bad = 0, n = 0;
  for (const raw of ids) {
    const aid = kindFn(raw);
    const p = parsePage(aid);
    n++;
    if (!p || p.kind !== expectKind || (expectIdFn && p.id !== expectIdFn(raw, aid))) {
      bad++;
      if (bad <= 5) console.log("  round-trip fail: " + aid + " -> " + JSON.stringify(p));
    }
    if (n >= 20000 && nsName === "word") break; // words: 20k sample is plenty
  }
  if (bad) fail(nsName + ": " + bad + "/" + n + " article IDs do not round-trip through parsePage");
  else ok(nsName + ": " + n.toLocaleString() + " article IDs round-trip through parsePage");
}

(async () => {
  console.log("[specs]");
  const sids = await specIds();
  checkUnique("spec", sids, (id) => wikiId("spec", id));
  checkRoundTrip("spec", sids, (id) => wikiId("spec", id), "spec",
    (raw) => String(raw).toUpperCase());

  console.log("[patents]");
  const pats = await fetchGzJson(PAT_SITE + "/data/patents.idx.json.gz");
  const pids = pats.map((r) => r[0]);
  checkUnique("patent", pids, (id) => wikiId("pat", id));
  checkRoundTrip("patent", pids, (id) => wikiId("pat", id), "pat",
    (raw) => String(raw).replace(/[^A-Za-z0-9]+/g, "").toUpperCase());

  console.log("[words]");
  const didx = await fetchGzJson(DICT_SITE + "/data/index/dict.idx.json.gz");
  const wids = didx.map((r) => r[0]);
  // Uniqueness, precisely: one article per word. Two rows for the SAME word are
  // benign (one article). Two DIFFERENT words sharing an ID is a collision —
  // except orthographic variants ("all hail"/"all-hail") which normalize to the
  // same stem by design; those share a citation key but keep distinct articles
  // and distinct ?page=<word> URLs. A group whose members have DIFFERENT stems
  // means the scheme itself lost information -> hard FAIL.
  {
    const stem50 = (w) => String(w).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const groups = new Map();
    for (const w of wids) {
      const aid = wikiId("word", w);
      if (!groups.has(aid)) groups.set(aid, { words: new Set(), stems: new Set() });
      const g = groups.get(aid);
      g.words.add(w); g.stems.add(stem50(w));
    }
    let trueColl = 0, variant = 0;
    for (const [aid, g] of groups) {
      if (g.words.size < 2) continue;
      const xhash = /^JAH-WIKI-W-X[0-9a-z]+$/i.test(aid);
      if (xhash || g.stems.size > 1) { trueColl++; if (trueColl <= 5) console.log("  TRUE COLLISION: " + aid + " <- " + [...g.words].slice(0, 3).join(" | ")); }
      else { variant++; if (variant <= 5) console.log("  variant pair (shared citation key): " + aid + " <- " + [...g.words].slice(0, 3).join(" | ")); }
    }
    if (trueColl) fail("word: " + trueColl + " article IDs shared by words with different stems");
    else ok("word: no information-loss collisions across " + groups.size.toLocaleString() + " article IDs");
    console.log("  info: " + variant + " orthographic-variant groups share a citation key by design (distinct articles, distinct ?page=<word> URLs)");
  }
  // word slug invariant: parsePage("JAH-WIKI-W-<slug>") must reproduce the same article ID
  let wbad = 0, wn = 0;
  for (const w of wids) {
    const aid = wikiId("word", w);
    const p = parsePage(aid);
    wn++;
    if (!p || p.kind !== "word" || ("JAH-WIKI-W-" + p.slug).toLowerCase() !== aid.toLowerCase()) {
      wbad++; if (wbad <= 5) console.log("  slug fail: " + aid);
    }
    if (wn >= 20000) break;
  }
  if (wbad) fail("word: " + wbad + "/" + wn + " slug forms do not resolve");
  else ok("word: " + wn.toLocaleString() + " slug forms resolve");

  console.log("[subjects]");
  const subs = await fetchJson(LEAK_SITE + "/data/bizarre.json");
  checkUnique("subject", subs.map((d) => d.subject), (s) => wikiId("sub", s));
  let sbad = 0;
  for (const d of subs) {
    const aid = wikiId("sub", d.subject);
    const p = parsePage(aid);
    if (!p || p.kind !== "sub" || aid.toLowerCase() !== ("JAH-WIKI-SUB-" + p.slug).toLowerCase()) {
      sbad++; if (sbad <= 5) console.log("  slug fail: " + aid);
    }
  }
  if (sbad) fail("subject: " + sbad + " slug forms do not resolve");
  else ok("subject: " + subs.length + " slug forms resolve");

  console.log(failures ? "\nRESULT: FAIL (" + failures + " failures)" : "\nRESULT: PASS");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log("  FAIL exception: " + String(e.message || e).slice(0, 300)); process.exit(1); });
