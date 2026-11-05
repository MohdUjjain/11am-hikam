# Complete dossier search — indexing, ranking and saved preferences

Search runs in the fixed reading header and indexes the authored chapter content
from all 34 dossiers. Besides prose and tables, the DOM index includes useful
`div`, `span`, `cite` and SVG text leaves and compact diagram/relationship nodes.
Generated print-page duplicates and navigation controls are excluded. Parent and
child hits are deduplicated at query time so a passage does not appear several
times because of its visual wrapper.

Queries are normalized for diacritics, whitespace, Latin combining accents and
common Arabic orthographic variants (alef, ya, ta marbuta). Displayed excerpts
retain the exact original text and highlight actual match positions using a
UTF-16 offset map. Results are ranked by phrase match, heading/chapter relevance
and proximity. Every hit is reachable by successive **Show more** batches; the
first 30 are displayed immediately for performance. Search navigation focuses
the real passage without changing the authored chapter sources.

**Revision safety:** The persistent `11am-hikam-show-revisions-v1` setting is
changed only by the user's Tools checkbox. A search result inside an otherwise
hidden `.end-block` reveals *that block only*, temporarily, with an inline
notice and **Hide preview** button. It never updates localStorage or the
checkbox. Another search result closes the previous preview. The separate
print checkbox still governs PDF revision pages independently.

After changes, run `python src/build.py`, `python src/build.py --check`, and the
existing publication/sidebar/revision tests plus `python src/tests/verify_search_integrity.py`.
Perform a Chromium smoke test with both Arabic and English, a 100+ match term,
and search navigation to a hidden revision block before publishing.
