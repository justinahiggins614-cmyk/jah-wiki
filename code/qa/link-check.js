// code/qa/link-check.js — full link audit for JAH Wiki.
// 1) Static: THE JAH NETWORK bar has the 12 canonical links in canonical order.
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
  ["https://justinahiggins614-cmyk.github.io/jah-ai-models/", "The Signature AI Telephone Book"],
  ["https://justinahiggins614-cmyk.github.io/jah-calculator/", "Signature Universal Paradox Immune Calculator"],
  ["https://justinahiggins614-cmyk.github.io/jah-dictionary/", "The Signature Dictionary"],
  ["https://justinahiggins614-cmyk.github.io/jah-wiki/", "JAH Wiki"],
  ["https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks/", "JAH-N Wiki"],
  ["https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/", "Globally Rejustered Patent Catalog"],
  ["https://justinahiggins614-cmyk.github.io/signature-one-archive/specs.html", "Signature Spec Catalog Pending Patents"],
  ["https://justinahiggins614-cmyk.github.io/signature-llama/", "Signature Llama"],
  ["https://justinahiggins614-cmyk.github.io/jah-computer-systems/", "The Signature PC System Depository"],
  ["https://justinahiggins614-cmyk.github.io/signature-cyber-mega-mall/", "Signature Cyber Mega-Mall"],
  ["https://justinahiggins614-cmyk.github.io/signature-university/", "Signature University"],
  ["https://justinahiggins614-cmyk.github.io/signature-books/", "The Signature Book Depository"],
];
console.log("[nav] THE JAH NETWORK bar");
const navDiv = (INDEX_HTML.match(/<div class="jahnet">[\s\S]*?<\/div>/) || [""])[0];
if (!navDiv) { fail("jahnet nav div not found"); }
else {
  const links = [...navDiv.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
  if (links.length !== 12) fail("nav has " + links.length + " links, expected 12");
  CANON.forEach(([href, label], i) => {
    const got = links[i];
    if (!got) { fail("nav position " + (i + 1) + " missing"); return; }
    if (got[0] !== href || got[1] !== label)
      fail("nav position " + (i + 1) + ": got [" + got[1] + "](" + got[0] + "), want [" + label + "](" + href + ")");
  });
  if (links.length === 12 && CANON.every(([h, l], i) => links[i][0] === h && links[i][1] === l))
    ok("12 links in canonical order with canonical destinations");
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
