# Design System — Philosophy Revision Dossier

> **Repository paths (November 2026):** The authoritative stylesheet is `src/philosophy_notes.css`, the book spine is `src/main.html`, the chapter fragments are in `src/chapters/`, and the builder is `src/build.py`. Historic changelog references below retain the filenames used at the time.


Reference doc for `philosophy_notes.css` and the visual/content conventions of
the book. Read this before making styling changes or writing a new chapter.
For how the book actually gets *paginated and printed*, see `PAGINATION_SYSTEM.md`
instead — this file is about what things look like, not how printing works.

## Philosophy

Parchment / navy ink / gold academic dossier. Distinctive on purpose — not a
generic template. Two rules that protect that:

- **Structure over decoration.** Every visual device (box, hierarchy, badge)
  exists to carry information, not to look nice. If you're adding a visual
  element that doesn't map to a real content distinction, don't.
- **Chapters get their own accent hue; the semantic system never does.**
  The six box types (below) are colour-coded and that coding is fixed across
  the whole book. A `.box.definition` is the same blue in chapter 1.1.1 and
  in chapter 3.1.3. Only *structural chrome* (banner, tab, table headers,
  quote rule, hierarchy dots) uses the chapter's rotating `--hue`.

## Palette

| Token | Value | Use |
|---|---|---|
| `--ink` | `#1C2740` | primary text, dark surfaces (banners, end-block, sidebar) |
| `--ink-soft` / `--ink-faint` | `#3C4A68` / `#6B7590` | secondary text |
| `--gold` / `--gold-deep` / `--gold-pale` | `#A87C1F` / `#7C5A12` / `#F1E1AE` | accents, links-on-dark, the one warm colour in an otherwise cool book |
| `--parchment` / `--parchment-deep` | `#F7F1E3` / `#EFE3C8` | page background |
| `--white-card` | `#FCF9F0` | slightly-lifted card background on parchment |
| `--paper-line` / `--paper-line-soft` | `#D9CAA2` / `#E6DAB9` | hairline dividers |
| body background | `#DCD3BC` | the darker backdrop pages/chapters now float against (see Elevation, below) |

**Six fixed semantic colours** (never reassigned per-chapter):

| Box type | Icon | Colour | Meaning |
|---|---|---|---|
| `.box.definition` | D (🟦) | `#1F4173` blue | formal term meaning — learn verbatim |
| `.box.concept` | C (🟩) | `#256B45` green | idea central enough the chapter needs it |
| `.box.tip` | ! (🟨) | `#96540E` amber | how examiners phrase/reward this |
| `.box.mistake` | ✕ (🟥) | `#8C2E2E` red | a confusion students routinely make |
| `.box.memory` | ♥ (🟪) | `#5A3A78` purple | mnemonic / analogy / ELI10 |
| `.box.highyield` | ★ (gold) | `#7E5C0C` | disproportionately exam-likely |

Each has a `-bg` (tint) and `-bd` (border) variant, e.g. `--c-def-bg`, `--c-def-bd`.

## Typography

| Token | Stack | Use |
|---|---|---|
| `--font-display` | Fraunces | h1/h2, chapter titles, big display numerals |
| `--font-body` | Source Serif 4 | running prose, golden-quotes |
| `--font-sans` | IBM Plex Sans | UI chrome: kickers, labels, buttons, sidebar |
| `--font-mono` | IBM Plex Mono | page numbers, dossier numbers, sidebar `#N` |
| `--font-arabic` | Amiri | Arabic display text (titles, headings) |
| `--font-arabic-sans` | Noto Sans Arabic | (available, currently unused — Amiri covers both display and inline Arabic throughout for consistency) |

Any element with `class="ar"` or `lang="ar"` automatically gets
`font-family:var(--font-arabic); direction:rtl; unicode-bidi:isolate;` from one
global rule — you never need to hand-set Arabic font/direction elsewhere,
just apply the class/attribute.

## Elevation system (added in the "SaaS" pass)

Radius and shadow are tokens, applied consistently rather than per-element
guesses:

```
--radius-sm: 10px   small chips: section-objective, rel-node, memlist items, sidebar rows
--radius-md: 16px   content boxes: .box, .analogy, tables, hierarchy/checkpoint/concept-rel, golden-quote, revision-sheet
--radius-lg: 24px   (reserved — not currently used, headroom for a future component)
--radius-xl: 32px   the two "sheet" containers: .page and .chapter

--shadow-card  the big page/chapter float — layered, navy-tinted, not flat black
--shadow-soft  subtle lift for nested cards (cover-part-card, tables)
--shadow-pop   hover state — buttons, cards, the sidebar itself
--shadow-inset  (available, currently unused)
```

Pills that were already maximally rounded (`toc-back`, `endnav-btn`, `secnum`,
`rel-badge`, `tt-num`) keep their literal `20px`/`30px` values rather than
being forced onto the token scale — they're already at "as round as a
rectangle-with-text can get," the tokens exist for elements that had *flat*
corners before.

**Circles stay circles** — seals, dots, the FAB, box icons all use
`border-radius:50%` and are untouched by any of this.

⚠️ **This entire elevation system is screen-only.** Every radius/shadow/hover
transform gets forced back to flat under `@media print` (see the "SaaS-elevation
reset" block near the top of the print media query). Do not remove that reset —
the paged-media system was tuned for edge-to-edge "bleed" pages with zero
visual embellishment, and a shadow around a full-bleed page contradicts that
design. If you add a *new* shadowed/rounded element, add it to that reset list
too, or it may show an unwanted edge in the exported PDF.

## Structural component glossary

| Component | Class | Use |
|---|---|---|
| Chapter roadmap | `.in-this-chapter` | "In This Chapter" numbered preview, before any `§` |
| Central idea | `.box.concept` (labelled "Central Thesis") | always the first box in a chapter body |
| Notable quote | `.golden-quote` | verbatim quote with `<cite>`, used sparingly, spread through the chapter not clustered |
| Section framing | `.section-objective` | "This section answers: …" — one per `§`, right after the heading |
| Nested/ranked ideas | `.hierarchy` with `.h-node.l1`–`.l5` | use `l1` flat for *parallel* concepts (e.g. four causes), increasing levels for genuine *depth* |
| Recall pause-point | `.checkpoint` | roughly 60–70% through a chapter, recaps what's covered so far |
| Cross-section links | `.concept-rel` | badges: `leads` / `contra` / `support` / `example` — explicit connections between claims in different `§`s |
| Quick analogy | `.analogy` | ELI10-style, one emoji icon, used only where a natural analogy exists — never forced |
| End-of-chapter | `.end-block` | always exactly: Chapter Summary → One-Page Revision Sheet → Key Definitions → Key Table → Memory Aids Collected → Possible Examination Questions |
| Exam questions | `.examq` | always exactly 5 categories, same order: Short Answer, Long Answer, Comparison, Conceptual, Application |
| Table title | `<caption>` inside `.tbl-wrap` | centered, hue-tinted background matching that chapter's `th` row, bottom border — a card header, not a floating label. Same in English and Arabic (`text-align:center` is direction-agnostic, no RTL override needed) |

## Numbering & content conventions

`Topic` (1 digit) → `Sub-topic` (N.N) → `Chapter`/"Dossier" (N.N.N). One
`.part-divider` page per Topic *and* per Sub-topic (except Topic 1, whose
single sub-topic 1.1 is folded into the Topic-level divider rather than
getting its own — a historical quirk, not a pattern to copy for future
topics with more than one sub-topic).

Current inventory (see the sidebar in the live document for the
authoritative, always-current version — this list rots):

- **Topic 1** — Sub-topic 1.1, chapters 1.1.1–1.1.5 (English)
- **Topic 2** — Sub-topic 2.1 (2.1.1–2.1.8, English + 2 Arabic), Sub-topic 2.2
  (2.2.1–2.2.6, Arabic + 2 English)
- **Topic 3** — Sub-topic 3.1 complete (3.1.1–3.1.5, three English + two Arabic),
  Sub-topic 3.2 complete (3.2.1–3.2.8, six Arabic + two English),
  Sub-topics 3.3–3.8 not started

**Chapter hue**: `--hue` steps +20° from the *immediately preceding chapter in
the whole book*, not per-topic or per-subtopic, wrapping at 360. Chapter 1
(`ch1-1-1`) is 208°; the sequence completes a full circle exactly every 18
chapters, so chapters 18 apart share a hue by construction (e.g. `ch1-1-1`
and `ch2-2-6` are both 208°) — this is expected, not a bug.

**RTL / Arabic chapters**: add `class="chapter rtl"` and `lang="ar"` to the
`<section>`. Keep the `.chapter-stamp` tagline in English (cross-book
scannability) but everything else — title, body, boxes, end-block — in
Arabic. Inline Arabic inside an otherwise-English element (e.g. a kicker like
"2.2 · <span class="ar" lang="ar">الميتافيزيقا</span> · Metaphysics") just
needs the `.ar`/`lang="ar"` span; font and direction follow automatically.

**Inline `§` section references inside Arabic prose need `<bdi>` around
them** — e.g. `(<bdi>§I</bdi>)`, or `<bdi>§I–§IV</bdi>` for a range. Without
it, the Unicode bidi algorithm can visually reorder the reference's own
characters (renders as "I§" instead of "§I") wherever it sits inside
surrounding RTL text. This applies to inline references embedded mid-sentence
in prose, `.cr-title`, and `.rel-node` text.

**The `.secnum` badge (the `§I` chip at the start of every `h2.sec`
heading) has the identical bug and is fixed in the CSS, not per-instance.**
This was wrongly believed to be exempt for a while — it isn't; it was just
easy to misread at small badge size. It affects *every* `h2.sec` in *every*
Arabic chapter in the book, old and new alike, not just newly-written ones.
Fixed once, centrally: `h2.sec .secnum{ unicode-bidi:isolate; direction:ltr;
}`. Note both properties are required — `unicode-bidi:isolate` alone isolates
the content from the surrounding bidi context but does **not** itself pick a
direction; the badge still inherits `direction:rtl` from its Arabic ancestor
unless `direction:ltr` is also set explicitly. (This is also why HTML's
native `<bdi>` element works without an explicit `direction` — per the HTML
spec `<bdi>` carries an *additional*, separate "auto-detect from content"
directionality heuristic that plain `unicode-bidi:isolate` on a `<span>`
does not replicate on its own.) Verified with `getComputedStyle` plus a
character-by-character bounding-box check in headless Chromium, not just a
screenshot — see `PAGINATION_SYSTEM.md` for how to run that check again if
a similar bug is suspected elsewhere.

**Font-family is the bug to check first, before ordering/alignment** — a
user report of Arabic text "looking broken" turned out to mean this, not
the bidi-ordering issue above, and it was the more serious of the two. The
book's font cascade is: `.rtl{font-family:var(--font-arabic)}` (Amiri) sets
the default for a whole chapter by inheritance, then one shared exceptions
list (search the CSS for `.rtl .chapter-kicker, .rtl .box-label...`)
re-targets specific UI-chrome components (badges, table headers, labels) to
`var(--font-arabic-sans)` (Noto Sans Arabic) instead, because a small
uppercase letter-spaced label reads better in a sans face than Amiri's more
calligraphic serif. **Any component with its own explicit `font-family`
declaration outside that exceptions list silently falls back to whatever
non-Arabic font it names** (usually `var(--font-sans)`, IBM Plex Sans, which
has no real Arabic glyph support) — because a rule that *directly* targets
an element always beats a value the element only *inherited* from an
ancestor, regardless of the `.rtl` ancestor's own specificity. This is a
CSS-cascade trap, not a typo, and it silently affects any newly-added
component that copies an existing English-only rule's `font-family` without
also adding a matching `.rtl` line to the exceptions list. Four components
were found missing (`table.comparison th`, `.memlist li b`,
`.golden-quote cite`, `.rel-row` — the last one meant `.rel-node`, which
holds real Arabic sentences, was inheriting the wrong font every single
place a concept-relationship map appeared in any Arabic chapter) plus the
table `<caption>` after it was redesigned and lost its inherited font along
the way. All four+one are now in the shared exceptions list.

**How to check this for real, not by eye**: a targeted selector-by-selector
check is not enough — it only catches what you thought to test, and this bug
was found on the *second* pass, not the first. Run this in headless
Chromium after any CSS change that touches an Arabic-chapter component: walk
every element under `.rtl`, keep the ones whose own direct text node
contains an Arabic Unicode codepoint (`\u0600`–`\u06FF` etc.), and flag any
where `getComputedStyle(el).fontFamily` doesn't contain "Amiri" or
"Arabic". Zero hits is the bar — not "the ones I checked passed."

Before writing a new Arabic chapter, check an existing working one's markup
for these patterns rather than re-deriving them.

**`.chapter-stamp` taglines run 3–6 words across the whole book** (checked
against all 24: shortest 2, longest was a one-off 7 that got trimmed back).
The circular badge is sized for that range — a longer one wraps to 4 lines
and looks visibly cramped next to every other chapter's clean 2–3 line
badge. Keep new ones inside that range rather than rediscovering the ceiling
by screenshot.

**Adding a new chapter**: copy an existing `<section class="chapter">` whole,
update id/hue/tabnum/stamp/title/source, add its TOC row. See
`PAGINATION_SYSTEM.md` for the *print*-side steps (page-name templates) —
those are easy to forget and fail silently (blank running header) if skipped.

## Known debt / things worth revisiting

- `--radius-lg` (24px) and `--shadow-inset` are defined but unused — either a
  future component uses them or they can be dropped.
- `--font-arabic-sans` is defined but everything currently routes through
  `--font-arabic` (Amiri) instead, including small UI text in the sidebar.
  Worth a look if Amiri ever reads as too calligraphic at small sizes.
- The `@page revN` print-template count has run one ahead of the actual
  chapter count for a while (23 templates vs 22 chapters as of Topic 3) —
  there's a small orphaned template somewhere in the legacy print system.
  Harmless, but worth tracking down during a future cleanup pass.

## Changelog

- **CSS split off into `philosophy_notes.css`**, linked via `<link>` instead
  of an inline `<style>` block, to cut editing-session token cost.
- **JS split off into `philosophy_notes.js`** the same way.
- **Topic 3 added**: Sub-topic 3.1, dossiers 3.1.1–3.1.3, in the established
  house style (Central Thesis, six-box system, concept-rel, five-category
  exam questions), cross-referenced against the origin prompts. Fixed three
  separate stale "Four dossiers" references to Sub-topic 2.2 (actually six)
  found while doing this.
- **Sidebar navigation added**, replacing the old hand-maintained `.quicknav`
  bar and the in-flow `#toc` page. Self-builds from the live DOM (topic
  dividers + chapter kicker text) — extending the book requires no sidebar
  maintenance. `#howto` removed entirely; its one genuinely load-bearing tip
  (export via Chrome/Edge, Margins on Default) now lives as a hint in the
  sidebar's print panel instead.
- **Arabic preserved through the sidebar**: chapter/kicker Arabic spans are
  carried into the sidebar as real markup (not flattened to text), so the
  existing global `.ar`/`[lang="ar"]` rule applies there too.
- **Flat chapter numbering (#1–#22)** added, shown in the sidebar and on each
  chapter's own opening page next to its "DOSSIER x.x.x" tab — used by the
  custom-range print feature (see `PAGINATION_SYSTEM.md`).
- **Cover-page cards corrected**: Topic 3's card no longer claims "eight
  forthcoming sub-topics" (3.1 has started) and lost its dashed "not yet"
  border styling.
- **Hue sequence verified** end-to-end against the live build after a
  correctness question — confirmed continuous, no discontinuity at any
  topic boundary, full color wheel repeats every 18 chapters by design.
- **SaaS elevation pass**: radius/shadow token system introduced, applied to
  every previously-flat-cornered element. Went through two design
  iterations on how `.chapter` achieves its rounded look — see the next
  two entries.
- **Print corners, round 1**: shipped with everything (including page-level
  containers) flattened to square in print, out of caution. Also caught and
  fixed a real risk before shipping: `.chapter`'s new `overflow:hidden`
  would have clipped JS-generated print pages, since they insert as direct
  children of `.chapter` — worked around at the time with an explicit
  `overflow:visible !important` reset in print.
- **Print corners, round 2 (current)**: per feedback that flattening
  *everything* in print was overcorrecting — content islands (boxes,
  tables, cards) are supposed to show rounded corners in the exported PDF
  too, same as on screen. Redesigned `.chapter` to not need
  `overflow:hidden` at all, on screen or in print — `.chapter-banner` and
  `.end-block` round their own top/bottom corners directly instead, each
  self-clipping their own background with no overflow property anywhere.
  That removed the content-loss risk at the source rather than resetting
  around it. The print reset is now split in two: physical page-boundary
  elements (`.page`, `.chapter`, `.chapter-banner`, `.end-block`,
  `.js-print-page` — these fill an actual sheet edge-to-edge, so a rounded
  corner just exposes whatever's behind the cut) stay square; content
  islands living *within* a page's margins keep their radius in print.
- **Two print-system gaps found and fixed** while doing the above: dossiers
  3.1.1–3.1.3 were missing their `@page ch3-1-*`/`rev3-1-*` running-header
  templates entirely (silently falls back to a blank header) — added. The
  top-of-file build-instructions comment still referenced the deleted
  `.quicknav` bar and a months-stale chapter inventory — updated.
- **Topic vs. Sub-topic dividers differentiated**: Topic-level part-dividers
  keep the plain deep-navy gradient; Sub-topic dividers now work a warm
  gold undertone into the same navy base (`.part-divider[id^="s"]`), so
  the two levels are distinguishable by color, not only by kicker text.
- **Sub-topic 3.1 given its Arabic title** (الفلسفة والدين), matching every
  other sub-topic divider — it had been missing since 3.1 was first written.
- **Sidebar keyboard support added**: Escape closes and returns focus to the
  toggle button; opening moves focus into the panel; Tab/Shift+Tab are
  trapped inside the sidebar while open; every expand/collapse button
  carries a live `aria-expanded`.
- **Fixed a double close-button bug**: the sidebar toggle turned into an "✕"
  when open *and* the panel has its own dedicated close button — two
  overlapping close affordances. The toggle button now hides itself
  entirely while the panel is open instead.
- Added an explicit `html{margin:0;padding:0}` after a reported (but not
  reproduced — no conflicting rule, transformed ancestor, or duplicate
  element found in the CSS itself) gap above the sidebar in Chrome. Flag
  this again with a screenshot if it persists — it needs live reproduction
  to actually diagnose, not another guess.
- **Sub-topic 3.1 completed**: dossiers 3.1.4 and 3.1.5 written (Arabic,
  full RTL treatment), closing out the sub-topic at five dossiers. Every
  place that referenced "3.1: three dossiers" turned out to mean updating
  four separate locations, not one — the s3-1 divider, the t3 topic
  divider's sub-topic list, the cover-page card, and the colophon's total
  count — worth remembering next time a sub-topic completes.
- **The `.secnum` bidi bug turned out to be book-wide, not new-content-only**
  — a screenshot of an *established* chapter (2.2.4) showed the same "I§"
  reversal as the new ones. Root-caused and fixed centrally in the CSS
  rather than patching individual chapters (see the RTL section above for
  the full explanation of why `unicode-bidi:isolate` alone wasn't enough).
  Verified with a real bounding-box check in headless Chromium across both
  an old and a new chapter before trusting it fixed.
- **3.1.4's chapter-stamp trimmed** from 7 words to 4 after comparing tagline
  lengths across all 24 chapters found it was a genuine outlier (established
  range: 2–6 words) — this, not a hidden CSS difference, was what made its
  banner look inconsistent with other Arabic dossiers. Documented the range
  above so it's checked before writing rather than caught after.
- **Table captions redesigned**, English and Arabic both: centered instead
  of hardcoded `text-align:left` (which left Arabic captions visibly
  misaligned), with a hue-tinted background and bottom border matching the
  `th` row instead of a plain floating label — reads as a card header now,
  consistent with the rest of the elevation system.
- **Font-family, not ordering, was the real complaint** — after the bidi
  fixes above, a follow-up report ("Arabic font style keeps breaking
  everywhere") pointed at a different, bigger bug: components with their
  own explicit `font-family` outside the `.rtl` exceptions list silently
  fall back to a non-Arabic font, because a direct rule always beats an
  inherited one regardless of the `.rtl` ancestor's specificity. An
  exhaustive scan (every Arabic-text element under `.rtl`, computed
  font-family checked programmatically, not sampled) found five real
  instances — `table.comparison th`, `.memlist li b`, `.golden-quote cite`,
  `.rel-row` (meaning every `.rel-node`, i.e. every concept-relationship
  map in every Arabic chapter), and the table `<caption>` after its
  redesign. All fixed; the exhaustive-scan method is now documented above
  so the next suspected instance gets checked the same way, not sampled.
- **Sub-topic 3.2 started**: dossiers 3.2.1 (the argument from innate
  disposition / fitrah) and 3.2.2 (the moral argument) written, Arabic,
  full RTL treatment. Ran the exhaustive font-family scan and the secnum
  bidi check from the entries above against the finished chapters *before*
  shipping, not after a report — both came back clean on the first pass,
  which is the actual point of writing those checks down.
- **Dossier 3.2.3 added** (the fine-tuning argument — cosmic constants,
  Dembski's universal probability bound, Penrose's number, the four
  pillars of physical/chemical tuning), continuing the same rigor: the
  chapter arrived pre-written (from source content plus this doc's own
  Arabic-chapter conventions) already using `<bdi>` correctly around every
  inline `§` reference and the right font stack throughout — re-verified
  with the exhaustive scans rather than assumed correct because it looked
  right. Hue continues cleanly (328→348→8, wrapping past 360 as expected).
  Sandbox state was lost between sessions here (a fresh container with no
  memory of `/home/claude`); the working tree was rebuilt from the last
  shipped `outputs/` zip plus the person's own re-upload of the in-progress
  file, which is why re-verifying from scratch mattered more than usual —
  nothing about that recovery step should be assumed correct without
  re-running the checks, and it wasn't.
- **Dossiers 3.2.4 and 3.2.5 added**: the classical argument from creation
  (*kalam* — Ibn Rushd's two-tier distinction, Ibn Hazm's three-way proof
  against an uncaused/self-caused origin, the train-carriages analogy
  against infinite regress, then Big Bang redshift/CMB and the second law
  of thermodynamics as independent scientific corroboration) and an
  anatomy of New Atheism as a modern phenomenon (the five-way belief-stance
  taxonomy, the post-9/11 "militant atheism" turn and its four horsemen,
  a three-dimensional causal analysis of youth deconversion, and Pascal's
  Wager). Sub-topic 3.2 is now five dossiers deep. Both chapters were
  written directly against this document's own conventions (box vocabulary,
  `<bdi>`-wrapped section references, hue rotation) rather than adapted
  from an existing chapter, and both passed the exhaustive font/bidi scans
  and print-pagination check on the first run — the documented conventions
  did their job. One naming note for future sessions: dossier 3.2.5 and
  the still-forthcoming Sub-topic 3.3 are both titled "New Atheism" in the
  source material; they're not a duplicate — 3.2.5 is a sociological/
  psychological anatomy of the movement, while 3.3 is planned as book-by-book
  replies to specific atheist authors. Don't "fix" this apparent collision
  without checking the TOC's own sub-topic 3.3 breakdown first.
- **Sub-topic 3.2 completed**: dossiers 3.2.6 (a recall guide answering
  three objections — "no sufficient evidence," Hawking's "something from
  nothing," and the problem of evil, via a "bright vs. obscure" priority
  rule), 3.2.7 (a second, more systematic objections chapter — burden of
  proof, the argument from order dismantling "nature as the orderer," and
  the temporal/essential distinction in the argument from origination),
  and 3.2.8 (English — Karen Armstrong's *The Case for God*: mythos vs.
  logos, religion as a practiced "knack" rather than an accepted belief,
  and fundamentalism/atheism as twin, mirror-image reactions to the same
  17th-century rupture). This closes out the sub-topic at eight dossiers.
  Two things worth flagging for future sessions:
  - **3.2.8 is deliberately LTR English** inside an otherwise all-Arabic
    run of six chapters (3.2.1–3.2.6 Arabic, 3.2.7 Arabic, 3.2.8 English)
    — matching the TOC, which already listed it in English before any of
    this sub-topic was written. Verified with getComputedStyle that it
    renders `direction:ltr` and carries no stray `.rtl` class, and
    confirmed visually that the banner correctly mirrors (tabnum strip
    moves to the left edge) rather than just failing to apply the RTL
    rules. Don't assume every dossier in an Arabic-heavy sub-topic should
    be Arabic — check the TOC's own language for that entry first.
  - **A real bug this round, not just a check that passed**: the `s3-2`
    divider I'd edited across three separate turns had accumulated a
    genuine extra `</div>` (from a stale line surviving one of the earlier
    edits), caught only by the per-file div-balance script, not by eye —
    the previous edit's `str_replace` had left the file *individually*
    unbalanced while the full-book diff still looked plausible at a
    glance. Worth remembering: run the balance check on every touched
    source file individually, not just the assembled output, since a
    multi-file build can mask which fragment actually broke.
  Completing "3.2 done, 5 more sub-topics to go" touched five separate
  locations again (TOC, `s3-2` divider, `t3` divider's pd-list, the
  cover-page card, the colophon count) — same pattern flagged when 3.1
  completed; it is evidently not a one-off.


## 2026-11-04 — Sub-topic 3.4 partial integration (dossiers 3.4.3–3.4.4)

- Added `subtopic-3-4.html` with its own divider and **two completed dossiers**;
  3.4.1–3.4.2 and 3.4.5–3.4.9 remain explicitly forthcoming.
- Dossier **3.4.3** is Arabic RTL (`lang="ar"`, `.rtl`) and follows the supplied
  *جدلية الإلحاد والدين* study extract; **3.4.4** is English LTR and follows the
  supplied biochemical black-box / irreducible-complexity study extract.
- Continued the completed-chapter hue series from 3.2.8 (108°) to **128°**
  for 3.4.3 and **148°** for 3.4.4 (not a hue based on missing planned chapters).
- Both chapters contain a thesis, roadmap, section objectives, source-preserving
  substantive discussion, semantic tables/diagrams, conclusion, and a full
  six-part revision block.
- Source attribution is explicit: contested biological, historical and numeric
  claims are presented as positions in the supplied extracts, not independently
  verified scientific conclusions. Do not silently strengthen their certainty.
- Replaced the two 3.4 table-of-contents placeholders with linked rows; updated
  Topic 3 and cover prose, colophon to **34 ready dossiers / 6 started sub-topics**,
  and 3.2.8's no-longer-final next-chapter navigation.
- Added matching `@page ch3-4-*`, `@page rev3-4-*`, and selector assignments in
  the print CSS; the sidebar still auto-discovers chapters, while the JS
  paginator received a measured, chapter-scoped packing reserve to prevent
  footer collisions in these two dense new excerpts. Re-run `build.py` after further source changes.
- The exact two uploaded study extracts are archived under `source_materials/`
  for traceability; they are not loaded by `build.py` or by the browser.


## 2026-11-04 — Pedagogical reconstruction of dossiers 3.4.3 and 3.4.4

- Benchmarked the original 32 dossiers, especially the explanatory → analogy → relationship → retrieval cycle.
- Revised only the content fragment `subtopic-3-4.html`; the 32 established chapter fragments and existing CSS/JS behavior remain untouched.
- Added explicit definitions, conceptual warning/high-yield boxes, embedded analogies, hierarchy maps, formative checkpoints, and a restored chronological/source data pathway.
- Replaced accidental ASCII-diagram/table debris with native responsive house components and reinstated the omitted scholar details and an attributed evolutionary-sequence outline.
- Rebuilt both end-blocks so memory aids are collected from explanations actually introduced in the body; returned the examination questions to all five house categories, including Conceptual.
- Preserved the two supplied study extracts under `source_materials/`; disputed scientific/history claims remain attributed to the source, not independently verified.
- Preserve all established colors, print layout tokens, chapter IDs and subtopic numbering.

## 2026-11-04 — Editorial voice: write the notes as the explanation

In the main body of a dossier, use **direct explanatory prose**, not a
third-person running commentary on the supplied extract. The reader already
knows these are notes from the assigned material. Prefer “The modern synthesis
combined selection with Mendelian genetics” to “The extract explains that the
modern synthesis combined …”; likewise prefer “تُبحث آليات التطور في علم الأحياء”
to “يردّ المصدر بأن آليات التطور …”.

Keep **essential provenance** where accuracy requires it: identify named
speakers before attributed quotations, distinguish an author's particular
objection from an observed fact when that distinction matters, and retain
source labels/academic references. Do not replace sustained explanation with
repeated “according to the text” caveats. Preserve the existing teaching
components and their internal text unless specifically asked to revise them.

The 2026-11-04 direct-voice pass applied this rule only to the standalone
explanatory paragraphs of dossiers 3.4.3 and 3.4.4: **17 Arabic paragraphs and
15 English paragraphs** were rephrased. All earlier dossiers, the new chapters'
teaching tools, lists, quotations, headings and revision sections were left
unchanged; CSS and JS were not edited.
