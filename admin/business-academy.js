/* Guided setup of the owner's real business. No alternate records or write API. */
const BUSINESS_ACADEMY_LESSONS=[
  {id:'store',icon:'store',title:'Создай своё заведение',text:'Проверьте статус продавца, укажите название, направление и адрес своего заведения.'},
  {id:'product',icon:'pkg',title:'Добавь первую позицию',text:'Создайте настоящий товар, услугу или аренду: выберите заведение, название, тип и цену.'},
  {id:'information',icon:'edit',title:'Заполни информацию о заведении',text:'Добавьте телефон и часы работы, чтобы клиентам было проще связаться с вами.'},
  {id:'employee',icon:'key',title:'Добавь сотрудника',text:'Создайте доступ для реального сотрудника и посмотрите его логин.'},
  {id:'service',icon:'services',title:'Добавь услугу для записи',text:'Укажите длительность услуги, цену и доступность для записи.',directions:['services','sport','education','entertainment']},
  {id:'master_schedule',icon:'calendar',title:'Настрой расписание сотрудника',text:'Назначьте мастера, тренера или преподавателя, часы работы и услуги.',directions:['services','sport','education','entertainment']},
  {id:'group',icon:'users',title:'Добавь групповое занятие',text:'Задайте длительность, число мест, дни недели и время начала.',directions:['sport','education','entertainment']},
  {id:'personal',icon:'ba-person',title:'Добавь персональное занятие',text:'Задайте длительность встречи и диапазоны времени для записи.',directions:['sport','education','entertainment']},
  {id:'rental',icon:'refresh',title:'Добавь позицию для аренды',text:'Настройте количество, стоимость и шаг периода аренды.'},
  {id:'subscription',icon:'ba-ticket',title:'Создай абонемент',text:'Выберите товар или услугу, срок действия, скидку и количество использований.'},
  {id:'category',icon:'ba-layers',title:'Создай категорию каталога',text:'Сгруппируйте товары и услуги своего заведения, чтобы клиентам было проще выбирать.'},
  {id:'discount',icon:'ba-percent',title:'Настрой скидку на позицию',text:'Откройте существующую позицию и укажите прежнюю цену выше текущей.'},
  {id:'price_rules',icon:'clock',title:'Настрой цены по дням и часам',text:'Создайте отдельную цену для выбранных дней или времени, например для утренних часов.'},
  {id:'options',icon:'ba-sliders',title:'Настрой группы опций',text:'Настройте ингредиенты или дополнительные опции: один либо несколько вариантов, обязательность выбора и доплату.'},
];
let _baState={user:null,known:false,stores:[],items:{},employees:{},features:{},selected:'',error:''};
let _baRun=null,_baCheck=null,_baTimer=null;
const businessAcademyActive=()=>!!_baRun&&_baRun.user===S.session?.user?.id;
const baEl=id=>document.getElementById(id);
const baStore=()=>_baState.stores.find(s=>s.id===_baState.selected);
function baRentalExample(){
  return ({food:'«Столик на 4 гостей» с оплатой за час. Количество — число столиков, а число мест укажите в названии и описании.',goods:'«Проектор» с оплатой за день. Количество — число доступных проекторов.',services:'«Кабинет специалиста» с оплатой за час. Отдельный кабинет — одна единица аренды.',sport:'«Теннисный корт» с оплатой за час. Количество — число одинаковых кортов.',entertainment:'«VR-комната» с оплатой за час. Отдельная комната — одна единица аренды.',education:'«Аудитория на 10 человек» с оплатой за час. Количество — число аудиторий, а не учеников.'})[baStore()?.direction]||'Столик, оборудование, кабинет, корт или аудитория с оплатой за выбранный период.';
}
function baOptionExample(){
  return ({food:'«Ингредиенты»: сыр, соусы; «Молоко»: обычное или растительное.',goods:'«Дополнительно»: подарочная упаковка или сборка.',services:'«Дополнительные услуги»: уходовая маска или выезд специалиста.',sport:'«Инвентарь»: коврик, ракетка или полотенце.',entertainment:'«Дополнительно»: контроллер или набор для праздника.',education:'«Материалы»: рабочая тетрадь или запись занятия.'})[baStore()?.direction]||'Ингредиенты для еды, упаковка для товаров, дополнительные услуги или материалы.';
}
function baProgress(){try{return JSON.parse(localStorage.getItem('alliby_business_academy_v1_'+S.session?.user?.id)||'{}');}catch{return {};}}
function baDone(id){
  const store=baStore();if(id==='store')return !!store;
  if(!store)return false;
  if(id==='product')return _baState.items[store.id]===true;
  if(id==='employee')return _baState.employees[store.id]===true;
  if(id==='information')return !!(store.phone&&store.working_hours)||!!baProgress()['information:'+store.id];
  return _baState.features?.[store.id]?.[id]===true;
}
const baItemLesson=id=>['product','service','group','personal','rental'].includes(id);
const baEditItemLesson=id=>['discount','price_rules','options'].includes(id);
function baBlocked(lesson){
  const store=baStore();if(!store&&lesson.id!=='store')return 'Сначала создайте заведение';
  if(store&&lesson.directions&&!lesson.directions.includes(store.direction)){
    const names={food:'еда',services:'услуги',sport:'спорт',education:'образование',entertainment:'развлечения',goods:'товары'};
    return 'Выберите заведение направления: '+lesson.directions.map(id=>names[id]).join(', ')+'.';
  }
  if(lesson.id==='master_schedule'){
    if(_baState.employees[store.id]!==true)return 'Сначала добавьте сотрудника';
    if(!_baState.features?.[store.id]?.bookable)return 'Сначала добавьте услугу или занятие с длительностью';
  }
  if((lesson.id==='subscription'||baEditItemLesson(lesson.id))&&_baState.items[store.id]!==true)return 'Сначала добавьте товар или услугу';
  return '';
}
async function baFeatures(storeId){
  const exists=async(table,filter)=>{const rows=await _reqNet(`/rest/v1/${table}?${filter}&limit=1`);if(!Array.isArray(rows))throw new Error('Не удалось проверить настройки');return rows.length>0;};
  const base=`store_id=eq.${storeId}`,select='&select=id';
  const [service,bookable,group,personal,rental,subscription,employees,category,discountRows,ruleRows,options]=await Promise.all([
    exists('menu_items',base+'&item_type=eq.service&is_training=not.is.true&duration_minutes=gt.0'+select),
    exists('menu_items',base+'&item_type=eq.service&duration_minutes=gt.0'+select),
    exists('menu_items',base+'&is_training=eq.true&training_mode=eq.group&duration_minutes=gt.0&select=id,training_schedules!inner(menu_item_id)'),
    exists('menu_items',base+'&is_training=eq.true&training_mode=eq.personal&duration_minutes=gt.0&select=id,training_schedules!inner(menu_item_id)'),
    exists('menu_items',base+'&item_type=eq.rental'+select),
    exists('subscriptions',base+select),
    _reqNet(`/rest/v1/profiles?role=eq.employee&employee_store_id=eq.${storeId}&select=id,is_master`),
    exists('categories',base+select),
    _reqNet(`/rest/v1/menu_items?${base}&old_price=gt.0&select=price,old_price`),
    _reqNet(`/rest/v1/item_price_rules?menu_items.store_id=eq.${storeId}&price=gt.0&select=days,time_from,time_to,menu_items!inner(store_id)`),
    exists('menu_item_option_groups',`menu_items.store_id=eq.${storeId}&select=id,menu_items!inner(store_id),menu_item_options!inner(id)`),
  ]);
  const ids=employees.filter(e=>e.is_master).map(e=>e.id);
  let master_schedule=false;
  if(ids.length){
    const filter=`master_id=in.(${ids.join(',')})`;
    const [schedules,services]=await Promise.all([
      _reqNet(`/rest/v1/master_schedules?${filter}&select=master_id,start_time,end_time`),
      _reqNet(`/rest/v1/master_services?${filter}&select=master_id,menu_items!inner(item_type,duration_minutes)&menu_items.item_type=eq.service&menu_items.duration_minutes=gt.0`),
    ]);
    master_schedule=schedules.some(s=>s.start_time&&s.end_time>s.start_time&&services.some(v=>v.master_id===s.master_id));
  }
  const price_rules=ruleRows.some(r=>(r.days?.length>0&&r.days.length<7)||(r.time_from&&r.time_to&&r.time_to>r.time_from));
  return {service,bookable,group,personal,rental,subscription,master_schedule,category,discount:discountRows.some(row=>Number(row.old_price)>Number(row.price)),price_rules,options,hasEmployees:employees.length>0};
}
function businessAcademyReset(){
  businessAcademyStop();_baState={user:null,known:false,stores:[],items:{},employees:{},features:{},selected:'',error:''};_baCheck=null;
  baEl('business-academy-offer')?.remove();
}
async function businessAcademyRefresh(){
  const user=S.session?.user?.id;
  if(!user||!S.profile||S.profile.role==='employee')return;
  if(_baCheck?.user===user)return _baCheck.promise;
  const request={user};_baCheck=request;
  request.promise=(async()=>{
    try{
      // Bypass the content cache: a cached empty list must never trigger onboarding.
      const stores=await _reqNet(`/rest/v1/stores?owner_user_id=eq.${encodeURIComponent(user)}&archived_at=is.null&select=id,name,direction,address,phone,working_hours&order=created_at.asc`);
      if(S.session?.user?.id!==user||_baCheck!==request)return;
      if(!Array.isArray(stores))throw new Error('Не удалось проверить заведения');
      const counts=await Promise.all(stores.map(async store=>{
        try{return [store.id,(await _reqNet(`/rest/v1/menu_items?store_id=eq.${store.id}&select=id&limit=1`)).length>0];}catch{return [store.id,null];}
      }));
      if(S.session?.user?.id!==user||_baCheck!==request)return;
      const selected=stores.some(s=>s.id===_baState.selected)?_baState.selected:(counts.find(([,has])=>has===false)?.[0]||stores[0]?.id||'');
      request.storeId=selected;
      _baState={user,known:true,stores,items:Object.fromEntries(counts),employees:_baState.user===user?_baState.employees:{},features:_baState.user===user?(_baState.features||{}):{},selected,error:''};
      if(selected)try{
        const features=await baFeatures(selected);
        if(S.session?.user?.id===user&&_baCheck===request){_baState.features[selected]=features;_baState.employees[selected]=features.hasEmployees;}
      }catch{if(S.session?.user?.id===user&&_baCheck===request)_baState.error='Не удалось проверить настройки уроков. Повторите проверку перед началом.';}
    }catch(e){if(S.session?.user?.id===user&&_baCheck===request)_baState.error='Не удалось проверить данные. Проверьте соединение с сервером и повторите.';}
    finally{
      if(_baCheck===request){_baCheck=null;businessAcademyRender();businessAcademyOffer(_curScreen);if(request.storeId&&request.storeId!==_baState.selected)setTimeout(businessAcademyRefresh,0);}
    }
  })();return request.promise;
}
function businessAcademyRender(){
  const root=baEl('business-academy-content');if(!root)return;
  const owner=S.session?.user?.id&&S.profile&&S.profile.role!=='employee',known=owner&&_baState.user===S.session.user.id&&_baState.known;
  // Keep buttons attached while a background check completes during a finger press.
  if(!root.querySelector('.ba-tasks'))root.innerHTML=`<p class="ba-intro">Настройте своё заведение шаг за шагом. Действия выполняются в обычных формах Business и сохраняют реальные данные. Ничего не создаётся автоматически.</p>
    <p class="ba-note" id="ba-status"></p><button class="btn" id="ba-retry" onclick="loadBusinessAcademy()" hidden>Повторить проверку</button>
    <label class="ba-store-label" id="ba-store-label" for="ba-store-select">Заведение для уроков</label><select id="ba-store-select" onchange="businessAcademySelect(this.value)"></select>
    <div class="ba-tasks">${BUSINESS_ACADEMY_LESSONS.map(l=>`<button type="button" class="ba-task" data-ba-lesson="${l.id}" onclick="businessAcademyStart(this.dataset.baLesson)"><span class="ba-number" aria-hidden="true">${svgIco(l.icon,24)}</span><span><small class="ba-task-condition" hidden></small><strong>${esc(l.title)}</strong><small class="ba-task-description">${esc(l.text)}</small><small class="ba-task-status"></small></span></button>`).join('')}</div>
    <p class="ba-note">Можно остановить подсказки в любой момент. Уже сохранённые товары, сотрудники и сведения останутся в вашем аккаунте.</p>`;
  baEl('ba-status').textContent=S.profile?.role==='employee'?'Академия настройки доступна владельцу заведения.':_baState.error||(!known?'Проверяем заведения и каталог…':'Обязательные поля отмечены звёздочкой. Подсказки объяснят, что в них указать.');
  baEl('ba-retry').hidden=!_baState.error;
  const select=baEl('ba-store-select'),options=_baState.stores.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  if(select.innerHTML!==options)select.innerHTML=options;
  select.value=_baState.selected;select.hidden=!known||!_baState.stores.length;baEl('ba-store-label').hidden=select.hidden;
  BUSINESS_ACADEMY_LESSONS.forEach((lesson,i)=>{
    const button=root.querySelector(`[data-ba-lesson="${lesson.id}"]`),blocked=baBlocked(lesson),disabled=!known||!!blocked||(lesson.id==='store'&&!!baStore()),done=known&&baDone(lesson.id),badge=button.querySelector('.ba-number');
    button.hidden=false;
    button.querySelector('.ba-task-description').textContent=lesson.text+(lesson.id==='options'?' Например: '+baOptionExample():lesson.id==='rental'?' Например: '+baRentalExample():'');
    button.disabled=disabled;badge.classList.toggle('done',!!done);
    const condition=button.querySelector('.ba-task-condition'),status=button.querySelector('.ba-task-status');
    condition.textContent=known?blocked:'';condition.hidden=!condition.textContent;
    status.textContent=done?(lesson.id==='store'?'Заведение уже создано':'Уже настроено · можно посмотреть'):!known?'Проверяем данные…':blocked?'':'Начать с подсказками';
    status.hidden=!status.textContent;
  });
}
async function loadBusinessAcademy(){
  businessAcademyRender();const user=S.session?.user?.id;if(!user)return;
  if(!S.profile)try{
    const rows=await _reqNet(`/rest/v1/profiles?id=eq.${user}&select=*&limit=1`);
    if(S.session?.user?.id!==user)return;
    if(!rows?.[0])throw new Error('Профиль не загружен');S.profile=rows[0];applyRoleRestrictions();
  }catch{
    if(S.session?.user?.id===user){_baState.error='Не удалось загрузить профиль. Для настройки настоящего заведения нужно соединение с сервером.';businessAcademyRender();}return;
  }
  await businessAcademyRefresh();businessAcademyRender();
}
function businessAcademySelect(id){_baState.selected=id;businessAcademyRender();businessAcademyRefresh();}
function businessAcademyOffer(screen){
  baEl('business-academy-offer')?.remove();
  const user=S.session?.user?.id;
  if(!user||!S.profile||S.profile.role==='employee'||_baState.user!==user||!_baState.known||_baState.error||businessAcademyActive()||['auth','businessacademy'].includes(screen))return;
  const empty=_baState.stores.find(s=>_baState.items[s.id]===false);
  const kind=!_baState.stores.length?'store':empty?'product':null;
  if(!kind)return;
  try{if(sessionStorage.getItem('alliby_ba_later_'+user+'_'+kind))return;}catch{}
  const ph=baEl('screen-'+screen)?.querySelector('.ph');if(!ph)return;
  const card=document.createElement('section');card.id='business-academy-offer';card.className='ba-offer';
  card.innerHTML=`<div><strong>Академия Alliby</strong><p>${kind==='store'?'Создайте своё первое заведение с пошаговыми подсказками.':`В «${esc(empty.name)}» пока нет позиций. Добавьте первую с подсказками.`}</p></div><button class="btn btn-p btn-sm" onclick="goTo('businessacademy')">Начать настройку</button><button class="btn btn-sm" onclick="businessAcademyLater('${kind}')">Позже</button>`;
  ph.after(card);
}
function businessAcademyLater(kind){try{sessionStorage.setItem('alliby_ba_later_'+S.session.user.id+'_'+kind,'1');}catch{}baEl('business-academy-offer')?.remove();}
function baWrapModals(){
  const wrapped=[];
  for(const id of ['m-store','m-mi','m-add-employee','m-seller-verify','m-addr-pick','m-master','m-sub','m-cat']){
    const modal=baEl(id)?.querySelector('.modal'),head=modal?.querySelector('.modal-hd'),foot=modal?.querySelector('.modal-ft');
    if(!head||!foot)continue;
    const body=document.createElement('div');body.className='ba-modal-body';head.after(body);
    while(body.nextSibling&&body.nextSibling!==foot)body.appendChild(body.nextSibling);
    wrapped.push(body);
  }
  return wrapped;
}
function businessAcademyStart(id){
  if(!S.session?.user?.id||S.profile?.role==='employee')return;
  const lesson=BUSINESS_ACADEMY_LESSONS.find(l=>l.id===id);if(!lesson)return;
  if(!_baState.known||_baState.user!==S.session.user.id){businessAcademyRefresh();return;}
  const store=baStore();if(id!=='store'&&!store){showAdminToast('Сначала создайте заведение');return;}
  const blocked=baBlocked(lesson);if(blocked){showAdminToast(blocked);return;}
  // Forms derive available specialist roles from this list; use the checked direction.
  if(store){const full=(S.stores||[]).find(s=>s.id===store.id);if(full)Object.assign(full,store);}
  if(id==='store'&&store){showAdminToast('Заведение уже создано. Выберите урок заполнения информации.');return;}
  businessAcademyStop();closeTour();
  _baRun={id,user:S.session.user.id,storeId:store?.id||null,index:0,saved:false,wrapped:baWrapModals()};
  document.documentElement.classList.add('business-academy-mode');baEl('ba-guide').hidden=false;
  if(baItemLesson(id)||baEditItemLesson(id)||id==='subscription'){
    baEl('mi-store-filter').value=store.id;baEl('mi-cat-filter').value='';baEl('mi-search').value='';_adminMenuTab='items';goTo('menu');
    if(id==='subscription')setAdminMenuTab('subs');
  }else if(id==='category'){baEl('cat-store-filter').value=store.id;_adminMenuTab='categories';goTo('menu');}
  else if(['employee','master_schedule'].includes(id)){goTo('employees');if(baEl('emp-store-filter')){baEl('emp-store-filter').value=store.id;filterEmployees();}}else {goTo('stores');if(store){const full=S.stores.find(s=>s.id===store.id);if(full)openStoreModal(full);}}
  _baTimer=setInterval(businessAcademyTick,180);businessAcademyTick();
}
function businessAcademyStop(){
  clearInterval(_baTimer);_baTimer=null;
  if(_baRun){for(const body of _baRun.wrapped||[]){while(body.firstChild)body.before(body.firstChild);body.remove();}}
  _baRun=null;document.documentElement.classList.remove('business-academy-mode');
  document.documentElement.style.removeProperty('--ba-guide-space');document.documentElement.style.removeProperty('--ba-nav-height');
  if(baEl('ba-guide'))baEl('ba-guide').hidden=true;
  document.querySelectorAll('.ba-field-target').forEach(el=>el.classList.remove('ba-field-target'));
}
function businessAcademyExit(){const editing=!!document.querySelector('.overlay.open')&&!_baRun?.saved;businessAcademyStop();if(!editing)goTo('businessacademy');}
function baField(id,text,valid=()=>!!baEl(id)?.value.trim(),required=true){return {selector:'#'+id,text,valid,required};}
function baSteps(){
  const run=_baRun;if(!run)return [];
  if(run.id==='category')return [
    baField('mc-name','Обязательно: назовите категорию, например «Напитки», «Аксессуары» или «Уход за лицом».'),
    baField('mc-store','Выберите заведение для этого урока. Категория будет принадлежать именно его каталогу.',()=>baEl('mc-store').value===run.storeId),
  ];
  if(baEditItemLesson(run.id)){
    const steps=[{selector:'#mmi-name',text:'Проверьте, что открыли нужную существующую позицию своего заведения. Изменения будут видны клиентам.',valid:()=>!!baEl('mmi-id').value&&baEl('mmi-store').value===run.storeId,required:true}];
    if(run.id==='discount')steps.push(
      baField('mmi-price','Укажите текущую цену в целых рублях, по которой клиент купит позицию. Допустимо число от нуля.',()=>isWholeRublePrice(baEl('mmi-price').value)),
      baField('mmi-discount-toggle','Включите «Скидка», чтобы показать клиенту прежнюю цену.',()=>baEl('mmi-discount-toggle').checked),
      baField('mmi-old-price','Укажите прежнюю цену в целых рублях: она должна быть строго больше текущей. Не завышайте её искусственно.',()=>isWholeRublePrice(baEl('mmi-old-price').value)&&Number(baEl('mmi-old-price').value)>Number(baEl('mmi-price').value)),
    );
    if(run.id==='price_rules')steps.push(
      baField('mmi-price-rules-toggle','Включите «Правила для цены». Обычная цена сохранится для времени вне условий правила.',()=>baEl('mmi-price-rules-toggle').checked),
      {selector:'#mmi-price-rules-list',text:'При включении появилось первое правило; также можно изменить существующее. «+ Правило» добавляет ещё одно условие. Не оставляйте новые правила пустыми и не удаляйте действующие, если хотите их сохранить.',valid:()=>_editPriceRules.length>0,required:true},
      {selector:'#mmi-price-rules-list',text:'Укажите положительную цену. Выберите дни недели или задайте оба времени — начало и конец. Вне выбранных условий действует обычная цена. Для этого урока нужно хотя бы одно ограничение по дням или времени.',valid:()=>baPriceRulesValid(),required:true},
    );
    if(run.id==='options')steps.push(
      {selector:'button[onclick="addOptionGroup()"]',text:'Нажмите «+ Группа» или настройте существующую группу. Например: '+baOptionExample(),valid:()=>_editOptGroups.length>0,required:true},
      {selector:'#mmi-option-groups',text:'Назовите группу. «Радио» означает один вариант, «Чекбокс» — несколько. «Обяз.» требует выбора от клиента. Добавьте хотя бы одну опцию с названием, надбавкой от нуля и отметкой «В наличии». Заполните все добавленные группы.',valid:baOptionsValid,required:true},
    );
    return steps;
  }
  if(run.id==='store')return [
    baField('ms-name','Обязательно: укажите настоящее название заведения. Оно будет отображаться у клиентов.'),
    baField('ms-dir','Обязательно: выберите направление вашего бизнеса. От него зависят доступные товары и услуги.'),
    {selector:'button[onclick="openStoreAddrPicker()"]',text:'Укажите адрес и точку на карте, чтобы клиенты могли найти заведение. Это рекомендуемый шаг.',valid:()=>true,required:false},
    baField('ms-sc','Категория помогает клиентам найти заведение. Выберите подходящую или продолжите без категории.',()=>true,false),
  ];
  if(baItemLesson(run.id)){
    const training=['group','personal'].includes(run.id),special=run.id!=='product';
    const steps=[
      baField('mmi-store','Обязательно: выберите своё заведение. Позиция попадёт именно в его каталог.'),
      baField('mmi-name',run.id==='rental'?'Укажите понятное название позиции аренды. Например: '+baRentalExample():'Обязательно: напишите понятное название товара или услуги.'),
      baField('mmi-item-type',special?`Обязательно: выберите тип «${run.id==='rental'?'Аренда':'Услуга'}». Поля ниже изменятся в зависимости от типа.`:'Обязательно: выберите тип — товар, услуга или аренда. Поля ниже изменятся в зависимости от типа.',()=>!!baEl('mmi-item-type').value&&(!special||baEl('mmi-item-type').value===(run.id==='rental'?'rental':'service'))),
      baField('mmi-price','Обязательно: укажите цену в целых рублях — число от нуля. Нулевая цена допустима.',()=>isWholeRublePrice(baEl('mmi-price').value)),
    ];
    if(baEl('mmi-item-type').value==='service')steps.push(baField('mmi-duration','Укажите длительность в минутах: по ней рассчитывается конец записи. Для записи нужно целое число больше нуля.',()=>Number.isInteger(Number(baEl('mmi-duration').value))&&Number(baEl('mmi-duration').value)>0,special));
    if(baEl('mmi-item-type').value==='rental'){
      steps.push(baField('mmi-total-qty','Укажите общее количество единиц аренды: целое число от одного. Для одного столика, кабинета или корта укажите 1; это не число гостей или участников.',()=>Number.isInteger(Number(baEl('mmi-total-qty').value))&&Number(baEl('mmi-total-qty').value)>=1,special));
      if(run.id==='rental')steps.push(
        baField('mmi-avail-qty','Укажите доступный остаток от нуля до общего количества. Пустое поле при создании означает весь остаток.',()=>baEl('mmi-avail-qty').value===''||(Number.isInteger(Number(baEl('mmi-avail-qty').value))&&Number(baEl('mmi-avail-qty').value)>=0&&Number(baEl('mmi-avail-qty').value)<=Number(baEl('mmi-total-qty').value))),
        baField('mmi-rent-step','Задайте минимальный шаг периода аренды: целое число от одного.',()=>Number.isInteger(Number(baEl('mmi-rent-step').value))&&Number(baEl('mmi-rent-step').value)>=1),
        baField('mmi-rent-unit','Выберите единицу периода. Цена выше должна соответствовать выбранному шагу, например 300 ₽ за 1 час.'),
      );
    }
    if(training)steps.push(
      baField('mmi-training-toggle','Включите «Тренировка»: эта настройка добавляет запись на занятие, места и расписание.',()=>baEl('mmi-training-toggle').checked),
      baField('mmi-training-mode',run.id==='group'?'Выберите «По расписанию» — это групповой формат. Клиенты будут записываться на общее время начала.':'Выберите «Персональная тренировка». Клиент сможет выбрать время внутри указанного диапазона.',()=>baEl('mmi-training-mode').value===(run.id==='group'?'group':'personal')),
    );
    if(baEl('mmi-training-toggle').checked){
      steps.push(baField('mmi-max-group-size','Для тренировки обязательно укажите максимальное число участников — не меньше одного.',()=>Number(baEl('mmi-max-group-size').value)>=1));
      steps.push({selector:'#mmi-training-schedule-list',text:run.id==='personal'?'Выберите дни приёма и для каждого задайте начало и конец диапазона. Конец должен быть позже начала; диапазон должен вмещать длительность встречи.':'Выберите хотя бы один день недели и задайте время начала занятия. Время окончания рассчитывается по длительности.',valid:()=>!_getTrainingErrors()&&(run.id!=='personal'||baPersonalRangesValid()),required:true});
    }
    if(baEl('mmi-discount-toggle').checked)steps.push(baField('mmi-old-price','При включённой скидке обязательна прежняя цена — она должна быть больше текущей.',()=>Number(baEl('mmi-old-price').value)>Number(baEl('mmi-price').value)));
    steps.push(baField('mmi-desc','Описание, категория и фотография не обязательны, но помогают клиенту выбрать. Добавляйте данные своего товара.',()=>true,false));
    return steps;
  }
  if(run.id==='master_schedule')return [
    {selector:'#master-role-setting',text:'Включите роль специалиста. В зависимости от направления это мастер, тренер или преподаватель.',valid:()=>baEl('master-toggle').checked,required:true},
    baField('master-bio','Добавьте описание опыта и специализации. Фотографию можно загрузить в этой же карточке.',()=>true,false),
    {selector:'#master-sched-grid',text:'Отметьте рабочие дни сотрудника и укажите начало и конец приёма. Нужен хотя бы один день; конец должен быть позже начала. Это расписание сотрудника, а не справочные часы заведения.',valid:baMasterTimesValid,required:true},
    {selector:'#master-services-list',text:'Отметьте услуги или занятия, которые проводит этот сотрудник, и проверьте его цены. Для записи нужна хотя бы одна услуга с длительностью больше нуля. Групповое занятие также назначается сотруднику здесь.',valid:baMasterServicesValid,required:true},
  ];
  if(run.id==='subscription')return [
    baField('msub-store','Выберите своё заведение. Абонемент действует в нём.',()=>baEl('msub-store').value===run.storeId),
    baField('msub-name','Обязательно: укажите понятное название абонемента, например «10 посещений».'),
    baField('msub-item','Обязательно: выберите товар или услугу, на которые действует абонемент.'),
    baField('msub-price','Укажите стоимость абонемента в целых рублях — больше нуля.',()=>isWholeRublePrice(baEl('msub-price').value)&&Number(baEl('msub-price').value)>0),
    baField('msub-days','Укажите срок действия в днях — целое число от одного.',()=>Number.isInteger(Number(baEl('msub-days').value))&&Number(baEl('msub-days').value)>0),
    baField('msub-disc-type','Выберите скидку в процентах или рублях. Далее укажите её размер.'),
    baField('msub-disc-value','Укажите скидку больше нуля: в рублях — целую сумму, в процентах — не больше 100%.',()=>Number(baEl('msub-disc-value').value)>0&&(baEl('msub-disc-type').value==='percent'?Number(baEl('msub-disc-value').value)<=100:isWholeRublePrice(baEl('msub-disc-value').value))),
    baField('msub-uses','Укажите количество использований. Ноль означает безлимит; дни, часы и другие ограничения можно настроить ниже.',()=>Number.isInteger(Number(baEl('msub-uses').value))&&Number(baEl('msub-uses').value)>=0),
  ];
  if(run.id==='information')return [
    baField('ms-name','Проверьте обязательное название заведения. Остальные сведения ниже помогают клиентам.'),
    baField('ms-phone','Добавьте рабочий номер заведения, по которому клиент сможет связаться с вами. Это поле не обязательно для сохранения.',()=>true,false),
    baField('ms-hours','Укажите действительные часы работы, например «Пн–Пт 09:00–20:00». Это справочная информация; расписание записей настраивается отдельно.',()=>true,false),
    {selector:'button[onclick="openStoreAddrPicker()"]',text:'Проверьте адрес и точку на карте. Фото, соцсети и другие сведения можно заполнить в этой же форме.',valid:()=>true,required:false},
  ];
  return [
    baField('emp-store','Обязательно: выберите заведение, в котором сотрудник будет работать.'),
    baField('emp-name','Обязательно: укажите имя реального сотрудника.'),
    baField('emp-phone','Обязательно: укажите номер телефона сотрудника. Он участвует в формировании логина.'),
    baField('emp-password','Обязательно: задайте пароль не короче 6 символов. Передайте его сотруднику по безопасному каналу.',()=>baEl('emp-password').value.trim().length>=6),
  ];
}
function baPersonalRangesValid(){
  const duration=Number(baEl('mmi-duration')?.value);
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
  return duration>0&&_editTrainingSchedule.length>0&&_editTrainingSchedule.every(r=>r.start_time&&r.end_time&&minutes(r.end_time)-minutes(r.start_time)>=duration);
}
function baPriceRulesValid(){
  return _editPriceRules.length>0&&!_getPriceRulesErrors()&&_editPriceRules.some(r=>(r.days?.length>0&&r.days.length<7)||(r.time_from&&r.time_to));
}
function baOptionsValid(){
  return _editOptGroups.length>0&&_editOptGroups.every(g=>g.name.trim()&&['radio','checkbox'].includes(g.type)&&g.options.length>0&&g.options.some(o=>o.is_available!==false)&&g.options.every(o=>o.name.trim()&&isWholeRublePrice(o.price_add)));
}
function baMasterTimesValid(){
  const days=[...document.querySelectorAll('#master-sched-grid input[type=checkbox]:checked')];
  return days.length>0&&days.every(el=>{const day=el.id.split('-').pop(),start=baEl('msched-start-'+day)?.value,end=baEl('msched-end-'+day)?.value;return start&&end&&end>start;});
}
function baMasterServicesValid(){
  return !!_masterData?.items?.some(item=>item.item_type==='service'&&item.duration_minutes>0&&baEl('msvc-on-'+item.id)?.checked)&&
    _masterData.items.filter(item=>baEl('msvc-on-'+item.id)?.checked).every(item=>isWholeRublePrice(baEl('msvc-price-'+item.id)?.value));
}
function businessAcademyNext(){
  if(!businessAcademyActive())return;
  if(_baRun.saved){businessAcademyExit();return;}
  const step=baSteps()[_baRun.index];
  if(step&&step.required&&!step.valid()){showAdminToast('Заполните обязательное поле');document.querySelector(step.selector)?.focus();return;}
  _baRun.index++;businessAcademyTick();
}
function businessAcademyTick(){
  if(!_baRun)return;
  if(!businessAcademyActive()){businessAcademyStop();return;}
  const run=_baRun,visible=s=>[...document.querySelectorAll(s)].find(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().width>0);
  const editing=baEditItemLesson(run.id),item=baItemLesson(run.id)||editing,category=run.id==='category',staff=['employee','master_schedule'].includes(run.id),sub=run.id==='subscription';
  const view={modal:item?'m-mi':category?'m-cat':sub?'m-sub':run.id==='master_schedule'?'m-master':staff?'m-add-employee':'m-store',list:item?'#mi-list':category?'#cats-tbody':sub?'#sub-list':staff?'#emp-list':'#stores-list',save:item?'#mmi-save-btn':category?'#mc-save-btn':sub?'#msub-save-btn':run.id==='master_schedule'?'#master-save-btn':staff?'#m-add-employee button[onclick="saveEmployee()"]':'#ms-save-btn'};
  let target,message,next=false;
  if(run.saved){
    target=visible(view.list);
    message=run.id==='employee'?'Сотрудник создан в вашем заведении. Посмотрите его логин в списке и передайте сотруднику логин и заданный пароль.':run.id==='master_schedule'?'Расписание и услуги сотрудника сохранены. Клиенты смогут выбирать его при записи; для занятия также проверьте расписание самой позиции.':sub?'Абонемент сохранён. Проверьте цену, срок, скидку и ограничения перед публикацией.':['group','personal'].includes(run.id)?'Занятие и его расписание сохранены. Назначьте его тренеру или преподавателю в уроке «Настрой расписание сотрудника» и проверьте доступность позиции.':item?'Позиция сохранена в каталоге вашего заведения. Проверьте её название, цену и доступность.':'Сведения сохранены в вашем аккаунте. Проверьте карточку заведения.';next=true;
    const learned={category:'Категория создана в вашем заведении. Теперь откройте товар или услугу и выберите её в поле «Категория», чтобы сгруппировать позиции.',discount:'Скидка сохранена. Проверьте текущую и перечёркнутую прежнюю цену в карточке позиции.',price_rules:'Правила цены сохранены. Проверьте дни и часы действия: вне условий используется обычная цена позиции.',options:'Группы опций сохранены. При выборе позиции клиент сможет указать ингредиенты или дополнительные опции, а доплаты войдут в итоговую стоимость.'};
    if(learned[run.id])message=learned[run.id];
  }else if(visible('#m-seller-verify.open')){
    const verified=baEl('msv-btn').textContent.includes('Создать заведение');
    target=visible(verified?'#msv-btn':!validateInn(baEl('msv-inn').value)?'#msv-inn':visible('#msv-name-wrap')&&!baEl('msv-name').value.trim()?'#msv-name':'#msv-btn');
    message=verified?'Статус продавца подтверждён. Продолжите создание своего заведения.':'Для создания заведения требуется подтвердить статус продавца. Введите свой ИНН, при необходимости Ф. И. О. и нажмите «Проверить». Проверка выполняется обычным сервисом Business.';
  }else if(visible('#m-addr-pick.open')){
    target=visible(_addrPickResult.lat!=null?'#m-addr-pick button[onclick="confirmAddrPick()"]':'#addr-pick-gl');
    message='Найдите адрес своего заведения или передвиньте карту. Убедитесь, что точка выбрана правильно, и нажмите «Подтвердить».';
  }else if(run.id==='store'&&S.profile?.seller_legal_check==='manual_review'&&!visible('#m-store.open')){
    target=visible('#ph-actions button[title="Профиль"]');message='Статус продавца проверяется вручную. Создать заведение можно будет после подтверждения. Результат появится в юридических данных профиля; подсказки можно пока остановить.';
  }else{
    const modal=view.modal;
    if(visible('#'+modal+'.open')){
      const steps=baSteps(),step=steps[run.index];
      const emp=run.id==='master_schedule'?(S._cachedEmps||[]).find(e=>e.id===baEl('master-emp-id').value):null;
      if(run.id==='master_schedule'&&emp?.employee_store_id!==run.storeId){target=visible('#master-modal-title');message='Открыт сотрудник другого заведения. Закройте карточку и выберите сотрудника заведения для этого урока.';}
      else if(editing&&(_miDetailsLoading||_miDetailsFailed)){target=visible('#mmi-title');message=_miDetailsFailed?'Не удалось загрузить настройки позиции. Закройте карточку и откройте её заново, чтобы не потерять существующие опции и правила.':'Загружаем действующие опции и правила цены позиции…';}
      else if(step){target=visible('#'+modal+' '+step.selector);message=step.text;next=!!target;}
      else {target=visible(view.save);message='Проверьте введённые данные и нажмите «Сохранить». Это реальное сохранение в вашем аккаунте. При ошибке исправьте отмеченные поля и повторите.';}
    }else{
      if(editing)target=visible(`#mi-list .card[data-store="${run.storeId}"] button[onclick*="openMenuItemModal("]`);
      else if(item)target=visible('#menu-add-btn');
      else if(category)target=visible('#menu-add-cat-btn');
      else if(sub)target=visible('#menu-add-sub-btn');
      else if(run.id==='master_schedule')target=visible(`#emp-list .card[data-store="${run.storeId}"] button[onclick^="openMasterModal"]`);
      else if(run.id==='employee')target=visible('button[onclick="openAddEmployeeModal()"]');
      else if(run.id==='store'&&!_baState.stores.length)target=visible('#screen-stores button[onclick="openStoreModal()"]');
      else target=visible('#stores-list .card[onclick]');
      message=editing?'Выберите существующую позицию своего заведения и нажмите «Ред.». Этот урок изменяет её настройки.':category?'Во вкладке «Категории» экрана «Товары и услуги» нажмите «+ Добавить». Категория объединит позиции вашего заведения.':item?'Нажмите «+ Добавить», чтобы создать позицию в каталоге своего заведения.':sub?'Во вкладке «Абонементы» нажмите «+ Добавить». Оплата при создании абонемента не выполняется.':run.id==='master_schedule'?'В списке сотрудников своего заведения нажмите кнопку «Мастер», «Тренер» или «Преподаватель» у нужного человека.':run.id==='employee'?'Нажмите «Добавить сотрудника». Будет создан настоящий доступ к вашему заведению.':run.id==='store'&&!_baState.stores.length?'Нажмите «+ Добавить». Сначала Business проверит статус продавца, затем откроет карточку заведения.':'Откройте карточку своего заведения для заполнения информации.';
    }
  }
  const update=(id,text)=>{const el=baEl(id);if(el.textContent!==text)el.textContent=text;};
  update('ba-guide-title',BUSINESS_ACADEMY_LESSONS.find(l=>l.id===run.id).title);
  update('ba-guide-text',message);
  baEl('ba-guide-next').hidden=!next;update('ba-guide-next',run.saved?'Завершить урок':'Далее');
  document.querySelectorAll('.ba-field-target').forEach(e=>{if(e!==target)e.classList.remove('ba-field-target');});
  if(target){target.classList.add('ba-field-target');if(run.target!==target){run.target=target;target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}}
  const nav=baEl('bottom-nav'),nr=nav?.getBoundingClientRect(),nh=nav&&getComputedStyle(nav).display!=='none'&&nr.width>nr.height?Math.ceil(nr.height):0;
  document.documentElement.style.setProperty('--ba-nav-height',nh+'px');
  const space=Math.ceil(baEl('ba-guide-card').getBoundingClientRect().height)+16;
  if(run.space!==space){run.space=space;document.documentElement.style.setProperty('--ba-guide-space',space+'px');setTimeout(()=>_addrPickMap?.resize(),100);}
}
function businessAcademySaved(kind,storeId,details={},run=null){
  // Ordinary saves also refresh the setup offer, even when guidance is stopped.
  businessAcademyRefresh();
  if(!run||_baRun!==run||!businessAcademyActive())return;
  const lesson=run.id;
  if(lesson!==kind&&!(kind==='product'&&(baItemLesson(lesson)||baEditItemLesson(lesson))))return;
  if(!storeId)return;
  if(kind!=='store'&&storeId!==_baRun.storeId)return;
  _baRun.saved=true;
  if(kind==='store'){_baState.stores=_baState.stores.filter(s=>s.id!==storeId).concat({id:storeId,...details});_baState.selected=storeId;}
  if(kind==='information')_baState.stores=_baState.stores.map(s=>s.id===storeId?{...s,...details}:s);
  if(kind==='product')_baState.items[storeId]=true;
  if(kind==='employee')_baState.employees[storeId]=true;
  if(!_baState.features)_baState.features={};
  _baState.features[storeId]={..._baState.features[storeId],[lesson]:true};
  if(['service','group','personal'].includes(lesson))_baState.features[storeId].bookable=true;
  try{const rows=baProgress();rows[lesson+':'+storeId]=new Date().toISOString();localStorage.setItem('alliby_business_academy_v1_'+_baRun.user,JSON.stringify(rows));}catch{}
  businessAcademyTick();
}
function businessAcademyValidate(kind){
  if(businessAcademyActive()&&((kind==='product'&&(baItemLesson(_baRun.id)||baEditItemLesson(_baRun.id)))||kind===_baRun.id)){
    if(kind==='category'&&baEl('mc-id').value){showAdminToast('Для этого урока создайте новую категорию кнопкой «+ Добавить»');return false;}
    if(kind==='master_schedule'){
      const emp=(S._cachedEmps||[]).find(e=>e.id===baEl('master-emp-id').value);
      if(emp?.employee_store_id!==_baRun.storeId){showAdminToast('Выберите сотрудника своего заведения для этого урока');return false;}
    }
    const steps=baSteps(),invalid=steps.findIndex(step=>step.required&&!step.valid());
    if(invalid>=0){_baRun.index=invalid;businessAcademyTick();showAdminToast('Проверьте обязательные параметры урока');return false;}
    if(kind==='product'&&baEl('mmi-store').value!==_baRun.storeId){showAdminToast('Выберите заведение для этого урока');return false;}
    if(_baRun.id==='service'&&baEl('mmi-training-toggle').checked){showAdminToast('Для обычной услуги отключите «Тренировка»');return false;}
  }
  const checks=kind==='store'?[
    ['ms-name',()=>!!baEl('ms-name').value.trim(),'Укажите название заведения'],
    ['ms-dir',()=>!!baEl('ms-dir').value,'Выберите направление'],
  ]:kind==='product'?[
    ['mmi-store',()=>!!baEl('mmi-store').value,'Выберите заведение'],
    ['mmi-name',()=>!!baEl('mmi-name').value.trim(),'Укажите название позиции'],
    ['mmi-price',()=>isWholeRublePrice(baEl('mmi-price').value),'Укажите цену в целых рублях от нуля'],
  ]:[];
  for(const [id,valid,message] of checks)if(!valid()){showAdminToast(message);baEl(id).focus();return false;}
  return true;
}
for(const id of ['ms-name','ms-dir','mmi-store','mmi-name','mmi-item-type','mmi-price','emp-store','emp-name','emp-phone','emp-password']){
  baEl(id)?.setAttribute('aria-required','true');
  const label=baEl(id)?.closest('.fg')?.querySelector('label');
  if(label&&!label.textContent.includes('*'))label.append(document.createTextNode(' *'));
}
