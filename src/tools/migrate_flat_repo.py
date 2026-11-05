#!/usr/bin/env python3
"""Remove *old root duplicates* only after comparing them to the known pre-migration release.

After extracting the organized ZIP OVER the existing checkout:
    python src/tools/migrate_flat_repo.py             # dry-run
    python src/tools/migrate_flat_repo.py --apply     # delete only validated duplicates

Never touches .git, published root files, untracked user files or modified source files.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = ROOT / 'src/docs/history/ORIGINAL_SOURCE_SHA256.json'
MAPPING = ROOT / 'src/docs/history/LEGACY_PATH_MAP.json'


def main():
    if '--apply' in sys.argv and not (ROOT / '.git').exists():
        sys.exit('Refusing to modify directory without .git. Run in existing cloned repo.')
    hashes = json.loads(BASELINE.read_text(encoding='utf-8'))
    mapping = json.loads(MAPPING.read_text(encoding='utf-8'))
    removals = []
    changes = []
    missing_targets = []
    for old, new in mapping.items():
        before = ROOT / old
        after = ROOT / new
        if not before.exists(): continue
        if before.is_symlink() or not before.is_file():
            changes.append(old + ' (not a regular file)'); continue
        if not after.is_file():
            missing_targets.append(old + ' => ' + new); continue
        actual = hashlib.sha256(before.read_bytes()).hexdigest()
        if actual != hashes[old]:
            changes.append(old); continue
        removals.append(before)
    print(f'Validated {len(removals)} unchanged legacy root files; {len(mapping)-len(removals)} already absent or needing review.')
    for p in removals: print('  old root -> remove:',p.relative_to(ROOT))
    if changes or missing_targets:
        print('\nSTOP: Found modified legacy files or absent replacement files; nothing removed.')
        for x in changes: print('  modified:', x)
        for x in missing_targets: print('  missing replacement:', x)
        sys.exit(2)
    if '--apply' not in sys.argv:
        print('\nDry-run only. To remove validated old paths, rerun with --apply.')
        return
    for path in removals:
        path.unlink()
    for dirname in ('scripts', 'source_materials'):
        d = ROOT / dirname
        if d.is_dir() and not any(d.iterdir()): d.rmdir()
    print('Legacy source duplicates removed. New src/ files remain intact.')


if __name__ == '__main__': main()
