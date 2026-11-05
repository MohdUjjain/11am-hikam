#!/usr/bin/env python3
"""Phase 3 source guard: rebrand chrome, honest accordion labels, dead-code removal."""
from pathlib import Path
import re
R=Path(__file__).resolve().parents[2]
main=(R/'src/main.html').read_text(encoding='utf-8')
js=(R/'src/philosophy_notes.js').read_text(encoding='utf-8')
css=(R/'src/philosophy_notes.css').read_text(encoding='utf-8')
index=(R/'index.html').read_text(encoding='utf-8')
for s in ('11AM · Takhassus Hikam Dossier','Contents &amp; Tools','Expand all levels',
          'Collapse all levels','tocRevisionVisibilityHint','tocToolsResume','tocToolsResumeSection'):
    assert s in main,s
assert 'Philosophy<br><em>The Complete Dossier</em>' in main
assert "setSectionExpanded(wrap,open,true)" in js
assert "'#tocTree .toc-chapter'" in js
for obsolete in ('function wireSearch()','tocSearchResults','dataset.searchText','function folded(text)'):
    assert obsolete not in js,obsolete
assert '.toc-search-tools' not in css
assert '.quicknav{' not in css
assert '#E5C77C' in css
assert 'color:var(--gold-pale)' in css
assert 'readerSearchInput' in main and 'function initFullBookSearch()' in js
assert '11AM · Takhassus Hikam Dossier' in index
assert len(re.findall(r'<section\s+class="chapter[^"]*"\s+id="ch',index))==34
print('Phase 3 publication branding, complete accordion, contrast and dead-code guards passed.')
