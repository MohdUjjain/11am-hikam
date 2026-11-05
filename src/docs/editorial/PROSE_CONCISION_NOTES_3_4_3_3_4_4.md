# Prose Concision Pass — Dossiers 3.4.3 and 3.4.4

## Scope and editorial rule

This pass **only** trims or removes redundant direct-child explanatory `<p>` paragraphs inside the `.chapter-body` of:

- **3.4.3 — نظرية داروين (جدلية الإلحاد والدين)**
- **3.4.4 — Introduction + Part One — A Black Box under the Microscope**

The editing approach follows the original 32 dossiers: a concise explanatory sentence establishes the necessary claim, while the nearby teaching component carries the detailed visual, comparative, or recall-oriented explanation. Shorter prose is not intended to remove evidence or the reasoning needed to follow the source's arguments.

### Reduction measured directly in the chapter source

| Measure | 3.4.3 original revised version | 3.4.3 after | 3.4.4 original revised version | 3.4.4 after |
|---|---:|---:|---:|---:|
| Direct-body paragraphs | 25 | 20 | 35 | 24 |
| Characters in direct-body paragraphs | 3,965 | 2,028 | 8,841 | 3,726 |
| Words in direct-body paragraphs | 656 | 329 | 1,220 | 525 |
| Paragraph-character reduction | — | **48.9%** | — | **57.9%** |

These are **prose-only** reductions, not reductions in the total content of the chapters. The educational components and revision materials remain unchanged.

## What was changed

- Removed lead-in sentences that only announced the list, diagram or quotation immediately following.
- Converted circuitous prose into one or two direct statements with the same underlying distinctions.
- Reduced repetition of arguments already developed in adjacent tables, diagrams, analogies and callouts.
- Kept key names, numerical figures, source-attribution and the explicit distinction between source claims and observed facts.
- Retained the named authors, key definitions, source quotations, original source extracts and the substantive arguments.

## Explicitly not changed

- All callout boxes (definition, concept, high-yield, mistake, tip), checkpoints, memory-aid analogies, attributed quote blocks, tables, hierarchy diagrams, concept-relationship maps, section objectives, chapter roadmaps, chapter front matter and end-of-chapter revision blocks.
- All plain bullet and numbered lists, headings and section numbering.
- All 32 previously completed dossiers.
- `main.html`, `philosophy_notes.css`, `philosophy_notes.js`, `build.py`, `DESIGN_SYSTEM.md` and `PAGINATION_SYSTEM.md`.
- Both `source_materials/*.txt` original supplied study extracts.

Only `subtopic-3-4.html` changed among the editable source documents. `philosophy_study_notes.html` was regenerated from the modular source.

## Verification

- The `.box`, `.analogy`, `.tbl-wrap`, `.golden-quote`, `.checkpoint`, `.hierarchy`, `.concept-rel`, `.section-objective`, `.in-this-chapter`, chapter frontmatter, and revision-block DOM subtrees were compared before/after and found identical.
- All plain lists and all section headings in both chapters were also confirmed unchanged.
- 34 chapters are present with unique IDs and all internal anchors resolving.
- Browser checks confirmed English LTR and Arabic RTL/Amiri inheritance, with no detected page-script errors.
- Selected-chapter Chromium print pagination generated **49 pages** without detected content–footer collisions under the strict geometric check.
