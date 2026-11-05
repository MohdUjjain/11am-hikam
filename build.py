#!/usr/bin/env python3
"""Assemble 11AM Hikam dossier from modular fragments.

    python build.py             # creates both full book HTML outputs and SW
    python build.py --check     # checks generated outputs without altering them

Deployment to GitHub Pages uses index.html; the original offline/openable
philosophy_study_notes.html is retained for the original book workflow.
"""
import hashlib
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
INCLUDE_RE = re.compile(r'<!--\s*INCLUDE:(\S+?)\s*-->')


def outputs():
    main = (HERE / 'main.html').read_text(encoding='utf-8')
    def replace(match):
        name = match.group(1)
        if name.startswith('/') or '..' in Path(name).parts:
            raise ValueError(f'Unsafe include: {name}')
        return (HERE / name).read_text(encoding='utf-8')
    html = INCLUDE_RE.sub(replace, main)
    # For GitHub Pages: one self-contained HTML document. All 34 chapters,
    # print JS, styles and offline controls are saved as one CacheStorage item.
    css = (HERE / 'philosophy_notes.css').read_text(encoding='utf-8')
    js = (HERE / 'philosophy_notes.js').read_text(encoding='utf-8')
    offline = (HERE / 'offline-reader.js').read_text(encoding='utf-8')
    index = html.replace('<link rel="stylesheet" href="philosophy_notes.css">', '<style>\n' + css + '\n</style>', 1)
    index = index.replace('<script src="philosophy_notes.js"></script>', '<script>\n' + js + '\n</script>', 1)
    index = index.replace('<script src="offline-reader.js" defer></script>', '<script>\n' + offline + '\n</script>', 1)
    assets = [HERE / x for x in (
        'philosophy_notes.css', 'philosophy_notes.js', 'offline-reader.js',
        'manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'
    )]
    digest = hashlib.sha256(index.encode('utf-8'))
    for asset in assets: digest.update(asset.read_bytes())
    revision = digest.hexdigest()[:12]
    worker = (HERE / 'service-worker.template.js').read_text(encoding='utf-8')
    worker = worker.replace('__REVISION__', revision)
    return {
        'index.html': index,
        'philosophy_study_notes.html': html,
        'service-worker.js': worker
    }


def main():
    try: rendered=outputs()
    except (OSError,ValueError) as exc: sys.exit(f'Build error: {exc}')
    check = '--check' in sys.argv
    for name,contents in rendered.items():
        dest=HERE / name
        if check:
            if not dest.is_file() or dest.read_text(encoding='utf-8') != contents:
                sys.exit(f'Outdated/missing output: {name}. Run python build.py')
        else:
            dest.write_text(contents,encoding='utf-8')
    print(('Verified' if check else 'Built') + ': ' + ', '.join(rendered))

if __name__=='__main__': main()
