# Reading location and local resume (screen-only)

This chapter book tracks **two different quantities** without assigning reading
completeness or exam mastery:

- **Whole-book gold rail** across the narrow sticky header: physical scroll
  position from cover to the book's end (0–100%), including all published
  dossiers. It does **not** mark chapters as studied.
- **Circular chapter gauge**: physical position through the active dossier's
  full chapter element (0–100%), resets when the current chapter changes.
  It includes the chapter's revision content and shows the current chapter's
  number/title in a language-aware label. The optional current § section label
  appears on wider viewports.

The existing sidebar `wireScrollSpy()` in `src/philosophy_notes.js` is the
single source of truth for active chapter, active § section, progress displays,
and the resume bookmark. No independent scroll observer should be introduced.
A section is shown as active via `aria-current="location"` on its sidebar link;
its chapter remains highlighted. Scrolling **never** expands a manually
collapsed Topic, Sub-topic, or § branch. The source headings acquire stable
runtime IDs based on chapter ID + § ordinal; authored chapter HTML is not
rewritten.

## Resume Reading: private and optional

A last-read bookmark is stored exclusively in that browser's `localStorage`
under `11am-hikam-reading-place-v1`:

- `chapterId` identifies the current dossier.
- `sectionId` and `sectionRatio` (when available) restore the approximate
  location inside the numbered section.
- `chapterRatio` is the fallback for a missing/changed section.

When a returning reader visits the cover without a URL fragment, a small
prompt offers **Continue reading**, **Start at beginning**, **Forget saved
place**, and dismissal. It never auto-jumps away from the cover. Starting over
or forgetting removes the stored bookmark. Dismissal keeps it until the reader
actively scrolls again. On direct `#chapter` or `#section` links, the URL wins;
no resume prompt appears. Browser-restored scroll positions also take priority.

Read/write attempts are guarded because private-browsing/storage settings may
reject `localStorage`. Only actual subsequent reading movement is saved, not
the initial cover paint. Saves are throttled; final visible position is flushed
on `pagehide`. Programmatic URL jumps get a short guard period so intermediate
scroll-animation frames do not replace a saved chapter. No account, cookies,
analytics, remote API, or sync are involved. Clearing website data clears the
bookmark, as it does the offline book cache.

## Print and update safety

The progress header and resume prompt have `display:none!important` under
`@media print`; their presence never changes the print-page dimensions.
The scroll tracker suspends reading-position writes during `beforeprint` and
`afterprint` manipulation, and ignores temporary paginated DOM. Browser font
loading/resizing and additions to future chapters change physical percentages
naturally, while stable chapter/section keys keep resume anchors meaningful.
The installed PWA's content-hashed service worker automatically distributes
new published reader code while preserving `localStorage` across updates.

## Regression testing

Run `python src/build.py --check`, `python src/tests/verify_reading_progress.py`,
all existing validation tests, and a Chromium smoke test covering:
Arabic and English progress labels; mobile width; a saved bookmark surviving a
fresh load without being overwritten by cover paint; Resume, Start and Forget;
a direct hash bypass; collapsed tree staying collapsed during section changes;
and a print/afterprint cycle leaving storage unchanged. The automated workflow
runs a no-dependency static contract check; browser behavior must also be
verified when changing scroll code.
