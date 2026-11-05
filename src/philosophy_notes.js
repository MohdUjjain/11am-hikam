(function(){
  'use strict';

  var PX_PER_MM = 96 / 25.4;
  var PAGE_H_MM   = 297;
  var HEADER_MM   = 25;
  var FOOTER_MM   = 22;
  var CONTENT_BUDGET_PX = (PAGE_H_MM - HEADER_MM - FOOTER_MM) * PX_PER_MM; // ~944.9px
  var MEASURE_WIDTH_MM = 210 - 9 - 9;
  var CONTENT_TOP_PAD_MM = 6;
  var EFFECTIVE_BUDGET_PX = CONTENT_BUDGET_PX - (CONTENT_TOP_PAD_MM * PX_PER_MM);
  var SAFETY_PX = 4; // small cushion against sub-pixel rounding

  var state = { transformed:false, filterIds:null };

  // ---- Measurement -------------------------------------------------
  // Probe uses the EXACT same classes/lang/dir the final rendered content
  // will have (js-page-content + chapter-body/end-block + rtl if
  // applicable), because font-size and line-height differ between the
  // Latin and Amiri (RTL) print rules, and between chapter-body and
  // end-block. Measuring with a generic class understated real heights
  // and caused pages to overflow their physical 297mm — this fixes that
  // at the source instead of padding the budget with a guess.
  function measureConsumedHeights(items, contentClass, isRTL, lang){
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; top:0; ' +
      'width:' + MEASURE_WIDTH_MM + 'mm; box-sizing:border-box;';
    probe.className = 'js-page-content ' + contentClass + (isRTL ? ' rtl' : '');
    if (lang) probe.setAttribute('lang', lang);
    document.body.appendChild(probe);
    for (var i=0;i<items.length;i++){ probe.appendChild(items[i]); }
    var tops = items.map(function(el){ return el.offsetTop; });
    var totalH = probe.scrollHeight;
    document.body.removeChild(probe);

    var heights = [];
    for (var j=0;j<items.length;j++){
      var next = (j+1 < items.length) ? tops[j+1] : totalH;
      heights.push(next - tops[j]);
    }
    return heights;
  }

  function isHeading(el){
    return el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4';
  }

  // ---- Bin packing ---------------------------------------------------
  // Pass 1: plain greedy packing. Every item is pushed exactly once —
  // no conditional skipping, so nothing can be silently dropped.
  // Pass 2: separate, simple post-process moves a trailing heading off
  // the end of a page (other than the last page) onto the front of the
  // next one, only when that page has more than just the heading, so an
  // empty page can never be created.
  function binPack(items, heights, budgetPx){
    var pages = [];
    var current = [];
    var currentH = 0;

    for (var i=0;i<items.length;i++){
      var h = heights[i];
      if (current.length > 0 && currentH + h > budgetPx){
        pages.push(current);
        current = [];
        currentH = 0;
      }
      current.push(items[i]);
      currentH += h;
    }
    if (current.length) pages.push(current);

    for (var p=0; p<pages.length-1; p++){
      var pg = pages[p];
      while (pg.length > 1 && isHeading(pg[pg.length-1])){
        pages[p+1].unshift(pg.pop());
      }
    }
    return pages;
  }

  // ---- Page construction ----------------------------------------------
  function buildPage(itemGroup, opts){
    var page = document.createElement('div');
    page.className = 'js-print-page ' + (opts.dark ? 'js-dark' : 'js-light') + (opts.rtl ? ' js-rtl' : '');
    if (opts.hue !== undefined && opts.hue !== ''){ page.style.setProperty('--hue', opts.hue); }

    var header = document.createElement('div');
    header.className = 'js-page-header';
    var kicker = document.createElement('span');
    kicker.className = 'js-ph-kicker';
    kicker.textContent = opts.kicker;
    var title = document.createElement('span');
    title.className = 'js-ph-title';
    title.textContent = opts.title;
    header.appendChild(kicker);
    header.appendChild(title);
    page.appendChild(header);

    var content = document.createElement('div');
    content.className = 'js-page-content ' + opts.contentClass + (opts.rtl ? ' rtl' : '');
    if (opts.hue !== undefined && opts.hue !== ''){ content.style.setProperty('--hue', opts.hue); }
    if (opts.lang) content.setAttribute('lang', opts.lang);
    for (var i=0;i<itemGroup.length;i++){ content.appendChild(itemGroup[i]); }
    page.appendChild(content);

    var footer = document.createElement('div');
    footer.className = 'js-page-footer';
    page.appendChild(footer);

    return page;
  }

  // ---- Flow orchestration ----------------------------------------------
  function paginateFlow(items, opts){
    var heights = measureConsumedHeights(items, opts.contentClass, opts.rtl, opts.lang);
    var groups = binPack(items, heights, EFFECTIVE_BUDGET_PX - SAFETY_PX - (opts.extraSafetyPx || 0));
    var pages = [];
    for (var g=0; g<groups.length; g++){
      pages.push(buildPage(groups[g], opts));
    }
    return pages;
  }

  function collectChildren(el){
    return Array.prototype.slice.call(el.children);
  }

  // ---- Per-chapter processing --------------------------------------
  function paginateChapter(section){
    var isRTL = section.classList.contains('rtl');
    var hue = section.style.getPropertyValue('--hue');
    var lang = section.getAttribute('lang');

    var kickerEl = section.querySelector('.chapter-kicker');
    var subtopicText = '';
    if (kickerEl){
      for (var kc=0; kc<kickerEl.childNodes.length; kc++){
        var node = kickerEl.childNodes[kc];
        if (node.nodeType === 1 && node.classList && node.classList.contains('dot')) break;
        subtopicText += node.textContent;
      }
      subtopicText = subtopicText.trim();
    }
    var titleEl = section.querySelector('.chapter-title');
    var titleText = titleEl ? titleEl.textContent.trim() : '';
    // Empirical print guard for the long, mixed-component 3.4 excerpts:
    // measured in Chromium after full page construction. Their nested tables/
    // lists can consume additional vertical space beyond offsetTop estimates.
    // Limit this correction to the two observed chapters, leaving every
    // previously-shipped chapter's pagination untouched.
    var extraSafetyPx = (section.id === 'ch3-4-3' || section.id === 'ch3-4-4') ? 76 : 0;

    var body = section.querySelector('.chapter-body');
    var endnav = section.querySelector('.chapter-endnav');
    var endblock = section.querySelector('.end-block');
    if (!body || !endblock) return null;

    // Clone so the original on-screen DOM is never touched. Cloning (not
    // moving) means printing is non-destructive: nothing to restore
    // afterward, screen view is simply untouched the entire time.
    var bodyClone = body.cloneNode(true);
    var bodyItems = collectChildren(bodyClone);
    if (endnav){ bodyItems.push(endnav.cloneNode(true)); }

    var lightPages = paginateFlow(bodyItems, {
      dark:false, rtl:isRTL, hue:hue, lang:lang,
      kicker: subtopicText, title: titleText,
      contentClass: 'chapter-body', extraSafetyPx:extraSafetyPx
    });

    var ekickEl = endblock.querySelector('.ekick');
    var revisionLabel = 'Revision · ' + (ekickEl ? ekickEl.textContent.replace(/.*·/,'').trim() : '');
    var endblockClone = endblock.cloneNode(true);
    var ebItems = collectChildren(endblockClone);

    var darkPages = paginateFlow(ebItems, {
      dark:true, rtl:isRTL, hue:hue, lang:lang,
      kicker: subtopicText, title: revisionLabel,
      contentClass: 'end-block', extraSafetyPx:extraSafetyPx
    });

    var frag = document.createDocumentFragment();
    for (var i=0;i<lightPages.length;i++) frag.appendChild(lightPages[i]);
    body.parentNode.insertBefore(frag, body);

    var frag2 = document.createDocumentFragment();
    for (var j=0;j<darkPages.length;j++) frag2.appendChild(darkPages[j]);
    endblock.parentNode.insertBefore(frag2, endblock);

    body.classList.add('js-print-source');
    if (endnav) endnav.classList.add('js-print-source');
    endblock.classList.add('js-print-source');

    return { lightCount: lightPages.length, darkCount: darkPages.length,
             allPages: lightPages.concat(darkPages) };
  }

  // ---- Reset ----------------------------------------------------------
  // Makes paginateDocument() safely re-runnable with a DIFFERENT chapter
  // selection on every print action (needed for the sidebar's custom-range
  // print), instead of the old permanent one-shot guard. Removes every
  // previously generated .js-print-page and un-hides anything the last run
  // marked as a print source, so each call starts from a clean slate.
  function resetPagination(){
    var oldPages = document.querySelectorAll('.js-print-page');
    for (var i=0;i<oldPages.length;i++){
      oldPages[i].parentNode.removeChild(oldPages[i]);
    }
    var sources = document.querySelectorAll('.js-print-source');
    for (var j=0;j<sources.length;j++){ sources[j].classList.remove('js-print-source'); }
  }

  // filterIds: null/undefined => every chapter (normal full-book print).
  // Otherwise an array of section ids ("ch2-1-3", ...) to include; every
  // other chapter is skipped AND marked .print-exclude so its untouched
  // frontmatter (which this script never processes) is also hidden by the
  // print-exclude CSS rule, not just its body/endnav/end-block.
  function paginateDocument(filterIds){
    resetPagination();
    var allSections = Array.prototype.slice.call(document.querySelectorAll('section.chapter'));
    var sections = allSections;
    if (filterIds){
      sections = allSections.filter(function(s){ return filterIds.indexOf(s.id) !== -1; });
      for (var a=0;a<allSections.length;a++){
        if (filterIds.indexOf(allSections[a].id) === -1){ allSections[a].classList.add('print-exclude'); }
        else { allSections[a].classList.remove('print-exclude'); }
      }
    } else {
      for (var b=0;b<allSections.length;b++){ allSections[b].classList.remove('print-exclude'); }
    }

    var results = [];
    for (var i=0;i<sections.length;i++){
      var r = paginateChapter(sections[i]);
      if (r) results.push(r);
    }
    var allPages = [];
    for (var k=0;k<results.length;k++){ allPages = allPages.concat(results[k].allPages); }
    var total = allPages.length;
    for (var n=0;n<allPages.length;n++){
      var footer = allPages[n].querySelector('.js-page-footer');
      if (footer) footer.textContent = (n+1) + ' / ' + total;
    }
    state.transformed = true;
    window.__jsPagDebug = results;
  }

  window.__runPagination = paginateDocument;
  window.addEventListener('beforeprint', function(){ paginateDocument(state.filterIds); });
  window.addEventListener('afterprint', function(){
    state.filterIds = null;
    var excluded = document.querySelectorAll('.print-exclude');
    for (var i=0;i<excluded.length;i++){ excluded[i].classList.remove('print-exclude'); }
  });

  // Narrow, explicit interface for the sidebar module below (a separate
  // closure) to request a filtered print without reaching into this
  // closure's private `state` directly.
  window.__printControl = {
    setFilter: function(ids){ state.filterIds = ids; },
    clearFilter: function(){ state.filterIds = null; }
  };
})();

/* ============================================================
   SIDEBAR NAVIGATION + CUSTOM-RANGE PRINT
   Self-building: reads Topic dividers (#t1, #t2 ...) and every
   section.chapter's own .chapter-kicker text to construct the
   Topic -> Sub-topic -> Chapter tree. Add a new chapter/topic to
   the document and this rebuilds itself on next load -- nothing
   here needs to be hand-maintained the way the old .quicknav bar
   did (that's exactly why it was removed).
   ============================================================ */
(function(){
  'use strict';

  var chapters = [];      // ordered flat list: {id, num, flat, title, titleHTML, isRTL, subKey, subLabelHTML, topicKey}
  var topicTitles = {};   // "1" -> {en:"Introduction to Philosophy", arHTML:'<span class="ar" lang="ar">...</span>'}

  // Returns the kicker's "N.N · label" segment as an HTML string (not
  // plain text), so any embedded <span class="ar"> survives into the
  // sidebar and keeps its Arabic font via the existing global
  // `.ar, [lang="ar"]` rule -- nothing sidebar-specific needed for that.
  function readSubtopicHTML(section){
    var kickerEl = section.querySelector('.chapter-kicker');
    var html = '';
    if (kickerEl){
      for (var i=0;i<kickerEl.childNodes.length;i++){
        var node = kickerEl.childNodes[i];
        if (node.nodeType === 1 && node.classList && node.classList.contains('dot')) break;
        html += (node.nodeType === 1) ? node.outerHTML : node.textContent;
      }
    }
    return html.trim();
  }

  function collectStructure(){
    var dividers = document.querySelectorAll('.part-divider[id^="t"]');
    for (var d=0; d<dividers.length; d++){
      var m = dividers[d].id.match(/^t(\d+)$/);
      if (!m) continue;
      var enEl = dividers[d].querySelector('.pd-en-title');
      var arEl = dividers[d].querySelector('h1.ar');
      topicTitles[m[1]] = {
        en: enEl ? enEl.textContent.trim() : ('Topic ' + m[1]),
        arHTML: arEl ? arEl.outerHTML : ''
      };
    }

    var sections = Array.prototype.slice.call(document.querySelectorAll('section.chapter'));
    for (var i=0;i<sections.length;i++){
      var sec = sections[i];
      var num = sec.id.replace(/^ch/, '').replace(/-/g, '.');       // "2.1.3"
      var topicKey = num.split('.')[0];                              // "2"
      var subKey = num.split('.').slice(0,2).join('.');              // "2.1"
      var subFullHTML = readSubtopicHTML(sec);                       // "2.1 &middot; Politics" (HTML)
      var subLabelHTML = subFullHTML.replace(/^[\d.]+\s*·\s*/, '') || subFullHTML;
      var titleEl = sec.querySelector('.chapter-title');
      var isRTL = sec.classList.contains('rtl');
      chapters.push({
        id: sec.id,
        num: num,
        flat: i + 1,
        title: titleEl ? titleEl.textContent.trim() : num,
        isRTL: isRTL,
        subKey: subKey,
        subLabelHTML: subLabelHTML || subKey,
        topicKey: topicKey
      });
    }
  }

  // ---- Tree rendering ---------------------------------------------------
  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function buildTree(container){
    var topicOrder = [];
    var topicMap = {};   // key -> { subMap:{}, subOrder:[] }

    for (var i=0;i<chapters.length;i++){
      var c = chapters[i];
      if (!topicMap[c.topicKey]){
        topicMap[c.topicKey] = { subMap:{}, subOrder:[] };
        topicOrder.push(c.topicKey);
      }
      var t = topicMap[c.topicKey];
      if (!t.subMap[c.subKey]){
        t.subMap[c.subKey] = [];
        t.subOrder.push(c.subKey);
      }
      t.subMap[c.subKey].push(c);
    }

    for (var ti=0; ti<topicOrder.length; ti++){
      var tk = topicOrder[ti];
      var topicNode = el('div', 'toc-node toc-topic');
      var topicHead = el('button', 'toc-node-head');
      topicHead.type = 'button';
      topicHead.setAttribute('aria-expanded', 'false');
      var tt = topicTitles[tk] || { en:'Topic '+tk, arHTML:'' };
      topicHead.innerHTML = '<span class="toc-chevron">&#9656;</span><span>Topic ' + tk +
        (tt.arHTML ? ' &middot; ' + tt.arHTML : '') + ' &middot; ' + tt.en + '</span>';
      var topicChildren = el('div', 'toc-children');
      var topicChildrenInner = el('div', 'toc-children-inner');
      topicChildren.appendChild(topicChildrenInner);

      var t = topicMap[tk];
      for (var si=0; si<t.subOrder.length; si++){
        var sk = t.subOrder[si];
        var chs = t.subMap[sk];
        var subNode = el('div', 'toc-node toc-subtopic');
        var subHead = el('button', 'toc-node-head');
        subHead.type = 'button';
        subHead.setAttribute('aria-expanded', 'false');
        subHead.innerHTML = '<span class="toc-chevron">&#9656;</span><span>' + sk +
          ' &middot; ' + chs[0].subLabelHTML + '</span>';
        var subChildren = el('div', 'toc-children');
        var subChildrenInner = el('div', 'toc-children-inner');
        subChildren.appendChild(subChildrenInner);

        for (var ci=0; ci<chs.length; ci++){
          var c2 = chs[ci];
          var a = el('a', 'toc-chapter-link');
          a.href = '#' + c2.id;
          a.dataset.chapterId = c2.id;
          var numSpan = el('span', 'num', '#' + c2.flat);
          a.appendChild(numSpan);
          a.appendChild(el('span', 'dossier-num', c2.num));
          var titleSpan = el('span', 'title');
          if (c2.isRTL){
            titleSpan.classList.add('ar');
            titleSpan.setAttribute('lang', 'ar');
          }
          titleSpan.textContent = c2.title;
          a.appendChild(titleSpan);
          subChildrenInner.appendChild(a);
        }

        subHead.addEventListener('click', makeToggleHandler(subNode, subHead));
        subNode.appendChild(subHead);
        subNode.appendChild(subChildren);
        topicChildrenInner.appendChild(subNode);
      }

      topicHead.addEventListener('click', makeToggleHandler(topicNode, topicHead));
      topicNode.appendChild(topicHead);
      topicNode.appendChild(topicChildren);
      container.appendChild(topicNode);
    }
  }

  // Expand/collapse is ONLY ever triggered from here (a direct click on a
  // node's own header). Nothing else in this file is allowed to add or
  // remove the "expanded" class -- scroll-tracking below deliberately only
  // ever touches "active"/"has-active", never "expanded", so a group the
  // user closed stays closed no matter what they scroll past.
  function makeToggleHandler(node, headBtn){
    return function(ev){
      ev.stopPropagation();
      var expanded = node.classList.toggle('expanded');
      headBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };
  }

  // ---- Scroll-spy: highlight only, never expands/collapses anything ----
  function wireScrollSpy(){
    if (!('IntersectionObserver' in window)) return;
    var sections = document.querySelectorAll('section.chapter');
    var observer = new IntersectionObserver(function(entries){
      var best = null, bestRatio = 0;
      entries.forEach(function(entry){
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio){
          bestRatio = entry.intersectionRatio; best = entry.target;
        }
      });
      if (!best) return;
      setActive(best.id);
    }, { threshold: [0, .1, .25, .5] });
    for (var i=0;i<sections.length;i++){ observer.observe(sections[i]); }
  }

  function setActive(chapterId){
    var prevActive = document.querySelectorAll('.toc-chapter-link.active');
    for (var i=0;i<prevActive.length;i++){ prevActive[i].classList.remove('active'); }
    var prevHas = document.querySelectorAll('.toc-node.has-active');
    for (var j=0;j<prevHas.length;j++){ prevHas[j].classList.remove('has-active'); }

    var link = document.querySelector('.toc-chapter-link[data-chapter-id="' + chapterId + '"]');
    if (!link) return;
    link.classList.add('active');
    var node = link.closest('.toc-node');
    while (node){
      node.classList.add('has-active');
      node = node.parentElement ? node.parentElement.closest('.toc-node') : null;
    }
  }

  // ---- Sidebar open/close (slides in from the side; user-controlled) ---
  // Keyboard behavior: Escape closes and returns focus to the FAB; opening
  // moves focus into the panel; Tab/Shift+Tab are trapped inside the
  // sidebar while it's open, same as any standard slide-out drawer.
  //
  // The FAB is the ONLY way to *open* the sidebar, and hides itself (rather
  // than turning into a second "X") the instant it's open -- there is
  // exactly one visible close affordance at a time, #tocSidebarClose,
  // instead of two overlapping X icons.
  function wireSidebarToggle(){
    var fab = document.getElementById('tocFab');
    var sidebar = document.getElementById('tocSidebar');
    var closeBtn = document.getElementById('tocSidebarClose');
    if (!fab || !sidebar) return;

    function focusableInSidebar(){
      return Array.prototype.slice.call(
        sidebar.querySelectorAll('button, a[href], input:not([disabled])')
      ).filter(function(el){ return el.offsetParent !== null; });
    }

    function open(){
      sidebar.classList.add('open');
      fab.setAttribute('aria-expanded', 'true');
      fab.classList.add('is-hidden');
      fab.setAttribute('tabindex', '-1');
      (closeBtn || sidebar).focus();
      document.addEventListener('keydown', onKeydown);
    }

    function close(){
      sidebar.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.classList.remove('is-hidden');
      fab.removeAttribute('tabindex');
      document.removeEventListener('keydown', onKeydown);
      fab.focus();
    }

    function onKeydown(ev){
      if (ev.key === 'Escape'){
        ev.preventDefault();
        close();
        return;
      }
      if (ev.key !== 'Tab') return;
      var items = focusableInSidebar();
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first){
        ev.preventDefault(); last.focus();
      } else if (!ev.shiftKey && document.activeElement === last){
        ev.preventDefault(); first.focus();
      }
    }

    fab.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  // ---- Custom-range print --------------------------------------------
  // Accepts things like "8-10,1,15" against the flat #N numbering shown
  // next to every chapter in the sidebar (not the 1.1.1-style dossier
  // number, which isn't sequential across the whole book).
  function parseRange(input, max){
    var out = [];
    var parts = input.split(',');
    for (var i=0;i<parts.length;i++){
      var p = parts[i].trim();
      if (!p) continue;
      var m = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m){
        var lo = parseInt(m[1],10), hi = parseInt(m[2],10);
        if (lo > hi){ var tmp=lo; lo=hi; hi=tmp; }
        for (var n=lo; n<=hi; n++){ if (n>=1 && n<=max) out.push(n); }
      } else if (/^\d+$/.test(p)){
        var v = parseInt(p,10);
        if (v>=1 && v<=max) out.push(v);
      } else {
        return { error: 'Could not read "' + p + '" — use numbers, dashes, and commas only.' };
      }
    }
    if (!out.length) return { error: 'No valid chapter numbers found.' };
    var seen = {}, ids = [];
    for (var k=0;k<out.length;k++){
      var flatNum = out[k];
      var chap = chapters[flatNum-1];
      if (chap && !seen[chap.id]){ seen[chap.id]=true; ids.push(chap.id); }
    }
    return { ids: ids };
  }

  function wirePrintPanel(){
    var input = document.getElementById('tocPrintRange');
    var btnSelected = document.getElementById('tocPrintSelected');
    var btnAll = document.getElementById('tocPrintAll');
    var errEl = document.getElementById('tocPrintError');
    if (!input || !btnSelected || !btnAll) return;

    btnAll.addEventListener('click', function(){
      if (errEl) errEl.textContent = '';
      window.__printControl.clearFilter();
      window.print();
    });

    btnSelected.addEventListener('click', function(){
      var res = parseRange(input.value, chapters.length);
      if (res.error){
        if (errEl) errEl.textContent = res.error;
        return;
      }
      if (errEl) errEl.textContent = '';
      window.__printControl.setFilter(res.ids);
      window.print();
    });
  }

  // Writes each chapter's own flat #N (matching the number shown next to
  // it in the sidebar and used by the print-range box) onto its own
  // opening page, appended to the vertical "DOSSIER x.x.x" badge. Runs
  // once at load, directly on the live DOM (not a clone), so it's already
  // in place by the time either the screen view or a print action reads
  // that element -- no separate print-specific handling needed.
  function injectFlatNumbers(){
    for (var i=0;i<chapters.length;i++){
      var sec = document.getElementById(chapters[i].id);
      if (!sec) continue;
      var span = sec.querySelector('.chapter-tabnum span');
      if (span){ span.textContent = span.textContent.trim() + ' \u00B7 #' + chapters[i].flat; }
    }
  }

  function init(){
    collectStructure();
    injectFlatNumbers();
    var container = document.getElementById('tocTree');
    if (container){ buildTree(container); }
    wireSidebarToggle();
    wirePrintPanel();
    wireScrollSpy();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
