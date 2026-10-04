#!/usr/bin/env python3
"""code/build_browse.py — generate browse.html (the A–Z article catalog page).

Shared chrome (theme CSS, main CSS, JAH Network nav, footer, theme toggle,
session restore) is spliced VERBATIM from index.html, so the no-redesign rule
holds: browse.html always matches the site's look. Re-run this script after any
index.html chrome change, then re-run code/restamp_counts.py to re-stamp counts.

The article COUNTS in browse.html are NOT written here — code/restamp_counts.py
stamps the %%N_*%% / %%DATE%% tokens from the live catalog indexes after every
run, so browse.html is never one run behind the data.

Usage: python3 code/build_browse.py
"""
import re

ROOT = __file__.rsplit("/code/", 1)[0]

LETTERS = [chr(c) for c in range(ord("A"), ord("Z") + 1)] + ["#"]

BROWSE_CSS = """
<style>
.bstrip{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 16px}
.bstrip a{display:inline-block;min-width:34px;text-align:center;padding:8px 6px;border:1px solid #9db3d8;border-radius:5px;background:#fff;color:#0b3d91;font-weight:bold;text-decoration:none;font-family:Arial,sans-serif}
.bstrip a:hover{background:#eef3fc}
details.letter{border:1px solid #d7dee8;border-radius:6px;margin:8px 0;background:#fff}
details.letter>summary{padding:10px 14px;cursor:pointer;font-family:Arial,sans-serif;font-weight:bold;font-size:1.05em;list-style:none}
details.letter>summary::-webkit-details-marker{display:none}
details.letter .lz{display:inline-block;min-width:30px;color:#0b3d91;font-size:1.2em}
details.letter .lc{color:#5b6472;font-weight:normal;font-size:.85em}
.lbody{padding:0 14px 14px;border-top:1px solid #eef1f6}
.bkind{margin:16px 0 6px;font-size:1em;font-family:Arial,sans-serif}
.morebtn{display:inline-block;font-family:Arial,sans-serif;font-size:.85em;padding:8px 14px;margin:6px 0 10px;border:1px solid #9db3d8;background:#fff;border-radius:4px;cursor:pointer;color:#0b3d91}
.morebtn:hover{background:#eef3fc}
.bsearch{display:flex;gap:8px;max-width:560px;margin:8px 0}
.bsearch input{flex:1;padding:10px;border:1px solid #9db3d8;border-radius:5px;font-size:1em;font-family:inherit}
.bsearch button{padding:10px 18px;background:#0b3d91;color:#fff;border:0;border-radius:5px;font-weight:bold;cursor:pointer;font-size:1em}
.bsearch button:hover{background:#082c6b}
.bstate{font-size:.8em;color:#5b6472;font-weight:normal}
</style>
"""

HEAD_META = """<link rel="canonical" href="https://justinahiggins614-cmyk.github.io/jah-wiki/browse.html">
<meta property="og:title" content="Browse the archive — JAH Wiki">
<meta property="og:description" content="The full JAH Wiki article catalog: every spec-derived article, every patent-derived article, and every subject file as A–Z collapsible lists with direct article links.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://justinahiggins614-cmyk.github.io/jah-wiki/browse.html">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Browse the archive — JAH Wiki">
<meta name="twitter:description" content="The full JAH Wiki article catalog as A–Z collapsible lists — every article, one click away.">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"Browse the archive — JAH Wiki","url":"https://justinahiggins614-cmyk.github.io/jah-wiki/browse.html","description":"The full JAH Wiki article catalog: every spec-derived article, every patent-derived article, and every subject file as A–Z collapsible lists.","isPartOf":{"@type":"WebSite","name":"JAH Wiki","url":"https://justinahiggins614-cmyk.github.io/jah-wiki/"},"creator":{"@type":"Person","name":"Justin Addam Higgins"}}
</script>
"""

BROWSE_JS = r"""
<script>
/* browse.html catalog app: lazy-loads the same compact catalog indexes the wiki
   reads (spec search index, patent record index, subject file list), buckets
   article titles A-Z, and renders each letter's list only when opened. */
(function(){
"use strict";
var SPEC_SITE="https://justinahiggins614-cmyk.github.io/signature-one-archive";
var PAT_SITE="https://justinahiggins614-cmyk.github.io/cyber-patent-catalog";
var LEAK_SITE="https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks";
var AZ="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var PAGE=200;
var KINDN={SPEC:"Spec-derived articles",PAT:"Patent-derived articles",SUB:"Subject files"};
var KINDB={SPEC:"SPECIFICATION",PAT:"PUBLIC PATENT RECORD",SUB:"SUBJECT FILE"};
var KINDS=["SPEC","PAT","SUB"];
var BK={SPEC:{},PAT:{},SUB:{}}, TOT={SPEC:0,PAT:0,SUB:0};
var loaded=false, failed=[], rendered={};
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function fmt(n){return Number(n).toLocaleString("en-US")}
function L0(t){var c=String(t==null?"":t).trim().charAt(0).toUpperCase();return(c>="A"&&c<="Z")?c:"#"}
function add(k,t,href,sub){var L=L0(t);(BK[k][L]=BK[k][L]||[]).push({t:String(t),href:href,sub:sub||""});TOT[k]++}
function itemHTML(k,x){return '<li><span class="rtbadge">'+KINDB[k]+'</span><a href="'+x.href+'">'+esc(x.t)+'</a>'+(x.sub?' <span style="color:#888">'+esc(x.sub)+'</span>':"")+'</li>'}
function status(m){var e=$("bstatus");if(e)e.textContent=m}
async function fetchGz(url){var r=await fetch(url);if(!r.ok)throw new Error("HTTP "+r.status+" "+url);return await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text()}
async function loadAll(){
 try{
  status("Loading spec article titles (1 of 3)...");
  var a=(await fetchGz(SPEC_SITE+"/data/index/specs.search.json.gz")).trim().split("\n");
  for(var i=0;i<a.length;i++){try{var r=JSON.parse(a[i]);add("SPEC",r[1],"./?page="+encodeURIComponent(r[0]),r[0])}catch(e){}}
  status("Loading patent article titles (2 of 3)...");
  var b=JSON.parse(await fetchGz(PAT_SITE+"/data/patents.idx.json.gz"));
  for(var j=0;j<b.length;j++){var p=b[j];add("PAT",String(p[1]).replace(/&hellip;/g,"..."),"./?page=PAT:"+encodeURIComponent(p[0]),p[0])}
  status("Loading subject files (3 of 3)...");
  var c=await(await fetch(LEAK_SITE+"/data/bizarre.json")).json();
  for(var k=0;k<c.length;k++){var d=c[k];if(d&&d.subject)add("SUB",d.subject,"./?page=SUB:"+encodeURIComponent(d.subject),d.category||"")}
 }catch(e){failed.push(String((e&&e.message)||e))}
 loaded=true;
 var nCore=TOT.SPEC+TOT.PAT+TOT.SUB;
 $("bn-spec").textContent=fmt(TOT.SPEC);$("bn-pat").textContent=fmt(TOT.PAT);
 $("bn-sub").textContent=fmt(TOT.SUB);$("bn-core").textContent=fmt(nCore);
 var sn=$("browse-snap");
 if(sn)sn.innerHTML="<strong>"+fmt(nCore)+" core encyclopedia articles</strong> — live count from the catalog indexes just now. "+(failed.length?'<span style="color:#a00">Note: '+esc(failed.join("; "))+'</span>':"");
 AZ.concat(["#"]).forEach(function(L){
  var n=(BK.SPEC[L]||[]).length+(BK.PAT[L]||[]).length+(BK.SUB[L]||[]).length;
  var s=document.querySelector('[data-lc="'+L+'"]');
  if(s)s.textContent=n?fmt(n)+" articles":"no articles";
 });
 status(failed.length?("Catalog partially loaded: "+failed.join("; "))
   :(nCore?"Catalog ready — open a letter below, or search above."
          :"Catalog failed to load — check your connection and reload."));
 deepLink();
}
function renderLetter(L){
 if(rendered[L]||!loaded)return;rendered[L]=1;
 var box=$("LB-"+L);if(!box)return;
 var h="",any=false;
 KINDS.forEach(function(k){
  var arr=BK[k][L];if(!arr||!arr.length)return;any=true;
  arr.sort(function(x,y){return x.t<y.t?-1:x.t>y.t?1:0});
  h+='<h3 class="bkind"><span class="rtbadge">'+KINDB[k]+'</span> '+KINDN[k]+' ('+fmt(arr.length)+')</h3>';
  h+='<ul class="pgln" id="LU-'+k+"-"+L+'">'+arr.slice(0,PAGE).map(function(x){return itemHTML(k,x)}).join("")+"</ul>";
  if(arr.length>PAGE)h+='<button type="button" class="morebtn" data-k="'+k+'" data-l="'+L+'" data-n="'+PAGE+'">Show '+fmt(Math.min(PAGE,arr.length-PAGE))+' more ('+fmt(arr.length-PAGE)+' remaining)</button>';
 });
 box.innerHTML=any?h:'<p class="sub">No articles under this letter yet.</p>';
}
function openLetter(L){var d=$("L-"+L);if(!d)return;renderLetter(L);d.open=true;setTimeout(function(){try{d.scrollIntoView()}catch(e){}},30)}
document.addEventListener("toggle",function(e){var d=e.target;if(d&&d.classList&&d.classList.contains("letter")&&d.open){renderLetter(d.getAttribute("data-l"))}},true);
document.addEventListener("click",function(e){
 var m=e.target&&e.target.closest?e.target.closest(".morebtn"):null;
 if(m){
  var k=m.getAttribute("data-k"),L=m.getAttribute("data-l"),n=parseInt(m.getAttribute("data-n"),10),arr=BK[k][L],ul=$("LU-"+k+"-"+L);
  var nxt=arr.slice(n,n+PAGE);ul.insertAdjacentHTML("beforeend",nxt.map(function(x){return itemHTML(k,x)}).join(""));
  var left=arr.length-(n+nxt.length);
  if(left>0){m.setAttribute("data-n",n+nxt.length);m.textContent="Show "+fmt(Math.min(PAGE,left))+" more ("+fmt(left)+" remaining)"}
  else{m.parentNode.removeChild(m)}
  return;
 }
 var a=e.target&&e.target.closest?e.target.closest("#bstrip a"):null;
 if(a){e.preventDefault();if(loaded)openLetter(a.getAttribute("data-l"));else status("Still loading the catalog — one moment...")}
},false);
function deepLink(){try{var mL=/[?&]L=([A-Za-z#])/.exec(location.search||"");if(mL)openLetter(mL[1].toUpperCase())}catch(e){}}
function doSearch(){
 var q=$("bsq").value.trim(),box=$("bsres");
 if(!q){box.innerHTML="";return}
 if(!loaded){box.innerHTML='<p class="sub">The catalog is still loading — try again in a few seconds.</p>';return}
 var ql=q.toLowerCase(),out=[],cap=60;
 outer:
 for(var ki=0;ki<KINDS.length;ki++){var k=KINDS[ki];
  for(var L in BK[k]){var arr=BK[k][L];
   for(var i=0;i<arr.length;i++){var x=arr[i];
    if(x.t.toLowerCase().indexOf(ql)>=0||x.sub.toLowerCase().indexOf(ql)>=0){out.push({k:k,x:x});if(out.length>=cap)break outer}}}}
 box.innerHTML='<h3 class="bkind">'+out.length+(out.length>=cap?"+":"")+' matching article'+(out.length===1?"":"s")+'</h3>'+
  (out.length?'<ul class="pgln">'+out.map(function(o){return itemHTML(o.k,o.x)}).join("")+"</ul>"
   :'<p class="sub">No article titles match &ldquo;'+esc(q)+'&rdquo; — try the full wiki search on the <a href="./">home page</a>.</p>');
 try{box.scrollIntoView()}catch(e){}
}
function wireSearch(inp,btn){
 if(!inp||!btn||inp._bwired)return;inp._bwired=1;
 btn.addEventListener("click",function(){$("bsq").value=inp.value;doSearch()});
 inp.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();$("bsq").value=inp.value;doSearch()}});
}
wireSearch($("bq"),$("bqgo"));
$("bsgo").addEventListener("click",doSearch);
$("bsq").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();doSearch()}});
var rl=$("randlink");
if(rl)rl.addEventListener("click",function(e){
 e.preventDefault();
 if(!loaded){status("Still loading — the random article needs the catalog first.");return}
 var pool=[];
 KINDS.forEach(function(k){for(var L in BK[k]){var arr=BK[k][L];for(var i=0;i<arr.length;i++)pool.push(arr[i])}});
 if(!pool.length)return;
 location.href=pool[Math.floor(Math.random()*pool.length)].href;
});
loadAll();
})();
</script>
"""

TOPBAR = """<div class="topbar">
  <a href="./" style="text-decoration:none"><div class="brand">JAH WIKI<small>THE ENCYCLOPEDIA OF THE JAH SYSTEM</small></div></a>
  <div class="navlinks" role="navigation" aria-label="Wiki sections">
    <a href="./">Home</a><a href="browse.html" aria-current="page"><b>Browse the archive</b></a><a href="./?all=SPEC">All pages</a><a href="./?all=WORD">Word articles</a><a href="#" id="randlink">Random article</a>
    <a href="https://justinahiggins614-cmyk.github.io/jah-dictionary/" target="_blank" rel="noopener">The Signature Dictionary</a>
    <a href="https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks/" target="_blank" rel="noopener">Wiki Leaks</a>
    <a href="https://justinahiggins614-cmyk.github.io/signature-one-archive/specs.html" target="_blank" rel="noopener">Signature Spec Catalog Pending Patents</a>
    <a href="https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/" target="_blank" rel="noopener">Globally Rejustered Patent Catalog</a>
  </div>
  <div class="searchbox" role="search"><label class="vh" for="bq">Search the article catalog</label><input id="bq" placeholder="Search article titles..." aria-label="Search the article catalog"><button id="bqgo">Search</button></div>
</div>
"""


def build():
    idx = open(ROOT + "/index.html", encoding="utf-8").read()

    # --- shared chrome, spliced verbatim from index.html ---
    head_chrome = idx[: idx.index('<link rel="canonical"')]
    m = re.search(r'<nav aria-label="JAH Network Global Ecosystem".*?</nav>', idx, re.S)
    jahnet = m.group(0)
    m = re.search(r'<footer class="site">.*?</footer>', idx, re.S)
    footer = m.group(0)
    tail = idx[idx.index('<button id="jah-theme-toggle"'):]

    # --- letter strip + letter details ---
    strip = "\n".join(
        '<a href="browse.html?kind=SPEC&amp;L=%s" data-l="%s">%s</a>' % (l, l, l)
        for l in LETTERS
    )
    letters = "\n".join(
        '<details class="letter" id="L-%s" data-l="%s"><summary><span class="lz">%s</span>'
        ' <span class="lc" data-lc="%s">loading&hellip;</span></summary>'
        '<div class="lbody" id="LB-%s"><p class="sub">Article lists load here.</p></div></details>'
        % (l, l, l, l, l)
        for l in LETTERS
    )

    body = (
        '<a class="skip" href="#app">Skip to content</a>\n' + jahnet + "\n" + TOPBAR + "\n"
        '<div class="wrap"><div id="app">\n'
        "<!-- STATIC CRAWLABLE FALLBACK (no-JS / crawler view). The live app replaces the counts\n"
        '     below with the live catalog count on load. Snapshot stamped by code/restamp_counts.py. -->\n'
        '<div class="crumb"><a href="./">Home</a> &rsaquo; Browse the archive</div>\n'
        '<h1 class="at">Browse the archive</h1>\n'
        '<p class="sub">Every article in the encyclopedia — every spec, every patent record, every subject file — '
        "as A&ndash;Z collapsible lists. Open a letter, pick an article, read the full wiki entry.</p>\n"
        '<p class="sub" id="browse-snap" style="color:#1a4d2e"><strong>%%N_CORE%% core encyclopedia articles</strong>, '
        "as of %%DATE%%. What counts: one article per record — spec-derived (%%N_SPEC%% Signature draft specifications), "
        "patent-derived (%%N_PAT%% public patent records), subject files (%%N_SUB%% JAH-N dossiers). "
        'Dictionary word articles (%%N_WORDS%% as of %%DATE%%) are counted separately — '
        '<a href="./?all=WORD">browse them A&ndash;Z</a>. '
        "This snapshot refreshes daily; the live count below updates from the catalog indexes on every visit.</p>\n"
        '<details class="statdrawer" open><summary>Article counts <span class="bstate" id="bstate"></span></summary>\n'
        '<div class="stats">\n'
        '<div class="stat"><div class="n" id="bn-spec">%%N_SPEC%%</div><div class="l">spec-derived articles</div></div>\n'
        '<div class="stat"><div class="n" id="bn-pat">%%N_PAT%%</div><div class="l">patent-derived articles</div></div>\n'
        '<div class="stat"><div class="n" id="bn-sub">%%N_SUB%%</div><div class="l">subject articles</div></div>\n'
        '<div class="stat"><div class="n" id="bn-core">%%N_CORE%%</div><div class="l">core articles total</div></div>\n'
        "</div></details>\n"
        '<h2 class="sec">Search the catalog</h2>\n'
        '<p class="sub">Search every article title at once — spec articles, patent articles, and subject files.</p>\n'
        '<div class="bsearch"><label class="vh" for="bsq">Search the article catalog</label>'
        '<input id="bsq" placeholder="Type an article title or keyword&hellip;" aria-label="Search the article catalog">'
        '<button id="bsgo" type="button">Search</button></div>\n'
        '<div id="bsres" aria-live="polite"></div>\n'
        '<h2 class="sec">A&ndash;Z article lists</h2>\n'
        '<p class="sub" id="bstatus">Loading the article catalog&hellip;</p>\n'
        '<div class="bstrip" id="bstrip" role="navigation" aria-label="Article lists by letter">\n' + strip + "\n</div>\n"
        '<div id="bletters">\n' + letters + "\n</div>\n"
        '<p class="sub" style="margin-top:14px">Looking for a dictionary word as an encyclopedia article? '
        '<a href="./?all=WORD"><b>Browse all word articles A&ndash;Z</b></a> — every Signature Dictionary entry has one.</p>\n'
        "</div></div>\n"
    )

    html = (
        head_chrome + HEAD_META + "</head>\n<body>\n" + BROWSE_CSS + "\n" + body
        + BROWSE_JS
        + '<section class="wrap" style="padding-top:0"><h2 class="sec">Data &amp; methodology</h2>'
        '<ul class="pgln"><li><b>Article lists.</b> The lists on this page are built live in your browser from the '
        "same catalog indexes the wiki itself reads: the Spec Catalog's compact search index "
        "(<code>data/index/specs.search.json.gz</code>), the Patent Catalog's record index "
        "(<code>data/patents.idx.json.gz</code>), and the JAH-N subject file list. "
        "Nothing is loaded until you visit this page, and each letter's list renders only when you open it — "
        "the page stays fast on phones. Every entry links to its full article via <code>?page=</code>.</li>"
        '<li><b>Counts.</b> The snapshot counts above are stamped daily by <code>code/restamp_counts.py</code> '
        "from the live indexes; the live count refreshes from those same indexes on every visit.</li>"
        '<li><b>Article IDs.</b> Every article carries a permanent ID — <code>JAH-WIKI-SPEC-######</code>, '
        "<code>JAH-WIKI-PAT-&lt;pub-no&gt;</code>, <code>JAH-WIKI-W-&lt;word&gt;</code>, "
        "<code>JAH-WIKI-SUB-&lt;slug&gt;</code> — resolving as <code>?page=&lt;ID&gt;</code>, the article's canonical URL.</li>"
        "</ul></section>\n" + footer + "\n" + tail
    )
    open(ROOT + "/browse.html", "w", encoding="utf-8").write(html)
    print("wrote browse.html (%d bytes)" % len(html))


if __name__ == "__main__":
    build()
