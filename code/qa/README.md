# JAH Wiki QA checkers

Re-runnable quality gates for the wiki. All checkers extract the **real shipped
functions** from `index.html` (via `lib.js`) so they test what is actually live —
not a copy of the logic.

| Checker | What it verifies |
|---|---|
| `link-check.js` | THE JAH NETWORK bar: 9 links, canonical order, canonical destinations, YOU ARE HERE marker. Then every external URL in `index.html` / `sitemap.xml` / `sitemap-pages.xml` / `robots.txt` / `api.json` is fetched live (HEAD, GET fallback) and must return 2xx/3xx. |
| `count-check.js` | Static: home page renders `(ns+np+nb)` live (no hardcoded total); `api.json` breakdown sums; the raw-HTML fallback "N articles indexed, as of YYYY-MM-DD" line exists with its what-counts note and matches `api.json` records_approx; methodology section present. Live: recounts spec shards + patent index + bizarre subjects and asserts live total ≥ snapshot and ≥ static fallback (data only grows). Writes `last-count.json`. |
| `discoverability-check.js` | Static: robots.txt allows public crawling with no blocks and a Sitemap pointer; sitemap.xml is an index (own browse pages + spec/patent record-sitemap pointers, never per-article URLs); sitemap-pages.xml lists home + browse + A–Z partitions; static meta description, per-article canonical/meta helper, JSON-LD Article with stable IDs, skip link, labelled search. Live: every sitemap loc + key browse routes return 2xx, and curl of the raw HTML shows the static count line. |
| `dupe-id-check.js` | Computes the shipped `wikiId()` for every live record (specs, patents, words, subjects): no duplicate article IDs within a namespace, and every article ID round-trips through the shipped `parsePage()`. |
| `missing-id-check.js` | Unit vectors for `parsePage` (all `?page=` forms incl. `JAH-WIKI-*`), stub-data tests for the slug resolvers, and router coverage (`page`/`random`/`all`/`q`/`dict`). |

## Run

```sh
node code/qa/link-check.js
node code/qa/count-check.js
node code/qa/dupe-id-check.js
node code/qa/missing-id-check.js
# or everything:
sh code/qa/run-all.sh
```

`--static-only` skips network on link-check and count-check.
`--max-rows=N` caps rows on dupe-id-check (debugging).

Exit code 1 on any failure. Requires node 18+.

## Known limitation (documented, not a bug)

Word article IDs derive from the normalized word (`a-z0-9`, runs of other
characters become one `-`; phrases over 50 chars get a hash suffix; words with
no latin-alphanumeric characters get `JAH-WIKI-W-X<hash>`). About 0.03% of
dictionary entries are orthographic variants that normalize identically
(`all hail`/`all-hail`, `analog to digital converter`/`analog-to-digital
converter`). Those share a citation key **by design** — each keeps its own
article, its own `?page=<exact word>` / `?dict=<word>` URL, and its own
dictionary entry. `dupe-id-check` reports these groups as info and fails only
on true information-loss collisions (different stems sharing one ID).
