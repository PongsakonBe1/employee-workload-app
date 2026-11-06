/* Review 08 polish: synthetic UI only; existing production names and records stay intact. */
'use strict';
const uiC={background:'classic'};
const personLabelC=person=>person.displayName||person.name||person.nickname||person.fullName||'ไม่ระบุชื่อ';
const personDetailC=person=>{
 const meta=f4.userMeta?.find(user=>user.id===person.id);
 return person.fullName||meta?.fullName||'เจ้าหน้าที่ตัวอย่าง '+person.initial;
};
function backgroundOptionsC(){return `<fieldset class="background-options-c"><legend>พื้นหลังพื้นที่ทำงาน</legend><div class="background-choices-c">${[['classic','ฟ้า–เขียวเดิม','ชุดสีจากแอปเดิม ปรับตาม Light / Dark'],['ambient','สีละมุน','ฟ้า–ม่วงอ่อน ช่วยแยกชั้นควบคุม'],['plain','เรียบ','พื้นที่เรียบ อ่านข้อมูลได้เต็มที่']].map(([value,label,detail])=>`<button type="button" data-action="background-c" data-value="${value}" aria-pressed="${uiC.background===value}"><span class="background-sample-c ${value}" aria-hidden="true"></span><strong>${label}</strong><small>${detail}</small>${uiC.background===value?icon('check'):''}</button>`).join('')}</div><p class="caption">ตัวเลือกนี้ใช้ในรอบตรวจแบบปัจจุบัน ยังไม่บันทึกเป็นค่าบัญชีผู้ใช้</p></fieldset>`;}
function applyBackgroundC(){document.documentElement.dataset.background=uiC.background;}
actions['background-c']=button=>{
 uiC.background=button.dataset.value;applyBackgroundC();
 const group=button.closest('.background-options-c');if(group){const parent=group.parentElement;group.outerHTML=backgroundOptionsC();parent.querySelector(`[data-action="background-c"][data-value="${uiC.background}"]`)?.focus({preventScroll:true});}
};
const appearanceBeforeC=appearanceSheet;
appearanceSheet=function(){appearanceBeforeC();$('.sheet-body').insertAdjacentHTML('beforeend',backgroundOptionsC());};
actions.appearance=()=>appearanceSheet();
const settingsBeforeC=renderers.settings;
renderers.settings=function(){return settingsBeforeC()+(state.settingsTab==='appearance'?`<section class="panel background-settings-c">${backgroundOptionsC()}</section>`:'');};

// Display labels can contain an Admin-defined nickname. Selection remains ID-based.
function staffRowsC(query=''){
 const normalized=query.trim().toLocaleLowerCase('th-TH');
 const rows=people.filter(person=>[personLabelC(person),personDetailC(person),person.nickname||''].join(' ').toLocaleLowerCase('th-TH').includes(normalized));
 return rows.map(person=>`<button class="person-row-c" data-action="select-staff" data-id="${e5(person.id)}" aria-pressed="${person.id===state.staff}"><span class="avatar">${e5(person.initial)}</span><span class="grow"><strong>${e5(personLabelC(person))}</strong><small>${e5(personDetailC(person))}</small></span>${person.id===state.staff?icon('check'):''}</button>`).join('')||'<p class="empty-state">ไม่พบผู้ปฏิบัติงาน ลองค้นด้วยชื่อเต็มหรือชื่อเล่น</p>';
}
actions['staff-picker']=()=>{
 stashManual5();
 showSheet('ผู้ปฏิบัติงาน','ใช้ชื่อที่ Admin ตั้งไว้ ตรวจชื่อเต็มก่อนเลือก',`<label class="field staff-search-c"><span>ค้นหาชื่อหรือชื่อเล่น</span><input name="staff-search-c" type="search" autocomplete="off" placeholder="ชื่อที่ลงงาน ชื่อเต็ม หรือชื่อเล่น" aria-controls="staff-results-c"></label><div id="staff-results-c" class="person-list-c">${staffRowsC()}</div>`);
 $('[name="staff-search-c"]').focus({preventScroll:true});
};
document.addEventListener('input',event=>{if(event.target.name==='staff-search-c')$('#staff-results-c').innerHTML=staffRowsC(event.target.value);});

function enhanceStatusC(scope=document){
 scope.querySelectorAll('.room-option8').forEach(button=>{
  const room=f4.rooms.find(room=>room.id===button.dataset.room);if(!room)return;
  button.dataset.statusC=room.inUse?'open':'closed';
  const badge=button.querySelector('.tag');if(badge){badge.className='tag '+(room.inUse?'green':'');badge.innerHTML=icon(room.inUse?'check':'moon')+`<span>${room.inUse?'เปิดอยู่':'ปิดอยู่'}</span>`;}
 });
 scope.querySelectorAll('[data-action="select-device"]').forEach(button=>{
  const device=state.devices.find(device=>device.id===button.dataset.id);if(!device)return;
  const unavailable=!device.borrowed&&device.condition!=='normal';
  button.dataset.statusC=unavailable?'unavailable':device.borrowed?'borrowed':'ready';
  const badge=button.querySelector('.tag');
  if(badge){badge.className='tag '+(unavailable?'red':device.borrowed?'blue':'green');badge.innerHTML=icon(unavailable?'shield':device.borrowed?'clock':'check')+`<span>${unavailable?'ไม่พร้อมใช้':device.borrowed?'กำลังยืม':'พร้อมยืม'}</span>`;}
  let command=button.querySelector('.device-intent-c');if(!command){command=document.createElement('span');command.className='device-intent-c';button.append(command);}
  command.textContent=unavailable?'ตรวจสภาพก่อนใช้':device.borrowed?'คืนรายการนี้':'ยืมรายการนี้';
 });
}
function enhanceFormsC(scope=document){
 scope.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea').forEach(control=>control.classList.add('form-control-c'));
 scope.querySelectorAll('input[type=checkbox]').forEach(control=>control.classList.add('checkbox-c'));
 scope.querySelectorAll('input[type=checkbox]').forEach(control=>control.closest('label')?.classList.add('check-row-c'));
 scope.querySelectorAll('form').forEach(form=>form.classList.add('grouped-form-c'));
}
const templateBeforeC=templateEditor;
templateEditor=function(id){
 templateBeforeC(id);
 const form=$('#template4'),labels=[...form.children].filter(child=>child.matches('label.field')),checks=[...form.children].filter(child=>child.matches('label.row'));
 const section=(title,description)=>{const group=document.createElement('fieldset');group.className='form-section-c';const legend=document.createElement('legend');legend.textContent=title;group.append(legend);if(description){const help=document.createElement('p');help.className='form-help-c';help.textContent=description;group.append(help);}return group;};
 const identity=section('ข้อมูลเทมเพลต','ตั้งชื่อให้ทีมรู้ว่างานนี้ใช้ทำอะไร');form.prepend(identity);labels.forEach(label=>identity.append(label));
 const caption=form.querySelector(':scope > .caption');if(caption)identity.append(caption);
 const conditions=section('เงื่อนไขการบันทึก','ผู้ใช้เลือกเฉพาะงานที่ทำจริงก่อนบันทึกทุกครั้ง');form.append(conditions);
 checks.forEach(label=>conditions.append(label));
 const legacy=$('[name="tpl-checkbox"]');if(legacy){legacy.closest('label').hidden=true;legacy.checked=true;}
 const items=section('รายการงานในชุด','ใช้กับ Combo เพิ่มรายการที่ต้องทำร่วมกันได้');form.append(items);items.append($('#template-items4'),$('[data-action="tpl-add-item"]'));
 const updateItems=()=>{items.hidden=$('[name="tpl-kind"]').value!=='combo';};updateItems();$('[name="tpl-kind"]').addEventListener('change',updateItems);
 const error=$('#template-error4');form.append(error);error.setAttribute('role','alert');
 $('#sheet').classList.add('form-dialog-c');enhanceFormsC(form);
};
const addItemBeforeC=actions['tpl-add-item'],removeItemBeforeC=actions['tpl-remove-item'];
actions['tpl-add-item']=button=>{addItemBeforeC(button);enhanceFormsC($('#template4'));$('[name="tpl-item-'+(f4.templateDraft.length-1)+'"]')?.focus();};
actions['tpl-remove-item']=button=>{removeItemBeforeC(button);enhanceFormsC($('#template4'));};

function enhancePolishC(scope=document){
 enhanceStatusC(scope);enhanceFormsC(scope);applyBackgroundC();
 const current=$('.record-panel-title .staff-picker strong');if(current)current.textContent=personLabelC(currentPerson());
}
const sheetBeforeC=showSheet;
showSheet=function(...args){$('#sheet').classList.remove('form-dialog-c');sheetBeforeC(...args);enhancePolishC($('#sheet'));};
const selectDeviceBeforeC=actions['select-device'];
actions['select-device']=button=>{selectDeviceBeforeC(button);enhanceStatusC($('#sheet'));};
const renderBeforeC=render;
render=function(...args){renderBeforeC(...args);enhancePolishC();document.title=currentRoute()[1]+' · labboy · Review 08 — เก็บรายละเอียด';document.documentElement.dataset.polishCReady='true';};
// Theme changes rebuild navigation without invoking render.
const headerBeforeC=header;
header=function(...args){headerBeforeC(...args);enhancePolishC();};
render();
