/* Review 08, batch 1: isolated usability fixes over the existing synthetic model. */
'use strict';
const ui8={logDay:null,validationFrame:0,commentSuggestions:null,suggestionsError:false};

const manualPanelBase8=manualPanel;
manualPanel=function(){
 const choices=ui8.commentSuggestions?.[f4.task]||[],selected=ui5.manualDraft?.['manual-notes']||'';
 const suggestions=ui8.commentSuggestions?choices.length?`<div class="suggestions" role="group" aria-label="คำแนะนำรายละเอียดตามหัวข้อรอง">${choices.map(text=>button(text,'comment-suggestion','','',`type="button" data-text="${e5(text)}" aria-pressed="${selected===text}"`)).join('')}</div>`:'':`<p class="caption" role="status">${ui8.suggestionsError?'โหลดคำแนะนำเดิมไม่สำเร็จ กรุณาโหลดใหม่':'กำลังโหลดคำแนะนำตามหัวข้อรอง'}</p>`;
 return manualPanelBase8().replace(/<div class="suggestions">[\s\S]*?<\/div>/,suggestions);
};
const suggestionActionBase8=actions['comment-suggestion'];
actions['comment-suggestion']=button=>{
 suggestionActionBase8(button);
 $$('#manual4 .suggestions button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
};
fetch('/comment-suggestions.json',{cache:'no-store'}).then(response=>{
 if(!response.ok)throw Error('Suggestions unavailable');return response.json();
}).then(suggestions=>{ui8.commentSuggestions=suggestions;document.documentElement.dataset.suggestionsReady='true';})
 .catch(()=>{ui8.suggestionsError=true;})
 .finally(()=>{if(['record','new-log'].includes(state.route)&&state.recordMode==='manual'&&!$('#sheet').open){stashManual5();render();}});

// Form pickers are dialogs, not global toolbar menus anchored at the screen edge.
const taskPickerBase8=actions['task-picker'];
actions['task-picker']=button=>{
 taskPickerBase8(button);
 const dialog=$('#sheet');
 dialog.classList.remove('popover','menu6');
 dialog.classList.add('task-dialog8');
 for(const prop of ['top','left','right','bottom','max-height'])dialog.style.removeProperty(prop);
 $('[name="task-query"]')?.focus({preventScroll:true});
};
const sheetBase8=showSheet;
showSheet=function(...args){
 $('#sheet').classList.remove('task-dialog8','day-dialog8','room-dialog8');
 sheetBase8(...args);
};

// Even legacy whole-set templates require an explicit choice for every submission.
comboDialog=function(kind){
 f4.comboKind=kind;
 const tasks=selectedComboTasks(),template=f4.runningTemplate;
 showSheet(template?.kind==='combo'?template.name:kind==='software'?'ติดตั้งโปรแกรม':'เปิดใช้บัญชี',
  'ยังไม่ได้เลือกงาน เลือกเฉพาะรายการที่ทำจริง',
  `<fieldset class="combo-options8"><legend class="visually-hidden">งานที่ทำจริง</legend><div class="row between">${miniButton('เลือกทั้งหมด','combo-all','check')}${miniButton('ล้างการเลือก','combo-none')}</div>${tasks.map((task,i)=>`<label class="combo-item"><input type="checkbox" class="combo-check" value="${i}"><span><strong>${e5(task)}</strong></span></label>`).join('')}</fieldset><div class="recipient-field8">${field('ผู้รับบริการ *',input('combo-recipient','','text','required aria-describedby="combo-error" placeholder="ระบุผู้รับบริการ"'))}</div><div id="combo-error" class="field-error" role="alert"></div>`,
  button('ตรวจ 0 รายการ','combo-review','check','primary'));
};

function focusInvalid8(input,message,error){
 if(!input)return;
 input.setAttribute('aria-invalid','true');
 if(error){error.textContent=message;input.setAttribute('aria-describedby',error.id);}
 input.focus({preventScroll:true});
 input.scrollIntoView({block:'center',behavior:'instant'});
 if(error)error.scrollIntoView({block:'nearest',behavior:'instant'});
}
const comboReviewBase8=actions['combo-review'];
actions['combo-review']=button=>{
 const selected=$$('.combo-check:checked'),recipient=$('[name="combo-recipient"]'),error=$('#combo-error');
 if(!selected.length){error.textContent='เลือกอย่างน้อย 1 งาน';focusInvalid8($('.combo-check'),error.textContent,error);return;}
 if(!recipient.value.trim()){focusInvalid8(recipient,'ระบุผู้รับบริการก่อนตรวจรายการ',error);return;}
 comboReviewBase8(button);
};

// Student IDs remain strings so leading zeroes survive scanning and saving.
const studentIdPattern8=/^[0-9]{13}$/;
// Complete synthetic borrowed-device fixtures; never load real student records here.
state.devices.filter(device=>device.borrowed).forEach((device,index)=>{
 device.borrower8={studentId:String(index+1).padStart(13,'0'),date:f4.date,time:'09:00'};
});
function borrower8(device){return device?.borrower8||null;}
function studentIdError8(value){
 if(!value)return 'กรอกรหัสนักศึกษา 13 หลัก';
 if(/[^0-9]/.test(value))return 'ใช้เฉพาะตัวเลข 0–9 จำนวน 13 หลัก กรุณาตรวจภาษาแป้นพิมพ์';
 return value.length===13?'':`รหัสนักศึกษาต้องมี 13 หลัก (ขณะนี้ ${value.length} หลัก)`;
}
const equipmentPickerBase8=equipmentPicker;
equipmentPicker=function(type,location){
 equipmentPickerBase8(type,location);
 const input=$('#device-recipient');
 input.labels[0].textContent='รหัสนักศึกษา (ผู้รับบริการ) *';
 Object.assign(input,{type:'text',inputMode:'numeric',pattern:'[0-9]{13}',required:true,autocomplete:'off',spellcheck:false,placeholder:'ตัวเลข 13 หลัก'});
 input.setAttribute('autocapitalize','off');input.setAttribute('autocorrect','off');
 input.setAttribute('aria-describedby','student-id-help8 student-id-error8');
 input.insertAdjacentHTML('afterend','<small id="student-id-help8" class="caption">พิมพ์หรือสแกนรหัสนักศึกษา 13 หลัก ใช้ตัวเลข 0–9 เท่านั้น</small><p id="student-id-error8" class="field-error" role="alert"></p>');
 // Do not truncate or strip a bad scan into a different, apparently valid ID.
 input.addEventListener('input',event=>{
  if(event.isComposing)return;
  const error=$('#student-id-error8'),message=studentIdError8(input.value);
  if(studentIdPattern8.test(input.value)){error.textContent='';input.removeAttribute('aria-invalid');input.dataset.rejected8='';}
  else if(input.dataset.rejected8||/[^0-9]/.test(input.value)){
   error.textContent=message;input.setAttribute('aria-invalid','true');input.dataset.rejected8='true';
   if(document.activeElement===input)error.scrollIntoView({block:'nearest',behavior:'instant'});
  }
 });
};
const selectDeviceBase8=actions['select-device'];
actions['select-device']=button=>{
 selectDeviceBase8(button);
 const device=state.devices.find(item=>item.id===state.selectedDevice),input=$('#device-recipient');
 const stored=borrower8(device),returning=!!device?.borrowed;
 input.value=returning?(stored?.studentId||''):'';
 input.readOnly=returning;input.required=!returning;
 input.labels[0].textContent=returning?'รหัสผู้ยืม':'รหัสนักศึกษา (ผู้รับบริการ) *';
 $('#student-id-help8').textContent=returning?(stored?`จากรายการยืม ${thaiDate5(stored.date)} ${stored.time} · ไม่ต้องกรอกซ้ำ`:'ไม่พบข้อมูลผู้ยืม กรุณาตรวจประวัติอุปกรณ์'):'พิมพ์หรือสแกนรหัสนักศึกษา 13 หลัก ใช้ตัวเลข 0–9 เท่านั้น';
 $('#student-id-error8').textContent='';input.removeAttribute('aria-invalid');input.dataset.rejected8='';
};
const confirmDeviceBase8=actions['confirm-device'];
actions['confirm-device']=button=>{
 const input=$('#device-recipient'),device=state.devices.find(item=>item.id===state.selectedDevice);
 if(!device)return;
 if(device.borrowed){
  const stored=borrower8(device);
  if(!stored){toast('ไม่พบข้อมูลผู้ยืม กรุณาตรวจประวัติอุปกรณ์');return;}
  input.value=stored.studentId;confirmDeviceBase8(button);
  if($('[name="return-condition"]'))$('.sheet-body').insertAdjacentHTML('afterbegin',`<p class="detail-note">ผู้ยืม: <strong>${e5(stored.studentId)}</strong> · ${e5(stored.time)}</p>`);
  return;
 }
 if(!input||!studentIdPattern8.test(input.value)){
  if(input){input.dataset.rejected8='true';focusInvalid8(input,studentIdError8(input.value),$('#student-id-error8'));}
  return;
 }
 const studentId=input.value,count=state.logs.length;
 confirmDeviceBase8(button);
 if(device.borrowed&&state.logs.length===count+1)device.borrower8={studentId,date:f4.date,time:f4.time};
};
const finishReturnBase8=actions['finish-return'];
actions['finish-return']=button=>{
 const device=state.devices.find(item=>item.id===state.selectedDevice),stored=borrower8(device);
 if(!device?.borrowed||!stored||f4.recipient!==stored.studentId){toast('ข้อมูลผู้ยืมเปลี่ยนแล้ว กรุณาเปิดรายการคืนใหม่');return;}
 finishReturnBase8(button);
 if(!device.borrowed)delete device.borrower8;
};

const commentBase8=commentDialog;
commentDialog=function(task){
 commentBase8(task);
 const template=f4.runningTemplate;
 const recipient=$('[name="recipient"]'),detail=$('[name="detail"]');
 recipient.required=template?!!template.requireRecipient:true;
 detail.required=template?!!template.requireComment:true;
};
const commentSaveBase8=actions['comment-save'];
actions['comment-save']=button=>{
 const recipient=$('#comment4 [name="recipient"]');
 if(recipient?.required&&!recipient.value.trim()){
  let error=$('#recipient-error8');
  if(!error){error=document.createElement('p');error.id='recipient-error8';error.className='field-error';error.setAttribute('role','alert');recipient.after(error);}
  focusInvalid8(recipient,'ระบุผู้รับบริการก่อนตรวจรายการ',error);return;
 }
 commentSaveBase8(button);
};
document.addEventListener('invalid',event=>{
 const input=event.target;
 if(input.matches('#content input,#content textarea,#content select,#sheet input,#sheet textarea,#sheet select')){
  cancelAnimationFrame(ui8.validationFrame);
  ui8.validationFrame=requestAnimationFrame(()=>{
   const first=input.form?.querySelector(':invalid')||input;
   focusInvalid8(first);
  });
 }
},true);
document.addEventListener('input',event=>{
 const input=event.target;
 if(!input.matches('input,textarea,select'))return;
 if(input.id==='device-recipient')return;
 if(input.name==='manual-notes')$$('#manual4 .suggestions button').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.text===input.value)));
 if(input.value.trim()){
  input.removeAttribute('aria-invalid');
  const errorId=input.getAttribute('aria-describedby');
  if(['recipient-error8','combo-error'].includes(errorId))document.getElementById(errorId).textContent='';
 }
});
// When a virtual keyboard changes the visual viewport, keep the active field visible.
window.visualViewport?.addEventListener('resize',()=>{
 const input=document.activeElement,viewport=window.visualViewport;
 if(!input?.matches('#content input,#content textarea,#sheet input,#sheet textarea'))return;
 const rect=input.getBoundingClientRect();
 if(rect.bottom>viewport.offsetTop+viewport.height-16||rect.top<viewport.offsetTop+16)input.scrollIntoView({block:'center',behavior:'instant'});
});

function dayLogs8(){return filteredLogs().filter(log=>log.date===ui8.logDay);}
function showLogDay8(){
 const rows=dayLogs8();
 showSheet('งานวันที่ '+thaiDate5(ui8.logDay),`${rows.length} รายการ · ใช้ตัวกรองเดิม`,
  rows.length?`<div class="day-logs8">${rows.map(log=>`<button class="day-log8" data-action="day-log-detail8" data-id="${e5(log.id)}"><span class="event-time">${e5(log.time)}</span><span class="grow"><strong>${e5(log.task)}</strong><small>${e5(log.person)}${log.recipient?' · '+e5(log.recipient):''}</small><small>${e5(log.detail||'ไม่มีรายละเอียดเพิ่มเติม')}</small></span>${icon('chevron')}</button>`).join('')}</div>`:empty5('ไม่มีงานตรงกับตัวกรองในวันนี้','เลือกวันอื่น หรือปรับตัวกรองจากหน้าปฏิทิน'));
 $('#sheet').classList.add('day-dialog8');
}
actions['log-day5']=button=>{
 ui8.logDay=button.dataset.date;
 showLogDay8();
};
actions['day-log-detail8']=button=>{
 ui5.logId=button.dataset.id;
 showSheet('รายละเอียดงาน',thaiDate5(ui8.logDay),`${button8Back()}${logDetail5(ui5.logId)}`);
};
function button8Back(){return button('กลับไปงานในวันนี้','day-log-back8','back','link');}
actions['day-log-back8']=showLogDay8;

smartRoom=function(floor){
 f4.roomFloor=floor;
 showSheet(floor==='3'?'เลือกห้อง ชั้น 3':'เลือกห้อง ชั้น 4',
  'กดเปิดหรือปิดห้องเพื่อบันทึกทันที แล้วเลิกทำได้จากหน้าบันทึก',
  `<div class="device-picker room-picker8">${f4.rooms.filter(room=>room.floor===floor).map(room=>`<button class="device-option room-option8" data-action="room-instant7" data-room="${e5(room.id)}" data-expected="${room.inUse}">${icon('door')}<strong>ห้อง ${e5(room.id)}</strong>${tag(room.inUse?'เปิดอยู่':'ปิดอยู่',room.inUse?'blue':'')}<small>${e5(room.os)}</small><span class="room-command8">${room.inUse?'ปิดห้อง':'เปิดห้อง'}${icon('chevron')}</span></button>`).join('')}</div>`);
 $('#sheet').classList.add('room-dialog8');
};

const renderBase8=render;
render=function(...args){
 renderBase8(...args);
 document.title=currentRoute()[1]+' · labboy · Review 08 — ชุดแรก';
 document.documentElement.dataset.usabilityReady='8';
};
render();
