#!/usr/bin/env python3
"""Site #4 diagnostic fixes for JAH Wiki (2026-10-02). ES5-safe, additive.
NOTE: no backslash escapes used in any literal below (transport doubles them)."""
import io

P = "/home/hatch/workspace/jah-wiki/index.html"
h = io.open(P, encoding="utf-8").read()
orig = h
n = 0

def rep(old, new, count=1):
    global h, n
    assert h.count(old) == count, "anchor count != %d: %s" % (count, old[:70])
    h = h.replace(old, new, count)
    n += count

DQ = chr(34)          # "
B2 = chr(92)  # one literal backslash, as in the file's <\/script>

# ---- FIX 4+5+6 CSS ----
css = """
/* Site #4 diagnostic: reading measure, cross-ref links, quick-jump sidebar */
nav.crumb{margin-bottom:8px}
#articlebody p,#articlebody li{max-width:74ch}
#articlebody a{color:#0a2c7a;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
#articlebody a:hover,#articlebody a:focus{color:#0b3d91;background:#eaf0ff;text-decoration-thickness:2px}
#articlebody a:focus{outline:2px solid #9db3d8;outline-offset:1px}
.artlay{display:flex;gap:22px;align-items:flex-start}
.artmain{flex:1;min-width:0}
.qjump{flex:0 0 196px;position:sticky;top:66px;background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:12px 14px;font-family:Arial,sans-serif;font-size:.85em}
.qjump b{display:block;margin-bottom:6px;color:#0b3d91}
.qjump a{display:block;padding:5px 0;color:var(--accent);text-decoration:none}
.qjump a:hover{text-decoration:underline}
.qjump-m{display:none}
@media(max-width:900px){.artlay{display:block}.qjump{display:none}.qjump-m{display:block;margin:6px 0 12px}}
"""
css_anchor = """.fh-a{font-family:Arial,sans-serif;font-size:.92em;background:#fff;border:1px solid #9db3d8;border-radius:6px;padding:10px 12px;min-height:1.4em}
</style>"""
rep(css_anchor, css_anchor.replace("\n</style>", css + "</style>"))

# ---- FIX 1: Article JSON-LD — author/publisher/datePublished/entity classification ----
old_jsonld = """function jsonldHTML(meta){
 return '<script type="application/ld+json">'+JSON.stringify({["@context"]:"https://schema.org",["@type"]:"Article",
  identifier:meta.article_id,headline:meta.title,url:WIKI_HOME+"?page="+encodeURIComponent(meta.page_param),
  version:meta.version,dateModified:meta.updated||undefined,
  additionalProperty:[{name:"article_type",value:meta.classification.article_type},{name:"issued_patent",value:String(meta.issued_patent)},{name:"draft_spec",value:String(meta.draft_spec)},{name:"simulation_present",value:String(meta.simulation_present)}],
  citation:meta.source_list})+'<""" + B2 + """/script>';
}"""
new_jsonld = """function jsonldHTML(meta){
 var c=meta.classification||{};
 return '<script type="application/ld+json">'+JSON.stringify({["@context"]:"https://schema.org",["@type"]:"Article",
  identifier:meta.article_id,headline:meta.title,url:WIKI_HOME+"?page="+encodeURIComponent(meta.page_param),
  version:meta.version,datePublished:meta.created||undefined,dateModified:meta.updated||undefined,
  author:{["@type"]:"Person",name:"Justin Addam Higgins"},
  publisher:{["@type"]:"Person",name:"Justin Addam Higgins"},
  about:{["@type"]:"Thing",name:c.article_type||"ARTICLE",description:c.source||""},
  keywords:[meta.article_id,c.article_type,c.source,c.status].filter(Boolean).join(", "),
  additionalProperty:[{name:"article_type",value:c.article_type},{name:"issued_patent",value:String(meta.issued_patent)},{name:"draft_spec",value:String(meta.draft_spec)},{name:"simulation_present",value:String(meta.simulation_present)}],
  citation:meta.source_list})+'<""" + B2 + """/script>';
}"""
rep(old_jsonld, new_jsonld)

# ---- FIX 6: qjumpHTML helper (desktop sticky sidebar + mobile drawer) ----
qjump = """/* Site #4 diagnostic: sticky quick-jump sidebar (desktop) + collapsible drawer (mobile).
   Instant pivots between the wiki's knowledge domains on every article view. */
function qjumpHTML(){
 var links='<a href="?">Home</a><a href="?all=SPEC">Spec articles</a><a href="?all=PAT">Patent articles</a><a href="?all=SUB">Subject files</a><a href="?random=1">Random article</a>';
 return '<aside class="qjump" aria-label="Knowledge domains"><b>Knowledge domains</b>'+links+'</aside>'+
  '<details class="qjump-m"><summary>Jump to a knowledge domain</summary><div style="padding:8px 2px">'+links+'</div></details>';
}
"""
rep("/* Finder AI + article helper (additive) */", qjump + "/* Finder AI + article helper (additive) */")

# ---- FIX 2: breadcrumbs on all four article views ----
rep('<div class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=SPEC">Spec articles</a> &rsaquo; ',
    '<nav aria-label="Breadcrumb" class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=SPEC">Spec articles</a> &rsaquo; ')
rep('<div class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=PAT">Patent articles</a> &rsaquo; ',
    '<nav aria-label="Breadcrumb" class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=PAT">Patent articles</a> &rsaquo; ')
rep('<div class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=SUB">Subject files</a> &rsaquo; ',
    '<nav aria-label="Breadcrumb" class="crumb"><a href="?">Home</a> &rsaquo; <a href="?all=SUB">Subject files</a> &rsaquo; ')
rep('<div class="crumb"><a href="?">Home</a> &rsaquo; Word articles &rsaquo; ',
    '<nav aria-label="Breadcrumb" class="crumb"><a href="?">Home</a> &rsaquo; Word articles &rsaquo; ')

# ---- FIX 6: wrap article content in .artlay (all four renderers) ----
rep("h+=iconRowHTML();",
    """h+=iconRowHTML();h+='<div class="artlay">'+qjumpHTML()+'<div class="artmain">';""", count=4)

# ---- close the artlay wrapper at the end of each article (short unique anchors) ----
rep("Not a granted patent.</div>';",
    "Not a granted patent.</div></div></div>';")
rep("reflect the public filing.</div></div>';",
    "reflect the public filing.</div></div></div></div>';")
rep("marked simulation layer.</div></div>';",
    "marked simulation layer.</div></div></div></div>';")
rep("Definitions are original to the IWB Dictionary.</div></div>';",
    "Definitions are original to the IWB Dictionary.</div></div></div></div>';")

# ---- FIX 3: static category-hub anchor routing in the no-JS fallback ----
az = "".join('<a href="?all=SPEC&L=%s">%s</a> ' % (c, c) for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
paz = "".join('<a href="?all=PAT&L=%s">%s</a> ' % (c, c) for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
hubnav = """<nav aria-label="Category hubs" style="font-family:Arial,sans-serif;font-size:.85em;margin:12px 0;line-height:2">
<b>Category hubs — no search needed:</b><br>
Spec articles A&ndash;Z: """ + az + """<br>
Patent articles A&ndash;Z: """ + paz + """<br>
Subject files: <a href="?all=SUB">browse by category</a> &middot; <a href="?random=1">Random article</a>
</nav>"""
old_browse = """<li><a href="?random=1">Random article</a> — one article, picked fresh on every visit</li>
</ul>"""
rep(old_browse, old_browse + "\n" + hubnav)

# ---- FIX 2: methodology text mentions the new category sitemaps ----
old_strategy = "This wiki deliberately does not duplicate hundreds of thousands of record URLs in files it cannot refresh; every URL it lists returns 200. Every browse page above is a real link, so every article is reachable without search.</li>"
new_strategy = ("This wiki deliberately does not duplicate hundreds of thousands of record URLs in files it cannot refresh; every URL it lists returns 200. "
 "Category-level sitemap indexes (<a href=" + DQ + "sitemap-wiki-spec.xml" + DQ + ">sitemap-wiki-spec.xml</a>, <a href=" + DQ + "sitemap-wiki-pat.xml" + DQ + ">sitemap-wiki-pat.xml</a>, "
 "<a href=" + DQ + "sitemap-wiki-sub.xml" + DQ + ">sitemap-wiki-sub.xml</a>) partition the browse hubs by letter and category for crawlers. "
 "Every browse page above is a real link, so every article is reachable without search.</li>")
rep(old_strategy, new_strategy)

io.open(P, "w", encoding="utf-8").write(h)
print("edits applied:", n, "| size delta:", len(h) - len(orig))
