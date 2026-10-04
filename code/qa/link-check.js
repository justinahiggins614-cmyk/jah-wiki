// code/qa/link-check.js — full link audit for JAH Wiki.
// 1) Static: THE JAH NETWORK bar has the 27-site canonical links in canonical order
//    (wiki's own entry is a "YOU ARE HERE: JAH WIKI" span, so 24 link elements).
// 2) Live: every external URL referenced by index.html / sitemap.xml / robots.txt /
//    api.json is fetched (HEAD, GET fallback) and must return 2xx/3xx.
// Usage: node code/qa/link-check.js [--static-only]
"use strict";
const fs = require("fs");
const path = require("path");
const { ROOT, INDEX_HTML, WIKI_HOME } = require("./lib");

const STATIC_ONLY = process.argv.includes("--static-only");
let failures = 0;
function fail(msg) { failures++; console.log("  FAIL " + msg); }
function ok(msg) { console.log("  ok   " + msg); }

// ---- 1) nav bar order + destinations ----
const CANON = [
  ["https://justinahiggins614-cmyk.github.io/jah-ai-models/", "The Signature AI Phone Book"],
  ["https://justinahiggins614-cmyk.github.io/jah-calculator/", "Calculator"],
  ["https://justinahiggins614-cmyk.github.io/jah-dictionary/", "Dictionary"],
  ["https://justinahiggins614-cmyk.github.io/jah-wiki/", "JAH Wiki"],
  ["https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks/", "JAH-N Wiki"],
  ["https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/", "Patent Catalog"],
  ["https://justinahiggins614-cmyk.github.io/signature-one-archive/specs.html", "Spec Catalog"],
  ["https://justinahiggins614-cmyk.github.io/signature-llama/", "Signature Llama"],
  ["https://justinahiggins614-cmyk.github.io/jah-computer-systems/", "PC Depository"],
  ["https://justinahiggins614-cmyk.github.io/signature-cyber-mega-mall/", "Cyber Mega-Mall"],
  ["https://justinahiggins614-cmyk.github.io/signature-university/", "Signature University"],
  ["https://justinahiggins614-cmyk.github.io/signature-books/", "Book Depository"],
  ["https://justinahiggins614-cmyk.github.io/signature-comics/", "Comic Store"],
  ["https://justinahiggins614-cmyk.github.io/signature-newspapers/", "Global Newspaper Archive"],
  ["https://justinahiggins614-cmyk.github.io/signature-3d-print/", "3D Print Mega Mall"],
  ["https://justinahiggins614-cmyk.github.io/signature-backend/", "Mad Scientist Lab"],
  ["https://justinahiggins614-cmyk.github.io/signature-boundless-generators/", "Boundless Generator Archive"],
  ["https://justinahiggins614-cmyk.github.io/signature-ai-mixlab/", "AI Mix Lab"],
  ["https://justinahiggins614-cmyk.github.io/signature-ai-olypics/", "AI Olypics"],
  ["https://justinahiggins614-cmyk.github.io/signature-chip-maker/", "Chip Maker and Archive"],
  ["https://justinahiggins614-cmyk.github.io/signature-app-archive/", "App Archive"],
  ["https://justinahiggins614-cmyk.github.io/signature-ai-robot-matcher/", "AI Robot Matcher"],
  ["https://justinahiggins614-cmyk.github.io/signature-experiment-solver/", "Experiment Solver"],
  ["https://justinahiggins614-cmyk.github.io/signature-ai-image-video-maker/", "Signature AI Pixel"],
  ["https://justinahiggins614-cmyk.github.io/signature-ai-song-maker/", "Signature Music Studio"],
];
console.log("[nav] THE JAH NETWORK bar");
const navDiv = (INDEX_HTML.match(/<div class="jahnet">[\s\S]*?<\/div>/) || [""])[0];
if (!navDiv) { fail("jahnet nav div not found"); }
else {
  const links = [...navDiv.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
  const expect = CANON.filter(([h]) => h !== WIKI_HOME);
  if (links.length !== expect.length) fail("nav has " + links.length + " links, expected " + expect.length);
  expect.forEach(([href, label], i) => {
    const got = links[i];
    if (!got) { fail("nav position " + (i + 1) + " missing"); return; }
    if (got[0] !== href || got[1] !== label)
      fail("nav position " + (i + 1) + ": got [" + got[1] + "](" + got[0] + "), want [" + label + "](" + href + ")");
  });
  if (links.length === expect.length && expect.every(([h, l], i) => links[i][0] === h && links[i][1] === l))
    ok("27-site canon in canonical order with canonical destinations (self = YOU ARE HERE span)");
  if (!/YOU ARE HERE: JAH WIKI/.test(navDiv)) fail("YOU ARE HERE marker missing from nav");
  else ok("YOU ARE HERE: JAH WIKI marker present");
}

// ---- 2) collect URLs ----
console.log("[urls] collecting");
const urls = new Set();
function addUrl(u) {
  if (!u || u.startsWith("#") || u.startsWith("?") || u.startsWith("mailto:") ||
      u.startsWith("javascript:") || u.startsWith("data:")) return;
  if (/sitemaps\.org\/schemas/.test(u)) return; // XML namespace identifier, not a link
  if (/^https?:\/\//i.test(u)) urls.add(u.split("#")[0]);
  else if (u.startsWith("/")) urls.add("https://justinahiggins614-cmyk.github.io" + u.split("#")[0]);
}
for (const m of INDEX_HTML.matchAll(/(?:href|src)="([^"]+)"/g)) addUrl(m[1]);
for (const f of ["sitemap.xml", "sitemap-pages.xml", "robots.txt"]) {
  const t = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const m of t.matchAll(/https?:\/\/[^\s"<]+/g)) addUrl(m[0]);
}
const api = JSON.parse(fs.readFileSync(path.join(ROOT, "api.json"), "utf8"));
const apiText = JSON.stringify(api);
const baseUrls = new Set();
for (const m of apiText.matchAll(/"(raw_github_base|[^"]*base[^"]*)"\s*:\s*"([^"]+)"/g)) baseUrls.add(m[2]);
for (const m of apiText.matchAll(/https?:\/\/[^"\\\s]+/g)) { const u = m[0]; if (!baseUrls.has(u)) addUrl(u); }
if (baseUrls.size) console.log("  skipping " + baseUrls.size + " documented base-prefix URL(s): " + [...baseUrls].join(", "));
console.log("  found " + urls.size + " distinct external URLs");

// ---- 3) live check ----
// Live check via curl (sandbox lesson 2026-10-01: language-runtime HTTP stacks hang
// on some hosts through the egress proxy; curl works).
const { execFile } = require("child_process");
function checkOne(u) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code} %{url_effective}", "-L",
      "--max-time", "25", "-A", "jah-wiki-qa-linkcheck", u],
      { timeout: 30000 }, (err, stdout) => {
        const m = /^(\d{3})\s+(\S+)/.exec(String(stdout || "").trim());
        if (m) resolve({ url: u, status: parseInt(m[1], 10), final: m[2] });
        else resolve({ url: u, status: 0, error: String((err && err.message) || "no response").slice(0, 120) });
      });
  });
}

(async () => {
  if (STATIC_ONLY) { console.log("[live] skipped (--static-only)"); }
  else {
    console.log("[live] fetching");
    const list = [...urls];
    const CONC = 6;
    for (let i = 0; i < list.length; i += CONC) {
      const batch = await Promise.all(list.slice(i, i + CONC).map(checkOne));
      for (const b of batch) {
        if (b.status >= 200 && b.status < 400) ok(b.status + " " + b.url);
        else fail((b.status || "ERR") + " " + b.url + (b.error ? " (" + b.error + ")" : ""));
      }
    }
  }
  console.log(failures ? "\nRESULT: FAIL (" + failures + " failures)" : "\nRESULT: PASS");
  process.exit(failures ? 1 : 0);
})();
