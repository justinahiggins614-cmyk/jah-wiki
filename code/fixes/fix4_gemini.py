#!/usr/bin/env python3
"""Site #4 Gemini follow-up fixes for JAH Wiki (2026-10-02). ES5-safe, additive.
No backslash escapes in literals (transport doubles them)."""
import io

P = "/home/hatch/workspace/jah-wiki/index.html"
h = io.open(P, encoding="utf-8").read()
orig = h
n = 0

def rep(old, new, count=1):
    global h, n
    c = h.count(old)
    assert c == count, "anchor count %d != %d: %s" % (c, count, old[:70])
    h = h.replace(old, new, count)
    n += count

# ---------- CSS: badges + buttons ----------
css_anchor = "@media(max-width:900px){.artlay{display:block}.qjump{display:none}.qjump-m{display:block;margin:6px 0 12px}}"
css_add = css_anchor + """
/* Gemini follow-up: source badges, source buttons, result type badges */
.srcbadge{display:inline-block;background:#0b3d91;color:#fff;font-family:Arial,sans-serif;font-weight:bold;font-size:.82em;letter-spacing:1px;padding:5px 12px;border-radius:4px;margin-bottom:8px}
.arttype.pat .srcbadge{background:#7a4a00}
.arttype.sub .srcbadge{background:#5b2a86}
.arttype.word .srcbadge{background:#1a4d2e}
.srcbtn{display:inline-block;margin-top:10px;background:#0b3d91;color:#fff !important;font-family:Arial,sans-serif;font-weight:bold;font-size:.9em;padding:10px 20px;border-radius:5px;text-decoration:none !important}
.srcbtn:hover{background:#082c6b}
.rtbadge{display:inline-block;background:#0b3d91;color:#fff;font-family:Arial,sans-serif;font-size:.66em;font-weight:bold;padding:2px 7px;border-radius:3px;margin-right:7px;letter-spacing:.5px;vertical-align:middle}"""
rep(css_anchor, css_add)

# ---------- (1)(2)(5) classBanner: source badge + draft/granted + record strip + source button ----------
old_banner = """function classBanner(kind,meta){
 var label={spec:["SPECIFICATION","JAH ORIGINAL","STATUS: DRAFT — ready to review and file. <b>NOT A GRANTED PATENT.</b>"],
  pat:["PUBLIC PATENT RECORD","PUBLIC RECORD","Descriptions reflect the public filing — the invention belongs to its listed owner."],
  sub:["SUBJECT FILE","MIXED: PUBLIC-RECORD MATERIAL + JAH SIMULATION","Public-record blocks and simulation blocks are each marked. Nothing simulated is a public fact."],
  word:["WORD ARTICLE","IWB DICTIONARY (ORIGINAL DEFINITIONS)","The JAH system's instruments on one word."]}[kind]||["ARTICLE","—",""];
 return '<div class="arttype '+kind+'"><b>ARTICLE TYPE: '+label[0]+'</b> &middot; SOURCE: '+label[1]+'<br>'+label[2]+
 '<br><span style="color:#5b6472">Article ID: <b>'+meta.article_id+'</b> &middot; Version v'+meta.version+' &middot; Updated '+esc(meta.updated||"—")+'</span></div>';
}"""
new_banner = """function classBanner(kind,meta){
 var label={spec:["SIGNATURE ORIGINAL SPEC","<b>DRAFT SPECIFICATION — NOT a granted patent.</b> Ready to review and file. An original design by Justin Addam Higgins."],
  pat:["PUBLIC PATENT RECORD","<b>PUBLIC PATENT RECORD — NOT a JAH draft.</b> Descriptions reflect the public filing; the invention belongs to its listed owner."],
  sub:["JAH-N SUBJECT FILE","<b>SUBJECT FILE.</b> Mixed: public-record material plus the JAH system's marked simulation layer."],
  word:["DICTIONARY RECORD","<b>DICTIONARY RECORD.</b> IWB Dictionary original definitions, plus the JAH system's instruments."]}[kind]||["ARTICLE",""];
 var cu=WIKI_HOME+"?page="+encodeURIComponent(meta.page_param||"");
 var pv=(meta.provenance&&meta.provenance[0])||{};
 var srcUrl=pv.source_url||"",srcId=String(pv.source_id||"");
 if(kind==="pat"&&meta.xrefs&&meta.xrefs.publication_no){srcUrl=PAT_SITE+"/?patent="+encodeURIComponent(meta.xrefs.publication_no);srcId=meta.xrefs.publication_no}
 return '<div class="arttype '+kind+'"><span class="srcbadge">'+label[0]+'</span><br>'+label[1]+
 '<br><span style="color:#5b6472">Article ID: <b>'+meta.article_id+'</b> &middot; Version v'+meta.version+' &middot; Updated '+esc(meta.updated||"—")+'</span>'+
 '<br><span style="color:#5b6472">Canonical URL: '+esc(cu)+'</span>'+
 (srcUrl?'<br><a class="srcbtn" href="'+esc(srcUrl)+'" target="_blank" rel="noopener">Open original source record'+(srcId?' — '+esc(srcId.slice(0,60)):"")+'</a>':"")+'</div>';
}"""
rep(old_banner, new_banner)

# ---------- (3) Word Articles browse: wordPages() before the lenses section ----------
word_pages = """/* Site #4 diagnostic (Gemini): obvious Word Articles browse path — every dictionary
   word as an encyclopedia article, A–Z partitions, 200 per page. */
async function wordPages(){
 var letter=(qp("L")||"").toUpperCase(),pg=parseInt(qp("pg")||"1",10),per=200;
 var h='<nav aria-label="Breadcrumb" class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=WORD">Word articles</a></nav><h1 class="at">Word articles</h1>';
 h+='<p style="font-family:Arial"><a href="?all=SPEC">Specs</a> &middot; <a href="?all=PAT">Patents</a> &middot; <a href="?all=SUB">Subjects</a> &middot; <b>Word articles</b></p>';
 h+='<p class="sub">Every word in the IWB Dictionary gets a full encyclopedia article — definition, JAH data, analysis lenses, working program, and AI persona.</p>';
 var words=[];
 try{await dictIdx();}catch(e){}
 if(DICT.idx){for(var i=0;i<DICT.idx.length;i++){var w=String(DICT.idx[i][0]);if(/^[a-z][a-z'-]{0,40}$/i.test(w)&&(!letter||w.charAt(0).toUpperCase()===letter))words.push(w)}}
 var pages=Math.max(1,Math.ceil(words.length/per));if(pg<1)pg=1;if(pg>pages)pg=pages;
 var az="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function(c){return '<a href="?all=WORD&L='+c+'"'+(c===letter?' style="background:#0b3d91;color:#fff"':"")+'>'+c+"</a>"}).join("");
 h+='<h2 class="sec">Word articles ('+words.length.toLocaleString()+')</h2><div class="az">'+az+' <a href="?all=WORD">all</a></div>';
 if(!words.length){h+='<p class="sub">The dictionary index did not load — the exact failed source is listed on the <a href="?">home page</a>. <a href="?all=WORD">Retry</a>.</p>';nav(h);return}
 var slice=words.slice((pg-1)*per,pg*per);
 h+='<ul class="pgln">'+slice.map(function(w){return '<li><span class="rtbadge">DICTIONARY RECORD</span><a href="?page='+encodeURIComponent(w)+'">'+esc(w)+'</a></li>'}).join("")+"</ul>";
 h+='<p style="font-family:Arial">Page '+pg+' of '+pages.toLocaleString();
 if(pg>1)h+=' &middot; <a href="?all=WORD'+(letter?'&L='+letter:"")+'&pg='+(pg-1)+'">&larr; prev</a>';
 if(pg<pages)h+=' &middot; <a href="?all=WORD'+(letter?'&L='+letter:"")+'&pg='+(pg+1)+'">next &rarr;</a>';
 h+="</p>";nav(h);
}
/* ================= analysis lenses: 11 intelligences, one subject ================= */"""
rep("/* ================= analysis lenses: 11 intelligences, one subject ================= */", word_pages)

# ---------- (3) router ----------
rep('else if(sp.has("all"))allPages();',
    'else if(sp.has("all")){if(String(sp.get("all")||"").toUpperCase()==="WORD")await wordPages();else allPages();}');

# ---------- (3) browse tabs / navlinks / cards / qjump / static fallback ----------
rep('<a href="?all=SPEC">Specs</a> &middot; <a href="?all=PAT">Patents</a> &middot; <a href="?all=SUB">Subjects</a></p>',
    '<a href="?all=SPEC">Specs</a> &middot; <a href="?all=PAT">Patents</a> &middot; <a href="?all=SUB">Subjects</a> &middot; <a href="?all=WORD">Word articles</a></p>')
rep('<a href="?">Home</a><a href="?all=SPEC">All pages</a><a href="#" id="randlink">Random article</a>',
    '<a href="?">Home</a><a href="?all=SPEC">All pages</a><a href="?all=WORD">Word articles</a><a href="#" id="randlink">Random article</a>')
rep(""" h+='<div class="card"><h3>Subject files</h3><p>Bizarre subjects, cryptids, UFO cases, dream figures and more — each with witnesses, investigations, sources, and the full lens treatment.</p><p><a href="?all=SUB">Browse all &rarr;</a></p></div>';""",
    """ h+='<div class="card"><h3>Subject files</h3><p>Bizarre subjects, cryptids, UFO cases, dream figures and more — each with witnesses, investigations, sources, and the full lens treatment.</p><p><a href="?all=SUB">Browse all &rarr;</a></p></div>';
 h+='<div class="card"><h3>Word articles</h3><p>Every word in the IWB Dictionary gets a full encyclopedia article — definition, JAH data, analysis lenses, working program, and AI persona.</p><p><a href="?all=WORD">Browse all &rarr;</a></p></div>';""")
rep('<a href="?all=SUB">Subject files</a><a href="?random=1">Random article</a>',
    '<a href="?all=SUB">Subject files</a><a href="?all=WORD">Word articles</a><a href="?random=1">Random article</a>')
rep('<li><a href="?all=SUB">All subject articles</a> — browsable by category</li>',
    '<li><a href="?all=SUB">All subject articles</a> — browsable by category</li>\n<li><a href="?all=WORD">All word articles</a> — every dictionary word as an encyclopedia article, A&ndash;Z</li>')

# ---------- (3) static category-hub nav: word A–Z ----------
waz = "".join('<a href="?all=WORD&L=%s">%s</a> ' % (c, c) for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
rep('Subject files: <a href="?all=SUB">browse by category</a> &middot; <a href="?random=1">Random article</a>\n</nav>',
    'Subject files: <a href="?all=SUB">browse by category</a> &middot; <a href="?random=1">Random article</a><br>\nWord articles A&ndash;Z: ' + waz + '\n</nav>')

# ---------- (4) exact failed sources ----------
rep("var DB={specIdx:[],patIdx:[],subjects:[],shards:[],sigline:[],ready:false};",
    "var DB={specIdx:[],patIdx:[],subjects:[],shards:[],sigline:[],ready:false,failUrls:[]};")
rep('function noteMod(url,r){try{var lm=r.headers.get("last-modified");if(lm){var t=Date.parse(lm);if(t>0)LASTMOD[url]=t}}catch(e){}}',
    'function noteMod(url,r){try{var lm=r.headers.get("last-modified");if(lm){var t=Date.parse(lm);if(t>0)LASTMOD[url]=t}}catch(e){}}\nfunction noteFail(url,label){(DB.failUrls=DB.failUrls||[]).push({url:url,label:label})}')
rep('''DB.shards=Array.isArray(j)?j:((j&&j.shards)||[]);
 }).catch(function(){DB.shardErrors=(DB.shardErrors||0)+1}));''',
    '''DB.shards=Array.isArray(j)?j:((j&&j.shards)||[]);
 }).catch(function(){DB.shardErrors=(DB.shardErrors||0)+1;noteFail(SPEC_SITE+"/data/index/shards.json","Spec Catalog shard registry")}));''')
rep('''return JSON.parse(l)});
 }).catch(function(){DB.shardErrors=(DB.shardErrors||0)+1}));''',
    '''return JSON.parse(l)});
 }).catch(function(){DB.shardErrors=(DB.shardErrors||0)+1;noteFail(SPEC_SITE+"/data/index/specs.search.json.gz","Spec Catalog compact search index")}));''')
rep('jobs.push(fetchGz(PAT_SITE+"/data/patents.idx.json.gz").then(function(t){DB.patIdx=JSON.parse(t)}).catch(function(){DB.patErrors=(DB.patErrors||0)+1}));',
    'jobs.push(fetchGz(PAT_SITE+"/data/patents.idx.json.gz").then(function(t){DB.patIdx=JSON.parse(t)}).catch(function(){DB.patErrors=(DB.patErrors||0)+1;noteFail(PAT_SITE+"/data/patents.idx.json.gz","Patent Catalog record index")}));')
rep('.then(function(j){DB.subjects=j}).catch(function(){}));',
    '.then(function(j){DB.subjects=j}).catch(function(){noteFail(LEAK_SITE+"/data/bizarre.json","JAH-N Wiki subject files")}));')
rep('if(DB.shardErrors||DB.patErrors)h+=',
    'if(DB.failUrls&&DB.failUrls.length)h+=')
rep("""'<p class="sub" style="color:#a00">Note: '+(DB.shardErrors||0)+' spec index and '+(DB.patErrors||0)+' patent index file(s) failed to load — counts below may be incomplete. <a href="?">Reload to retry</a>.</p>';""",
    """'<p class="sub" style="color:#a00"><b>Some source indexes failed to load</b> — the exact affected sources:<br>'+DB.failUrls.map(function(f){return '&bull; '+esc(f.label)+' (<span style="font-family:monospace">'+esc(f.url)+'</span>)'}).join('<br>')+'<br>Counts below may be incomplete. <a href="?">Reload to retry</a>.</p>';""")
old_unable = """function unableHTML(off){
 return '<div class="crumb"><a href="?">Home</a></div><div class="loadstate"><div class="big">Unable to load the encyclopedia</div>'+"""
new_unable = """function unableHTML(off){
 var fl=(DB.failUrls&&DB.failUrls.length)?'<p style="color:#a00"><b>Failed sources:</b><br>'+DB.failUrls.map(function(f){return '&bull; '+esc(f.label)+' — <span style="font-family:monospace">'+esc(f.url)+'</span>'}).join('<br>')+'</p>':"";
 return '<div class="crumb"><a href="?">Home</a></div><div class="loadstate"><div class="big">Unable to load the encyclopedia</div>'+fl+"""
rep(old_unable, new_unable)

# ---------- (6) search-result type badges ----------
rep("""if(exr)h+='<h2 class="sec">Exact article</h2><ul class="pgln"><li><a href="?page='+exr[0]+'"><b>'""",
    """if(exr)h+='<h2 class="sec">Exact article</h2><ul class="pgln"><li><span class="rtbadge">SPECIFICATION</span><a href="?page='+exr[0]+'"><b>'""")
rep("""else if(exp)h+='<h2 class="sec">Exact article</h2><ul class="pgln"><li><a href="?page=PAT:'""",
    """else if(exp)h+='<h2 class="sec">Exact article</h2><ul class="pgln"><li><span class="rtbadge">PUBLIC PATENT RECORD</span><a href="?page=PAT:'""")
rep("""h+=sec("Spec articles",rs,function(r){return '<li><a href="?page='+r[0]+'">'""",
    """h+=sec("Spec articles",rs,function(r){return '<li><span class="rtbadge">SPECIFICATION</span><a href="?page='+r[0]+'">'""")
rep("""h+=sec("Patent articles",rp,function(p){return '<li><a href="?page=PAT:'""",
    """h+=sec("Patent articles",rp,function(p){return '<li><span class="rtbadge">PUBLIC PATENT RECORD</span><a href="?page=PAT:'""")
rep("""h+=sec("Subject files",rb,function(d){return '<li><a href="?page='+subjSlug(d)+'">'""",
    """h+=sec("Subject files",rb,function(d){return '<li><span class="rtbadge">SUBJECT FILE</span><a href="?page='+subjSlug(d)+'">'""")
rep("""<div class="feat"><h3 style="margin:0 0 6px">'""",
    """<div class="feat"><h3 style="margin:0 0 6px"><span class="rtbadge">DICTIONARY RECORD</span>'""")
rep("""pm.map(function(kx){return '<li><a href="'+DICT_SITE+'/?w='""",
    """pm.map(function(kx){return '<li><span class="rtbadge">DICTIONARY RECORD</span><a href="'+DICT_SITE+'/?w='""")

# ---------- methodology: word sitemap mention ----------
rep('<a href="sitemap-wiki-sub.xml">sitemap-wiki-sub.xml</a>) partition',
    '<a href="sitemap-wiki-sub.xml">sitemap-wiki-sub.xml</a>, <a href="sitemap-wiki-word.xml">sitemap-wiki-word.xml</a>) partition')

io.open(P, "w", encoding="utf-8").write(h)
print("edits applied:", n, "| size delta:", len(h) - len(orig))
