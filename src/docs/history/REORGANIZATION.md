# Repository organization — migration from flat root

The published root was cluttered with editorial, CSS, JavaScript and chapter modules. The new layout mirrors the project's World History Dossier convention: **public assets at the root; authored materials, docs and tests in `src/`**.

Only the build/test paths and the service worker's published asset list changed. The **original 34 chapter contents remain byte-for-byte identical** to the source snapshot. The semantic design and print engine are unchanged. `robots.txt` was added because the offline-status script already listed it as a required cached file; that resource is now included in the service-worker precache list.

For each former path, the exact new destination is recorded in [`LEGACY_PATH_MAP.json`](LEGACY_PATH_MAP.json). The SHA-256 of each original file is recorded in [`ORIGINAL_SOURCE_SHA256.json`](ORIGINAL_SOURCE_SHA256.json). The one-time migration tool deletes old locations **only if each still matches its published pre-migration SHA-256**. Source changes made since that snapshot are intentionally retained and cause a hard stop.

Root files intentionally retained: `index.html`, `service-worker.js`, `manifest.webmanifest`, `icons/`, `og-image.jpg`, `404.html`, `sitemap.xml`, `.nojekyll`, `.gitignore`, `README.md`, `.github/workflows/` and the new `robots.txt`.

The previous generated `philosophy_study_notes.html` lives in `src/` alongside external stylesheet and script files. It remains an alternate non-inlined authoring preview; the root `index.html` remains the only authoritative GitHub Pages book URL.

No claims of privacy are made for files moved into `src/`: GitHub exposes every committed file to repository visitors.
