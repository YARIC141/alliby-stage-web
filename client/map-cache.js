// Cache only tiles requested by the visible map. Never download areas/zoom levels in advance.
// This file is also shipped in admin: each worker owns its cache within its application scope.
const MAP_CACHE = 'alliby-map-' + new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi, '') + '-v1';
const MAP_LIMIT = 1200, MAP_BYTES = 96 * 1024 * 1024;
const MAP_DEFAULT_TTL = 7 * 864e5;
const mapPending = new Map();
let mapTrimAt = 0;

function mapTile(url) {
  const u = new URL(url);
  if (!((u.hostname === 'alliby.ru' && u.pathname.startsWith('/osm-tiles/')) || u.hostname === 'tile.openstreetmap.org')) return null;
  return u.pathname.match(/\/(\d{1,2})\/(\d+)\/(\d+)\.png$/)?.slice(1).join('/') || null;
}

async function mapNotice(type) {
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type }));
}

async function trimMap(cache) {
  if (Date.now() - mapTrimAt < 5000) return;
  mapTrimAt = Date.now();
  const keys = await withTimeout(cache.keys());
  let bytes = 0;
  const rows = [];
  for (const key of keys) {
    const r = await withTimeout(cache.match(key));
    const size = +(r?.headers.get('x-alliby-size') || 0);
    bytes += size;
    rows.push({ key, size });
  }
  let count = keys.length;
  for (const row of rows) {
    if (count <= MAP_LIMIT && bytes <= MAP_BYTES) break;
    await withTimeout(cache.delete(row.key));
    count--; bytes -= row.size;
  }
}

async function fetchMap(request, tile) {
  let resp;
  try {
    resp = await fetchTimeout(request, 3500);
    if (resp.ok && /^image\//i.test(resp.headers.get('content-type') || '')) return resp;
  } catch {}
  // The application server may be down while the internet still works.
  if (new URL(request.url).hostname !== 'tile.openstreetmap.org') {
    resp = await fetchTimeout(new Request('https://tile.openstreetmap.org/' + tile + '.png', {
      mode: 'cors', credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin',
    }), 5000);
    if (resp.ok && /^image\//i.test(resp.headers.get('content-type') || '')) return resp;
  }
  throw new Error('map-unavailable');
}

function updateMap(request, tile, key, cache) {
  if (mapPending.has(key)) return mapPending.get(key);
  const pending = (async () => {
    const resp = await fetchMap(request, tile);
    if (cache && !/no-store/i.test(resp.headers.get('cache-control') || '')) {
      const body = await resp.clone().arrayBuffer();
      const headers = new Headers(resp.headers);
      const maxAge = resp.headers.get('cache-control')?.match(/max-age=(\d+)/i);
      const expires = Date.parse(resp.headers.get('expires') || '');
      const date = Date.parse(resp.headers.get('date') || '');
      const age = Math.max(+(resp.headers.get('age') || 0) * 1000, Number.isFinite(date) ? Date.now() - date : 0);
      const ttl = maxAge ? Math.max(0, +maxAge[1] * 1000 - age) : Number.isFinite(expires) ? Math.max(0, expires - Date.now()) : MAP_DEFAULT_TTL;
      headers.set('x-alliby-until', String(Date.now() + ttl));
      headers.set('x-alliby-size', String(body.byteLength));
      headers.delete('content-encoding');
      headers.set('content-length', String(body.byteLength));
      try {
        await withTimeout(cache.put(key, new Response(body, { status: 200, headers })));
      } catch { /* Quota/storage errors must not hide a successfully downloaded tile. */ }
    }
    return resp;
  })();
  mapPending.set(key, pending);
  pending.then(() => mapPending.delete(key), () => mapPending.delete(key));
  return pending;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const tile = mapTile(event.request.url);
  if (!tile) return;
  event.respondWith((async () => {
    const key = new URL('_map-cache/' + tile, self.registration.scope).href;
    const cache = await withTimeout(caches.open(MAP_CACHE)).catch(() => null);
    const hit = cache && await withTimeout(cache.match(key)).catch(() => null);
    if (hit) {
      if (self.navigator.onLine === false) event.waitUntil(mapNotice('MAP_CACHE_USED'));
      if (self.navigator.onLine !== false && Date.now() >= +(hit.headers.get('x-alliby-until') || 0)) {
        event.waitUntil(updateMap(event.request, tile, key, cache).then(() => trimMap(cache)).catch(() => mapNotice('MAP_CACHE_USED')));
      }
      return hit;
    }
    try {
      const pending = updateMap(event.request, tile, key, cache);
      // Pruning a large cache must not hold up the tile that has just downloaded.
      event.waitUntil(pending.then(() => cache && trimMap(cache)).catch(() => {}));
      return (await pending).clone();
    }
    catch { event.waitUntil(mapNotice('MAP_UNAVAILABLE')); return Response.error(); }
  })());
});
