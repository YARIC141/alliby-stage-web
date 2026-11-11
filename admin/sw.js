importScripts('map-cache.js');
// v129526011704129
const APP_CACHE  = 'aliby-admin-app-v129526011704129';
const ACADEMY_ASSETS = ['business-academy.js','business-academy.css'];
const TILE_CACHE = 'aliby-admin-tiles-v2';
const TILE_PATH  = '/functions/v1/vector-tiles/';
const MAX_TILES  = 300;

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

// Safari/WebKit bug: after a tab is backgrounded and resumed, the CacheStorage
// IPC channel can come back broken — caches.open()/cache.match() then hang
// forever (never resolve, never reject), which freezes navigation entirely.
// Race every cache call against a timeout and fall back to network on trip.
const CACHE_TIMEOUT_MS = 2000;
function withTimeout(promise, ms = CACHE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('sw-cache-timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
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
  if (!await withTimeout(cache.match(scope, { ignoreSearch: true }), 2000)) {
    const resp = await fetchTimeout(new Request(scope, { cache: 'no-cache' }));
    if (resp.ok) await withTimeout(cache.put(scope, resp), 2000);
  }
  await Promise.all(ACADEMY_ASSETS.map(async file=>{
    const url=new URL(file,scope).href,resp=await fetchTimeout(new Request(url,{cache:'no-cache'}));
    if(resp.ok)await withTimeout(cache.put(url,resp),2000);
  }));
}

// Любая сохранённая оболочка этого приложения — для открытия без сети
async function findShell() {
  const scope = self.registration.scope;
  try {
    const hit = await withTimeout(caches.match(scope, { ignoreSearch: true }), 1000).catch(() => null);
    if (hit) return hit;
    for (const name of await withTimeout(caches.keys(), 1000)) {
      if (!name.startsWith('aliby-admin-app-v')) continue;
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
const STATIC_CACHE = 'aliby-admin-static-v1';
const STATIC_FILES = [
  'fonts/fonts.css',
  'fonts/01-latin.woff2',
  'fonts/02-latin.woff2',
  'fonts/03-cyrillic.woff2',
  'fonts/04-latin.woff2',
  'fonts/05-cyrillic.woff2',
  'fonts/06-latin.woff2',
  'vendor/jsQR.js',
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
  if(ACADEMY_ASSETS.some(file=>new URL(file,self.registration.scope).href===e.request.url.split('?')[0])){
    e.respondWith(fetchTimeout(new Request(e.request,{cache:'no-cache'}),5000).then(async response=>{
      if(!response.ok)throw new Error('academy-asset-unavailable');
      const cache=await withTimeout(caches.open(APP_CACHE));await withTimeout(cache.put(e.request,response.clone()));return response;
    }).catch(async()=>await withTimeout(caches.match(e.request,{ignoreSearch:true})).catch(()=>null)||Response.error()));
    return;
  }
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

// Новый APP_CACHE после каждого деплоя пуст: первый запуск на плохой сети не успевает скачать
// оболочку. Переносим её из самого свежего старого кэша — открывается сразу, фон обновит.
async function seedAppCache(keys) {
  try {
    const olds = keys.filter(k => k.startsWith('aliby-admin-app-v') && k !== APP_CACHE)
      .sort((x, y) => (parseInt(y.slice(17), 10) || 0) - (parseInt(x.slice(17), 10) || 0));
    if (!olds.length) return;
    const nc = await withTimeout(caches.open(APP_CACHE));
    const oc = await withTimeout(caches.open(olds[0]));
    for (const r of await withTimeout(oc.keys())) {
      if (await withTimeout(nc.match(r))) continue;
      const resp = await withTimeout(oc.match(r));
      if (resp) await withTimeout(nc.put(r, resp));
    }
  } catch {}
}

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(async keys => {
        await seedAppCache(keys);
        await Promise.all(keys.filter(k => k.startsWith('aliby-admin-app-v') && k !== APP_CACHE).map(k => caches.delete(k)));
      })
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const cache = await caches.open(TILE_CACHE);
  const keys  = await cache.keys();
  if (keys.length > MAX_TILES)
    await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => cache.delete(k)));
}

// Revalidates the cached app shell against the network and notifies clients via
// APP_UPDATED when it changed. Normally runs as a side effect of a real navigation
// (see the 'navigate' fetch handler below) — but mobile OSes routinely resume a
// suspended tab/PWA instead of re-navigating it, so a device can sit on a stale
// cached shell indefinitely across many "close and reopen" cycles. The 'message'
// listener lets the page trigger this check explicitly on every foreground resume.
// Оболочка хранится под одним ключом — адресом без ?query. Иначе свежая версия, открытая по
// ссылке с параметрами (?v=…), сохранялась под своим адресом, а match(ignoreSearch)
// продолжал отдавать самую старую запись — и «Обновить» показывал ту же старую версию.
async function putShell(cache, url, resp) {
  const u = new URL(url); u.search = ''; u.hash = '';
  await Promise.resolve(cache.delete(u.href, { ignoreSearch: true })).catch(() => {});
  await cache.put(u.href, resp);
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

self.addEventListener('fetch', e => {
  if (e.request.url.includes(TILE_PATH)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetchTimeout(e.request).then(resp => {
        if (resp.ok) caches.open(TILE_CACHE).then(c => { c.put(e.request, resp.clone()); trimTiles(); });
        return resp;
      }))
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      withTimeout(caches.open(APP_CACHE).then(async cache => ({ cache, cached: await cache.match(e.request, { ignoreSearch: true }) })))
        .then(({ cache, cached }) => {
          if (cached) {
            checkAppShellUpdate(e.request.url).catch(() => {});
            return cached;
          }
          return fetchRace(e.request).then(resp => {
            if (resp.ok) putShell(cache, e.request.url, resp.clone()).catch(() => {});
            return resp;
          });
        })
        // CacheStorage завис (Safari) или сеть упала: идём в сеть мимо кэша, а при неудаче
        // отдаём оболочку из кэша либо страницу-самолечение вместо "Safari не удалось открыть страницу".
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
