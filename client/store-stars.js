/* Account-bound stars: all eligibility and writes are enforced by the server. */
const _storeStars = new Map();
let _storeStarDialog = null, _storeStarBusy = false, _storeStarWriteVersion = 0, _storeStarTitleKey = '';
const _storeStarSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91z"/></svg>';
function storeStarsBadge(id) {
  if (!_compareUuid.test(id)) return '';
  const count = _storeStars.get(id)?.stars_count || 0;
  return `<span class="store-star-count" data-store-stars="${id}"${count ? '' : ' hidden'} aria-label="Звёзд: ${count}">${_storeStarSvg}<span>${count}</span></span>`;
}
function syncStoreStars() {
  document.querySelectorAll('[data-store-stars]').forEach(el => {
    const count = _storeStars.get(el.dataset.storeStars)?.stars_count || 0;
    el.hidden = !count; el.setAttribute('aria-label','Звёзд: ' + count);
    el.querySelector('span').textContent = count;
  });
  const button = document.getElementById('store-star-btn');
  const valid = S.store?.id && (!S.store.direction || S.store.direction === S.direction);
  button.style.display = _contentScreen() === 'store' && valid ? '' : 'none';
  const state = _storeStars.get(S.store?.id);
  const on = state?.account === (S.session?.user?.id || '-') && !!state.starred;
  button.classList.toggle('starred',on); button.setAttribute('aria-pressed',String(on));
  button.title = on ? 'Снять звезду' : 'Поставить звезду';
  button.setAttribute('aria-label',button.title); button.disabled = _storeStarBusy;
  const titleKey = valid ? S.store.id + ':' + (state?.stars_count || 0) : '';
  if (titleKey !== _storeStarTitleKey && _contentScreen() === 'store') {
    _storeStarTitleKey = titleKey;
    if (valid) _setStorePhName(S.store.name);
  }
}
async function loadStoreStars(ids) {
  const unique = [...new Set(ids)].filter(id => _compareUuid.test(id));
  if (!unique.length) return;
  const account = S.session?.user?.id || '-', revision = _accountRevision, version = _storeStarWriteVersion;
  try {
    for (let offset = 0; offset < unique.length; offset += 200) {
      const rows = await req('/rest/v1/rpc/get_store_stars',{method:'POST',body:JSON.stringify({p_store_ids:unique.slice(offset,offset+200)})});
      if (revision !== _accountRevision || account !== (S.session?.user?.id || '-') || version !== _storeStarWriteVersion || _storeStarBusy) return;
      for (const row of rows) _storeStars.set(row.store_id,{...row,account});
    }
    syncStoreStars();
  } catch { /* Keep the last confirmed state on network failure. */ }
}
function resetStoreStars() {
  for (const [id,state] of _storeStars) _storeStars.set(id,{stars_count:state.stars_count});
  _storeStarDialog = null; syncStoreStars();
}
function openStoreStarDialog() {
  const id = S.store?.id; if (!id || _storeStarBusy) return;
  const account = S.session?.user?.id || '-', state = _storeStars.get(id);
  const on = state?.account === account && !!state.starred;
  _storeStarDialog = {id,account,revision:_accountRevision,starred:!on};
  document.getElementById('store-star-dialog-text').textContent = on
    ? 'Действительно ли вы хотите снять звезду?'
    : 'Поставить звезду заведению? Это доступно при сумме онлайн-покупок в этом заведении от 500 ₽.';
  openModal('m-store-star'); document.getElementById('store-star-yes').focus();
}
function cancelStoreStarDialog() { _storeStarDialog = null; closeModal('m-store-star'); }
async function confirmStoreStar() {
  const action = _storeStarDialog;
  if (!action || _storeStarBusy) return;
  cancelStoreStarDialog();
  if (action.revision !== _accountRevision || action.account !== (S.session?.user?.id || '-')) return;
  if (action.id !== S.store?.id || _contentScreen() !== 'store') return;
  if (!S.session?.user?.id) { showGeoToast('Войдите в аккаунт, чтобы поставить звезду'); goTo('auth'); return; }
  if (navigator.onLine === false) { showGeoToast('Для изменения звезды нужен интернет'); return; }
  _storeStarBusy = true; _storeStarWriteVersion++; syncStoreStars();
  try {
    const result = await req('/rest/v1/rpc/set_store_star',{method:'POST',body:JSON.stringify({p_store_id:action.id,p_starred:action.starred})});
    if (action.revision !== _accountRevision || action.account !== (S.session?.user?.id || '-')) return;
    _storeStars.set(action.id,{...result,account:action.account}); syncStoreStars();
    if (!result.ok) showGeoToast('Чтобы поставить звезду, сумма онлайн-покупок в этом заведении должна быть от 500 ₽. Сейчас учтено: ' + Number(result.online_total).toLocaleString('ru-RU') + ' ₽');
    else showGeoToast(result.starred ? 'Звезда поставлена' : 'Звезда снята');
  } catch {
    if (action.revision === _accountRevision) showGeoToast('Не удалось изменить звезду. Проверьте соединение и попробуйте ещё раз');
  } finally { _storeStarBusy = false; _storeStarWriteVersion++; syncStoreStars(); }
}
window.addEventListener('online',() => { if (_contentScreen() === 'store' && S.store?.id) loadStoreStars([S.store.id]); });
document.addEventListener('visibilitychange',() => { if (!document.hidden && _contentScreen() === 'store' && S.store?.id) loadStoreStars([S.store.id]); });
