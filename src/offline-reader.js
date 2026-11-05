/* Installability, saved-book status, offline font warming and edition updates.
 * Entirely separate from the book's print, chapter and navigation engine.
 */
(() => {
  'use strict';
  const status = document.getElementById('offlineStatus');
  const button = document.getElementById('keepOffline');
  const updateNotice = document.getElementById('editionUpdateNotice');
  const reloadButton = document.getElementById('editionReloadBtn');
  const dismissButton = document.getElementById('editionDismissBtn');
  const say = (text) => { if (status) status.textContent = text; };
  const essentials = [
    './index.html','./manifest.webmanifest','./icons/icon-192.png',
    './icons/icon-512.png','./og-image.jpg','./404.html','./sitemap.xml','./robots.txt'
  ];
  let hadController = !!navigator.serviceWorker?.controller;
  let fontWarmInProgress = false;
  let lastUpdateCheck = 0;
  let registrationRef = null;

  // Edition updates take priority over the resume suggestion. The reader
  // controls its own deferred resume prompt via this UI-only notification.
  function setEditionNotice(visible) {
    if (!updateNotice) return;
    updateNotice.hidden = !visible;
    window.dispatchEvent(new CustomEvent('hikam:edition-notice',{detail:{visible}}));
  }
  function showEditionNotice() { setEditionNotice(true); }
  if (reloadButton) reloadButton.addEventListener('click', () => location.reload());
  if (dismissButton) dismissButton.addEventListener('click', () => setEditionNotice(false));

  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    say('Full offline installation is not supported by this browser.');
    if (button) button.hidden = true;
    return;
  }

  async function statusCheck() {
    try {
      const names = await caches.keys();
      const active = names.filter((n) => n.startsWith('11am-hikam-reader-'));
      const cache = active.length ? await caches.open(active[active.length-1]) : null;
      const ready = !!cache && (await Promise.all(essentials.map((path) => cache.match(path)))).every(Boolean);
      const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
      if (ready) {
        say(persisted ? 'Entire book saved offline; persistent storage enabled.' : 'Entire book saved offline. Device cleanup may still clear browser data.');
        if (persisted && button) { button.textContent = 'Saved on this device'; button.disabled = true; }
      } else {
        say('Preparing the complete 34-dossier book for offline use…');
      }
    } catch { say('Offline save status is unavailable on this device.'); }
  }

  // These are the same typefaces already referenced by the original Google
  // Fonts stylesheet. We keep the design and let a controlled page save the
  // used CDN responses for later offline reading, without distributing fonts.
  async function warmFontCache() {
    if (fontWarmInProgress || !navigator.onLine || !navigator.serviceWorker.controller) return;
    fontWarmInProgress = true;
    try {
      if (document.fonts?.load) {
        await Promise.allSettled([
          ['400 16px "Fraunces"','Knowledge'],['700 16px "Fraunces"','Wisdom'],
          ['400 16px "Source Serif 4"','Knowledge'],['italic 400 16px "Source Serif 4"','Wisdom'],
          ['400 14px "IBM Plex Sans"','Study'],['600 14px "IBM Plex Sans"','Study'],
          ['400 14px "IBM Plex Mono"','Study'],
          ['400 18px "Amiri"','فلسفة وحكمة'],['700 18px "Amiri"','فلسفة وحكمة'],
          ['400 18px "Amiri Quran"','بِسْمِ اللَّهِ'],
          ['400 14px "Noto Sans Arabic"','دراسات فلسفية']
        ].map(([rule,sample]) => document.fonts.load(rule,sample)));
        await document.fonts.ready;
      }
      const urls = new Set();
      const googleLink = document.querySelector('link[href^="https://fonts.googleapis.com/"]');
      if (googleLink) urls.add(googleLink.href);
      for (const item of performance.getEntriesByType('resource')) {
        if (/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(item.name)) urls.add(item.name);
      }
      if (urls.size) {
        const channel = new MessageChannel();
        const done = new Promise((resolve) => {
          const timeout = setTimeout(resolve,15000);
          channel.port1.onmessage = () => { clearTimeout(timeout);resolve(); };
        });
        navigator.serviceWorker.controller.postMessage({type:'PREPARE_FONTS',urls:[...urls]},[channel.port2]);
        await done;
        channel.port1.close();
      }
    } catch { /* Optional font warm-up must never obstruct offline book use. */ }
    fontWarmInProgress = false;
  }

  async function checkForUpdate() {
    if (!navigator.onLine || !registrationRef) return;
    // Avoid a network check on every tab focus; check at most once per minute.
    const now = Date.now();
    if (now - lastUpdateCheck < 60000) return;
    lastUpdateCheck = now;
    try { await registrationRef.update(); } catch { /* Offline reading remains available. */ }
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    statusCheck();
    if (hadController) showEditionNotice();
    hadController = true;
    warmFontCache();
  });

  navigator.serviceWorker.register('./service-worker.js', {scope:'./',updateViaCache:'none'})
    .then(async (registration) => {
      registrationRef = registration;
      await navigator.serviceWorker.ready;
      await statusCheck();
      await checkForUpdate();
      warmFontCache();
    })
    .catch(() => say('Offline setup failed. Reopen the page online to retry.'));

  window.addEventListener('online', () => { checkForUpdate();warmFontCache(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });

  if (button) button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const granted = !!(navigator.storage?.persist && await navigator.storage.persist());
      await statusCheck();
      if (!granted) say('Book saved offline. Persistent storage was not granted by this browser; avoid clearing site data.');
    } catch { say('Book remains cached, but persistent storage is unavailable here.'); }
    if (!button.textContent.includes('Saved on')) button.disabled = false;
  });
})();
