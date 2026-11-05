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
