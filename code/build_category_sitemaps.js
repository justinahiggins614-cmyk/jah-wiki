// code/build_category_sitemaps.js — build category-level sitemap files for JAH Wiki.
// sitemap-wiki-spec.xml / sitemap-wiki-pat.xml / sitemap-wiki-sub.xml / sitemap-wiki-word.xml
// partition the browse hubs by letter (SPEC/PAT/WORD) and by subject category (SUB),
// so crawlers can index the hubs without executing the wiki's client-side router.
// Subject categories are read from the local jah-n-wiki-leaks clone when available;
// otherwise the SUB file lists the hub only. Re-run after subject categories change.
// Usage: node code/build_category_sitemaps.js
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const WIKI = "https://justinahiggins614-cmyk.github.io/jah-wiki/";
const TODAY = new Date().toISOString().slice(0, 10);
const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function xmlEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function urlset(urls) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(function (u) {
      return '  <url><loc>' + xmlEsc(u) + '</loc><changefreq>weekly</changefreq><lastmod>' + TODAY + '</lastmod></url>';
    }).join("\n") + '\n</urlset>\n';
}
function write(name, urls) {
  fs.writeFileSync(path.join(ROOT, name), urlset(urls));
  console.log("wrote " + name + " (" + urls.length + " urls)");
}

function lettered(hub) {
  return [WIKI + hub].concat(AZ.map(function (c) { return WIKI + hub + "&L=" + c; }));
}
write("sitemap-wiki-spec.xml", lettered("?all=SPEC"));
write("sitemap-wiki-pat.xml", lettered("?all=PAT"));
write("sitemap-wiki-word.xml", lettered("?all=WORD"));

var cats = [];
try {
  var zlib = require("zlib");
  var bzDir = path.resolve(ROOT, "..", "jah-n-wiki-leaks", "data", "bizarre", "chunks");
  var set = {};
  fs.readdirSync(bzDir).forEach(function (f) {
    if (!/\.gz$/.test(f)) return;
    var arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(bzDir, f))).toString("utf8"));
    arr.forEach(function (d) { if (d && d.category) set[String(d.category)] = 1; });
  });
  cats = Object.keys(set).sort();
  console.log("subject categories: " + cats.length);
} catch (e) {
  console.log("note: subject categories unavailable (" + (e && e.message) + ") — hub only");
}
write("sitemap-wiki-sub.xml",
  [WIKI + "?all=SUB"].concat(cats.map(function (c) { return WIKI + "?all=SUB&cat=" + encodeURIComponent(c); })));

// Browse-the-archive page: the page itself plus per-kind hubs and per-kind
// per-letter hubs (browse.html?kind=SPEC&L=A ...). Every ?page= article is one
// click from a hub, so crawlers reach the full catalog without executing the
// wiki's client-side router. The wiki never duplicates per-record ?page= URLs
// here — the record-level URLs live with the Spec/Patent Catalogs that own
// them (see build_sitemap_index.js).
var browseUrls = [WIKI + "browse.html"];
["SPEC", "PAT", "SUB"].forEach(function (k) {
  browseUrls.push(WIKI + "browse.html?kind=" + k);
  AZ.forEach(function (c) { browseUrls.push(WIKI + "browse.html?kind=" + k + "&L=" + c); });
});
write("sitemap-wiki-browse.xml", browseUrls);
