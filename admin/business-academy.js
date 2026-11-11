/* Guided setup of the owner's real business. No alternate records or write API. */
const BUSINESS_ACADEMY_LESSONS=[
  {id:'store',title:'Создай своё заведение',text:'Проверьте статус продавца, укажите название, направление и адрес своего заведения.'},
  {id:'product',title:'Добавь первую позицию',text:'Создайте настоящий товар, услугу или аренду: выберите заведение, название, тип и цену.'},
  {id:'information',title:'Заполни информацию о заведении',text:'Добавьте телефон и часы работы, чтобы клиентам было проще связаться с вами.'},
  {id:'employee',title:'Добавь сотрудника',text:'Создайте доступ для реального сотрудника и посмотрите его логин.'},
];
let _baState={user:null,known:false,stores:[],items:{},employees:{},selected:'',error:''};
let _baRun=null,_baCheck=null,_baTimer=null;
const businessAcademyActive=()=>!!_baRun&&_baRun.user===S.session?.user?.id;
const baEl=id=>document.getElementById(id);
const baStore=()=>_baState.stores.find(s=>s.id===_baState.selected);
function baProgress(){try{return JSON.parse(localStorage.getItem('alliby_business_academy_v1_'+S.session?.user?.id)||'{}');}catch{return {};}}
function baDone(id){
  const store=baStore();if(id==='store')return !!store;
  if(!store)return false;
  if(id==='product')return _baState.items[store.id]===true;
  if(id==='employee')return _baState.employees[store.id]===true;
  return !!(store.phone&&store.working_hours)||!!baProgress()['information:'+store.id];
}
function businessAcademyReset(){
  businessAcademyStop();_baState={user:null,known:false,stores:[],items:{},employees:{},selected:'',error:''};_baCheck=null;
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
      _baState={user,known:true,stores,items:Object.fromEntries(counts),employees:_baState.user===user?_baState.employees:{},selected,error:''};
      if(selected)try{
        const rows=await _reqNet(`/rest/v1/profiles?role=eq.employee&employee_store_id=eq.${selected}&select=id&limit=1`);
        if(S.session?.user?.id===user&&_baCheck===request)_baState.employees[selected]=rows.length>0;
      }catch{}
    }catch(e){if(S.session?.user?.id===user&&_baCheck===request)_baState.error='Не удалось проверить данные. Проверьте соединение с сервером и повторите.';}
    finally{
      if(_baCheck===request){_baCheck=null;businessAcademyRender();businessAcademyOffer(_curScreen);}
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
    <div class="ba-tasks">${BUSINESS_ACADEMY_LESSONS.map(l=>`<button type="button" class="ba-task" data-ba-lesson="${l.id}" onclick="businessAcademyStart(this.dataset.baLesson)"><span class="ba-number"></span><span><strong>${esc(l.title)}</strong><small>${esc(l.text)}</small><small class="ba-task-status"></small></span></button>`).join('')}</div>
    <p class="ba-note">Можно остановить подсказки в любой момент. Уже сохранённые товары, сотрудники и сведения останутся в вашем аккаунте.</p>`;
  baEl('ba-status').textContent=S.profile?.role==='employee'?'Академия настройки доступна владельцу заведения.':_baState.error||(!known?'Проверяем заведения и каталог…':'Обязательные поля отмечены звёздочкой. Подсказки объяснят, что в них указать.');
  baEl('ba-retry').hidden=!_baState.error;
  const select=baEl('ba-store-select'),options=_baState.stores.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  if(select.innerHTML!==options)select.innerHTML=options;
  select.value=_baState.selected;select.hidden=!known||!_baState.stores.length;baEl('ba-store-label').hidden=select.hidden;
  BUSINESS_ACADEMY_LESSONS.forEach((lesson,i)=>{
    const button=root.querySelector(`[data-ba-lesson="${lesson.id}"]`),disabled=!known||(!baStore()&&lesson.id!=='store')||(lesson.id==='store'&&!!baStore()),done=known&&baDone(lesson.id),badge=button.querySelector('.ba-number');
    button.disabled=disabled;badge.textContent=done?'✓':i+1;badge.classList.toggle('done',!!done);
    button.querySelector('.ba-task-status').textContent=done?(lesson.id==='store'?'Заведение уже создано':'Уже настроено · можно посмотреть'):disabled?'Сначала создайте заведение':'Начать с подсказками';
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
  for(const id of ['m-store','m-mi','m-add-employee','m-seller-verify','m-addr-pick']){
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
  if(id==='store'&&store){showAdminToast('Заведение уже создано. Выберите урок заполнения информации.');return;}
  businessAcademyStop();closeTour();
  _baRun={id,user:S.session.user.id,storeId:store?.id||null,index:0,saved:false,wrapped:baWrapModals()};
  document.documentElement.classList.add('business-academy-mode');baEl('ba-guide').hidden=false;
  if(id==='product'){
    baEl('mi-store-filter').value=store.id;baEl('mi-cat-filter').value='';baEl('mi-search').value='';_adminMenuTab='items';goTo('menu');
  }else if(id==='employee')goTo('employees');else {goTo('stores');if(store){const full=S.stores.find(s=>s.id===store.id);if(full)openStoreModal(full);}}
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
  if(run.id==='store')return [
    baField('ms-name','Обязательно: укажите настоящее название заведения. Оно будет отображаться у клиентов.'),
    baField('ms-dir','Обязательно: выберите направление вашего бизнеса. От него зависят доступные товары и услуги.'),
    {selector:'button[onclick="openStoreAddrPicker()"]',text:'Укажите адрес и точку на карте, чтобы клиенты могли найти заведение. Это рекомендуемый шаг.',valid:()=>true,required:false},
    baField('ms-sc','Категория помогает клиентам найти заведение. Выберите подходящую или продолжите без категории.',()=>true,false),
  ];
  if(run.id==='product'){
    const steps=[
      baField('mmi-store','Обязательно: выберите своё заведение. Позиция попадёт именно в его каталог.'),
      baField('mmi-name','Обязательно: напишите понятное название товара или услуги.'),
      baField('mmi-item-type','Обязательно: выберите тип — товар, услуга или аренда. Поля ниже изменятся в зависимости от типа.'),
      baField('mmi-price','Обязательно: укажите цену в рублях — число от нуля. Нулевая цена допустима.',()=>baEl('mmi-price').value.trim()!==''&&Number.isFinite(Number(baEl('mmi-price').value))&&Number(baEl('mmi-price').value)>=0),
    ];
    if(baEl('mmi-item-type').value==='service')steps.push(baField('mmi-duration','Для записи на услугу укажите длительность в минутах. Проверьте параметры записи и расписание.',()=>true,false));
    if(baEl('mmi-item-type').value==='rental')steps.push(baField('mmi-total-qty','Для аренды настройте количество, единицу и шаг периода. Доступный остаток не должен превышать общее количество.',()=>true,false));
    if(baEl('mmi-training-toggle').checked){
      steps.push(baField('mmi-max-group-size','Для тренировки обязательно укажите максимальное число участников — не меньше одного.',()=>Number(baEl('mmi-max-group-size').value)>=1));
      steps.push({selector:'#mmi-training-schedule-list',text:'Для тренировки обязательно выберите дни и время. Для персональной записи задайте начало и конец доступного диапазона.',valid:()=>!_getTrainingErrors(),required:true});
    }
    if(baEl('mmi-discount-toggle').checked)steps.push(baField('mmi-old-price','При включённой скидке обязательна прежняя цена — она должна быть больше текущей.',()=>Number(baEl('mmi-old-price').value)>Number(baEl('mmi-price').value)));
    steps.push(baField('mmi-desc','Описание, категория и фотография не обязательны, но помогают клиенту выбрать. Добавляйте данные своего товара.',()=>true,false));
    return steps;
  }
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
  let target,message,next=false;
  if(run.saved){
    target=visible(run.id==='product'?'#mi-list':run.id==='employee'?'#emp-list':'#stores-list');
    message=run.id==='employee'?'Сотрудник создан в вашем заведении. Посмотрите его логин в списке и передайте сотруднику логин и заданный пароль.':run.id==='product'?'Позиция сохранена в каталоге вашего заведения. Проверьте её название, цену и доступность.':'Сведения сохранены в вашем аккаунте. Проверьте карточку заведения.';next=true;
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
    const modal=run.id==='product'?'m-mi':run.id==='employee'?'m-add-employee':'m-store';
    if(visible('#'+modal+'.open')){
      const steps=baSteps(),step=steps[run.index];
      if(step){target=visible('#'+modal+' '+step.selector);message=step.text;next=true;}
      else {target=visible(run.id==='product'?'#mmi-save-btn':run.id==='employee'?'#m-add-employee button[onclick="saveEmployee()"]':'#ms-save-btn');message='Проверьте введённые данные и нажмите «Сохранить». Это реальное сохранение в вашем аккаунте. При ошибке исправьте отмеченные поля и повторите.';}
    }else{
      if(run.id==='product')target=visible('#menu-add-btn');
      else if(run.id==='employee')target=visible('button[onclick="openAddEmployeeModal()"]');
      else if(run.id==='store'&&!_baState.stores.length)target=visible('#screen-stores button[onclick="openStoreModal()"]');
      else target=visible('#stores-list .card[onclick]');
      message=run.id==='product'?'Нажмите «+ Добавить», чтобы создать позицию в каталоге своего заведения.':run.id==='employee'?'Нажмите «Добавить сотрудника». Будет создан настоящий доступ к вашему заведению.':run.id==='store'&&!_baState.stores.length?'Нажмите «+ Добавить». Сначала Business проверит статус продавца, затем откроет карточку заведения.':'Откройте карточку своего заведения для заполнения информации.';
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
  if(!run||_baRun!==run||!businessAcademyActive()||_baRun.id!==kind)return;
  if(!storeId)return;
  if(kind!=='store'&&storeId!==_baRun.storeId)return;
  _baRun.saved=true;
  if(kind==='store'){_baState.stores=_baState.stores.filter(s=>s.id!==storeId).concat({id:storeId,...details});_baState.selected=storeId;}
  if(kind==='information')_baState.stores=_baState.stores.map(s=>s.id===storeId?{...s,...details}:s);
  if(kind==='product')_baState.items[storeId]=true;
  if(kind==='employee')_baState.employees[storeId]=true;
  try{const rows=baProgress();rows[kind+':'+storeId]=new Date().toISOString();localStorage.setItem('alliby_business_academy_v1_'+_baRun.user,JSON.stringify(rows));}catch{}
  businessAcademyTick();businessAcademyRefresh();
}
function businessAcademyValidate(kind){
  const checks=kind==='store'?[
    ['ms-name',()=>!!baEl('ms-name').value.trim(),'Укажите название заведения'],
    ['ms-dir',()=>!!baEl('ms-dir').value,'Выберите направление'],
  ]:kind==='product'?[
    ['mmi-store',()=>!!baEl('mmi-store').value,'Выберите заведение'],
    ['mmi-name',()=>!!baEl('mmi-name').value.trim(),'Укажите название позиции'],
    ['mmi-price',()=>baEl('mmi-price').value.trim()!==''&&Number.isFinite(Number(baEl('mmi-price').value))&&Number(baEl('mmi-price').value)>=0,'Укажите цену от нуля'],
  ]:[];
  for(const [id,valid,message] of checks)if(!valid()){showAdminToast(message);baEl(id).focus();return false;}
  return true;
}
for(const id of ['ms-name','ms-dir','mmi-store','mmi-name','mmi-item-type','mmi-price','emp-store','emp-name','emp-phone','emp-password']){
  baEl(id)?.setAttribute('aria-required','true');
  const label=baEl(id)?.closest('.fg')?.querySelector('label');
  if(label&&!label.textContent.includes('*'))label.append(document.createTextNode(' *'));
}
