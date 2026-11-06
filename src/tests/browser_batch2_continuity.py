#!/usr/bin/env python3
"""Batch 2: search-result permalinks, page reloads and migrated reading place."""
from __future__ import annotations
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
FIX=json.loads((ROOT/'src/tests/fixtures/batch2_modified_edition.json').read_text())
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
   url=f'http://127.0.0.1:{server.server_port}/index.html'
   ctx=browser.new_context(viewport={'width':1100,'height':760},service_workers='block',reduced_motion='reduce')
   page=ctx.new_page();page.goto(url,wait_until='domcontentloaded')
   page.locator('#readerSearchInput').fill('philosophy')
   page.wait_for_function("() => window.__hikamFullTextSearch?.getStats().matched>5")
   result=page.locator('.reader-search-hit').nth(4)
   result.click()
   link=page.evaluate('location.hash')
   assert link.startswith('#hikam-hit-') or link.startswith('#toc-sec-') or link.startswith('#ch'),link
   page.wait_for_function("() => location.hash.slice(1)===document.activeElement.id")
   page.reload(wait_until='domcontentloaded')
   page.wait_for_function("() => location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))?.getClientRects().length>0")
   page.wait_for_function("() => document.activeElement.id===decodeURIComponent(location.hash.slice(1))")
   # Passage fragments must also restore when opened directly in a new tab.
   fresh=ctx.new_page();fresh.goto(url+link,wait_until='domcontentloaded')
   fresh.wait_for_function("() => document.activeElement.id===decodeURIComponent(location.hash.slice(1))")
   fresh.close();ctx.close()

   # Modified-edition fixture: section ID no longer exists, but the chapter
   # and chapter-relative reading position remain recoverable.
   ctx=browser.new_context(viewport={'width':1100,'height':760},service_workers='block',reduced_motion='reduce')
   ctx.add_init_script(script=f"""localStorage.setItem({json.dumps(FIX['key'])},{json.dumps(json.dumps(FIX['checkpoint']))});
localStorage.setItem({json.dumps(FIX['visibilityKey'])},'false');""")
   page=ctx.new_page();page.goto(url,wait_until='domcontentloaded')
   page.wait_for_function("() => !!document.getElementById('"+FIX['renamedAnchor']+"')")
   page.evaluate("""([oldId,newId]) => { document.getElementById(oldId).id=newId; }""",
                 [FIX['renamedAnchor'],FIX['replacementAnchor']])
   assert page.evaluate("(id)=>document.getElementById(id)",FIX['renamedAnchor']) is None
   page.locator('#resumeReaderPrompt').wait_for(state='visible',timeout=6000)
   assert page.evaluate("key=>JSON.parse(localStorage.getItem(key)).sectionId",FIX['key'])==FIX['renamedAnchor']
   page.locator('#resumeReaderContinue').click()
   page.wait_for_function("() => scrollY>100")
   rect=page.locator('#'+FIX['chapter']).bounding_box()
   assert rect and rect['y']<760 and rect['y']+rect['height']>0,rect
   assert page.evaluate('key=>localStorage.getItem(key)',FIX['visibilityKey'])=='false'
   ctx.close()

   # Saved revision context must be available on explicit continuation even
   # if Hide Revision Blocks is an existing persistent preference.
   ctx=browser.new_context(viewport={'width':1100,'height':760},service_workers='block',reduced_motion='reduce')
   ctx.add_init_script(script=f"""localStorage.setItem({json.dumps(FIX['key'])},{json.dumps(json.dumps(FIX['hiddenRevision']))});
localStorage.setItem({json.dumps(FIX['visibilityKey'])},'false');""")
   page=ctx.new_page();page.goto(url,wait_until='domcontentloaded')
   page.locator('#resumeReaderPrompt').wait_for(state='visible',timeout=6000)
   page.locator('#resumeReaderContinue').click()
   page.wait_for_function("() => !!document.querySelector('#"+FIX['chapter']+" > .end-block.reader-search-reveal')")
   assert page.evaluate("key=>localStorage.getItem(key)",FIX['visibilityKey'])=='false'
   assert not page.locator('#tocShowRevisionBlocks').is_checked()
   ctx.close();browser.close()
 finally:
  server.shutdown();server.server_close()
 print('PASS: shareable search passages and temporary hidden-revision continuation; renamed section falls back')
if __name__=='__main__':main()
