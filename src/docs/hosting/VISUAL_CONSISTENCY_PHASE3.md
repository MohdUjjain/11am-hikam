# Phase 3 — publication identity, sidebar hierarchy and UI maintenance

- The published book keeps its scholarly cover title **Philosophy — The Complete Dossier** while the cover running brand now reads **11AM · Takhassus Hikam Dossier**, matching the site, manifest and installed app. Do not rewrite the authored dossier text or chapter titles for branding.
- **Expand all levels / Collapse all levels** now cover Topic, Sub-topic **and chapter section (§) lists**. They persist the user's manual expansion choices for the current session. The chapter active-location marker never expands collapsed groups on scroll.
- The Tools tab shows **Continue reading** only when a saved reading place exists, and keeps **Revision visibility**, **Print / Export PDF** and **Offline reading** in one consistent navy/gold card system. Revision visibility persists locally; print inclusion remains independent.
- Screen chrome small-text and contrast have been strengthened (including the former `#A87C1F` small dossier number against navy). These rules must not modify print geometry, semantic content callouts, Arabic inherited fonts, or CSS `--hue` chapter palette.
- Removed abandoned `.quicknav` CSS, sidebar `.toc-search-tools` CSS, inactive sidebar `wireSearch()` logic and its unused `data-search-text` attributes. The **top-bar full-book search remains untouched**.
- Test with: `python src/build.py --check`, all existing publication validations, `python src/tests/verify_visual_polish.py`, desktop/mobile Chromium smoke, and a selected-chapter print check.
