# 11AM Hikam — PWA / GitHub Pages Architecture

- Project Pages URL: `https://mohdujjain.github.io/11am-hikam/`
- Root-scoped PWA: `./` path resolution under `/11am-hikam/`, never account-wide `/`.
- Manifest and icons provide app installation metadata and a home-screen icon.
- `build.py` assembles 34 dossier fragments into both `index.html` and `philosophy_study_notes.html`.
- Build also hashes the assembled HTML, CSS, JS, manifest and icons, then writes `service-worker.js` from its template. New edits produce a new cache version automatically.
- Service worker uses an **atomic installation**: cache.addAll() must succeed for all seven shell assets. It only activates after the whole book has been saved, then deletes old versions.
- On navigation, cache-first serves the full book without network; a later online navigation allows browser SW update checks and activates new cached releases. Reload if a new release just installed.
- External Google Fonts are not part of atomic same-origin precache. Fallback fonts are required offline, and users may experience font changes. Do not promise perfect offline typographic identity without a separate, licensed local-font bundling step.
- `offline-reader.js` reports readiness in sidebar and can request `navigator.storage.persist()` by explicit user click. Persistent storage is browser-controlled, and eviction/clearing cannot be prevented by web apps.
- No new third-party runtime, CDN, or JavaScript framework; existing print/pagination engine is unaffected. PWA-only status controls are excluded from printed book.
- Build verification: `python build.py --check`; browser tests must cover online first load, offline navigation to `/11am-hikam/`, CSS/JS availability, 34 chapters, and installation manifest.
