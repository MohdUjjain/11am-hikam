# Editorial Revision Notes — Dossiers 3.4.3 and 3.4.4

## Scope

This update revises **only** the two previously added dossiers in `subtopic-3-4.html`:

- **3.4.3 — نظرية داروين (جدلية الإلحاد والدين)** (Arabic, RTL)
- **3.4.4 — Introduction + Part One — A Black Box under the Microscope** (English, LTR)

The original 32 dossier content files, cover/TOC spine, build script, CSS, and JavaScript were not edited. The book still has 34 completed dossiers.

## Editorial benchmark

The established 32 dossiers teach through a recurring sequence: complete explanation → memorable concrete analogy → categorized callout or conceptual relationship → checkpoint → self-contained revision toolkit. The two new dossiers now follow this pattern more consistently without imposing mechanical quotas on learning devices.

## Main changes in 3.4.3

- Restored the omitted, source-attributed evolutionary-sequence outline and the more detailed table of named critics/books.
- Added distinct educational devices for disciplinary competence (two desks), explanatory gradualism (ladder), the limits of fossil sampling (film frames), evaluating lists of authorities (scales), and common ancestry (family tree).
- Added structured conceptual levels for science, historical attribution, and theology; explicit distinctions between 'jump' and genetic mutation, macro/micro claims, and religious narratives versus empirical evidence.
- Converted 11 accidental plain-text ASCII table rows into a semantically styled table.
- Rebuilt the six-part revision block with source-linked memory aids, fuller definitions, a more comprehensive revision grid, and all five examination-question categories.

## Main changes in 3.4.4

- Added the family-photo analogy for descent versus mechanism, three-floor factory for DNA/regulation/protein work, bridge inspection to distinguish functional dependence from historical reconstruction, light–messenger–gate for visual signal transduction, rowers–rails–tethers for cilia, and dominoes-with-brake for clotting regulation.
- Added detailed hierarchical pathway maps for gene/molecular organization, phototransduction, clotting, and the source's historical milestones (1859, 1940s, 1950s, 1994, 1996, 2007, 2019).
- Differentiated the source's proposed irreducible-complexity criterion from stronger claims of historical impossibility; restored an explanatory table of biological mechanisms and population-level factors.
- Cleaned up ASCII diagram remnants, expanded definitions and practical recall questions, and added the omitted conceptual examination category.
- Grouped the enlarged definitions list into pagination-safe clusters.

## Source handling

The two `source_materials/*.txt` extracts are preserved unchanged. Claims about biology, scientists' beliefs, historical quotations, numerical mutation rates, fossil interpretation, and intelligent design are presented as claims or arguments made in the supplied extracts unless independently verified (which was **not** part of this editing task). Source claims and critical distinctions are deliberately kept distinct. This is an editorial and learning-design revision, not an independent source-verification report.

## Build and QA

- `python3 build.py` successfully rebuilt `philosophy_study_notes.html`.
- Confirmed 34 chapter IDs, no duplicate IDs, working anchor targets, six end-block headings per revised chapter, and five categories of examination questions.
- All five prior sub-topic fragments and `main.html`, CSS, JS, and `build.py` are byte-identical to the supplied 34-dossier version.
- Chromium screen check: both chapter banners, 34 sidebar chapter links, Arabic RTL and Arabic font inheritance checked.
- Chromium selected-chapter pagination: **51 generated chapter pages** across these two longer dossiers, with the pre-existing front matter in the print-preview export. The strict geometry audit found no detected content/footer collisions; the minimum measured gap from body content to the footer was 37 px in the selected-chapter rendering.
- An additional QA-only PDF was rendered and visually sampled; it is intentionally not included in the deliverable as it is not a full-book PDF.
