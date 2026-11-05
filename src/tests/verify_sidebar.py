#!/usr/bin/env python3
"""Static accessibility / sidebar contract check (no browser dependencies).

For visual and keyboard testing, use Chromium/Playwright locally as well.
"""
from pathlib import Path
from html.parser import HTMLParser
import sys

ROOT=Path(__file__).resolve().parents[2]
class Scanner(HTMLParser):
    def __init__(self):
        super().__init__();self.ids={};self.els=[]
    def handle_starttag(self, tag, attrs):
        props=dict(attrs)
        if props.get('id'):self.ids[props['id']]=(tag,props)
        self.els.append((tag,props))

def check():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    main=(ROOT/'src/main.html').read_text(encoding='utf-8')
    js=(ROOT/'src/philosophy_notes.js').read_text(encoding='utf-8')
    css=(ROOT/'src/philosophy_notes.css').read_text(encoding='utf-8')
    p=Scanner();p.feed(html)
    must=['tocFab','tocBackdrop','tocSidebar','tocSidebarHeading','tocSidebarClose',
          'tocPrintDisclosure','tocPrintRange','tocPrintPreview','tocPrintError',
          'tocPrintRevision','tocPrintSelected','tocPrintAll','tocSearch',
          'tocSearchResults','tocExpandAll','tocCollapseAll','tocTree']
    for ident in must:
        assert ident in p.ids, f'Missing sidebar control: {ident}'
        assert f'id="{ident}"' in main, f'Canonical template omits {ident}'
    assert p.ids['tocSidebar'][1].get('role')=='dialog'
    assert p.ids['tocSidebar'][1].get('aria-modal')=='true'
    assert 'inert' in p.ids['tocSidebar'][1]
    assert p.ids['tocFab'][1].get('aria-controls')=='tocSidebar'
    assert p.ids['tocPrintRange'][1].get('aria-describedby')
    assert 'checked' in p.ids['tocPrintRevision'][1]
    assert p.ids['tocBackdrop'][1].get('aria-hidden')=='true'
    assert p.ids['tocSearch'][0]=='input'
    assert 'disabled' in p.ids['tocPrintSelected'][1]
    for method in ('setGroupExpanded','setSectionExpanded','wireScrollSpy','wireSearch','wireSidebar',
                   'wirePrint','stageSelectedOrder','restoreSelectedOrder','parseRange','wireExpandControls'):
        assert 'function '+method in js, f'UI handler missing: {method}'
    for item in ('aria-current','aria-expanded','aria-controls','aria-hidden','aria-invalid',
                 'inert','focus({preventScroll:true})','print-chapters-only',
                 'includeRevision','window.__hikamSidebarParseRange'):
        assert item in js, f'Accessibility/print behavior missing: {item}'
    assert 'body.print-chapters-only > :not(section.chapter)' in css
    assert '#tocBackdrop {display:none!important;}' in css
    assert 'prefers-reduced-motion:reduce' in css
    print('Sidebar contract verified: focus-safe dialog, search, section anchors, expansion, ordered print and revision toggle.')

if __name__=='__main__':
    try:check()
    except Exception as err:sys.exit('Sidebar validation failed: '+str(err))
