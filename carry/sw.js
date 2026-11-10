// v217476898334513
const APP_CACHE = 'alliby-carry-app-v217476898334513';

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

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(stRace(precacheShell(), 12000).catch(() => {}));
});

// Оболочка сохраняется сразу при установке SW: иначе она попадает в кэш только при следующем
// открытии под управлением SW, и первое же открытие без сети показывало «Нет соединения».
async function precacheShell() {
  const scope = self.registration.scope;
  const cache = await stRace(caches.open(APP_CACHE), 2000);
  if (await stRace(cache.match(scope, { ignoreSearch: true }), 2000)) return;
  const resp = await fetchTimeout(new Request(scope, { cache: 'no-cache' }));
  if (resp.ok) await stRace(cache.put(scope, resp), 2000);
}

// Любая сохранённая оболочка этого приложения — для открытия без сети
async function findShell() {
  const scope = self.registration.scope;
  try {
    const hit = await stRace(caches.match(scope, { ignoreSearch: true }), 1000).catch(() => null);
    if (hit) return hit;
    for (const name of await stRace(caches.keys(), 1000)) {
      if (!name.startsWith('alliby-carry-app-v')) continue;
      const c = await stRace(caches.open(name), 1000);
      for (const r of await stRace(c.keys(), 1000)) {
        if (!r.url.startsWith(scope)) continue;
        const resp = await stRace(c.match(r), 1000);
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
const STATIC_CACHE = 'alliby-carry-static-v217476898334513';
const STATIC_FILES = [
  'fonts/fonts.css',
  'fonts/01-cyrillic.woff2',
  'fonts/02-latin.woff2',
  'fonts/03-cyrillic.woff2',
  'fonts/04-latin.woff2',
  'fonts/05-cyrillic.woff2',
  'fonts/06-latin.woff2'
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

// Новый APP_CACHE после каждого деплоя пуст: первый запуск на плохой сети не успевает скачать
// оболочку. Переносим её из самого свежего старого кэша — открывается сразу, фон обновит.
async function seedAppCache(keys) {
  try {
    const olds = keys.filter(k => k.startsWith('alliby-carry-app-v') && k !== APP_CACHE)
      .sort((x, y) => (parseInt(y.slice(18), 10) || 0) - (parseInt(x.slice(18), 10) || 0));
    if (!olds.length) return;
    const nc = await caches.open(APP_CACHE);
    const oc = await caches.open(olds[0]);
    for (const r of await oc.keys()) {
      if (await nc.match(r)) continue;
      const resp = await oc.match(r);
      if (resp) await nc.put(r, resp);
    }
  } catch {}
}

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(async keys => {
        await seedAppCache(keys);
        await Promise.all(keys.filter(k => k.startsWith('alliby-carry-app-v') && k !== APP_CACHE).map(k => caches.delete(k)));
      })
      .then(() => self.clients.claim())
  );
});

// Revalidates the cached app shell against the network and notifies clients via
// APP_UPDATED when it changed. Normally runs as a side effect of a real navigation
// (see the 'navigate' fetch handler below) — but mobile OSes routinely resume a
// suspended app instead of re-navigating it, so a device can sit on a stale
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
  const cache = await caches.open(APP_CACHE);
  const req = new Request(url);
  const cached = await cache.match(req, { ignoreSearch: true });
  const resp = await fetchTimeout(new Request(url, { cache: 'no-cache' })).catch(() => null);
  if (!resp || !resp.ok) return;
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
  if (e.request.mode !== 'navigate') return;

  e.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });

    // waitUntil держит воркер живым до конца ревалидации — без него фоновый
    // fetch обрывается, если приложение закрывают сразу после открытия
    // (обычный сценарий), и кэш никогда не обновляется до свежей версии.
    const refresh = (async () => {
      const resp = await fetchTimeout(new Request(e.request.url, { cache: 'no-cache' })).catch(() => null);
      if (!resp || !resp.ok) return;
      const changed = cached && await cached.clone().text() !== await resp.clone().text();
      await putShell(cache, e.request.url, resp.clone());
      if (changed) await notifyAppUpdated();
    })();
    e.waitUntil(refresh);

    if (cached) return cached;
    await refresh;
    // Сети нет — любая сохранённая оболочка лучше ошибки браузера
    return (await cache.match(e.request)) || (await findShell()) || fetchTimeout(e.request);
  })());
});
