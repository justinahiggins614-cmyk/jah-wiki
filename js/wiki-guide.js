"use strict";
/* ============ FIRST-TIME USER GUIDE (2026-10-04 TOUR-FIX standard) ============
   Site 4/27 JAH Wiki. Centered welcome overlay, 5 plain-language steps, one
   "OK" button. NO auto-scroll, NO spotlight, NO section jumps, NO mid-tour
   page navigation — the page stays put, the overlay teaches.
   localStorage flag jah-tour-seen-wiki; ? Guide re-opens the overlay. */
(function(){
var SEEN="jah-tour-seen-wiki";

/* ---------- themed CSS (wiki blue/gold, Georgia + Arial) ---------- */
var CSS=[

















"#jah-welcome{position:fixed;inset:0;z-index:99996;background:rgba(8,20,50,.74);display:flex;align-items:center;justify-content:center;padding:14px}",
"#jah-welcome[hidden]{display:none}",
".jah-welcome-card{background:#fff;border:2px solid #0b3d91;border-radius:12px;max-width:540px;width:100%;max-height:88vh;overflow:auto;padding:20px 22px;font-family:Arial,sans-serif;color:#1a1a2e;box-shadow:0 8px 34px rgba(0,0,0,.35)}",
".jah-welcome-card h2{margin:0 0 6px;color:#0b3d91;font-family:Georgia,serif;font-size:1.35em}",
".jah-welcome-card p.leadw{margin:0 0 6px;font-size:.92em;color:#5b6472}",
".jah-welcome-card ol{margin:8px 0;padding-left:22px}",
".jah-welcome-card ol li{font-size:.92em;line-height:1.6;margin:7px 0}",
".jah-welcome-card ol li b{color:#0b3d91}",
".jah-welcome-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}",
"#jah-welcome-ok,#jah-welcome-guide{min-height:48px;padding:12px 24px;font-size:1em;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-weight:bold}",
"#jah-welcome-ok{background:#0b3d91;color:#fff;border:1px solid #0b3d91}",
"#jah-welcome-guide{background:#fff;border:1px solid #0b3d91;color:#0b3d91}",
"#jah-guide{position:fixed;inset:0;z-index:99996;background:rgba(8,20,50,.62);display:flex;align-items:center;justify-content:center;padding:14px}",
"#jah-guide[hidden]{display:none}",
".jah-guide-card{background:#fff;border:2px solid #0b3d91;border-radius:12px;max-width:700px;width:100%;max-height:88vh;overflow:auto;padding:20px 22px;font-family:Arial,sans-serif;color:#1a1a2e}",
".jah-guide-card h2{margin:0 0 6px;color:#0b3d91;font-family:Georgia,serif;font-size:1.35em}",
".jah-guide-card h3{margin:16px 0 4px;color:#0b3d91;font-size:1em}",
".jah-guide-card p,.jah-guide-card li{font-size:.9em;line-height:1.65}",
".jah-guide-card p.leadg{font-family:Georgia,serif;font-size:1em}",
".jah-guide-card ul{margin:4px 0;padding-left:20px}",
".jah-guide-card code{font-size:.85em}",
"#jah-guide-close,#jah-guide-tour{min-height:44px;padding:10px 20px;font-size:1em;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-weight:bold}",
"#jah-guide-close{background:#0b3d91;color:#fff;border:1px solid #0b3d91;margin-right:8px}",
"#jah-guide-tour{background:#fff;border:1px solid #0b3d91;color:#0b3d91}",
"#jah-guide-btn{background:none;border:none;color:#dbe6ff;font-family:Arial,sans-serif;font-size:.86em;cursor:pointer;padding:0}",
"#jah-guide-btn:hover{color:#fff;text-decoration:underline}"
].join("\n");
var st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);

/* ---------- permanent ? Guide button in the topbar nav ---------- */
var nl=document.querySelector(".topbar .navlinks");
if(nl&&!document.getElementById("jah-guide-btn")){
 var gb=document.createElement("button");
 gb.id="jah-guide-btn";gb.type="button";
 gb.textContent="? Guide";
 gb.setAttribute("aria-label","Open the welcome guide");
 gb.title="\u2753 Guide \u2014 show the welcome guide";
 nl.appendChild(gb);
}

/* ---------- guide + tour + prompt DOM ---------- */
var wrap=document.createElement("div");
wrap.innerHTML=
'<div id="jah-welcome" hidden><div class="jah-welcome-card" role="dialog" aria-modal="true" aria-label="Welcome to JAH Wiki">'+
"<h2>\uD83D\uDC4B Welcome to JAH Wiki</h2>"+
'<p class="leadw">The encyclopedia of the JAH system \u2014 every Signature spec, public patent record, JAH-N subject file, and dictionary word as a full article. Here is how to use it:</p>'+
"<ol>"+
"<li><b>Search the encyclopedia.</b> The search box in the blue header searches every spec, patent, and subject article \u2014 and the Signature Dictionary. Type an exact ID (<code>JAH-SPEC-######</code>, a patent publication number) to jump straight to the article.</li>"+
"<li><b>Read the article.</b> A definition lead, 11 analysis lenses, the patent draft section, a working Python program with an in-browser demo, and the article as its own AI persona.</li>"+
"<li><b>Ask the article.</b> Type a question in the chat box and press Ask \u2014 it answers only from the article\u2019s text. The <b>Ask this article</b> box gives one-tap quick answers.</li>"+
"<li><b>Browse or roll random.</b> All pages lists every article A\u2013Z, 200 per page; <b>Random article</b> opens one fresh article on every visit.</li>"+
"<li><b>Use the toolbar.</b> <b>Read aloud</b> speaks the article, <b>Copy article</b> copies it, and the download buttons save the article, the program, or the data.</li>"+
"</ol>"+
'<p class="jah-welcome-row"><button id="jah-welcome-ok" type="button">OK \u2014 Got it \u2713</button><button id="jah-welcome-guide" type="button">Full how-to guide</button></p>'+
"</div></div>"+
'<div id="jah-guide" hidden><div class="jah-guide-card" role="dialog" aria-label="Site guide — how to use this site">'+
"<h2>\u2753 How to use JAH Wiki</h2>"+
'<p class="leadg">The encyclopedia of the JAH system — every Signature spec, public patent record, JAH-N subject file, and dictionary word as a full article. Each article carries a definition, history, <b>11 analysis lenses</b>, a patent draft, a working program, and its own AI persona.</p>'+
"<h3>\uD83D\uDD0E Search the encyclopedia</h3><p>The search box in the blue header searches every spec, patent, and subject article — and the Signature Dictionary. Type plain words, or an <b>exact ID</b> to jump straight to the article: <code>JAH-SPEC-######</code>, the permanent <code>JAH-WIKI-SPEC-######</code> / <code>JAH-WIKI-PAT-&lt;pub&gt;</code> / <code>JAH-WIKI-W-&lt;word&gt;</code> / <code>JAH-WIKI-SUB-&lt;slug&gt;</code> IDs, or a patent publication number. An exact match shows an <b>Exact article</b> box. A single plain word checks the dictionary first and opens the word article on an exact match. Results group into spec, patent, and subject articles, with a visible count.</p>"+
"<h3>\uD83E\uDDED THE FINDER — wiki assistance</h3><p>On the All-pages browse views, <b>describe the article you want in plain words</b> and press Find it — the Finder reads every article title and brings you the <b>five closest</b>, with \u201cTake me there\u201d links.</p>"+
"<h3>\uD83C\uDFB2 Random article</h3><p>The <b>Random article</b> link opens one fresh article on every visit. Share <code>?random=1&amp;seed=NNN</code> and everyone lands on the <b>same</b> article — the seed makes it reproducible.</p>"+
"<h3>\uD83D\uDCDA All pages, A–Z</h3><p><b>All pages</b>, <b>Word articles</b> in the header (or <code>?all=SPEC</code> / <code>?all=PAT</code> / <code>?all=SUB</code> / <code>?all=WORD</code>) list every article alphabetically, 200 per page, with an A–Z letter strip, <b>previous/next letters</b>, and page navigation. Subject files also browse by category.</p>"+
"<h3>\uD83D\uDCD6 Word articles &amp; the ?dict= route</h3><p>Every dictionary word gets a <b>full encyclopedia article</b>: definition, JAH data, 11 lenses, cross-references to specs and patents mentioning it, its word patent, a working program, and an Ask AI box. Reach it via <b>Word articles</b>, <code>?page=&lt;word&gt;</code>, or the quick <code>?dict=&lt;word&gt;</code> dictionary route (IWB definition plus a link into the full article).</p>"+
"<h3>\uD83D\uDCF0 The article, top to bottom</h3><p>A definition lead in the wiki\u2019s own wording, an infobox with the record\u2019s key facts, and a <b>Contents</b> box that jumps to each section. The <b>collective report</b> at the top is the network\u2019s paragraph-form synthesis — every cross-link verified against live indexes. Section headings tap open and closed.</p>"+
"<h3>\uD83D\uDD2D Eleven analysis lenses</h3><p>Deterministic, probabilistic, geometric, hash, neural, evolutionary, fuzzy, swarm, decision-tree, cellular-automata, and the <b>hybrid fusion</b> of them all. Every number is computed live from the article\u2019s own data; Lens 11 gives the single hybrid consensus score.</p>"+
"<h3>\uD83D\uDCDC Patent draft</h3><p>The filing section — claims open in a collapsible list. Spec-derived articles carry a <b>draft spec</b> (marked DRAFT — ready to file, NOT a granted patent); patent-derived articles carry the public patent document.</p>"+
"<h3>\uD83D\uDCBB Working program</h3><p>A real Python program generated from the article\u2019s data: read it on the page, tap <b>\u25B6 Run in-browser demo</b> to run it here, copy it, or download the <b>.py</b> for any PC or phone.</p>"+
"<h3>\uD83E\uDD16 AI persona &amp; Ask this article</h3><p>The article as its own personal AI: type a question in the chat box and press <b>Ask</b> — it answers <b>only from the article\u2019s text</b>. The <b>Ask this article</b> box above the lead gives one-tap quick answers straight from the record.</p>"+
"<h3>\uD83D\uDEE0\uFE0F Read aloud, copy, download</h3><p>Every article toolbar: <b>Read aloud</b> (tiered speech with speed control), <b>Copy article</b>, <b>Article (.txt)</b>, <b>Program (.py)</b>, <b>Copy program</b>, <b>Data (.json)</b>. Downloads are labeled with the article ID and version. The RECORD card on each article adds Open / Share / Copy / Download / Read aloud.</p>"+
"<h3>\uD83D\uDCAC Talk &amp; \u2B50 Watch</h3><p>The <b>Talk tab</b> is a discussion page with the article\u2019s AI persona. The <b>star icon</b> watches an article (saved on this device). The <b>dictionary icon</b> looks the title up in the Signature Dictionary.</p>"+
"<h3>\uD83C\uDFF7\uFE0F Provenance &amp; versions</h3><p>Every article states its type up front: spec = <b>draft specification</b> (never a granted patent), patent = <b>public record</b> (the invention belongs to its listed owner), subject = public record plus the <b>marked simulation layer</b>, word = dictionary record. Permanent <code>JAH-WIKI-\u2026</code> IDs are stable across rebuilds; <b>Record this version</b> snapshots a version on your device.</p>"+
"<h3>\uD83D\uDD17 Original source records</h3><p><b>Open original source record</b> jumps to the owning catalog: Spec Catalog (<code>?spec=JAH-SPEC-######</code>), Patent Catalog (<code>?patent=&lt;pub&gt;</code>), Dictionary (<code>?w=&lt;word&gt;</code>), word patent (<code>?word=&lt;word&gt;</code>), JAH-N Wiki (<code>?dossier=&lt;id&gt;</code>).</p>"+
"<h3>\uD83C\uDF19 Extras</h3><p>The bottom-right button toggles <b>dark mode</b>. The site remembers your scroll position and tabs on this device. Home shows live article counts with an <b>Index data last updated</b> stamp, a featured subject file, and a Data &amp; methodology section explaining what each count means.</p>"+
"<h3>\u2328\uFE0F Keyboard</h3><p><b>Esc</b> closes the welcome overlay and this guide.</p>"+
'<p style="margin-top:16px"><button id="jah-guide-close" type="button">Close</button><button id="jah-guide-tour" type="button">\u25B6 Show the welcome guide</button></p>'+
"</div></div>";
document.body.appendChild(wrap);

/* ---------- welcome overlay: open / close (NO scroll, NO spotlight, NO page jumps) ---------- */
function $(id){return document.getElementById(id)}
function markSeen(){try{localStorage.setItem(SEEN,"1")}catch(e){}}
function openWelcome(){$("jah-welcome").hidden=false;try{$("jah-welcome-ok").focus({preventScroll:true})}catch(e){}}
function closeWelcome(){$("jah-welcome").hidden=true;markSeen()}
$("jah-welcome-ok").onclick=closeWelcome;
$("jah-welcome-guide").onclick=function(){closeWelcome();openGuide()};
$("jah-welcome").addEventListener("click",function(e){if(e.target===this)closeWelcome()});

/* ---------- guide open/close ---------- */
function openGuide(){$("jah-guide").hidden=false;try{$("jah-guide-close").focus({preventScroll:true})}catch(e){}}
function closeGuide(){$("jah-guide").hidden=true}
var gb2=$("jah-guide-btn");if(gb2){gb2.onclick=openWelcome;gb2.setAttribute("aria-label","Open the welcome guide");gb2.title="\u2753 Guide \u2014 show the welcome guide"}
$("jah-guide-close").onclick=closeGuide;
$("jah-guide-tour").onclick=function(){closeGuide();openWelcome()};
$("jah-guide").addEventListener("click",function(e){if(e.target===this)closeGuide()});
document.addEventListener("keydown",function(e){
 if(e.key!=="Escape")return;
 if(!$("jah-welcome").hidden){closeWelcome();return}
 if(!$("jah-guide").hidden)closeGuide();
});

/* ---------- first-visit: show the welcome overlay once, on the home view ---------- */
function homeNow(){var s=location.search||"";return s===""||s==="?"}
function guideBoot(){
 var seen=false;
 try{seen=!!localStorage.getItem(SEEN)}catch(e){}
 if(seen)return;
 if(!homeNow())return; /* never auto-prompt inside a record, search, or browse view */
 setTimeout(function(){
  try{if(localStorage.getItem(SEEN))return}catch(e){}
  openWelcome();
 },1200);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",guideBoot);else guideBoot();
})();
