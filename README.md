# 11AM — Takhassus Hikam

**[Read / install the book](https://mohdujjain.github.io/11am-hikam/)**

Bilingual Arabic / English philosophy and religious-studies revision dossier (34 completed chapters). The GitHub Pages edition retains the original book’s chapter contents, sidebar, PDF/print engine, design system, and modular authoring process.

## Install and read offline

1. Open the online link while connected to the internet and allow the complete page to load.
2. Wait for **Offline reading → Entire book saved offline** in the Contents sidebar. The service worker pre-caches the *whole assembled 34-chapter HTML file*, CSS, JavaScript, manifest, and both icons.
3. Choose **Install app** in Chrome/Edge, or **Add to Home Screen** on iPhone/iPad. Then the installed app opens the saved book without internet.
4. To request longer-lived browser storage, use **Keep on this device** in the sidebar. The browser may grant or reject the request. No web app can guarantee storage is never evicted, manually cleared, or removed by the OS.

The reader works offline after its initial successful cache. The hosted version uses local CSS/JS, so interaction and pagination code remain available offline. Google Fonts remain externally hosted to preserve the original typography without redistributing font binaries. After the service worker controls a page, it saves Google Fonts responses observed during an online visit in a separate, long-lived browser font cache; offline font fidelity improves after that online warm-up. A first offline visit before fonts finish loading, a browser cache eviction, or a changed CDN URL can still trigger fallback fonts. Printing offline still depends on the browser/OS.

## Repo layout

| File | Role |
| --- | --- |
| `index.html` | Published complete one-page reader |
| `service-worker.js` | Automatically generated offline cache with content-hashed revision |
| `manifest.webmanifest`, `icons/` | Installable app metadata and icons |
| `og-image.jpg` | 1200 × 630 social-sharing image for WhatsApp/Facebook/X and other link previews |
| `404.html`, `sitemap.xml` | Helpful missing-page response and single-page search discoverability |
| `.github/workflows/verify-pages.yml` | Automatic build and hosting metadata verification after pushes/PRs |
| `scripts/verify_publication.py` | Zero-dependency publication integrity check |
| `offline-reader.js` | Offline status and storage persistence opt-in |
| `main.html`, `subtopic-*.html` | Original modular content source |
| `philosophy_notes.css`, `philosophy_notes.js` | Existing visual and navigation/print engine |
| `build.py` | Generates both `index.html` and `philosophy_study_notes.html` |
| `DESIGN_SYSTEM.md`, `PAGINATION_SYSTEM.md` | Living technical documentation |

## Rebuild and deploy

```bash
python build.py
python build.py --check
```

Commit changes to `main`, including rebuilt `index.html` and `service-worker.js`. Run `python scripts/verify_publication.py` as well; the GitHub Actions workflow will report a failure if compiled files were not regenerated, though branch-based GitHub Pages can publish before this non-blocking check completes. Because the worker version is based on the full HTML, CSS, JS, manifest, and icon bytes, a new book build creates a new cache revision. On the next online opening, the browser installs the new version and removes the older one only after successful pre-caching.

### GitHub Pages setup (one-time)

At **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, and Save. GitHub Pages will serve `index.html` at the URL above. The repository must remain public for free GitHub Pages hosting unless your plan supports private repo Pages.

### Offline limitations

- The book is held in **CacheStorage**, not permanent device storage; storage survives ordinary reloads and browser restarts, but can be evicted under storage pressure or removed by clearing site data.
- The offline icon and chapter content require no network after initial successful pre-caching; external fonts and third-party links may still require internet.
- To verify: online load → sidebar says saved → Chrome DevTools **Application → Service Workers / Cache Storage** → toggle **Offline** and reload → all 34 chapters render and sidebar/print navigation works.

## Editorial scope

These are study dossiers based on supplied learning materials. The original 32 chapters and the two recently revised chapters are preserved; the PWA work does not change their scholarly text or teaching tools.

## Website access and updates

The canonical address is https://mohdujjain.github.io/11am-hikam/. The browser and social-sharing title is **11AM — Takhassus Hikam Dossier**. Social platforms may cache their first preview; use each platform's sharing debugger or resend the link if a thumbnail appears outdated.

Installed copies continue to open instantly from CacheStorage. When an updated service worker finishes saving the new edition, an existing controlled tab displays **New edition ready → Reload book** without changing the printed book. **First migration note:** an app installed before this notification was introduced still runs the *previous* JavaScript until its first reload; one manual reload while online is needed to enable the new notice for later releases. Subsequent updates are detected automatically during online visits and when the tab returns to the foreground.

The `source_materials/` folder is published publicly because this is a public Pages repository; review whether source extracts are suitable for distribution before sharing the repository widely. No original extract was removed by the hosting enhancement.
