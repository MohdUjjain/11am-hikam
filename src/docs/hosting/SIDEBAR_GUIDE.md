# Accessible contents and print controls

Open **Contents & Print** using the floating Contents button. The sidebar is
keyboard-accessible: Tab moves among visible controls, Enter/Space activates
buttons, and Escape or the dimmed backdrop closes the drawer. Focus returns to
the opener unless you followed a chapter/section link. Hidden chapter branches
cannot receive focus.

Use the **Find a chapter or section** field to match a chapter title, number,
section heading, or Arabic title. Search opens relevant branches temporarily;
clearing the search restores the expanded/collapsed structure you chose.
**Expand all** and **Collapse all** affect Topic and Sub-topic groups. A § button
beside each chapter opens links to its numbered content sections. The gold
marker highlights the chapter currently being read without opening any branch.

**Print / Export PDF** is a collapsible panel so the contents remain usable on
small screens. Type selections such as `8-10,1,15` or `5-3`; the live preview
shows the deduplicated chapter order. Unavailable numbers are errors and prevent
Print Selected until corrected. Press Enter in the range field as a shortcut.
Uncheck **Include chapter revision pages** to omit the dark revision end-blocks.
Print Selected generates only selected chapters *in the specified order*, while
Print All preserves the complete book with frontmatter and topic dividers.
Chrome/Edge's browser print dialog should use **Default** margins.

Do not rename the sidebar markup IDs in `src/main.html` or remove `inert`
handling: they are paired with `src/philosophy_notes.js` and checked by
`src/tests/verify_sidebar.py`.

## Reading-position companion

A slim sticky gold rail shows progress through the **entire book**; the separate
circular gauge shows progress through the **current chapter**. Its compact label
uses the current chapter's Arabic or English title. Within numbered content,
the current § link receives `aria-current="location"` even if its branch is
collapsed (without opening that branch). A returning device may offer a local,
optional Resume Reading choice; see [Reading position](READING_POSITION.md).
All reader-position UI is removed for printing and does not alter the print
engine or core chapter content.

## Context-sensitive chapter-end navigation

HTML uses the sidebar as its Contents index, so chapter-end **Back to Contents**
links are not shown in the reading view. **Next Dossier** is a shortcut past
the Revision Block: hiding those blocks also hides the redundant shortcut.
The final dossier's **Previous Dossier** link remains visible. PDF export
independently omits next/skip links when revision pages are excluded, retaining
PDF Contents navigation. Authored chapter links are not removed or modified.


## Index anchor landing with hidden revisions (November 2026)

The screen Contents → Index links are distinct from the PDF-only in-flow contents. A chapter entry must land at that chapter's beginning, and a section entry at the precise section heading. Do **not** center a full `section.chapter` using `scrollIntoView({block:'center'})`: a long chapter is much taller than the viewport, so this navigates into the middle of the chapter and moves unpredictably when the revision block is hidden. The fixed 45px reading header needs at least 53px clearance.

The sidebar prevents the browser's implicit smooth hash navigation, unlocks the modal, writes a shareable history fragment and dispatches the normal navigation event even when the hash is unchanged. The fragment navigator performs one instant, header-offset scroll and focuses the destination without scrolling again. Deep links and browser Back/Forward use the same landing logic; short search-result passages may still be centered. Index navigation must never temporarily reveal a hidden `.end-block` or change the persisted Hide Revision Blocks preference.

Browser coverage lives in `src/tests/browser_quality.py::index_landing_with_hidden_revisions`, with desktop/mobile layouts and both revision visibility settings. It checks chapter starts, exact section heading landings, same-hash repeat clicks, browser Back, and unchanged hidden revision state.
