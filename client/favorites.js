/* Device-local public catalogue only; shared across accounts on this device. */
const FAVORITES_KEY = 'alliby_favorites_v1';
let _favoriteItems = null, _favoriteFilter = '', _favoriteRequest = null, _favoriteOpenToken = 0;
const _favoriteIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z"/></svg>';

function favoriteItems() {
  if (!_favoriteItems) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(FAVORITES_KEY)); } catch {}
    const seen = new Set();
    _favoriteItems = (Array.isArray(saved?.items) ? saved.items : []).filter(entry => {
      if (!entry || !_compareUuid.test(entry.item?.id) || !_compareUuid.test(entry.store?.id) ||
          entry.item.store_id !== entry.store.id || !Object.hasOwn(_compareDirections,entry.store.direction) || seen.has(entry.item.id)) return false;
      seen.add(entry.item.id); return true;
    });
  }
  return _favoriteItems;
}
function findFavorite(id) { return favoriteItems().find(entry => entry.item.id === id); }
function _saveFavorites() {
  try { localStorage.setItem(FAVORITES_KEY,JSON.stringify({version:1,items:favoriteItems()})); return true; }
  catch { return false; }
}
function favoriteButton(item) {
  const selected = !!findFavorite(item.id), label = selected ? 'В избранном' : 'В избранное';
  return `<button type="button" class="btn btn-p ia-add favorite-toggle${selected ? ' selected' : ''}" data-item-id="${esc(item.id)}" aria-pressed="${selected}" aria-label="${label}" title="${label}"
    onclick="event.stopPropagation();toggleFavorite(this.dataset.itemId)">${_favoriteIcon}</button>`;
}
function _syncFavoriteButtons() {
  const selected = new Set(favoriteItems().map(entry => entry.item.id));
  document.querySelectorAll('.favorite-toggle[data-item-id]').forEach(button => {
    const on = selected.has(button.dataset.itemId), label = on ? 'В избранном' : 'В избранное';
    button.classList.toggle('selected',on); button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',label); button.title = label;
    const text = button.querySelector('span'); if (text) text.textContent = label;
  });
}
function toggleFavorite(id) {
  if (academyActive()) { showGeoToast('Учебные позиции не сохраняются в обычное избранное'); return; }
  if (!_compareUuid.test(id)) return;
  const previous = favoriteItems().slice(), index = previous.findIndex(entry => entry.item.id === id);
  if (index >= 0) _favoriteItems = previous.filter(entry => entry.item.id !== id);
  else {
    const item = itemCache.get(id);
    const comparison = Object.keys(_compareDirections).flatMap(dir => _compareState(dir).items).find(entry => entry.item.id === id);
    const store = S.store?.id === item?.store_id ? S.store : S.allStores?.find(s => s.id === item?.store_id) || comparison?.store;
    if (!item || !store || !Object.hasOwn(_compareDirections,store.direction || S.direction)) { showGeoToast('Откройте заведение этой позиции'); return; }
    _favoriteItems = [{..._compareSnapshot(item,store),addedAt:Date.now(),checkedAt:0},...previous];
  }
  if (!_saveFavorites()) { _favoriteItems = previous; showGeoToast('Не удалось сохранить избранное на устройстве'); return; }
  _syncFavoriteButtons(); renderHomeFavorites();
  if (index < 0) _comparisonToast('Добавлено в избранное','Открыть',() => {
    goTo('home'); document.getElementById('home-favorites')?.scrollIntoView({block:'start',behavior:'smooth'});
  });
}
function setFavoritesFilter(direction) {
  if (direction && !Object.hasOwn(_compareDirections,direction)) return;
  _favoriteFilter = direction; renderHomeFavorites();
}
function renderHomeFavorites() {
  const root = document.getElementById('home-favorites'); if (!root) return;
  const items = favoriteItems(), directions = [...new Set(items.map(entry => entry.store.direction))];
  if (_favoriteFilter && !directions.includes(_favoriteFilter)) _favoriteFilter = '';
  const visible = items.filter(entry => !_favoriteFilter || entry.store.direction === _favoriteFilter);
  root.innerHTML = `<div class="favorites-heading"><h3 id="home-favorites-title">Избранное${items.length ? ` <span>${items.length}</span>` : ''}</h3></div>` +
    (items.length ? `<div class="favorites-toolbar"><span>Сохранено на этом устройстве</span></div>
      <div class="cart-tabs favorites-tabs" role="group" aria-label="Направление избранного">${['',...directions].map(dir =>
        `<button type="button" class="cart-tab${dir === _favoriteFilter ? ' active' : ''}" data-favorite-direction="${dir}" aria-pressed="${dir === _favoriteFilter}"${dir ? ` style="--accent:${DIR_COLORS[dir]}"` : ''} onclick="setFavoritesFilter(this.dataset.favoriteDirection)">${dir ? esc(_compareDirections[dir]) : 'Все направления'}</button>`).join('')}</div>
      <div class="items-grid favorites-grid">${visible.map(entry => {
        const item = entry.item, dir = entry.store.direction;
        if (!itemCache.has(item.id)) itemCache.set(item.id,item);
        return `<article class="item-card favorite-card" data-favorite-card="${esc(item.id)}" style="--accent:${DIR_COLORS[dir]}" onclick="openFavorite(this.dataset.favoriteCard)">
          <div class="item-img">${item.image_url ? `<img src="${esc(mediaUrl(item.image_url))}" alt="" loading="lazy" decoding="async">` : _favoriteIcon}</div>
          <div class="item-body"><div class="item-name">${esc(item.name)}</div><div class="favorite-store">${esc(entry.store.name)}${storeStarsBadge(entry.store.id)}</div>
          <div class="favorite-direction">${esc(_compareDirections[dir])}</div>
          <div class="favorite-price">${esc(item.price)} ₽ <small>${esc(_comparisonUnit(item))}</small></div>
          ${entry.unavailable || item.is_available === false ? '<div class="favorite-unavailable">Сейчас недоступно</div>' : ''}
          <div class="item-actions favorite-card-actions">${favoriteButton(item)}${comparisonButton(item,dir)}
            <button class="btn btn-p ia-add" type="button" aria-label="Открыть ${esc(item.name)}" title="Подробнее" onclick="event.stopPropagation();openFavorite(this.closest('[data-favorite-card]').dataset.favoriteCard)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></div>
          </div></article>`;
      }).join('')}</div>` : '<p class="favorites-empty">Нажмите сердечко на карточке, чтобы сохранить позицию здесь.</p>');
  loadStoreStars(items.map(entry => entry.store.id));
}
async function refreshFavorites(force = false) {
  const items = favoriteItems(); if (!items.length) return;
  if (navigator.onLine === false) { if (_contentScreen() === 'home') _contentNotice('favorites',true); return; }
  if (!force && items.every(entry => Date.now() - (entry.checkedAt || 0) < COMPARISON_TTL)) return;
  if (_favoriteRequest) return _favoriteRequest;
  const requested = new Map(items.map(entry => [entry.item.id,entry.addedAt]));
  _favoriteRequest = (async () => {
    try {
      const ids = [...requested.keys()], rows = [];
      for (let offset = 0; offset < ids.length; offset += 20) {
        rows.push(...await _comparisonFetch(`/rest/v1/menu_items?id=in.(${ids.slice(offset,offset + 20).join(',')})&select=${_comparisonSelect}`));
      }
      const byId = new Map(rows.map(item => [item.id,item]));
      _favoriteItems = favoriteItems().map(entry => {
        if (!requested.has(entry.item.id) || requested.get(entry.item.id) !== entry.addedAt) return entry;
        const item = byId.get(entry.item.id), store = item?.stores;
        if (!item || !store || item.store_id !== entry.store.id || store.direction !== entry.store.direction ||
            item.is_visible === false || store.is_visible === false || store.archived_at) return {...entry,unavailable:true,checkedAt:Date.now()};
        return {...entry,..._compareSnapshot(item,store),unavailable:false,checkedAt:Date.now()};
      });
      _saveFavorites();
      if (_contentScreen() === 'home') _contentNotice('favorites',false);
    } catch {
      if (_contentScreen() === 'home') _contentNotice('favorites',true);
      if (force) showGeoToast('Не удалось обновить избранное. Сохранённые позиции доступны');
    } finally { _favoriteRequest = null; renderHomeFavorites(); _syncFavoriteButtons(); }
  })();
  return _favoriteRequest;
}
async function openFavorite(id) {
  const entry = findFavorite(id); if (!entry) return;
  const token = ++_favoriteOpenToken, screen = _contentScreen(), direction = S.direction;
  let item = entry.item, store = entry.store, fresh = false;
  try {
    if (navigator.onLine === false) throw new Error('offline');
    const [items,stores] = await Promise.all([
      _comparisonFetch(`/rest/v1/menu_items?id=eq.${id}&select=${_comparisonSelect}`),
      _comparisonFetch(`/rest/v1/stores?id=eq.${entry.store.id}&select=*`),
    ]);
    if (token !== _favoriteOpenToken || _contentScreen() !== screen || S.direction !== direction || !findFavorite(id)) return;
    if (items[0] && stores[0] && items[0].store_id === stores[0].id && stores[0].direction === entry.store.direction &&
        items[0].is_visible !== false && stores[0].is_visible !== false && !stores[0].archived_at) {
      item = items[0]; store = stores[0]; fresh = true;
      _favoriteItems = favoriteItems().map(e => e.item.id === id ? {...e,..._compareSnapshot(item,store),unavailable:false,checkedAt:Date.now()} : e);
    } else _favoriteItems = favoriteItems().map(e => e.item.id === id ? {...e,unavailable:true,checkedAt:Date.now()} : e);
    _saveFavorites();
  } catch { if (_contentScreen() === screen) _contentNotice('favorites',true); }
  if (token !== _favoriteOpenToken || _contentScreen() !== screen || S.direction !== direction || !findFavorite(id)) return;
  if (store.direction !== S.direction) setDirection(store.direction);
  S.store = store; S.storeSubActive = undefined; S.menuUserSubs = []; S.menuStoreSubs = []; S.menuCatId = '';
  try { rememberStore(store); } catch {}
  goTo('store');
  itemCache.set(id,{...item,is_available:fresh ? item.is_available : false});
  openItemDetail(id);
  renderHomeFavorites();
}
function _favoritesTick() {
  if (!document.hidden && _contentScreen() === 'home') refreshFavorites();
}
setInterval(_favoritesTick,60000);
window.addEventListener('online',_favoritesTick);
document.addEventListener('visibilitychange',_favoritesTick);
window.addEventListener('storage',event => {
  if (event.key !== FAVORITES_KEY) return;
  _favoriteItems = null; renderHomeFavorites(); _syncFavoriteButtons();
});
