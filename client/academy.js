/* Academy uses the application's catalogue/forms, with private server-side
 * records for accounts and device-only progress for guests. No educational
 * mutation reaches an ordinary payment API. */
let _academy = null, _academySnapshot = null, _academyRows = [], _academyRowsOwner = '', _academyLoad = null;
let _academyTickTimer = null, _academyBusy = false, _academyTargetKey = '', _academyDetails = null, _academyWatch = null;
let _academyGlobals = null;
const academyActive = () => !!_academy && _academy.user === academyUser();
const academyStoreId = id => ACADEMY_DATA.stores.some(s => s.id === id)||/^aca10000-0000-4000-8000-00000000000[78]$/.test(id||'');
const academyNamespace = dir => academyActive() ? `academy:${_academy.row.run_id}:${dir}` : dir;
const academyCompareKey = dir => academyActive() ? `alliby_academy_compare_${_academy.user}_${_academy.row.run_id}_${dir}` : 'alliby_compare_v1_' + dir;
function rememberStore(store) { if (!academyStoreId(store?.id)) localStorage.setItem('alliby_store',JSON.stringify(store)); }
function academyStore(store) {
  const color=store.accent || '#e87639';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480"><rect width="800" height="480" fill="${color}"/><circle cx="660" cy="80" r="260" fill="white" opacity=".12"/><circle cx="110" cy="440" r="230" fill="white" opacity=".1"/><text x="55" y="210" fill="white" font-family="Arial" font-size="78" font-weight="bold">Alliby</text><text x="57" y="270" fill="white" font-family="Arial" font-size="29">Академия · ${_compareDirections[store.direction]}</text><path d="m560 340 50-25 50 25-50 25z M575 350v25q35 25 70 0v-25" fill="none" stroke="white" stroke-width="6"/></svg>`;
  return {...store,city:S.city||'Самара',lat:store.latitude,lng:store.longitude,image_url:'data:image/svg+xml;base64,'+btoa(String.fromCharCode(...new TextEncoder().encode(svg)))};
}
function academyStores() {
 const rows=ACADEMY_DATA.stores.map(academyStore);
 if(academyActive()&&_academy.lesson.id==='delivery'){
  const cafe=rows[0];
  rows.push({...cafe,id:'aca10000-0000-4000-8000-000000000007',name:'Кофейня «На площади»',lat:cafe.lat+.008,lng:cafe.lng+.018,delivery_enabled:false});
  rows.push({...cafe,id:'aca10000-0000-4000-8000-000000000008',name:'Кафе «У парка»',lat:cafe.lat-.007,lng:cafe.lng-.017,delivery_enabled:false});
 }
 return rows;
}
function academyItems() {
  const stores=academyStores();
  return ACADEMY_DATA.items.map(item=>({...item,training_incomplete:false,stores:stores.find(s=>s.id===item.store_id),image_url:stores.find(s=>s.id===item.store_id).image_url}));
}
function academyMergeStores(rows) {
  const ids=new Set(rows.map(s=>s.id));
  return [...rows,...academyStores().filter(s=>s.direction===S.direction&&!ids.has(s.id))];
}
function academyTile() {
  const count=_academyRowsOwner===academyUser() ? _academyRows.filter(r=>r.completed_at).length : 0;
  const el=document.getElementById('academy-home-progress');if(el)el.textContent=`Пройдено ${count} из ${ACADEMY_DATA.lessons.length} заданий`;
}
async function loadAcademyProgress() {
  const uid=S.session?.user?.id;
  if(!uid){_academyRows=academyGuestRows();_academyRowsOwner=ACADEMY_GUEST_ID;academyTile();if(_contentScreen()==='academy')renderAcademy();return;}
  if(_academyRowsOwner!==uid){
    try{_academyRows=JSON.parse(localStorage.getItem('alliby_academy_progress_'+uid)||'[]');}catch{_academyRows=[];}
    _academyRowsOwner=uid;academyTile();
  }
  if(_academyLoad)return _academyLoad;
  const revision=_accountRevision;
  _academyLoad=(async()=>{
    try{
      const rows=await _reqNet('/rest/v1/rpc/get_academy_progress',{method:'POST',body:'{}'});
      if(uid!==S.session?.user?.id||revision!==_accountRevision)return;
      _academyRows=rows;_academyRowsOwner=uid;
      localStorage.setItem('alliby_academy_progress_'+uid,JSON.stringify(rows.map(r=>({lesson_id:r.lesson_id,completed_at:r.completed_at,run_id:r.run_id,has_operation:!!r.operation,visited:r.visited}))));
      academyTile();if(_contentScreen()==='academy')renderAcademy();
    }catch{if(_contentScreen()==='academy')document.getElementById('academy-connection').textContent='Сохранённый прогресс. Для прохождения заданий нужно соединение с сервером.';}
    finally{_academyLoad=null;}
  })();return _academyLoad;
}
function renderAcademy() {
  const root=document.getElementById('academy-content');if(!root)return;
  academyTile();
  const uid=academyUser();
  root.innerHTML=`<p class="academy-intro">Попробуйте покупки, аренду и запись в заведениях Академии. Деньги не списываются, заказы не отправляются продавцам. Действия сотрудников демонстрируются по шагам.</p>
    <p id="academy-connection" class="academy-note"></p><div class="academy-tasks">${ACADEMY_DATA.lessons.map((lesson,i)=>{
      const progress=_academyRowsOwner===uid&&_academyRows.find(r=>r.lesson_id===lesson.id),done=!!progress?.completed_at;
      return `<button class="academy-task" data-lesson="${lesson.id}" onclick="academyStart(this.dataset.lesson)" aria-label="${esc(lesson.title)}${done?' — выполнено':''}"><span class="academy-task-number${done?' done':''}">${done?'✓':i+1}</span><span><strong>${esc(lesson.title)}</strong><small>${esc(_compareDirections[lesson.direction])} · ${done?'Выполнено · можно повторить':progress?'Продолжить':'Начать задание'}</small></span><span aria-hidden="true">→</span></button>`;
    }).join('')}</div><p class="academy-note">${S.session?.user?.id?'Ваш прогресс сохраняется в аккаунте.':'Регистрация не нужна. Ваш прогресс сохраняется на этом устройстве.'} Заведения Академии также доступны в обычном списке.</p>`;
}
function loadAcademy(){renderAcademy();loadAcademyProgress();}
function academyCommand(action,payload={},session=_academy) {
  if(!session)return Promise.reject(new Error('Прохождение закрыто'));
  const task=(session.commands||Promise.resolve()).catch(()=>{}).then(()=>_academyCommand(action,payload,session));
  session.commands=task;return task;
}
async function _academyCommand(action,payload={},session=_academy) {
  if(!session||session.user!==academyUser())throw new Error('Прохождение закрыто');
  const run=session.row.run_id,revision=_accountRevision;
  let result=session.user===ACADEMY_GUEST_ID?academyGuestCommand(session.lesson.id,action,payload,run):await _reqNet('/rest/v1/rpc/academy_command',{method:'POST',body:JSON.stringify({p_lesson:session.lesson.id,p_action:action,p_payload:payload,p_run:run})});
  if(Array.isArray(result))result=result[0];
  if(_academy!==session||session.user!==academyUser()||revision!==_accountRevision)throw {accountChanged:true};
  session.row=result;_academyRows=_academyRows.filter(r=>r.lesson_id!==result.lesson_id).concat(result);_academyRowsOwner=session.user;
  academyTile();return result;
}
const _academyStateKeys=['store','direction','allStores','cart','cartStoreId','_carts','rentCart','subCart','giftSubCart','menuUserSubs','menuStoreSubs','appliedSub','storeSubActive','menuCatId','_lastMenuStoreId','userAddr','userAddrLat','userAddrLng','deliveryMode','deliveryFee','pickupIso','pickupLabel','directions','profile','distOrigin','mapCat','nearbyMeters','onlinePayFilter','deliveryFilter','deliveryProbe','_selId','_selAuto','_selSt','_mapFiltered','_vpKey','mapFitted'];
async function academyStart(id,directStore=false) {
  if(_academyBusy)return;
  if(S.session?.user?.id&&navigator.onLine===false){showGeoToast('Для прохождения задания подключитесь к интернету');return;}
  const lesson=ACADEMY_DATA.lessons.find(l=>l.id===id);if(!lesson)return;
  _academyBusy=true;
  try{
    if(_academy)academyStop();
    const user=academyUser(),revision=_accountRevision;
    let row=user===ACADEMY_GUEST_ID?academyGuestCommand(id,'start'):await _reqNet('/rest/v1/rpc/academy_command',{method:'POST',body:JSON.stringify({p_lesson:id,p_action:'start',p_payload:{}})});
    if(Array.isArray(row))row=row[0];
    if(user!==academyUser()||revision!==_accountRevision)return;
    if(_tourSession)closeTour();
    _academySnapshot=Object.fromEntries(_academyStateKeys.map(key=>[key,S[key]]));
    _academyGlobals={mapSearch:document.querySelector('#screen-map .sl-search input')?.value||'',mapHidden:document.querySelector('.map-layout').classList.contains('no-map'),orders:_homeOrders,bookingCount:_bkNotifCount,orderCount:_orderNotifCount,cartUseSub:_cartUseSub};
    _academy={lesson,row,user};_accountRevision++;_rcInflight.clear();
    S.cart=[];S.cartStoreId=null;S._carts={};S.rentCart=[];S.subCart=[];S.giftSubCart=[];S.menuUserSubs=[];S.menuStoreSubs=[];
    S.appliedSub=null;S.storeSubActive=true;S.menuCatId='';S._lastMenuStoreId=null;S.deliveryMode='pickup';S.deliveryFee=0;S.pickupIso=null;S.pickupLabel=null;
    S.profile=S.profile?{...S.profile}:null;S.directions={...S.directions,education:true};
    S.userAddr=null;S.userAddrLat=null;S.userAddrLng=null;S.distOrigin=null;
    S.mapCat=new Set();S._selId=null;S._selSt=null;S._vpKey=null;S.mapFitted=false;
    S.direction=lesson.direction;S.allStores=academyStores();S.store=S.allStores.find(s=>s.id===lesson.store_id);
    updateDirectionLabels(S.direction);
    document.querySelectorAll('.dir-tab').forEach(t=>t.classList.toggle('active',t.dataset.dir===S.direction));
    _mastersCache=null;_academyDetails=null;_academyTargetKey='';
    _myBk.byDate={};_myBk.rentByDate={};_myBk.badges={};_caSched.storeId=null;_sportTrainingPreset=null;_trainingListPreset=null;
    S.deliveryFilter=false;S.nearbyMeters=null;S.onlinePayFilter=false;S.deliveryProbe=null;
    const search=document.querySelector('#screen-map .sl-search input');if(search)search.value='';
    document.getElementById('delivery-filter-btn')?.classList.remove('btn-yellow-p');document.getElementById('online-pay-btn')?.classList.remove('btn-green-p');document.getElementById('nearby-btn')?.classList.remove('btn-nearby-p');
    const saved=sessionStorage.getItem(academyWorkspaceKey());
    if(saved&&!row.operation){try{const w=JSON.parse(saved);S.cart=w.cart||[];S.cartStoreId=S.cart.length?lesson.store_id:null;S.rentCart=w.rentCart||[];S.deliveryMode=w.deliveryMode||'pickup';}catch{}}
    if(row.location){S.userAddr=row.location.address;S.userAddrLat=row.location.lat;S.userAddrLng=row.location.lng;}
    document.documentElement.classList.add('academy-mode');
    document.getElementById('academy-guide').hidden=false;
    updateCartCount();
    if(row.operation)goTo('calenabs');
    else if(lesson.route==='home'&&!directStore)goTo('home');
    else if(lesson.id==='delivery'&&!directStore){
      if(document.querySelector('.map-layout').classList.contains('no-map')===!!row.steps?.map_open)toggleMapPanel();
      goTo('map');
    }else goTo('store');
    clearInterval(_academyTickTimer);_academyTickTimer=setInterval(academyGuideTick,180);
    _academyWatch=new MutationObserver(academyScheduleGuide);_academyWatch.observe(document.getElementById('main'),{childList:true,subtree:true});
    academyGuideTick();
  }catch(e){if(!e.accountChanged)showGeoToast(e.message||'Не удалось открыть задание. Проверьте соединение');}
  finally{_academyBusy=false;}
}
function academyOpenVenue(id){const lesson=ACADEMY_DATA.lessons.find(l=>l.store_id===id);if(lesson)academyStart(lesson.id,true);}
function academyWorkspaceKey(){return 'alliby_academy_workspace_'+_academy.user+'_'+_academy.row.run_id;}
function academySaveWorkspace(){if(academyActive())try{sessionStorage.setItem(academyWorkspaceKey(),JSON.stringify({cart:S.cart,rentCart:S.rentCart,deliveryMode:S.deliveryMode}));}catch{}}
function academyStop(){
  if(!_academy)return;
  const sameUser=_academy.user===academyUser();
  academySaveWorkspace();document.documentElement.style.removeProperty('--academy-guide-space');clearInterval(_academyTickTimer);_academyWatch?.disconnect();_academyWatch=null;
  if(document.getElementById('m-dz-viewer')?.classList.contains('open'))closeDzViewer();
  _academy=null;_academyDetails=null;_academyTargetKey='';_accountRevision++;_rcInflight.clear();
  document.documentElement.classList.remove('academy-mode');document.getElementById('academy-guide').hidden=true;
  document.querySelectorAll('[data-academy-record]').forEach(el=>{el.classList.remove('open');delete el.dataset.academyRecord;});
  document.querySelectorAll('.overlay.open').forEach(el=>el.classList.remove('open'));
  if(_academySnapshot)Object.assign(S,_academySnapshot);_academySnapshot=null;
  if(_academyGlobals&&sameUser){const search=document.querySelector('#screen-map .sl-search input');if(search)search.value=_academyGlobals.mapSearch;document.getElementById('delivery-filter-btn')?.classList.toggle('btn-yellow-p',!!S.deliveryFilter);document.getElementById('online-pay-btn')?.classList.toggle('btn-green-p',!!S.onlinePayFilter);document.getElementById('nearby-btn')?.classList.toggle('btn-nearby-p',!!S.nearbyMeters);if(document.querySelector('.map-layout').classList.contains('no-map')!==_academyGlobals.mapHidden)toggleMapPanel();_homeOrders=_academyGlobals.orders;_bkNotifCount=_academyGlobals.bookingCount;_orderNotifCount=_academyGlobals.orderCount;_cartUseSub=_academyGlobals.cartUseSub;_updateBkBadge();}_academyGlobals=null;
  if(!sameUser){S.profile=null;S.userAddr=null;S.userAddrLat=null;S.userAddrLng=null;}
  const records=document.getElementById('academy-alibi-records');if(records)records.hidden=true;
  _caSched.storeId=null;_sportTrainingPreset=null;_trainingListPreset=null;
  _mastersCache=null;_myBk.byDate={};_myBk.rentByDate={};_myBk.badges={};itemCache.clear();
  updateDirectionLabels(S.direction);document.querySelectorAll('.dir-tab').forEach(t=>t.classList.toggle('active',t.dataset.dir===S.direction));
  updateCartCount();syncStoreNavBtn();
}
function academyExit(){academyStop();goTo('academy');loadAcademyProgress();}
function academyResetAccount(){academyStop();_academyRows=[];_academyRowsOwner='';_academyLoad=null;academyTile();}

function academyRows(table) {
  const stores=academyStores(),items=academyItems(),masters=ACADEMY_DATA.masters;
  if(table==='stores')return stores;
  if(table==='menu_items')return items;
  if(table==='categories'||table==='store_categories')return stores.map((s,i)=>({id:s.store_category_id,store_id:s.id,name:_compareDirections[s.direction],sort_order:i,is_visible:true}));
  if(table==='public_masters')return masters.map(m=>({...m,master_schedules:academyRows('master_schedules').filter(r=>r.master_id===m.id),master_services:academyRows('master_services').filter(r=>r.master_id===m.id)}));
  if(table==='master_services')return items.filter(i=>i.item_type==='service').flatMap(i=>masters.filter(m=>m.employee_store_id===i.store_id).map(m=>({service_id:i.id,master_id:m.id,price:i.price,menu_items:i})));
  if(table==='master_schedules')return masters.flatMap(m=>Array.from({length:7},(_,day)=>({master_id:m.id,day_of_week:day,start_time:'09:00',end_time:'21:00'})));
  if(table==='training_schedules')return items.filter(i=>i.is_training).flatMap(i=>Array.from({length:7},(_,day)=>i.training_mode==='group'?['14:00','19:00'].map(t=>({menu_item_id:i.id,day_of_week:day,start_time:t,end_time:t==='14:00'?'14:45':'19:45'})):[{menu_item_id:i.id,day_of_week:day,start_time:'09:00',end_time:'21:00'}]).flat());
  if(table==='store_schedules'){
    const dates=[];for(let i=0;i<75;i++){const d=new Date(nowInCity());d.setDate(d.getDate()+i);dates.push(_fmtD(d));}
    return stores.flatMap(s=>dates.map(date=>({store_id:s.id,date,slots:[{start:'09:00',end:'21:00'}]})));
  }
  if(table==='delivery_zones')return [{id:'aca60000-0000-4000-8000-000000000001',store_id:stores[0].id,name:'Доставка',type:'radius',radius_m:50000,center_lat:S.deliveryProbe?.lat??S.userAddrLat??stores[0].lat,center_lng:S.deliveryProbe?.lng??S.userAddrLng??stores[0].lng,price:100,color:'#e87639',vertices:[]}];
  if(table==='profiles')return S.profile?[S.profile]:[];
  if(['orders','bookings','rent_reservations'].includes(table)){
    const op=academyOperation();return op&&({orders:'order',bookings:'booking',rent_reservations:'rent'}[table]===op.kind)?[op]:[];
  }
  return [];
}
function academyFilter(rows,params){
  return rows.filter(row=>[...params].every(([key,value])=>{
    if(['select','order','limit','offset','or','city'].includes(key))return true;
    const raw=row[key];
    if(value.startsWith('eq.'))return String(raw)===value.slice(3);
    if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(String(raw));
    if(value==='is.true')return raw===true;if(value==='is.false')return raw===false;
    if(value.startsWith('gte.'))return String(raw)>=value.slice(4);if(value.startsWith('lte.'))return String(raw)<=value.slice(4);
    return true;
  })).slice(0,Number(params.get('limit'))||1000);
}
function academyCatalogueResponse(path){
  if(!academyActive()&&!path.includes('aca10000-')&&!path.includes('aca20000-'))return null;
  const url=new URL(path,location.origin),table=url.pathname.split('/').pop();
  if(table==='stores'||table==='menu_items')return academyFilter(academyRows(table),url.searchParams);
  return null;
}
async function academyRequest(path,opts={}) {
  if(!academyActive()||path.startsWith('/auth/')||path.startsWith('/rest/v1/rpc/academy_')||path==='/rest/v1/rpc/get_academy_progress')return null;
  const session=_academy,url=new URL(path,location.origin),table=url.pathname.split('/').pop(),method=(opts.method||'GET').toUpperCase();
  let body={};try{body=opts.body?JSON.parse(opts.body):{};}catch{}
  const response=data=>({handled:true,data});
  if(path.startsWith('/functions/')){
    if(table==='tbank-init'){
      await academySubmit(body);return response({free:true,order_id:session.row.operation.id});
    }
    if(['tbank-init-booking','tbank-init-rent','tbank-init-rent-cart'].includes(table)){
      if(!session.row.operation)throw new Error('Сначала создайте операцию');
      return response({payment_url:'alliby-academy:confirmed'});
    }
    throw new Error('Эта операция не входит в задание');
  }
  if(path.startsWith('/rest/v1/rpc/')){
    if(table==='get_stores_with_locations')return response(academyStores());
    if(table==='get_active_sub_store_ids')return response(academyStores().map(s=>({store_id:s.id})));
    if(table==='is_store_subscription_active')return response(true);
    if(table==='get_rent_days_availability'){
      const days=new Date(body.p_year,body.p_month,0).getDate();return response(Array.from({length:days},(_,i)=>({day:`${body.p_year}-${String(body.p_month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,available:4})));
    }
    if(table==='get_rent_slots_availability'){
      const start=_timeToMin(body.p_open||'09:00'),end=_timeToMin(body.p_close||'21:00'),step=Number(body.p_step_min)||60;
      return response(Array.from({length:Math.max(0,Math.floor((end-start)/step))},(_,i)=>({slot_time:_minToTime(start+i*step),available:4})));
    }
    if(table==='training_slot_people')return response(academyPeople());
    if(table==='booking_busy_slots')return response([]);
    return response([]);
  }
  if(method==='GET')return response(academyFilter(academyRows(table),url.searchParams));
  if(method==='POST'&&(table==='bookings'||table==='rent_reservations')){
    const payload=Array.isArray(body)?body[0]:body;
    await academySubmit(payload);return response([academyOperation()]);
  }
  // Analytics, push subscriptions and mutations outside the lesson are isolated.
  if(table==='analytics_events')return response([]);
  throw new Error('Завершите задание Академии, чтобы изменить обычные данные');
}
async function academySubmit(payload){
  if(!academyActive())throw new Error('Прохождение закрыто');
  const session=_academy;await academyCommand('create',payload,session);academySaveWorkspace();
  setTimeout(()=>{if(_academy===session)academyGuideTick();},60);
}
function academyPaymentComplete(){document.querySelectorAll('.overlay.open').forEach(el=>el.classList.remove('open'));showGeoToast('Операция оформлена. Деньги не списывались');goTo('store');academyGuideTick();}
function academyConfirmAddress(){
  if(!academyActive()||_academy.lesson.id!=='delivery')return false;
  if(_addrPickResult.lat==null||_addrPickResult.lng==null)return true;
  const session=_academy,position={source:'map',lat:_addrPickResult.lat,lng:_addrPickResult.lng,address:_addrPickResult.text||'Точка на карте'};
  academyCommand('location',position).then(()=>{
    if(_academy!==session)return;
    S.userAddr=position.address;S.userAddrLat=position.lat;S.userAddrLng=position.lng;
    closeAddrPicker();if(_addrPickNavCb){const cb=_addrPickNavCb;_addrPickNavCb=null;cb();}
    renderCart();academyGuideTick();
  }).catch(e=>showGeoToast(e.message||'Не удалось сохранить положение'));return true;
}
function academyOperation(){
  if(!academyActive()||!_academy.row.operation)return null;
  const op=structuredClone(_academy.row.operation),stores=academyStores(),items=academyItems();
  if(op.history)op.history=op.history.map(event=>({...event,..._academy.lesson.actors[event.index]}));
  op.stores=stores.find(s=>s.id===op.store_id);
  if(op.order_items)op.order_items=op.order_items.map(i=>({...i,menu_items:items.find(m=>m.id===i.menu_item_id)}));
  op.menu_items=items.find(i=>i.id===(op.menu_item_id||op.item_id));return op;
}
function academyPeople(){
  const op=academyOperation();if(!op||!op.menu_items?.is_training)return [];
  const base={menu_item_id:op.menu_item_id,master_id:op.master_id,slot_date:op.slot_date,slot_start:op.slot_start,slot_end:op.slot_end,preferred_start:op.preferred_start,preferred_end:op.preferred_end,status:op.status,avatar_url:null,bio:'Участник'};
  return [{...base,user_id:_academy.user,full_name:'Вы',is_me:true},...['Саша','Михаил'].map((name,i)=>({...base,user_id:`aca50000-0000-4000-8000-00000000000${i+1}`,full_name:name+' · участник',is_me:false}))];
}
function renderAcademyAlibi(){
  const op=academyOperation(),screen=document.getElementById('screen-calenabs');
  let el=document.getElementById('academy-alibi-records');
  if(!el){el=document.createElement('div');el.id='academy-alibi-records';el.className='pb';screen.querySelector('.ph').after(el);}el.hidden=false;
  if(!op){el.innerHTML='<div class="empty">Сначала оформите операцию по подсказкам Академии.</div>';return;}
  const actor=_academy.lesson.actors[_academy.row.actor_index];
  el.innerHTML=`<div class="academy-label">Академия Alliby</div><button class="academy-operation" id="academy-operation-card" onclick="academyOpenOperation()"><strong>${esc(op.menu_items?.name||op.order_items?.[0]?.menu_items?.name||_academy.lesson.title)}</strong><span>${esc(op.stores.name)}</span><span>${esc(actor.label)} · ${Number(op.total_amount??op.total_price)} ₽</span><small>Открыть детали →</small></button>`;
}
async function academyOpenOperation(observe=true){
  const op=academyOperation();if(!op)return;
  let modal,body;
  if(op.kind==='order'){_homeOrders=[op];openOrderDetail(0);modal=document.getElementById('m-order-detail');body=document.getElementById('mod-items');}
  else if(op.kind==='booking'){
    const pending=op.status==='pending_approval',completed=op.status==='completed',actor=_academy.lesson.actors[_academy.row.actor_index];
    _myBk.byDate={[op.slot_date]:[op]};_myBk.masterMap=Object.fromEntries(ACADEMY_DATA.masters.map(m=>[m.id,m.full_name]));
    _myBk.badges={[op.id]:{isPending:pending,completed,isCancelled:false,isPastBk:false,paid:op.payment_status==='paid',sStart:(pending?op.preferred_start:op.slot_start)?.slice(0,5),sEnd:(pending?op.preferred_end:op.slot_end)?.slice(0,5),statusBadge:esc(actor.label)}};
    await openBookingDetail(op.id);modal=document.getElementById('m-bk-detail');body=document.getElementById('mbd-body');
    document.getElementById('mbd-ft').innerHTML='<button class="btn" onclick="closeModal(\'m-bk-detail\')">Закрыть</button>';
  }else{
    renderRentDetailModal(op);modal=document.getElementById('m-event-detail');body=document.getElementById('evd-body');
    // This renderer refreshes its body asynchronously; append after its request.
    await Promise.resolve();
  }
  if(!academyActive())return;
  modal.dataset.academyRecord=op.id;_academyDetails={id:op.id,modal:modal.id,index:_academy.row.actor_index};
  body.querySelector('.academy-history')?.remove();
  const section=document.createElement('section');section.className='academy-history';
  section.innerHTML=`<div class="academy-label">Академия · без списания денег</div><h3>Кто изменил статус</h3><ol>${op.history.map(event=>`<li><strong>${esc(event.role)} → ${esc(event.label)}</strong><span>${esc(event.text)}</span></li>`).join('')}</ol>`;body.appendChild(section);
  if(observe&&!document.hidden&&modal.classList.contains('open')){
    try{await academyCommand('observe',{record_id:op.id,index:_academyDetails.index});}catch(e){if(!e.accountChanged)showGeoToast(e.message||'Не удалось сохранить шаг');}
  }
  academyGuideTick();
}


function academyVisible(selector){
 try{return [...document.querySelectorAll(selector)].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';});}catch{return null;}
}
function academyStepDone(name){return !!_academy?.row.steps?.[name];}
function academyRecordStep(name){
 const session=_academy;
 if(!academyActive()||!session.lesson.required_steps.includes(name)||academyStepDone(name)||session.pendingSteps?.has(name))return;
 (session.pendingSteps ||= new Set()).add(name);
 academyCommand('step',{name},session).catch(e=>{if(!e.accountChanged)showGeoToast(e.message||'Не удалось сохранить действие');}).finally(()=>session.pendingSteps.delete(name));
}
function academyCaptureAction(event){
 if(!academyActive())return;
 const el=event.target.closest?.('[onclick],button,.sched-day,.stl-item,.sl-item');if(!el)return;
 const call=el.getAttribute('onclick')||'',session=_academy;
 // Record actual choices, rather than the dates selected automatically by the forms.
 if(el.closest('#mbs-cal-body')&&el.classList.contains('has-sched')){
  session.bookingDateChosen=true;academyRecordStep('booking_date');
 }
 if(el.id==='map-tog-btn')setTimeout(()=>{if(_academy===session&&!document.querySelector('.map-layout').classList.contains('no-map'))academyRecordStep('map_open');},0);
 if(el.id==='delivery-filter-btn'){session.deliveryFilterClicked=true;delete _dzCache[session.lesson.store_id];}
 if(el.id==='svc-tab-masters')academyRecordStep('masters_tab');
 if(call.startsWith('openMasterProfile('))academyRecordStep('master_profile');
 if(call.includes('bookFromMasterProfile('))academyRecordStep('master_service');
 if(el.id==='svc-tab-sched')academyRecordStep('schedule_tab');
 if(call.startsWith("pickCaSched('item'")||call.startsWith('setCaSchedItem('))academyRecordStep('schedule_item');
 if(el.closest('#ca-sched-cal')&&el.classList.contains('has-sched'))academyRecordStep('schedule_date');
 if(el.closest('#ca-sched-slots')&&el.classList.contains('booking-slot'))academyRecordStep('schedule_slot');
 if(el.id==='home-tile-sport')academyRecordStep('home_direction');
 if(call.includes("dirShortcutFormat('sport','group'"))academyRecordStep('home_shortcut');
 if(el.classList.contains('stl-item'))academyRecordStep('home_venue');
 if(el.closest('#mbs-personal-days-list'))session.rangeChanged=true;
}
document.addEventListener('click',academyCaptureAction,true);
document.addEventListener('change',academyCaptureAction,true);
let _academyGuideFrame=0;
function academyScheduleGuide(){if(!_academyGuideFrame)_academyGuideFrame=requestAnimationFrame(()=>{_academyGuideFrame=0;academyGuideTick();});}
function academyBindMap(){
 if(!S.map||_academy.boundMap===S.map)return;
 const session=_academy;session.boundMap=S.map;
 S.map.on('dragstart',()=>{if(_academy===session){session.mapDragged=true;deselectStore();}});
 S.map.on('moveend',()=>{if(_academy===session&&session.mapDragged){session.mapSorted=true;updateViewportList();academyScheduleGuide();}});
}
function academyGuideTick(){
 if(!academyActive())return;
 const session=_academy,{lesson,row}=session,screen=_contentScreen(),selector=academyVisible;
 document.documentElement.dataset.academyMapStage=lesson.id==='delivery'&&screen==='map'&&!academyStepDone('delivery_filter')?'explore':'rows';
 if(!row.visited&&screen==='store'&&S.store?.id===lesson.store_id&&!session.eventPending){
  session.eventPending=true;academyCommand('visit',{store_id:lesson.store_id}).catch(e=>{if(!e.accountChanged)showGeoToast(e.message);}).finally(()=>{session.eventPending=false;});
 }
 let target=null,title=lesson.title,message='',action=null;
 const guide=(s,m,a=null)=>{target=selector(s);message=m;action=a;};
 const mapIncomplete=lesson.id==='delivery'&&!['map_open','map_pin','map_sort','delivery_filter'].every(academyStepDone);
 if(row.operation){
  const details=_academyDetails?.id===row.operation.id&&document.getElementById(_academyDetails.modal)?.classList.contains('open');
  if(details){
   const current=lesson.actors[row.actor_index];title=current.role+' → '+current.label;message=current.text;
   target=selector('#'+_academyDetails.modal+' .academy-history li:last-child');
   if(row.observed_index===row.actor_index)action={label:row.actor_index===lesson.actors.length-1?'Завершить задание':'Следующее действие',fn:row.actor_index===lesson.actors.length-1?'finish':'advance'};
  }else if(screen!=='calenabs')guide('[data-nav="calenabs"]','Операция оформлена. Откройте «Алиби», затем её детали.');
  else guide('#academy-operation-card','Откройте детали операции и посмотрите, как меняются статусы.');
 }else if(selector('#m-dz-viewer.open')){
  guide('#m-dz-viewer button[onclick="closeDzViewer()"]','На карте показаны зоны и стоимость доставки. Вернитесь к списку, чтобы продолжить.');
 }else if(mapIncomplete&&screen!=='map'){
  guide('[data-nav="map"]','В первом задании сначала познакомимся с картой и фильтром доставки. Откройте «Заведения».');
 }else if(screen==='home'&&lesson.route==='home'){
  if(!academyStepDone('home_direction'))guide('#home-tile-sport','На главной откройте направление «Спорт».');
  else guide('#home-tile-sport .ht-shortcut-btn[onclick*="group"]','Выберите «По расписанию»: здесь собраны групповые занятия.');
 }else if(screen==='sporttrainings'&&lesson.route==='home'){
  guide('#stl-list .stl-item','Выберите тренировку в клубе «Движение». Откроется его расписание.');
 }else if(screen==='map'&&lesson.id==='delivery'){
  academyBindMap();
  if(!academyStepDone('map_open'))guide('#map-tog-btn','Нажмите кнопку карты, чтобы открыть её.');
  else if(!academyStepDone('map_pin')){
   const pin=selector('.store-pin[data-store-id="'+lesson.store_id+'"]'),area=document.getElementById('map-gl'),r=pin?.getBoundingClientRect(),a=area.getBoundingClientRect();
   if(area.scrollLeft||area.scrollTop){area.scrollLeft=0;area.scrollTop=0;}
   const outside=!r||r.left<a.left+(window.innerWidth<=600?90:0)||r.right>a.right-40||r.top<a.top||r.bottom>a.bottom;
   if(outside&&S.map&&!S.map.isMoving()&&Date.now()-(session.pinLocatedAt||0)>1200){const store=S.allStores.find(s=>s.id===lesson.store_id);if(store){session.pinLocatedAt=Date.now();S.map.easeTo({center:[store.lng,store.lat],zoom:14,duration:350});}}
   guide('.store-pin[data-store-id="'+lesson.store_id+'"]','Нажмите на заведение прямо на карте. Его карточка выделится в списке.');
  }
  else if(!academyStepDone('map_sort')){
   if(!session.mapSorted)guide('#map-gl','Передвиньте карту. Список перестраивается: ближе к началу оказываются заведения, ближайшие к центру карты.');
   else guide('#sl-list','Обратите внимание: список отсортирован по расстоянию до центра карты. Можно искать заведения в другом районе, просто перемещая карту.',{label:'Продолжить',fn:'map_sort'});
  }else if(!academyStepDone('delivery_filter')){
   if(selector('#m-addr-pick.open'))guide('#m-addr-pick .modal','Укажите свою точку на карте и подтвердите адрес. Фильтр покажет тех, кто доставляет сюда.');
   else if(!S.deliveryFilter)guide('#delivery-filter-btn','Зелёный значок доставки означает, что выбранный адрес входит в зону заведения. Красный — адрес вне зоны. Включите «Доставка», чтобы оставить подходящие заведения. Если адрес не выбран, используется геолокация.');
   else {guide('#sl-list','Остались заведения с зелёным значком: они доставляют по выбранному адресу. Заведения с красным значком фильтр скрыл.',{label:'Продолжить',fn:'delivery_filter'});}
  }else guide('#sl-list [data-sid="'+lesson.store_id+'"]','Нажмите на карточку кафе целиком, чтобы открыть его меню.');
 }else if(selector('#m-book-slot.open')){
  const pickedInSchedule=academyStepDone('schedule_date');
  if(_booking.masters.length&&!_booking.selectedMasterId)guide('#mbs-master-filter','Выберите мастера или тренера.');
  else if(!pickedInSchedule&&!session.bookingDateChosen)guide('#academy-booking-calendar','Выберите подходящий день в календаре. После этого выберем время.');
  else if(_booking.trainingMode==='personal'){
   if(!Object.keys(_booking.personalDays||{}).length)guide('#academy-booking-calendar','Выберите один будущий день.');
   else if(!session.rangeChanged)guide('#mbs-personal-days-list','Укажите удобный диапазон времени. Тренер выберет внутри него точное время.',{label:'Диапазон подходит',fn:'range'});
   else guide('#mbs-book-btn','Отправьте заявку. Подтверждение тренера и точное время появятся в «Алиби».');
  }else if(!_booking.selectedSlot)guide('#mbs-slots','Выберите свободное время на выбранную дату.');
  else guide('#mbs-book-btn','Проверьте дату и время, затем подтвердите запись. Деньги не списываются.');
 }else if(selector('#m-rent.open')){
  if(selector('#mrent-step1'))guide('#mrent-step1',lesson.id==='vr_session'?'Выберите два игровых места, затем перейдите к дате.':'Выберите количество и нажмите «Выбрать дату».');
  else if(!_rentItem?._pendingStart)guide(lesson.id==='vr_session'&&_rentStartDate?'#mrent-slots-grid':'#mrent-calendar',lesson.id==='vr_session'?'Выберите будущий день и период сеанса: один или несколько часовых слотов.':'Выберите в календаре день начала и день окончания аренды.');
  else guide('#mrent-pay-btn','Проверьте период и стоимость, затем нажмите «Оплатить». В Академии списания не будет.');
 }else if(screen==='store'&&S.store?.id===lesson.store_id){
  if(lesson.route==='master'&&!academyStepDone('master_service')){
   if(selector('#m-master-profile.open'))guide('#mmp-services button[onclick*="'+lesson.item_ids[0]+'"]','В профиле специалиста выберите нужную услугу и нажмите «Записаться».');
   else if(!selector('#svc-tab-masters.active'))guide('#svc-tab-masters',lesson.direction==='sport'?'Откройте вкладку «Тренеры».':'Откройте вкладку «Мастера».');
   else guide('#masters-list [onclick^="openMasterProfile"]','Выберите специалиста, чтобы посмотреть его услуги и записаться.');
  }else if(['schedule','home'].includes(lesson.route)){
   if(!selector('#svc-tab-sched.active'))guide('#svc-tab-sched','Откройте вкладку «Запись».');
   else if(selector('#m-ca-pick.open')){const master=document.getElementById('m-ca-pick').dataset.kind==='master';guide(master?'#m-ca-pick-list [onclick*="pickCaSched"]':'#m-ca-pick-list [onclick*="'+lesson.item_ids[0]+'"]',master?'Выберите специалиста.':'Выберите нужное занятие или услугу.');}
   else if(_caSched.itemId!==lesson.item_ids[0])guide('#ca-sched-picks [onclick*="item"]','Сначала выберите занятие или услугу — тогда появятся доступные даты.');
   else if(!_caSched.openDate)guide('#ca-sched-cal-section','Выберите день в календаре, чтобы увидеть мероприятия и свободное время.');
   else if(!selector('#ca-sched-slot-masters [onclick^="bookCaSvcMaster"]'))guide('#ca-sched-slots','Выберите конкретное занятие или время в этот день.');
   else guide('#ca-sched-slot-masters','Выберите свободного специалиста для выбранного времени.');
  }else if(lesson.id==='compare_purchase'&&!row.compared){
   const missing=lesson.item_ids.find(id=>!_compareState('goods').items.some(e=>e.item.id===id));
   guide(missing?'.item-card[data-id="'+missing+'"] .compare-toggle':'[data-nav="cart"]',missing?'Добавьте обе дрели в сравнение.':'Откройте корзину, затем вкладку «Сравнение».');
  }else if(S.cart.length||S.rentCart.length)guide('[data-nav="cart"]','Перейдите в корзину для оформления.');
  else guide('.item-card[data-id="'+lesson.item_ids[0]+'"] .ia-add:not(.favorite-toggle):not(.compare-toggle)',lesson.kind==='rent'?'Откройте аренду выбранной позиции.':'Добавьте обед в корзину.');
 }else if(screen==='cart'){
  if(lesson.id==='compare_purchase'&&!row.compared){
   if(_compareState().tab!=='compare')guide('#ctab-compare','Откройте вкладку «Сравнение».');
   else{
    guide('#comparison-content','Сравните цену и характеристики двух дрелей.');
    if(lesson.item_ids.every(id=>selector('th[data-comparison-id="'+id+'"]'))&&!session.eventPending){
     session.eventPending=true;academyCommand('compare',{item_ids:lesson.item_ids,viewed:true}).finally(()=>session.eventPending=false).catch(e=>showGeoToast(e.message));
    }
   }
  }else if(_compareState().tab==='compare')guide('[data-compare-action="buy"]','Выберите одну дрель для покупки с самовывозом.');
  else if(lesson.id==='delivery'&&selector('#m-addr-pick.open'))guide('#m-addr-pick .modal','Отметьте своё положение на карте и подтвердите адрес доставки.');
  else if(lesson.id==='delivery'&&S.deliveryMode!=='delivery')guide('#del-delivery-btn','Выберите доставку вместо самовывоза.');
  else if(lesson.id==='delivery'&&!row.location)guide('#delivery-addr-wrap','Укажите своё положение на карте и подтвердите адрес.');
  else guide(S.rentCart.length?'#rent-cart-pay-btn':'#cart-pay-btn','Проверьте заказ и подтвердите оформление. Деньги не списываются.');
 }else guide('[data-nav="store"]','Вернитесь в заведение, чтобы продолжить задание.');
 academyPlaceGuide(target,title,message,action);
}
function academyPlaceGuide(target,title,message,action){
 const root=document.getElementById('academy-guide'),card=document.getElementById('academy-guide-card');if(!root)return;
 const update=(id,value)=>{const el=document.getElementById(id);if(el.textContent!==value)el.textContent=value;};
 update('academy-guide-title',title);update('academy-guide-text',message);update('academy-guide-count',(ACADEMY_DATA.lessons.findIndex(l=>l.id===_academy.lesson.id)+1)+' / '+ACADEMY_DATA.lessons.length+' · Академия');
 const button=document.getElementById('academy-guide-next');button.hidden=!action;button.disabled=!!_academy.actionPending;
 if(action){update('academy-guide-next',action.label);button.dataset.action=action.fn;}
 const bounds=root.getBoundingClientRect(),sx=bounds.width/root.clientWidth||1,sy=bounds.height/root.clientHeight||1;
 // Reserve a separate bottom area; the explanation can never cover a form button.
 const space=Math.ceil(card.getBoundingClientRect().height/sy)+16;
 if(Math.abs((_academy.guideSpace||0)-space)>1){_academy.guideSpace=space;document.documentElement.style.setProperty('--academy-guide-space',space+'px');if(S.map)setTimeout(()=>S.map?.resize(),100);}
 const key=target?(target.id||target.dataset.storeId||target.outerHTML.slice(0,110)):'waiting';
 if(target&&key!==_academyTargetKey){_academyTargetKey=key;if(target.id!=='map-gl'&&!target.closest('#map-gl'))target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}
 const r=target?.getBoundingClientRect(),spot=document.getElementById('academy-guide-spot');
 spot.hidden=!r;
 if(r)Object.assign(spot.style,{left:Math.max(0,(r.left-bounds.left)/sx-3)+'px',top:Math.max(0,(r.top-bounds.top)/sy-3)+'px',width:(r.width/sx+6)+'px',height:(r.height/sy+6)+'px'});
}
async function academyGuideAction(){
 if(!academyActive()||_academy.actionPending)return;
 const session=_academy,action=document.getElementById('academy-guide-next').dataset.action;session.actionPending=true;
 try{
  if(action==='range'){session.rangeChanged=true;return;}
  if(action==='map_sort'||action==='delivery_filter'){await academyCommand('step',{name:action});return;}
  if(!_academyDetails||!document.getElementById(_academyDetails.modal)?.classList.contains('open'))throw new Error('Откройте детали операции');
  await academyCommand(action);
  if(action==='finish'){showGeoToast('Задание выполнено ✓');academyExit();return;}
  renderAcademyAlibi();await academyOpenOperation();
 }catch(e){if(!e.accountChanged)showGeoToast(e.message||'Не удалось сохранить действие');}
 finally{if(_academy===session){session.actionPending=false;academyGuideTick();}}
}
window.addEventListener('resize',academyScheduleGuide);
window.addEventListener('scroll',academyScheduleGuide,true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&academyActive())academyGuideTick();});
