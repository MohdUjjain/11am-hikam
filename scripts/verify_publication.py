#!/usr/bin/env python3
"""Pure-stdlib checks for the GitHub Pages publication package."""
from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parents[1]
BASE = 'https://mohdujjain.github.io/11am-hikam/'
TITLE = '11AM — Takhassus Hikam Dossier'

class PublishParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ''
        self.meta = {}
        self.links = []
        self.chapters = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        elif tag == 'meta':
            key = attrs.get('property', attrs.get('name'))
            if key: self.meta[key] = attrs.get('content','')
        elif tag == 'link':
            self.links.append(attrs)
        elif tag == 'script':
            self.scripts.append(attrs)
        elif tag == 'section' and 'chapter' in attrs.get('class','').split():
            self.chapters.append(attrs.get('id',''))

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False

    def handle_data(self, data):
        if self.in_title: self.title += data


def verify():
    index = (HERE/'index.html').read_text(encoding='utf8')
    main = (HERE/'main.html').read_text(encoding='utf8')
    worker = (HERE/'service-worker.js').read_text(encoding='utf8')
    parser = PublishParser()
    parser.feed(index)
    assert parser.title == TITLE, parser.title
    assert '<title>'+TITLE+'</title>' in main, 'Browser title must be authored in main.html'
    assert len(parser.chapters)==34, f'Expected 34 dossiers, found {len(parser.chapters)}'
    assert len(set(parser.chapters))==34, 'Duplicate chapter IDs'
    assert not any(x.get('src') for x in parser.scripts), 'Published reader must have inline JS'
    assert not any('philosophy_notes.css' in x.get('href','') for x in parser.links), 'Published reader must inline CSS'
    assert 'serviceWorker.register' in index, 'Service worker registration is missing'

    canonical = [x.get('href') for x in parser.links if 'canonical' in x.get('rel','').split()]
    assert canonical == [BASE], canonical
    manifest_links = [x.get('href') for x in parser.links if 'manifest' in x.get('rel','').split()]
    assert manifest_links == ['./manifest.webmanifest'], manifest_links
    for key, expected in {
        'og:site_name':TITLE,
        'og:title':TITLE,
        'og:url':BASE,
        'og:image':BASE+'og-image.jpg',
        'og:image:secure_url':BASE+'og-image.jpg',
        'og:image:type':'image/jpeg',
        'og:image:width':'1200',
        'og:image:height':'630',
        'twitter:card':'summary_large_image',
        'twitter:title':TITLE,
        'twitter:image':BASE+'og-image.jpg'
    }.items():
        assert parser.meta.get(key) == expected, f'{key}: {parser.meta.get(key)}'
    for key in ('og:image:alt','og:description','twitter:description','twitter:image:alt'):
        assert parser.meta.get(key), f'Missing {key}'

    manifest = json.loads((HERE/'manifest.webmanifest').read_text())
    assert manifest['name'] == TITLE
    assert manifest['scope'] == manifest['start_url'] == './'
    assert manifest['id'] == '/11am-hikam/'
    assert len(manifest['icons']) == 2
    for icon in manifest['icons']:
        assert (HERE/icon['src']).is_file(), icon
    assert (HERE/'og-image.jpg').read_bytes().startswith(b'\xff\xd8'), 'Missing JPEG social card'
    for name in ('404.html','sitemap.xml','.nojekyll'):
        assert (HERE/name).exists(), f'Missing {name}'
    root = ET.parse(HERE/'sitemap.xml').getroot()
    assert any(el.text == BASE for el in root.iter()), 'Sitemap does not contain the homepage URL'
    assert '__REVISION__' not in worker
    for path in ('./index.html','./manifest.webmanifest','./og-image.jpg','./404.html','./sitemap.xml'):
        assert path in worker, f'Not precached: {path}'
    for snippet in ('controllerchange','editionUpdateNotice','PREPARE_FONTS'):
        assert snippet in index, f'Missing runtime update/font code: {snippet}'
    print('Valid publication: 34 dossiers, correct HTML/meta/canonical, manifest/icons, offline update notice, 404, sitemap, social preview.')

if __name__ == '__main__':
    try:
        verify()
    except Exception as exc:
        print('Publication validation failed:',exc,file=sys.stderr)
        raise SystemExit(1)
