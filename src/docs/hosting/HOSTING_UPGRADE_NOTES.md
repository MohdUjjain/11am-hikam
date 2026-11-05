> **Paths after repository reorganization:** Source book/JS/CSS/worker-template files now live under `src/`; publication metadata and icons remain at the root. Historical table entries below retain their original shorthand. See `../history/REORGANIZATION.md` for the exact file mapping.

# Hosting-only upgrade — November 2026

This release changes website discovery, metadata, update notifications, offline font caching and automated checks. **It does not edit the 34 dossiers or their learning tools, comparisons, Arabic/English content, chapter structure, or pagination logic.**

| Addition | File(s) | Purpose |
| --- | --- | --- |
| Social preview card | `og-image.jpg` | 1200 × 630 navy / parchment / gold title image |
| Open Graph and Twitter/X metadata | `main.html` (compiled to `index.html`) | Consistent shared-link thumbnail/title/description |
| Page title | `main.html` | `11AM — Takhassus Hikam Dossier` |
| New-release banner | `main.html`, `philosophy_notes.css`, `offline-reader.js` | Reload option only once the updated book is saved |
| Automatic update checking | `offline-reader.js` | Check during online visits and foreground returns |
| Device-side font cache | `service-worker.template.js`, `offline-reader.js` | Reuse loaded Google Fonts resources offline where possible (no redistributed font files) |
| Atomic precache + version hash | `service-worker.template.js`, `build.py` | Safe replacement only after new assets cached; hash tracks metadata/assets/worker source |
| Automated checks | `.github/workflows/verify-pages.yml`, `scripts/verify_publication.py` | Catch stale generated HTML/worker and missing publication metadata |
| Better access | `404.html`, `sitemap.xml` | Branded fallback and sitemap discovery |

For installation instructions see `PWA_DEPLOYMENT.md`. The two `source_materials/` extracts are **unchanged and remain public**; remove them from GitHub separately if their distribution is not intended.

**First upgrade notice limitation:** existing devices running the earlier installed JS cannot display a banner added in this release until they have reloaded once. Later edition updates display the new notification. Browsers control the actual service-worker update timing and storage persistence.
