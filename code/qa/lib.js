// code/qa/lib.js — shared helpers for the JAH Wiki QA checkers.
// All checkers extract the real shipped functions (hashStr, wikiId, parsePage,
// wordKeyBySlug, subjBySlug) from index.html so they test what is actually live.
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..", "..");
const INDEX_HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// Extract one top-level `function name(...) {...}` from source, brace-matching
// while skipping strings, template literals, regex literals, and comments.
function extractFn(src, name) {
  const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(src);
  if (!m) throw new Error("function not found in index.html: " + name);
  let i = src.indexOf("{", m.index);
  const start = m.index;
  let depth = 0;
  let sq = false, dq = false, tpl = false, re = false, lc = false, bc = false, esc = false;
  let prevSig = "";
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (esc) { esc = false; continue; }
    if (lc) { if (c === "\n") lc = false; continue; }
    if (bc) { if (c === "*" && n === "/") { bc = false; i++; } continue; }
    if (sq) { if (c === "\\") esc = true; else if (c === "'") sq = false; continue; }
    if (dq) { if (c === "\\") esc = true; else if (c === '"') dq = false; continue; }
    if (tpl) { if (c === "\\") esc = true; else if (c === "`") tpl = false; continue; }
    if (re) { if (c === "\\") esc = true; else if (c === "/") re = false; continue; }
    if (c === "/" && n === "/") { lc = true; i++; continue; }
    if (c === "/" && n === "*") { bc = true; i++; continue; }
    if (c === "'") { sq = true; continue; }
    if (c === '"') { dq = true; continue; }
    if (c === "`") { tpl = true; continue; }
    if (c === "/" && !/[A-Za-z0-9_$\]\)]/.test(prevSig)) { re = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
    if (!/\s/.test(c)) prevSig = c;
  }
  if (depth !== 0) throw new Error("unbalanced braces extracting " + name);
  return src.slice(start, i);
}

// Load the real shipped functions into a sandbox object.
function loadWikiFns(names) {
  const parts = names.map((n) => extractFn(INDEX_HTML, n));
  const stub = "var DICT={idx:[]},DB={subjects:[]};";
  const fn = new Function(stub + parts.join("\n") + "\nreturn {" + names.join(",") + "};");
  return fn();
}

async function fetchBuf(url, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs || 60000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow" });
    if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
    return { buf: Buffer.from(await r.arrayBuffer()), status: r.status, headers: r.headers };
  } finally { clearTimeout(t); }
}

async function fetchGzJson(url) {
  const { buf } = await fetchBuf(url);
  return JSON.parse(zlib.gunzipSync(buf).toString("utf8"));
}

async function fetchGzLines(url) {
  const { buf } = await fetchBuf(url);
  return zlib.gunzipSync(buf).toString("utf8").split("\n").filter((l) => l.trim().length > 0);
}

async function fetchJson(url) {
  const { buf } = await fetchBuf(url);
  return JSON.parse(buf.toString("utf8"));
}

const SPEC_SITE = "https://justinahiggins614-cmyk.github.io/signature-one-archive";
const PAT_SITE = "https://justinahiggins614-cmyk.github.io/cyber-patent-catalog";
const LEAK_SITE = "https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks";
const DICT_SITE = "https://justinahiggins614-cmyk.github.io/jah-dictionary";
const WIKI_HOME = "https://justinahiggins614-cmyk.github.io/jah-wiki/";

module.exports = {
  ROOT, INDEX_HTML, extractFn, loadWikiFns,
  fetchBuf, fetchGzJson, fetchGzLines, fetchJson,
  SPEC_SITE, PAT_SITE, LEAK_SITE, DICT_SITE, WIKI_HOME,
};
