#!/usr/bin/env python3
"""Reader-location controls: stable IDs, privacy, print exclusion, and single-spy contract."""
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
class Elements(HTMLParser):
    def __init__(self):
        super().__init__();self.ids={}
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get('id'):self.ids[d['id']]=(tag,d)

def main():
    source=(ROOT/'src/main.html').read_text(encoding='utf8')
    published=(ROOT/'index.html').read_text(encoding='utf8')
    script=(ROOT/'src/philosophy_notes.js').read_text(encoding='utf8')
    css=(ROOT/'src/philosophy_notes.css').read_text(encoding='utf8')
    parser=Elements();parser.feed(published)
    ids=['readingProgressHeader','readerCurrentNumber','readerCurrentTitle',
         'readerCurrentSection','readerBookTrack','readerBookRail','readerBookPercent',
         'readerChapterRing','readerChapterPercent','resumeReaderPrompt',
         'resumeReaderTitle','resumeReaderDescription','resumeReaderContinue',
         'resumeReaderStart','resumeReaderForget','resumeReaderDismiss']
    for ident in ids:
        assert ident in parser.ids,f'Missing reader control: {ident}'
        assert f'id="{ident}"' in source,f'Control missing from canonical main.html: {ident}'
    for ident in ['readerBookTrack','readerChapterRing']:
        tag,attrs=parser.ids[ident]
        assert attrs.get('role')=='progressbar'
        assert attrs.get('aria-valuemin')=='0'
        assert attrs.get('aria-valuemax')=='100'
        assert attrs.get('aria-label')
    assert 'hidden' in parser.ids['resumeReaderPrompt'][1]
    assert 'aria-labelledby' in parser.ids['resumeReaderPrompt'][1]
    for name in ['readingProgressHeader','resumeReaderPrompt']:
        assert f'#{name}' in css
    assert '.reader-progress-ring' in css
    assert '@media print' in css and '#readingProgressHeader,#resumeReaderPrompt {display:none!important;}' in css
    assert script.count('function wireScrollSpy(){')==1,'Progress must share the existing sidebar spy'
    for phrase in ['localStorage.setItem(STORAGE_KEY','localStorage.removeItem(STORAGE_KEY',
                   "window.addEventListener('beforeprint'",
                   "window.addEventListener('afterprint'",
                   "location.hash || window.scrollY>100", 'setSectionActive(',
                   'chapterRatio:', 'sectionRatio=', 'suspendUntil=Date.now()+2000']:
        assert phrase in script, f'Missing reader safeguard: {phrase}'
    assert 'https://mohdujjain.github.io/11am-hikam/' in published
    print('Reader progress verified: separate book/chapter gauges, section highlight, local-only resume, direct-link and print safeguards.')

if __name__=='__main__':main()
