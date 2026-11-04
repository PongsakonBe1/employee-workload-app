/* Approved design prototype: synthetic local records, no backend or package dependency. */
'use strict';
const review5=window.designReview;
const ui6={today:'2026-11-05',scheduleDate:'2026-11-03',scheduleKind:'all',scheduleMode:null,sourceRoom:'401',importFilter:'all',importDrafts:new Map(),eventId:null};
// Align the seed registry with its latest return record, rather than showing a
// damaged sample as available in a different view.
for(const history of [...f4.conditionHistory].sort((a,b)=>a.date.localeCompare(b.date))){const device=state.devices.find(d=>d.id===history.device);if(device)device.condition=history.condition;}
if(!dayNames5.includes('อาทิตย์'))dayNames5.push('อาทิตย์');
const weekDays6=['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];
const dateOf6=(day,anchor=ui6.scheduleDate)=>{const d=new Date(anchor+'T12:00:00+07:00'),offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset+weekDays6.indexOf(day));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dayOf6=date=>weekDays6[(new Date(date+'T12:00:00+07:00').getDay()+6)%7];
const rangeOverlaps6=(a,b)=>(a.validFrom||'0000-01-01')<=(b.validTo||'9999-12-31')&&(b.validFrom||'0000-01-01')<=(a.validTo||'9999-12-31');
const title6={record:'บันทึกงาน',classrooms:'ตารางและการใช้ห้อง',dl:'รอบสอบ Digital Literacy',staff:'การกระจายงานของทีม',equipment:'ทะเบียนอุปกรณ์',usage:'การใช้งานอุปกรณ์',imports:'นำเข้าตารางเรียนและสอบ'};
for(const [id,title]of Object.entries(title6))routes.find(r=>r[0]===id)[1]=title;
const groupItems6=()=>navGroups5().map(([title,items])=>[title,items.filter(([id])=>id!=='dl').map(([id,label,symbol])=>[id,id==='classrooms'?'ตารางและการใช้ห้อง':id==='staff'?'การกระจายงานของทีม':label,symbol])]);

header=function(){
 const auth=['login','pending'].includes(state.route),active=state.route==='dl'?'classrooms':parents5[state.route]||state.route;
 document.body.dataset.auth=String(auth);
 const unread=f4.notifications.filter(n=>!n.read).length,person=f4.userMeta[0];
 $('#app-sidebar').innerHTML=`<a class="sidebar-brand" href="#/record"><img src="/frontend/public/labboy-logo.png" alt="labboy"><span><strong>labboy Workload</strong><small>ICIT · พื้นที่ทำงาน</small></span></a><nav class="sidebar-menu" aria-label="เมนูงาน">${groupItems6().map(([title,items])=>`<section class="sidebar-group"><h2>${title}</h2>${items.map(([id,label,symbol])=>`<a class="sidebar-link ${active===id?'active':''}" href="#/${id}" ${active===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span>${id==='admin'?`<span class="count-badge">${f4.requests.filter(r=>r.status==='pending').length}</span>`:''}</a>`).join('')}</section>`).join('')}</nav><div class="sidebar-footer"><a class="sidebar-link" href="#/settings">${icon('settings')}ตั้งค่า</a><a class="sidebar-link" href="#/help">${icon('help')}คู่มือและความช่วยเหลือ</a><a class="workspace-person" href="#/profile"><span class="avatar">A</span><span><strong>${e5(person.name)}</strong><small>${state.role==='superadmin'?'Superadmin':state.role==='admin'?'Admin':'Staff'}</small></span></a></div>`;
 const symbol=currentRoute()[2];
 $('#app-header').innerHTML=`<div class="toolbar-title">${icon(symbol)}<span>${e5(currentRoute()[1])}</span><small>พื้นที่ทำงาน ICIT</small></div><a class="header-brand-mobile" href="#/record"><img src="/frontend/public/labboy-logo.png" alt="labboy"><span>labboy</span></a><div class="header-actions"><button class="icon-btn desktop-only" data-action="routes" aria-label="ค้นหาหน้าและเครื่องมือ">${icon('search')}</button><button class="icon-btn" data-action="notifications" aria-label="การแจ้งเตือน ${unread} ยังไม่อ่าน">${icon('bell')}${unread?'<span class="unread-dot" aria-hidden="true"></span>':''}</button><button class="icon-btn appearance-control" data-action="appearance" aria-label="รูปแบบการแสดงผล">${icon(state.theme==='dark'?'moon':'sun')}</button></div>`;
 const tabs=[['record','บันทึก','record'],['worklogs','ประวัติ','file'],['classrooms','ตาราง','calendar'],['resources','ทรัพยากร','headphones']];
 const tabActive=['equipment','usage','condition'].includes(state.route)?'resources':state.route==='dl'||state.route==='imports'?'classrooms':active;
 $('#mobile-nav').innerHTML=tabs.map(([id,label,sym])=>`<a class="nav-item ${tabActive===id?'active':''}" href="#/${id}" ${tabActive===id?'aria-current="page"':''}>${icon(sym)}<span>${label}</span></a>`).join('')+`<button class="nav-item ${!tabs.some(([id])=>id===tabActive)?'active':''}" data-action="routes" aria-label="เพิ่มเติม">${icon('grid')}<span>เพิ่มเติม</span></button>`;
};

function status6(value){const statuses={pending:['รอตรวจ','amber'],approved:['อนุมัติ','green'],rejected:['ไม่อนุมัติ','red'],normal:['สมบูรณ์','green'],damaged:['ชำรุด','amber'],lost:['สูญหาย','red'],ready:['พร้อมใช้','green'],borrowed:['กำลังยืม','blue'],inactive:['หยุดใช้งาน',''],unknown:['ตรวจสอบไม่ได้',''],'บันทึกแล้ว':['บันทึกแล้ว','green']};const [label,tone]=statuses[value]||[value,''];return tag(label,tone);};
function deviceStatus6(d){return ['damaged','lost'].includes(d.condition)?d.condition:!d.active?'inactive':d.borrowed?'borrowed':'ready';}
const resourceDetailCore6=resourceDetail5;
resourceDetail5=function(id){const d=state.devices.find(d=>d.id===id),html=resourceDetailCore6(id);return d?html.replace(/<span class="tag[^\"]*">[^<]*<\/span>/,status6(deviceStatus6(d))):html;};

function dailyEvents6(date=f4.date){
 const rows=[...state.exams.filter(e=>e.date===date&&e.active!==false).map(e=>({kind:'dl',start:e.time.split('–')[0],end:e.time.split('–')[1],title:'สอบ Digital Literacy',detail:e.count+' คนต่อรอบ · '+e.rooms,extra:'ผู้คุมสอบ '+e.proctors.length+' คน'})),...f4.classes.filter(c=>c.active&&c.day===dayOf6(date)&&(!c.validFrom||c.validFrom<=date)&&(!c.validTo||c.validTo>=date)).map(c=>({kind:'classroom',start:c.start,end:c.end,title:c.subject,detail:'ห้อง '+c.room,extra:c.teacher})),...(ui5.examImports||[]).filter(e=>e.date===date).map(e=>({kind:'exam',start:e.start,end:e.end,title:e.subject,detail:'สอบรายวิชา · ห้อง '+e.room,extra:e.teacher}))].sort((a,b)=>a.start.localeCompare(b.start));
 return `<div class="daily-events6">${rows.map(e=>`<div class="compact-event"><span class="event-time">${e.start}<br>${e.end}</span><i class="event-mark" style="background:var(--calendar-${e.kind==='classroom'?'class':e.kind})"></i><div class="grow"><strong>${e5(e.title)}</strong><small>${e5(e.detail)}</small><small>${e5(e.extra||'')}</small></div></div>`).join('')||empty5('ไม่มีตารางในวันที่เลือก','ยังบันทึกงานบริการอื่น ๆ ได้ตามปกติ')}</div>`;
}
function dailyContext6(){const date=new Date(f4.date+'T12:00:00+07:00');return panel('ตารางวันที่เลือก',`<div class="day-context-heading"><span class="day-number">${date.getDate()}</span><span><strong>${date.toLocaleDateString('th-TH',{weekday:'long'})}</strong><small>${date.toLocaleDateString('th-TH',{month:'long',year:'numeric'})}</small></span></div>${dailyEvents6()}<div class="context-footer"><span class="caption">เรียนและสอบในมุมมองเดียว</span>${linkButton('ดูตาราง','classrooms','chevron','link')}</div>`)+panel('ทรัพยากรพร้อมใช้',`<div class="availability-mini"><a href="#/resources"><strong>${f4.rooms.filter(r=>!r.inUse).length}/${Object.keys(f4.rooms).length}</strong><small>ห้องบริการ</small></a><a href="#/resources"><strong>${state.devices.filter(d=>d.active&&!d.borrowed&&d.condition!=='damaged'&&d.condition!=='lost').length}/${state.devices.length}</strong><small>อุปกรณ์</small></a></div>`);}
quickLogPanel=function(){
 const all=f4.templateRows.filter(t=>t.active),pages=Math.max(1,Math.ceil(all.length/6));f4.quickPage=Math.max(0,Math.min(pages-1,f4.quickPage));
 return `<div class="quick-grid">${all.slice(f4.quickPage*6,f4.quickPage*6+6).map(t=>`<button class="quick-card" data-action="template-run" data-id="${t.id}"><span class="tile-icon">${icon(t.symbol)}</span>${t.kind==='combo'?`<span class="quick-count">${t.items.length} งาน</span>`:''}<span><strong>${e5(t.name)}</strong><small>${e5(t.kind==='combo'?'เลือกเฉพาะงานที่ทำ':t.kind==='smart'?(t.minorTask.includes('ห้อง')?'เลือกห้องเพื่อเปิด / ปิด':'เลือกอุปกรณ์เพื่อยืม / คืน'):t.requireComment?'ระบุผู้รับบริการและรายละเอียด':'ระบุรายละเอียดของงาน')}</small></span></button>`).join('')}</div><div class="quick-pagination">${action5('ก่อนหน้า','quick-prev','back',f4.quickPage===0?'disabled':'')}<small>${f4.quickPage+1} / ${pages}</small>${action5('ถัดไป','quick-next','chevron',f4.quickPage===pages-1?'disabled':'')}</div>`;
};
function recording6(manual=false){const p=currentPerson(),mode=manual?'manual':state.recordMode;return heading('',manual?'เพิ่มบันทึกงาน':'บันทึกงาน',manual?'เลือกหัวข้อและตรวจรายละเอียดก่อนบันทึก':'งานของคุณและตารางที่เกี่ยวข้องในพื้นที่เดียว')+`<div class="workspace-split record-workspace"><div class="stack"><section class="panel record-main"><div class="record-panel-title"><h2>${state.role==='staff'?'งานของฉัน':'งานที่กำลังบันทึก'}</h2><button class="staff-picker" data-action="${state.role==='staff'?'own-account':'staff-picker'}"><span class="avatar">${p.initial}</span><span class="grow"><small>${state.role==='staff'?'บัญชีของฉัน':'บันทึกให้'}</small><strong>${e5(p.name)}</strong></span>${state.role==='staff'?'':icon('chevron')}</button></div><div class="record-meta">${manual?'<span class="caption">กรอกบันทึกงาน</span>':segment('record-mode',[['quick','บันทึกด่วน','bolt'],['manual','กรอกเอง','edit']],mode)}<button class="btn date-summary" data-action="date-time">${icon('calendar')}${thaiDate5(f4.date)} · ${f4.time}</button></div>${mode==='manual'?manualPanel():quickLogPanel()}<details class="inline-today"><summary>${icon('calendar')}ตารางวันที่เลือก<small>${thaiDate5(f4.date)}</small></summary>${dailyEvents6()}${linkButton('เปิดตารางทั้งหมด','classrooms','chevron','link')}</details></section><section class="panel recent-list"><div class="panel-head"><h2>บันทึกล่าสุด</h2>${linkButton('ดูประวัติ','worklogs','','link')}</div>${recentRows(3)}</section></div><aside class="stack daily-context">${dailyContext6()}</aside></div>`;}
renderers.record=()=>recording6();renderers['new-log']=()=>recording6(true);

// Keep current/future periods distinct and use the same scope for every chart.
const fiscalRangeCore6=fiscalRange5;
scopedRows5=function(person='all'){const [start,end]=fiscalRangeCore6(),cutoff=end>ui6.today?ui6.today:end;return state.logs.filter(r=>r.date>=start&&r.date<=cutoff&&(person==='all'||r.person===person));};
lineChart=function(series=[],labels=months){
 const width=600,height=225,pad=32,max=Math.max(1,...series.filter(Number.isFinite))*1.15,n=Math.max(1,series.length-1),x=i=>pad+i*(width-pad*2)/n,y=v=>height-36-(Number.isFinite(v)?v:0)/max*(height-70),points=series.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
 return `<svg class="chart" viewBox="0 0 600 225" role="img" aria-label="แนวโน้มจำนวนรายการ ${series.join(', ')}" data-total="${series.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0)}"><title>จำนวนรายการในช่วงที่เลือก</title>${[0,1,2,3].map(i=>`<line x1="32" x2="568" y1="${25+i*52}" y2="${25+i*52}" class="gridline"/><text x="2" y="${29+i*52}">${Math.round(max*(3-i)/3)}</text>`).join('')}<polygon points="32,189 ${points} ${x(series.length-1)},189" fill="var(--blue)" opacity=".6"/><polyline points="${points}" fill="none" class="stroke" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${series.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/>`).join('')}${labels.map((label,i)=>`<text x="${pad+i*(width-pad*2)/Math.max(1,labels.length-1)}" y="219" text-anchor="middle">${e5(label)}</text>`).join('')}</svg>`;
};
trend5=function(rows){
 const [start,end]=fiscalRangeCore6();
 if(state.month!=='all'){
  const days=Number(end.slice(-2)),series=Array.from({length:days},(_,i)=>rows.filter(r=>r.date===start.slice(0,8)+String(i+1).padStart(2,'0')).length),labels=series.map((_,i)=>i===0||i===days-1||(i+1)%5===0?String(i+1):'');
  return lineChart(series,labels)+`<p class="caption">รายวัน · ${thaiMonth5(start.slice(0,7))}</p>`;
 }
 const base=Number(state.year)-544,validMonths=months.map((m,i)=>({label:m,period:`${base+(i>2?1:0)}-${String((i+9)%12+1).padStart(2,'0')}`})).filter(m=>m.period<=ui6.today.slice(0,7));
 return lineChart(validMonths.map(m=>rows.filter(r=>r.date.startsWith(m.period)).length),validMonths.map(m=>m.label))+`<p class="caption">${end>ui6.today?'ข้อมูลถึง '+thaiDate5(ui6.today)+' · ยังไม่รวมเดือนอนาคต':'รายเดือนตามปีงบประมาณที่เลือก'}</p>`;
};

function scheduleRows6(){
 const first=dateOf6('จันทร์'),last=dateOf6('อาทิตย์');
 const classes=f4.classes.filter(r=>r.semester===f4.semester&&r.active).map(r=>({...r,kind:'classroom',date:dateOf6(r.day),title:r.subject})).filter(r=>(!r.validFrom||r.date>=r.validFrom)&&(!r.validTo||r.date<=r.validTo));
 const dl=state.exams.filter(r=>r.active!==false&&r.date>=first&&r.date<=last).map(r=>({...r,kind:'dl',day:dayOf6(r.date),start:r.time.split('–')[0],end:r.time.split('–')[1],room:r.rooms,title:'สอบ Digital Literacy',teacher:r.proctors.join(', ')}));
 const exams=(ui5.examImports||[]).filter(r=>r.date>=first&&r.date<=last).map(r=>({...r,kind:'exam',day:dayOf6(r.date),title:r.subject}));
 return [...classes,...dl,...exams].filter(r=>(ui6.scheduleKind==='all'||r.kind===ui6.scheduleKind)&&(state.room==='ทั้งหมด'||r.room.split(/\s*\+\s*/).includes(state.room))).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
}
function scheduleGrid6(rows){
 const showSunday=rows.some(r=>r.day==='อาทิตย์'),days=showSunday?weekDays6:weekDays6.slice(0,6);
 return `<div class="week-scroll" tabindex="0" aria-label="ตารางใช้ห้อง 08:00 ถึง 21:00"><div class="week-grid" style="--week-days:${days.length}"><div class="week-head">เวลา</div>${days.map(d=>`<div class="week-head">${d}<small>${Number(dateOf6(d).slice(-2))}</small></div>`).join('')}<div class="week-hours">${Array.from({length:14},(_,i)=>i+8).map(h=>`<span style="top:${(h-8)*50}px">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>${days.map(day=>{const dayRows=layoutWeekDay6(rows.filter(r=>r.day===day));return `<div class="week-day">${dayRows.map(r=>{const lane=r.lane,width=100/r.lanes;return `<button class="week-event" data-kind="${r.kind}" data-action="schedule-detail6" data-id="${r.id}" style="top:${(minute5(r.start)-480)/60*50}px;height:${Math.max(31,(minute5(r.end)-minute5(r.start))/60*50-3)}px;left:calc(${width*lane}% + 3px);width:calc(${width}% - 6px)" aria-label="${e5(r.title)} ${r.day} ${r.start} ถึง ${r.end} ห้อง ${r.room}"><strong>${e5(r.kind==='dl'?'สอบ DL':r.title)}</strong><small>${r.start}–${r.end}</small><small>ห้อง ${r.room}</small></button>`;}).join('')}</div>`;}).join('')}</div></div>`;
}
function layoutWeekDay6(rows){
 const sorted=[...rows].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)),groups=[];
 for(const row of sorted){let group=groups.at(-1);if(!group||row.start>=group.end){group={rows:[],end:row.end};groups.push(group);}group.rows.push(row);if(row.end>group.end)group.end=row.end;}
 return groups.flatMap(group=>{const ends=[],placed=group.rows.map(row=>{let lane=ends.findIndex(end=>end<=row.start);if(lane===-1)lane=ends.length;ends[lane]=row.end;return {...row,lane};});return placed.map(row=>({...row,lanes:ends.length}));});
}
function scheduleDetail6(id){
 const r=scheduleRows6().find(r=>r.id===id);if(!r)return;
 const kind={classroom:'ตารางเรียน',dl:'สอบ Digital Literacy',exam:'สอบรายวิชา'}[r.kind];
 showSheet(kind,r.title,`${facts5([['วันที่',thaiDate5(r.date,true)],['เวลา',r.start+'–'+r.end],['ห้อง',r.room],['ผู้สอน / ผู้คุม',r.teacher||'—'],...(r.kind==='dl'?[['จำนวนผู้สอบ',r.count+' คนต่อรอบ']]:[['ภาคเรียน',r.semester||f4.semester]])])}${r.note?`<p class="detail-note">${e5(r.note)}</p>`:''}`,state.role!=='staff'&&r.kind!=='exam'?button(r.kind==='dl'?'แก้ไขรอบสอบ':'แก้ไขตารางเรียน',r.kind==='dl'?'edit-exam4':'edit-class4','edit','primary',`data-id="${r.id}"`):'');
}
renderers.classrooms=function(){
 const rows=scheduleRows6(),mode=ui6.scheduleMode||(narrow5()?'agenda':'week'),first=dateOf6('จันทร์'),last=dateOf6('อาทิตย์');
 const actions6=state.role==='staff'?'':action5('นำเข้าตาราง','open-class-import5','upload')+button('เพิ่มตาราง','new-schedule6','plus','primary');
 const bar=`<div class="command-bar"><div class="calendar-title">${action5('สัปดาห์ก่อน','schedule-week6','back','data-dir="-1"')}<span>${thaiDate5(first)} – ${thaiDate5(last)}</span>${action5('สัปดาห์ถัดไป','schedule-week6','chevron','data-dir="1"')}</div><span class="spacer"></span><label>ภาคเรียน ${select('class-semester',['2/2569','1/2570','1/2569'],f4.semester)}</label></div><div class="schedule-header"><div class="schedule-room-tabs">${['ทั้งหมด','401','402','406','407'].map(room=>`<button data-action="schedule-room6" data-room="${room}" aria-pressed="${state.room===room}">${room==='ทั้งหมด'?'ทุกห้อง':'ห้อง '+room}</button>`).join('')}</div>${segment('schedule-mode6',[['agenda','รายการ','file'],['week','สัปดาห์','calendar']],mode)}</div><div class="row" style="margin-bottom:18px">${select('schedule-kind6',[['all','เรียนและสอบทั้งหมด'],['classroom','ตารางเรียน'],['dl','Digital Literacy'],['exam','สอบรายวิชา']],ui6.scheduleKind,'aria-label="ประเภทกิจกรรม"')}<span class="caption">${rows.length} กิจกรรมในสัปดาห์นี้</span><span class="spacer"></span>${linkButton('จัดรอบสอบ DL','dl','calendar','link')}</div>`;
 const agenda=`<section class="panel schedule-list">${rows.length?[...new Set(rows.map(r=>r.date))].map(date=>`<div class="schedule-date-group">${dayOf6(date)} · ${thaiDate5(date,true)}</div>${rows.filter(r=>r.date===date).map(r=>`<button class="schedule-event-row" data-kind="${r.kind}" data-action="schedule-detail6" data-id="${r.id}"><span class="event-time">${r.start}<br>${r.end}</span><i class="event-mark"></i><span class="grow"><strong>${e5(r.title)}</strong><small>ห้อง ${r.room} · ${e5(r.teacher||'ไม่ระบุผู้สอน')}</small></span><span class="schedule-kind">${{classroom:'เรียน',dl:'DL',exam:'สอบ'}[r.kind]}</span>${icon('chevron')}</button>`).join('')}`).join(''):empty5('ไม่มีตารางตรงกับตัวกรอง','ลองเปลี่ยนสัปดาห์ ห้อง หรือประเภทกิจกรรม')}</section>`;
 return heading('','ตารางและการใช้ห้อง','เรียน สอบรายวิชา และ Digital Literacy ในมุมมองเดียว',actions6)+bar+(mode==='week'?panel('ตารางสัปดาห์',scheduleGrid6(rows)):agenda)+`<div class="schedule-help"><span><i style="background:var(--calendar-class)"></i>ตารางเรียน</span><span><i style="background:var(--calendar-dl)"></i>Digital Literacy</span><span><i style="background:var(--calendar-exam)"></i>สอบรายวิชา</span></div>${state.role==='staff'?'':`<div class="row" style="margin-top:20px">${action5('คัดลอกตารางเรียนไปภาคเรียนใหม่','copy-classes4','layers')}${action5('จัดรายการตารางเรียน','class-list6','file')}</div>`}`;
};
const dlCore6=renderers.dl;renderers.dl=()=>dlCore6().replace('จัดรอบสอบ ห้อง และผู้คุมสอบในพื้นที่เดียว','จัดรอบสอบพร้อมเวลาเริ่ม–จบและผู้คุมสอบ').replace('<div class="command-bar">',`<div style="margin-bottom:14px">${linkButton('กลับตารางเรียนและสอบรวม','classrooms','back','link')}</div><div class="command-bar">`);
Object.assign(actions,{
 'schedule-detail6':b=>scheduleDetail6(b.dataset.id),
 'schedule-room6':b=>{state.room=b.dataset.room;render();},
 'schedule-week6':b=>{const d=new Date(ui6.scheduleDate+'T12:00:00+07:00');d.setDate(d.getDate()+Number(b.dataset.dir)*7);ui6.scheduleDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;render();},
 'new-schedule6':()=>showSheet('เพิ่มตาราง','เลือกประเภทกิจกรรม',`<div class="category-list"><button data-action="add-class">${icon('calendar')}<span class="grow"><strong>ตารางเรียนประจำสัปดาห์</strong><small>วิชา ห้อง ผู้สอน และเวลา</small></span>${icon('chevron')}</button><button data-action="add-exam">${icon('calendar')}<span class="grow"><strong>รอบสอบ Digital Literacy</strong><small>จำนวนคน ห้อง และผู้คุมสอบ</small></span>${icon('chevron')}</button><a class="sidebar-link" href="#/imports">${icon('upload')}นำเข้าตารางเรียนหรือสอบรายวิชา</a></div>`),
 'class-list6':()=>{const rows=f4.classes.filter(r=>r.semester===f4.semester);showSheet('รายการตารางเรียน','เปิด / ปิดรายการ หรือแก้ไขรายวิชา',`<div class="stack">${rows.map(r=>`<div class="data-row"><input type="checkbox" data-class="${r.id}" aria-label="เลือกชั้นเรียน ${r.id}" ${f4.classSelection.has(r.id)?'checked':''}><button class="row-target" data-action="edit-class4" data-id="${r.id}"><span class="grow"><strong>${e5(r.subject)}</strong><small>${r.day} ${r.start}–${r.end} · ${r.room}</small></span></button>${status6(r.active?'ready':'inactive')}</div>`).join('')}</div>`,action5('เปิดใช้ที่เลือก','bulk-class4','check','data-active="true"')+action5('ปิดใช้ที่เลือก','bulk-class4','close','data-active="false"'));},
});
const segmentCore6=actions.segment;actions.segment=b=>{if(b.dataset.group==='schedule-mode6'){ui6.scheduleMode=b.dataset.value;render();return;}if(b.dataset.group==='record-mode')stashManual5();segmentCore6(b);};
document.addEventListener('change',event=>{if(event.target.name==='schedule-kind6'){ui6.scheduleKind=event.target.value;render();}});
const saveClassCore6=actions['save-class4'];actions['save-class4']=()=>{const day=$('[name="class-day"]')?.value;saveClassCore6();if(!$('#sheet').open&&day)ui6.scheduleDate=dateOf6(day);};
const classEditorCore6=classEditor;
classEditor=function(id){
 classEditorCore6(id);const row=f4.classes.find(r=>r.id===id);
 $('#class4').insertAdjacentHTML('beforeend',`<details class="full"><summary class="caption">ช่วงที่มีผลของตาราง</summary><div class="form-grid" style="margin-top:14px">${field('เริ่มใช้',input('class-valid-from6',row?.validFrom||ui5.validStart,'date'))}${field('สิ้นสุด (ถ้าทราบ)',input('class-valid-to6',row?.validTo||ui5.validEnd||'','date'))}</div></details>`);
};
function classCollision6(row,ignoreId){
 if(!row.active)return '';
 const other=f4.classes.find(r=>r.id!==ignoreId&&r.active&&r.semester===f4.semester&&r.day===row.day&&r.room===row.room&&r.start<row.end&&r.end>row.start&&rangeOverlaps6(r,row));
 if(other)return 'ห้องและเวลาซ้อนกับชั้นเรียนเดิม';
 const fixed=[...state.exams.filter(e=>e.active!==false).map(e=>({date:e.date,start:e.time.split('–')[0],end:e.time.split('–')[1],room:e.rooms})),...(ui5.examImports||[])];
 return fixed.some(e=>dayOf6(e.date)===row.day&&e.date>=(row.validFrom||'0000-01-01')&&e.date<=(row.validTo||'9999-12-31')&&roomsOverlap6(row.room,e.room)&&e.start<row.end&&e.end>row.start)?'ห้องและเวลาซ้อนกับตารางสอบ กรุณาตรวจในตารางรวม':'';
}
actions['save-class4']=()=>{
 const form=$('#class4');if(!form.reportValidity()||!ensureOnline())return;const v=new FormData(form),from=v.get('class-valid-from6')||'',to=v.get('class-valid-to6')||'';
 const row={day:v.get('class-day'),start:v.get('class-start'),end:v.get('class-end'),room:v.get('class-room'),subject:v.get('class-subject'),teacher:v.get('class-teacher'),note:v.get('class-note'),active:v.get('class-active')==='on',semester:f4.semester,validFrom:from,validTo:to};
 const fail=message=>$('#class-error').textContent=message;
 if(row.start>=row.end)return fail('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');if(from&&to&&from>to)return fail('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่ม');
 const collision=classCollision6(row,f4.classEditing);if(collision)return fail(collision);
 let existing=f4.classes.find(r=>r.id===f4.classEditing);if(!existing){existing={id:'CLASS6-'+Date.now()+'-'+(ui6.classSequence=(ui6.classSequence||0)+1)};f4.classes.push(existing);}
 Object.assign(existing,row);ui6.scheduleDate=from||ui6.scheduleDate;closeSheet();render();toast('บันทึกตารางเรียนแล้ว · ข้อมูลตัวอย่าง');
};
const saveDLCore6=actions['save-exam4'];actions['save-exam4']=()=>{
 const form=$('#exam4');if(!form?.reportValidity())return;const v=new FormData(form),date=v.get('exam-date'),start=v.get('exam-start'),end=v.get('exam-end'),rooms=Number(v.get('exam-count'))>40?'406 + 407':'406';
 const conflict=f4.classes.some(r=>r.active&&r.semester===f4.semester&&r.day===dayOf6(date)&&(!r.validFrom||r.validFrom<=date)&&(!r.validTo||r.validTo>=date)&&roomsOverlap6(r.room,rooms)&&r.start<end&&r.end>start);
 if(conflict){$('#exam-validation').textContent='ห้องและเวลาซ้อนกับตารางเรียน กรุณาตรวจในตารางรวม';return;}saveDLCore6();
};

// Sample extraction is explicit. Drafts, review flags and proctor IDs survive row changes.
const importSampleCore6=importSample5;
importSample5=function(type){return importSampleCore6(type).map((r,i)=>({...r,needsReview:[0,9,17].includes(i),reviewed:![0,9,17].includes(i),reviewReason:i===0?'ตรวจชื่อผู้สอน / ผู้คุมกับต้นฉบับ':i===9?'ตรวจช่วงเวลาของช่องรวม':'ตรวจห้องและวันที่ให้ตรงกัน',proctorIds:type==='dl'?initialExams[i].proctors.map(name=>people.find(p=>p.name===name)?.id).filter(Boolean):[]}));};
ui6.skipIds=new Set();ui6.ackConflicts=false;ui6.importResult=null;
const loadImportCore6=actions['load-import5'];actions['load-import5']=()=>{ui6.importDrafts.clear();ui6.skipIds.clear();ui6.importResult=null;ui6.ackConflicts=false;ui6.importFilter='all';ui6.sourceRoom='401';loadImportCore6();ui6.sourceRoom=ui5.importRows[0]?.room||'401';render();};
function calendarDate6(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const [y,m,d]=date.split('-').map(Number);return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate();}
function importDraft6(row){return {...row,...(ui6.importDrafts.get(row.id)||{})};}
function stashImport6(){
 const form=$('#import-row-form5');if(!form)return;
 const v=new FormData(form),id=form.dataset.id,old=ui5.importRows.find(r=>r.id===id);if(!old)return;
 const value={subject:v.get('import-row-subject5'),room:v.get('import-row-room5'),day:v.get('import-row-day5'),start:v.get('import-row-start5'),end:v.get('import-row-end5'),teacher:v.get('import-row-teacher5')||'',date:v.get('import-row-date5')||old.date};
 if(ui5.importType!=='classroom')value.day=calendarDate6(value.date)?dayOf6(value.date):'';
 if(ui5.importType==='dl'){value.count=Number(v.get('import-row-count6'));value.proctorIds=[0,1,2].map(i=>v.get('import-proctor-'+i));value.teacher=value.proctorIds.map(id=>people.find(p=>p.id===id)?.name||'ยังไม่เลือก').join(', ');value.room=value.count>40?'406 + 407':'406';value.day=calendarDate6(value.date)?dayOf6(value.date):'';}
 ui6.importDrafts.set(id,value);const label=$('#import-draft-status6');if(label)label.textContent='เก็บร่างการแก้ไขแล้ว';
}
function validateImportRow6(r){
 if(!r.subject?.trim())return 'ระบุชื่อวิชา / กิจกรรม';
 if(!/^\d{2}:\d{2}$/.test(r.start)||!/^\d{2}:\d{2}$/.test(r.end)||r.start>=r.end)return 'เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด';
 if(!weekDays6.includes(r.day))return 'เลือกวันให้ถูกต้อง';
 if(ui5.importType!=='classroom'&&(!calendarDate6(r.date)||r.date<ui5.validStart||r.date>ui5.validEnd))return 'วันที่สอบต้องอยู่ในช่วงที่มีผล';
 if(ui5.importType==='dl'){
  if(!Number.isInteger(r.count)||r.count<1)return 'จำนวนคนต่อรอบต้องเป็นจำนวนเต็มมากกว่า 0';
  if(r.proctorIds?.length!==3||new Set(r.proctorIds).size!==3||r.proctorIds.some(id=>!people.some(p=>p.id===id)))return 'เลือกผู้คุมสอบ 3 คนที่ไม่ซ้ำกัน';
 }else if(!['401','402','406','407'].includes(r.room))return 'เลือกห้อง 401, 402, 406 หรือ 407';
 return '';
}
function syncImport6(){
 stashImport6();const row=ui5.importRows.find(r=>r.id===ui5.importSelected);if(!row)return true;
 const draft=importDraft6(row),error=validateImportRow6(draft);
 if(error){const target=$('#import-row-error5');if(target){target.textContent=error;target.scrollIntoView({block:'nearest'});}return false;}
 Object.assign(row,draft);return true;
}
importDuplicate5=function(r){
 if(ui5.importType==='classroom')return f4.classes.some(c=>c.semester===f4.semester&&c.room===r.room&&c.day===r.day&&c.start===r.start&&c.end===r.end&&c.subject===r.subject&&(c.validFrom||ui5.validStart)===ui5.validStart&&(c.validTo||ui5.validEnd)===ui5.validEnd);
 if(ui5.importType==='dl')return state.exams.some(e=>e.date===r.date&&e.time===r.start+'–'+r.end&&e.rooms===r.room);
 return (ui5.examImports||[]).some(e=>e.date===r.date&&e.room===r.room&&e.start===r.start&&e.end===r.end&&e.subject===r.subject);
};
const roomsOverlap6=(a,b)=>a.split(/\s*\+\s*/).some(room=>b.split(/\s*\+\s*/).includes(room));
function importConflict6(row){
 const r=importDraft6(row),recurring=ui5.importType==='classroom',sameTime=t=>t.start<r.end&&t.end>r.start;
 const existing=f4.classes.filter(t=>t.active&&t.semester===f4.semester&&t.day===r.day&&roomsOverlap6(t.room,r.room)&&sameTime(t));
 const classConflict=existing.find(t=>recurring?rangeOverlaps6(t,{validFrom:ui5.validStart,validTo:ui5.validEnd}):(!t.validFrom||t.validFrom<=r.date)&&(!t.validTo||t.validTo>=r.date));
 if(classConflict)return `ห้อง ${classConflict.room} มี ${classConflict.subject} ${classConflict.start}–${classConflict.end}`;
 const fixed=[...state.exams.filter(e=>e.active!==false).map(e=>({...e,start:e.time.split('–')[0],end:e.time.split('–')[1],room:e.rooms,proctorIds:e.proctorIds||e.proctors.map(name=>people.find(p=>p.name===name)?.id).filter(Boolean)})),...(ui5.examImports||[])];
 const fixedConflict=fixed.find(t=>(recurring?t.date>=ui5.validStart&&t.date<=ui5.validEnd&&dayOf6(t.date)===r.day:t.date===r.date)&&sameTime(t)&&(roomsOverlap6(t.room,r.room)||(ui5.importType==='dl'&&t.proctorIds?.some(id=>r.proctorIds.includes(id)))));
 if(fixedConflict)return `ซ้อนกับรอบสอบ ${fixedConflict.date} ${fixedConflict.start}–${fixedConflict.end}`;
 const batch=ui5.importRows.find(t=>t.id!==r.id&&!ui6.skipIds.has(t.id)&&roomsOverlap6(t.room,r.room)&&sameTime(t)&&(recurring?t.day===r.day:t.date===r.date));
 return batch?'ซ้อนกับรายการอื่นในไฟล์ชุดนี้':'';
}
function importStatus6(row){const r=importDraft6(row);if(ui6.skipIds.has(row.id))return {kind:'excluded',label:'ข้าม',tone:''};const invalid=validateImportRow6(r);if(invalid)return {kind:'invalid',label:'ข้อมูลไม่ครบ',tone:'red',reason:invalid};if(importDuplicate5(r))return {kind:'duplicate',label:'มีอยู่แล้ว',tone:'',reason:'จะข้ามรายการซ้ำ'};if(row.needsReview&&!row.reviewed)return {kind:'review',label:'ต้องตรวจ',tone:'amber',reason:row.reviewReason};const conflict=importConflict6(r);return conflict?{kind:'conflict',label:'เวลาชน',tone:'amber',reason:conflict}:{kind:'ready',label:'ตรวจได้',tone:'green'};}
function importCounts6(){const counts={ready:0,review:0,duplicate:0,conflict:0,invalid:0,excluded:0};ui5.importRows.forEach(r=>counts[importStatus6(r).kind]++);return counts;}
function importSource6(){
 const row=ui5.importRows.find(r=>r.id===ui5.importSelected),selected=importDraft6(row||{}),room=ui5.importType==='dl'?'406':ui6.sourceRoom;
 if(ui5.importType==='dl'){
  const rows=ui5.importRows.map(importDraft6).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
  return `<section class="panel import-source6"><div class="panel-head"><h2>ต้นฉบับจำลอง</h2><span class="tag">ข้อมูลตัวอย่าง</span></div><div class="source-document6"><h3>ตารางคุมสอบ Digital Literacy</h3><p>จำนวนคนต่อรอบและผู้คุมสอบตามแต่ละรายการ</p><div class="source-dl-head6"><span>วัน / รอบสอบ</span><span>ผู้คุมสอบที่จับคู่แล้ว</span></div><div class="source-dl-scroll6">${rows.map(r=>`<button class="source-dl-row6 ${r.id===selected.id?'active':''}" data-action="import-row5" data-id="${r.id}" data-source-id="${r.id}"><span><strong>${thaiDate5(r.date)}</strong><small>${r.start}–${r.end}</small><small>${r.count} คนต่อรอบ</small></span><span>${(r.proctorIds||[]).map(id=>`<small>${e5(people.find(p=>p.id===id)?.name||'ยังไม่เลือก')}</small>`).join('')}</span></button>`).join('')}</div></div><p class="source-explanation6"><b>รายการที่เลือกเชื่อมกับแถวในต้นฉบับ</b><br>ตารางนี้เป็นตัวอย่างสังเคราะห์ ยังไม่อ่านรูปจริง ผู้คุมสอบต้องตรวจและจับคู่กับบัญชีก่อนยืนยัน</p></section>`;
 }
 const scale=narrow5()?24:30,items=ui5.importRows.map(importDraft6).filter(r=>roomsOverlap6(r.room||'',room)),days=items.some(r=>r.day==='อาทิตย์')?weekDays6:weekDays6.slice(0,6);
 return `<section class="panel import-source6"><div class="panel-head"><h2>ต้นฉบับจำลอง</h2><span class="tag">ข้อมูลตัวอย่าง</span></div><div class="source-toolbar6"><div class="source-tabs6">${['401','402','406','407'].map(id=>`<button data-action="source-room6" data-room="${id}" aria-pressed="${room===id}">${id}</button>`).join('')}</div><small>เลือกช่องเพื่อดูรายการที่ตรงกัน</small></div><div class="source-document6"><h3>ตารางการใช้ห้อง ${room}</h3><p>ตัวอย่างสังเคราะห์ · ภาคเรียน ${f4.semester} · 08:00–21:00</p><div class="source-plan6" style="--source-days:${days.length}"><span class="source-day6"></span>${days.map(d=>`<span class="source-day6">${d.slice(0,2)}</span>`).join('')}<div class="source-plan-hours6">${Array.from({length:14},(_,i)=>i+8).map(h=>`<span style="top:${(h-8)*scale}px">${h}</span>`).join('')}</div>${days.map(day=>`<div class="source-plan-day6">${items.filter(r=>r.day===day).map(r=>`<button class="source-block6 ${r.id===selected.id?'active':''} ${r.needsReview&&!r.reviewed?'needs-review':''}" data-action="import-row5" data-id="${r.id}" data-source-id="${r.id}" aria-label="ห้อง ${r.room} ${r.day} ${r.start} ${r.subject}" style="top:${(minute5(r.start)-480)/60*scale}px;height:${Math.max(22,(minute5(r.end)-minute5(r.start))/60*scale-2)}px"><strong>${e5(r.subject)}</strong><small>${r.start}–${r.end}</small><small>${e5(r.teacher)}</small></button>`).join('')}</div>`).join('')}</div></div><p class="source-explanation6"><b>ช่องที่เลือกเชื่อมกับรายการด้านขวา</b><br>ภาพนี้เป็นข้อมูลสังเคราะห์สำหรับทดลองขั้นตรวจ ยังไม่ได้อ่าน PDF หรือรูปจริง ช่องสีเทา “งดให้บริการ” เป็นข้อมูลประกอบ ไม่สร้างข้อห้ามเพิ่มตารางเรียน</p></section>`;
}
function importEditor6(row){
 const r=importDraft6(row),dl=ui5.importType==='dl',status=importStatus6(row);
 return `<section class="panel import-editor6"><div class="panel-head"><h2>ตรวจและแก้ไขรายการ</h2><span class="import-draft-label6">${icon('check')}<span id="import-draft-status6">ร่างการตรวจทาน</span></span></div>${['review','conflict','invalid'].includes(status.kind)?`<div class="import-issue6">${e5(status.reason)}</div>`:''}<form id="import-row-form5" data-id="${r.id}" class="form-grid">${field(dl?'กิจกรรม':'รายวิชา / กิจกรรม',input('import-row-subject5',r.subject,'text','required'),true)}${ui5.importType==='classroom'?field('วัน',select('import-row-day5',weekDays6,r.day)):field('วันที่สอบ',input('import-row-date5',r.date,'date','required'))}${field('ห้อง',dl?input('import-row-room5',r.room,'text','readonly'):select('import-row-room5',['401','402','406','407'],r.room))}${ui5.importType!=='classroom'?`<input type="hidden" name="import-row-day5" value="${r.day}">`:''}${field('เริ่ม',input('import-row-start5',r.start,'time','required'))}${field('สิ้นสุด',input('import-row-end5',r.end,'time','required'))}${dl?field('จำนวนคนต่อรอบ',input('import-row-count6',r.count,'number','min="1" required'),true)+field('ผู้คุมสอบที่จับคู่แล้ว',`<div class="stack" style="gap:8px">${[0,1,2].map(i=>select('import-proctor-'+i,[['','เลือกผู้คุมสอบ'],...people.map(p=>[p.id,p.name])],r.proctorIds?.[i]||'','aria-label="ผู้คุมสอบคนที่ '+(i+1)+'"')).join('')}</div>`,true):field('ผู้สอน / ผู้ประสานงาน',input('import-row-teacher5',r.teacher||''),true)}<p id="import-row-error5" class="field-error full" role="alert"></p><div class="full import-review-actions6">${button(row.needsReview&&!row.reviewed?'ยืนยันว่าตรวจรายการนี้แล้ว':'ใช้การแก้ไขรายการนี้','save-import-row5','check',row.needsReview&&!row.reviewed?'primary':'secondary')}${button(ui6.skipIds.has(r.id)?'นำรายการกลับ':'ข้ามรายการนี้','skip-import-row6','','link',`data-id="${r.id}"`)}</div></form></section>`;
}
const importCore6=renderers.imports;
renderers.imports=function(){
 const step=ui5.importStep,type=ui5.importType,typeName={classroom:'ตารางเรียนประจำสัปดาห์',exam:'ตารางสอบรายวิชา',dl:'ตารางสอบ Digital Literacy'}[type];
 if(step<2)return importCore6().replace('เลือกไฟล์','เลือกตาราง').replace('ต้นแบบรอบออกแบบนี้ยังไม่อ่านตารางจากไฟล์','ต้นแบบนี้ยังไม่อ่านตารางจากไฟล์');
 const progress=`<div class="import-steps" aria-label="ขั้นตอนนำเข้า">${['เลือกตาราง','ช่วงที่มีผล','ตรวจรายการ','ยืนยัน'].map((label,i)=>`<span class="import-step ${Math.min(step,3)===i?'active':''}" ${Math.min(step,3)===i?'aria-current="step"':''}>${i+1} · ${label}</span>`).join('')}</div>`,head=heading('','นำเข้าตารางเรียนและสอบ',typeName,step<4?action5('เริ่มใหม่','restart-import5','back'):'');
 const counts=importCounts6();
 if(step===2){
  const selected=ui5.importRows.find(r=>r.id===ui5.importSelected)||ui5.importRows[0],reviewed=ui5.importRows.filter(r=>!r.needsReview||r.reviewed).length;
  const filtered=ui5.importRows.filter(r=>ui6.importFilter==='all'||['review','invalid','conflict'].includes(importStatus6(r).kind));
  return head+progress+`<div class="import-layout6">${importSource6()}<div class="stack"><section class="panel"><div class="panel-head"><h2>รายการที่อ่านได้ในตัวอย่าง</h2><span class="caption">${ui5.importRows.length} รายการ</span></div><div class="import-progress6"><div class="progress-track6"><i style="width:${reviewed/ui5.importRows.length*100}%"></i></div><span>ตรวจแล้ว ${reviewed}/${ui5.importRows.length}</span></div><div style="margin-bottom:12px">${segment('import-filter6',[['all','ทั้งหมด'],['issues','ต้องตรวจ '+(counts.review+counts.invalid+counts.conflict)]],ui6.importFilter)}</div><div class="import-queue6">${filtered.map(r=>{const value=importDraft6(r),s=importStatus6(r);return row5(r.id,`${value.room} · ${value.day} ${value.start}–${value.end}`,value.subject,'import-row5','calendar',tag(s.label,s.tone),r.id===selected.id);}).join('')||empty5('ตรวจครบแล้ว','ไม่พบรายการที่ต้องตรวจเพิ่ม')}</div></section>${importEditor6(selected)}<div class="import-step-footer6">${action5('ย้อนกลับ','import-period-back5','back')}${button('ตรวจสรุปก่อนนำเข้า','import-summary5','chevron','primary')}</div></div></div>`;
 }
 if(step===3){
  const blocked=counts.review+counts.invalid,conflicts=counts.conflict,excluded=counts.excluded;
  return head+progress+`<div class="import-summary6">${panel('ตรวจชุดตารางก่อนยืนยัน',`<div class="summary-total6">${counts.ready}<small style="font-size:15px;margin-left:10px;font-weight:400">รายการพร้อมเพิ่ม</small></div><p class="summary-sub6">จาก ${ui5.importRows.length} รายการ · ภาคเรียน ${f4.semester}</p><div class="import-checks6"><div>${icon('calendar')}<span>ช่วงที่มีผล ${thaiDate5(ui5.validStart)} – ${thaiDate5(ui5.validEnd)}</span></div><div>${icon('check')}<span>ข้ามรายการซ้ำ ${counts.duplicate} รายการ · เลือกข้ามเอง ${excluded} รายการ</span></div><div>${icon('file')}<span>ใช้ข้อมูลจากร่างที่ตรวจล่าสุด การแก้ไขภายหลังใช้ฟอร์มเดิมได้</span></div></div>${blocked?`<div class="import-issue6" style="margin-top:20px">ยังมี ${blocked} รายการที่ต้องตรวจ / ข้อมูลไม่ครบ กลับตรวจรายการก่อนยืนยัน</div>`:''}${conflicts?`<div class="import-issue6" style="margin-top:18px"><strong>มี ${conflicts} รายการเวลาชน</strong><br>จะพักรายการเหล่านี้ไว้ โดยไม่เขียนทับตารางเดิม</div><label class="row" style="font-size:12px"><input type="checkbox" name="import-ack-conflicts6" ${ui6.ackConflicts?'checked':''}>รับทราบว่ารายการเวลาชนจะยังไม่ถูกเพิ่ม</label>`:''}<div class="row" style="margin-top:24px;justify-content:space-between">${action5('กลับตรวจรายการ','import-review-back5','back')}${button('ยืนยันนำเข้าตัวอย่าง','confirm-import5','check','primary',blocked||conflicts&&!ui6.ackConflicts?'disabled':'')}</div>`)}${conflicts?panel('รายการที่พักไว้',ui5.importRows.filter(r=>importStatus6(r).kind==='conflict').map(r=>`<div class="compact-event"><span class="tile-icon">${icon('alert')}</span><div><strong>${r.room} · ${r.day} ${r.start}–${r.end}</strong><small>${e5(importStatus6(r).reason)}</small></div></div>`).join('')):''}</div>`;
 }
 const result=ui6.importResult||{added:ui5.importAdded||0,duplicate:0,held:[],skipped:0};
 return head+progress+`<div class="import-summary6">${panel('',`<div class="empty-state"><span class="tile-icon">${icon('check')}</span><h2>เพิ่มชุดตารางตัวอย่างแล้ว</h2><p>เพิ่ม ${result.added} รายการ · ข้ามซ้ำ ${result.duplicate} · พักไว้ ${result.held.length} · เลือกข้าม ${result.skipped}</p><p class="caption">ข้อมูลอยู่เฉพาะต้นแบบ การรีโหลดจะเริ่มใหม่</p><div class="row" style="justify-content:center;margin-top:20px">${linkButton('ดูตารางเรียนและสอบรวม','classrooms','calendar','primary')}${action5('นำเข้าชุดถัดไป','restart-import5','upload')}</div></div>`)}${result.held.length?panel('รายการที่ยังไม่เพิ่ม',result.held.map(r=>`<div class="compact-event"><span class="tile-icon">${icon('clock')}</span><div><strong>${r.room} ${r.day} ${r.start}–${r.end}</strong><small>${e5(r.subject)}</small></div></div>`).join('')):''}</div>`;
};
Object.assign(actions,{
 'source-room6':b=>{if(!syncImport6())return;ui6.sourceRoom=b.dataset.room;render();},
 'import-row5':b=>{if(!syncImport6())return;ui5.importSelected=b.dataset.id;ui6.sourceRoom=importDraft6(ui5.importRows.find(r=>r.id===b.dataset.id)).room.split(' + ')[0];render();},
 'save-import-row5':()=>{if(!syncImport6())return;const r=ui5.importRows.find(r=>r.id===ui5.importSelected);r.reviewed=true;render();toast('เก็บการตรวจและแก้ไขรายการแล้ว');},
 'skip-import-row6':b=>{if(!syncImport6())return;const id=b.dataset.id;if(ui6.skipIds.has(id))ui6.skipIds.delete(id);else ui6.skipIds.add(id);render();},
 'import-summary5':()=>{if(!syncImport6())return;ui5.importStep=3;render();scrollTo({top:0,behavior:'instant'});},
 'import-review-back5':()=>{ui5.importStep=2;const issue=ui5.importRows.find(r=>['review','invalid'].includes(importStatus6(r).kind));if(issue){ui5.importSelected=issue.id;ui6.sourceRoom=issue.room.split(' + ')[0];}render();scrollTo({top:0,behavior:'instant'});},
 'confirm-import5':()=>{
  if(ui5.importStep!==3||!ensureOnline())return;const counts=importCounts6();if(counts.review||counts.invalid||counts.conflict&&!ui6.ackConflicts)return;
  // Capture the reviewed set before insertion, so order does not affect batch checks.
  const rows=ui5.importRows.filter(r=>importStatus6(r).kind==='ready').map(importDraft6),held=ui5.importRows.filter(r=>importStatus6(r).kind==='conflict').map(importDraft6);
  rows.forEach((r,i)=>{const id='SCHEDULE6-'+Date.now()+'-'+i;if(ui5.importType==='classroom')f4.classes.push({...r,id,semester:f4.semester,active:true,validFrom:ui5.validStart,validTo:ui5.validEnd,note:'ชุดตารางตัวอย่าง'});else if(ui5.importType==='dl')state.exams.push({id,date:r.date,time:r.start+'–'+r.end,count:r.count,rooms:r.room,proctorIds:[...r.proctorIds],proctors:r.proctorIds.map(id=>people.find(p=>p.id===id).name),active:true});else{ui5.examImports||=[];ui5.examImports.push({...r,id});}});
  ui5.importAdded=rows.length;ui6.importResult={added:rows.length,duplicate:counts.duplicate,held,skipped:counts.excluded};ui5.importStep=4;ui6.scheduleDate=ui5.importType==='classroom'?ui5.validStart:rows[0]?.date||ui5.validStart;render();scrollTo({top:0,behavior:'instant'});
 },
});
const segmentImportCore6=actions.segment;actions.segment=b=>{if(b.dataset.group==='import-filter6'){if(!syncImport6())return;ui6.importFilter=b.dataset.value;render();return;}segmentImportCore6(b);};
document.addEventListener('input',event=>{if(event.target.closest('#import-row-form5'))stashImport6();},true);
document.addEventListener('change',event=>{if(event.target.closest('#import-row-form5'))stashImport6();if(event.target.name==='import-ack-conflicts6'){ui6.ackConflicts=event.target.checked;render();}},true);

const designCore6=renderers.design;
renderers.design=()=>heading('','Glass และการเคลื่อนไหว','พื้นที่ตรวจแบบ · วัสดุ ตัวควบคุม และ Reduce Motion')+`<div class="grid cols-2">${panel('การตอบสนองของตัวควบคุม',`<div class="material" style="position:relative;border-radius:24px;padding:22px;margin-bottom:20px">${segment('motion-demo6',[['day','วัน'],['week','สัปดาห์'],['month','เดือน']],'week')}</div><div class="row wrap">${button('เปิดหน้าต่าง','motion-dialog6','plus','primary')}${action5('เปิดเมนู','appearance','settings')}${action5('แจ้งผลสำเร็จ','motion-toast6','check')}</div><p class="caption" style="margin-top:18px">ลองสลับตัวเลือกหรือกดต่อเนื่อง การเปลี่ยนสถานะไม่ต้องรอ animation จบ</p>`)}${panel('รูปแบบและการเข้าถึง',`<div class="stack"><div class="row between"><span>ลดการเคลื่อนไหว</span><button class="switch" role="switch" aria-label="ลดการเคลื่อนไหว" aria-checked="${!!state.settingValues.motion}" data-action="toggle-setting" data-key="motion"></button></div>${field('พื้นผิว',select('material',[['regular','โปร่งพอดี'],['tinted','เพิ่มความทึบ'],['solid','พื้นทึบ']],state.material))}${field('โหมดสี',select('appearance',[['system','ตามอุปกรณ์'],['light','สว่าง'],['dark','มืด']],state.appearance))}</div><p class="caption" style="margin-top:18px">Reduce Motion ของอุปกรณ์มีผลด้วย การปรับที่นี่ใช้กับต้นแบบเท่านั้น</p>`)}</div><div style="margin-top:20px">${designCore6().replace(/^.*?(?=<div class="grid cols-2">)/s,'')}</div>`;
actions['motion-dialog6']=()=>showSheet('รายละเอียดการทำงาน','ตัวอย่างการเปิดหน้าต่างจากปุ่มต้นทาง',facts5([['จังหวะเปิด','ต่อเนื่องจากตำแหน่งที่เลือก'],['ระหว่างใช้งาน','กด ยกเลิก หรือเปลี่ยนต่อได้ทันที'],['Reduce Motion','ไม่ขยาย ย้าย หรือเด้ง']]),button('เรียบร้อย','close-sheet','check','primary'));
actions['motion-toast6']=()=>toast('บันทึกเรียบร้อย · ข้อมูลตัวอย่าง');

window.designReview=Object.freeze({...review5,revision:6,getSummary(){return {...review5.getSummary(),revision:6,scheduleDate:ui6.scheduleDate,scheduleRows:scheduleRows6().map(r=>({...r})),importRows:ui5.importRows.map(r=>({...importDraft6(r)})),importCounts:importCounts6(),importResult:ui6.importResult};}});
render();
