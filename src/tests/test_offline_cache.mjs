// Simulates the public service worker's core offline-cache lifecycle in Node.
// No network, external dependencies, browser permissions, or GitHub tokens.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const SW_ROOT = 'https://mohdujjain.github.io/11am-hikam/';
const workerScript = fs.readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8');
const listeners = new Map();
const normalize = (req) => new URL(typeof req === 'string' ? req : req.url, SW_ROOT).href;
class MockCache {
  constructor() {this.items = new Map();}
  async addAll(paths) {for (const path of paths) await this.put(path,await fetchMock(path));}
  async put(req,res) {this.items.set(normalize(req),res.clone());}
  async match(req) {return this.items.get(normalize(req))?.clone();}
}
const store = new Map();
const cachesMock = {
  async open(name) {if(!store.has(name)) store.set(name,new MockCache());return store.get(name);},
  async keys() {return [...store.keys()];},
  async delete(name) {return store.delete(name);},
  async match(req) {for(const cache of store.values()){const found=await cache.match(req);if(found)return found;}return undefined;}
};
let online=true;
let networkRequests=0;
async function fetchMock(req) {
  networkRequests++;
  if (!online) throw new Error('Network offline');
  const url = normalize(req);
  return new Response(url.endsWith('/index.html') ? 'COMPLETE 34 DOSSIERS':'asset '+url,{status:200,headers:{'content-type': 'text/plain'}});
}
const context = {
  self:{
    registration:{scope:SW_ROOT},
    location:new URL(SW_ROOT),
    addEventListener(type,callback){listeners.set(type,callback);},
    async skipWaiting(){this.skipWaitingCalled=true;},
    clients:{async claim(){this.claimed=true;}}
  },
  caches:cachesMock, fetch:fetchMock, URL, Response, Request, Promise, console,
};
vm.runInNewContext(workerScript,context,{filename:'service-worker.js'});
async function dispatch(type,props={}) {
  let pending;
  let reply;
  const evt={...props,waitUntil(p){pending=p;},respondWith(p){reply=p;}};
  listeners.get(type)(evt);
  if(pending) await pending;
  return reply ? await reply : undefined;
}

// Pre-existing font cache should survive a new book installation.
await cachesMock.open('11am-hikam-reader-old-revision');
await cachesMock.open('11am-hikam-cdn-fonts-v1');
await dispatch('install');
assert.ok(context.self.skipWaitingCalled);
const newName=[...store.keys()].find(n=>n.startsWith('11am-hikam-reader-')&&n!=='11am-hikam-reader-old-revision');
assert.ok(newName,'New book version must receive its own cache');
const app=await cachesMock.open(newName);
assert.equal((await app.match('./index.html')).status,200);
await dispatch('activate');
assert.equal(store.has('11am-hikam-reader-old-revision'),false,'Old book cache removed only at activation');
assert.equal(store.has('11am-hikam-cdn-fonts-v1'),true,'Device fonts are retained');
assert.ok(context.self.clients.claimed);

// Offline navigation must serve saved HTML without attempting a network request.
online=false;
const before=networkRequests;
const response=await dispatch('fetch',{request:{method:'GET',mode:'navigate',url:SW_ROOT}});
assert.equal(await response.text(),'COMPLETE 34 DOSSIERS');
assert.equal(networkRequests,before);

// A font already saved should remain available offline.
online=true;
let fontResponse;
await dispatch('message',{
  data:{type:'PREPARE_FONTS',urls:[
    'https://fonts.googleapis.com/css2?family=Amiri',
    'https://fonts.gstatic.com/s/amiri/v1/amiri.woff2',
    'https://untrusted.example/phishing.js'
  ]},
  ports:[{postMessage(data){fontResponse=data;}}]
});
assert.equal(fontResponse.requested,2,'Only approved font hosts are allowed');
assert.equal(fontResponse.stored,2);
assert.equal(fontResponse.failed,0);
online=false;
const cachedFont=await dispatch('fetch',{request:{method:'GET',mode:'cors',url:'https://fonts.gstatic.com/s/amiri/v1/amiri.woff2'}});
assert.ok((await cachedFont.text()).includes('asset'));
console.log('Offline worker validated: atomic install, cache-first 34-dossier navigation, old-version cleanup, persistent font cache, allowed-CDN filtering, offline font response.');
