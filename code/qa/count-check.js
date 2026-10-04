// code/qa/count-check.js — count vs data for JAH Wiki.
// Static: home page renders ns+np+nb live (no hardcoded total); api.json breakdown sums.
// Live: recount the real indexes (spec shards + patent idx + bizarre subjects) and
// compare against api.json's snapshot — live must be >= snapshot (data only grows).
// Usage: node code/qa/count-check.js [--static-only]
"use strict";
const fs = require("fs");
const path = require("path");
const {
  ROOT, INDEX_HTML, fetchJson, fetchGzJson, fetchGzLines,
  SPEC_SITE, PAT_SITE, LEAK_SITE,
} = require("./lib");

const STATIC_ONLY = process.argv.includes("--static-only");
let failures = 0;
function fail(msg) { failures++; console.log("  FAIL " + msg); }
function ok(msg) { console.log("  ok   " + msg); }

console.log("[static] count formula in index.html");
if (/\(ns\+np\+nb\)\.toLocaleString\(\)/.test(INDEX_HTML)) ok("total rendered as (ns+np+nb) — live computed");
else fail("live (ns+np+nb) total expression not found");
const hardTotal = INDEX_HTML.match(/<div class="n">\d[\d,]*<\/div><div class="l">[^<]*articles total<\/div><\/div>'/);
if (hardTotal) fail("suspicious hardcoded total near 'articles total'");
else ok("no hardcoded total near the count display");

console.log("[static] api.json snapshot");
const api = JSON.parse(fs.readFileSync(path.join(ROOT, "api.json"), "utf8"));
const bkey = Object.keys(api).find((k) => /^records_breakdown_/.test(k));
if (!bkey) fail("no records_breakdown_* snapshot in api.json");
else {
  const b = api[bkey];
  const sum = (b.spec_articles || 0) + (b.patent_articles || 0) + (b.subject_files || 0);
  if (sum === api.records_approx) ok("breakdown sums to records_approx (" + sum.toLocaleString() + ", as of " + bkey.replace("records_breakdown_", "") + ")");
  else fail("breakdown sums to " + sum + " but records_approx is " + api.records_approx);
}

console.log("[static] crawlable fallback count in raw HTML");
const fb = INDEX_HTML.match(/<strong>([\d,]+) (?:core encyclopedia )?articles indexed<\/strong>, as of (\d{4}-\d{2}-\d{2})/);
if (!fb) fail("static 'N articles indexed, as of YYYY-MM-DD' fallback not found in raw HTML");
else {
  const fbCount = parseInt(fb[1].replace(/,/g, ""), 10);
  ok("static fallback count present: " + fbCount.toLocaleString() + " (as of " + fb[2] + ")");
  if (fbCount === api.records_approx) ok("static fallback count matches api.json records_approx");
  else fail("static fallback count " + fbCount + " != api.json records_approx " + api.records_approx + " — refresh together");
  if (/What counts as a (core )?article/.test(INDEX_HTML)) ok("what-counts-as-an-article note present");
  else fail("what-counts note missing from static fallback");
  if (/id="methodology"/.test(INDEX_HTML)) ok("static Data & methodology section present in raw HTML");
  else fail("Data & methodology section missing");
  var fbN = fbCount; // used by the live comparison below
}

console.log("[static] browse.html (A-Z archive catalog) snapshot");
const browsePath = path.join(ROOT, "browse.html");
if (!fs.existsSync(browsePath)) fail("browse.html missing");
else {
  const bh = fs.readFileSync(browsePath, "utf8");
  const bs = bh.match(/<p class="sub" id="browse-snap"[^>]*><strong>([\d,]+) core encyclopedia articles<\/strong>, as of (\d{4}-\d{2}-\d{2})/);
  if (!bs) fail("browse.html snapshot line not found or malformed");
  else {
    const bCount = parseInt(bs[1].replace(/,/g, ""), 10);
    ok("browse.html snapshot count present: " + bCount.toLocaleString() + " (as of " + bs[2] + ")");
    if (bCount === api.records_approx) ok("browse.html snapshot matches api.json records_approx");
    else fail("browse.html snapshot " + bCount + " != api.json records_approx " + api.records_approx + " — run code/restamp_counts.py");
    for (const [id, key] of [["bn-spec", "spec_articles"], ["bn-pat", "patent_articles"], ["bn-sub", "subject_files"]]) {
      const m = bh.match(new RegExp('<div class="stat"><div class="n" id="' + id + '">([\\d,]+)</div>'));
      const want = bkey ? api[bkey][key] : null;
      if (!m) fail("browse.html stat card " + id + " not found");
      else if (want != null && parseInt(m[1].replace(/,/g, ""), 10) === want) ok("browse.html " + id + " matches breakdown (" + want.toLocaleString() + ")");
      else fail("browse.html " + id + " mismatch — run code/restamp_counts.py");
    }
  }
  if (bh.indexOf("%%N_CORE%%") >= 0) fail("browse.html still carries unstamped %%N_*%% tokens");
  else ok("browse.html tokens fully stamped");
}

(async () => {
  if (STATIC_ONLY) { console.log("[live] skipped (--static-only)"); }
  else {
    console.log("[live] recounting indexes (this downloads the index files)...");
    try {
      const sj = await fetchJson(SPEC_SITE + "/data/index/shards.json");
      const shards = Array.isArray(sj) ? sj : sj.shards;
      let ns = 0;
      for (const s of shards) {
        const base = (s.base || "").replace(/\/?$/, "") || SPEC_SITE;
        const lines = await fetchGzLines(base + "/" + s.index);
        ns += lines.length;
        process.stdout.write("  shard " + (s.base || "(main)") + ": " + lines.length.toLocaleString() + " rows\r");
      }
      console.log("\n  spec rows total: " + ns.toLocaleString());
      const pats = await fetchGzJson(PAT_SITE + "/data/patents.idx.json.gz");
      const np = Array.isArray(pats) ? pats.length : 0;
      console.log("  patent rows total: " + np.toLocaleString());
      const subs = await fetchJson(LEAK_SITE + "/data/bizarre.json");
      const nb = Array.isArray(subs) ? subs.length : 0;
      console.log("  subject rows total: " + nb.toLocaleString());
      const total = ns + np + nb;
      console.log("  LIVE TOTAL (ns+np+nb): " + total.toLocaleString());
      if (bkey) {
        const snap = api[bkey];
        const snapTotal = snap.spec_articles + snap.patent_articles + snap.subject_files;
        if (total >= snapTotal) ok("live total " + total.toLocaleString() + " >= snapshot " + snapTotal.toLocaleString() + " (grew " + (total - snapTotal).toLocaleString() + " since " + api.records_as_of + ")");
        else fail("live total " + total.toLocaleString() + " < snapshot " + snapTotal.toLocaleString() + " — DATA LOSS?");
        if (total > snapTotal * 1.5) fail("live total implausibly larger than snapshot — check for double counting");
      }
      if (typeof fbN === "number") {
        if (total >= fbN) ok("live total " + total.toLocaleString() + " >= static fallback snapshot " + fbN.toLocaleString());
        else fail("live total " + total.toLocaleString() + " < static fallback " + fbN.toLocaleString() + " — DATA LOSS?");
      }
      // persist for the other checkers / humans
      fs.writeFileSync(path.join(__dirname, "last-count.json"),
        JSON.stringify({ at: new Date().toISOString(), ns, np, nb, total }, null, 1));
      ok("wrote code/qa/last-count.json");
    } catch (e) { fail("live recount failed: " + String(e.message || e).slice(0, 200)); }
  }
  console.log(failures ? "\nRESULT: FAIL (" + failures + " failures)" : "\nRESULT: PASS");
  process.exit(failures ? 1 : 0);
})();
