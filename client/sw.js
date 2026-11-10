importScripts('map-cache.js');
// v31124427290699
const APP_CACHE  = 'alliby-app-v31124427290699';
const API_CACHE  = 'alliby-api-v1';
const IMG_CACHE  = 'alliby-img-v1';
const VID_CACHE  = 'alliby-vid-v1';
const MAX_IMG    = 600;
const MAX_VID    = 8;
const MAX_VID_BYTES = 12 * 1024 * 1024;
const MAX_API    = 120;

// Safari/WebKit bug: after a tab is backgrounded and resumed, the CacheStorage
// IPC channel can come back broken — caches.open()/cache.match() then hang
// forever (never resolve, never reject), which freezes navigation entirely.
// Race every cache call against a timeout and fall back to network on trip.
const CACHE_TIMEOUT_MS = 2000;
// Несколько срывов кэша подряд = CacheStorage завис: 5 минут не ждём его вовсе (иначе каждая
// картинка и каждый запрос теряют по 2 с) и просим страницу показать подсказку про очистку данных сайта.
const CACHE_STALLS_LIMIT = 3;
let _cacheStalls = 0, _cacheDeadUntil = 0, _cacheHintAt = 0;
function _cacheStalled() {
  if (++_cacheStalls < CACHE_STALLS_LIMIT) return;
  _cacheDeadUntil = Date.now() + 5 * 60000;
  if (Date.now() - _cacheHintAt < 10 * 60000) return;
  _cacheHintAt = Date.now();
  self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'CACHE_STUCK' }))).catch(() => {});
}
function withTimeout(promise, ms = CACHE_TIMEOUT_MS) {
  // считаем только вызовы самого кэша — длинные таймауты оборачивают и сетевые запросы
  const cacheCall = ms <= CACHE_TIMEOUT_MS;
  if (cacheCall && Date.now() < _cacheDeadUntil) {
    promise.catch(() => {});
    return Promise.reject(new Error('sw-cache-stuck'));
  }
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { if (cacheCall) _cacheStalled(); reject(new Error('sw-cache-timeout')); }, ms);
    promise.then(v => { clearTimeout(t); if (cacheCall) _cacheStalls = 0; resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

// Plain fetch() never rejects on its own when a connection is blackholed
// (packets silently dropped instead of cleanly refused) — without this,
// a network fetch inside the SW can hang forever and freeze the whole
// page navigation before index.html's own JS ever gets a chance to run.
const NET_TIMEOUT_MS = 10000;
function fetchTimeout(request, ms = NET_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Navigate-запросы: fetch(request, {signal}) на Request с mode:'navigate' в WebKit может падать,
// поэтому для навигации ограничиваем время гонкой с таймером, без AbortController.
function fetchRace(request, ms = NET_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('sw-net-timeout')), ms);
    fetch(request).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

// Never erase stored data merely because the application server is unavailable.
const HEAL_HTML = '<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px sans-serif;padding:32px">Нет соединения. Для первого запуска нужна сеть.<br><br><button onclick="location.reload()">Повторить</button></body></html>';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(withTimeout(precacheShell(), 12000).catch(() => {}));
});

// Оболочка сохраняется сразу при установке SW: иначе она попадает в кэш только при следующем
// открытии под управлением SW, и первое же открытие без сети показывало «Нет соединения».
async function precacheShell() {
  const scope = self.registration.scope;
  const cache = await withTimeout(caches.open(APP_CACHE), 2000);
  if (await withTimeout(cache.match(scope, { ignoreSearch: true }), 2000)) return;
  const resp = await fetchTimeout(new Request(scope, { cache: 'no-cache' }));
  if (resp.ok) await withTimeout(cache.put(scope, resp), 2000);
}

// Любая сохранённая оболочка этого приложения — для открытия без сети
async function findShell() {
  const scope = self.registration.scope;
  try {
    const hit = await withTimeout(caches.match(scope, { ignoreSearch: true }), 1000).catch(() => null);
    if (hit) return hit;
    for (const name of await withTimeout(caches.keys(), 1000)) {
      if (!name.startsWith('alliby-app-v')) continue;
      const c = await withTimeout(caches.open(name), 1000);
      for (const r of await withTimeout(c.keys(), 1000)) {
        if (!r.url.startsWith(scope)) continue;
        const resp = await withTimeout(c.match(r), 1000);
        if (resp) return resp;
      }
    }
  } catch {}
  return null;
}

// ── Precache статики (шрифты и библиотеки со своего домена) ───────────────────
// Отдельный кэш, не пересоздаётся при каждом деплое. Если файл в списке изменился —
// увеличьте номер версии в имени STATIC_CACHE. Любые сбои тихо игнорируются:
// приложение просто берёт файл из сети, как раньше.
const STATIC_CACHE = 'alliby-static-v31124427290699';
const STATIC_FILES = [
  'academy-data.js',
  'academy.js',
  'academy.css',
  'comparison.js',
  'comparison.css',
  'favorites.js',
  'favorites.css',
  'store-stars.js',
  'store-stars.css',
  'fonts/fonts.css',
  'fonts/01-cyrillic.woff2',
  'fonts/02-latin.woff2',
  'fonts/03-cyrillic.woff2',
  'fonts/04-latin.woff2',
  'fonts/05-cyrillic.woff2',
  'fonts/06-latin.woff2',
  'fonts/07-cyrillic.woff2',
  'fonts/08-latin.woff2',
  'vendor/maplibre-gl.css',
  'vendor/maplibre-gl.js',
  'vendor/qrcode.min.js'
].map(p => new URL(p, self.registration.scope).href);
const STATIC_SET = new Set(STATIC_FILES);

function stRace(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('sw-static-timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function precacheStatic() {
  const cache = await stRace(caches.open(STATIC_CACHE), 3000);
  await Promise.allSettled(STATIC_FILES.map(async u => {
    if (await stRace(cache.match(u), 3000)) return;
    const r = await stRace(fetch(u), 15000);
    if (r.ok) await cache.put(u, r);
  }));
}

self.addEventListener('install', e => {
  e.waitUntil(stRace(precacheStatic(), 12000).catch(() => {}));
});

// cache-first для файлов из списка; при любой проблеме с кэшем — обычная сеть
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !STATIC_SET.has(req.url)) return;
  const fallback = req.clone();
  e.respondWith((async () => {
    try {
      const cache = await stRace(caches.open(STATIC_CACHE), 2000);
      const hit = await stRace(cache.match(req.url), 2000);
      if (hit) return hit;
      const r = await stRace(fetch(req), 15000);
      if (r.ok) cache.put(req.url, r.clone());
      return r;
    } catch (err) {
      // без ограничения зависшее соединение держало запрос (и белый экран) бесконечно
      return fetchTimeout(fallback);
    }
  })());
});

// The deploy pipeline renames APP_CACHE (alliby-app-v<timestamp>) on every push, so every
// activation here starts from a brand-new, empty cache. That silently broke update detection:
// checkAppShellUpdate() below only notifies clients when it finds a *stale* cached entry to
// diff against, but right after an activate the cache has no entry at all yet, so it no-ops —
// and a suspended/resumed PWA (no real 'navigate' fetch to populate the cache) could then sit
// on old JS/HTML indefinitely, with the update banner never appearing. Presence of an
// old-versioned cache at activate time is itself proof this is a real update (not a first
// install), so notify directly here instead of relying on the empty-cache diff.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(async keys => {
        const isUpdate = keys.some(k => k.startsWith('alliby-app-v') && k !== APP_CACHE);
        // Новый APP_CACHE пуст, а первый запуск после деплоя на плохой сети не успевает скачать
        // оболочку и падает на HEAL_HTML. Поэтому переносим оболочку из самого свежего старого
        // кэша: приложение откроется сразу (stale-while-revalidate), а свежую версию подтянет фон.
        try {
          const olds = keys.filter(k => k.startsWith('alliby-app-v') && k !== APP_CACHE)
            .sort((x, y) => (parseInt(y.slice(12), 10) || 0) - (parseInt(x.slice(12), 10) || 0));
          if (olds.length) {
            const nc = await withTimeout(caches.open(APP_CACHE));
            const oc = await withTimeout(caches.open(olds[0]));
            const reqs = await withTimeout(oc.keys());
            for (const r of reqs) {
              if (await withTimeout(nc.match(r))) continue;
              const resp = await withTimeout(oc.match(r));
              if (resp) await withTimeout(nc.put(r, resp));
            }
          }
        } catch {}
        await Promise.all(
          keys.filter(k => k.startsWith('alliby-app-v') && k !== APP_CACHE).map(k => caches.delete(k))
        );
        await self.clients.claim();
        if (isUpdate) {
          // includeUncontrolled:false on purpose — an *uncontrolled* client here is
          // (almost always) a page that just started navigating under this very SW
          // version, i.e. it's already getting the fresh HTML from the network and
          // doesn't need the banner. Without this guard, reloading from the banner's
          // "Обновить" races this same activate() (still finishing its cache cleanup),
          // the reloading page gets swept into the broadcast as "uncontrolled", and it
          // shows the exact same "new version" banner again right after the reload.
          const clients = await self.clients.matchAll();
          clients.forEach(c => c.postMessage({ type: 'APP_UPDATED' }));
        }
      })
  );
});

async function trimApiCache() {
  const cache = await caches.open(API_CACHE);
  const keys  = await cache.keys();
  if (keys.length > MAX_API)
    await Promise.all(keys.slice(0, keys.length - MAX_API).map(k => cache.delete(k)));
}

// Revalidates the cached app shell against the network and notifies clients via
// APP_UPDATED when it changed. Normally runs as a side effect of a real navigation
// (see the 'navigate' fetch handler below) — but mobile OSes routinely resume a
// suspended tab/PWA instead of re-navigating it, so a device can sit on a stale
// cached shell indefinitely across many "close and reopen" cycles. The 'message'
// listener lets the page trigger this check explicitly on every foreground resume.
// Оболочка хранится под одним ключом — адресом без ?query. Иначе свежая версия, открытая по
// ссылке с параметрами (?v=…, ?store=…), сохранялась под своим адресом, а match(ignoreSearch)
// продолжал отдавать самую старую запись — и «Обновить» показывал ту же старую версию.
async function putShell(cache, url, resp) {
  const u = new URL(url); u.search = ''; u.hash = '';
  await withTimeout(cache.delete(u.href, { ignoreSearch: true })).catch(() => {});
  await withTimeout(cache.put(u.href, resp));
}

// includeUncontrolled spans the entire origin, including other Alliby apps.
async function notifyAppUpdated() {
  const scope = new URL(self.registration.scope);
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    const url = new URL(client.url);
    if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname))
      client.postMessage({ type: 'APP_UPDATED' });
  }
}

async function checkAppShellUpdate(url) {
  const cache = await withTimeout(caches.open(APP_CACHE));
  const req = new Request(url);
  const cached = await withTimeout(cache.match(req, { ignoreSearch: true }));
  const resp = await fetchTimeout(new Request(url, { cache: 'no-cache' }));
  if (!resp.ok) return;
  // Оболочки ещё нет — просто сохраняем её, без баннера обновления
  if (!cached) { await putShell(cache, url, resp); return; }
  // Deploys and local exports can change HTTP dates without changing the app.
  const changed = await cached.clone().text() !== await resp.clone().text();
  await putShell(cache, url, resp.clone());
  if (changed) await notifyAppUpdated();
}

self.addEventListener('message', e => {
  if (e.data?.type !== 'CHECK_APP_UPDATE') return;
  const p = checkAppShellUpdate(self.registration.scope).catch(() => {});
  if (e.waitUntil) e.waitUntil(p);
});

// Кэш с вытеснением давно не открытых: cache.keys() идут в порядке записи, поэтому запись,
// которую снова открыли, переписывается в конец (раз за жизнь SW — чтобы не писать на диск на
// каждый показ). Иначе при листании заведений вытеснялись логотипы с главной и качались заново.
const _touched = new Set();
function _cacheTouch(cache, req, resp) {
  if (_touched.has(req.url)) return;
  _touched.add(req.url);
  cache.put(req, resp.clone()).catch(() => {});
}
const _trimAt = new Map();
function _cacheTrim(cache, max) {
  if (Date.now() - (_trimAt.get(max) || 0) < 5000) return;
  _trimAt.set(max, Date.now());
  cache.keys().then(keys => {
    if (keys.length > max) return Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
  }).catch(() => {});
}

// ── Видео ленты: файл целиком в кэше, браузеру отдаём запрошенный кусок ─────
// Плеер просит видео диапазонами (Range), а Safari без ответа 206 его не играет. Поэтому при
// первом показе ролик (после сжатия до 8 МБ) скачивается целиком, а дальше любые диапазоны
// режутся из кэша без сети. Одновременные запросы одного ролика ждут одну загрузку.
const _vidLoads = new Map();
function _vidLoad(cache, url) {
  if (!_vidLoads.has(url)) {
    const p = (async () => {
      const resp = await fetchTimeout(new Request(url), 30000);
      const len = +resp.headers.get('content-length') || 0;
      if (resp.status !== 200 || len > MAX_VID_BYTES) { resp.body?.cancel().catch(() => {}); return null; }
      await withTimeout(cache.put(url, resp.clone()));
      _cacheTrim(cache, MAX_VID);
      return resp;
    })().finally(() => _vidLoads.delete(url));
    _vidLoads.set(url, p);
  }
  return _vidLoads.get(url).then(r => r && r.clone());
}
async function _vidRange(resp, range) {
  const blob = await resp.blob();
  const size = blob.size;
  const type = resp.headers.get('content-type') || 'video/mp4';
  const m = /^bytes=(\d*)-(\d*)$/.exec(range || '');
  if (!m || (m[1] === '' && m[2] === '')) {
    return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  }
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - +m[2]); end = size - 1; }
  else { start = +m[1]; end = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1); }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': type, 'Content-Length': String(end - start + 1),
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes',
  } });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // version.json — проверка версии приложения, всегда напрямую в сеть
  if (url.pathname.endsWith('/version.json')) return;

  // только свои /media/: ответ с чужого домена непрозрачный, его не нарезать
  if (e.request.destination === 'video' && url.origin === self.location.origin && url.pathname.startsWith('/media/')) {
    const range = e.request.headers.get('range');
    const vurl = url.origin + url.pathname;
    e.respondWith((async () => {
      const cache = await withTimeout(caches.open(VID_CACHE));
      const hit = await withTimeout(cache.match(vurl));
      if (hit) { _cacheTouch(cache, new Request(vurl), hit); return _vidRange(hit, range); }
      const full = await _vidLoad(cache, vurl);
      return full ? _vidRange(full, range) : fetchTimeout(e.request);
    })().catch(() => fetchTimeout(e.request)));
    return;
  }

  // ── Images: cache-first, вытесняются давно не открытые ───────────────────
  if (e.request.destination === 'image') {
    e.respondWith(
      withTimeout(caches.open(IMG_CACHE).then(cache => cache.match(e.request).then(cached => ({ cache, cached }))))
        .then(({ cache, cached }) => {
          if (cached) { _cacheTouch(cache, e.request, cached); return cached; }
          return fetchTimeout(e.request).then(resp => {
            if (resp.ok) {
              cache.put(e.request, resp.clone()).then(() => _cacheTrim(cache, MAX_IMG)).catch(() => {});
            }
            return resp;
          });
        })
        .catch(() => fetchTimeout(e.request))
    );
    return;
  }

  // REST caching belongs to the identity-scoped page cache in IndexedDB.

  // ── App shell (HTML navigate): stale-while-revalidate ─────────────────────
  if (e.request.mode === 'navigate') {
    e.respondWith(
      withTimeout(caches.open(APP_CACHE).then(async cache => ({ cache, cached: await cache.match(e.request, { ignoreSearch: true }) })))
        .then(({ cache, cached }) => {
          if (cached) {
            // Serve from cache immediately, revalidate in background
            checkAppShellUpdate(e.request.url).catch(() => {});
            return cached;
          }

          // First load — fetch from network and cache
          return fetchRace(e.request).then(resp => {
            if (resp.ok) putShell(cache, e.request.url, resp.clone()).catch(() => {});
            return resp;
          });
        })
        // Cache API hung (Safari: CacheStorage IPC breaks after tab resumes from
        // background) or network failed — bypass cache and go straight to network,
        // falling back to a cached shell (best-effort) only if that also fails.
        .catch(async () => {
          try {
            return await fetchRace(e.request);
          } catch {
            const fallback = await findShell();
            return fallback || new Response(HEAL_HTML, {
              status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
          }
        })
    );
    return;
  }
});

// ── IndexedDB helpers for persisting promo notifications ─────────────────────
function _idbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('alliby-sw', 1);
    req.onupgradeneeded = ev => ev.target.result.createObjectStore('promos', { autoIncrement: true });
    req.onsuccess = ev => res(ev.target.result);
    req.onerror   = ev => rej(ev.target.error);
  });
}
function _idbSave(item) {
  return _idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction('promos', 'readwrite');
    tx.objectStore('promos').add(item);
    tx.oncomplete = res; tx.onerror = ev => rej(ev.target.error);
  }));
}
function _idbFlush() {
  return _idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction('promos', 'readwrite');
    const store = tx.objectStore('promos');
    const items = [];
    store.openCursor().onsuccess = ev => {
      const cur = ev.target.result;
      if (cur) { items.push({ key: cur.key, ...cur.value }); cur.continue(); }
      else {
        items.forEach(i => store.delete(i.key));
        tx.oncomplete = () => res(items);
      }
    };
    tx.onerror = ev => rej(ev.target.error);
  }));
}

// ── Web Push: show notification and save to bell immediately ──────────────────
self.addEventListener('push', e => {
  let payload;
  if (e.data) {
    try { payload = e.data.json(); } catch { payload = { title: 'Alliby', body: e.data.text() }; }
  } else {
    payload = { title: 'Alliby', body: 'Новое уведомление' };
  }
  const { title = 'Alliby', body = '', data = {} } = payload;
  const isPromo = !data.type || data.type === 'promo';

  e.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body, icon: '/icons/client-192.png', badge: '/icons/client-192.png',
      data, tag: data.store_id ? 'promo-' + data.store_id : 'promo',
    }),
    // Save promo to bell immediately — post to open clients or persist in IDB
    isPromo && (async () => {
      const notif = { title, body, store_id: data.store_id || null };
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clients.length) {
        clients.forEach(c => c.postMessage({ type: 'SW_PROMO_RECEIVED', ...notif }));
      } else {
        await _idbSave(notif);
      }
    })(),
  ]));
});

// ── Web Push: user tapped notification ───────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const nd = e.notification.data || {};
  const isPromo = !nd.type || nd.type === 'promo';
  const storeId = nd.store_id || null;
  // Pass raw notification data so client decides routing (promo vs order)
  const msg = { type: 'SW_NOTIF_TAP', notif_type: nd.type || 'promo', title: e.notification.title, body: e.notification.body, store_id: storeId };
  const url = isPromo && storeId ? '/?promo_store=' + storeId : '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const client = clients.find(c => 'focus' in c);
      if (client) { client.postMessage(msg); return client.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
