from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (320,390,720,1366):
  page=browser.new_page(viewport={'width':width,'height':844},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.route('https://fonts.googleapis.com/**',lambda r:r.abort())
  page.route('https://fonts.gstatic.com/**',lambda r:r.abort())
  page.evaluate('''() => {
    const m=new Map();window.__localItems=m;
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});
    m.set('11am-hikam-reading-place-v1',JSON.stringify({version:1,chapterId:'ch3-2-4',chapterRatio:.45}));
  }''')
  page.set_content(HTML,wait_until='domcontentloaded',timeout=60000)
  page.wait_for_function('Boolean(window.__hikamReadingProgress && window.__hikamFullTextSearch)',timeout=60000)
  page.wait_for_timeout(500)
  # All 34 chapters unaffected; no document-level overflow
  assert page.locator('section.chapter').count()==34
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'), 'document overflow '+str(width)
  assert page.locator('#resumeReaderPrompt').is_visible(), 'resume not visible '+str(width)
  page.evaluate("document.getElementById('editionUpdateNotice').hidden=false;window.dispatchEvent(new CustomEvent('hikam:edition-notice',{detail:{visible:true}}))")
  assert not page.locator('#resumeReaderPrompt').is_visible(), 'resume still visible with edition '+str(width)
  page.locator('#editionDismissBtn').click()
  assert page.locator('#resumeReaderPrompt').is_visible(), 'resume not restored '+str(width)
  page.locator('#resumeReaderDismiss').click()
  assert not page.locator('#resumeReaderPrompt').is_visible()
  # Scroll into Arabic chapter and inspect full mobile title and separator.
  page.evaluate("document.getElementById('ch3-2-4').scrollIntoView({behavior:'instant',block:'start'})")
  page.wait_for_timeout(300)
  label=page.locator('#readerCurrentNumber').inner_text(); assert '3.2.4' in label,(width,label)
  page.locator('#readerCurrentNumber').click()
  assert page.locator('#readerChapterPopover').is_visible()
  assert page.locator('#readerPopoverTitle').get_attribute('lang')=='ar'
  assert len(page.locator('#readerPopoverTitle').inner_text())>5
  sec=page.locator('#toc-sec-ch3-2-4-1')
  page.evaluate('''() => {
    const node=document.getElementById('toc-sec-ch3-2-4-1');
    window.scrollTo({top:window.scrollY + node.getBoundingClientRect().top - window.innerHeight*.4,behavior:'instant'});
  }''')
  page.wait_for_timeout(220)
  # header section uses isolated marker and separator.
  txt=page.locator('#readerCurrentSection').inner_text()
  assert '§' in txt and ' · ' in txt, (width,repr(txt))
  page.keyboard.press('Escape')
  assert not page.locator('#readerChapterPopover').is_visible()
  # semantic keyboard scroll affordance for genuinely overflowing tables.
  tables=page.locator('.reader-table-scrollable')
  n=tables.count(); print('viewport',width,'focusable wide table regions',n,'section label',txt[:75])
  if width<=390:
   assert n>=1,'expected at least one overflow table on phone'
   assert page.locator('.reader-table-scroll-hint').count()==n
   table=tables.first
   table.scroll_into_view_if_needed()
   table.focus()
   assert page.evaluate('document.activeElement.classList.contains("reader-table-scrollable")')
   before=table.evaluate('(el)=>el.scrollLeft')
   page.keyboard.press('ArrowRight');page.wait_for_timeout(220)
   after=table.evaluate('(el)=>el.scrollLeft')
   print('  table scroll:',before,'->',after)
  # sidebar modal background inert and restoration
  page.locator('#tocFab').click()
  assert page.locator('#tocSidebar').is_visible()
  assert page.evaluate('document.getElementById("readingProgressHeader").inert')
  assert page.evaluate('document.querySelector("section.chapter").inert===true')
  assert page.evaluate('document.activeElement.closest("#tocSidebar")!=null')
  page.keyboard.press('Escape')
  assert not page.locator('#tocSidebar').evaluate('(el)=>el.classList.contains("open")')
  assert not page.evaluate('document.getElementById("readingProgressHeader").inert')
  assert page.evaluate('document.activeElement.id')=='tocFab'
  # No keyboard input hidden behind modal; focus restored
  if errors:raise AssertionError((width,errors))
  # Small selected print preserves the existing A4 compositor and restores DOM.
  if width==390:
   page.evaluate("window.__printControl.setFilter(['ch3-2-4']);window.__printControl.includeRevision(false);window.dispatchEvent(new Event('beforeprint'))")
   assert page.locator('.js-print-page').count()>0
   page.evaluate("window.dispatchEvent(new Event('afterprint'))")
   assert page.locator('.js-print-page').count()==0
  # Print chrome remains hidden
  page.emulate_media(media='print')
  assert page.locator('#readerChapterPopover').evaluate('(el)=>getComputedStyle(el).display')=='none'
  assert page.locator('#readingProgressHeader').evaluate('(el)=>getComputedStyle(el).display')=='none'
  page.close()
 browser.close()
print('Browser phase2 checks PASS')
