#!/usr/bin/env python3
"""Hikam editorial source-fidelity regression guard for Dossiers 3.4.3 and 3.4.4."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
rules = json.loads((ROOT/"src/docs/editorial/SOURCE_FIDELITY_OVERRIDES_3_4.json").read_text(encoding="utf8"))["edits"]
source = (ROOT/"src/chapters/subtopic-3-4.html").read_text(encoding="utf8")
html = (ROOT/"src/philosophy_study_notes.html").read_text(encoding="utf8")
public = (ROOT/"index.html").read_text(encoding="utf8")
assert len(rules) == 64
for label, text in (("canonical", source), ("non-inlined", html), ("published", public)):
    for i, rule in enumerate(rules):
        assert rule["find"] not in text, (label, i, "original intrusion restored")
        if rule["replace"]:
            assert rule["replace"] in text, (label, i, "correction missing")
    for phrase in ("Scholarly Framing", "لم تُتحقق بصورة مستقلة", "not independently verified", "supplied study extract"):
        assert phrase not in text, (label, phrase)
    assert 'id="ch3-4-3"' in text and 'id="ch3-4-4"' in text
assert source in html and source in public
assert len(re.findall(r'<section class="chapter(?: [^"]+)?" id="ch\d+-\d+-\d+"', public)) == 34
for name in ("3.4.3_Original_Study_Extract.txt", "3.4.4_Original_Study_Extract.txt"):
    assert (ROOT/"src/source_materials"/name).is_file()
print("PASS: 64 source-faithful corrections; 34 dossiers retained")
