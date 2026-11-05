# 11AM — Takhassus Hikam Dossier

**[Open the published book](https://mohdujjain.github.io/11am-hikam/)** · Bilingual Arabic/English philosophy and religious studies notes · 34 published dossiers.

This repository follows the same **published root → modular `src/` → organized documentation/tests** model as [World History Dossier](https://github.com/MohdUjjain/world-history-dossier). The book text, interactive sidebar, print layout and offline app have not been redesigned during this directory migration.

## Quick start

Published GitHub Pages URL: **https://mohdujjain.github.io/11am-hikam/**. GitHub Pages serves the root `index.html` from `main`, folder `/(root)`.

The reader shows a narrow **whole-book progress rail** and a separate **per-chapter circular gauge**, follows the active § section in the sidebar, and optionally offers **Resume Reading** from a position saved on this device (no account or sync).

Use **Install app** on Chrome/Edge/Android, or **Add to Home Screen** on iPhone/iPad. Visit online first, confirm **Entire book saved offline** in the contents panel, then reopen without a network connection. CacheStorage can be cleared by browsers or operating systems.

## Directory guide

| Path | Purpose |
| --- | --- |
| `index.html` | **Published** self-contained 34-chapter reader; generated, not hand edited |
| `service-worker.js` | **Published** content-hashed offline service worker; generated |
| `manifest.webmanifest`, `icons/`, `og-image.jpg` | PWA installation icons and social-sharing preview |
| `404.html`, `sitemap.xml`, `robots.txt`, `.nojekyll` | GitHub Pages and discovery assets |
| `src/main.html` | Authored book spine, cover, TOC, chapter include markers and metadata |
| `src/chapters/subtopic-*.html` | **Canonical chapter content** (six subtopic modules, 34 dossiers) |
| `src/philosophy_notes.css` and `src/philosophy_notes.js` | Shared design, navigation and print/pagination engine |
| `src/offline-reader.js`, `src/service-worker.template.js` | PWA status and offline worker source |
| `src/build.py` | Rebuilds published HTML, local reference HTML and service worker |
| `src/philosophy_study_notes.html` | Generated traditional, non-inlined HTML for local authoring/print preview |
| `src/docs/` | Living design, printing, editorial, hosting and history documentation |
| `src/tests/` | Structure, publication and offline service-worker checks |
| `src/source_materials/` | Previously supplied extracts for 3.4.3 and 3.4.4 (public!) |
| `src/tools/migrate_flat_repo.py` | One-time safe cleanup when moving from the previous flat repository |

More details: [src/README.md](src/README.md), [documentation index](src/docs/README.md).

## Build and verify

Requires Python 3; Node.js is additionally needed for the offline-service-worker simulation.

```bash
python src/build.py
python src/build.py --check
python src/tests/verify_publication.py
python src/tests/validate_structure.py
python src/tests/verify_sidebar.py
python src/tests/verify_reading_progress.py
node src/tests/test_offline_cache.mjs
```

Check generated outputs into `main` along with source changes. A GitHub Actions workflow verifies reproducibility and online metadata on push/PR; it does **not** automatically publish a PDF.

### Upgrading from the original flat layout

The [Windows migration instructions](src/docs/hosting/WINDOWS_CMD_DEPLOY.md) explain how to extract the complete organized ZIP into the existing checkout and remove duplicate old root files **only after SHA-256 checks**. Do not simply extract without running the migration cleanup, or old files will remain in the root.

**Public-content note:** Everything committed to this public repository—including `src/source_materials/`—is publicly accessible, even though it no longer appears at the website root. Move private/restricted source material outside the Git repository before distributing, if needed.
