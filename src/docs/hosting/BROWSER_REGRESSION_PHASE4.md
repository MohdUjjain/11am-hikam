# Phase 4 — browser-driven regression protection

The **Verify Hikam website publication** workflow now has two independently
reported jobs: the established deterministic source/publication checks, and
**Playwright reading, print and PWA regressions** (dependent on the former).

## What the browser job checks

`src/tests/browser_quality.py` loads the **published** root `index.html` over a
local HTTP origin in real Chromium. It checks:

- Responsive widths **320, 390, 768, and 1366 px**: the fixed reading header,
  separate book/chapter progress, no document-level horizontal overflow,
  mobile Arabic title disclosure, and keyboard-focusable overflowing tables.
- Sidebar dialog isolation, tab switching, full hierarchy expand/collapse,
  keyboard focus and Escape/focus restoration.
- Full-text retrieval of representative prose/diagram/quote terms, Arabic
  spelling variants, the complete result set beyond 45 items, snippets with
  highlighted matches, keyboard result navigation and passage focus.
- Persistent revision visibility across reloads, a temporary hidden-revision
  search preview that **does not overwrite localStorage**, saved-position resume,
  deep-link precedence and edition-notice priority.
- Physical print composition (both revision settings), generated PDF validity
  and page counts, restored chapter order and no reading chrome in print.

`src/tests/browser_pwa_updates.py` makes a **temporary copy** of the published
site served on an isolated localhost port. It exercises the real browser service
worker, origin-specific CacheStorage and offline switch:

1. Install a full initial edition and verify a complete cached book.
2. Navigate to the book *offline in a new tab*.
3. Serve a modified local edition/worker, observe `controllerchange` and the
   explicit update notice, then choose Reload to receive the new edition.
4. Reopen the updated edition while offline.
5. Attempt an intentionally **incomplete** third release. Its failed precache
   must not replace the last functioning edition.

The tests never modify the repository's `index.html`, service worker, icons or
study content; test editions are created only in a temporary directory.

## Running locally

From the repository root:

```sh
python -m pip install playwright==1.57.0 pypdf==5.9.0
python -m playwright install chromium
python src/tests/browser_quality.py
python src/tests/browser_pwa_updates.py
```

Use `python -m playwright install --with-deps chromium` on a fresh Ubuntu machine.
Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium` only when intentionally
using an installed system browser. Test scripts start their own localhost HTTP
server; they do **not** depend on the live GitHub Pages deployment or network
access. If a machine's browser policy blocks localhost navigation or printing,
run the full suite on GitHub Actions instead of bypassing the policy.

## Diagnostics and long-term discipline

Screenshots of responsive layouts, a search navigation capture, and two selected
chapter PDFs are saved under `test-artifacts/` (ignored by Git). GitHub Actions
uploads these on success **and on failure** with 7-day retention; inspect them
before changing CSS or the pagination engine.

Feature checks use stable DOM IDs, semantic markers and **representative
known source phrases**, not brittle snapshots of every authored paragraph.
When expanding the book, keep the 34-dossier assertion in sync with the actual
published chapter count and update the representative queries only if those
specific authored passages legitimately change. Never weaken checks simply to
make CI green. Maintain the existing source/build/offline unit checks in parallel.

Google Fonts are optional in these tests: the book should remain usable without
external font downloads. Real physical-device storage eviction, iOS installation,
font rasterization and PDF printing from native mobile browsers still require
manual acceptance checks; Chromium cannot simulate every platform behavior.
