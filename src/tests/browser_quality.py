#!/usr/bin/env python3
"""Browser-driven reading regressions against the *published* HTML.

Runs on localhost (not set_content) to exercise real navigation, storage,
focus, and print. Requires: pip install playwright pypdf && playwright install chromium.
Run from any working directory: python src/tests/browser_quality.py
"""
from __future__ import annotations

from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
import os
import threading

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = Path(os.environ.get('HIKAM_TEST_ARTIFACTS', ROOT / 'test-artifacts'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextmanager
def site():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}/'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def launch(playwright):
    options = {'headless': True, 'args': ['--no-sandbox']}
    # Local CI/workstations may use the distribution Chromium binary.
    provided = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
    if provided:
        options['executable_path'] = provided
    elif Path('/usr/bin/chromium').is_file():
        options['executable_path'] = '/usr/bin/chromium'
    return playwright.chromium.launch(**options)


def context(browser, width=390, storage_state=None):
    kwargs = dict(viewport={'width': width, 'height': 844}, reduced_motion='reduce',
                  service_workers='block')
    if storage_state:
        kwargs['storage_state'] = storage_state
    ctx = browser.new_context(**kwargs)
    ctx.route('https://fonts.googleapis.com/**', lambda route: route.abort())
    ctx.route('https://fonts.gstatic.com/**', lambda route: route.abort())
    return ctx


def load(ctx, url):
    page = ctx.new_page()
    failures = []
    page.on('pageerror', lambda exc: failures.append(str(exc)))
    page.goto(url, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_function('Boolean(window.__hikamFullTextSearch && window.__hikamReadingProgress && window.__hikamRevisions)', timeout=60000)
    page.wait_for_function('document.querySelectorAll("section.chapter").length===34', timeout=20000)
    page.__failures = failures
    return page


def no_errors(page, label):
    assert not page.__failures, f'{label}: browser errors: {page.__failures}'


def viewport_and_accessibility(browser, url):
    for width in (320, 390, 768, 1366):
        ctx = context(browser, width)
        page = load(ctx, url)
        assert page.locator('section.chapter').count() == 34
        assert page.locator('.end-block').count() == 34
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'), f'horizontal overflow at {width}px'
        assert page.locator('#readingProgressHeader').evaluate('(el) => getComputedStyle(el).position') == 'fixed'
        page.evaluate("document.getElementById('ch3-2-4').scrollIntoView({behavior:'instant',block:'start'})")
        page.wait_for_function("document.getElementById('readerCurrentNumber').textContent.includes('3.2.4')")
        page.wait_for_function("Number(document.getElementById('readerBookTrack').getAttribute('aria-valuenow'))>0")
        assert page.locator('#readerChapterRing').get_attribute('aria-valuenow') is not None
        assert page.locator('#readingProgressHeader').evaluate('(e)=>Math.abs(e.getBoundingClientRect().top)<2')
        if width <= 390:
            page.locator('#readerCurrentNumber').click()
            assert page.locator('#readerChapterPopover').is_visible()
            assert page.locator('#readerPopoverTitle').get_attribute('lang') == 'ar'
            page.keyboard.press('Escape')
            assert not page.locator('#readerChapterPopover').is_visible()
            tables = page.locator('.reader-table-scrollable')
            assert tables.count() >= 1, f'No accessible scrollable tables at {width}px'
            table = tables.first
            table.scroll_into_view_if_needed()
            table.focus()
            assert page.evaluate('document.activeElement.classList.contains("reader-table-scrollable")')
            assert table.get_attribute('tabindex') == '0'
            assert table.evaluate('(el)=>el.scrollWidth>el.clientWidth')
            assert page.locator('.reader-table-scroll-hint').count() >= 1
        # A modal must trap focus and make the entire background inert.
        page.locator('#tocFab').click()
        assert page.locator('#tocSidebar').is_visible()
        assert page.evaluate('document.getElementById("readingProgressHeader").inert')
        assert page.evaluate('document.querySelector("section.chapter").inert')
        assert page.evaluate('document.activeElement.closest("#tocSidebar") !== null')
        page.locator('#tocExpandAll').click()
        assert page.locator('#tocTree .toc-chapter-sections-toggle').count() == 34
        assert page.locator('#tocTree .toc-chapter-sections-toggle').evaluate_all(
            '(nodes)=>nodes.every(n=>n.getAttribute("aria-expanded")==="true")')
        page.locator('#tocCollapseAll').click()
        assert page.locator('#tocTree .toc-chapter-sections-toggle').evaluate_all(
            '(nodes)=>nodes.every(n=>n.getAttribute("aria-expanded")==="false")')
        page.locator('#tocToolsTab').click()
        assert page.locator('#tocToolsPanel').is_visible() and not page.locator('#tocIndexPanel').is_visible()
        assert page.locator('#tocToolsTab').get_attribute('aria-selected') == 'true'
        page.keyboard.press('Escape')
        assert not page.locator('#tocSidebar').evaluate('(e)=>e.classList.contains("open")')
        assert not page.evaluate('document.querySelector("section.chapter").inert')
        assert page.evaluate('document.activeElement.id') == 'tocFab'
        page.screenshot(path=str(ARTIFACTS / f'layout-{width}.png'), animations='disabled')
        no_errors(page, f'viewport {width}px')
        ctx.close()
        print(f'PASS viewport/accessibility {width}px', flush=True)


def full_text_and_keyboard(browser, url):
    ctx = context(browser, 390)
    page = load(ctx, url)
    inp = page.locator('#readerSearchInput')
    for phrase in (
        'Ruth Barcan Marcus transforming modal logic',
        'Both Analytic & Continental traditions',
        'No universal history leads from savagery',
        'Hierarchy Recognition',
    ):
        inp.fill(phrase)
        page.evaluate('window.__hikamFullTextSearch.run()')
        stats = page.evaluate('window.__hikamFullTextSearch.getStats()')
        assert stats['matched'] > 0, f'Missing study content: {phrase}'
        assert page.locator('.reader-search-hit mark').count() > 0, f'Missing match highlighting: {phrase}'
    variants = []
    for phrase in ('فلسفة', 'فلسفه'):
        inp.fill(phrase)
        page.evaluate('window.__hikamFullTextSearch.run()')
        variants.append(page.evaluate('window.__hikamFullTextSearch.getStats().matched'))
    assert variants[0] > 0 and variants[0] == variants[1], f'Arabic normalization mismatch: {variants}'
    inp.fill('الله')
    page.evaluate('window.__hikamFullTextSearch.run()')
    total = page.evaluate('window.__hikamFullTextSearch.getStats().matched')
    assert total > 45, f'The long-result test needs >45 hits, got {total}'
    for _ in range(50):
        more = page.locator('.reader-search-more')
        if more.count() == 0:
            break
        more.click()
    else:
        raise AssertionError('Show more never exhausted the result set')
    stats = page.evaluate('window.__hikamFullTextSearch.getStats()')
    assert stats['shown'] == stats['matched'] == page.locator('.reader-search-hit').count(), stats
    inp.focus()
    inp.press('ArrowDown')
    assert page.evaluate('document.activeElement.classList.contains("reader-search-hit")')
    page.keyboard.press('Escape')
    assert page.evaluate('document.activeElement.id') == 'readerSearchInput'
    # Clicking a hit should place accessible focus on the *real passage*.
    inp.fill('Ruth Barcan Marcus transforming modal logic')
    page.evaluate('window.__hikamFullTextSearch.run()')
    page.locator('.reader-search-hit').first.click()
    assert page.evaluate('document.activeElement.closest("section.chapter") !== null')
    assert not page.locator('#readerSearchResults').is_visible()
    page.screenshot(path=str(ARTIFACTS / 'search-passage.png'))
    no_errors(page, 'full-text search')
    ctx.close()
    print(f'PASS full-text retrieval, {total} Arabic passage results, keyboard navigation', flush=True)


def preference_and_resume(browser, url):
    ctx = context(browser, 390)
    page = load(ctx, url)
    page.locator('#tocFab').click()
    page.locator('#tocToolsTab').click()
    checkbox = page.locator('#tocShowRevisionBlocks')
    assert checkbox.is_checked()
    checkbox.uncheck()
    assert page.evaluate("localStorage.getItem('11am-hikam-show-revisions-v1')") == 'false'
    page.keyboard.press('Escape')
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('Boolean(window.__hikamRevisions)')
    assert page.evaluate('document.documentElement.classList.contains("reader-hide-revisions")')
    assert not page.locator('.end-block').first.is_visible()
    assert not page.locator('#ch1-1-1 > .chapter-endnav').is_visible()
    assert page.locator('#ch3-4-4 > .chapter-endnav .endnav-btn:not(.endnav-next)').is_visible()
    inp = page.locator('#readerSearchInput')
    inp.fill('Possible Examination Questions')
    page.evaluate('window.__hikamFullTextSearch.run()')
    hit = page.locator('.reader-search-hit').filter(has=page.locator('.reader-hit-location', has_text='Revision & recall')).first
    assert hit.count() == 1, 'Revision result missing from full-text index'
    hit.click()
    assert page.locator('.end-block.reader-search-reveal').count() == 1
    assert page.evaluate("localStorage.getItem('11am-hikam-show-revisions-v1')") == 'false'
    page.locator('.reader-temporary-revision-note button').click()
    assert page.locator('.end-block.reader-search-reveal').count() == 0
    assert not page.locator('.end-block').first.is_visible()
    # Start a new visit at the cover. Reloading the scrolled search page
    # can legitimately restore scrollY and suppress the resume prompt.
    page.close()
    page = load(ctx, url)
    page.evaluate("localStorage.setItem('11am-hikam-reading-place-v1', JSON.stringify({version:1,chapterId:'ch3-2-4',chapterRatio:0.46}))")
    page.close()
    page = load(ctx, url)
    page.locator('#resumeReaderPrompt').wait_for(state='visible', timeout=20000)
    page.locator('#resumeReaderContinue').click()
    page.wait_for_function("document.getElementById('readerCurrentNumber').textContent.includes('3.2.4')")
    assert page.evaluate('scrollY>100')
    # Exercise a separate visit after continuing; avoid scroll restoration.
    page.close()
    page = load(ctx, url)
    page.locator('#resumeReaderPrompt').wait_for(state='visible', timeout=20000)
    page.evaluate("document.getElementById('editionUpdateNotice').hidden=false; window.dispatchEvent(new CustomEvent('hikam:edition-notice',{detail:{visible:true}}))")
    assert not page.locator('#resumeReaderPrompt').is_visible()
    page.locator('#editionDismissBtn').click()
    assert page.locator('#resumeReaderPrompt').is_visible()
    # Explicit deep links win over a stored bookmark.
    page.goto(url + '#ch1-1-3', wait_until='domcontentloaded')
    page.wait_for_function('Boolean(window.__hikamReadingProgress)')
    assert not page.locator('#resumeReaderPrompt').is_visible()
    assert page.evaluate("localStorage.getItem('11am-hikam-show-revisions-v1')") == 'false'
    no_errors(page, 'preferences/resume')
    ctx.close()
    print('PASS persisted revision preference, temporary preview, resume, edition notice priority, deep link', flush=True)


def print_and_restore(browser, url):
    ctx = context(browser, 1024)
    page = load(ctx, url)
    # Hiding revision material while *reading* must not govern print export.
    page.evaluate("localStorage.setItem('11am-hikam-show-revisions-v1','false')")
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('Boolean(window.__printControl)')
    assert page.evaluate('document.documentElement.classList.contains("reader-hide-revisions")')
    original = page.evaluate("Array.from(document.querySelectorAll('section.chapter')).map(e=>e.id)")
    assert len(original) == 34
    counts = {}
    for with_revision in (False, True):
        page.evaluate("(revision) => {window.__printControl.setFilter(['ch1-1-1']);window.__printControl.includeRevision(revision);window.dispatchEvent(new Event('beforeprint'));}", with_revision)
        count = page.locator('.js-print-page').count()
        assert count > 0, 'Print compositor produced no physical pages'
        counts[with_revision] = count
        skips = page.locator('.js-print-page .endnav-next:not([href="#toc"])').count()
        assert (skips > 0) == with_revision, (with_revision, skips)
        assert page.locator('.js-print-page .endnav-toc').count() >= 1
        assert page.locator('#readerBookTrack').evaluate('(el)=>getComputedStyle(el).getPropertyValue("display")') != 'none'  # Screen view intact.
        # Playwright triggers actual print CSS and PDF generation, not a mock.
        pdf = page.pdf(print_background=True, prefer_css_page_size=True)
        assert pdf.startswith(b'%PDF') and len(pdf) > 10_000
        parsed = PdfReader(BytesIO(pdf))
        assert len(parsed.pages) >= count, (len(parsed.pages), count)
        (ARTIFACTS / ('selected-with-revision.pdf' if with_revision else 'selected-without-revision.pdf')).write_bytes(pdf)
        page.evaluate("window.dispatchEvent(new Event('afterprint'))")
        assert page.locator('.js-print-page').count() == 0
        assert page.evaluate("Array.from(document.querySelectorAll('section.chapter')).map(e=>e.id)") == original
        assert page.evaluate("localStorage.getItem('11am-hikam-show-revisions-v1')") == 'false'
    assert counts[True] > counts[False], counts
    page.emulate_media(media='print')
    for ident in ('#readingProgressHeader', '#tocFab', '#resumeReaderPrompt', '#tocSidebar'):
        assert page.locator(ident).evaluate('(e)=>getComputedStyle(e).display') == 'none', ident
    no_errors(page, 'printing')
    ctx.close()
    print(f'PASS A4 PDF output, revision inclusion independent of saved preference: {counts}', flush=True)


def main():
    with site() as url, sync_playwright() as playwright:
        browser = launch(playwright)
        try:
            viewport_and_accessibility(browser, url)
            full_text_and_keyboard(browser, url)
            preference_and_resume(browser, url)
            print_and_restore(browser, url)
        finally:
            browser.close()
    print('ALL PUBLISHED-READER PLAYWRIGHT REGRESSIONS PASSED', flush=True)


if __name__ == '__main__':
    main()
