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

  var state = { transformed:false, filterIds:null, includeRevision:true, printMarkers:null };

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
    // Section anchors belong to the live reading DOM. Avoid duplicate IDs
    // in the generated print pages (their headings are cloned).
    bodyClone.querySelectorAll('[id^="toc-sec-"]').forEach(function(el){el.removeAttribute('id');});
    var bodyItems = collectChildren(bodyClone);
    if (endnav){ bodyItems.push(endnav.cloneNode(true)); }

    var lightPages = paginateFlow(bodyItems, {
      dark:false, rtl:isRTL, hue:hue, lang:lang,
      kicker: subtopicText, title: titleText,
      contentClass: 'chapter-body', extraSafetyPx:extraSafetyPx
    });

    var darkPages = [];
    if (state.includeRevision) {
      var ekickEl = endblock.querySelector('.ekick');
      var revisionLabel = 'Revision · ' + (ekickEl ? ekickEl.textContent.replace(/.*·/,'').trim() : '');
      var endblockClone = endblock.cloneNode(true);
      // A temporary, screen-only search preview is not revision content.
      // Exclude it before the measuring rig calculates printed page heights.
      endblockClone.querySelectorAll('.reader-temporary-revision-note').forEach(function(note){note.remove();});
      darkPages = paginateFlow(collectChildren(endblockClone), {
        dark:true, rtl:isRTL, hue:hue, lang:lang,
        kicker: subtopicText, title: revisionLabel,
        contentClass: 'end-block', extraSafetyPx:extraSafetyPx
      });
    }

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

  // Reorder selected chapters only during the browser's print lifecycle.
  // Comments mark their original locations so the reading DOM is restored
  // exactly after printing (including canceled print dialogs). This is
  // necessary for selections such as 8-10,1; merely filtering printed
  // chapters would silently print them in document order instead.
  function stageSelectedOrder(ids){
    if (!ids || state.printMarkers) return;
    var markers = [];
    for (var i=0; i<ids.length; i++) {
      var section = document.getElementById(ids[i]);
      if (!section || section.parentNode !== document.body) continue;
      var marker = document.createComment('Hikam print: original chapter position');
      section.parentNode.insertBefore(marker, section);
      document.body.appendChild(section);
      markers.push({section:section, marker:marker});
    }
    state.printMarkers = markers;
  }
  function restoreSelectedOrder(){
    var markers = state.printMarkers;
    if (!markers) return;
    for (var i=0; i<markers.length; i++) {
      var item = markers[i];
      if (item.marker.parentNode) item.marker.parentNode.replaceChild(item.section, item.marker);
    }
    state.printMarkers = null;
  }
  window.__runPagination = paginateDocument;
  window.addEventListener('beforeprint', function(){
    if (state.filterIds && state.filterIds.length) {
      stageSelectedOrder(state.filterIds);
      document.body.classList.add('print-chapters-only');
    } else {
      document.body.classList.remove('print-chapters-only');
    }
    paginateDocument(state.filterIds);
  });
  window.addEventListener('afterprint', function(){
    resetPagination();
    restoreSelectedOrder();
    document.body.classList.remove('print-chapters-only');
    state.filterIds = null;
    var excluded = document.querySelectorAll('.print-exclude');
    for (var i=0;i<excluded.length;i++){ excluded[i].classList.remove('print-exclude'); }
  });

  // Typed-order selection and optional revision pages, without exposing
  // pagination internals or changing the book's CSS print templates.
  window.__printControl = {
    setFilter: function(ids){ state.filterIds = ids.slice(); },
    clearFilter: function(){ state.filterIds = null; },
    includeRevision: function(value){ state.includeRevision = !!value; }
  };
})();

/* ============================================================
   ACCESSIBLE CONTENTS DRAWER + PDF/PRINT CONTROLS
   Topic -> Subtopic -> Chapter -> Section, generated from the book.
   State rules: reader-controlled collapses never change with scroll-spy;
   search expansion is temporary; native chapter text stays untouched.
   ============================================================ */
(function(){
  'use strict';
  var chapters = [], topicTitles = {}, chapterLinks = {}, sectionLinks = {}, sidebar;
  var activeId = '', activeSectionId = '', scrollScheduled = false;

  function el(tag, cls, text){
    var node=document.createElement(tag);
    if(cls) node.className=cls;
    if(text!==undefined) node.textContent=text;
    return node;
  }
  function subtopicHTML(section){
    var kicker=section.querySelector('.chapter-kicker'), html='';
    if(!kicker) return '';
    for(var i=0;i<kicker.childNodes.length;i++){
      var node=kicker.childNodes[i];
      if(node.nodeType===1 && node.classList && node.classList.contains('dot')) break;
      html+=(node.nodeType===1) ? node.outerHTML : node.textContent;
    }
    return html.trim();
  }
  function sectionHeadingParts(heading){
    var marker=heading.querySelector('.secnum');
    var prefix=marker?marker.textContent.trim():'';
    var text=Array.from(heading.childNodes).filter(function(node){return node!==marker;})
      .map(function(node){return node.textContent||'';}).join(' ').replace(/\s+/g,' ').trim();
    return {marker:prefix,title:text,full:(prefix?prefix+' · ':'')+text};
  }
  function appendSectionHeading(target,heading,isRTL){
    var parts=sectionHeadingParts(heading);
    if(parts.marker){
      var prefix=document.createElement('bdi');prefix.dir='ltr';prefix.textContent=parts.marker;
      prefix.className='reader-section-marker';target.appendChild(prefix);
      target.appendChild(document.createTextNode(' · '));
    }
    var label=document.createElement('bdi');label.dir=isRTL?'rtl':'auto';
    if(isRTL)label.lang='ar';label.textContent=parts.title;target.appendChild(label);
  }

  function collectStructure(){
    document.querySelectorAll('.part-divider[id^="t"]').forEach(function(divider){
      var match=divider.id.match(/^t(\d+)$/);
      if(!match) return;
      var en=divider.querySelector('.pd-en-title'), ar=divider.querySelector('h1.ar');
      // The source uses a full <h1> for the divider. Do not transplant that
      // heading into a compact sidebar button: it creates oversized blocks.
      var arLabel='';
      if(ar){
        var compact=document.createElement('span');
        compact.className='ar';compact.lang='ar';compact.dir='rtl';
        compact.textContent=ar.textContent.trim();
        arLabel=compact.outerHTML;
      }
      topicTitles[match[1]]={en:en?en.textContent.trim():'Topic '+match[1],arHTML:arLabel};
    });
    document.querySelectorAll('section.chapter').forEach(function(sec,index){
      var num=sec.id.replace(/^ch/,'').replace(/-/g,'.');
      var bits=num.split('.'), full=subtopicHTML(sec);
      var title=sec.querySelector('.chapter-title');
      var sections=[];
      sec.querySelectorAll('.chapter-body h2.sec').forEach(function(h2,i){
        var id='toc-sec-'+sec.id+'-'+(i+1);
        // Stable deep-link targets without changing the authored fragments.
        if(!h2.id) h2.id=id;
        if(!h2.hasAttribute('tabindex')) h2.tabIndex=-1;
        sections.push({id:h2.id,title:sectionHeadingParts(h2).full});
      });
      chapters.push({id:sec.id, num:num, flat:index+1,
        title:title?title.textContent.trim():num,
        isRTL:sec.classList.contains('rtl'),
        subKey:bits.slice(0,2).join('.'), topicKey:bits[0],
        subLabelHTML:full.replace(/^[\d.]+\s*·\s*/,'')||full||bits.slice(0,2).join('.'),
        sections:sections});
    });
  }

  function setGroupExpanded(node, open, record){
    node.classList.toggle('expanded',!!open);
    var btn=node.querySelector(':scope > .toc-node-head');
    var box=node.querySelector(':scope > .toc-children');
    if(btn) btn.setAttribute('aria-expanded',String(!!open));
    if(box){box.inert=!open;box.setAttribute('aria-hidden',String(!open));}
    if(record!==false) node.dataset.manualExpanded=open?'true':'false';
  }
  function setSectionExpanded(wrap, open, record){
    wrap.classList.toggle('sections-open',!!open);
    var btn=wrap.querySelector('.toc-chapter-sections-toggle');
    var box=wrap.querySelector('.toc-section-list');
    if(btn){btn.setAttribute('aria-expanded',String(!!open));btn.setAttribute('aria-label',(open?'Hide':'Show')+' sections for '+wrap.dataset.chapterNumber);}
    if(box) box.hidden=!open;
    if(record!==false) wrap.dataset.manualSections=open?'true':'false';
  }

  function buildTree(container){
    var topics={},order=[];
    chapters.forEach(function(c){
      if(!topics[c.topicKey]){topics[c.topicKey]={subs:{},order:[]};order.push(c.topicKey);}
      var t=topics[c.topicKey];
      if(!t.subs[c.subKey]){t.subs[c.subKey]=[];t.order.push(c.subKey);}
      t.subs[c.subKey].push(c);
    });
    order.forEach(function(key){
      var tt=topicTitles[key]||{en:'Topic '+key,arHTML:''};
      var topic=el('div','toc-node toc-topic');
      var head=el('button','toc-node-head');head.type='button';
      head.innerHTML='<span class="toc-chevron" aria-hidden="true">&#9656;</span><span>Topic '+key+(tt.arHTML?' · '+tt.arHTML:'')+' · '+tt.en+'</span>';
      var body=el('div','toc-children'), inner=el('div','toc-children-inner');
      body.id='toc-topic-children-'+key;body.appendChild(inner);
      head.setAttribute('aria-controls',body.id);
      topic.appendChild(head);topic.appendChild(body);
      setGroupExpanded(topic,false,true);
      head.addEventListener('click',function(){setGroupExpanded(topic,!topic.classList.contains('expanded'),true);});
      topics[key].order.forEach(function(subKey){
        var sub=el('div','toc-node toc-subtopic'), subHead=el('button','toc-node-head');
        subHead.type='button';
        var cs=topics[key].subs[subKey];
        subHead.innerHTML='<span class="toc-chevron" aria-hidden="true">&#9656;</span><span>'+subKey+' · '+cs[0].subLabelHTML+'</span>';
        var subBody=el('div','toc-children'), subInner=el('div','toc-children-inner');
        subBody.id='toc-subtopic-children-'+subKey.replace('.','-');subBody.appendChild(subInner);
        subHead.setAttribute('aria-controls',subBody.id);
        sub.appendChild(subHead);sub.appendChild(subBody);
        setGroupExpanded(sub,false,true);
        subHead.addEventListener('click',function(){setGroupExpanded(sub,!sub.classList.contains('expanded'),true);});
        cs.forEach(function(c){
          var wrap=el('div','toc-chapter');wrap.dataset.chapterNumber='#'+c.flat;
          var row=el('div','toc-chapter-row');
          var a=el('a','toc-chapter-link');a.href='#'+c.id;
          a.dataset.chapterId=c.id;
          a.appendChild(el('span','num','#'+c.flat));
          a.appendChild(el('span','dossier-num',c.num));
          var title=el('span','title',c.title);
          if(c.isRTL){title.classList.add('ar');title.setAttribute('lang','ar');title.setAttribute('dir','rtl');}
          a.appendChild(title);row.appendChild(a);chapterLinks[c.id]=a;
          if(c.sections.length){
            var toggle=el('button','toc-chapter-sections-toggle','§');
            toggle.type='button';toggle.title='Show sections for #'+c.flat;
            var sectionList=el('div','toc-section-list');
            sectionList.id='toc-section-list-'+c.id;
            toggle.setAttribute('aria-controls',sectionList.id);
            c.sections.forEach(function(section){
              var link=el('a','toc-section-link');
              appendSectionHeading(link,document.getElementById(section.id),c.isRTL);
              link.href='#'+section.id;
              if(c.isRTL){link.setAttribute('lang','ar');link.setAttribute('dir','rtl');}
              sectionList.appendChild(link);sectionLinks[section.id]=link;
            });
            row.appendChild(toggle);wrap.appendChild(row);wrap.appendChild(sectionList);
            setSectionExpanded(wrap,false,true);
            toggle.addEventListener('click',function(){setSectionExpanded(wrap,!wrap.classList.contains('sections-open'),true);});
          } else wrap.appendChild(row);
          subInner.appendChild(wrap);
        });
        inner.appendChild(sub);
      });
      container.appendChild(topic);
    });
  }

  // "All" means the complete four-level Topic > Sub-topic > Chapter > § tree.
  // Preserve each reader-controlled accordion choice for subsequent navigation.
  function wireExpandControls(){
    var expand=document.getElementById('tocExpandAll');
    var collapse=document.getElementById('tocCollapseAll');
    function setAll(open){
      document.querySelectorAll('#tocTree .toc-node').forEach(function(node){
        setGroupExpanded(node,open,true);
      });
      document.querySelectorAll('#tocTree .toc-chapter').forEach(function(wrap){
        if(wrap.querySelector('.toc-chapter-sections-toggle')){
          setSectionExpanded(wrap,open,true);
        }
      });
    }
    if(expand)expand.addEventListener('click',function(){setAll(true);});
    if(collapse)collapse.addEventListener('click',function(){setAll(false);});
  }

  function setActive(id){
    if(id===activeId) return;
    if(chapterLinks[activeId]){
      chapterLinks[activeId].classList.remove('active');
      chapterLinks[activeId].removeAttribute('aria-current');
    }
    var old=document.querySelectorAll('#tocTree .toc-node.has-active');
    old.forEach(function(node){node.classList.remove('has-active');});
    activeId=id;
    var link=chapterLinks[id];if(!link) return;
    link.classList.add('active');link.setAttribute('aria-current','location');
    for(var node=link.closest('.toc-node');node;node=node.parentElement?node.parentElement.closest('.toc-node'):null){
      node.classList.add('has-active');
    }
    var chapter=chapters.find(function(c){return c.id===id;});
    var now=document.getElementById('tocReadingStatus');
    if(now && chapter) now.textContent='Reading #'+chapter.flat+' · '+chapter.title;
  }
  /* One scroll tracker owns chapter/section highlighting, both progress
     gauges, and locally saved reading position. No second competing spy. */
  function wireScrollSpy(){
    var STORAGE_KEY='11am-hikam-reading-place-v1';
    var els=chapters.map(function(c){return document.getElementById(c.id);}).filter(Boolean);
    var sectionsByChapter={};
    chapters.forEach(function(c){
      sectionsByChapter[c.id]=c.sections.map(function(s){return document.getElementById(s.id);}).filter(Boolean);
    });
    var header=document.getElementById('readingProgressHeader');
    var bookTrack=document.getElementById('readerBookTrack');
    var bookRail=document.getElementById('readerBookRail');
    var bookPct=document.getElementById('readerBookPercent');
    var ring=document.getElementById('readerChapterRing');
    var ringPct=document.getElementById('readerChapterPercent');
    var number=document.getElementById('readerCurrentNumber');
    var chapterPopover=document.getElementById('readerChapterPopover');
    var popoverNumber=document.getElementById('readerPopoverNumber');
    var popoverTitle=document.getElementById('readerPopoverTitle');
    var popoverSection=document.getElementById('readerPopoverSection');
    var lastPopoverChapter='';
    function hideChapterPopover(){
      if(chapterPopover)chapterPopover.hidden=true;
      if(number)number.setAttribute('aria-expanded','false');
    }
    if(number && chapterPopover){
      number.addEventListener('click',function(event){
        event.stopPropagation();var willShow=chapterPopover.hidden;
        chapterPopover.hidden=!willShow;number.setAttribute('aria-expanded',String(willShow));
      });
      document.addEventListener('pointerdown',function(ev){
        if(!chapterPopover.hidden && !chapterPopover.contains(ev.target) && ev.target!==number)
          hideChapterPopover();
      });
      document.addEventListener('keydown',function(ev){
        if(ev.key==='Escape'&&!chapterPopover.hidden){hideChapterPopover();number.focus();}
      });
    }
    var title=document.getElementById('readerCurrentTitle');
    var sectionLabel=document.getElementById('readerCurrentSection');
    var prompt=document.getElementById('resumeReaderPrompt');
    var description=document.getElementById('resumeReaderDescription');
    var resume=document.getElementById('resumeReaderContinue');
    var startOver=document.getElementById('resumeReaderStart');
    var forget=document.getElementById('resumeReaderForget');
    var dismiss=document.getElementById('resumeReaderDismiss');
    var resumeToolbar=document.getElementById('readerResumeShortcut');
    var resumeTools=document.getElementById('tocToolsResume');
    var resumeSection=document.getElementById('tocToolsResumeSection');
    var printing=false, allowSave=false, lastSavedAt=0, savedPosition=null;
    var wantsResumePrompt=false;
    var editionNotice=document.getElementById('editionUpdateNotice');
    function syncResumeNotice(){
      if(prompt)prompt.hidden=!wantsResumePrompt || !!(editionNotice && !editionNotice.hidden);
    }
    window.addEventListener('hikam:edition-notice',syncResumeNotice);
    var hasReadMovement=false, suspendUntil=0, pendingUserScroll=false;

    function cap(n){return Math.max(0,Math.min(1,n));}
    function percent(n){return Math.round(cap(n)*100);}
    function readSaved(){
      try{
        var value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
        if(value && value.version===1 && typeof value.chapterId==='string' &&
           els.some(function(el){return el.id===value.chapterId;}) &&
           Number.isFinite(value.chapterRatio) && value.chapterRatio>=0 && value.chapterRatio<=1)
          return value;
      }catch(err){/* private mode, blocked storage, or obsolete/corrupt value */}
      return null;
    }
    function clearSaved(){try{localStorage.removeItem(STORAGE_KEY);}catch(err){}}
    function syncContinueButtons(){
      if(resumeToolbar)resumeToolbar.hidden=!savedPosition;
      if(resumeTools)resumeTools.hidden=!savedPosition;
      if(resumeSection)resumeSection.hidden=!savedPosition;
    }
    function setSectionActive(id){
      if(id!==activeSectionId){
        if(sectionLinks[activeSectionId]){
          sectionLinks[activeSectionId].classList.remove('reading-active');
          sectionLinks[activeSectionId].removeAttribute('aria-current');
        }
        activeSectionId=id||'';
        if(sectionLinks[activeSectionId]){
          sectionLinks[activeSectionId].classList.add('reading-active');
          sectionLinks[activeSectionId].setAttribute('aria-current','location');
        }
      }
      // The chapter row remains visibly highlighted, but screen readers only
      // encounter one aria-current location: the section or its chapter.
      if(chapterLinks[activeId]){
        if(activeSectionId)chapterLinks[activeId].removeAttribute('aria-current');
        else chapterLinks[activeId].setAttribute('aria-current','location');
      }
    }
    function visibleRevisionEnd(chapter){
      var block=chapter.querySelector('.end-block');
      return block && block.getClientRects().length ? block : null;
    }
    function locateSection(chapter,centre){
      var items=sectionsByChapter[chapter.id]||[],section=null,index=-1;
      var end=visibleRevisionEnd(chapter);
      if(end && end.getBoundingClientRect().top<=centre)return {node:null,index:-1,revision:true};
      for(var k=0;k<items.length;k++){
        if(items[k].getBoundingClientRect().top<=centre){section=items[k];index=k;}
        else break;
      }
      return {node:section,index:index,revision:false};
    }
    function makePosition(chapter,section,centre){
      var rect=chapter.getBoundingClientRect();
      var result={version:1,chapterId:chapter.id,
        chapterRatio:cap((centre-rect.top)/Math.max(1,rect.height))};
      if(section.node){
        var nodes=sectionsByChapter[chapter.id]||[];
        var start=section.node.getBoundingClientRect().top;
        var next=nodes[section.index+1];
        var endBlock=visibleRevisionEnd(chapter);
        var finish=next?next.getBoundingClientRect().top:
          (endBlock?endBlock.getBoundingClientRect().top:rect.bottom);
        result.sectionId=section.node.id;
        result.sectionRatio=cap((centre-start)/Math.max(1,finish-start));
      }
      return result;
    }
    function saveLocation(position,force){
      if(!allowSave||printing||Date.now()<suspendUntil||!position)return;
      // Do not replace a useful bookmark just because the browser reopened
      // at the cover, or scrolled as part of print/page restoration.
      if(!hasReadMovement && !force)return;
      var now=Date.now();if(!force && now-lastSavedAt<650)return;
      try{
        localStorage.setItem(STORAGE_KEY,JSON.stringify(position));
        savedPosition=position;syncContinueButtons();
        lastSavedAt=now;
      }catch(err){/* storage can be unavailable or full */}
    }
    function update(fromScroll){
      scrollScheduled=false;
      if(printing)return;
      var centre=window.innerHeight*.42, best=null;
      for(var i=0;i<els.length;i++){
        var rect=els[i].getBoundingClientRect();
        if(rect.top<=centre)best=els[i];
        if(rect.top<=centre && rect.bottom>centre){best=els[i];break;}
        if(rect.top>centre)break;
      }
      var available=document.documentElement.scrollHeight-window.innerHeight;
      var whole=available>0?cap(window.scrollY/available):0;
      var overall=percent(whole);
      if(bookRail)bookRail.style.width=(whole*100)+'%';
      if(bookPct)bookPct.textContent=overall+'%';
      if(bookTrack){
        bookTrack.setAttribute('aria-valuenow',String(overall));
        bookTrack.setAttribute('aria-valuetext',overall+'% through the complete book');
      }
      if(!best){
        if(number){number.textContent='Complete dossier';number.setAttribute('aria-label','Show current chapter title');}
        if(popoverNumber)popoverNumber.textContent='Complete dossier';
        if(popoverTitle)popoverTitle.textContent='Start reading';
        if(popoverSection)popoverSection.hidden=true;
        if(lastPopoverChapter){hideChapterPopover();lastPopoverChapter='';}
        if(title){title.textContent='Start reading';title.removeAttribute('lang');title.dir='auto';}
        if(sectionLabel)sectionLabel.hidden=true;
        if(ring){ring.style.setProperty('--chapter-progress','0%');ring.setAttribute('aria-valuenow','0');ring.setAttribute('aria-valuetext','No chapter selected');}
        if(ringPct)ringPct.textContent='—';
        setActive('');setSectionActive('');
        return;
      }
      setActive(best.id);
      var ch=chapters.find(function(c){return c.id===best.id;});
      var rect=best.getBoundingClientRect();
      var chapterProgress=cap((centre-rect.top)/Math.max(1,rect.height));
      var chapterPercent=percent(chapterProgress);
      if(ring){
        ring.style.setProperty('--chapter-progress',(chapterProgress*100)+'%');
        ring.setAttribute('aria-valuenow',String(chapterPercent));
        ring.setAttribute('aria-valuetext',chapterPercent+'% through Chapter '+ch.num);
      }
      if(ringPct)ringPct.textContent=chapterPercent+'%';
      if(lastPopoverChapter!==ch.id){hideChapterPopover();lastPopoverChapter=ch.id;}
      if(number){
        number.textContent='Chapter '+ch.num;
        number.setAttribute('aria-label','Show full title of Chapter '+ch.num);
      }
      if(popoverNumber)popoverNumber.textContent='Chapter '+ch.num;
      if(popoverTitle){
        popoverTitle.textContent=ch.title;
        popoverTitle.dir=ch.isRTL?'rtl':'auto';
        if(ch.isRTL)popoverTitle.lang='ar';else popoverTitle.removeAttribute('lang');
      }
      if(title){
        title.textContent=ch.title;
        title.dir=ch.isRTL?'rtl':'auto';
        if(ch.isRTL)title.setAttribute('lang','ar');
        else title.removeAttribute('lang');
      }
      var section=locateSection(best,centre);
      setSectionActive(section.node?section.node.id:'');
      if(sectionLabel){
        sectionLabel.hidden=!section.node&&!section.revision;
        if(!sectionLabel.hidden){
          sectionLabel.replaceChildren();
          if(section.revision)sectionLabel.textContent='Revision & recall';
          else appendSectionHeading(sectionLabel,section.node,ch.isRTL);
          if(section.node && ch.isRTL){sectionLabel.lang='ar';sectionLabel.dir='auto';}
          else{sectionLabel.removeAttribute('lang');sectionLabel.dir='auto';}
        }
      }
      if(popoverSection){
        popoverSection.replaceChildren();
        popoverSection.hidden=!section.node&&!section.revision;
        if(section.revision)popoverSection.textContent='Revision & recall';
        else if(section.node)appendSectionHeading(popoverSection,section.node,ch.isRTL);
      }
      if(fromScroll && window.scrollY>100)hasReadMovement=true;
      saveLocation(makePosition(best,section,centre),false);
    }
    function request(fromScroll){
      if(fromScroll)pendingUserScroll=true;
      if(!scrollScheduled){
        scrollScheduled=true;
        requestAnimationFrame(function(){
          var userMoved=pendingUserScroll;pendingUserScroll=false;update(userMoved);
        });
      }
    }
    function hidePrompt(){wantsResumePrompt=false;syncResumeNotice();}
    function restorePosition(bookmark){
      var chapter=document.getElementById(bookmark.chapterId);
      if(!chapter)return;
      var top=chapter.getBoundingClientRect().top+window.scrollY;
      var offset=cap(bookmark.chapterRatio)*chapter.getBoundingClientRect().height;
      var sec=bookmark.sectionId && document.getElementById(bookmark.sectionId);
      if(sec && chapter.contains(sec) && Number.isFinite(bookmark.sectionRatio)){
        var nodes=sectionsByChapter[chapter.id]||[];
        var index=nodes.indexOf(sec),next=nodes[index+1];
        var end=visibleRevisionEnd(chapter);
        var endTop=next?next.getBoundingClientRect().top+window.scrollY:
          (end?end.getBoundingClientRect().top+window.scrollY:top+chapter.getBoundingClientRect().height);
        var secTop=sec.getBoundingClientRect().top+window.scrollY;
        if(endTop>secTop)offset=(secTop-top)+cap(bookmark.sectionRatio)*(endTop-secTop);
      }
      suspendUntil=Date.now()+700;
      window.scrollTo({top:Math.max(0,top+offset-window.innerHeight*.42),behavior:'instant'});
      hasReadMovement=true;
      allowSave=true;
      hidePrompt();
      request(false);
    }
    savedPosition=readSaved();
    syncContinueButtons();
    // A saved position is never overwritten by the cover on first paint.
    allowSave=!savedPosition;
    function showResumeIfAppropriate(){
      if(!savedPosition){allowSave=true;return;}
      if(location.hash || window.scrollY>100){
        // A direct chapter link or browser-restored scroll position wins.
        allowSave=true;hasReadMovement=false;suspendUntil=Date.now()+2000;return;
      }
      var savedChapter=chapters.find(function(ch){return ch.id===savedPosition.chapterId;});
      var isNearBeginning=savedPosition.chapterId===chapters[0].id && savedPosition.chapterRatio<.04;
      if(!prompt||!savedChapter||isNearBeginning){allowSave=true;return;}
      if(description){
        description.textContent='Chapter '+savedChapter.num+' · '+savedChapter.title;
        description.lang=savedChapter.isRTL?'ar':'en';
        description.dir=savedChapter.isRTL?'rtl':'ltr';
      }
      wantsResumePrompt=true;syncResumeNotice();
    }
    if(resume)resume.addEventListener('click',function(){if(savedPosition)restorePosition(savedPosition);});
    if(resumeToolbar)resumeToolbar.addEventListener('click',function(){if(savedPosition)restorePosition(savedPosition);});
    if(resumeTools)resumeTools.addEventListener('click',function(){
      if(!savedPosition)return;
      document.getElementById('tocSidebarClose')?.click();
      restorePosition(savedPosition);
    });
    if(startOver)startOver.addEventListener('click',function(){
      clearSaved();savedPosition=null;allowSave=true;hasReadMovement=false;syncContinueButtons();
      hidePrompt();window.scrollTo({top:0,behavior:'instant'});request(false);
    });
    if(forget)forget.addEventListener('click',function(){
      clearSaved();savedPosition=null;allowSave=true;hasReadMovement=false;syncContinueButtons();hidePrompt();
    });
    if(dismiss)dismiss.addEventListener('click',function(){
      hidePrompt();allowSave=true;hasReadMovement=false; // keep saved record until genuine scroll
    });
    window.addEventListener('scroll',function(){request(true);},{passive:true});
    window.addEventListener('resize',function(){request(false);});
    window.addEventListener('hashchange',function(){
      hidePrompt();allowSave=true;hasReadMovement=false;
      suspendUntil=Date.now()+2000;request(false);
    });
    window.addEventListener('pagehide',function(){
      if(printing||!hasReadMovement||!allowSave)return;
      // Capture the last genuinely visible position even between throttles.
      var chapter=document.getElementById(activeId);
      if(chapter)saveLocation(makePosition(chapter,locateSection(chapter,window.innerHeight*.42),window.innerHeight*.42),true);
    });
    window.addEventListener('hikam:revision-visibility',function(){
      // Layout changes must not save a spurious new bookmark.
      suspendUntil=Date.now()+800;
      request(false);
    });
    window.addEventListener('beforeprint',function(){printing=true;hidePrompt();});
    window.addEventListener('afterprint',function(){
      printing=false;suspendUntil=Date.now()+1000;request(false);
    });
    request(false);
    if(document.readyState==='complete')requestAnimationFrame(showResumeIfAppropriate);
    else window.addEventListener('load',function(){requestAnimationFrame(showResumeIfAppropriate);},{once:true});
    window.__hikamReadingProgress={
      getState:function(){return {activeChapter:activeId,activeSection:activeSectionId,
        saved:readSaved(),printing:printing,canResume:!!savedPosition};}
    };
  }

  function wireSidebar(){
    var trigger=document.getElementById('tocFab'), closeBtn=document.getElementById('tocSidebarClose');
    var backdrop=document.getElementById('tocBackdrop');
    if(!trigger||!sidebar) return;
    var isOpen=false, restoreFocus=null, inertSnapshot=[];
    function setBackgroundInert(open){
      if(open){
        inertSnapshot=Array.from(document.body.children)
          .filter(function(node){return node!==sidebar && node!==backdrop;})
          .map(function(node){return {node:node,wasInert:node.inert};});
        inertSnapshot.forEach(function(item){item.node.inert=true;});
      }else{
        inertSnapshot.forEach(function(item){if(item.node.isConnected)item.node.inert=item.wasInert;});
        inertSnapshot=[];
      }
    }
    function focusables(){
      return Array.from(sidebar.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'))
        .filter(function(n){return !n.closest('[hidden],[inert]') && n.getClientRects().length>0;});
    }
    function open(){
      if(isOpen)return;
      restoreFocus=document.activeElement;
      isOpen=true;
      sidebar.inert=false;sidebar.setAttribute('aria-hidden','false');
      sidebar.classList.add('open');
      if(backdrop){backdrop.hidden=false;backdrop.classList.add('open');}
      trigger.classList.add('is-hidden');trigger.setAttribute('tabindex','-1');
      trigger.setAttribute('aria-expanded','true');
      document.body.classList.add('toc-drawer-open');
      setBackgroundInert(true);
      (closeBtn||sidebar).focus();
      document.addEventListener('keydown',onKeydown);
    }
    function close(returnFocus){
      if(!isOpen)return;
      isOpen=false;
      sidebar.classList.remove('open');
      sidebar.inert=true;sidebar.setAttribute('aria-hidden','true');
      if(backdrop){backdrop.classList.remove('open');backdrop.hidden=true;}
      trigger.classList.remove('is-hidden');trigger.removeAttribute('tabindex');
      trigger.setAttribute('aria-expanded','false');
      document.body.classList.remove('toc-drawer-open');
      setBackgroundInert(false);
      document.removeEventListener('keydown',onKeydown);
      if(returnFocus!==false && restoreFocus && restoreFocus.isConnected) restoreFocus.focus();
    }
    function onKeydown(ev){
      if(ev.key==='Escape'){ev.preventDefault();close(true);return;}
      if(ev.key!=='Tab')return;
      var nodes=focusables();if(!nodes.length){ev.preventDefault();sidebar.focus();return;}
      var first=nodes[0],last=nodes[nodes.length-1];
      if(ev.shiftKey && (document.activeElement===first || document.activeElement===sidebar)){
        ev.preventDefault();last.focus();
      }else if(!ev.shiftKey && (document.activeElement===last || document.activeElement===sidebar)){
        ev.preventDefault();first.focus();
      } else if(!sidebar.contains(document.activeElement)){
        ev.preventDefault();first.focus();
      }
    }
    // Close the modal before Chromium starts composing pages: the reading
    // document must not remain inert while exporting, even if the print UI
    // was activated from the drawer.
    window.addEventListener('beforeprint',function(){if(isOpen)close(true);},true);
    trigger.addEventListener('click',open);
    if(closeBtn)closeBtn.addEventListener('click',function(){close(true);});
    if(backdrop)backdrop.addEventListener('click',function(){close(true);});
    var toc=document.getElementById('tocTree');
    if(toc)toc.addEventListener('click',function(ev){
      var link=ev.target.closest('a[href^="#"]');
      if(!link)return;
      var target=document.getElementById(decodeURIComponent(link.hash.slice(1)));
      close(false); // the anchor changes location; don't steal focus back
      if(target){requestAnimationFrame(function(){target.focus({preventScroll:true});});}
    });
  }

  // A saved "hide revisions" preference controls the READING VIEW only.
  // Search may reveal a single relevant revision temporarily, without saving
  // a different preference or exposing unrelated revision blocks.
  function wireRevisionVisibility(){
    var input=document.getElementById('tocShowRevisionBlocks');
    var status=document.getElementById('tocRevisionVisibilityStatus');
    var root=document.documentElement;
    var key='11am-hikam-show-revisions-v1';
    if(!input)return;
    var temporaryBlock=null, temporaryNote=null;
    function clearTemporary(){
      if(temporaryNote){temporaryNote.remove();temporaryNote=null;}
      if(temporaryBlock){temporaryBlock.classList.remove('reader-search-reveal');temporaryBlock=null;}
    }
    function notify(){window.dispatchEvent(new Event('hikam:revision-visibility'));}
    function apply(show,persist){
      clearTemporary();
      root.classList.toggle('reader-hide-revisions',!show);
      input.checked=show;
      if(status)status.textContent=show ? 'Revision Blocks are visible in every chapter.' :
        'All 34 chapter Revision Blocks are hidden while reading.';
      if(persist){
        try{localStorage.setItem(key,String(show));}catch(error){/* In-memory setting still works. */}
      }
      notify();
    }
    // The head script applies stored visibility before the first paint.
    apply(!root.classList.contains('reader-hide-revisions'),false);
    input.addEventListener('change',function(){apply(input.checked,true);});
    window.__hikamRevisions={
      isVisible:function(){return !root.classList.contains('reader-hide-revisions');},
      show:function(){apply(true,true);},
      clearTemporary:function(){if(temporaryBlock){clearTemporary();notify();}},
      revealTemporary:function(target){
        var block=target&&target.closest('.end-block');
        if(!block||!root.classList.contains('reader-hide-revisions'))return false;
        if(block===temporaryBlock)return true;
        clearTemporary();
        temporaryBlock=block;
        block.classList.add('reader-search-reveal');
        var note=document.createElement('div');
        note.className='reader-temporary-revision-note';
        note.setAttribute('role','status');
        var message=document.createElement('span');
        message.textContent='Temporary search preview. Your saved Hide Revision Blocks setting is unchanged.';
        var close=document.createElement('button');
        close.type='button';close.textContent='Hide preview';
        close.addEventListener('click',function(){
          var chapter=block.closest('section.chapter');
          clearTemporary();notify();
          // Never strand keyboard focus inside a newly hidden element.
          if(chapter){chapter.tabIndex=-1;chapter.focus({preventScroll:true});}
        });
        note.append(message,close);
        block.insertBefore(note,block.firstChild);
        temporaryNote=note;
        notify();
        return true;
      }
    };
  }

  // Tabbed drawer: one focus-managed Index view, one Tools view.
  function wireTabs(){
    var tabs=[document.getElementById('tocIndexTab'),document.getElementById('tocToolsTab')];
    var panels=[document.getElementById('tocIndexPanel'),document.getElementById('tocToolsPanel')];
    if(tabs.some(function(t){return !t;})||panels.some(function(p){return !p;}))return;
    function activate(index,focus){
      for(var n=0;n<tabs.length;n++){
        var selected=n===index;
        tabs[n].setAttribute('aria-selected',String(selected));
        tabs[n].tabIndex=selected?0:-1;
        panels[n].hidden=!selected;
        panels[n].inert=!selected;
      }
      if(focus)tabs[index].focus();
    }
    tabs.forEach(function(tab,i){
      tab.addEventListener('click',function(){activate(i,false);});
      tab.addEventListener('keydown',function(ev){
        var next=null;
        if(ev.key==='ArrowRight')next=(i+1)%tabs.length;
        if(ev.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
        if(ev.key==='Home')next=0;
        if(ev.key==='End')next=tabs.length-1;
        if(next!==null){ev.preventDefault();activate(next,true);}
      });
    });
    activate(0,false);
  }

  // Input-order semantics match Literature Dossier's print-selection UX.
  // Unlike the old parser, invalid and unavailable numbers block printing
  // rather than silently disappearing from the requested chapter range.
  function parseRange(spec){
    var result=[],errors=[],seen={},text=(spec||'').trim();
    if(!text)return {ids:[],nums:[],error:'Enter chapter numbers, for example 8-10,1,15.'};
    text.split(',').forEach(function(raw){
      var token=raw.trim(),m=token.match(/^(\d+)\s*-\s*(\d+)$/),sequence=[];
      if(m){
        var start=Number(m[1]),stop=Number(m[2]);
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(stop)||Math.abs(stop-start)>chapters.length){errors.push('Range "'+token+'" is too large.');return;}
        var step=start<=stop?1:-1;
        for(var n=start;step>0?n<=stop:n>=stop;n+=step) sequence.push(n);
      }else if(/^\d+$/.test(token))sequence.push(Number(token));
      else{errors.push('"'+(token||'(empty)')+'" is not a valid chapter or range.');return;}
      sequence.forEach(function(n){
        if(!Number.isSafeInteger(n)||n<1||n>chapters.length){errors.push('Chapter #'+n+' is unavailable (1-'+chapters.length+').');return;}
        if(!seen[n]){seen[n]=true;result.push(n);}
      });
    });
    return {nums:result,ids:result.map(function(n){return chapters[n-1].id;}),error:errors.join(' ')};
  }
  function wirePrint(){
    var input=document.getElementById('tocPrintRange'), selected=document.getElementById('tocPrintSelected');
    var all=document.getElementById('tocPrintAll'),feedback=document.getElementById('tocPrintPreview');
    var error=document.getElementById('tocPrintError'),include=document.getElementById('tocPrintRevision');
    if(!input||!selected||!all)return;
    function update(){
      var result=parseRange(input.value), hasInput=!!input.value.trim();
      var invalid=hasInput && !!result.error;
      input.setAttribute('aria-invalid',String(invalid));
      if(error)error.textContent=invalid?result.error:'';
      selected.disabled=!!result.error;
      if(feedback)feedback.textContent=result.error ?
        (hasInput?'Fix the chapter range before printing.':'Select chapters by number, or choose Print All.') :
        result.nums.length+' dossiers selected in this order: '+result.nums.map(function(n){return '#'+n;}).join(', ')+'.'+
        (include && !include.checked?' Revision pages excluded.':' Revision pages included.');
      return result;
    }
    input.addEventListener('input',update);
    input.addEventListener('keydown',function(ev){
      if(ev.key==='Enter'){ev.preventDefault();if(!selected.disabled)selected.click();}
    });
    if(include)include.addEventListener('change',update);
    selected.addEventListener('click',function(){
      var result=update();if(result.error){input.focus();return;}
      window.__printControl.setFilter(result.ids);
      window.__printControl.includeRevision(!include || include.checked);
      window.print();
    });
    all.addEventListener('click',function(){
      if(error)error.textContent='';
      window.__printControl.clearFilter();
      window.__printControl.includeRevision(!include || include.checked);
      window.print();
    });
    update();
    // Expose a read-only diagnostic parser for smoke tests.
    window.__hikamSidebarParseRange=parseRange;
  }
  function injectFlatNumbers(){
    chapters.forEach(function(ch){
      var span=document.querySelector('#'+ch.id+' .chapter-tabnum span');
      if(span && !span.dataset.flatNumberAttached){
        span.textContent=span.textContent.trim()+' · #'+ch.flat;
        span.dataset.flatNumberAttached='true';
      }
    });
  }
  // A horizontally scrolling table remains a semantic table (no role override).
  // Only tables or pre-existing wrappers that actually overflow get keyboard
  // focus and a screen-only visual cue. Resize/revision changes are rechecked.
  function wireScrollableTables(){
    var managed=new Map(),hintSerial=0,scheduled=false;
    var tables=Array.from(document.querySelectorAll('section.chapter table'));
    function candidates(){
      // Some tables scroll internally even when their .tbl-wrap does not.
      // Include both candidates, but only mark those with real overflow.
      return Array.from(new Set([].concat(Array.from(managed.keys()),tables,
        tables.map(function(table){return table.closest('.tbl-wrap');}).filter(Boolean))));
    }
    function update(){
      scheduled=false;
      candidates().forEach(function(node){
        var scrollable=node.scrollWidth>node.clientWidth+3 && node.clientWidth>0 && node.getClientRects().length>0;
        var record=managed.get(node);
        if(scrollable && !record){
          var table=node.matches('table')?node:node.querySelector('table');
          var caption=table&&table.querySelector('caption');
          var chapter=node.closest('section.chapter');
          var name='Scrollable table'+(caption?' — '+caption.textContent.trim().slice(0,90):
            chapter?' in Chapter '+chapter.id.replace(/^ch/,'').replace(/-/g,'.'):'');
          var hint=document.createElement('p');
          hint.className='reader-table-scroll-hint';hint.id='reader-table-scroll-hint-'+(++hintSerial);
          hint.textContent='↔ Swipe horizontally or focus the table and use arrow keys to see more';
          node.before(hint);
          record={hint:hint,wasTabindex:node.getAttribute('tabindex'),
            wasLabel:node.getAttribute('aria-label'),wasDescription:node.getAttribute('aria-describedby')};
          managed.set(node,record);
          node.setAttribute('tabindex','0');node.setAttribute('aria-label',name);
          node.setAttribute('aria-describedby',[record.wasDescription,hint.id].filter(Boolean).join(' '));
          node.classList.add('reader-table-scrollable');
        }else if(!scrollable && record){
          if(record.hint.isConnected)record.hint.remove();
          [['tabindex',record.wasTabindex],['aria-label',record.wasLabel],
            ['aria-describedby',record.wasDescription]].forEach(function(pair){
            if(pair[1]===null)node.removeAttribute(pair[0]);else node.setAttribute(pair[0],pair[1]);
          });
          node.classList.remove('reader-table-scrollable');managed.delete(node);
        }
      });
    }
    function request(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
    window.addEventListener('resize',request);
    window.addEventListener('hikam:revision-visibility',request);
    window.addEventListener('afterprint',request);
    if(document.fonts)document.fonts.ready.then(request).catch(function(){});
    request();
  }

  function init(){
    sidebar=document.getElementById('tocSidebar');
    if(sidebar){sidebar.inert=true;sidebar.setAttribute('aria-hidden','true');}
    collectStructure();injectFlatNumbers();
    var tree=document.getElementById('tocTree');
    if(tree)buildTree(tree);
    wireExpandControls();wireSidebar();wireTabs();wireRevisionVisibility();wirePrint();wireScrollSpy();wireScrollableTables();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* ============================================================
   FULL-BOOK SEARCH — meaningful source text, including diagrams and visual
   learning tools. Search never modifies authored chapter HTML or preferences.
   Results rank by relevance, page in batches, and keep original text for display.
   ============================================================ */
(function(){
  'use strict';
  function initFullBookSearch(){
    var input=document.getElementById('readerSearchInput');
    var box=document.getElementById('readerSearchBox');
    var panel=document.getElementById('readerSearchResults');
    var hits=document.getElementById('readerSearchHits');
    var status=document.getElementById('readerSearchHelp');
    if(!input||!panel||!hits||!box)return;
    var entries=null, searchTimer=null, lastResults=[],rendered=0;
    var PAGE_SIZE=30;
    var skipInside='.js-print-page, .chapter-endnav, script, style, template, noscript, [hidden], [aria-hidden="true"]';
    var semanticChildren='h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,blockquote,figcaption,caption,pre,ul,ol,table';
    var candidates='h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,blockquote,figcaption,caption,pre,div,span,cite,small,svg text';

    // Return normalized text AND a UTF-16 offset map into the exact displayed
    // characters. This permits correct excerpt windows and highlights even
    // when Arabic harakat, alef variants or Latin accents are normalized.
    function mappedText(source){
      var value=String(source||''),out='',offsets=[];
      for(var i=0;i<value.length;){
        var char=String.fromCodePoint(value.codePointAt(i));
        var start=i;i+=char.length;
        var piece=char.normalize('NFKD').toLocaleLowerCase()
          .replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036F]/g,'')
          .replace(/[\u0622\u0623\u0625\u0671]/g,'ا')
          .replace(/\u0649/g,'ي').replace(/\u0629/g,'ه');
        for(var j=0;j<piece.length;j++){
          var unit=piece[j];
          if(/\s/.test(unit)){
            if(out && out[out.length-1]!==' '){out+=' ';offsets.push(start);}
          }else{out+=unit;offsets.push(start);}
        }
      }
      if(out.endsWith(' ')){out=out.slice(0,-1);offsets.pop();}
      return {text:out,offsets:offsets};
    }
    function normalize(source){return mappedText(source).text;}
    function hide(){panel.hidden=true;input.setAttribute('aria-expanded','false');}
    function open(){panel.hidden=false;input.setAttribute('aria-expanded','true');}
    function meaningfulText(node){return node.textContent.replace(/\s+/g,' ').trim();}
    function makeIndex(){
      if(entries)return entries;
      entries=[];
      document.querySelectorAll('section.chapter[id]').forEach(function(chapter){
        var titleNode=chapter.querySelector('.chapter-title');
        var title=titleNode?meaningfulText(titleNode):chapter.id;
        var chapterNumber=chapter.id.replace(/^ch/,'').replaceAll('-','.');
        var rtl=chapter.lang==='ar'||chapter.classList.contains('rtl');
        var exact= mappedText(chapterNumber+' '+title);
        entries.push({text:exact.text,display:chapterNumber+' · '+title,offsets:exact.offsets,
          chapter:chapter,title:title,number:chapterNumber,rtl:rtl,node:chapter,
          kind:'chapter',order:entries.length});
        // Keep the smallest meaningful text element, while ALSO allowing a
        // compact visual wrapper when a phrase spans sibling inline nodes.
        // Do not index giant chapter containers or duplicate printed clones.
        var sameText=new Map(),currentSection='';
        chapter.querySelectorAll(candidates).forEach(function(node){
          if(node.closest(skipInside))return;
          if(node.matches('h2.sec'))currentSection=meaningfulText(node);
          var location=node.closest('.end-block')?'Revision & recall':currentSection;
          var tag=node.localName;
          if((tag==='div'||tag==='span')&&node.querySelector(semanticChildren))return;
          var value=meaningfulText(node);
          if(value.length<3)return;
          if((tag==='div'||tag==='span')&&value.length>850)return;
          var mapped=mappedText(value);
          if(mapped.text.length<3)return;
          var collisions=sameText.get(mapped.text)||[];
          var existing=collisions.find(function(e){return node.contains(e.node)||e.node.contains(node);});
          if(existing){
            if(existing.node.contains(node)){
              existing.node=node;existing.display=value;existing.offsets=mapped.offsets;
            }
            return;
          }
          var entry={text:mapped.text,display:value,offsets:mapped.offsets,
            chapter:chapter,title:title,number:chapterNumber,rtl:rtl,node:node,
            kind:/^h[1-6]$/.test(tag)?'heading':'content',
            location:location,order:entries.length};
          entries.push(entry);collisions.push(entry);sameText.set(mapped.text,collisions);
        });
      });
      return entries;
    }
    function occurrences(text,token,limit){
      var found=[],from=0,at=0;
      while(found.length<(limit||60) && (at=text.indexOf(token,from))!==-1){
        found.push(at);from=at+Math.max(1,token.length);
      }
      return found;
    }
    function locate(entry,terms,phrase){
      var exact=entry.text.indexOf(phrase);
      if(exact>=0)return {from:exact,to:exact+phrase.length,exact:true,positions:[exact]};
      var lists=terms.map(function(t){return occurrences(entry.text,t,60);});
      if(lists.some(function(a){return !a.length;}))return null;
      var best=null;
      lists[0].forEach(function(anchor){
        var positions=[anchor];
        for(var i=1;i<lists.length;i++){
          var nearest=lists[i][0];
          lists[i].forEach(function(p){if(Math.abs(p-anchor)<Math.abs(nearest-anchor))nearest=p;});
          positions.push(nearest);
        }
        var from=Math.min.apply(null,positions);
        var to=Math.max.apply(null,positions.map(function(p,i){return p+terms[i].length;}));
        if(!best||to-from<best.to-best.from)best={from:from,to:to,exact:false,positions:positions};
      });
      return best;
    }
    function isAncestorOfMatch(entry,other){
      return entry.kind!=='chapter'&&other.kind!=='chapter'&&
        entry.chapter===other.chapter && entry!==other && entry.node.contains(other.node);
    }
    function scoredMatches(terms,phrase){
      var found=[];
      makeIndex().forEach(function(entry){
        if(!terms.every(function(t){return entry.text.includes(t);}))return;
        var window=locate(entry,terms,phrase);if(!window)return;
        var span=window.to-window.from;
        var rank=(window.exact?160:0)+Math.max(0,90-span)+
          (entry.kind==='chapter'?260:entry.kind==='heading'?135:0)+
          (window.from===0?14:0)+Math.max(0,28-Math.floor(entry.text.length/40));
        found.push({entry:entry,window:window,rank:rank});
      });
      // If a specific child contains all query terms, don't also show its
      // containing diagram/row as a second hit. Retain a wrapper only when
      // the phrase genuinely spans multiple siblings.
      var matches=found.filter(function(candidate){
        return !found.some(function(other){
          return other.entry!==candidate.entry &&
            isAncestorOfMatch(candidate.entry,other.entry);
        });
      });
      matches.sort(function(a,b){return b.rank-a.rank||a.entry.order-b.entry.order;});
      return matches;
    }
    function excerpt(entry,window,terms){
      var raw=entry.display,map=entry.offsets;
      var fromPos=map[window.from]||0;
      var toPos=(map[window.to-1]===undefined?raw.length:map[window.to-1]+1);
      var start=Math.max(0,fromPos-68),end=Math.min(raw.length,Math.max(toPos+64,start+170));
      if(end-start>260){end=Math.min(raw.length,start+260);}
      var highlights=[];
      terms.forEach(function(term){
        occurrences(entry.text,term,120).forEach(function(index){
          var a=map[index],b=(map[index+term.length-1]||a)+1;
          if(a!==undefined&&b>start&&a<end)highlights.push({start:Math.max(a,start),end:Math.min(b,end)});
        });
      });
      highlights.sort(function(a,b){return a.start-b.start;});
      var merged=[];
      highlights.forEach(function(s){
        if(merged.length&&s.start<=merged[merged.length-1].end)
          merged[merged.length-1].end=Math.max(s.end,merged[merged.length-1].end);
        else merged.push({start:s.start,end:s.end});
      });
      var fragment=document.createDocumentFragment(),cursor=start;
      if(start)fragment.appendChild(document.createTextNode('…'));
      merged.forEach(function(s){
        if(s.start>cursor)fragment.appendChild(document.createTextNode(raw.slice(cursor,s.start)));
        var mark=document.createElement('mark');mark.textContent=raw.slice(s.start,s.end);
        fragment.appendChild(mark);cursor=s.end;
      });
      if(cursor<end)fragment.appendChild(document.createTextNode(raw.slice(cursor,end)));
      if(end<raw.length)fragment.appendChild(document.createTextNode('…'));
      return fragment;
    }
    function choose(result){
      hide();
      var entry=result.entry, revisions=window.__hikamRevisions;
      if(revisions){
        if(entry.node.closest('.end-block'))revisions.revealTemporary(entry.node);
        else revisions.clearTemporary();
      }
      var target=entry.node;
      // Keep keyboard and screen-reader focus in sync with the visible result.
      // IDs and authored chapter HTML are not modified.
      var hadTabindex=target.hasAttribute('tabindex'),oldTabindex=target.getAttribute('tabindex');
      if(!hadTabindex)target.setAttribute('tabindex','-1');
      target.classList.add('reader-search-target');
      target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
      target.focus({preventScroll:true});
      target.addEventListener('blur',function clean(){
        target.classList.remove('reader-search-target');
        if(hadTabindex)target.setAttribute('tabindex',oldTabindex);
        else target.removeAttribute('tabindex');
      },{once:true});
    }
    function renderNext(){
      var oldMore=hits.querySelector('.reader-search-more');if(oldMore)oldMore.remove();
      var until=Math.min(lastResults.length,rendered+PAGE_SIZE);
      for(;rendered<until;rendered++){
        var result=lastResults[rendered],entry=result.entry;
        var button=document.createElement('button');
        button.type='button';button.className='reader-search-hit';
        var label=document.createElement('span');label.className='reader-hit-chapter';
        label.textContent='Chapter '+entry.number+' · '+entry.title;
        label.dir='auto';if(entry.rtl)label.lang='ar';
        if(entry.location){
          var locationLabel=document.createElement('span');
          locationLabel.className='reader-hit-location';
          locationLabel.textContent=entry.location;
          locationLabel.dir='auto';if(entry.rtl)locationLabel.lang='ar';
          button.appendChild(locationLabel);
        }
        var snippet=document.createElement('span');snippet.className='reader-hit-context';
        snippet.appendChild(excerpt(entry,result.window,currentTerms));
        snippet.dir='auto';if(entry.rtl)snippet.lang='ar';
        button.append(label,snippet);
        button.addEventListener('click',function(){choose(result);});
        hits.appendChild(button);
      }
      if(rendered<lastResults.length){
        var more=document.createElement('button');
        more.type='button';more.className='reader-search-more';
        more.textContent='Show '+Math.min(PAGE_SIZE,lastResults.length-rendered)+' more results ('+
          (lastResults.length-rendered)+' remaining)';
        more.addEventListener('click',function(){
          var previous=rendered;renderNext();
          var items=hits.querySelectorAll('.reader-search-hit');
          if(items[previous])items[previous].focus();
        });
        hits.appendChild(more);
      }
      status.textContent=lastResults.length?
        'Showing '+rendered+' of '+lastResults.length+' matching passages. Results ordered by relevance.' :
        'No matches found in the 34 dossiers.';
    }
    var currentTerms=[];
    function run(){
      var phrase=normalize(input.value);
      hits.replaceChildren();lastResults=[];rendered=0;
      if(!phrase){hide();return;}
      currentTerms=phrase.split(' ').filter(Boolean);
      lastResults=scoredMatches(currentTerms,phrase);
      renderNext();open();
    }
    input.addEventListener('input',function(){clearTimeout(searchTimer);searchTimer=setTimeout(run,120);});
    input.addEventListener('focus',function(){if(input.value.trim())run();});
    input.addEventListener('keydown',function(ev){
      if(ev.key==='Escape'){ev.preventDefault();hide();input.blur();}
      else if(ev.key==='ArrowDown'&&!panel.hidden){
        var first=hits.querySelector('button');if(first){ev.preventDefault();first.focus();}
      }else if(ev.key==='Enter'&&!panel.hidden&&lastResults[0]){
        ev.preventDefault();choose(lastResults[0]);
      }
    });
    hits.addEventListener('keydown',function(ev){
      var items=Array.from(hits.querySelectorAll('button'));
      var current=items.indexOf(document.activeElement);
      if(ev.key==='Escape'){ev.preventDefault();hide();input.focus();}
      if(ev.key==='ArrowDown'&&current>=0){ev.preventDefault();items[Math.min(items.length-1,current+1)].focus();}
      if(ev.key==='ArrowUp'&&current>=0){ev.preventDefault();if(current===0)input.focus();else items[current-1].focus();}
    });
    document.addEventListener('pointerdown',function(ev){if(!box.contains(ev.target))hide();});
    window.__hikamFullTextSearch={run:run,getStats:function(){return {
      entries:makeIndex().length,matched:lastResults.length,shown:rendered,open:!panel.hidden};}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFullBookSearch);
  else initFullBookSearch();
})();
