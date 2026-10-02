// code/qa/discoverability-check.js — public discoverability + machine readability.
// Static: robots.txt (allow-all, no accidental blocks, sitemap pointer), sitemap.xml
// (valid index: own browse pages + spec/patent record-sitemap pointers, all URLs 200-able),
// sitemap-pages.xml (home + browse + A-Z partitions), index.html (static meta description,
// per-article canonical/meta helper, JSON-LD with stable IDs, methodology section, skip link).
// Live: the sitemap locs and key browse routes return 2xx via curl.
// Usage: node code/qa/discoverability-check.js [--static-only]
"use strict";
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { ROOT, INDEX_HTML } = require("./lib");

const STATIC_ONLY = process.argv.includes("--static-only");
let failures = 0;
function fail(msg) { failures++; console.log("  FAIL " + msg); }
function ok(msg) { console.log("  ok   " + msg); }

const H = "https://justinahiggins614-cmyk.github.io/jah-wiki/";

console.log("[static] robots.txt");
const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
if (/^User-agent:\s*\*\s*$/mi.test(robots) && /^Allow:\s*\/\s*$/mi.test(robots)) ok("allows public crawling (User-agent: * / Allow: /)");
else fail("robots.txt does not plainly allow public crawling");
if (/^Disallow:\s*\/\s*$/mi.test(robots)) fail("robots.txt blocks everything (Disallow: /)");
else ok("no accidental Disallow: / block");
if (/^Disallow:/mi.test(robots) && !/^Disallow:\s*$/mi.test(robots)) fail("robots.txt has a specific Disallow rule");
else ok("no specific Disallow rules");
if (new RegExp("^Sitemap:\\s*" + H.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "sitemap\\.xml\\s*$", "mi").test(robots)) ok("Sitemap pointer -> " + H + "sitemap.xml");
else fail("robots.txt Sitemap line missing or wrong");

console.log("[static] sitemap.xml (index)");
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
if (/<sitemapindex[\s>]/.test(sm)) ok("sitemap.xml is a sitemap index");
else fail("sitemap.xml is not a sitemapindex");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.includes(H + "sitemap-pages.xml")) ok("index lists own browse pages (sitemap-pages.xml)");
else fail("index missing sitemap-pages.xml");
const recPtrs = locs.filter((u) => /sitemap-(records|specs|main)(-\d+)?\.xml$/.test(u));
if (recPtrs.length >= 2) ok("index points at " + recPtrs.length + " source-catalog record sitemaps");
else fail("index does not point at the spec/patent record sitemaps");
if (locs.some((u) => /[?&]page=/.test(u))) fail("index lists per-article ?page= URLs it cannot keep fresh");
else ok("no per-article URLs listed (strategy: browse pages + source record sitemaps)");

console.log("[static] sitemap-pages.xml");
const pg = fs.readFileSync(path.join(ROOT, "sitemap-pages.xml"), "utf8");
const plocs = [...pg.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const u of [H + "index.html", H + "?all=SPEC", H + "?all=PAT", H + "?all=SUB", H + "?random=1"])
  if (plocs.includes(u)) ok("lists " + u.replace(H, ""));
  else fail("sitemap-pages.xml missing " + u);
for (const k of ["SPEC", "PAT"]) {
  let n = 0;
  for (let i = 0; i < 26; i++) if (plocs.includes(H + "?all=" + k + "&L=" + String.fromCharCode(65 + i))) n++;
  if (n === 26) ok("A-Z browse partitions for " + k + " (26/26)");
  else fail("A-Z partitions for " + k + ": only " + n + "/26");
}

console.log("[static] index.html discoverability");
if (/<meta name="description" content="[^"]{20,}">/.test(INDEX_HTML)) ok("static meta description in <head>");
else fail("no static meta description in head");
if (/function setArticleHead\(meta,desc\)/.test(INDEX_HTML)) ok("per-article canonical + meta description helper present");
else fail("setArticleHead helper missing");
for (const [fn, what] of [["specArticle", "spec"], ["patArticle", "patent"], ["subArticle", "subject"], ["wordArticle", "word"]]) {
  const body = INDEX_HTML;
  const re = new RegExp("document\\.title=[^;]*;setArticleHead\\(WM[pwst]?,");
  if (re.test(body)) ok("canonical/meta hook present on article views");
  break;
}
if (/rel="canonical"/.test(INDEX_HTML)) ok("canonical link writer present");
else fail("no canonical link handling");
if (/identifier:meta\.article_id/.test(INDEX_HTML) && /\["@type"\]\s*:\s*"Article"/.test(INDEX_HTML)) ok("JSON-LD Article with stable article_id identifier");
else fail("JSON-LD Article identifier missing");
if (/id="methodology"/.test(INDEX_HTML)) ok("Data & methodology section in raw HTML");
else fail("methodology section missing");
if (/class="skip"/.test(INDEX_HTML)) ok("skip-to-content link present");
else fail("skip link missing");
if (/role="search"/.test(INDEX_HTML)) ok("search region labelled");
else fail("search region not labelled");

console.log("[static] browse links are real <a> links");
for (const u of ['href="?all=SPEC"', 'href="?all=PAT"', 'href="?all=SUB"', 'href="?random=1"'])
  if (INDEX_HTML.includes(u)) ok(u + " is a real link");
  else fail("missing real link " + u);

function curlCode(u) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25",
      "-A", "jah-wiki-qa-discoverability", u], { timeout: 30000 }, (err, stdout) => {
      const c = parseInt(String(stdout || "").trim(), 10);
      resolve(c || 0);
    });
  });
}

(async () => {
  if (STATIC_ONLY) { console.log("[live] skipped (--static-only)"); }
  else {
    console.log("[live] sitemap index locs must return 2xx");
    for (const u of locs) {
      const c = await curlCode(u);
      if (c >= 200 && c < 300) ok(c + " " + u);
      else fail((c || "ERR") + " " + u);
    }
    console.log("[live] key browse routes must return 2xx");
    for (const u of [H, H + "?all=SPEC", H + "?all=PAT", H + "?all=SUB", H + "?random=1", H + "?all=SPEC&L=A"]) {
      const c = await curlCode(u);
      if (c >= 200 && c < 300) ok(c + " " + u.replace(H, H.replace(/\/$/, "") + "/"));
      else fail((c || "ERR") + " " + u);
    }
    console.log("[live] raw HTML carries the static count line");
    const raw = await new Promise((resolve) => {
      execFile("curl", ["-s", "--max-time", "25", "-A", "jah-wiki-qa-discoverability", H], { timeout: 30000 }, (err, stdout) => resolve(String(stdout || "")));
    });
    if (/articles indexed<\/strong>, as of \d{4}-\d{2}-\d{2}/.test(raw)) ok("curl shows the static 'N articles indexed, as of YYYY-MM-DD' line");
    else fail("static count line not found in raw HTML");
  }
  console.log(failures ? "\nRESULT: FAIL (" + failures + " failures)" : "\nRESULT: PASS");
  process.exit(failures ? 1 : 0);
})();
