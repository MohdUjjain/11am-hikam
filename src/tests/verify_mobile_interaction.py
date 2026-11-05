#!/usr/bin/env python3
"""Phase 2 screen chrome integration guards (no external packages required)."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
js=(ROOT/'src/philosophy_notes.js').read_text(encoding='utf-8')
css=(ROOT/'src/philosophy_notes.css').read_text(encoding='utf-8')
html=(ROOT/'src/main.html').read_text(encoding='utf-8')
offline=(ROOT/'src/offline-reader.js').read_text(encoding='utf-8')
for token in ('readerChapterPopover','readerCurrentNumber','readerPopoverTitle','readerPopoverSection'):
    assert token in html,token
for token in ('sectionHeadingParts','appendSectionHeading','reader-section-marker',
              'setBackgroundInert(true)','setBackgroundInert(false)',
              'wasInert','reader-table-scrollable','reader-table-scroll-hint',
              "window.addEventListener('hikam:edition-notice',syncResumeNotice)"):
    assert token in js+css,token
assert "new CustomEvent('hikam:edition-notice'" in offline
assert "window.addEventListener('beforeprint'" in js
assert 'role="dialog"' in html and 'aria-modal="true"' in html
assert '#readingProgressHeader,#resumeReaderPrompt {display:none!important;}' in css
print('Phase 2 screen interaction guards passed.')
