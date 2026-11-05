# Hikam — source code and editorial workspace

`src/main.html` and `src/chapters/subtopic-*.html` are the canonical book source. Build the website with `python src/build.py` **from the repository root**. No build framework or package installation is required.

## Authoring sequence

1. Edit or add a `src/chapters/subtopic-*.html` fragment.
2. Update `src/main.html`: TOC links/placeholders, sub-topic divider, Topic divider, cover description, and chapter count. Keep the user-established 3.2.5 vs. 3.3 distinction.
3. Extend `src/philosophy_notes.css` only as needed for new print page templates; never break the existing six semantic box colors, RTL conventions, or print isolation.
4. Update the relevant living documentation in `src/docs/design` or `src/docs/pagination` when architecture changes.
5. Run `python src/build.py`, then all checks in root README. Commit the newly generated `index.html` and `service-worker.js` together with their source.

`src/philosophy_study_notes.html` is a generated non-inlined HTML export kept next to its CSS and JavaScript; `index.html` is the public, offline self-contained reader. Do not hand-edit either generated file.

The `src/source_materials/` extracts remain publicly visible to anyone browsing this public repository; the directory move is organizational only, not access control.

## Contents and printing

The accessible Topic → Sub-topic → Chapter → Section sidebar supports live search, explicit branch control, a chapter-only ordered print selector, and optional revision pages. See [SIDEBAR_GUIDE.md](docs/hosting/SIDEBAR_GUIDE.md). Validate with `python src/tests/verify_sidebar.py`.

## Screen-only reading location

The sticky progress rail, circular chapter gauge, sidebar's active § link,
and optional locally saved Resume Reading prompt are implemented in
`src/main.html`, `src/philosophy_notes.css`, and the **same existing**
`wireScrollSpy()` in `src/philosophy_notes.js`. See
[`docs/hosting/READING_POSITION.md`](docs/hosting/READING_POSITION.md).
Do not add a second scroll tracker or save print-transformed positions.

## On-screen revision visibility

The Tools tab has **Show chapter Revision Blocks** (default: on). Turning it off
hides every chapter's complete `.end-block` from the screen, with preference
stored under `11am-hikam-show-revisions-v1` in device `localStorage`.
The main book and every revision block remain in the HTML. The print dialog
has an **independent** Include chapter revision pages option; hiding a block
on screen never excludes it from a PDF unless that print option is unchecked.
Search still indexes the entire book and reveals Revision Blocks when a
reader deliberately selects a result inside a hidden block.
