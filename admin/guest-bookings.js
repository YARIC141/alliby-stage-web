/* Business entries for people without an Alliby account. Availability and writes are server-checked. */
let _guestBooking=null,_guestBookingSeq=0,_guestBookingSlotSeq=0;
const gbEl=id=>document.getElementById('gb-'+id);
const bookingClient=(booking,profiles)=>profiles[booking.user_id]||(booking.guest_name?{full_name:booking.guest_name,phone:booking.guest_phone}:null);
async function openGuestBooking(){
  const storeId=document.getElementById('bk-store-filter')?.value;
  if(!storeId){showAdminToast('Сначала выберите заведение');return;}
  const user=S.session?.user?.id;if(!user)return;
  const seq=++_guestBookingSeq;
  _guestBooking={storeId,user,requestId:crypto.randomUUID(),busy:false};
  document.getElementById('guest-booking-form').reset();gbEl('error').textContent='Загрузка услуг…';gbEl('save').disabled=true;
  gbEl('item').innerHTML='<option value="">Загрузка…</option>';gbEl('slot').innerHTML='';gbEl('master').innerHTML='';
  const store=(S.stores||[]).find(s=>s.id===storeId),today=new Intl.DateTimeFormat('en-CA',{timeZone:store?.timezone||'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  gbEl('date').min=today;gbEl('date').value=_bkTab.openDate&&_bkTab.openDate>=today?_bkTab.openDate:today;
  openModal('m-guest-booking');
  try{
    const items=await _reqNet(`/rest/v1/menu_items?store_id=eq.${storeId}&item_type=eq.service&is_available=eq.true&select=id,name&order=name.asc`);
    if(seq!==_guestBookingSeq||S.session?.user?.id!==user)return;
    gbEl('item').innerHTML=items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('');
    if(!items.length){gbEl('error').textContent='Добавьте доступную услугу или тренировку в товары и услуги.';return;}
    await guestBookingItemChanged();
  }catch(e){if(seq===_guestBookingSeq)gbEl('error').textContent=e.message||'Не удалось загрузить услуги';}
}
async function guestBookingItemChanged(){
  const state=_guestBooking,itemId=gbEl('item').value,seq=++_guestBookingSeq;++_guestBookingSlotSeq;if(!state||!itemId)return;
  state.masterReady=false;
  gbEl('save').disabled=true;gbEl('slot').innerHTML='';gbEl('master').innerHTML='';gbEl('error').textContent='Загрузка сотрудников…';
  try{
    const links=await _reqNet(`/rest/v1/master_services?service_id=eq.${itemId}&select=master_id`);
    const ids=links.map(x=>x.master_id);
    const masters=ids.length?await _reqNet(`/rest/v1/profiles?id=in.(${ids.join(',')})&employee_store_id=eq.${state.storeId}&is_master=eq.true&select=id,full_name&order=full_name.asc`):[];
    if(seq!==_guestBookingSeq||S.session?.user?.id!==state.user)return;
    gbEl('master').innerHTML=masters.length?masters.map(m=>`<option value="${esc(m.id)}">${esc(m.full_name||'Сотрудник')}</option>`).join(''):'<option value="">Без сотрудника</option>';
    state.masterReady=true;
    await guestBookingLoadSlots();
  }catch(e){if(seq===_guestBookingSeq)gbEl('error').textContent=e.message||'Не удалось загрузить сотрудников';}
}
async function guestBookingLoadSlots(){
  const state=_guestBooking,itemId=gbEl('item').value,date=gbEl('date').value,masterId=gbEl('master').value||null,seq=++_guestBookingSlotSeq;
  gbEl('save').disabled=true;gbEl('slot').innerHTML='';if(!state||!state.masterReady||!itemId||!date)return;
  gbEl('error').textContent='Проверяем свободное время…';
  try{
    const slots=await _reqNet('/rest/v1/rpc/business_guest_booking_slots',{method:'POST',body:JSON.stringify({p_item_id:itemId,p_date:date,p_master_id:masterId})});
    if(seq!==_guestBookingSlotSeq||_guestBooking!==state||S.session?.user?.id!==state.user)return;
    gbEl('slot').innerHTML=slots.map(s=>`<option value="${esc(s.slot_start)}">${esc(s.slot_start.slice(0,5))}–${esc(s.slot_end.slice(0,5))} · ${Number(s.price)} ₽ · мест: ${Number(s.remaining)}</option>`).join('');
    gbEl('error').textContent=slots.length?'':'Свободного времени нет. Проверьте дату, расписание заведения и сотрудника.';
    gbEl('save').disabled=!slots.length||state.busy;
  }catch(e){if(seq===_guestBookingSlotSeq&&_guestBooking===state)gbEl('error').textContent=e.message||'Не удалось проверить время';}
}
async function saveGuestBooking(event){
  event.preventDefault();const state=_guestBooking;if(!state||state.busy||S.session?.user?.id!==state.user)return;
  if(!document.getElementById('guest-booking-form').reportValidity())return;
  const body={p_item_id:gbEl('item').value,p_date:gbEl('date').value,p_start:gbEl('slot').value,p_master_id:gbEl('master').value||null,p_name:gbEl('name').value.trim(),p_phone:gbEl('phone').value,p_request_id:state.requestId};
  if(!body.p_start)return;
  const signature=JSON.stringify({...body,p_request_id:null});
  if(state.signature&&state.signature!==signature)body.p_request_id=state.requestId=crypto.randomUUID();
  state.signature=signature;state.busy=true;gbEl('save').disabled=true;gbEl('error').textContent='';
  try{
    await _reqNet('/rest/v1/rpc/business_create_guest_booking',{method:'POST',body:JSON.stringify(body)});
    if(S.session?.user?.id!==state.user)return;
    closeModal('m-guest-booking');showAdminToast('Клиент записан. Оплату можно подтвердить в деталях записи.');
    if(_bkTab.storeId===state.storeId)onBkTabDayClick(body.p_date);
  }catch(e){if(S.session?.user?.id===state.user){gbEl('error').textContent=e.message||'Не удалось сохранить запись. Повторите запрос';}}
  finally{state.busy=false;if(_guestBooking===state)gbEl('save').disabled=!gbEl('slot').value;}
}
