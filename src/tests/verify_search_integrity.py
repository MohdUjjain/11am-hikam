#!/usr/bin/env python3
"""Contract checks for the search integrity & revision preference polish."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
js=(root/'src/philosophy_notes.js').read_text(encoding='utf-8')
css=(root/'src/philosophy_notes.css').read_text(encoding='utf-8')
reader=(root/'index.html').read_text(encoding='utf-8')
for marker in (
    'function mappedText(source)', 'function scoredMatches(terms,phrase)',
    'function renderNext()', "var PAGE_SIZE=30", 'Show ',
    'reader-search-more', "var candidates='h1,h2,h3,h4,h5,h6",
    'svg text', "replace(/\\u0649/g,'ي')", 'function excerpt(entry,window,terms)',
    "document.createElement('mark')", "location:location", 'reader-hit-location',
    'if(hiddenRevision(entry))return;', 'revisions.clearTemporary()',
    'function clearTemporary()', "block.classList.add('reader-search-reveal')",
    "window.__hikamRevisions={", 'target.focus({preventScroll:true})',
    "querySelectorAll('.reader-temporary-revision-note')"
):
    assert marker in js, f'Missing search integrity behavior: {marker}'
assert 'if(found.length<45)' not in js, 'Old 45-result cutoff is still active'
assert 'window.__hikamRevisions.show()' not in js, 'Search persists revision setting'
assert 'html.reader-hide-revisions section.chapter > .end-block.reader-search-reveal' in css
assert 'reader-hit-context mark' in css
assert "document.createElement('mark')" in reader
assert reader.count('<div class="end-block">')==34, 'All revisions must remain authored'
print('Search integrity validated: educational tools, Arabic normalization, paged matches, precise excerpts, hidden-revision filtering and print safeguards.')
