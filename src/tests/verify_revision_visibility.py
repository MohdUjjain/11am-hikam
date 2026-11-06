#!/usr/bin/env python3
"""Regression contract: user-controlled, persistent, screen-only revision blocks."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
main=(root/'src/main.html').read_text(encoding='utf-8')
css=(root/'src/philosophy_notes.css').read_text(encoding='utf-8')
js=(root/'src/philosophy_notes.js').read_text(encoding='utf-8')
index=(root/'index.html').read_text(encoding='utf-8')
assert 'id="tocShowRevisionBlocks"' in main
assert 'id="tocRevisionVisibilityStatus"' in main
assert '11am-hikam-show-revisions-v1' in main and '11am-hikam-show-revisions-v1' in js
assert 'html.reader-hide-revisions section.chapter > .end-block' in css
assert '@media screen' in css and '@media print' in css
for term in ('wireRevisionVisibility()', 'visibleRevisionEnd(chapter)',
             "window.addEventListener('hikam:revision-visibility'",
             'revisions.revealTemporary(entry.node)'):
    assert term in js, term
assert 'if (state.includeRevision)' in js
assert 'var endblockClone = endblock.cloneNode(true);' in js
assert index.count('<div class="end-block">')==34
assert index.count('class="chapter')>=34
assert 'tocShowRevisionBlocks' in index
# Context-sensitive chapter navigation is independent in HTML and PDF.
assert 'section.chapter > .chapter-endnav .endnav-toc' in css
assert 'html.reader-hide-revisions section.chapter > .chapter-endnav:has(> .endnav-toc)' in css
assert 'navClone.querySelectorAll(\'.endnav-next:not([href="#toc"])\')' in js
assert 'if (!state.includeRevision)' in js

print('Revision visibility verified: 34 preserved blocks, persistent screen setting, print independence.')
