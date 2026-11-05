#!/usr/bin/env python3
"""Publication contract for book-wide search, tabbed sidebar and mobile-safe chrome."""
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2]
main=(ROOT/'src/main.html').read_text(encoding='utf-8')
css=(ROOT/'src/philosophy_notes.css').read_text(encoding='utf-8')
js=(ROOT/'src/philosophy_notes.js').read_text(encoding='utf-8')
index=(ROOT/'index.html').read_text(encoding='utf-8')
class IDs(HTMLParser):
    def __init__(self):super().__init__();self.ids=[]
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k=='id':self.ids.append(v)
p=IDs();p.feed(main)
assert len(p.ids)==len(set(p.ids)), 'Duplicate book-level element ID'
for key in ('readerSearchInput','readerSearchResults','readerSearchHits','tocIndexTab','tocToolsTab',
            'tocIndexPanel','tocToolsPanel','tocPrintDisclosure','tocTree','tocToolsResume',
            'readerResumeShortcut','resumeReaderPrompt','readerBookTrack','readerChapterRing'):
    assert key in p.ids, 'Missing essential UI control '+key
assert 'tocSearch' not in p.ids, 'Search must not live in the sidebar'
assert 'role="tablist"' in main and 'role="tabpanel"' in main
assert 'tocToolsPanel" class="toc-tab-panel toc-tools-panel"' in main
for snippet in ('position:fixed;top:0;inset-inline:0','overflow-x:clip;',
                'section.chapter .chapter-body table','max-width:calc(100dvw - 20px)',
                '@media print','reader-search-hit'):
    assert snippet in css, 'Missing desktop/mobile layout safeguard: '+snippet
for snippet in ('function initFullBookSearch()',"querySelectorAll('section.chapter[id]')",
                'makeIndex().forEach','function wireTabs()',"aria-selected",
                "restorePosition(savedPosition)","function wireScrollSpy()"):
    assert snippet in js, 'Missing search, tab or reading-state logic: '+snippet
assert 'src="philosophy_notes.js"' not in index, 'Published JS must be inlined'
assert 'id="readerSearchInput"' in index and 'id="tocIndexTab"' in index
assert index.count('section class="chapter')>=34, 'Dossier content unexpectedly missing'
print('Reader UI validated: book-wide search, accessible tab panels, mobile constraints, resumable reading and print-safe chrome.')
