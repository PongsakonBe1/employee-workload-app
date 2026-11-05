/* Batch B: one date-only calendar model for schedule views and public holidays. */
'use strict';
const uiB={holidays:null,holidayError:false,publicHolidays:true,observances:false,detailDay:null,today:CalendarB.todayBangkok()};
const calKindB={classroom:'ตารางเรียน',dl:'Digital Literacy',exam:'สอบรายวิชา'};
const calendarDayB=date=>weekDays6[CalendarB.weekday(date)];
const scheduleModeB=()=>ui6.scheduleMode||(narrow5()?'day':'week');
const scheduleRangeB=()=>CalendarB.range(ui6.scheduleDate,scheduleModeB());
const holidayOptionsB=()=>({public:uiB.publicHolidays,observance:uiB.observances});
const holidaysB=date=>CalendarB.holidaysOn(uiB.holidays?.events||[],date,holidayOptionsB());
function holidayBannerB(date){const rows=holidaysB(date);return rows.length?`<div class="holiday-day-b" aria-label="วันหยุดและวันสำคัญ">${rows.map(row=>`<span data-holiday-kind="${row.kind}">${icon(row.kind==='public'?'calendar':'sun')}<span>${e5(row.title)}<small>${row.kind==='public'?'วันหยุดนักขัตฤกษ์':'วันสำคัญ'} · Google ประเทศไทย</small></span></span>`).join('')}</div>`:'';}
function holidaySourceB(year){
 const label=uiB.holidayError?'โหลดข้อมูลวันหยุดไม่ได้':!uiB.holidays?'กำลังโหลดวันหยุด':!uiB.holidays.coverageYears.includes(year)?'ไม่มีข้อมูลวันหยุดปีนี้':uiB.publicHolidays?'วันหยุดไทยเปิดอยู่':'วันหยุดไทยปิดอยู่';
 return `<button class="calendar-source-b" data-action="holiday-options-b">${icon('calendar')}<span>${label}${uiB.observances?' · รวมวันสำคัญ':''}</span>${icon('down')}</button>`;
}
async function loadHolidaysB(){
 try{const response=await fetch('/holidays.json',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');const data=await response.json();if(!Array.isArray(data.events)||!Array.isArray(data.coverageYears))throw Error('Invalid data');uiB.holidays=data;uiB.holidayError=false;}
 catch{uiB.holidayError=true;}
 document.documentElement.dataset.calendarReady='true';
 if(!$('#sheet').open){stashManual5();render();}
}
function scheduleRowsB(range=scheduleRangeB()){
 const rows=[];
 for(const date of CalendarB.dates(range.start,range.end)){
  for(const row of f4.classes){
   if(row.active&&row.semester===f4.semester&&row.day===calendarDayB(date)&&(!row.validFrom||row.validFrom<=date)&&(!row.validTo||row.validTo>=date))rows.push({...row,date,kind:'classroom',title:row.subject});
  }
 }
 rows.push(...state.exams.filter(row=>row.active!==false&&row.date>=range.start&&row.date<=range.end).map(row=>({...row,kind:'dl',day:calendarDayB(row.date),start:row.time.split('–')[0],end:row.time.split('–')[1],room:row.rooms,title:'สอบ Digital Literacy',teacher:row.proctors.join(', ')})));
 rows.push(...(ui5.examImports||[]).filter(row=>row.date>=range.start&&row.date<=range.end).map(row=>({...row,kind:'exam',day:calendarDayB(row.date),title:row.subject})));
 return rows.filter(row=>(ui6.scheduleKind==='all'||row.kind===ui6.scheduleKind)&&(state.room==='ทั้งหมด'||row.room.split(/\s*\+\s*/).includes(state.room))).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.title.localeCompare(b.title));
}
scheduleRows6=scheduleRowsB;
const occurrenceAttrsB=row=>`data-action="schedule-detail-b" data-id="${e5(row.id)}" data-date="${row.date}" data-kind="${row.kind}"`;
function scheduleAgendaB(rows,range){
 const days=CalendarB.dates(range.start,range.end).filter(date=>rows.some(row=>row.date===date)||holidaysB(date).length);
 return days.length?`<section class="schedule-agenda-b">${days.map(date=>`<section class="agenda-day-b"><h2>${calendarDayB(date)} <span>${thaiDate5(date)}</span></h2>${holidayBannerB(date)}${rows.filter(row=>row.date===date).map(row=>`<button class="schedule-event-row" ${occurrenceAttrsB(row)}><span class="event-time">${row.start}<br>${row.end}</span><i class="event-mark"></i><span class="grow"><strong>${e5(row.title)}</strong><small>ห้อง ${e5(row.room)} · ${e5(row.teacher||'ไม่ระบุผู้สอน')}</small></span><span class="schedule-kind">${row.kind==='dl'?'DL':row.kind==='exam'?'สอบ':'เรียน'}</span>${icon('chevron')}</button>`).join('')||'<p class="caption empty-day-b">ไม่มีรายการเรียนหรือสอบในวันนี้</p>'}</section>`).join('')}</section>`:panel('',empty5('ไม่มีตารางตรงกับตัวกรอง','เปลี่ยนวันที่ ห้อง หรือประเภทกิจกรรมได้จากแถบด้านบน'));
}
function scheduleTimelineB(rows,range){
 const days=CalendarB.dates(range.start,range.end),unit=narrow5()?96:80;
 const start=Math.min(8,...rows.map(row=>Math.floor(minute5(row.start)/60))),end=Math.max(21,...rows.map(row=>Math.ceil(minute5(row.end)/60))),height=(end-start)*unit;
 return `<div class="timeline-scroll-b" tabindex="0" aria-label="${days.length===1?'ตารางรายวัน':'ตารางรายสัปดาห์'} ${start}:00 ถึง ${end}:00"><div class="timeline-b ${days.length===1?'single-day-b':''}" style="--days:${days.length};--hour:${unit}px;--timeline-height:${height}px"><div class="time-corner-b">เวลา</div>${days.map(date=>`<div class="timeline-date-b ${date===uiB.today?'today-b':''}"><span>${calendarDayB(date)}</span><button data-action="schedule-date-detail-b" data-date="${date}" aria-label="ดูรายการวันที่ ${thaiDate5(date)}" ${date===uiB.today?'aria-current="date"':''}>${Number(date.slice(-2))}</button></div>`).join('')}<div class="all-day-label-b">ทั้งวัน</div>${days.map(date=>`<div class="timeline-holiday-b">${holidaysB(date).map(row=>`<button data-action="holiday-detail-b" data-id="${e5(row.id)}" data-holiday-kind="${row.kind}">${e5(row.title)}</button>`).join('')}</div>`).join('')}<div class="timeline-hours-b">${Array.from({length:end-start+1},(_,i)=>`<span style="top:${i*unit}px">${String(start+i).padStart(2,'0')}:00</span>`).join('')}</div>${days.map(date=>`<div class="timeline-day-b">${layoutWeekDay6(rows.filter(row=>row.date===date)).map(row=>{const duration=minute5(row.end)-minute5(row.start);return `<button class="week-event cal-event-b ${duration<60?'compact-event-b':''}" ${occurrenceAttrsB(row)} style="top:${(minute5(row.start)-start*60)/60*unit}px;height:${Math.max(44,duration/60*unit-3)}px;left:calc(${row.lane*100/row.lanes}% + 4px);width:calc(${100/row.lanes}% - 8px)" aria-label="${e5(row.title)} ${thaiDate5(row.date)} ${row.start} ถึง ${row.end} ห้อง ${e5(row.room)}"><strong>${e5(row.kind==='dl'?'สอบ DL':row.title)}</strong><small>${row.start}–${row.end}</small><small class="event-room-b">ห้อง ${e5(row.room)}</small></button>`;}).join('')}</div>`).join('')}</div></div>`;
}
function scheduleMonthB(rows,range){
 const dates=CalendarB.dates(range.start,range.end),padding=CalendarB.weekday(range.start),limit=narrow5()?2:3;
 return `<section class="calendar-month-b" aria-label="${thaiMonth5(range.start.slice(0,7))}"><div class="month-grid-b">${['จ','อ','พ','พฤ','ศ','ส','อา'].map(day=>`<div class="weekday">${day}</div>`).join('')}${Array.from({length:padding},()=>'<div class="month-blank-b" aria-hidden="true"></div>').join('')}${dates.map(date=>monthCellB(date,rows.filter(row=>row.date===date),holidaysB(date),limit)).join('')}</div></section>`;
}
function monthCellB(date,items,holidays,limit){
 const label=`${thaiDate5(date)} ${items.length} กิจกรรม${holidays.length?' · '+holidays.map(row=>row.title).join(', '):''}`,day=Number(date.slice(-2)),today=date===uiB.today?'aria-current="date"':'';
 const kinds=[...new Set(items.map(row=>row.kind))];
 const compact=`<button class="month-mobile-day-b" data-action="schedule-date-detail-b" data-date="${date}" aria-label="${e5(label)}" aria-haspopup="dialog"><span class="month-mobile-number-b" ${today}>${day}</span><span class="month-mobile-note-b ${holidays.length?'has-holiday-b':''}" aria-hidden="true">${holidays.length?(holidays.some(row=>row.kind==='public')?'วันหยุด':'สำคัญ'):'&nbsp;'}</span><span class="month-mobile-dots-b" aria-hidden="true">${kinds.map(kind=>`<i data-kind="${kind}"></i>`).join('')}${items.length?`<small>${items.length}</small>`:''}</span></button>`;
 const expanded=`<button class="month-number-b" data-action="schedule-date-detail-b" data-date="${date}" aria-label="${e5(label)}" ${today}>${day}</button>${holidays.map(row=>`<button class="month-holiday-b" data-action="holiday-detail-b" data-id="${e5(row.id)}" data-holiday-kind="${row.kind}" title="${e5(row.title)}">${e5(row.title)}</button>`).join('')}${items.slice(0,limit).map(row=>`<button class="month-event-b" ${occurrenceAttrsB(row)} title="${row.start} ${e5(row.title)} · ห้อง ${e5(row.room)}"><span>${row.start}</span><strong>${e5(row.kind==='dl'?'สอบ DL':row.title)}</strong></button>`).join('')}${items.length>limit?button('+'+(items.length-limit)+' รายการ','schedule-date-detail-b','','month-more-b',`data-date="${date}" aria-label="ดู ${items.length} กิจกรรมวันที่ ${thaiDate5(date)}"`):''}`;
 return `<div class="month-date-b ${date===uiB.today?'today-b':''}">${compact}${expanded}</div>`;
}
function periodLabelB(range,mode){
 const format=(date,year=true)=>new Date(date+'T12:00:00Z').toLocaleDateString('th-TH',{day:'numeric',month:'short',...(year?{year:'numeric'}:{}),timeZone:'UTC'});
 if(mode==='month')return thaiMonth5(ui6.scheduleDate.slice(0,7));if(mode==='day')return format(ui6.scheduleDate);
 return range.start.slice(0,7)===range.end.slice(0,7)?`${Number(range.start.slice(-2))}–${format(range.end)}`:`${format(range.start,range.start.slice(0,4)!==range.end.slice(0,4))} – ${format(range.end)}`;
}
renderers.classrooms=function(){
 const mode=scheduleModeB(),range=scheduleRangeB(),rows=scheduleRowsB(range),filters=Number(state.room!=='ทั้งหมด')+Number(ui6.scheduleKind!=='all');
 const headingB=`<div class="cal-title-row-b"><div><h1><span class="desktop-calendar-title-b">ตารางและการใช้ห้อง</span><span class="mobile-calendar-title-b">ตาราง</span></h1><p>เรียนและสอบในปฏิทินเดียว</p></div>${state.role!=='staff'?`<div class="cal-title-actions-b"><button class="icon-btn" data-action="calendar-tools-b" aria-label="เครื่องมือตารางเพิ่มเติม">${icon('more')}</button>${button('เพิ่ม','new-schedule6','plus','primary','aria-label="เพิ่มตารางเรียนหรือสอบ"')}</div>`:''}</div>`;
 const tools=`<div class="cal-toolbar-b"><div class="cal-period-b">${button('วันนี้','schedule-today7','','secondary')}<button class="icon-btn" data-action="schedule-nav-b" data-dir="-1" aria-label="ช่วงก่อนหน้า">${icon('back')}</button><button class="cal-date-label-b" data-action="calendar-jump-b" aria-label="เลือกวันที่ ${thaiDate5(ui6.scheduleDate)}">${periodLabelB(range,mode)}${icon('down')}</button><button class="icon-btn" data-action="schedule-nav-b" data-dir="1" aria-label="ช่วงถัดไป">${icon('chevron')}</button></div><div class="cal-view-b">${segment('schedule-mode6',[['day','วัน','clock'],['week','สัปดาห์','calendar'],['month','เดือน','grid'],['agenda','รายการ','file']],mode)}<button class="icon-btn cal-filter-b" data-action="calendar-filters-b" aria-label="ตัวกรองตาราง${filters?' '+filters+' ตัว':''}">${icon('filter')}${filters?`<span>${filters}</span>`:''}</button></div></div><div class="cal-summary-b"><span>${state.room==='ทั้งหมด'?'ทุกห้อง':'ห้อง '+e5(state.room)} · ${ui6.scheduleKind==='all'?'เรียนและสอบทั้งหมด':calKindB[ui6.scheduleKind]} · ${rows.length} กิจกรรม</span>${holidaySourceB(ui6.scheduleDate.slice(0,4))}</div>`;
 const content=mode==='month'?scheduleMonthB(rows,range):mode==='agenda'?scheduleAgendaB(rows,range):scheduleTimelineB(rows,range);
 return `<section class="calendar-workspace-b">${headingB}${tools}<div class="calendar-content-b" data-view="${mode}">${content}</div><div class="cal-legend-b">${Object.entries(calKindB).map(([kind,label])=>`<span data-kind="${kind}"><i></i>${label}</span>`).join('')}<span class="cal-term-b">ภาคเรียน ${f4.semester}</span>${state.role!=='staff'?linkButton('จัดรอบสอบ DL','dl','calendar','link'):''}</div></section>`;
};
function filterSheetB(holidaysOnly=false){
 const updated=uiB.holidays?new Date(uiB.holidays.fetchedAt).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'}):'—';
 showSheet(holidaysOnly?'ปฏิทินวันหยุด':'ตัวกรองตาราง','เลือกข้อมูลที่ต้องการเห็น',`<form id="calendar-filters-b" class="stack">${holidaysOnly?'':field('ห้อง',select('cal-room-b',['ทั้งหมด','401','402','406','407'],state.room))+field('ประเภทกิจกรรม',select('cal-kind-b',[['all','เรียนและสอบทั้งหมด'],...Object.entries(calKindB)],ui6.scheduleKind))+field('ภาคเรียน',select('cal-semester-b',['2/2569','1/2570','1/2569'],f4.semester))}<fieldset class="calendar-layers-b"><legend>ปฏิทินเพิ่มเติม</legend><label><input type="checkbox" name="cal-public-b" ${uiB.publicHolidays?'checked':''}>วันหยุดนักขัตฤกษ์ไทย</label><label><input type="checkbox" name="cal-observance-b" ${uiB.observances?'checked':''}>วันสำคัญ</label><small>ข้อมูล Google ประเทศไทย · อัปเดต ${updated}</small><small>แสดงประกอบตาราง รายการเรียนและสอบยังคงเดิม</small>${uiB.holidayError?button('โหลดวันหยุดอีกครั้ง','reload-holidays-b','refresh','link'):''}</fieldset></form>`,`${holidaysOnly?'':button('ล้างตัวกรอง','calendar-reset-b','','secondary')}${button('ใช้ตัวเลือกนี้','calendar-apply-b','check','primary')}`);
}
function positionCalendarDetailB(target){
 if(narrow5()||!target)return;
 const dialog=$('#sheet');dialog.classList.add('calendar-popover-b');
 const rect=target.getBoundingClientRect(),box=dialog.getBoundingClientRect(),left=rect.right+12+box.width<innerWidth?rect.right+12:Math.max(16,rect.left-box.width-12),top=Math.min(Math.max(24,rect.top-30),Math.max(24,innerHeight-box.height-20));
 dialog.style.left=left+'px';dialog.style.top=top+'px';
}
function showScheduleDayB(date){
 uiB.detailDay=date;const range={start:date,end:date};
 showSheet('ตาราง '+thaiDate5(date),'เรียน สอบ และวันหยุด',scheduleAgendaB(scheduleRowsB(range),range),button('ดูแบบวัน','calendar-open-day-b','calendar','primary',`data-date="${date}"`));
}
Object.assign(actions,{
 'schedule-today7':()=>{ui6.scheduleDate=CalendarB.todayBangkok();render();},
 'schedule-nav-b':button=>{const step=Number(button.dataset.dir),mode=scheduleModeB();ui6.scheduleDate=mode==='month'?CalendarB.addMonths(ui6.scheduleDate,step):CalendarB.addDays(ui6.scheduleDate,step*(mode==='day'?1:7));render();},
 'calendar-jump-b':()=>showSheet('ไปยังวันที่','คงห้อง ประเภท และมุมมองที่เลือกไว้',`<form id="calendar-jump-b">${field('วันที่',input('calendar-date-b',ui6.scheduleDate,'date','required'))}</form>`,button('ไปวันที่นี้','calendar-jump-save-b','check','primary')),
 'calendar-jump-save-b':()=>{const form=$('#calendar-jump-b'),date=$('[name="calendar-date-b"]').value;if(!form.reportValidity()||!CalendarB.valid(date))return;ui6.scheduleDate=date;closeSheet();render();},
 'calendar-filters-b':()=>filterSheetB(),
 'holiday-options-b':()=>filterSheetB(true),
 'calendar-apply-b':()=>{const form=$('#calendar-filters-b'),values=new FormData(form);if(values.has('cal-room-b')){state.room=values.get('cal-room-b');ui6.scheduleKind=values.get('cal-kind-b');f4.semester=values.get('cal-semester-b');}uiB.publicHolidays=values.has('cal-public-b');uiB.observances=values.has('cal-observance-b');closeSheet();render();},
 'calendar-reset-b':()=>{state.room='ทั้งหมด';ui6.scheduleKind='all';closeSheet();render();},
 'reload-holidays-b':()=>{closeSheet();loadHolidaysB();},
 'calendar-tools-b':()=>showSheet('เครื่องมือตาราง','เลือกสิ่งที่ต้องการทำ',`<nav class="category-list">${button('นำเข้าตารางเรียนและสอบ','open-class-import5','upload')}${linkButton('จัดรอบสอบ DL','dl','calendar')}${button('คัดลอกตารางไปภาคเรียนใหม่','copy-classes4','layers')}${button('จัดรายการตารางเรียน','class-list6','file')}</nav>`),
 'schedule-date-detail-b':button=>showScheduleDayB(button.dataset.date),
 'calendar-open-day-b':button=>{ui6.scheduleDate=button.dataset.date;ui6.scheduleMode='day';closeSheet();render();},
 'schedule-day-back-b':()=>showScheduleDayB(uiB.detailDay),
 'schedule-detail-b':button=>{
  const date=button.dataset.date,row=scheduleRowsB({start:date,end:date}).find(row=>row.id===button.dataset.id&&row.kind===button.dataset.kind);if(!row)return;
  showSheet(calKindB[row.kind],row.title,`${uiB.detailDay===date?button8BackB():''}${facts5([['วันที่',thaiDate5(date,true)],['เวลา',row.start+'–'+row.end],['ห้อง',row.room],['ผู้สอน / ผู้คุม',row.teacher||'—'],...(row.kind==='dl'?[['จำนวนผู้สอบ',row.count+' คนต่อรอบ']]:[['ภาคเรียน',row.semester||f4.semester]])])}${row.note?`<p class="detail-note">${e5(row.note)}</p>`:''}`,state.role!=='staff'&&row.kind!=='exam'?buttonHelperB(row):'');positionCalendarDetailB(button);
 },
 'holiday-detail-b':button=>{const row=uiB.holidays?.events.find(row=>row.id===button.dataset.id);if(!row)return;showSheet(row.kind==='public'?'วันหยุดนักขัตฤกษ์':'วันสำคัญ',row.title,facts5([['วันที่',thaiDate5(row.start,true)],['ปฏิทิน','Google ประเทศไทย'],['ข้อมูลตาราง','รายการเรียนและสอบยังคงเดิม']]));positionCalendarDetailB(button);},
});
function button8BackB(){return button('กลับไปรายการของวัน','schedule-day-back-b','back','link');}
function buttonHelperB(row){return button(row.kind==='dl'?'แก้ไขรอบสอบ':'แก้ไขตารางเรียน',row.kind==='dl'?'edit-exam4':'edit-class4','edit','primary',`data-id="${row.id}"`);}
const showSheetBeforeB=showSheet;
showSheet=function(...args){$('#sheet').classList.remove('calendar-popover-b');showSheetBeforeB(...args);};
// Existing history/DL month calendars use the same holidays without counting them as work.
monthGrid5=function(month,selected,counts,action,exam=false){
 const range=CalendarB.range(month+'-01','month'),dates=CalendarB.dates(range.start,range.end),offset=CalendarB.weekday(range.start);
 return `<div class="calendar-grid holiday-month-b">${['จ','อ','พ','พฤ','ศ','ส','อา'].map(day=>`<div class="weekday">${day}</div>`).join('')}${Array.from({length:offset},()=>'<div class="calendar-cell faded" aria-hidden="true"></div>').join('')}${dates.map(date=>{const count=counts(date),holidays=holidaysB(date);return `<button class="calendar-cell ${date===selected?'selected':''}" data-action="${action}" data-date="${date}" data-day="${Number(date.slice(-2))}" aria-label="${thaiDate5(date)} ${count} ${exam?'รอบสอบ':'รายการงาน'}${holidays.length?' · '+e5(holidays.map(row=>row.title).join(', ')):''}"><span class="date-number" ${date===uiB.today?'aria-current="date"':''}>${Number(date.slice(-2))}</span>${count?`<span class="calendar-count">${count} ${exam?'รอบ':'งาน'}</span>`:''}${holidays.map(row=>`<small class="holiday-marker-b" data-holiday-kind="${row.kind}">${e5(row.title)}</small>`).join('')}</button>`;}).join('')}</div>${holidaySourceB(month.slice(0,4))}`;
};
const showLogDayBeforeB=showLogDay8;
showLogDay8=function(){showLogDayBeforeB();$('.sheet-body').insertAdjacentHTML('afterbegin',holidayBannerB(ui8.logDay));};
actions['day-log-back8']=()=>showLogDay8();
const dailyEventsBeforeB=dailyEvents6;
dailyEvents6=(date=f4.date)=>holidayBannerB(date)+dailyEventsBeforeB(date);
loadHolidaysB();
