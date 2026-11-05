/* Installability and offline availability. Independent of chapter/print engine. */
(() => {
  'use strict';
  const status = document.getElementById('offlineStatus');
  const button = document.getElementById('keepOffline');
  const say = (s) => { if (status) status.textContent = s; };
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    say('This browser does not support full offline installation.');
    if (button) button.hidden = true;
    return;
  }
  const essentials = ['./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
  async function statusCheck() {
    try {
      const names = await caches.keys();
      const active = names.filter(n => n.startsWith('11am-hikam-reader-'));
      const cache = active.length ? await caches.open(active[active.length-1]) : null;
      const ready = !!cache && (await Promise.all(essentials.map(p => cache.match(p)))).every(Boolean);
      const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
      if (ready) {
        say(persisted ? 'Entire book saved offline; persistent storage enabled.' : 'Entire book saved offline. Device cleanup may still clear browser data.');
        if (persisted && button) { button.textContent = 'Saved on this device'; button.disabled = true; }
      } else say('Preparing the complete 34-dossier book for offline use…');
    } catch { say('Offline save status is unavailable on this device.'); }
  }
  navigator.serviceWorker.register('./service-worker.js', {scope:'./',updateViaCache:'none'})
    .then(async registration => {
      await navigator.serviceWorker.ready;
      await statusCheck();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (installing) installing.addEventListener('statechange', () => {
          if (installing.state === 'activated') statusCheck();
        });
      });
    })
    .catch(() => say('Offline setup failed. Reopen the page online to retry.'));
  navigator.serviceWorker.addEventListener('controllerchange', statusCheck);
  if (button) button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      // Browser decides whether storage is persistable, never guaranteed.
      const granted = !!(navigator.storage?.persist && await navigator.storage.persist());
      await statusCheck();
      if (!granted) say('Book saved offline. Persistent storage was not granted by this browser; avoid clearing site data.');
    } catch { say('Book remains cached, but persistent storage is unavailable here.'); }
    if (!button.textContent.includes('Saved on')) button.disabled = false;
  });
})();
