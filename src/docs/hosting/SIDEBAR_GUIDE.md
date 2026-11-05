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
