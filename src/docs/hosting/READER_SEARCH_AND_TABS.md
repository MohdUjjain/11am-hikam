# Reading bar search, sidebar tabs and mobile behavior

The fixed navy reading bar contains the existing **whole-book progress rail** and **chapter progress circle**, plus a compact **Search notes** field and a **Continue reading** shortcut when a valid local bookmark exists. It stays visible on downward scrolling; all reading controls are excluded from printing.

## Search the entire book

Search examines the actual text of all 34 dossier chapters: chapter titles and numbers, sections, body paragraphs, Arabic text, lists, tables, definitions, quotes, comparison cells, memory aids and revision sections. It is **not restricted to sidebar titles**. Multiple query terms must appear in one indexed text unit; results show chapter context and a relevant excerpt. At most 45 results are shown at a time (with a total count).

Search normalizes letter case and Arabic vowel marks. Keyboard: **Down** to enter results; **Up/Down** between results; **Enter** to open the first result; **Escape** to dismiss. Selecting a result scrolls directly to the original note block and doesn't modify the authored HTML. This is an in-page search, not a server-side search, and requires no network once the book is cached.

## Sidebar layout

The drawer is organized into two accessible tabs:

- **Index:** Topic → Sub-topic → Chapter → § Section hierarchy and expand/collapse controls. Searching no longer filters or expands this tree.
- **Tools:** Resume Reading button (if available), print/export range controls, revision-page toggle, Print All, and offline-storage controls.

Tabs support Click, **Left/Right arrow**, **Home/End**, Enter and Space. Hidden panels are inert, so their controls aren't reachable with Tab. The pre-existing drawer focus trap, Escape/backdrop closing and keyboard navigation remain intact.

## Small screens and saved reading place

The top bar is fixed (rather than sticky) to avoid browser-specific collapsing behavior, and the book has a matching screen-only top offset. On phones the current chapter number remains legible beside a compact search field; the full chapter title and section remain available in the Index and desktop bar.

The Resume Reading prompt is a bounded, nonmodal dialog-like panel: it wraps long Arabic and English text, stays within the visual viewport, and scrolls internally if necessary. It cannot force the document to become horizontally scrollable. Wide comparison tables are independently scrollable on phones, while print table formatting is unchanged.

The header and Tools tab both offer **Continue reading** when a valid local bookmark exists. The same existing scroll tracker owns chapter/section highlighting, saved position and both progress indicators; search doesn't create another competing reading-location tracker.

## Publishing

When editing the markup (`src/main.html`), styles (`src/philosophy_notes.css`) or reader logic (`src/philosophy_notes.js`), run `python src/build.py`, `python src/build.py --check`, `python src/tests/verify_reader_search_tabs.py` and existing repository tests. Commit `index.html` and `service-worker.js` with the source change so the offline edition is updated atomically.
