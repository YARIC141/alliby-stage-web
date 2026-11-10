/* Device-only Academy simulator. Never creates an auth session or real records. */
const ACADEMY_GUEST_ID = 'aca00000-0000-4000-8000-000000000000';
const ACADEMY_GUEST_KEY = 'alliby_academy_guest_v1';
const academyUser = () => S.session?.user?.id || ACADEMY_GUEST_ID;
function academyGuestRows() {
  try {
    const rows=JSON.parse(localStorage.getItem(ACADEMY_GUEST_KEY)||'[]');
    return Array.isArray(rows)?rows.filter(r=>ACADEMY_DATA.lessons.some(l=>l.id===r.lesson_id)):[];
  } catch { return []; }
}
function academyGuestCommand(lessonId,action,payload={},run=null) {
  if(S.session?.user?.id)throw new Error('Гостевое прохождение закрыто');
  const lesson=ACADEMY_DATA.lessons.find(l=>l.id===lessonId);
  if(!lesson)throw new Error('Задание не найдено');
  const rows=academyGuestRows(),now=new Date().toISOString();
  let row=rows.find(r=>r.lesson_id===lessonId);
  const check=(ok,message)=>{if(!ok)throw new Error(message);};
  if(action==='start') {
    if(!row||payload.restart||row.operation?.academy_finished_at)row={user_id:ACADEMY_GUEST_ID,lesson_id:lessonId,run_id:crypto.randomUUID(),steps:{},visited:false,compared:false,location:null,operation:null,actor_index:0,observed_index:-1,completed_at:row?.completed_at||null};
  } else {
    check(row&&row.run_id===run,'Откройте актуальное прохождение задания');
    if(action==='step') {
      check(lesson.required_steps.includes(payload.name),'Неизвестный шаг сценария');
      row.steps[payload.name]=true;
    } else if(action==='visit') {
      check(payload.store_id===lesson.store_id,'Откройте нужное заведение');row.visited=true;
    } else if(action==='compare') {
      check(lessonId==='compare_purchase'&&row.visited&&payload.viewed&&JSON.stringify(payload.item_ids)===JSON.stringify(lesson.item_ids),'Откройте сравнение двух дрелей');row.compared=true;
    } else if(action==='location') {
      check(lessonId==='delivery'&&payload.source==='map'&&Number.isFinite(payload.lat)&&Math.abs(payload.lat)<=85.1&&Number.isFinite(payload.lng)&&Math.abs(payload.lng)<=180,'Подтвердите положение на карте');
      row.location={lat:payload.lat,lng:payload.lng,address:String(payload.address||'Точка на карте').slice(0,300)};
    } else if(action==='create') {
      if(row.operation)return structuredClone(row);
      check(row.visited&&lesson.required_steps.every(s=>row.steps[s])&&(lessonId!=='compare_purchase'||row.compared),'Сначала выполните шаги задания');
      check(payload.store_id===lesson.store_id,'Откройте нужное заведение');
      const op={id:crypto.randomUUID(),user_id:ACADEMY_GUEST_ID,store_id:lesson.store_id,kind:lesson.kind,is_academy:true,order_time:now,created_at:now,payment_status:'paid',payment_method:'card'};
      if(lesson.kind==='order') {
        check(Array.isArray(payload.items)&&payload.items.length>=1&&payload.items.length<=2,'Выберите товар задания');
        op.order_items=payload.items.map(i=>{
          check(Object.hasOwn(lesson.prices,i.menu_item_id)&&Number.isInteger(i.quantity)&&i.quantity>=1&&i.quantity<=10,'Неверная позиция или количество');
          return {menu_item_id:i.menu_item_id,quantity:i.quantity,price_at_time:lesson.prices[i.menu_item_id],selected_options:[]};
        });
        check(lessonId!=='compare_purchase'||(payload.items.length===1&&!payload.is_delivery),'Выберите одну дрель и самовывоз');
        check(lessonId!=='delivery'||(row.location&&payload.is_delivery),'Выберите доставку и подтвердите положение на карте');
        Object.assign(op,{is_delivery:lessonId==='delivery',delivery_fee:lessonId==='delivery'?100:0,delivery_address:row.location?.address||null,delivery_lat:row.location?.lat??null,delivery_lng:row.location?.lng??null});
        op.total_amount=op.order_items.reduce((sum,i)=>sum+i.price_at_time*i.quantity,op.delivery_fee);
      } else if(lesson.kind==='rent') {
        const start=Date.parse(payload.start_at),end=Date.parse(payload.end_at),qty=payload.quantity;
        check(payload.item_id===lesson.item_ids[0]&&Number.isInteger(qty)&&qty>=1&&qty<=3&&Number.isFinite(start)&&Number.isFinite(end)&&start>=Date.now()-300000&&end>start&&end-start<=31*86400000,'Выберите корректный будущий период аренды');
        check(lessonId!=='vr_session'||qty===2,'Для задания выберите два игровых места');
        Object.assign(op,{item_id:payload.item_id,quantity:qty,start_at:payload.start_at,end_at:payload.end_at,total_price:lesson.prices[payload.item_id]*qty*Math.ceil((end-start)/(lesson.rent_unit==='day'?86400000:3600000))});
      } else {
        const master=['group_training','home_training'].includes(lessonId)?lesson.master_ids[0]:payload.master_id;
        const start=payload.preferred_start||payload.slot_start,end=payload.preferred_end||payload.slot_end;
        const minutes=t=>/^\d{2}:\d{2}(:\d{2})?$/.test(t||'')?Number(t.slice(0,2))*60+Number(t.slice(3,5)):NaN;
        const duration=Date.parse(payload.slot_date+'T12:00:00')-Date.parse(todayInCity()+'T12:00:00');
        check(payload.menu_item_id===lesson.item_ids[0]&&lesson.master_ids.includes(master)&&Number.isFinite(duration)&&duration>=0&&duration<=90*86400000&&minutes(start)>=540&&minutes(end)<=1260&&minutes(end)-minutes(start)>=45,'Выберите мастера, дату и время занятия');
        check(!['group_training','home_training'].includes(lessonId)||[840,1140].includes(minutes(start)),'Выберите занятие по расписанию');
        const finish=_minToTime(minutes(start)+45)+':00';
        Object.assign(op,{menu_item_id:payload.menu_item_id,master_id:master,slot_date:payload.slot_date,total_price:lesson.prices[payload.menu_item_id],slot_start:lessonId==='personal_group'?null:start,slot_end:lessonId==='personal_group'?null:finish,preferred_start:lessonId==='personal_group'?start:null,preferred_end:lessonId==='personal_group'?end:null});
        if(lessonId==='personal_group')op.payment_status='unpaid';
      }
      op.status=lesson.actors[0].status;op.history=[{...lesson.actors[0],at:now,index:0}];
      row.operation=op;row.actor_index=0;row.observed_index=-1;
    } else if(action==='observe') {
      check(row.operation&&payload.record_id===row.operation.id&&payload.index===row.actor_index,'Откройте актуальные детали операции');row.observed_index=row.actor_index;
    } else if(action==='advance') {
      check(row.operation&&row.observed_index===row.actor_index&&row.actor_index<lesson.actors.length-1,'Сначала посмотрите текущий статус');
      const actor=lesson.actors[++row.actor_index];row.operation.status=actor.status;
      row.operation.history.push({...actor,at:now,index:row.actor_index});
      if(lessonId==='delivery'&&row.actor_index>=3)row.operation.courier_name='Иван';
      if(lessonId==='personal_group'&&row.actor_index===1)Object.assign(row.operation,{slot_start:row.operation.preferred_start,slot_end:_minToTime(_timeToMin(row.operation.preferred_start)+45)+':00',total_price:800,payment_status:'paid'});
    } else if(action==='finish') {
      check(row.operation&&row.observed_index===row.actor_index&&row.actor_index===lesson.actors.length-1,'Посмотрите все изменения и итоговые детали');
      row.completed_at ||= now;row.operation.academy_finished_at=now;
    } else throw new Error('Неизвестное действие Академии');
  }
  row.updated_at=now;
  localStorage.setItem(ACADEMY_GUEST_KEY,JSON.stringify(rows.filter(r=>r.lesson_id!==lessonId).concat(row)));
  return structuredClone(row);
}
