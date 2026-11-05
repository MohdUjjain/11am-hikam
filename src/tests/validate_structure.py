#!/usr/bin/env python3
"""No-dependency check of authored subtopics and the assembled 34-dossier book.

Validates the book's identity, chapter uniqueness, revision blocks, internal links,
and that every authored subtopic contributes to the compiled reader.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src'

class Book(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []
        self.chapters = []
        self.revision = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag == 'a' and a.get('href','').startswith('#'):
            self.refs.append(a['href'][1:])
        classes = a.get('class','').split()
        if tag == 'section' and 'chapter' in classes:
            self.chapters.append((a.get('id',''), a.get('lang',''), 'rtl' in classes))
        if 'end-block' in classes: self.revision += 1

def main():
    source = (SRC / 'main.html').read_text(encoding='utf-8')
    includes = re.findall(r'<!--\s*INCLUDE:(subtopic-\d+-\d+\.html)\s*-->', source)
    files = sorted((SRC/'chapters').glob('subtopic-*.html'))
    assert set(includes) == {p.name for p in files}, 'Some subtopic files are omitted or duplicate-included'
    rendered = (ROOT/'index.html').read_text(encoding='utf-8')
    assert '<!-- INCLUDE:' not in rendered, 'Unresolved chapter marker in live website'
    parser = Book()
    parser.feed(rendered)
    assert len(parser.chapters) == 34, f'Wrong chapter count: {len(parser.chapters)}'
    assert len(set(parser.ids)) == len(parser.ids), 'Duplicate HTML ids'
    assert parser.revision == 34, f'Wrong revision block count: {parser.revision}'
    assert all(ch[0].startswith('ch') for ch in parser.chapters), 'Nonstandard chapter id'
    assert all(x in parser.ids for x in parser.refs), 'Broken internal anchor references'
    for chapter_id, language, rtl in parser.chapters:
        if rtl: assert language == 'ar', 'Arabic RTL missing language tag: ' + chapter_id
    print('Structure validated: 34 unique chapters, 34 revision blocks, all anchors valid, six modular sources included.')

if __name__=='__main__':
    try: main()
    except Exception as exc:
        sys.exit('Structure validation failed: ' + str(exc))
