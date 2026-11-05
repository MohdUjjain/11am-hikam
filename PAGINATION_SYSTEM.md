# Pagination, Print & Build System — Philosophy Revision Dossier

Reference doc for `philosophy_notes.js` and the multi-file build system
(`main.html` + `subtopic-*.html` + `build.py`). For colours/typography/box
conventions, see `DESIGN_SYSTEM.md` instead.

## Why there are two print systems, not one

The book prints two different ways depending on content type, and both are
load-bearing — don't "clean up" one thinking it's dead code.

**System A — legacy CSS `@page` named pages.** Used for short, fixed-length
content: `.cover`, `#toc`, `.part-divider`, `.colophon`, and every chapter's
`.chapter-frontmatter` (the banner + roadmap). These get `page:bleed` or
`page:darkbleed` (zero margin, full-colour edge-to-edge) via CSS alone —
no JavaScript involved, no measurement needed, because none of this content
is long enough to risk overflowing a physical page.

**System B — the JS pagination engine, below.** Used for the actually
variable-length content: `.chapter-body`, `.chapter-endnav`, `.end-block`.
This is the part that used to rely on CSS Paged Media's `target-counter()`
and per-element `@top-left`/`@top-right` margin-box content — which hit real
limits (documented in the project history: `target-counter()` isn't natively
supported in any browser, and a `page:` name only inherits down to direct
descendants, not siblings, which silently produced blank running headers on
every end-block). The JS engine sidesteps all of that by measuring real
content and writing header/footer text directly, rather than asking the
browser's paged-media implementation to compute it.

Because System B **hides** the elements it processes (see below) and
replaces them with freshly-built pages, the old per-chapter `@page chN`/
`@page revN` CSS templates that still exist for those same elements are
mostly vestigial for chapters — but *are* filled in for every chapter anyway
(belt-and-suspenders, in case JS ever fails to run). If you add a chapter,
add both: the CSS template (see `DESIGN_SYSTEM.md`'s "Adding a new chapter")
*and* nothing else — the JS engine auto-discovers every `section.chapter` at
print time, no registration needed on the JS side.

## The JS pagination engine

All in `philosophy_notes.js`, one IIFE.

**Measurement** (`measureConsumedHeights`): builds an off-screen probe div
(`position:absolute; visibility:hidden; left:-9999px`) sized to the real
printed content width (`210mm − 9mm − 9mm` margins), appends the real content
nodes into it with the *exact* classes/lang/dir they'll actually print with
(this matters — Arabic/Amiri and end-block/chapter-body have different
line-heights, and measuring with a generic class understated real heights and
caused overflow), then reads `offsetTop` on each item to get per-item
heights from the differences.

**Budget**: `(297mm page height − 25mm header − 22mm footer) × (96/25.4 px/mm)
≈ 945px`, minus a 6mm top content pad and a 4px rounding-safety cushion.

**Bin-packing** (`binPack`): single greedy pass — push items onto the current
page until the next one would exceed budget, then start a new page. A second
pass then moves a trailing heading (H2/H3/H4) off the end of any page other
than the last onto the front of the next one, so a section title is never
stranded alone at the bottom of a page — but only if that page has other
content too, so an empty page can never result.

**Page construction** (`buildPage`): builds a `.js-print-page` div per page
with an explicit `.js-page-header` (kicker + title, set as plain text — no
CSS content strings, no `target-counter()`), a `.js-page-content` holding
that page's slice of real content nodes, and an empty `.js-page-footer`
(filled in with `"N / total"` once every chapter's pages are known — see
below). Dark/light and RTL are separate CSS modifier classes
(`.js-dark`/`.js-light`, `.js-rtl`), and `--hue` is set inline per page from
the source chapter.

**Orchestration** (`paginateChapter` → `paginateDocument`): each chapter
produces two independent flows — its light content pages (`.chapter-body` +
`.chapter-endnav` together) and its dark revision pages (`.end-block`) —
inserted as **direct siblings of the original elements inside `.chapter`**
via `body.parentNode.insertBefore(frag, body)`. The originals then get
`.js-print-source` added, which is `display:none!important` under
`@media print` — so on screen nothing changes, and in print only the
generated pages show.

⚠️ Because generated pages land as **children of `.chapter`**, `.chapter`
deliberately **never uses `overflow:hidden`, on screen or in print** — its
rounded-corner card look (see `DESIGN_SYSTEM.md`) comes from
`.chapter-banner` and `.end-block` rounding their own top/bottom corners
directly instead, each self-clipping their own background with no overflow
property involved anywhere. This was tried the other way first (radius +
`overflow:hidden` on `.chapter`, reset to `overflow:visible` in print) and
changed after print-round-2 feedback made "reset around the risk" feel
fragile compared to "remove the risk." If you ever add an ancestor
`overflow:hidden` between `.chapter` and where pages get inserted, print
content can silently vanish — don't.

**Page numbering**: computed once, globally, across every processed
chapter's pages combined — `"n / total"` where `total` is the count of pages
in *this specific print job* (see custom-range printing, below), not a
book-wide constant.

**Re-runnability**: `paginateDocument(filterIds)` always calls
`resetPagination()` first — removes every existing `.js-print-page` and
strips `.js-print-source` from everything — before rebuilding. This is
deliberate: earlier this was a one-shot `if (state.transformed) return;`
guard, which broke as soon as custom-range printing needed to run pagination
more than once per page-load with different chapter selections.

## Custom-range printing (the sidebar's print panel)

`filterIds` (an array of chapter element ids, or `null` for "every chapter")
flows through `paginateDocument`. When set:

1. Chapters *not* in the list get `.print-exclude` added — a class that's
   `display:none!important` under `@media print` only, hiding the whole
   `<section>` including its frontmatter (which the JS engine never touches
   directly, so it needs its own hide mechanism).
2. Only chapters *in* the list get processed into `.js-print-page`s.

`state.filterIds` lives in the pagination IIFE's closure and isn't reachable
from the sidebar module (a separate IIFE) directly — `window.__printControl`
(`setFilter`/`clearFilter`) is the deliberately narrow bridge between them.
The actual print trigger is always the shared `beforeprint` listener reading
`state.filterIds` — the sidebar never calls the pagination function directly,
to avoid a double-run race between a direct call and the event firing.

`parseRange(input, max)` (sidebar module) parses strings like `"8-10,1,15"`:
comma-separated tokens, each either a bare integer or `lo-hi` (auto-swapped
if reversed), out-of-range numbers silently dropped, non-numeric tokens
return a `{error}` shown in the panel. Numbers refer to the **flat sequential
position** (#1–#22 currently), not the dossier number — see below.

## The sidebar (`#tocSidebar`)

Fully self-building — reads `.part-divider[id^="t"]` elements for Topic
titles and every `section.chapter`'s own `.chapter-kicker` text for
Sub-topic grouping (the leading `"N.N · Label"` before the kicker's `.dot`
span). Adding a chapter or topic needs **zero** sidebar-side changes; it's
rebuilt from the live DOM on every page load. This replaced an earlier
hand-maintained `.quicknav` bar that had drifted stale (missing several
chapters) precisely because it wasn't self-updating — don't reintroduce that
pattern.

**Flat numbering** (`chapters[i].flat = i+1`, in document order): shown next
to every chapter in the sidebar and injected onto each chapter's own
`.chapter-tabnum` badge on load (`injectFlatNumbers`). This is what the
print-range box's numbers refer to — necessary because `1.1.1`-style dossier
numbers aren't sequential across topics.

**Expand/collapse discipline** — this is a hard rule, not a style
preference: the `.expanded` class is *only* ever toggled by a direct click on
a node's own header (`makeToggleHandler`). Scroll-tracking
(`wireScrollSpy`, an `IntersectionObserver` over every `section.chapter`)
*only* ever touches `.active` (on the current chapter's link) and
`.has-active` (walked up the ancestor chain, purely for the small collapsed-group
dot indicator). If you're tempted to "auto-expand the active group for
convenience," don't — a user who deliberately collapsed a group must never
have it reopened for them by scrolling.

**Arabic in the sidebar**: `readSubtopicHTML` preserves the kicker's actual
markup (via `outerHTML`/`textContent` per child node) rather than flattening
to plain text, so embedded `<span class="ar">` survives into the sidebar and
picks up the correct font from the same global `.ar`/`[lang="ar"]` rule
everywhere else uses. Fully-Arabic chapter titles get `class="ar" lang="ar"`
added to their sidebar link's title span directly.

## The multi-file build system

```
main.html              spine: front matter, Topic dividers, <!-- INCLUDE:file --> markers
subtopic-X-Y.html       one file per sub-topic: its own divider + all its chapters
philosophy_notes.css    linked, not touched by build.py
philosophy_notes.js     linked, not touched by build.py
build.py                assembles main.html + every INCLUDE target → the file below
philosophy_study_notes.html   BUILD OUTPUT — open/print/upload THIS one
```

Run `python3 build.py` after editing any source file. It does a single
regex substitution pass (`<!-- INCLUDE:(\S+) -->` → that file's contents) and
writes the result — it does not otherwise touch content. If you reference an
include file that doesn't exist yet, it fails loudly rather than silently
omitting content.

**Adding a new sub-topic**: create `subtopic-X-Y.html` (divider + chapters,
same shape as an existing one), add one `<!-- INCLUDE:subtopic-X-Y.html -->`
line in `main.html` in reading-order position. Nothing else needs to change —
not the sidebar (self-builds), not the print system (JS auto-discovers
`section.chapter`) — *except* the two things that are still manual: the CSS
`@page` template pair per chapter (`DESIGN_SYSTEM.md`), and the chapter's TOC
row in `main.html` if you want it linkable before a full rebuild.

## Testing tools available in this sandbox

- **Playwright with headless Chromium is available and works** — this was
  wrongly documented as unavailable for a while (see changelog); it isn't.
  `python3 -c "from playwright.sync_api import sync_playwright; ..."` gives
  real DOM/CSS/JS execution: `page.goto('file://...')`, `page.click()`,
  `page.eval_on_selector(...)` for computed styles and bounding boxes,
  `page.screenshot()`, console/pageerror listeners, and
  `window.__runPagination(filterIds)` can be called directly to test print
  pagination without going through the actual print dialog. Use this to
  verify any change to layout, positioning, the sidebar, or pagination
  before shipping it — don't reason about CSS specificity/cascade in the
  abstract when you can just ask a real browser what it computed. One
  Chrome-computed-styles check (`getComputedStyle`) found a real bug in
  minutes that several rounds of manual CSS review had missed (see
  changelog: the sidebar's stray `margin-top`).
  Expect one harmless console error on `file://` load: the Google Fonts
  `@import` 403s with no network access in this sandbox — not a real bug,
  fonts will load normally wherever the file is actually opened with
  internet access.
- `wkhtmltopdf` is also available for basic sanity checks but does not
  execute the JS pagination engine meaningfully and does not support the
  modern print CSS at all (confirmed empirically: forcing `@media print` and
  re-rendering produced byte-identical output to the unstyled screen
  version) — it's useful only for catching gross HTML/CSS errors, not for
  verifying real print output.

## Changelog

- **JS pagination engine** built to replace CSS Paged Media's
  `target-counter()` (unsupported in any browser) and the `page:` name
  inheritance bug (siblings don't inherit a parent's page name, only
  descendants do — was producing blank running headers on every
  end-block). Measures real content, builds explicit pages.
- **Made re-runnable**: `paginateDocument()` was a one-shot
  (`if(state.transformed) return`); changed to always reset-then-rebuild, to
  support the custom-range print feature running multiple times per session
  with different chapter selections.
- **Custom-range printing added**: `filterIds` param, `.print-exclude` class,
  `window.__printControl` bridge between the pagination closure and the
  sidebar module, `parseRange()` supporting `"8-10,1,15"`-style input against
  each chapter's flat `#N` position.
- **Sidebar built**, self-generating from the live DOM, replacing the
  hand-maintained (and already-stale) `.quicknav` bar and the in-flow `#toc`
  page. Scroll-spy added with a hard rule: highlight-only, never
  auto-expands a user-collapsed group.
- **Flat chapter numbering** (#1–#22) added, surfaced in the sidebar and on
  each chapter's own opening banner.
- **Missing print templates found and fixed**: dossiers 3.1.1–3.1.3 had been
  added (content-wise) without their `@page ch3-1-*`/`rev3-1-*` running-header
  templates — silently falls back to a blank header. Backfilled.
- **Real sidebar gap bug found and fixed with actual browser verification**,
  not another guess: `getComputedStyle` on `#tocSidebar` in headless Chromium
  showed `margin: 14px 0px 0px` despite `top:0` being correctly set — the
  generic `body > * + *{margin-top:14px}` stack-spacing rule (meant for the
  page/chapter content flow) was also catching `#tocSidebar` as body's 2nd
  child, right after `#tocFab`. Fixed with a targeted
  `#tocFab, #tocSidebar{margin-top:0}` override, then re-verified the fix
  with the same computed-style check (`margin: 0px`, `y: 0`) before shipping
  it — not just assumed it worked.
- **Discovered Playwright + headless Chromium is available in this sandbox**
  (see the section above) — corrects the earlier "no live browser available"
  documentation, which was simply wrong. Use it going forward instead of
  reasoning about CSS in the abstract.


## 2026-11-04 — Pagination registration for 3.4.3 and 3.4.4

The added partial Sub-topic 3.4 uses the standard two-tier print templates:
`ch3-4-3` / `rev3-4-3` and `ch3-4-4` / `rev3-4-4`, including the three-way
`body + endnav → ch`, `end-block → rev` CSS assignment. No sidebar registration was added because it dynamically discovers chapters.
A measured **76 px additional packing reserve** is scoped exclusively to
3.4.3 and 3.4.4 in `paginateChapter()`: initial Chromium validation found
some content-page blocks reaching into the footer in these unusually dense
source excerpts. The reserve was checked after re-pagination to keep them
clear of the footer without altering any older chapter's page packing.

Where older paragraphs say 22 chapters or 32 chapters, treat those counts as
historical documentation; the current assembled file has **34** ready dossiers.

## 2026-11-04 — Print verification after educational expansion of 3.4.3 / 3.4.4

Revised main-body callouts, hierarchies and analogies were tested with the existing JS print paginator (no JS/CSS edits). An expanded Key Definitions block in English exceeded a page when treated as one atomic container; it was split into several smaller `.keydefs` containers, preserving individual definitions and the six-part revision structure. A strict page-geometry audit confirmed that all 51 generated chapter pages for the selected two dossiers have at least 37px clearance between content bottom and footer top, with no detected content overflow. The 76px scoped safety reserve remains unchanged. 
