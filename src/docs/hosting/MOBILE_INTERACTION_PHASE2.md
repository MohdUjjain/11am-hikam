# Phase 2 — interaction and mobile accessibility

The current Chapter controls are **screen-only**. The header's chapter-number
button opens a small, localized title/section disclosure (particularly useful
on phones where the long title cannot fit in the fixed 45px reading bar). It
closes on Escape, outside pointer interaction, or chapter transition.

## Notification precedence

The offline updater dispatches `hikam:edition-notice` after changing its notice.
`wireScrollSpy()` keeps the *intent* to offer Resume Reading separate from its
visibility. A new-edition notice has priority; dismissing the edition notice
restores an otherwise eligible resume prompt. Dismissing Resume Reading, taking
a direct hash link, or choosing Continue/Start/Forget clears that intent.

## Modal contents drawer

While the drawer is open, every sibling of the drawer/backdrop is temporarily
`inert`. The original inert values are restored on close, including print. The
existing Escape, backdrop, focus trap, and focus-restoration behaviors remain.
The print engine and its `beforeprint` DOM transformations are **not modified**.

## Horizontal tables

A screen-only measurement finds scroll containers that genuinely overflow.
Both `.tbl-wrap` and the table itself are measured, because tables can scroll
inside a non-scrolling wrapper. Only overflowing nodes are made keyboard-focusable **without replacing the semantic table role**. A concise
screen-only hint describes the horizontal scroll interaction. Both hint and
focusability are removed when the container no longer overflows (e.g. wider
screen). `hikam:revision-visibility` triggers remeasurement.

## Bilingual section numbers

`sectionHeadingParts()` parses authored `<span class="secnum">§V</span>`
separately from the following Arabic/English section title. The sidebar,
progress header and mobile chapter disclosure use isolated numeric and title
nodes separated by ` · `, avoiding concatenation or bidi reordering. Chapter
fragment source text and print headings remain unchanged.

## Regression coverage

Run `python src/tests/verify_mobile_interaction.py` and the existing publication,
structure, sidebar, progress, search and offline tests. Browser smoke tests should
also cover 320, 390 and 1366px; both notice orders; table overflow/focus; drawer
background inert restoration; full-title disclosure; and the print selection.
