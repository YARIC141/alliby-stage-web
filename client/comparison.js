/* Public catalogue snapshots only. Comparison never contains accounts or payment keys. */
const COMPARISON_LIMIT = 20;
const COMPARISON_TTL = 86400000;
const _compareStates = Object.create(null);
const _compareRequests = new Map();
const _compareDirections = {food:'Еда', goods:'Товары', services:'Услуги', sport:'Спорт', education:'Образование', entertainment:'Развлечения'};
const _compareUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _compareState(dir = S.direction) {
  const namespace = typeof academyNamespace === 'function' ? academyNamespace(dir) : dir;
  if (!_compareStates[namespace]) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem((typeof academyCompareKey === 'function' ? academyCompareKey(dir) : 'alliby_compare_v1_' + dir))); } catch {}
    const seen = new Set();
    const items = (Array.isArray(saved?.items) ? saved.items : []).filter(entry => {
      if (!entry || !_compareUuid.test(entry.item?.id) || !_compareUuid.test(entry.store?.id) ||
          entry.item.store_id !== entry.store.id || entry.store.direction !== dir || seen.has(entry.item.id)) return false;
      seen.add(entry.item.id); return true;
    }).slice(0, COMPARISON_LIMIT);
    _compareStates[namespace] = {items, tab:saved?.tab === 'compare' ? 'compare' : 'cart',
      differences:!!saved?.differences, category:typeof saved?.category === 'string' ? saved.category : '',
      columnOrder:Array.isArray(saved?.columnOrder) ? saved.columnOrder.filter(id => _compareUuid.test(id)).slice(0,COMPARISON_LIMIT) : []};
  }
  return _compareStates[namespace];
}
function _saveComparison(dir = S.direction) {
  try { localStorage.setItem((typeof academyCompareKey === 'function' ? academyCompareKey(dir) : 'alliby_compare_v1_' + dir), JSON.stringify(_compareState(dir))); } catch {}
}
function _compareSnapshot(item, store) {
  const clean = {};
  for (const key of ['id','store_id','name','description','price','old_price','image_url','category_id','is_available','is_visible',
    'item_type','portion_g','calories','protein','fat','carbs','composition','allergens','preparation_time','duration_minutes',
    'rent_period_unit','rent_period_step','total_quantity','quantity_available','includes','is_new','is_hit']) {
    const value = item[key];
    if (value == null || ['string','number','boolean'].includes(typeof value)) clean[key] = value;
  }
  clean.categories = {name:item.categories?.name || ''};
  clean.item_price_rules = (item.item_price_rules || []).map(r => ({price:r.price,days:r.days,time_from:r.time_from,time_to:r.time_to}));
  clean.menu_item_option_groups = (item.menu_item_option_groups || _optGroupsCache.get(item.id) || []).map(g => ({name:g.name,required:!!g.required,
    menu_item_options:(g.menu_item_options || []).filter(o => o.is_available !== false).map(o => ({name:o.name,price_add:o.price_add}))}));
  const publicStore = {id:store.id,name:store.name,direction:store.direction || S.direction,address:store.address,
    is_visible:store.is_visible,archived_at:store.archived_at};
  return {item:clean,store:publicStore};
}
function comparisonButton(item, dir = S.direction) {
  const selected = _compareState(dir).items.some(e => e.item.id === item.id);
  const label = selected ? 'В сравнении' : 'Сравнить';
  return `<button type="button" class="btn btn-p ia-add compare-toggle${selected ? ' selected' : ''}" data-item-id="${esc(item.id)}" data-direction="${esc(dir)}" aria-pressed="${selected}" aria-label="${label}" title="${label}"
    onclick="event.stopPropagation();toggleComparison(this.dataset.itemId,this.dataset.direction)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 19V9m8 10V4m8 15v-7M1 19h22"/></svg></button>`;
}
function _syncComparisonButtons() {
  const selected = new Map();
  document.querySelectorAll('.compare-toggle[data-item-id]').forEach(button => {
    const dir = button.dataset.direction || S.direction;
    if (!selected.has(dir)) selected.set(dir,new Set(_compareState(dir).items.map(e => e.item.id)));
    const on = selected.get(dir).has(button.dataset.itemId);
    button.classList.toggle('selected',on); button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',on ? 'В сравнении' : 'Сравнить'); button.title = on ? 'В сравнении' : 'Сравнить';
    const label = button.querySelector('span'); if (label) label.textContent = on ? 'В сравнении' : 'Сравнить';
  });
}
function _comparisonToast(message, label, action) {
  showGeoToast(message);
  if (!action) return;
  const toast = document.getElementById('geo-toast');
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.onclick = () => { toast.classList.remove('show'); action(); };
  toast.appendChild(button); clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'),7000);
}
function toggleComparison(id, dir = S.direction) {
  if (!_compareUuid.test(id) || !Object.hasOwn(_compareDirections,dir)) return;
  const state = _compareState(dir);
  const index = state.items.findIndex(e => e.item.id === id);
  if (index >= 0) state.items.splice(index,1);
  else {
    if (state.items.length >= COMPARISON_LIMIT) { showGeoToast(`Можно сравнить до ${COMPARISON_LIMIT} позиций в одном направлении`); return; }
    const item = itemCache.get(id);
    const store = S.store?.id === item?.store_id ? S.store : S.allStores?.find(s => s.id === item?.store_id) || findFavorite(id)?.store;
    if (!item || !store || (store.direction || dir) !== dir) { showGeoToast('Откройте заведение этой позиции'); return; }
    state.items.push({..._compareSnapshot(item,store),addedAt:Date.now(),checkedAt:0});
    _comparisonToast('Добавлено в сравнение','Открыть',() => { if (S.direction !== dir) setDirection(dir); openComparison(); });
  }
  _saveComparison(dir); _syncComparisonButtons(); updateCartCount();
  if (S.direction === dir && document.getElementById('screen-cart')?.classList.contains('active') && state.tab === 'compare') renderComparison();
}
function removeComparison(id) {
  const state = _compareState(); state.items = state.items.filter(e => e.item.id !== id);
  state.columnOrder = state.columnOrder.filter(value => value !== id);
  _saveComparison(); _syncComparisonButtons(); updateCartCount(); renderComparison();
}
function clearComparison() {
  const dir = S.direction, previous = _compareState(dir).items.slice();
  const previousOrder = _compareState(dir).columnOrder.slice(), previousCategory = _compareState(dir).category;
  _compareState(dir).items = []; _compareState(dir).category = ''; _compareState(dir).columnOrder = [];
  _saveComparison(dir); _syncComparisonButtons(); updateCartCount(); renderComparison();
  _comparisonToast('Сравнение очищено','Отменить',() => {
    const state = _compareState(dir), existing = new Set(state.items.map(e => e.item.id));
    state.items = [...state.items,...previous.filter(e => !existing.has(e.item.id))].slice(0,COMPARISON_LIMIT);
    state.columnOrder = [...state.columnOrder,...previousOrder.filter(id => !existing.has(id))];
    if (!existing.size) state.category = previousCategory;
    _saveComparison(dir);
    if (S.direction === dir) { _syncComparisonButtons(); updateCartCount(); renderComparison(); }
  });
}
function openComparison() { _compareState().tab = 'compare'; _saveComparison(); goTo('cart'); }
function _cartComparisonNav() {
  const state = _compareState(), comparison = state.tab === 'compare';
  document.getElementById('cart-direction-title').innerHTML = 'Корзина<small>' + esc(_compareDirections[S.direction]) + '</small>';
  for (const [id,on] of [['ctab-cart',!comparison],['ctab-compare',comparison]]) {
    const button = document.getElementById(id); button.classList.toggle('active',on); button.setAttribute('aria-selected',String(on));
    button.tabIndex = on ? 0 : -1;
  }
  document.getElementById('ctab-cart-pane').style.display = comparison ? 'none' : 'flex';
  document.getElementById('ctab-compare-pane').hidden = !comparison;
  const count = S.cart.reduce((sum,c) => sum + c.qty,0) + S.rentCart.length +
    [...S.subCart,...S.giftSubCart].filter(c => (c.direction || 'food') === S.direction).length;
  document.getElementById('cart-purchase-count').textContent = String(count);
  document.getElementById('cart-compare-count').textContent = String(state.items.length);
  document.getElementById('cart-purchase-count').classList.toggle('on',count > 0);
  document.getElementById('cart-compare-count').classList.toggle('on',state.items.length > 0);
}

// Use the public catalogue endpoint directly: a failed refresh must not mark a stale
// request-cache response as fresh or interpret an outage as deleted products.
async function _comparisonFetch(path) {
  if (typeof academyCatalogueResponse === 'function') { const data=academyCatalogueResponse(path); if(data!==null)return data; }
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),8000);
  try {
    const headers = {apikey:SB_ANON};
    if (SB_ANON.startsWith('eyJ')) headers.Authorization = 'Bearer ' + SB_ANON;
    const response = await fetch(SB_URL + path,{headers,signal:controller.signal,cache:'no-store'});
    if (!response.ok) throw new Error('Catalogue refresh failed');
    const rows = await response.json(); if (!Array.isArray(rows)) throw new Error('Invalid catalogue response');
    return rows;
  } finally { clearTimeout(timeout); }
}
const _comparisonSelect = '*,categories(name),stores(id,name,direction,address,is_visible,archived_at),menu_item_option_groups(name,required,menu_item_options(name,price_add,is_available)),item_price_rules(price,days,time_from,time_to,priority)';
async function refreshComparison(force = false) {
  const dir = S.direction, state = _compareState(dir), now = Date.now();
  if (!state.items.length) return;
  if (navigator.onLine === false) { _contentNotice('comparison',true); return; }
  if (!force && state.items.every(e => now - (e.checkedAt || 0) < COMPARISON_TTL)) return;

  const namespace=typeof academyNamespace === 'function'?academyNamespace(dir):dir;
  const stillCurrent=()=>namespace===(typeof academyNamespace === 'function'?academyNamespace(dir):dir);
  if (_compareRequests.has(namespace)) return _compareRequests.get(namespace);
  const requested = new Map(state.items.map(e => [e.item.id,e.addedAt]));
  const task = (async () => {
    try {
      const ids = [...requested.keys()].filter(id => _compareUuid.test(id));
      const rows = await _comparisonFetch(`/rest/v1/menu_items?id=in.(${ids.join(',')})&select=${_comparisonSelect}`);
      if(!stillCurrent())return;
      const byId = new Map(rows.map(item => [item.id,item]));
      _compareState(dir).items = _compareState(dir).items.map(entry => {
        if (!requested.has(entry.item.id) || requested.get(entry.item.id) !== entry.addedAt) return entry;
        const item = byId.get(entry.item.id), store = item?.stores;
        const unavailable = !item || item.is_visible === false || !store || store.direction !== dir ||
          item.store_id !== entry.store.id || store.is_visible === false || !!store.archived_at;
        if (unavailable) return {...entry,unavailable:true,checkedAt:Date.now()};
        const changedPrice = Number(item.price) !== Number(entry.item.price) ? entry.item.price : entry.changedPrice;
        return {...entry,..._compareSnapshot(item,store),unavailable:false,changedPrice,checkedAt:Date.now()};
      });
      _saveComparison(dir);
      if (stillCurrent() && S.direction === dir) _contentNotice('comparison',false);
    } catch {
      if (stillCurrent() && S.direction === dir) {
        _contentNotice('comparison',true);
        if (force) showGeoToast('Не удалось обновить сравнение. Сохранённые данные доступны');
      }
    } finally {
      _compareRequests.delete(namespace);
      if (stillCurrent() && S.direction === dir && _compareState(dir).tab === 'compare') renderComparison();
    }
  })();
  _compareRequests.set(namespace,task); return task;
}
function _comparisonUnit(item) {
  if (item.item_type === 'rental') {
    const unit = {minute:'мин',hour:'ч',day:'сут',week:'нед',month:'мес'}[item.rent_period_unit] || 'период';
    return `за ${item.rent_period_step || 1} ${unit}`;
  }
  return item.item_type === 'service' ? 'за посещение' : 'за шт.';
}
function _comparisonAvailable(entry) { return !entry.unavailable && entry.item.is_available !== false; }
function _comparisonRows(entries) {
  const missing = value => value == null || value === '' ? 'Не указано' : String(value);
  const number = (value,unit) => value == null ? 'Не указано' : `${value} ${unit}`;
  const rows = [
    ['Категория',e => missing(e.item.categories?.name)],
    ['Доступность',e => e.unavailable ? 'Предложение недоступно' : _comparisonAvailable(e) ? 'Доступно' : 'Нет в наличии'],
    ['Описание',e => missing(e.item.description)],
    ['Адрес',e => missing(e.store.address)],
  ];
  if (S.direction === 'food') rows.push(['Порция',e => number(e.item.portion_g,'г')],['Состав',e => missing(e.item.composition)],
    ['Аллергены',e => missing(e.item.allergens)],['Калорийность',e => number(e.item.calories,'ккал')],
    ['Белки',e => number(e.item.protein,'г')],['Жиры',e => number(e.item.fat,'г')],['Углеводы',e => number(e.item.carbs,'г')]);
  if (entries.some(e => e.item.preparation_time != null)) rows.push(['Приготовление / подготовка',e => number(e.item.preparation_time,'мин')]);
  if (entries.some(e => e.item.item_type === 'service')) rows.push(['Длительность',e => number(e.item.duration_minutes,'мин')],['Что входит',e => missing(e.item.includes)]);
  if (entries.some(e => e.item.item_type === 'rental')) rows.push(['Период аренды',e => e.item.item_type === 'rental' ? _comparisonUnit(e.item) : 'Не применяется'],
    ['Количество',e => e.item.item_type === 'rental' ? number(e.item.quantity_available,'шт.') : 'Не применяется'],
    ['Тарифы по расписанию',e => (e.item.item_price_rules || []).map(r => {
      const weekdays = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
      const days = r.days?.length ? r.days.map(d => weekdays[d]).filter(Boolean).join(', ') : 'Каждый день';
      return `${r.price} ₽ ${_comparisonUnit(e.item)} · ${days} · ${r.time_from || '00:00'}–${r.time_to || '24:00'}`;
    }).join('\n') || 'Не указано']);
  rows.push(['Варианты и доплаты',e => {
    const groups = e.item.menu_item_option_groups || [];
    return groups.length ? groups.map(g => `${g.name}${g.required ? ' (обязательно)' : ''}: ` +
      (g.menu_item_options || []).map(o => `${o.name}${Number(o.price_add) ? ' (+' + o.price_add + ' ₽)' : ''}`).join(', ')).join('\n') : 'Не указано';
  }]);
  return rows;
}
function setComparisonFilter(key,value) {
  if (key !== 'category' && key !== 'differences') return;
  _compareState()[key] = value; _saveComparison(); renderComparison();
}
function _comparisonOrderedEntries(state, entries) {
  const byId = new Map(state.items.map(entry => [entry.item.id,entry]));
  const seen = new Set();
  state.columnOrder = [...(state.columnOrder || []),...byId.keys()].filter(id => {
    if (!byId.has(id) || seen.has(id)) return false;
    seen.add(id); return true;
  });
  const eligible = new Set(entries.map(entry => entry.item.id));
  return state.columnOrder.filter(id => eligible.has(id)).map(id => byId.get(id));
}
function _comparisonLayout(total) {
  const panel = document.getElementById('comparison-content');
  const width = panel?.clientWidth || document.getElementById('screen-cart')?.parentElement?.clientWidth || innerWidth;
  const labelWidth = width < 600 ? 88 : 140;
  // Keep the left/right comparison usable on a phone; wider panels gain columns.
  const columns = Math.min(total,Math.max(2,Math.floor((width - labelWidth) / 220)));
  return {columns,labelWidth};
}
function setComparisonColumn(index, id) {
  const state = _compareState();
  const entries = state.items.filter(e => !state.category || (e.item.categories?.name || 'Без категории') === state.category);
  const ordered = _comparisonOrderedEntries(state,entries);
  const count = _comparisonLayout(entries.length).columns;
  if (!Number.isInteger(index) || index < 0 || index >= count || !ordered.some(e => e.item.id === id)) return;
  const from = state.columnOrder.indexOf(ordered[index].item.id), to = state.columnOrder.indexOf(id);
  // Swapping an already visible offer avoids duplicates and preserves the other choices.
  [state.columnOrder[from],state.columnOrder[to]] = [state.columnOrder[to],state.columnOrder[from]];
  _saveComparison(); renderComparison();
  document.querySelector(`[data-comparison-column="${index}"]`)?.focus({preventScroll:true});
}
function renderComparison() {
  const panel = document.getElementById('comparison-content'); if (!panel) return;
  const previousScroll = panel.querySelector('.comparison-scroll');
  const scrollLeft = previousScroll?.scrollLeft || 0, scrollTop = previousScroll?.scrollTop || 0;
  _cartComparisonNav();
  const state = _compareState(), list = state.items;
  const tools = document.getElementById('comparison-tools'); tools.hidden = !list.length;
  const categories = [...new Set(list.map(e => e.item.categories?.name || 'Без категории'))].sort();
  if (state.category && !categories.includes(state.category)) state.category = '';
  const select = document.getElementById('comparison-category');
  select.innerHTML = '<option value="">Все категории</option>' + categories.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
  select.value = state.category;
  const eligible = list.filter(e => !state.category || (e.item.categories?.name || 'Без категории') === state.category);
  const layout = _comparisonLayout(eligible.length);
  const entries = _comparisonOrderedEntries(state,eligible).slice(0,layout.columns);
  const diff = document.getElementById('comparison-differences'); diff.checked = state.differences; diff.disabled = entries.length < 2;
  if (!list.length) {
    panel.innerHTML = '<div class="empty"><p>Сравнение пока пусто</p><p>Нажмите «Сравнить» на карточках позиций этого направления.</p><button class="btn" onclick="goTo(\'map\')">Открыть заведения</button></div>';
    return;
  }
  const hint = entries.length === 1 ? '<p class="comparison-hint">Добавьте ещё одну позицию для сравнения</p>' :
    `<p class="comparison-hint">Выберите товары в заголовках столбцов.${eligible.length > entries.length ? ` Показано ${entries.length} из ${eligible.length}.` : ''}</p>`;
  let visibleRows = 0;
  const rows = _comparisonRows(entries).map(([label,value]) => {
    const values = entries.map(value);
    if (state.differences && entries.length > 1 && new Set(values).size === 1) return '';
    visibleRows++;
    return `<tr><th scope="row">${esc(label)}</th>${values.map(text => `<td>${esc(text)}</td>`).join('')}</tr>`;
  }).join('');
  panel.innerHTML = hint + '<div class="comparison-scroll" tabindex="0" aria-label="Таблица сравнения">' +
    `<table class="comparison-table" style="--comparison-label:${layout.labelWidth}px"><caption class="comparison-caption">Сравнение · ${esc(_compareDirections[S.direction])}</caption>` +
    `<colgroup><col style="width:${layout.labelWidth}px">${entries.map(() => '<col>').join('')}</colgroup><thead><tr class="comparison-selectors"><th scope="col">Товары</th>` + entries.map((entry,index) =>
      `<th scope="col"><select class="comparison-slot-select" data-comparison-column="${index}" aria-label="Товар в столбце ${index + 1}">${eligible.map(option =>
        `<option value="${esc(option.item.id)}"${option.item.id === entry.item.id ? ' selected' : ''}>${esc(option.item.name)} · ${esc(option.store.name)}</option>`).join('')}</select></th>`
    ).join('') + '</tr><tr class="comparison-offers"><th scope="col">Параметры</th>' + entries.map(e => {
      const item = e.item, available = _comparisonAvailable(e);
      const action = item.item_type === 'rental' ? 'Выбрать период' : item.item_type === 'service' ? 'Выбрать время' : 'В корзину';
      return `<th scope="col" data-comparison-id="${esc(item.id)}"><div class="comparison-card"><button class="comparison-remove" data-compare-action="remove" data-id="${esc(item.id)}" aria-label="Убрать ${esc(item.name)} из сравнения">✕</button>
        ${item.image_url ? `<img src="${esc(mediaUrl(item.image_url))}" alt="" loading="lazy" decoding="async">` : '<div class="comparison-no-image">Нет фото</div>'}
        <strong>${esc(item.name)}</strong><span class="comparison-store">${esc(e.store.name)}</span>
        <span class="comparison-price">${esc(item.price)} ₽ <small>${esc(_comparisonUnit(item))}</small></span>
        ${e.changedPrice != null ? `<small class="comparison-price-change">Цена изменилась: ранее ${esc(e.changedPrice)} ₽</small>` : ''}
        <button class="btn" data-compare-action="detail" data-id="${esc(item.id)}">Подробнее</button>
        <button class="btn btn-p" data-compare-action="buy" data-id="${esc(item.id)}" ${!available || navigator.onLine === false ? 'disabled' : ''}>${available ? action : 'Недоступно'}</button>
      </div></th>`;
    }).join('') + `</tr></thead><tbody>${rows}</tbody></table></div>` +
    (!visibleRows && state.differences ? '<p class="comparison-hint">У заполненных характеристик различий нет</p>' : '');
  const scroller = panel.querySelector('.comparison-scroll');
  if (scroller) { scroller.scrollLeft = scrollLeft; scroller.scrollTop = scrollTop; }
  panel.onchange = event => {
    const select = event.target.closest('select[data-comparison-column]');
    if (select) setComparisonColumn(Number(select.dataset.comparisonColumn),select.value);
  };
  panel.onclick = async event => {
    const button = event.target.closest('button[data-compare-action]'); if (!button) return;
    if (button.dataset.compareAction === 'remove') removeComparison(button.dataset.id);
    else {
      button.disabled = true;
      try { await activateComparison(button.dataset.id,button.dataset.compareAction); }
      finally { if (button.isConnected) button.disabled = false; }
    }
  };
}
async function activateComparison(id, action) {
  const dir = S.direction, entry = _compareState(dir).items.find(e => e.item.id === id);
  if (!entry) return;
  if (action === 'buy' && navigator.onLine === false) { showGeoToast('Для оформления нужно подключение к интернету'); return; }
  let item = entry.item, store = entry.store, fresh = false;
  try {
    if (navigator.onLine === false) throw new Error('offline');
    const [items,stores] = await Promise.all([
      _comparisonFetch(`/rest/v1/menu_items?id=eq.${id}&select=${_comparisonSelect}`),
      _comparisonFetch(`/rest/v1/stores?id=eq.${entry.store.id}&select=*`),
    ]);
    if (S.direction !== dir || !_compareState(dir).items.some(e => e.item.id === id)) return;
    if (!items[0] || !stores[0] || items[0].store_id !== stores[0].id || stores[0].direction !== dir ||
        items[0].is_visible === false || stores[0].is_visible === false || stores[0].archived_at) {
      _compareState(dir).items.forEach(e => { if (e.item.id === id) e.unavailable = true; });
      _saveComparison(dir); renderComparison(); showGeoToast('Предложение больше недоступно'); return;
    }
    item = items[0]; store = stores[0]; fresh = true; _contentNotice('comparison',false);
    const changedPrice = Number(item.price) !== Number(entry.item.price) ? entry.item.price : entry.changedPrice;
    _compareState(dir).items = _compareState(dir).items.map(e => e.item.id === id ?
      {...e,..._compareSnapshot(item,store),unavailable:false,changedPrice,checkedAt:Date.now()} : e);
    _saveComparison(dir);
  } catch {
    if (S.direction !== dir) return;
    _contentNotice('comparison',true);
    if (action === 'buy') { showGeoToast('Не удалось проверить предложение. Попробуйте при восстановлении связи'); return; }
  }
  if (S.direction !== dir) return;
  if (action === 'buy' && item.is_available === false) { entry.item.is_available = false; _saveComparison(dir); renderComparison(); showGeoToast('Сейчас нет в наличии'); return; }
  S.store = store; S.storeSubActive = undefined; S.menuUserSubs = []; S.menuStoreSubs = []; S.menuCatId = '';
  try { rememberStore(store); } catch {}
  itemCache.set(id,{...item,is_available:fresh ? item.is_available : false});
  syncStoreNavBtn();
  if (action === 'detail') { openItemDetail(id); return; }
  _compareState(dir).tab = 'cart'; _saveComparison(dir);
  goTo('store');
  if (item.item_type === 'rental') openRentModal(id);
  else if (item.item_type === 'service') openBookingSlotModal(item);
  else {
    const before = _cartQtyForItem(id);
    await addToCartById(id);
    if (S.direction === dir && _cartQtyForItem(id) > before) goTo('cart');
  }
}

// Cart state is independent of the venue currently being viewed/comparing.
function captureDirectionCart() {
  const dir = S.direction, previous = S._carts[dir] || {};
  return {...previous,items:S.cart,storeId:S.cartStoreId,
    store:S.store?.id === S.cartStoreId ? S.store : previous.store || null,
    rentCart:S.rentCart,deliveryMode:S.deliveryMode,deliveryFee:S.deliveryFee,
    address:{label:S.userAddr || null,lat:S.userAddrLat,lng:S.userAddrLng},
    pickupIso:S.pickupIso,pickupLabel:S.pickupLabel,useSubscription:_cartUseSub,
    payNow:!!document.getElementById('preorder-pay-now')?.checked};
}
function restoreDirectionCart(dir) {
  const cart = S._carts[dir] || {};
  S.cart = Array.isArray(cart.items) ? cart.items : []; S.cartStoreId = cart.storeId || null;
  S.rentCart = Array.isArray(cart.rentCart) ? cart.rentCart : [];
  S.deliveryMode = cart.deliveryMode || null; S.deliveryFee = cart.deliveryFee || 0;
  S.pickupIso = cart.pickupIso || null; S.pickupLabel = cart.pickupLabel || null;
  if (cart.address) {
    S.userAddr = cart.address.label || null;
    S.userAddrLat = Number.isFinite(cart.address.lat) ? cart.address.lat : null;
    S.userAddrLng = Number.isFinite(cart.address.lng) ? cart.address.lng : null;
  } else {
    const lat = Number.parseFloat(localStorage.getItem('alliby_addr_lat'));
    const lng = Number.parseFloat(localStorage.getItem('alliby_addr_lng'));
    S.userAddrLat = Number.isFinite(lat) ? lat : null;
    S.userAddrLng = Number.isFinite(lng) ? lng : null;
    S.userAddr = S.profile?.address || null;
  }
  S.appliedSub = null; S.cartUsubs = []; S.menuUserSubs = []; S.menuStoreSubs = [];
  _cartUseSub = cart.useSubscription !== false;
  const payNow = document.getElementById('preorder-pay-now'); if (payNow) payNow.checked = !!cart.payNow;
  if (cart.store?.id === cart.storeId && cart.store.direction === dir) S.store = cart.store;
  else if (S.store?.direction !== dir) S.store = null;
}
function clearDirectionPurchase(dir, type = 'items') {
  if (dir === S.direction) {
    if (type === 'rent') S.rentCart = [];
    else { S.cart = []; S.cartStoreId = null; S.appliedSub = null; S.deliveryMode = null; S.deliveryFee = 0; S.pickupIso = null; S.pickupLabel = null; }
    saveCart(); updateCartCount();
  } else {
    const cart = S._carts[dir] || {};
    if (type === 'rent') cart.rentCart = [];
    else Object.assign(cart,{items:[],storeId:null,store:null,deliveryMode:null,deliveryFee:0,pickupIso:null,pickupLabel:null});
    S._carts[dir] = cart;
    try { if(!academyActive()) localStorage.setItem('alliby_cart_' + dir,JSON.stringify(cart)); } catch {}
  }
}

function clearSubscriptionPurchase(context) {
  const dir = context?.direction || S.direction;
  const bought = c => (c.direction || 'food') === dir && (!context?.ids || context.ids.includes(c.sub.id));
  if (!context?.kind || context.kind === 'subs') S.subCart = S.subCart.filter(c => !bought(c));
  if (!context?.kind || context.kind === 'gifts') S.giftSubCart = S.giftSubCart.filter(c => !bought(c));
  saveSubCart(); updateCartCount();
}

document.querySelector('.cart-comparison-tabs')?.addEventListener('keydown',event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const comparison = event.key === 'End' || (event.key !== 'Home' && _compareState().tab !== 'compare');
  switchCartTab(comparison ? 'compare' : 'cart');
  document.getElementById(comparison ? 'ctab-compare' : 'ctab-cart').focus();
});
function _comparisonTick() {
  if (!document.hidden && document.getElementById('screen-cart')?.classList.contains('active') && _compareState().tab === 'compare') refreshComparison();
}
setInterval(_comparisonTick,60000);
for (const event of ['online','offline']) window.addEventListener(event,() => {
  if (document.getElementById('screen-cart')?.classList.contains('active') && _compareState().tab === 'compare') {
    renderComparison();
    if (event === 'online') refreshComparison();
  }
});
document.addEventListener('visibilitychange',_comparisonTick);
window.addEventListener('storage',event => {
  if (academyActive() || !event.key?.startsWith('alliby_compare_v1_')) return;
  const dir = event.key.slice('alliby_compare_v1_'.length);
  if (!Object.hasOwn(_compareDirections,dir)) return;
  delete _compareStates[dir];
  if (S.direction === dir) {
    _syncComparisonButtons(); updateCartCount();
    if (document.getElementById('screen-cart')?.classList.contains('active')) renderCart();
  }
});

// Observe the actual panel (including sidebar/zoom changes), not just the window.
let _comparisonWidth = 0, _comparisonResizeFrame = null;
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(records => {
  const width = Math.round(records[0]?.contentRect.width || 0);
  if (!width || width === _comparisonWidth) return;
  _comparisonWidth = width;
  cancelAnimationFrame(_comparisonResizeFrame);
  _comparisonResizeFrame = requestAnimationFrame(() => {
    if (document.getElementById('screen-cart')?.classList.contains('active') && _compareState().tab === 'compare') renderComparison();
  });
}).observe(document.getElementById('comparison-content'));
