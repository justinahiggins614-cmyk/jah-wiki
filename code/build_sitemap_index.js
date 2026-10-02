// code/build_sitemap_index.js — rebuild sitemap.xml (the sitemap index) for JAH Wiki.
// Strategy: (a) this wiki's own browse pages (sitemap-pages.xml); (b) pointers to the
// Spec Catalog's and Patent Catalog's OWN record sitemaps, where the 460,000+ record
// URLs live with the catalogs that own them and keep them fresh. The wiki never
// duplicates record-level URLs it cannot refresh. Only URLs that return 200 are
// listed — sitemaps still deploying are skipped now and picked up on a re-run.
// Usage: node code/build_sitemap_index.js
"use strict";
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const WIKI = "https://justinahiggins614-cmyk.github.io/jah-wiki/";
const SPEC_CLONE = path.resolve(ROOT, "..", "signature-one-archive");
const SPEC_IDX = path.join(SPEC_CLONE, "sitemap-index.xml");
const PAT_RECORDS = ["https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/sitemap-records-1.xml",
  "https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/sitemap-records-2.xml"];

function curlCode(u) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25",
      "-A", "jah-wiki-sitemap-builder", u], { timeout: 30000 }, (err, stdout) => {
      resolve(parseInt(String(stdout || "").trim(), 10) || 0);
    });
  });
}

(async () => {
  const recordLocs = [];
  // Spec Catalog's own record sitemaps, from the committed source of truth.
  if (fs.existsSync(SPEC_IDX)) {
    const xml = fs.readFileSync(SPEC_IDX, "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1];
      if (u === "https://justinahiggins614-cmyk.github.io/signature-one-archive/sitemap.xml") continue; // browse pages, not records
      if (/sitemap-(specs|main|records)/.test(u)) recordLocs.push(u);
    }
  } else {
    console.log("note: spec catalog clone not found; skipping spec record pointers");
  }
  for (const u of PAT_RECORDS) recordLocs.push(u);

  const keep = [WIKI + "sitemap-pages.xml"];
  const skipped = [];
  for (const u of recordLocs) {
    const c = await curlCode(u);
    if (c >= 200 && c < 300) { keep.push(u); console.log("  200 " + u); }
    else { skipped.push(u); console.log("  skip " + (c || "ERR") + " " + u); }
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    "<!-- JAH Wiki sitemap index. Strategy (see the Data & methodology section on the site):\n" +
    "     (a) this wiki's own top-level and browse pages (sitemap-pages.xml) — every URL\n" +
    "         listed returns 200;\n" +
    "     (b) pointers to the Spec Catalog's and Patent Catalog's own record sitemaps,\n" +
    "         where the 460,000+ underlying record URLs live with the catalogs that own\n" +
    "         them and keep them fresh. This wiki never duplicates record-level URLs it\n" +
    "         cannot refresh. Re-run code/build_sitemap_index.js to pick up new shards.\n" +
    "     Built " + new Date().toISOString().slice(0, 10) + " -->\n" +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    keep.map((u) => "  <sitemap><loc>" + u + "</loc></sitemap>").join("\n") + "\n</sitemapindex>\n";
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
  console.log("wrote sitemap.xml with " + keep.length + " entries (" + skipped.length + " skipped, re-run to pick up)");
})();
