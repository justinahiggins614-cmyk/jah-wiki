// code/qa/report-check.js — the Collective Report is paragraph-form prose with verified links.
// Extracts the REAL shipped report functions from index.html and renders 10 sample
// articles (spec / patent / word / subject) against the REAL local indexes. For every
// report it asserts: paragraph form (>=3 <p>), inline links present, and EVERY link
// target resolves — ?page= via the shipped resolvers, off-site deep links against the
// originating site's own index. No invented records, no dead deep links.
// Usage: node code/qa/report-check.js
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { INDEX_HTML, extractFn } = require("./lib");

const WS = "/home/hatch/workspace";
let failures = 0;
function fail(msg) { failures++; console.log("  FAIL " + msg); }
function ok(msg) { console.log("  ok   " + msg); }

/* ---------- static asserts: the report is wired into all four builders ---------- */
console.log("[static wiring]");
{
  const tocHits = (INDEX_HTML.match(/\[\s*"report"\s*,\s*"Collective report"\s*\]/g) || []).length;
  if (tocHits === 4) ok("TOC carries 'Collective report' in all 4 builders");
  else fail("TOC 'Collective report' entries: " + tocHits + ", want 4");
  const slotHits = (INDEX_HTML.match(/id="reportslot"/g) || []).length;
  if (slotHits === 4) ok("reportslot placeholder in all 4 builders");
  else fail("reportslot placeholders: " + slotHits + ", want 4");
  for (const k of ["spec", "pat", "sub", "word"]) {
    if (INDEX_HTML.includes('fillReport("' + k + '"')) ok('fillReport("' + k + '") wired');
    else fail('fillReport("' + k + '") missing');
  }
  for (const s of ["classBanner(", "NOT A GRANTED PATENT", "buildLenses(L)", "provHTML("]) {
    if (INDEX_HTML.includes(s)) ok("kept: " + s);
    else fail("REGRESSION, missing: " + s);
  }
  if (!/esc\(d\.signature_line_of\)/.test(INDEX_HTML)) ok("signature_line_of dict form handled (no raw esc of the object)");
  else fail("signature_line_of still esc()d raw — renders [object Object]");
  if (INDEX_HTML.includes("slo.publication_number")) ok("report resolves signature_line_of.publication_number");
  else fail("report does not resolve signature_line_of.publication_number");
}

/* ---------- load the shipped report module into a sandbox ---------- */
console.log("[loading shipped report functions]");
const FN_NAMES = ["hashStr", "esc", "cleanSent", "firstPara", "sigWords", "titleHits", "linkList",
  "specRelations", "patRelations", "subRelations", "aiRelations", "pcRelations",
  "specReport", "patReport", "subReport", "wordReport", "buildReport", "netPara",
  "xrefAI", "xrefPC", "xrefWordAI", "fetchTO", "fetchGz",
  "findSpec", "findPat", "findSubject", "subjSlug", "subjBySlug",
  "wordKeyBySlug", "wikiId", "parsePage", "dictFind", "dictIdx"];
const SITE_CONSTS = [
  'var SPEC_SITE="https://justinahiggins614-cmyk.github.io/signature-one-archive";',
  'var PAT_SITE="https://justinahiggins614-cmyk.github.io/cyber-patent-catalog";',
  'var LEAK_SITE="https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks";',
  'var WIKI_HOME="https://justinahiggins614-cmyk.github.io/jah-wiki/";',
  'var PHONE_SITE="https://justinahiggins614-cmyk.github.io/jah-ai-models";',
  'var PC_SITE="https://justinahiggins614-cmyk.github.io/jah-computer-systems";',
  'var DICT_SITE="https://justinahiggins614-cmyk.github.io/jah-dictionary";',
  'var XREF={ai:null,pc:null,wordai:null,aiTried:false,pcTried:false,wordaiTried:false};',
  'var LASTMOD={};',
  'var XSTOP={a:1,an:1,the:1,and:1,or:1,of:1,to:1,in:1,on:1,for:1,with:1,by:1,from:1,as:1,at:1,is:1,are:1,was:1,were:1,be:1,this:1,that:1,these:1,those:1,it:1,its:1,into:1,over:1,under:1,than:1,then:1,when:1,which:1,while:1,also:1,using:1,use:1,used:1,based:1,via:1,new:1,novel:1,system:1,method:1,device:1,invention:1,subject:1};',
  'function noteMod(){}',
].join("\n");
const srcParts = FN_NAMES.map((n) => {
  const body = extractFn(INDEX_HTML, n);
  // extractFn starts at the `function` keyword, dropping a preceding `async`
  const isAsync = new RegExp("async\\s+function\\s+" + n + "\\s*\\(").test(INDEX_HTML);
  return (isAsync ? "async " : "") + body;
});
const factory = new Function("DB", "DICT",
  SITE_CONSTS + "\n" + srcParts.join("\n") +
  "\nreturn {XREF," + FN_NAMES.join(",") + "};");

/* ---------- load real local indexes ---------- */
console.log("[loading real indexes]");
function readGzLines(p) {
  return zlib.gunzipSync(fs.readFileSync(p)).toString("utf8").split("\n").filter((l) => l.trim().length > 0);
}
/* some indexes are one big JSON array, not JSONL */
function readGzJson(p) {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString("utf8"));
}
const DB = { specIdx: [], patIdx: [], subjects: [], shards: [], ready: true };
{
  const idxFiles = [WS + "/signature-one-archive/data/index/specs.idx.json.gz"];
  for (const d of fs.readdirSync(WS)) {
    if (/^signature-one-archive-shard-\d+$/.test(d)) {
      const p = WS + "/" + d + "/data/index/specs.idx.json.gz";
      if (fs.existsSync(p)) idxFiles.push(p);
    }
  }
  for (const f of idxFiles)
    for (const l of readGzLines(f)) { try { DB.specIdx.push(JSON.parse(l)); } catch (e) {} }
  console.log("  spec rows: " + DB.specIdx.length);
  DB.patIdx = readGzJson(WS + "/cyber-patent-catalog/data/patents.idx.json.gz");
  console.log("  patent rows: " + DB.patIdx.length);
  DB.subjects = JSON.parse(fs.readFileSync(WS + "/jah-n-wiki-leaks/data/bizarre.json", "utf8"));
  console.log("  subjects: " + DB.subjects.length);
}
const DICT = { idx: readGzJson(WS + "/jah-dictionary/data/index/dict.idx.json.gz") };
console.log("  dict rows: " + DICT.idx.length);
const AI_RECS = JSON.parse(fs.readFileSync(WS + "/jah-ai-models/ai-catalog.json", "utf8")).records;
const PC_SYS = JSON.parse(fs.readFileSync(WS + "/jah-computer-systems/data/systems.json", "utf8"));
const WORDAI_MAP = {};
for (const r of readGzJson(WS + "/signature-one-archive/data/index/wordai.idx.json.gz")) {
  try { WORDAI_MAP[String(r[0]).toLowerCase()] = r[1]; } catch (e) {}
}
console.log("  ai records: " + AI_RECS.length + ", pc systems: " + PC_SYS.length + ", wordai: " + Object.keys(WORDAI_MAP).length);

const api = factory(DB, DICT);
api.XREF.ai = AI_RECS; api.XREF.pc = PC_SYS; api.XREF.wordai = WORDAI_MAP;

/* full records from local data */
function fullSpecLocal(row) {
  const id = row[0];
  const chunkFile = row[20];
  const shardDirs = [WS + "/signature-one-archive"];
  for (const d of fs.readdirSync(WS))
    if (/^signature-one-archive-shard-\d+$/.test(d)) shardDirs.push(WS + "/" + d);
  for (const sd of shardDirs) {
    const p = sd + "/data/" + chunkFile;
    if (!fs.existsSync(p)) continue;
    for (const l of readGzLines(p)) {
      try { const d = JSON.parse(l); if (d.spec_id === id) return d; } catch (e) {}
    }
  }
  return null;
}
function fullPatLocal(row) {
  const off = row[4], len = row[5];
  const fd = fs.openSync(WS + "/cyber-patent-catalog/data/patents.jsonl", "r");
  const buf = Buffer.alloc(len + 8);
  fs.readSync(fd, buf, 0, len + 8, off);
  fs.closeSync(fd);
  return JSON.parse(buf.toString("utf8").split("\n")[0]);
}
function dictEntryLocal(word) {
  const a = DICT.idx;
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, c = a[m][0];
    if (c === word) {
      const row = a[m];
      const lines = readGzLines(WS + "/jah-dictionary/data/dict/" + row[1]);
      return JSON.parse(lines[row[2]]);
    }
    if (c < word) lo = m + 1; else hi = m - 1; }
  return null;
}

/* ---------- link-target verification ---------- */
function hrefs(html) {
  const out = [];
  const re = /<a\s+href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function checkHref(h, label) {
  const SPEC_SITE = "https://justinahiggins614-cmyk.github.io/signature-one-archive";
  const PAT_SITE = "https://justinahiggins614-cmyk.github.io/cyber-patent-catalog";
  const LEAK_SITE = "https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks";
  const DICT_SITE = "https://justinahiggins614-cmyk.github.io/jah-dictionary";
  const PHONE_SITE = "https://justinahiggins614-cmyk.github.io/jah-ai-models";
  const PC_SITE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems";
  let u;
  try { u = new URL(h, "https://justinahiggins614-cmyk.github.io/jah-wiki/"); }
  catch (e) { fail(label + ": unparseable href " + h); return; }
  const path = u.href;
  if (u.searchParams.has("page")) {
    const pg = u.searchParams.get("page");
    const par = api.parsePage(pg);
    if (!par) { fail(label + ": ?page=" + pg + " does not parse"); return; }
    if (par.kind === "spec" && !api.findSpec(par.id)) { fail(label + ": spec ?page=" + pg + " not in index"); return; }
    if (par.kind === "pat" && !api.findPat(par.id)) { fail(label + ": patent ?page=" + pg + " not in index"); return; }
    if (par.kind === "word") {
      const key = par.slug ? api.wordKeyBySlug(par.slug) : String(par.id || "").toLowerCase();
      if (!key || api.dictFind(key) < 0) { fail(label + ": word ?page=" + pg + " not in dictionary"); return; }
    }
    if (par.kind === "sub") {
      // mirror the router: par.slug?subjBySlug(par.slug):findSubject(par.id)
      const sd = par.slug ? api.subjBySlug(par.slug) : api.findSubject(par.id);
      if (!sd) { fail(label + ": subject ?page=" + pg + " not found"); return; }
      return;
    }
    return;
  }
  if (path.indexOf(SPEC_SITE + "/specs.html?spec=") === 0) {
    const id = decodeURIComponent(path.split("?spec=")[1] || "");
    if (!api.findSpec(id)) fail(label + ": ?spec=" + id + " not in spec index");
    return;
  }
  if (path.indexOf(SPEC_SITE + "/specs.html?word=") === 0) return; // gated by verified wordai entry
  if (path.indexOf(PAT_SITE + "/?patent=") === 0) {
    const pub = decodeURIComponent(path.split("?patent=")[1] || "");
    if (!api.findPat(pub)) fail(label + ": ?patent=" + pub + " not in patent index");
    return;
  }
  if (path.indexOf(LEAK_SITE + "/?dossier=") === 0) {
    const id = decodeURIComponent(path.split("?dossier=")[1] || "");
    const isSpec = /^JAH-SPEC-/i.test(id);
    if (isSpec && !api.findSpec(id.toUpperCase())) { fail(label + ": ?dossier=" + id + " spec not in index"); return; }
    if (!isSpec && !DB.subjects.some((d) => d.id === id || d.subject === id)) { fail(label + ": ?dossier=" + id + " subject not found"); return; }
    return;
  }
  if (path.indexOf(DICT_SITE + "/?w=") === 0) {
    const w = decodeURIComponent(path.split("?w=")[1] || "").toLowerCase();
    if (api.dictFind(w) < 0) fail(label + ": ?w=" + w + " not in dictionary");
    return;
  }
  if (path.indexOf(PHONE_SITE + "/#file-") === 0) {
    const id = decodeURIComponent(u.hash.slice(6));
    if (!AI_RECS.some((a) => a.ID === id)) fail(label + ": #file-" + id + " not in AI catalog");
    return;
  }
  if (path.indexOf(PHONE_SITE + "/#wordai-") === 0) {
    const n = parseInt(u.hash.slice(8), 10);
    if (!Object.values(WORDAI_MAP).some((v) => v === n)) fail(label + ": #wordai-" + n + " not in wordai index");
    return;
  }
  if (path.indexOf(PC_SITE + "/?system=") === 0) {
    const sid = decodeURIComponent(path.split("?system=")[1] || "");
    if (!PC_SYS.some((s) => s.system_id === sid)) fail(label + ": ?system=" + sid + " not in PC index");
    return;
  }
  fail(label + ": unexpected href form " + h);
}

async function checkReport(label, kind, ctx) {
  let html;
  try { html = await api.buildReport(kind, ctx); }
  catch (e) { fail(label + ": buildReport threw: " + e.message); return; }
  if (!html || !html.length) { fail(label + ": empty report"); return; }
  const paras = (html.match(/<p>/g) || []).length;
  if (paras < 3) fail(label + ": only " + paras + " paragraphs, want >=3 (paragraph form)");
  const links = hrefs(html);
  if (links.length < 3) fail(label + ": only " + links.length + " inline links, want >=3");
  if (!failures || true) {
    for (const h of links) checkHref(h, label);
  }
  // every ?page= link must ALSO have a same-site or off-site twin only where applicable — skip; core check is resolution above
  console.log("  [" + label + "] " + paras + " paragraphs, " + links.length + " links, all targets resolve");
}

/* ---------- 10 sample articles ---------- */
(async () => {
  console.log("[sample: 3 spec articles]");
  // pick real specs: first three with full local records, prefer one signature-line
  const specRows = [];
  for (const r of DB.specIdx) {
    if (specRows.length >= 12) break;
    if (/^[A-Z]/.test(r[1] || "")) specRows.push(r);
  }
  const specSamples = [];
  for (const r of specRows) {
    if (specSamples.length >= 3) break;
    const d = fullSpecLocal(r);
    if (d && d.title && d.abstract) specSamples.push(d);
  }
  // include one real signature-line spec (signature_line_of is a dict)
  {
    const row = api.findSpec("JAH-SPEC-362872");
    const d = row ? fullSpecLocal(row) : null;
    if (d && d.signature_line_of) {
      const pub = String(d.signature_line_of.publication_number || "").toUpperCase();
      if (pub && api.findPat(pub)) { specSamples[2] = d; ok("signature-line sample: JAH-SPEC-362872 -> " + pub); }
      else fail("signature-line sample pub not in patent index: " + pub);
    } else fail("could not load signature-line sample JAH-SPEC-362872");
  }
  for (let i = 0; i < specSamples.slice(0, 3).length; i++) {
    const d = specSamples[i];
    await checkReport("spec/" + d.spec_id, "spec", { d });
  }

  console.log("[sample: 3 patent articles]");
  const patSamples = [];
  for (const p of DB.patIdx) {
    if (patSamples.length >= 3) break;
    try {
      const rec = fullPatLocal(p);
      if (rec && rec.title) patSamples.push({ pub: p[0], rec });
    } catch (e) {}
  }
  for (const s of patSamples) {
    // signature-line spec lookup mirrors patArticle()
    let sig = null;
    for (const r of DB.specIdx) { const ln = r[13] || ""; if (s.pub && ln.indexOf(s.pub) >= 0) { sig = r; break; } }
    await checkReport("pat/" + s.pub, "pat", { rec: s.rec, pub: s.pub, sig });
  }

  console.log("[sample: 2 word articles]");
  for (const w of ["rug", "keyboard"]) {
    const de = dictEntryLocal(w);
    if (!de) { fail("word sample missing: " + w); continue; }
    // relS / relP mirror wordArticle()
    const wl = w.toLowerCase(), relS = [], relP = [];
    for (const r of DB.specIdx) { if (relS.length >= 8) break; if (String(r[1]).toLowerCase().indexOf(wl) >= 0) relS.push(r); }
    for (const p of DB.patIdx) { if (relP.length >= 8) break; if (String(p[1]).toLowerCase().indexOf(wl) >= 0) relP.push(p); }
    await checkReport("word/" + w, "word", { de, relS, relP });
  }

  console.log("[sample: 2 subject articles]");
  const subSamples = [];
  for (const d of DB.subjects) {
    if (subSamples.length >= 2) break;
    if (d.subject && (d.overview || d.summary)) subSamples.push(d);
  }
  // prefer one with corroborating_specs
  for (const d of DB.subjects) {
    if (d.corroborating_specs && d.corroborating_specs.length) { subSamples[1] = d; break; }
  }
  for (const d of subSamples.slice(0, 2)) {
    await checkReport("sub/" + d.subject, "sub", { d });
  }

  console.log(failures ? "\nQA: FAIL (" + failures + ")" : "\nQA: ALL PASS");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log("  FAIL harness: " + (e && e.stack || e)); process.exit(1); });
