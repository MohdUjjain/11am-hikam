#!/usr/bin/env python3
"""Batch D: a real altered Hikam edition, old checkpoint, mixed-script headings."""
from __future__ import annotations
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
KEY='11am-hikam-reading-place-v1'
PREF='11am-hikam-show-revisions-v1'
CHAPTER='ch3-2-4'
OLD_SECTION='toc-sec-ch3-2-4-2'
SOURCE=(ROOT/'index.html').read_text(encoding='utf8')
MARKER="var STORAGE_KEY='11am-hikam-reading-place-v1'"
assert MARKER in SOURCE
AT=SOURCE.rfind('<script',0,SOURCE.index(MARKER))
assert AT>0, 'Cannot inject mutation ahead of reader initialization'
MUTATION=r"""<script>
(function(){
 const chapter=document.getElementById('ch3-2-4');
 const heads=[...chapter.querySelectorAll('.chapter-body h2.sec')];
 if(heads.length<3)throw Error('Need several actual Hikam headings');
 heads.forEach((h,i)=>{h.id='toc-sec-ch3-2-4-'+(i+1);});
 const before=heads.indexOf(heads[1]), first=heads[0], target=heads[1];
 const parent=target.parentElement;
 if(first.parentElement!==parent)throw Error('Section heading parents differ');
 const chunk=[];
 for(let node=target;node && (node===target||!node.matches('h2.sec'));node=node.nextElementSibling)
   chunk.push(node);
 chunk.forEach(node=>parent.insertBefore(node,first));
 const newHead=document.createElement('h2');
 newHead.className='sec';newHead.id='hikam-d-added';
 newHead.lang='ar';newHead.dir='rtl';
 newHead.innerHTML='<span class="secnum">§</span> المنهج الجديد — Revised Method';
 parent.insertBefore(newHead,first);
 const p=document.createElement('p');
 p.textContent='Additional chapter discussion inserted during edition migration. '.repeat(15);
 parent.insertBefore(p,first);
 window.__batchD={before,after:[...chapter.querySelectorAll('.chapter-body h2.sec')].indexOf(target),
   inserted:!!document.getElementById('hikam-d-added'),headings:heads.length};
})();
</script>"""
ALTERED=SOURCE[:AT]+MUTATION+SOURCE[AT:]
assert ALTERED!=SOURCE

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_):pass

def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
   url=f'http://127.0.0.1:{server.server_port}/index.html'
   def open_edition(saved,width):
    ctx=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce',service_workers='block')
    ctx.add_init_script(script=f"localStorage.setItem({json.dumps(KEY)},{json.dumps(json.dumps(saved))});localStorage.setItem({json.dumps(PREF)},'false');")
    ctx.route('**/index.html',lambda route:route.fulfill(status=200,content_type='text/html',body=ALTERED))
    page=ctx.new_page();page.goto(url,wait_until='domcontentloaded')
    page.wait_for_function("() => !!window.__hikamReadingProgress")
    edited=page.evaluate("window.__batchD")
    assert edited and edited['inserted'] and edited['before']!=edited['after'],edited
    assert page.locator('#hikam-d-added[lang="ar"][dir="rtl"]').count()==1
    assert page.evaluate("k=>JSON.parse(localStorage.getItem(k))",KEY)==saved
    page.locator('#resumeReaderPrompt').wait_for(state='visible',timeout=10000)
    return ctx,page

   for width in (390,1100):
    saved={'version':1,'chapterId':CHAPTER,'chapterRatio':.45,
           'sectionId':OLD_SECTION,'sectionRatio':.25}
    ctx,page=open_edition(saved,width)
    assert page.locator('#'+OLD_SECTION).count()==1
    page.locator('#resumeReaderContinue').click()
    page.wait_for_function('() => window.scrollY>100')
    result=page.evaluate("""() => {
      const h=document.getElementById('toc-sec-ch3-2-4-2'),
        all=[...h.closest('section.chapter').querySelectorAll('.chapter-body h2.sec')],
        i=all.indexOf(h), next=all[i+1], ch=h.closest('section.chapter');
      const start=h.getBoundingClientRect().top+scrollY;
      const stop=next?next.getBoundingClientRect().top+scrollY:
        ch.getBoundingClientRect().bottom+scrollY;
      return {actual:scrollY,expected:Math.max(0,start+.25*Math.max(0,stop-start)-innerHeight*.42),
        index:i,chapter:ch.id};
    }""")
    assert result['chapter']==CHAPTER and result['index']!=1,result
    assert abs(result['actual']-result['expected'])<85,result
    assert page.evaluate('k=>localStorage.getItem(k)',PREF)=='false'
    ctx.close()

    # Old chapter-only checkpoint has no section metadata, but must still restore.
    legacy={'version':1,'chapterId':CHAPTER,'chapterRatio':.58}
    ctx,page=open_edition(legacy,width)
    page.locator('#resumeReaderContinue').click()
    page.wait_for_function('() => scrollY>100')
    result=page.evaluate("""() => {
      const r=document.getElementById('ch3-2-4').getBoundingClientRect();
      return {actual:scrollY,expected:Math.max(0,r.top+scrollY+.58*r.height-innerHeight*.42)};
    }""")
    assert abs(result['actual']-result['expected'])<85,result
    ctx.close()

   revision={'version':1,'chapterId':CHAPTER,'chapterRatio':.91,'revision':True}
   ctx,page=open_edition(revision,390)
   page.locator('#resumeReaderContinue').click()
   page.wait_for_function("() => !!document.querySelector('#ch3-2-4 > .end-block.reader-search-reveal')")
   assert page.evaluate('k=>localStorage.getItem(k)',PREF)=='false'
   assert not page.locator('#tocShowRevisionBlocks').is_checked()
   ctx.close();browser.close()
 finally:
  server.shutdown();server.server_close()
 print('PASS Batch D Hikam: genuine reordered chapter content; explicit stable section identity; old chapter-only checkpoint; mixed Arabic/English inserted heading; hidden revisions (390/1100px)')

if __name__=='__main__':main()
