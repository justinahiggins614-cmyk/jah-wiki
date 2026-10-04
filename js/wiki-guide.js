"use strict";
/* ============ FIRST-TIME USER GUIDE: spotlight tour + guide panel ============
   Site 4/27 JAH Wiki backfill (2026-10-03). Additive only: no theme/redesign
   changes, no invented features. localStorage flag jah-tour-seen-wiki. */
(function(){
var SEEN="jah-tour-seen-wiki",STEP="jah-tour-step-wiki";

/* ---------- themed CSS (wiki blue/gold, Georgia + Arial) ---------- */
var CSS=[
".jah-tour-tip{position:fixed;left:10px;right:10px;bottom:12px;margin:0 auto;max-width:560px;z-index:99997;background:#fff;border:2px solid #0b3d91;border-radius:10px;padding:14px 16px;box-shadow:0 6px 28px rgba(11,61,145,.28);font-family:Arial,sans-serif;color:#1a1a2e}",
".jah-tour-tip h3{margin:0 0 6px;font-size:1.05em;color:#0b3d91;font-family:Georgia,serif}",
".jah-tour-k{font-size:.72em;letter-spacing:2px;color:#b8860b;font-weight:bold;margin-bottom:4px}",
".jah-tour-tip p{margin:6px 0;font-size:.92em;line-height:1.6}",
".jah-tour-tip p b{color:#0b3d91}",
".jah-tour-nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}",
".jah-tour-nav button{min-height:44px;padding:10px 20px;font-size:1em;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;border:1px solid #0b3d91;background:#fff;color:#0b3d91;font-weight:bold}",
".jah-tour-nav button.go{background:#0b3d91;color:#fff}",
".jah-tour-nav button:disabled{opacity:.35;cursor:default}",
".jah-tour-hl{outline:3px solid #b8860b!important;outline-offset:3px;border-radius:6px}",
"#jah-tour-prompt{position:fixed;left:10px;right:10px;bottom:56px;margin:0 auto;max-width:480px;z-index:99997;background:#fffdf4;border:2px solid #b8860b;border-radius:10px;padding:12px 16px;box-shadow:0 6px 28px rgba(0,0,0,.22);font-family:Arial,sans-serif;color:#1a1a2e}",
"#jah-tour-prompt b{color:#0b3d91;font-family:Georgia,serif;font-size:1.05em}",
"#jah-tour-prompt p{margin:6px 0;font-size:.9em}",
"#jah-tour-prompt .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}",
"#jah-tour-prompt button{min-height:44px;padding:10px 20px;font-size:1em;border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;font-weight:bold}",
"#jah-tour-start{background:#0b3d91;color:#fff;border:1px solid #0b3d91}",
"#jah-tour-nos{border:1px solid #9db3d8;background:#fff;color:#0b3d91}",
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
 gb.setAttribute("aria-label","Open the site guide");
 gb.title="How to use this site — every feature, in plain language";
 nl.appendChild(gb);
}

/* ---------- guide + tour + prompt DOM ---------- */
var wrap=document.createElement("div");
wrap.innerHTML=
'<div id="jah-tour-prompt" hidden><b>\uD83D\uDCD6 New here?</b><p>Take the 1-minute tour — search, lenses, programs, and the article AI.</p><div class="row"><button id="jah-tour-start" type="button">Start tour</button><button id="jah-tour-nos" type="button">Skip</button></div></div>'+
'<div id="jah-tour" hidden><div class="jah-tour-tip" role="dialog" aria-live="polite" aria-label="Site tour"><div class="jah-tour-k" id="jah-tour-k"></div><h3 id="jah-tour-t"></h3><div id="jah-tour-b"></div><div class="jah-tour-nav"><button id="jah-tour-back" type="button">\u2190 Back</button><button id="jah-tour-skip" type="button">Skip tour</button><button id="jah-tour-next" type="button" class="go">Next \u2192</button></div></div></div>'+
'<div id="jah-guide" hidden><div class="jah-guide-card" role="dialog" aria-label="Site guide — how to use this site">'+
"<h2>\u2753 How to use JAH Wiki</h2>"+
'<p class="leadg">The encyclopedia of the JAH system — every Signature spec, public patent record, JAH-N subject file, and dictionary word as a full article. Each article carries a definition, history, <b>11 analysis lenses</b>, a patent draft, a working program, and its own AI persona.</p>'+
"<h3>\uD83D\uDD0E Search the encyclopedia</h3><p>The search box in the blue header searches every spec, patent, and subject article — and the IWB Dictionary. Type plain words, or an <b>exact ID</b> to jump straight to the article: <code>JAH-SPEC-######</code>, the permanent <code>JAH-WIKI-SPEC-######</code> / <code>JAH-WIKI-PAT-&lt;pub&gt;</code> / <code>JAH-WIKI-W-&lt;word&gt;</code> / <code>JAH-WIKI-SUB-&lt;slug&gt;</code> IDs, or a patent publication number. An exact match shows an <b>Exact article</b> box. A single plain word checks the dictionary first and opens the word article on an exact match. Results group into spec, patent, and subject articles, with a visible count.</p>"+
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
"<h3>\uD83D\uDCAC Talk &amp; \u2B50 Watch</h3><p>The <b>Talk tab</b> is a discussion page with the article\u2019s AI persona. The <b>star icon</b> watches an article (saved on this device). The <b>dictionary icon</b> looks the title up in the IWB Dictionary.</p>"+
"<h3>\uD83C\uDFF7\uFE0F Provenance &amp; versions</h3><p>Every article states its type up front: spec = <b>draft specification</b> (never a granted patent), patent = <b>public record</b> (the invention belongs to its listed owner), subject = public record plus the <b>marked simulation layer</b>, word = dictionary record. Permanent <code>JAH-WIKI-\u2026</code> IDs are stable across rebuilds; <b>Record this version</b> snapshots a version on your device.</p>"+
"<h3>\uD83D\uDD17 Original source records</h3><p><b>Open original source record</b> jumps to the owning catalog: Spec Catalog (<code>?spec=JAH-SPEC-######</code>), Patent Catalog (<code>?patent=&lt;pub&gt;</code>), Dictionary (<code>?w=&lt;word&gt;</code>), word patent (<code>?word=&lt;word&gt;</code>), JAH-N Wiki (<code>?dossier=&lt;id&gt;</code>).</p>"+
"<h3>\uD83C\uDF19 Extras</h3><p>The bottom-right button toggles <b>dark mode</b>. The site remembers your scroll position and tabs on this device. Home shows live article counts with an <b>Index data last updated</b> stamp, a featured subject file, and a Data &amp; methodology section explaining what each count means.</p>"+
"<h3>\u2328\uFE0F Keyboard</h3><p>In the tour: <b>\u2192</b> next, <b>\u2190</b> back, <b>Esc</b> end. <b>Esc</b> also closes this guide.</p>"+
'<p style="margin-top:16px"><button id="jah-guide-close" type="button">Close</button><button id="jah-guide-tour" type="button">\u25B6 Replay the 1-minute tour</button></p>'+
"</div></div>";
document.body.appendChild(wrap);

/* ---------- tour steps (WHAT / WHAT IT DOES / HOW) ---------- */
var TOUR=[
{t:"\uD83D\uDCD6 Welcome to JAH Wiki",b:"<b>WHAT:</b> the encyclopedia of the JAH system — every spec, patent, subject file, and dictionary word as a full article.<br><b>WHAT IT DOES:</b> each article carries a definition, history, 11 analysis lenses, a patent draft, a working program, and its own AI persona.<br><b>HOW:</b> this 1-minute tour walks you through it. Next/Back (or arrow keys); Esc or Skip ends it any time."},
{sel:"#q",t:"\uD83D\uDD0E Search the encyclopedia",b:"<b>WHAT:</b> the search box in the blue header.<br><b>WHAT IT DOES:</b> searches every spec, patent, and subject article — and the dictionary. Exact IDs jump straight to the article: <code>JAH-SPEC-######</code>, <code>JAH-WIKI-SPEC-######</code>, a patent publication number, or a plain word.<br><b>HOW:</b> type and press Search (or Enter). A single word checks the dictionary first."},
{sel:'#randlink',t:"\uD83C\uDFB2 Random article",b:"<b>WHAT:</b> this header link.<br><b>WHAT IT DOES:</b> opens one fresh article on every visit.<br><b>HOW:</b> tap it — or share <code>?random=1&seed=NNN</code>, which always picks the same article."},
{sel:'.navlinks a[href="?all=SPEC"]',t:"\uD83D\uDCDA All pages, A–Z",b:"<b>WHAT:</b> the browse pages — All pages, Specs, Patents, Subjects, Word articles (in this header).<br><b>WHAT IT DOES:</b> lists every article alphabetically, 200 per page, with an A–Z letter strip, previous/next letters, and page navigation.<br><b>HOW:</b> tap All pages, pick a letter, or browse subjects by category."},
{sel:'.navlinks a[href="?all=WORD"]',t:"\uD83D\uDCD6 Word articles",b:"<b>WHAT:</b> every dictionary word as a full encyclopedia article.<br><b>WHAT IT DOES:</b> definition, JAH data, lenses, cross-references, its word patent, a program, and an Ask AI box.<br><b>HOW:</b> open it here, or use the quick <code>?dict=&lt;word&gt;</code> dictionary route."},
{nav:"article",t:"\uD83D\uDD2C Article anatomy, up close",b:"<b>WHAT:</b> one real article — definition, 11 analysis lenses, patent draft, program, AI persona.<br><b>WHAT IT DOES:</b> shows everything an article carries, on a live record.<br><b>HOW:</b> press <b>Continue</b> and we\u2019ll open one real article together, then keep the tour going there."},
{sel:"#reportslot",t:"\uD83D\uDCF0 Collective report",b:"<b>WHAT:</b> the network\u2019s paragraph-form synthesis at the top of every article.<br><b>WHAT IT DOES:</b> gathers what every JAH site holds on this subject, with every link verified against live indexes — no dead deep links.<br><b>HOW:</b> read it top-down; tap any link to cross the network."},
{sel:"#toolbar",t:"\uD83D\uDEE0\uFE0F Toolbar",b:"<b>WHAT:</b> this bar on every article.<br><b>WHAT IT DOES:</b> reads the article aloud (tiered speech, speed control), copies the article, downloads the article (.txt), the working program (.py), or the full data (.json).<br><b>HOW:</b> tap a button — downloads are labeled with the article ID and version."},
{sel:"#lenses",t:"\uD83D\uDD2D Eleven analysis lenses",b:"<b>WHAT:</b> eleven intelligences reading the same subject.<br><b>WHAT IT DOES:</b> deterministic rules, probabilities, geometry, hash fingerprint, neural activation, evolutionary selection, fuzzy grades, swarm consensus, decision splits, cellular emergence — every number computed live from this article\u2019s own data, ending in the hybrid fusion score.<br><b>HOW:</b> tap each lens heading to open it (I just opened the first)."},
{sel:"#program",t:"\uD83D\uDCBB Working program",b:"<b>WHAT:</b> a real Python program generated from this article\u2019s data.<br><b>WHAT IT DOES:</b> read it on the page, run it right here in the browser, copy it, or download the .py for any PC or phone.<br><b>HOW:</b> tap \u25B6 Run in-browser demo to watch it go."},
{sel:"#ai",t:"\uD83E\uDD16 AI persona",b:"<b>WHAT:</b> the article as its own personal AI.<br><b>WHAT IT DOES:</b> answers questions only from the article\u2019s text — what it is, how it works, its history, its numbers.<br><b>HOW:</b> type a question in the chat box and press Ask."},
{sel:"#jah-guide-btn",t:"\u2753 The Guide button",b:"<b>WHAT:</b> this button in the header, always here.<br><b>WHAT IT DOES:</b> opens the plain-language manual of every feature on the site.<br><b>HOW:</b> tap it any time you\u2019re unsure. That\u2019s the whole tour — happy reading!"}
];

var tourIdx=-1;
function $(id){return document.getElementById(id)}
function tourEl(){return $("jah-tour")}
function tourClearHl(){var e=document.querySelectorAll(".jah-tour-hl");for(var i=0;i<e.length;i++)e[i].classList.remove("jah-tour-hl")}
function markSeen(){try{localStorage.setItem(SEEN,"1")}catch(e){}}
function tourEnd(save){
 tourClearHl();tourEl().hidden=true;tourIdx=-1;
 document.removeEventListener("keydown",tourKeys,true);
 if(save!==false)markSeen();
 try{localStorage.removeItem(STEP)}catch(e){}
}
function tourKeys(e){
 if(tourIdx<0)return;
 if(e.key==="Escape"){e.preventDefault();tourEnd()}
 else if(e.key==="ArrowRight"){e.preventDefault();tourNext()}
 else if(e.key==="ArrowLeft"){e.preventDefault();tourBack()}
}
function expandIfCollapsed(el){
 /* article sections tap open/closed; open the heading so the step shows content */
 try{
  if(el&&el.tagName==="H2"&&/(^|\s)sec(\s|$)/.test(el.className)){
   var n=el.nextElementSibling;
   if(n&&/(^|\s)secbody(\s|$)/.test(n.className)&&n.style.display==="none")el.click();
  }
 }catch(e){}
}
function tourShow(i){
 var guard=0;
 while(guard++<TOUR.length){
  var s=TOUR[i];
  if(s.nav)break;
  if(s.sel&&!document.querySelector(s.sel)){i=(i+1)%TOUR.length;continue}
  break;
 }
 tourIdx=i;var s2=TOUR[i];
 tourClearHl();
 var box=tourEl();box.hidden=false;
 $("jah-tour-k").textContent="STEP "+(i+1)+" OF "+TOUR.length+" \u00B7 JAH WIKI TOUR";
 $("jah-tour-t").textContent=s2.t;
 $("jah-tour-b").innerHTML="<p>"+s2.b+"</p>";
 $("jah-tour-back").disabled=(i===0);
 $("jah-tour-next").textContent=s2.nav?"Continue \u2192":(i===TOUR.length-1?"Finish \u2713":"Next \u2192");
 var el=null;
 if(s2.sel){el=document.querySelector(s2.sel)}
 if(el){el.classList.add("jah-tour-hl");expandIfCollapsed(el);
  try{el.scrollIntoView({block:"center",behavior:"smooth"})}catch(e){}}
}
function tourNext(){
 var s=TOUR[tourIdx];
 if(s&&s.nav){
  /* land on a real article, then resume the tour there (seeded = reproducible) */
  try{localStorage.setItem(STEP,String(tourIdx+1))}catch(e){}
  location.href="?random=1&seed=jah-tour-wiki";
  return;
 }
 if(tourIdx>=TOUR.length-1){tourEnd();return}
 tourShow(tourIdx+1);
}
function tourBack(){if(tourIdx>0)tourShow(tourIdx-1)}
function tourStart(i){
 document.addEventListener("keydown",tourKeys,true);
 tourShow(i||0);
}
$("jah-tour-back").onclick=tourBack;
$("jah-tour-skip").onclick=function(){tourEnd()};
$("jah-tour-next").onclick=tourNext;

/* ---------- guide open/close/replay ---------- */
function openGuide(){$("jah-guide").hidden=false}
function closeGuide(){$("jah-guide").hidden=true}
var gb2=$("jah-guide-btn");if(gb2)gb2.onclick=openGuide;
$("jah-guide-close").onclick=closeGuide;
$("jah-guide-tour").onclick=function(){closeGuide();tourStart(0)};
$("jah-guide").addEventListener("click",function(e){if(e.target===this)closeGuide()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("jah-guide").hidden)closeGuide()});

/* ---------- first-visit prompt + resume ---------- */
function homeNow(){var s=location.search||"";return s===""||s==="?"}
function tourBoot(){
 var pending=-1;
 try{pending=parseInt(localStorage.getItem(STEP)||"-1",10)}catch(e){}
 var seen=false;
 try{seen=!!localStorage.getItem(SEEN)}catch(e){}
 if(pending>=0&&pending<TOUR.length){
  /* resuming inside the article we opened from the nav step */
  var t0=Date.now();
  function wait(){
   if(document.getElementById("articlebody")){
    try{localStorage.removeItem(STEP)}catch(e){}
    tourStart(pending);return;
   }
   if(Date.now()-t0>20000){try{localStorage.removeItem(STEP)}catch(e){}return}
   setTimeout(wait,400);
  }
  wait();return;
 }
 if(seen)return;
 if(!homeNow())return; /* never auto-prompt inside a record, search, or browse view */
 setTimeout(function(){
  if(tourIdx>=0)return;
  try{if(localStorage.getItem(SEEN))return}catch(e){}
  $("jah-tour-prompt").hidden=false;
 },1200);
}
$("jah-tour-start").onclick=function(){$("jah-tour-prompt").hidden=true;tourStart(0)};
$("jah-tour-nos").onclick=function(){$("jah-tour-prompt").hidden=true;markSeen()};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",tourBoot);else tourBoot();
})();
