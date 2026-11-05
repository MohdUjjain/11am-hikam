#!/usr/bin/env python3
"""Exercise the real Hikam service worker through two editions, including offline use.

Uses a temporary localhost site. No changes are made to authored sources or the
published cache. A failed third release must leave the working edition usable.
"""
from __future__ import annotations

from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import re
import shutil
import tempfile
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


class QuietNoStoreHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


@contextmanager
def fixture_site():
    with tempfile.TemporaryDirectory(prefix='hikam-pwa-qa-') as directory:
        root = Path(directory)
        for name in ('index.html', 'manifest.webmanifest', 'service-worker.js',
                     'og-image.jpg', '404.html', 'sitemap.xml', 'robots.txt'):
            shutil.copy2(ROOT / name, root / name)
        (root / 'icons').mkdir()
        for size in (192, 512):
            shutil.copy2(ROOT / f'icons/icon-{size}.png', root / f'icons/icon-{size}.png')
        # This is a test-only local copy: skip external font downloads, which
        # are optional and not part of the atomic book-release guarantee.
        html = (root / 'index.html').read_text(encoding='utf8')
        html = re.sub(r'<link\b[^>]*href="https://fonts\.googleapis\.com/[^>]*>', '', html)
        (root / 'index.html').write_text(html, encoding='utf8')
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietNoStoreHandler, directory=str(root)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield root, f'http://127.0.0.1:{server.server_port}/'
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)


def browser_launch(playwright):
    args = {'headless': True, 'args': ['--no-sandbox']}
    override = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
    if override:
        args['executable_path'] = override
    elif Path('/usr/bin/chromium').is_file():
        args['executable_path'] = '/usr/bin/chromium'
    return playwright.chromium.launch(**args)


def state(page):
    return page.evaluate('''async () => ({
       keys: await caches.keys(),
       controlled: !!navigator.serviceWorker.controller,
       pending: !!(await navigator.serviceWorker.getRegistration())?.waiting,
       book: document.querySelectorAll('section.chapter').length,
       edition: document.querySelector('meta[name="hikam-test-edition"]')?.content || 'v1'
    })''')


def new_edition(root, label):
    html_path = root / 'index.html'
    html = html_path.read_text(encoding='utf8')
    html = re.sub(r'<meta name="hikam-test-edition" content="[^"]*">', '', html)
    html = html.replace('</head>', f'<meta name="hikam-test-edition" content="{label}">\n</head>', 1)
    html_path.write_text(html, encoding='utf8')
    worker_path = root / 'service-worker.js'
    worker = worker_path.read_text(encoding='utf8')
    worker, replaced = re.subn(r"(const CACHE_NAME = PREFIX \+ ')[^']+(';)",
                               lambda m: m.group(1) + f'browser-{label}-test' + m.group(2), worker, count=1)
    assert replaced == 1, 'Worker version marker missing'
    worker_path.write_text(worker, encoding='utf8')


def main():
    with fixture_site() as (root, base), sync_playwright() as playwright:
        browser = browser_launch(playwright)
        ctx = browser.new_context(service_workers='allow')
        # Use a real origin, actual SW install/activation and browser CacheStorage.
        page = ctx.new_page()
        issues = []
        page.on('pageerror', lambda exc: issues.append(str(exc)))
        page.goto(base, wait_until='domcontentloaded', timeout=60000)
        page.wait_for_function('Boolean(window.__hikamReadingProgress)', timeout=60000)
        page.evaluate('navigator.serviceWorker.ready')
        page.wait_for_function('Boolean(navigator.serviceWorker.controller)', timeout=30000)
        initial = state(page)
        assert initial['book'] == 34 and initial['controlled']
        assert len([key for key in initial['keys'] if key.startswith('11am-hikam-reader-')]) == 1, initial
        old_key = next(key for key in initial['keys'] if key.startswith('11am-hikam-reader-'))
        assert page.evaluate('''async () => Boolean(await (await caches.open(
            (await caches.keys()).find(k => k.startsWith('11am-hikam-reader-'))
        )).match('./index.html'))''')
        print('PASS service worker initial atomic install and CacheStorage', flush=True)

        # Cache-first offline navigation is checked in a *new tab*, not just
        # using the previous page's live DOM.
        ctx.set_offline(True)
        offline = ctx.new_page()
        offline.goto(base, wait_until='domcontentloaded', timeout=30000)
        offline.wait_for_function('document.querySelectorAll("section.chapter").length===34')
        assert state(offline)['book'] == 34
        offline.close()
        ctx.set_offline(False)
        print('PASS fresh offline navigation returns the complete 34-chapter edition', flush=True)

        # Publish a new local edition with a new content-hashed-style key.
        new_edition(root, 'v2')
        page.evaluate('window.__qaControllerChanges=0; navigator.serviceWorker.addEventListener("controllerchange",()=>window.__qaControllerChanges++)')
        page.evaluate('''async () => {const r = await navigator.serviceWorker.getRegistration(); await r.update();}''')
        page.wait_for_function('window.__qaControllerChanges > 0', timeout=30000)
        page.locator('#editionUpdateNotice').wait_for(state='visible', timeout=20000)
        # controllerchange can arrive before activation's waitUntil cache
        # cleanup has become visible across browser execution contexts.
        page.wait_for_function('''async () => {
           const keys = (await caches.keys()).filter(k => k.startsWith('11am-hikam-reader-'));
           return keys.length === 1 && keys[0].includes('browser-v2-test');
        }''', timeout=30000)
        updated = state(page)
        names = [key for key in updated['keys'] if key.startswith('11am-hikam-reader-')]
        assert len(names) == 1 and old_key not in names, (initial, updated)
        assert updated['edition'] == 'v1', 'The visible reader must not silently swap editions'
        page.locator('#editionReloadBtn').click()
        page.wait_for_load_state('domcontentloaded')
        page.wait_for_function("document.querySelector('meta[name=\"hikam-test-edition\"]')?.content === 'v2'", timeout=30000)
        assert state(page)['book'] == 34
        print('PASS content update -> new atomic cache -> controllerchange notice -> user-initiated reload', flush=True)

        # The new edition must itself be immediately available offline.
        ctx.set_offline(True)
        page.reload(wait_until='domcontentloaded', timeout=30000)
        assert state(page)['edition'] == 'v2' and state(page)['book'] == 34
        ctx.set_offline(False)
        print('PASS updated edition opens offline after a full reload', flush=True)

        # A broken release (missing required precache asset) MUST NOT evict
        # the still-working edition or activate its newer service worker.
        (root / '404.html').unlink()
        new_edition(root, 'v3-failed')
        page.evaluate('''async () => { const r=await navigator.serviceWorker.getRegistration(); await r.update(); }''')
        page.wait_for_timeout(1500)
        after_bad = state(page)
        valid_keys = [key for key in after_bad['keys'] if key.startswith('11am-hikam-reader-')]
        # A rejected addAll may leave an empty cache namespace behind.
        # The safety contract is retention of the old, usable edition.
        assert names[0] in valid_keys, after_bad
        ctx.set_offline(True)
        page.reload(wait_until='domcontentloaded', timeout=30000)
        assert state(page)['edition'] == 'v2' and state(page)['book'] == 34
        assert not issues, issues
        print('PASS rejected incomplete release preserves prior offline edition', flush=True)
        ctx.close()
        browser.close()
    print('ALL REAL-SERVICE-WORKER PLAYWRIGHT REGRESSIONS PASSED', flush=True)


if __name__ == '__main__':
    main()
