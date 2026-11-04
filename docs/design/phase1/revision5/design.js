/* UI review 05. All records are synthetic, local, and reset on reload. */
'use strict';

const review4 = window.designReview;
const original5 = { ...renderers };
const ui5 = {
  logId: null, deviceId: 'HP-01', personId: 'DEMO-1', userId: 'DEMO-1',
  requestId: 'REQ-DEMO-01', templateId: 'TPL-0', resourceId: '303',
  logMonth: '2026-11', examDate: '2026-11-03', dlView: null, classView: null,
  settingsDetail: false, manualDraft: {}, broadcastTitle: 'ตรวจตารางคุมสอบประจำเดือน',
  broadcastMessage: 'โปรดตรวจรอบสอบและแจ้งหากมีเวลาซ้อนกัน', importStep: 0,
  importType: 'classroom', importRows: [], importSelected: null, importConfirmed: false,
  importFilename: '', validStart: '2026-11-02', validEnd: '', importError: '',
  duplicateChoice: 'keep-first', cleanupDone: false, analyticsTab: 'summary',
};
const narrow5 = () => innerWidth <= 760;
const e5 = value => escapeHTML(String(value ?? ''));
const thaiDate5 = (value, long = false) => new Date(value + 'T12:00:00+07:00').toLocaleDateString('th-TH', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' });
const thaiMonth5 = value => new Date(value + '-01T12:00:00+07:00').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
const dayNames5 = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const minute5 = time => Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]);
const facts5 = pairs => `<dl class="detail-facts">${pairs.map(([k,v]) => `<div><dt>${e5(k)}</dt><dd>${e5(v)}</dd></div>`).join('')}</dl>`;
const empty5 = (title, detail = 'ลองเปลี่ยนคำค้นหรือช่วงเวลา') => `<div class="empty-state"><span class="tile-icon">${icon('file')}</span><h3>${e5(title)}</h3><p>${e5(detail)}</p></div>`;
const status5 = value => {
  const map = {
    'บันทึกแล้ว':['บันทึกแล้ว','green'],
    pending:['รอตรวจ','amber'], approved:['อนุมัติ','green'], rejected:['ไม่อนุมัติ','red'],
    normal:['สมบูรณ์','green'], damaged:['ชำรุด','amber'], lost:['สูญหาย','red'],
    ready:['พร้อมใช้','green'], borrowed:['กำลังยืม','amber'], inactive:['หยุดใช้งาน',''],
  };
  const [label,tone] = map[value] || [value, value === 'ร่าง' ? 'amber' : ''];
  return tag(label,tone);
};
const action5 = (label, action, symbol = '', extra = '') => button(label, action, symbol, 'secondary', extra);
const inlineStats5 = items => `<div class="stat-inline">${items.map(([v,label]) => `<div><strong>${e5(v)}</strong><small>${e5(label)}</small></div>`).join('')}</div>`;
const row5 = (id, label, detail, action, symbol = 'file', trailing = '', active = false) => `<div class="data-row ${active?'active':''}"><button class="row-target" data-action="${action}" data-id="${id}"><span class="tile-icon">${icon(symbol)}</span><span class="grow"><strong>${e5(label)}</strong><small>${e5(detail)}</small></span></button><div class="row-trailing">${trailing}${icon('chevron','row-chevron')}</div></div>`;
const rowList5 = (rows, title = '') => `<section class="panel flush" ${title?`aria-label="${title}"`:''}><div class="data-list">${rows.join('') || empty5('ยังไม่มีรายการ')}</div></section>`;
const split5 = (content, detail, title, wide = false) => `<div class="workspace-split ${wide?'wide-detail':''}"><div class="stack">${content}</div><aside class="inspector optional-inspector" aria-label="${e5(title)}">${panel(title, detail)}</aside></div>`;
const showDetail5 = (title, detail, footer = '') => { if(narrow5() || innerWidth <= 900) showSheet(title,'ข้อมูลตัวอย่างสำหรับตรวจแบบ',detail,footer); else render(); };

// Correct the prototype's template metadata before it is presented anywhere.
const templateMeta5 = [
  ['เช็คอินห้องแลกเปลี่ยนความรู้','Smart · เปิด / ปิดห้องชั้น 3'],
  ['เปิดห้องเรียนชั้น 4','Smart · เปิด / ปิดห้องชั้น 4'],
  ['ยืมหูฟัง','Smart · ยืม / คืนหูฟัง'],
  ['ICIT account','Combo · เปิดใช้บัญชี 5 งาน'],
  ['ติดตั้ง Software','Combo · ติดตั้งโปรแกรม 6 งาน'],
  ['รับแจ้งและแก้ปัญหาทางโทรศัพท์','ทั่วไป · ต้องระบุรายละเอียด'],
  ['ยืมปลั๊กไฟ','Smart · ยืม / คืนปลั๊กพ่วง'],
  ['ยืม USB','Smart · ยืม / คืน USB'],
  ['ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย','ทั่วไป · งานที่ได้รับมอบหมาย'],
];
f4.templateRows.forEach((t,i) => Object.assign(t,{minorTask:templateMeta5[i][0],description:templateMeta5[i][1]}));
const fixtureTasks5 = ['ยืมหูฟัง','ช่วยเหลือการใช้งานคอมพิวเตอร์','คุมสอบ DL','เช็คอินห้องแลกเปลี่ยนความรู้','ICIT account','แก้ไขปัญหาการเชื่อมต่อ','คืนปลั๊กไฟ','ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย'];
state.logs.forEach((log,i) => { log.task=fixtureTasks5[i%8]; log.time=log.time.padStart(5,'0'); });
for(let i=1;i<8;i++)state.logs.push({id:'PERSONAL-DEMO5-'+i,date:'2026-10-'+String(i+3).padStart(2,'0'),time:'14:00',person:people[0].name,task:fixtureTasks5[i],detail:'รายการตัวอย่างสำหรับรูปแบบงานส่วนบุคคล',recipient:'',status:'บันทึกแล้ว'});
// Past periods have their own records, rather than scaling current totals.
for(const year of [2025,2024]) for(let month=0;month<12;month++) for(let person=0;person<8;person++) {
  const m=(month+9)%12+1, y=year+(month>2?1:0);
  state.logs.push({id:`HISTORY-${year}-${month}-${person}`,date:`${y}-${String(m).padStart(2,'0')}-${String(3+person).padStart(2,'0')}`,time:`${String(9+person%7).padStart(2,'0')}:00`,person:people[person].name,task:fixtureTasks5[(person+month)%8],detail:month%3?'ตรวจสอบและให้บริการแล้ว':'',recipient:'',status:'บันทึกแล้ว'});
}

const canView4 = canView;
canView = id => ['settings','about','help','resources','classrooms','dl'].includes(id) ? true : canView4(id);
for(const [id,title] of [['equipment','ทะเบียนอุปกรณ์'],['admin','งานรอจัดการ'],['system','เครื่องมือข้อมูล'],['imports','นำเข้าตารางเรียนและสอบ']])routes.find(r=>r[0]===id)[1]=title;
const navigation5 = [
  ['งานประจำวัน',[['record','บันทึกงาน','record'],['worklogs','ประวัติงาน','file'],['dashboard','ภาพรวม','grid']]],
  ['ตารางและทรัพยากร',[['classrooms','ตารางเรียน','calendar'],['dl','ตารางสอบ DL','calendar'],['resources','ห้องและทรัพยากร','monitor'],['equipment','ทะเบียนอุปกรณ์','headphones'],['usage','การใช้งานอุปกรณ์','chart']]],
  ['ทีมและรายงาน',[['staff','Staff Analytics','users'],['export','ส่งออกข้อมูล','download']]],
  ['ผู้ดูแล',[['admin','งานรอจัดการ','shield'],['users','ผู้ใช้และสิทธิ์','users'],['templates','เทมเพลตและ Combo','bolt'],['broadcast','ประกาศ','bell'],['system','เครื่องมือข้อมูล','layers']]],
];
const parents5 = { 'new-log':'record',condition:'usage','export-requests':'admin',audit:'system',cleanup:'system',imports:'classrooms','data-import':'system' };
const navGroups5 = () => navigation5.map(([title,items]) => [title,items.filter(([id])=>canView(id))]).filter(([,items])=>items.length);

header = function() {
  const auth = ['login','pending'].includes(state.route);
  document.body.dataset.auth=String(auth);
  const active=parents5[state.route]||state.route;
  const group=navGroups5().find(([,items])=>items.some(([id])=>id===active));
  $('#app-sidebar').innerHTML=`<a class="sidebar-brand" href="#/record"><img src="../../../../frontend/public/labboy-logo.png" alt="labboy"><span><strong>labboy Workload</strong><small>ICIT · พื้นที่ทำงาน</small></span></a><nav class="sidebar-menu" aria-label="เมนูงาน">${navGroups5().map(([title,items])=>`<section class="sidebar-group"><h2>${title}</h2>${items.map(([id,label,symbol])=>`<a class="sidebar-link ${active===id?'active':''}" href="#/${id}" ${active===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span>${id==='admin'?`<span class="count-badge">${f4.requests.filter(r=>r.status==='pending').length}</span>`:''}</a>`).join('')}</section>`).join('')}</nav><div class="sidebar-footer"><a class="sidebar-link" href="#/settings">${icon('settings')}ตั้งค่า</a><a class="sidebar-link" href="#/help">${icon('help')}คู่มือและความช่วยเหลือ</a><a class="workspace-person" href="#/profile"><span class="avatar">A</span><span><strong>${e5(f4.userMeta[0].name)}</strong><small>${state.role==='superadmin'?'Superadmin':state.role==='admin'?'Admin':'Staff'}</small></span></a></div>`;
  const unread=f4.notifications.filter(n=>!n.read).length;
  $('#app-header').innerHTML=`<div class="breadcrumb"><span>${e5(group?.[0]||'บัญชีและการตั้งค่า')}</span>${icon('chevron')}<strong>${e5(currentRoute()?.[1]||'พื้นที่ทำงาน')}</strong></div><a class="header-brand-mobile" href="#/record"><img src="../../../../frontend/public/labboy-logo.png" alt="labboy"><span>labboy</span></a><div class="header-actions"><button class="icon-btn desktop-only" data-action="routes" aria-label="ค้นหาหน้าและเครื่องมือ">${icon('search')}</button><button class="icon-btn" data-action="notifications" aria-label="การแจ้งเตือน ${unread} ยังไม่อ่าน">${icon('bell')}${unread?'<span class="unread-dot" aria-hidden="true"></span>':''}</button><button class="icon-btn appearance-control" data-action="appearance" aria-label="รูปแบบการแสดงผล">${icon(state.theme==='dark'?'moon':'sun')}</button><a class="avatar" href="#/profile" aria-label="โปรไฟล์ของฉัน">A</a></div>`;
  const mobile=state.role==='staff' ? [['record','บันทึก','record'],['worklogs','ประวัติ','file'],['resources','อุปกรณ์','headphones'],['dashboard','ภาพรวม','grid']] : [['record','บันทึก','record'],['dl','ตาราง','calendar'],['resources','อุปกรณ์','headphones'],['dashboard','ภาพรวม','grid']];
  const mobileActive=['equipment','usage','condition'].includes(state.route)?'resources':state.route==='classrooms'?'dl':active;
  $('#mobile-nav').innerHTML=mobile.map(([id,label,symbol])=>`<a class="nav-item ${id===mobileActive?'active':''}" href="#/${id}" ${id===mobileActive?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span></a>`).join('')+`<button class="nav-item ${!mobile.some(([id])=>id===mobileActive)?'active':''}" data-action="routes">${icon('grid')}<span>เพิ่มเติม</span></button>`;
};

routeMenu = function() {
  const utility=[['profile','โปรไฟล์ของฉัน','person'],['settings','ตั้งค่า','settings'],['help','คู่มือ','help'],['about','เกี่ยวกับแอป','help']];
  showSheet('พื้นที่ทำงาน','เลือกกลุ่มงานหรือหน้าที่ต้องการ',`<nav class="category-list" aria-label="หน้าสำหรับบทบาทนี้">${[...navGroups5(),['บัญชีและความช่วยเหลือ',utility]].map(([group,items])=>`<h3 class="quiet-heading">${group}</h3>${items.map(([id,label,symbol])=>`<a class="sidebar-link" href="#/${id}">${icon(symbol)}${label}</a>`).join('')}`).join('')}</nav>`);
};

function scope5(extra='') {
  return `<div class="scope-bar"><label>ปีงบประมาณ ${select('fiscal-year',['2570','2569','2568'],state.year)}</label><label>ช่วงเวลา ${select('fiscal-month',[['all','ทั้งปี'],...months.map((m,i)=>[String(i),m])],state.month)}</label><span class="spacer"></span><span class="scope-period caption">${state.month==='all'?fiscalLabel():months[Number(state.month)]+' '+(Number(state.month)<3?Number(state.year)-1:state.year)}</span>${extra}</div>`;
}
function fiscalRange5() {
  const start=Number(state.year)-544;
  if(state.month==='all') return [`${start}-10-01`,`${start+1}-09-30`];
  const i=Number(state.month),m=(i+9)%12+1,y=start+(i>2?1:0),last=new Date(y,m,0).getDate();
  return [`${y}-${String(m).padStart(2,'0')}-01`,`${y}-${String(m).padStart(2,'0')}-${last}`];
}
function scopedRows5(person='all') { const [a,b]=fiscalRange5();return state.logs.filter(l=>l.date>=a&&l.date<=b&&(person==='all'||l.person===person)); }
function aggregate5(rows,key) { const map=new Map();rows.forEach(r=>map.set(r[key],(map.get(r[key])||0)+1));return [...map].sort((a,b)=>b[1]-a[1]); }

function dailyContext5() {
  const exams=state.exams.filter(e=>e.date===f4.date&&e.active!==false);
  const day=dayNames5[(new Date(f4.date+'T12:00:00').getDay()+6)%7];
  const classes=f4.classes.filter(c=>c.active&&c.day===day&&(!c.validFrom||c.validFrom<=f4.date)&&(!c.validTo||c.validTo>=f4.date));
  const events=[...exams.map(e=>({start:e.time.split('–')[0],end:e.time.split('–')[1],title:'สอบ Digital Literacy',detail:`${e.count} คน / รอบ · ${e.rooms}`,note:`ผู้คุมสอบ ${e.proctors.length} คน`,kind:'dl'})),...classes.map(c=>({start:c.start,end:c.end,title:c.subject,detail:'ตารางเรียน · ห้อง '+c.room,note:c.teacher,kind:'classroom'}))].sort((a,b)=>a.start.localeCompare(b.start));
  return panel('ตารางวันนี้',`<p class="caption">${thaiDate5(f4.date,true)}</p>${events.length?events.map(e=>`<div class="compact-event ${e.kind}"><span class="event-time">${e.start}<br>${e.end}</span><i class="event-mark"></i><div><strong>${e5(e.title)}</strong><small>${e5(e.detail)}</small><small>${e5(e.note)}</small></div></div>`).join(''):empty5('ไม่มีรายการในวันนี้','ดูตารางวันที่อื่นได้จากตารางงาน')}${linkButton('ดูตาราง','dl','calendar','link')}`)+panel('ทรัพยากรพร้อมใช้',`<div class="resource-meta"><span>ห้อง <strong>${f4.rooms.filter(r=>!r.inUse).length}/${f4.rooms.length}</strong></span><span>อุปกรณ์ <strong>${state.devices.filter(d=>d.active&&!d.borrowed).length}/${state.devices.filter(d=>d.active).length}</strong></span></div>${linkButton('ตรวจสถานะรายชิ้น','resources','headphones','link')}`);
}

manualPanel = function() {
  const d=ui5.manualDraft;
  return `<form id="manual4" class="stack"><button type="button" class="task-search-trigger" data-action="task-picker">${icon('file')}<span class="grow"><small>หัวข้อรอง</small><strong>${e5(f4.task)}</strong></span>${icon('chevron')}</button><div class="form-grid">${field('วันที่',input('manual-date',d['manual-date']||f4.date,'date','required'))}${field('เวลา',input('manual-time',d['manual-time']||f4.time,'time','required'))}${field('งานหลัก',input('manual-main',sourceGroup(f4.task),'text','readonly'),true)}${field('กลุ่มงาน',input('manual-group',dutyGroup4(f4.task),'text','readonly'),true)}${field('ผู้รับบริการ (ถ้ามี)',input('manual-recipient',d['manual-recipient']||''),true)}${field('รายละเอียด',`<textarea name="manual-notes" rows="3" placeholder="สิ่งที่ดำเนินการหรือสิ่งที่ต้องติดตาม">${e5(d['manual-notes']||'')}</textarea>`,true)}</div><div class="suggestions">${['ให้คำแนะนำการใช้งาน','ตรวจสอบและแก้ไขแล้ว','ติดตามผลเพิ่มเติม'].map(text=>button(text,'comment-suggestion','','',`type="button" data-text="${text}"`)).join('')}</div>${button('ตรวจรายการก่อนบันทึก','manual-preview','check','primary full','type="button"')}</form>`;
};
quickLogPanel = function() {
  const all=f4.templateRows.filter(t=>t.active),pages=Math.max(1,Math.ceil(all.length/6));f4.quickPage=Math.max(0,Math.min(pages-1,f4.quickPage));
  return `<div class="quick-grid">${all.slice(f4.quickPage*6,f4.quickPage*6+6).map(t=>`<button class="quick-card" data-action="template-run" data-id="${t.id}"><span class="tile-icon">${icon(t.symbol)}</span><span><strong>${e5(t.name)}</strong><small>${e5(t.description||(t.kind==='combo'?t.items.length+' งาน · เลือกเฉพาะที่ทำ':t.minorTask))}</small></span></button>`).join('')}</div><div class="quick-pagination">${action5('ก่อนหน้า','quick-prev','back',f4.quickPage===0?'disabled':'')}<small>${f4.quickPage+1} / ${pages}</small>${action5('ถัดไป','quick-next','chevron',f4.quickPage===pages-1?'disabled':'')}</div>`;
};
function recording5(manual=false) {
  const p=currentPerson(),mode=manual?'manual':state.recordMode;
  return heading('',manual?'เพิ่มบันทึกงาน':'บันทึกงาน',manual?'ตรวจหัวข้อรองและรายละเอียดก่อนบันทึก':'เลือกงานที่ทำ แล้วตรวจรายการก่อนยืนยัน')+`<div class="workspace-split record-workspace"><div class="stack">${panel('งานของฉัน',`<div class="identity-row"><button class="staff-picker" data-action="${state.role==='staff'?'own-account':'staff-picker'}"><span class="avatar">${p.initial}</span><span class="grow"><small>${state.role==='staff'?'บันทึกงานของฉัน':'บันทึกให้'}</small><strong>${e5(p.name)}</strong></span>${icon('chevron')}</button></div><div class="record-meta">${manual?'<span class="caption">กรอกบันทึกงาน</span>':segment('record-mode',[['quick','บันทึกด่วน','bolt'],['manual','กรอกเอง','edit']],mode)}<button class="btn date-summary" data-action="date-time">${icon('calendar')}${thaiDate5(f4.date)} · ${f4.time}</button></div>${mode==='manual'?manualPanel():quickLogPanel()}`)}${panel('บันทึกล่าสุด',recentRows(3),'',linkButton('ดูประวัติ','worklogs','','link'))}</div><aside class="stack daily-context">${dailyContext5()}</aside></div>`;
}
renderers.record=()=>recording5();renderers['new-log']=()=>recording5(true);

function logDetail5(id) {
  const l=state.logs.find(l=>l.id===id);if(!l)return empty5('เลือกรายการงาน','รายละเอียดจะแสดงที่นี่');
  const locked=state.role==='staff'&&l.date<'2026-10-31';
  return `<div class="inspector-heading"><span class="tile-icon">${icon('file')}</span><div><strong>${e5(l.task)}</strong><small>${e5(l.id)}</small></div></div>${facts5([['ผู้ปฏิบัติงาน',l.person],['วันที่',thaiDate5(l.date)],['เวลา',l.time],['ผู้รับบริการ',l.recipient||'—'],['งานหลัก',sourceGroup(l.task)]])}<p class="detail-note">${e5(l.detail||'ไม่มีรายละเอียดเพิ่มเติม')}</p><div style="margin-top:14px">${status5(l.status)}</div>${locked?note('พ้นช่วงแก้ไขย้อนหลัง ติดต่อผู้ดูแลเพื่อขอแก้ไข','amber','lock'):`<div class="row-detail-actions">${action5('แก้ไข','edit-log','edit',`data-id="${l.id}"`)}${button('ลบรายการ','delete-log','close','danger',`data-id="${l.id}"`)}</div>`}`;
}
filteredLogs = function() {
  const q=state.search.toLowerCase();
  return state.logs.filter(l=>(state.role!=='staff'||l.person===people[0].name)&&l.date>=f4.start&&l.date<=f4.end&&`${l.person} ${l.task} ${l.detail} ${l.recipient||''}`.toLowerCase().includes(q)).sort((a,b)=>{const key=f4.sort, av=key==='person'?a.person:key==='task'?a.task:a.date+' '+a.time,bv=key==='person'?b.person:key==='task'?b.task:b.date+' '+b.time;return av.localeCompare(bv,'th')*(f4.ascending?1:-1);});
};
function monthGrid5(month, selected, counts, action, exam=false) {
  const [y,m]=month.split('-').map(Number),days=new Date(y,m,0).getDate(),offset=(new Date(y,m-1,1).getDay()+6)%7;
  return `<div class="calendar-grid">${['จ','อ','พ','พฤ','ศ','ส','อา'].map(d=>`<div class="weekday">${d}</div>`).join('')}${Array.from({length:Math.ceil((days+offset)/7)*7},(_,i)=>{const day=i-offset+1,valid=day>0&&day<=days,date=month+'-'+String(day).padStart(2,'0'),count=counts(date);return valid?`<button class="calendar-cell ${date===selected?'selected':''}" data-action="${action}" data-date="${date}" data-day="${day}" aria-label="${thaiDate5(date)} ${count} ${exam?'รอบสอบ':'รายการงาน'}"><span class="date-number">${day}</span>${count?`<span class="calendar-count">${count} ${exam?'รอบ':'งาน'}</span>`:''}</button>`:'<div class="calendar-cell faded" aria-hidden="true"></div>';}).join('')}</div>`;
}
renderers.worklogs=function() {
  const rows=filteredLogs(),pages=Math.max(1,Math.ceil(rows.length/f4.pageSize));f4.page=Math.min(f4.page,pages);const shown=rows.slice((f4.page-1)*f4.pageSize,f4.page*f4.pageSize);
  const checked=shown.length&&shown.every(l=>f4.selected.has(l.id));
  const toolbar=`<div class="command-bar">${segment('log-view',[['list','รายการ','file'],['calendar','ปฏิทิน','calendar']],f4.logView)}${search('ค้นหางาน ผู้รับบริการ หรือเจ้าหน้าที่')}<span class="date-filter-control">${action5('ช่วงวันที่','log-range5','calendar')}</span>${f4.logView==='list'?action5('เลือกหลายรายการ','select-mode5','check'):''}</div><p class="scope-summary">${thaiDate5(f4.start)} – ${thaiDate5(f4.end)} · ${rows.length} รายการ ${state.search?'· คำค้น “'+e5(state.search)+'”':''} ${button('ล้างตัวกรอง','reset-logs5','','link')}</p>`;
  const tableHeader=`<input type="checkbox" id="select-log-page" aria-label="เลือกทั้งหน้า" ${checked?'checked':''}>`;
  const desktop=table([tableHeader,`<button class="sort-heading" data-action="sort-logs" data-sort="date">วัน / เวลา ${icon('down')}</button>`,'ผู้ปฏิบัติงาน',`<button class="sort-heading" data-action="sort-logs" data-sort="task">หัวข้อรอง ${icon('down')}</button>`,'สถานะ',''],shown.map(l=>[`<input type="checkbox" data-log="${l.id}" aria-label="เลือกรายการ ${l.id}" ${f4.selected.has(l.id)?'checked':''}>`,`<strong>${thaiDate5(l.date)}</strong><small>${l.time}</small>`,e5(l.person),`<strong>${e5(l.task)}</strong><small>${e5(l.detail)}</small>`,status5(l.status),button('รายละเอียด','open-log5','chevron','',`data-id="${l.id}"`)]),'ประวัติงาน');
  const mobile=shown.map(l=>`<div class="data-row ${ui5.logId===l.id?'active':''}">${ui5.selectMode?`<input type="checkbox" data-log="${l.id}" aria-label="เลือกรายการ ${l.id}" ${f4.selected.has(l.id)?'checked':''}>`:''}<button class="row-target" data-action="open-log5" data-id="${l.id}"><span class="grow"><strong>${e5(l.task)}</strong><small>${thaiDate5(l.date)} · ${l.time}</small><small>${e5(l.person)}${l.recipient?' · '+e5(l.recipient):''}</small></span></button><span>${status5(l.status)}</span>${icon('chevron','row-chevron')}</div>`).join('');
  const footer=`<div class="table-footer"><span>${rows.length} รายการ · หน้า ${f4.page}/${pages}</span><div class="row">${action5('ก่อนหน้า','logs-prev','back',f4.page===1?'disabled':'')}${action5('ถัดไป','logs-next','chevron',f4.page===pages?'disabled':'')}</div></div>`;
  const content=f4.logView==='calendar'?panel('',`<div class="calendar-toolbar"><div class="calendar-title">${action5('ก่อนหน้า','log-month5','back','data-dir="-1"')}${thaiMonth5(ui5.logMonth)}${action5('ถัดไป','log-month5','chevron','data-dir="1"')}</div></div>${monthGrid5(ui5.logMonth,f4.start===f4.end?f4.start:'',date=>rows.filter(l=>l.date===date).length,'log-day5')}`):`<section class="panel flush"><div class="worklog-desktop-table">${desktop}</div><div class="worklog-mobile-list">${mobile||empty5('ไม่มีงานตรงกับตัวกรอง')}</div>${!shown.length?'<div class="desktop-only">'+empty5('ไม่มีงานตรงกับตัวกรอง')+'</div>':''}${footer}</section>`;
  const selected=f4.selected.size?`<div class="selection-bar material"><strong>${f4.selected.size} รายการ</strong>${action5('ส่งออก','selected-export','download')}${button('ลบที่เลือก','delete-selected','close','danger')}${button('ล้าง','clear-log-selection')}</div>`:'';
  return heading('','ประวัติงาน','ค้นหา ตรวจรายละเอียด และจัดการรายการงาน',linkButton('เพิ่มบันทึก','new-log','plus','primary'))+toolbar+split5(content,logDetail5(ui5.logId),'รายละเอียดงาน')+selected+(f4.undo?`<div class="note" style="margin-top:16px">ลบรายการในต้นแบบแล้ว ${button('เลิกทำ','undo-logs','refresh','link')}</div>`:'');
};

Object.assign(actions,{
 'open-log5':b=>{ui5.logId=b.dataset.id;showDetail5('รายละเอียดงาน',logDetail5(ui5.logId));},
 'select-mode5':()=>{ui5.selectMode=!ui5.selectMode;render();},
 'log-range5':()=>showSheet('ช่วงวันที่','กรองประวัติงานด้วยวันเริ่มและวันสิ้นสุด',`<form id="log-range5" class="form-grid">${field('เริ่ม',input('log5-start',f4.start,'date','required'))}${field('ถึง',input('log5-end',f4.end,'date','required'))}<p id="log5-error" class="field-error full"></p></form>`,button('ใช้ช่วงนี้','apply-log-range5','check','primary')),
 'apply-log-range5':()=>{if(!$('#log-range5').reportValidity())return;const a=$('[name="log5-start"]').value,b=$('[name="log5-end"]').value;if(a>b){$('#log5-error').textContent='วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่ม';return;}f4.start=a;f4.end=b;f4.page=1;closeSheet();render();},
 'reset-logs5':()=>{[f4.start,f4.end]=['2026-10-01','2027-09-30'];state.search='';f4.page=1;render();},
 'log-month5':b=>{const d=new Date(ui5.logMonth+'-01T12:00:00');d.setMonth(d.getMonth()+Number(b.dataset.dir));ui5.logMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render();},
 'log-day5':b=>{f4.start=f4.end=b.dataset.date;f4.logView='list';f4.page=1;render();},
});

function examDetail5() {
  const rows=state.exams.filter(e=>e.date===ui5.examDate&&e.active!==false);
  return `<p class="caption">${thaiDate5(ui5.examDate,true)}</p>${rows.length?rows.map(e=>`<div class="compact-event"><span class="event-time">${e.time.split('–').join('<br>')}</span><i class="event-mark"></i><div class="grow"><strong>สอบ DL · ${e.examType||'นักศึกษา'}</strong><small>${e.count} คนต่อรอบ · ${e.rooms}</small><small>ผู้คุมสอบ ${e.proctors.length} คน</small><small>${e5(e.proctors.join(', '))}</small>${e.notes?`<small>${e5(e.notes)}</small>`:''}${state.role!=='staff'?button('แก้ไขรอบ','edit-exam4','edit','link',`data-id="${e.id}"`):''}</div></div>`).join(''):empty5('ไม่มีรอบสอบในวันนี้')}`;
}
renderers.dl=function() {
  const month=`${state.examYear}-${String(state.examMonth).padStart(2,'0')}`,rows=state.exams.filter(e=>e.date.startsWith(month)&&e.active!==false),mode=ui5.dlView||(narrow5()?'agenda':'month');
  const tools=state.role==='staff'?'':action5('นำเข้ารูปตาราง','open-dl-import5','upload')+button('เพิ่มรอบสอบ','add-exam','plus','primary');
  const bar=`<div class="command-bar"><div class="calendar-title">${action5('เดือนก่อน','dl-month5','back','data-dir="-1"')}${thaiMonth5(month)}${action5('เดือนถัดไป','dl-month5','chevron','data-dir="1"')}</div><span class="spacer"></span>${segment('dl-view5',[['agenda','รายการ','file'],['month','เดือน','calendar']],mode)}</div><div class="info-strip"><span><strong>${rows.length}</strong>รอบสอบ</span><span>75 คน / รอบในตารางตัวอย่าง</span><span>ผู้คุมสอบ 3 คน / รอบ</span></div>`;
  const agenda=rows.length?panel('',[...new Set(rows.map(e=>e.date))].sort().map(date=>`<h2 class="agenda-date">${thaiDate5(date,true)}</h2>${rows.filter(e=>e.date===date).map(e=>`<button class="agenda-row" data-action="exam-day5" data-date="${date}"><span class="event-time">${e.time.split('–').join('<br>')}</span><i class="event-mark"></i><span class="grow"><strong>สอบ Digital Literacy</strong><small>${e.count} คนต่อรอบ · ${e.rooms}</small><small>${e5(e.proctors.join(', '))}</small></span>${icon('chevron')}</button>`).join('')}`).join('')):panel('',empty5('เดือนนี้ยังไม่มีรอบสอบ','เพิ่มรอบสอบใหม่ หรือเลือกเดือนอื่น'));
  const calendar=panel('',`<div class="calendar-toolbar"><h2>${thaiMonth5(month)}</h2><span class="tag">เลือกวันเพื่อดูรายละเอียด</span></div>${monthGrid5(month,ui5.examDate,date=>rows.filter(e=>e.date===date).length,'exam-day5',true)}<div class="calendar-legend"><span><i class="dl"></i>Digital Literacy</span><span>แสดงเวลาเริ่ม–จบของแต่ละรอบในรายละเอียด</span></div>`);
  return heading('','ตารางสอบ DL','จัดรอบสอบ ห้อง และผู้คุมสอบในพื้นที่เดียว',tools)+bar+split5(mode==='month'?calendar:agenda,examDetail5(),'รายละเอียดรอบสอบ');
};

function classCalendar5(rows) {
  const hours=Array.from({length:14},(_,i)=>i+8);
  return `<div class="week-scroll" tabindex="0" aria-label="ตารางเรียนวันจันทร์ถึงเสาร์ เวลา 08:00 ถึง 21:00"><div class="week-grid"><div class="week-head">เวลา</div>${dayNames5.map(d=>`<div class="week-head">${d}</div>`).join('')}<div class="week-hours">${hours.map(h=>`<span style="top:${(h-8)*50}px">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>${dayNames5.map(day=>{const dayRows=rows.filter(r=>r.day===day);return `<div class="week-day">${dayRows.map(r=>{const conflicts=dayRows.filter(t=>t.start<r.end&&t.end>r.start),lane=conflicts.findIndex(t=>t.id===r.id),width=100/conflicts.length;return `<button class="week-event" data-action="${state.role==='staff'?'view-class5':'edit-class4'}" data-id="${r.id}" style="top:${(minute5(r.start)-480)/60*50}px;height:${Math.max(34,(minute5(r.end)-minute5(r.start))/60*50-3)}px;left:calc(${lane*width}% + 3px);width:calc(${width}% - 6px)" aria-label="${e5(r.subject)} ${r.start} ถึง ${r.end} ห้อง ${r.room}"><strong>${e5(r.subject)}</strong><small>${r.start}–${r.end}</small><small>ห้อง ${r.room}</small></button>`;}).join('')}</div>`;}).join('')}</div></div>`;
}
renderers.classrooms=function() {
  const rows=f4.classes.filter(r=>r.semester===f4.semester&&(state.room==='ทั้งหมด'||r.room===state.room)),mode=ui5.classView||(narrow5()?'agenda':'week');
  const tools=state.role==='staff'?'':action5('นำเข้า PDF','open-class-import5','upload')+button('เพิ่มตารางเรียน','add-class','plus','primary');
  const bar=`<div class="command-bar"><label>ภาคเรียน ${select('class-semester',['2/2569','1/2570','1/2569'],f4.semester)}</label><label>ห้อง ${select('room',['ทั้งหมด','401','402','406','407'],state.room)}</label><span class="spacer"></span>${segment('class-view5',[['agenda','รายการ','file'],['week','สัปดาห์','calendar']],mode)}</div>`;
  const list=panel('',rows.length?dayNames5.filter(day=>rows.some(r=>r.day===day)).map(day=>`<h2 class="agenda-date">${day}</h2>${rows.filter(r=>r.day===day).map(r=>`<div class="data-row">${state.role!=='staff'?'<input type="checkbox" data-class="'+r.id+'" aria-label="เลือกชั้นเรียน '+r.id+'" '+(f4.classSelection.has(r.id)?'checked':'')+'>':''}<button class="row-target" data-action="${state.role==='staff'?'view-class5':'edit-class4'}" data-id="${r.id}"><span class="event-time">${r.start}<br>${r.end}</span><span class="event-mark" style="background:var(--calendar-class)"></span><span class="grow"><strong>${e5(r.subject)}</strong><small>ห้อง ${r.room} · ${e5(r.teacher||'ไม่ระบุผู้สอน')}</small>${r.note?`<small>${e5(r.note)}</small>`:''}</span></button><span>${r.active?status5('ready'):status5('inactive')}</span></div>`).join('')}`).join(''):empty5('ภาคเรียนนี้ยังไม่มีตารางเรียน','นำเข้า PDF หรือเพิ่มรายการด้วยฟอร์มเดิม'));
  const selection=f4.classSelection.size?`<div class="selection-bar material"><strong>${f4.classSelection.size} รายการ</strong>${action5('เปิดใช้','bulk-class4','check','data-active="true"')}${action5('ปิดใช้','bulk-class4','close','data-active="false"')}</div>`:'';
  return heading('','ตารางเรียน','ตารางประจำสัปดาห์ · จันทร์–เสาร์ · 08:00–21:00',tools)+bar+(mode==='week'?panel('ตารางประจำภาคเรียน',classCalendar5(rows.filter(r=>r.active))):list)+`<div class="calendar-legend"><span><i></i>ตารางเรียน</span><span><i class="dl"></i>ตารางสอบ DL ดูแยกในเมนูตารางสอบ</span></div><div class="row" style="margin-top:19px">${state.role!=='staff'?action5('คัดลอกภาคเรียน','copy-classes4','layers'):''}<small>${rows.length} รายการในภาคเรียนนี้</small></div>`+selection;
};
const classEditor4=classEditor;
classEditor=function(id){classEditor4(id);const el=$('[name="class-day"]');for(const day of ['เสาร์','อาทิตย์'])el.add(new Option(day,day));const row=f4.classes.find(r=>r.id===id);if(row)el.value=row.day;};
const saveExam5=actions['save-exam4'];actions['save-exam4']=()=>{const date=$('[name="exam-date"]').value;saveExam5();if(!$('#sheet').open){ui5.examDate=date;render();}};
Object.assign(actions,{
 'dl-month5':b=>{const date=new Date(state.examYear,state.examMonth-1+Number(b.dataset.dir),1);state.examYear=date.getFullYear();state.examMonth=date.getMonth()+1;ui5.examDate=`${state.examYear}-${String(state.examMonth).padStart(2,'0')}-01`;render();},
 'exam-day5':b=>{ui5.examDate=b.dataset.date;showDetail5('รายละเอียดรอบสอบ',examDetail5());},
 'open-class-import5':()=>{ui5.importType='classroom';location.hash='/imports';},
 'open-dl-import5':()=>{ui5.importType='dl';location.hash='/imports';},
});

function trend5(rows) {
  const [start]=fiscalRange5(),y=Number(start.slice(0,4));
  const values=months.map((_,i)=>{const m=(i+9)%12+1,year=y+(i>2?1:0);return rows.filter(r=>r.date.startsWith(`${year}-${String(m).padStart(2,'0')}`)).length;});
  return lineChart(values,months);
}
function dashboardRows5() {
  const person=state.role==='staff'?people[0].name:people.find(p=>p.id===f4.person)?.name||'all';
  return scopedRows5(person);
}
actions['work-distribution5']=()=>{
  const rows=dashboardRows5(),counts=key=>aggregate5(rows.map(r=>({...r,bucket:key(r)})),'bucket');
  const chart=(title,data)=>panel(title,data.length?ranks(data,Math.max(...data.map(r=>r[1]))):empty5('ไม่มีรายการในช่วงนี้'));
  const main=counts(r=>sourceGroup(r.task)||'ยังไม่จัดกลุ่ม'),minor=counts(r=>r.task),hours=counts(r=>r.time.slice(0,2)+':00'),team=counts(r=>r.person);
  showSheet('รายละเอียดการกระจายงาน','ใช้เจ้าหน้าที่และช่วงเวลาเดียวกับภาพรวม',`<p class="caption">${rows.length} รายการ · ${fiscalLabel()} · ความถี่ไม่ใช่ระยะเวลาหรือคุณภาพงาน</p><div class="stack">${chart('งานในหน้าที่หลัก',main)}${chart('หัวข้อรองทั้งหมด',minor)}${chart('จำนวนรายการตามชั่วโมง',hours)}${state.role!=='staff'?chart('จำนวนงานรายเจ้าหน้าที่',team):''}<p class="detail-note">บริบทภาคเรียนและช่วงสอบให้ตรวจจากตารางเรียนและตารางสอบ ไม่กำหนดช่วงสอบจากเดือนโดยอัตโนมัติ</p><div class="row">${linkButton('ตารางเรียน','classrooms','calendar','secondary')}${linkButton('ตารางสอบ DL','dl','calendar','secondary')}</div></div>`);
};
function dashboard5() {
  const person=people.find(p=>p.id===f4.person)?.name||'all',rows=scopedRows5(state.role==='staff'?people[0].name:person),tasks=aggregate5(rows,'task'),days=new Set(rows.map(r=>r.date));
  const detail=`<div class="stack">${dailyContext5()}</div>`;
  return heading('','ภาพรวมงาน',state.role==='staff'?'ภาพรวมบันทึกของฉันและงานที่เกี่ยวข้อง':'ภาพรวมทีมและสิ่งที่ต้องดูแลต่อ',linkButton('บันทึกงาน','record','plus','primary'))+scope5(state.role!=='staff'?`<label>เจ้าหน้าที่ ${select('analytics-person',[['all','ทุกคน'],...people.map(p=>[p.id,p.name])],f4.person)}</label>`:'')+metrics([['รายการงาน',rows.length,'ในช่วงที่เลือก','file'],['ผู้ปฏิบัติงาน',new Set(rows.map(r=>r.person)).size,'มีรายการในช่วงนี้','users'],['วันที่มีบันทึก',days.size,'วันตามข้อมูลตัวอย่าง','calendar'],['ประเภทงาน',tasks.length,'แยกตามหัวข้อรอง','layers']])+split5(panel('แนวโน้มการบันทึกงาน',rows.length?trend5(rows):empty5('ยังไม่มีบันทึกในช่วงนี้'),'','<span class="caption">หน่วย: รายการ</span>')+panel('งานที่บันทึกบ่อย',tasks.length?ranks(tasks.slice(0,6),Math.max(...tasks.map(t=>t[1]))):empty5('ยังไม่มีประเภทงาน'))+`<div class="row" style="margin-top:2px">${action5('การกระจายงาน','work-distribution5','layers')}${action5('ดูรูปแบบช่วงเวลา','show-time-pattern5','chart')}${linkButton('ดูรายการทั้งหมด','worklogs','file','link')}</div>`,detail,'วันนี้และทรัพยากร');
}
renderers.dashboard=dashboard5;
actions['show-time-pattern5']=()=>{const rows=dashboardRows5(),counts=Array.from({length:7},()=>Array(6).fill(0));rows.forEach(r=>{const d=(new Date(r.date+'T12:00:00').getDay()+6)%7,h=Math.min(5,Math.max(0,Math.floor((Number(r.time.slice(0,2))-8)/2)));counts[d][h]++;});showSheet('รูปแบบช่วงเวลา','นับความถี่รายการ ไม่ใช่ระยะเวลาทำงาน',`<div class="heatmap"><span></span>${['จ','อ','พ','พฤ','ศ','ส','อา'].map(d=>`<span>${d}</span>`).join('')}${[8,10,12,14,16,18].map((h,i)=>`<span>${h}:00</span>${counts.map(a=>`<button data-action="heat-cell" data-value="${a[i]}" data-hour="${h}" style="background:${a[i]?'var(--blue)':'var(--soft)'}" aria-label="${a[i]} รายการ">${a[i]}</button>`).join('')}`).join('')}</div><p class="caption" style="margin-top:15px">${fiscalLabel()} · ตัวเลขคง contrast แม้มีงานน้อย</p>`);};

function personStats5(p,rows=scopedRows5(p.name)) {
  const dayCounts=aggregate5(rows,'date');
  return {count:rows.length,volume:rows.length,versatility:new Set(rows.map(r=>r.task)).size,consistency:new Set(rows.map(r=>r.date)).size,peakHandling:dayCounts[0]?.[1]||0,documentation:rows.length?Math.round(rows.filter(r=>r.detail?.trim()).length/rows.length*100):0,combo:rows.filter(r=>r.batch||r.detail?.startsWith('Combo')).length};
}
staffRows4=function(){return people.map(p=>({...p,...personStats5(p)})).filter(p=>p.name.toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>b[f4.staffSort]-a[f4.staffSort]);};
function staffRadar5(p) {
  const keys=['volume','versatility','consistency','peakHandling','documentation','combo'],labels=['ปริมาณ','หลากหลาย','วันมีงาน','วันหนาแน่น','รายละเอียด','Combo'];
  const stats=personStats5(p),team=people.map(p=>personStats5(p));
  const point=(i,r)=>[180+Math.cos(i*Math.PI/3-Math.PI/2)*88*r,145+Math.sin(i*Math.PI/3-Math.PI/2)*88*r];
  return `<svg class="radar" viewBox="0 0 360 300" role="img" aria-label="รูปแบบบันทึกงาน 6 มิติ"><title>รูปแบบบันทึกงาน 6 มิติ เทียบค่าสูงสุดของชุดข้อมูลเดียวกัน</title>${[.25,.5,.75,1].map(r=>`<polygon points="${keys.map((_,i)=>point(i,r).join(',')).join(' ')}" fill="none" stroke="var(--line)"/>`).join('')}<polygon points="${keys.map((k,i)=>point(i,stats[k]/Math.max(1,...team.map(s=>s[k]))).join(',')).join(' ')}" fill="var(--blue)" stroke="var(--accent)" stroke-width="2"/>${labels.map((l,i)=>{const [x,y]=point(i,1.38);return `<text x="${x}" y="${y}" text-anchor="middle">${l}</text>`;}).join('')}</svg>`;
}
function personDetail5(p) {
  const rows=scopedRows5(p.name),s=personStats5(p,rows);
  return `<div class="inspector-heading"><span class="avatar">${p.initial}</span><div><strong>${e5(p.name)}</strong><small>${state.month==='all'?'ปีงบ '+state.year:months[Number(state.month)]+' · ปีงบ '+state.year}</small></div></div><div class="people-stats">${[[s.count,'รายการ'],[s.versatility,'หัวข้อรอง'],[s.consistency,'วันที่มีงาน'],[s.peakHandling,'งานสูงสุดต่อวัน'],[s.documentation+'%','มีรายละเอียด'],[s.combo,'รายการ Combo']].map(([v,l])=>`<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div><div style="margin-top:19px">${panel('หัวข้อรองที่ทำบ่อย',rows.length?ranks(aggregate5(rows,'task').slice(0,5),Math.max(1,s.count)):empty5('ยังไม่มีงานในช่วงนี้'))}</div><details style="margin-top:18px"><summary class="caption">ดูรูปแบบ 6 มิติและความหมาย</summary>${staffRadar5(p)}<p class="caption">เทียบค่าสูงสุดของทีมในช่วงเดียวกัน แต่ละแกนมีหน่วยต่างกัน ใช้อ่านรูปแบบบันทึกเพื่อวางแผนงาน</p></details>`;
}
renderers.staff=function() {
  const rows=staffRows4(),selected=people.find(p=>p.id===ui5.personId)||people[0];
  const toolbar=`<div class="command-bar">${search('ค้นหาเจ้าหน้าที่')}<label>เรียงตาม ${select('staff-sort',[['count','จำนวนงาน'],['versatility','หัวข้อรอง'],['consistency','วันที่มีงาน'],['peakHandling','งานในวันหนาแน่น'],['documentation','รายละเอียด'],['combo','Combo']],f4.staffSort)}</label><span class="spacer"></span>${action5('ส่งออก CSV','staff-csv','download')}</div>`;
  const list=rowList5(rows.map(p=>row5(p.id,p.name,`${p.versatility} หัวข้อรอง · ${p.consistency} วันที่มีบันทึก`,'person-detail5','person',`<strong>${p.count}</strong><small>รายการ</small>`,p.id===ui5.personId)),'เจ้าหน้าที่ในช่วงที่เลือก');
  return heading('','Staff Analytics','ดูการกระจายงานเพื่อวางแผนกำลังคน')+scope5()+toolbar+split5(list,personDetail5(selected),'รายละเอียดเจ้าหน้าที่',true)+`<p class="caption" style="margin-top:16px">จำนวนรายการและรูปแบบการบันทึกต้องอ่านร่วมกับความยากและบริบทของงาน</p>`;
};
actions['person-detail5']=b=>{ui5.personId=b.dataset.id;showDetail5('รายละเอียดเจ้าหน้าที่',personDetail5(people.find(p=>p.id===ui5.personId)));};
const personContent5=personDetail5;
personDetail5=function(p){const rows=staffRows4(),index=rows.findIndex(r=>r.id===p.id);return personContent5(p)+`<div class="row between" style="margin-top:17px">${action5('ก่อนหน้า','person-step5','back',`data-dir="-1" ${index<=0?'disabled':''}`)}<small>${index+1} / ${rows.length}</small>${action5('ถัดไป','person-step5','chevron',`data-dir="1" ${index>=rows.length-1?'disabled':''}`)}</div>`;};
actions['person-step5']=b=>{const rows=staffRows4(),index=rows.findIndex(r=>r.id===ui5.personId),p=rows[index+Number(b.dataset.dir)];if(p){ui5.personId=p.id;showDetail5('รายละเอียดเจ้าหน้าที่',personDetail5(p));}};
actions['view-class5']=b=>{const r=f4.classes.find(r=>r.id===b.dataset.id);showSheet('รายละเอียดตารางเรียน',r.subject,`${facts5([['วัน',r.day],['เวลา',r.start+'–'+r.end],['ห้อง',r.room],['ผู้สอน',r.teacher||'—'],['ภาคเรียน',r.semester]])}<p class="detail-note">${e5(r.note||'ไม่มีหมายเหตุเพิ่มเติม')}</p>`);};

function resourceDetail5(id) {
  const room=f4.rooms.find(r=>r.id===id),d=state.devices.find(d=>d.id===id);
  if(room)return `<div class="inspector-heading"><span class="tile-icon">${icon('monitor')}</span><div><strong>ห้อง ${room.id}</strong><small>ชั้น ${room.floor}</small></div></div>${room.inUse?status5('borrowed'):status5('ready')}${facts5([['ระบบปฏิบัติการ',room.os],['ประเภท',room.floor==='3'?'แลกเปลี่ยนความรู้':'ห้องเรียน']])}<div class="row-detail-actions">${action5('ดูประวัติ','resource-history','file')}</div><details style="margin-top:18px"><summary class="caption">ภาพจำลองและข้อมูลเพิ่มเติม</summary><div class="inspector-scene" style="height:130px;display:grid;place-items:center">${icon('monitor')}</div><p class="caption">ภาพสัญลักษณ์ประกอบ</p></details>`;
  if(!d)return empty5('เลือกรายการ');
  return `<div class="inspector-heading"><span class="tile-icon">${icon(d.type)}</span><div><strong>${e5(d.name)}</strong><small>${d.id}</small></div></div>${status5(!d.active?'inactive':d.borrowed?'borrowed':'ready')}${facts5([['สังกัด',d.location],['สภาพ',{normal:'สมบูรณ์',damaged:'ชำรุด',lost:'สูญหาย'}[d.condition]],['Barcode',d.barcode],['Item No.',d.itemNo],['จำนวนครั้งยืม',d.uses],['แสดงในบันทึกด่วน',d.active?'แสดง':'หยุดแสดง']])}<div class="row-detail-actions">${state.role!=='staff'?action5('แก้ไข','edit-device','edit',`data-id="${d.id}"`):''}${action5('ประวัติ','resource-history','file')}</div><p class="caption" style="margin-top:16px">การย้ายสังกัดอัปเดตรายการให้เลือกในบันทึกด่วน โดยคงข้อความในประวัติเดิม</p>`;
}
renderers.resources=function(){
  const rooms=f4.resourceTab==='rooms',query=state.search.toLowerCase();
  const content=rooms?['3','4'].map(floor=>panel('ห้องบริการ ชั้น '+floor,`<div class="data-list">${f4.rooms.filter(r=>r.floor===floor&&r.id.includes(query)).map(r=>row5(r.id,'ห้อง '+r.id,r.os,'resource-detail5','monitor',r.inUse?tag('ใช้งาน','amber'):status5('ready'),ui5.resourceId===r.id)).join('')}</div>`)).join(''):rowList5(state.devices.filter(d=>(d.name+' '+d.id+' '+d.location).toLowerCase().includes(query)).map(d=>row5(d.id,d.name,d.id+' · '+d.location,'resource-detail5',d.type,status5(!d.active?'inactive':d.borrowed?'borrowed':'ready'),ui5.resourceId===d.id)));
  return heading('','ห้องและทรัพยากร','สถานะห้องและอุปกรณ์ในพื้นที่ให้บริการ',action5('ส่งออกสถานะ','resource-export','download'))+`<div class="command-bar">${segment('resource-tab',[['rooms','ห้องบริการ','monitor'],['equipment','อุปกรณ์','headphones']],f4.resourceTab)}${search('ค้นหาห้อง รหัส หรือสังกัด')}</div>`+split5(content,resourceDetail5(ui5.resourceId),'รายละเอียดทรัพยากร');
};
renderers.equipment=function(){
  const rows=state.devices.filter(d=>(f4.registryState==='all'||(f4.registryState==='active'?d.active:!d.active))&&(state.location==='ทั้งหมด'||d.location===state.location)&&(`${d.name} ${d.id} ${d.barcode}`.toLowerCase().includes(state.search.toLowerCase()))).sort((a,b)=>a.order-b.order);
  return heading('','ทะเบียนอุปกรณ์','จัดการชื่อ สังกัด ลำดับ และรายการที่แสดงในบันทึกด่วน',button('เพิ่มอุปกรณ์','add-device','plus','primary'))+`<div class="command-bar">${search('ค้นหาชื่อ รหัส หรือ Barcode')}<label>สังกัด ${select('location',['ทั้งหมด','ชั้น 3','Finn Space'],state.location)}</label><label>สถานะ ${select('registry-state',[['active','กำลังใช้งาน'],['inactive','หยุดใช้'],['all','ทั้งหมด']],f4.registryState)}</label></div>`+split5(rowList5(rows.map(d=>row5(d.id,d.name,d.id+' · '+d.location,'device-detail5',d.type,status5(!d.active?'inactive':d.borrowed?'borrowed':'ready'),ui5.deviceId===d.id))),resourceDetail5(ui5.deviceId),'รายละเอียดอุปกรณ์');
};
actions['resource-detail5']=b=>{ui5.resourceId=f4.resourceId=b.dataset.id;showDetail5('รายละเอียดทรัพยากร',resourceDetail5(ui5.resourceId));};
actions['device-detail5']=b=>{ui5.deviceId=f4.resourceId=b.dataset.id;showDetail5('รายละเอียดอุปกรณ์',resourceDetail5(ui5.deviceId));};

renderers.usage=function(){
  const [start,end]=fiscalRange5(),rows=state.logs.filter(l=>l.date>=start&&l.date<=end),devices=state.devices.map(d=>({...d,count:rows.filter(r=>r.task.startsWith('ยืม')&&(r.detail.includes(d.name)||r.detail.includes(d.id))).length})).sort((a,b)=>b.count-a.count),total=devices.reduce((n,d)=>n+d.count,0);
  return heading('','การใช้งานอุปกรณ์','ดูรายชิ้นที่ถูกยืมบ่อย เพื่อวางแผนจัดสรรและดูแล',linkButton('สภาพและประวัติคืน','condition','headphones','secondary'))+scope5()+metrics([['จำนวนครั้งยืม',total,'ไม่รวมการคืน','headphones'],['อุปกรณ์ที่มีการยืม',devices.filter(d=>d.count).length,'รหัสอุปกรณ์ไม่ซ้ำ','box'],['กำลังยืม',state.devices.filter(d=>d.borrowed).length,'สถานะปัจจุบัน','clock']])+panel('อันดับความถี่การยืม',total?ranks(devices.filter(d=>d.count).map(d=>[d.name,d.count]),Math.max(1,...devices.map(d=>d.count))):empty5('ไม่มีประวัติยืมในช่วงนี้'))+`<div style="margin-top:18px">${tablePanel(['อุปกรณ์','สังกัด','จำนวนครั้งยืม','สถานะ',''],devices.map(d=>[`<strong>${e5(d.name)}</strong><small>${d.id}</small>`,d.location,d.count,status5(!d.active?'inactive':d.borrowed?'borrowed':'ready'),button('รายละเอียด','device-detail5','chevron','',`data-id="${d.id}"`)]),'การใช้งานรายชิ้น')}</div>`;
};
renderers.condition=function(){
  const [a,b]=fiscalRange5(),rows=f4.conditionHistory.filter(r=>r.date>=a&&r.date<=b&&(f4.healthType==='all'||r.type===f4.healthType)&&(f4.healthCondition==='all'||r.condition===f4.healthCondition));
  return heading('','สภาพและประวัติคืน','ติดตามสมบูรณ์ ชำรุด และสูญหาย แยกจากจำนวนครั้งยืม',linkButton('การใช้งานอุปกรณ์','usage','chart','secondary'))+scope5()+`<div class="command-bar">${segment('health-type',[['all','ทุกประเภท'],['headphones','หูฟัง'],['plug','ปลั๊ก'],['usb','USB']],f4.healthType)}${select('condition5',[['all','ทุกสภาพ'],['normal','สมบูรณ์'],['damaged','ชำรุด'],['lost','สูญหาย']],f4.healthCondition,'aria-label="สภาพอุปกรณ์"')}<span class="spacer"></span>${action5('ส่งออกประวัติ','condition-csv','download')}</div>`+metrics([['คืนสมบูรณ์',rows.filter(r=>r.condition==='normal').length,'ในตัวกรองที่เลือก','check'],['ชำรุด',rows.filter(r=>r.condition==='damaged').length,'ต้องติดตาม','alert'],['สูญหาย',rows.filter(r=>r.condition==='lost').length,'ต้องติดตาม','box']])+tablePanel(['วันที่','อุปกรณ์','ผู้รับคืน','สภาพ','หมายเหตุ'],rows.map(r=>[thaiDate5(r.date),r.device,e5(r.person),status5(r.condition),e5(r.note)]),'ประวัติคืนอุปกรณ์');
};

function templateDetail5(t) {
  if(!t)return empty5('เลือกเทมเพลต');
  return `<div class="inspector-heading"><span class="tile-icon">${icon(t.symbol)}</span><div><strong>${e5(t.name)}</strong><small>${t.kind==='combo'?'Combo':t.kind==='smart'?'Smart':'ทั่วไป'}</small></div></div>${facts5([['หัวข้อรอง',t.minorTask],['ผู้รับบริการ',t.requireRecipient?'ต้องระบุ':'ไม่บังคับ'],['รายละเอียด',t.requireComment?'ต้องระบุ':'ไม่บังคับ'],['แสดงในบันทึกด่วน',t.active?'เปิดใช้':'หยุดใช้']])}${t.kind==='combo'?`<div class="template-preview"><strong>${t.items.length} งานในชุด</strong><ol>${t.items.map(x=>`<li>${e5(x)}</li>`).join('')}</ol><p class="caption">${t.checkbox?'เลือกเฉพาะงานที่ทำจริงได้':'ยืนยันบันทึกทั้งชุด'}</p></div>`:note(t.kind==='smart'?'ให้เลือกรายชิ้นหรือห้องตามสถานะล่าสุดก่อนบันทึก':'กรอกข้อมูลและตรวจรายการก่อนบันทึก','','file')}<div class="row-detail-actions">${action5('แก้ไขเทมเพลต','edit-template4','edit',`data-id="${t.id}"`)}</div>`;
}
renderers.templates=function() {
  const rows=f4.templateRows.filter(t=>(t.name+' '+t.minorTask).toLowerCase().includes(state.search.toLowerCase())),t=f4.templateRows.find(t=>t.id===ui5.templateId)||rows[0];
  return heading('','เทมเพลตและ Combo','กำหนดงาน ข้อมูลที่ต้องกรอก และรายการที่ปรากฏในบันทึกด่วน',button('สร้างเทมเพลต','new-template','plus','primary'))+`<div class="command-bar">${search('ค้นหาชื่อหรือหัวข้อรอง')}<span class="spacer"></span><small>${rows.length} เทมเพลต</small></div>`+split5(rowList5(rows.map(t=>row5(t.id,t.name,t.description||t.minorTask,'template-detail5',t.symbol,tag(t.active?'เปิดใช้':'หยุดใช้',t.active?'green':''),ui5.templateId===t.id))),templateDetail5(t),'ตัวอย่างเทมเพลต',true);
};
actions['template-detail5']=b=>{ui5.templateId=b.dataset.id;showDetail5('ตัวอย่างเทมเพลต',templateDetail5(f4.templateRows.find(t=>t.id===ui5.templateId)));};
const saveTemplate5=actions['save-template4'];
actions['save-template4']=()=>{const id=f4.templateEditing;saveTemplate5();if(!$('#sheet').open){const t=f4.templateRows.find(t=>t.id===id)||f4.templateRows.at(-1);t.description=t.kind==='combo'?`Combo · ${t.items.length} งาน`:t.kind==='smart'?'Smart · '+t.minorTask:'ทั่วไป · '+t.minorTask;ui5.templateId=t.id;render();}};
const comboDialog5=comboDialog;
comboDialog=function(kind){comboDialog5(kind);const t=f4.runningTemplate;if(t?.checkbox===false){$$('.combo-check').forEach(c=>{c.checked=true;c.disabled=true;});$('[data-action="combo-none"]')?.remove();$('[data-action="combo-all"]')?.remove();$('#sheet-title').insertAdjacentHTML('afterend','<p class="caption">เทมเพลตนี้บันทึกทั้งชุด</p>');}};

renderers.profile=function(){
  const p=f4.userMeta[0],rows=scopedRows5(people[0].name),stats=personStats5(people[0],rows),tasks=aggregate5(rows,'task').slice(0,8);
  const account=panel('บัญชีและชื่อที่ใช้ลงงาน',`<div class="inspector-heading"><span class="avatar">A</span><div><strong>${e5(p.name)}</strong><small>${e5(p.email)}</small></div></div><form id="profile-form" class="form-grid">${field('ชื่อที่ใช้ลงงาน',input('displayName',p.name,'text','required'),true)}${field('ชื่อ-นามสกุล',input('profile-fullname',p.fullName),true)}<div class="full">${button('บันทึกข้อมูล','save-profile5','check','primary')}</div></form><div class="divider"></div>${facts5([['บทบาท',p.role],['สถานะ',p.active?'เปิดใช้งาน':'หยุดใช้งาน']])}${action5('ขอเพิ่มสิทธิ์','request-role','shield')}`);
  const taskRadar=radar().replace('ความถี่งาน 8 หัวข้อรอง','ความถี่งาน 8 หัวข้อรองที่ทำบ่อย');
  return heading('','โปรไฟล์ของฉัน','ข้อมูลบัญชีและรูปแบบงานของตัวเอง')+scope5()+`<div class="grid split"><div class="stack">${panel('หัวข้อรองที่ทำบ่อย',taskRadar+`<p class="caption">8 หัวข้อรองตามความถี่ของบันทึก · ใช้สะท้อนรูปแบบงาน</p>`)}${panel('สรุปบันทึกของฉัน',inlineStats5([[stats.count,'รายการ'],[stats.versatility,'หัวข้อรอง'],[stats.consistency,'วันที่มีงาน']]))}${panel('ความต่อเนื่องและตรารางวัล',`<details><summary class="caption">ดูรายละเอียด</summary><p class="caption" style="margin-top:13px">บันทึก ${stats.consistency} วัน · มีรายละเอียด ${stats.documentation}% ของรายการในช่วงที่เลือก</p></details>`)}</div><div>${account}</div></div>`;
};
actions['save-profile5']=()=>{if(!$('#profile-form').reportValidity())return;f4.userMeta[0].name=$('[name="displayName"]').value;f4.userMeta[0].fullName=$('[name="profile-fullname"]').value;notify('บันทึกข้อมูลโปรไฟล์ตัวอย่างแล้ว');render();};

function exportRequestDetail5(r) {
  if(!r)return empty5('เลือกคำขอ','เลือกจากรายการเพื่อดูเหตุผลและขอบเขต');
  return `<div class="inspector-heading"><span class="tile-icon">${icon('shield')}</span><div><strong>${e5(r.person)}</strong><small>${e5(r.id)}</small></div></div>${status5(r.status)}${facts5([['เริ่ม',thaiDate5(r.start)],['ถึง',thaiDate5(r.end)],['ผู้พิจารณา',r.reviewer||'รอพิจารณา']])}<h3 class="quiet-heading">วัตถุประสงค์</h3><p class="detail-note">${e5(r.reason)}</p>${r.note?`<h3 class="quiet-heading">เหตุผลการพิจารณา</h3><p class="detail-note">${e5(r.note)}</p>`:''}${r.status==='pending'?`<div class="row-detail-actions">${button('พิจารณาคำขอ','approval-review','shield','primary',`data-id="${r.id}"`)}</div>`:''}`;
}
renderers['export-requests']=function(){
  const rows=f4.requests.filter(r=>r.status===f4.approvalTab),r=f4.requests.find(r=>r.id===ui5.requestId)||rows[0];
  return heading('','คำขอส่งออกข้อมูล','ตรวจวัตถุประสงค์และขอบเขตก่อนอนุมัติ')+`<div class="command-bar">${segment('approval-tab',[['pending','รอตรวจ'],['approved','อนุมัติ'],['rejected','ไม่อนุมัติ']],f4.approvalTab)}</div>`+split5(rowList5(rows.map(r=>row5(r.id,r.person,`${thaiDate5(r.start)} – ${thaiDate5(r.end)}`,'request-detail5','file',status5(r.status),ui5.requestId===r.id))),exportRequestDetail5(r),'รายละเอียดคำขอ',true);
};
actions['request-detail5']=b=>{ui5.requestId=b.dataset.id;showDetail5('รายละเอียดคำขอ',exportRequestDetail5(f4.requests.find(r=>r.id===ui5.requestId)));};
renderers.export=function(){
  const mine=f4.requests.filter(r=>r.person===people[0].name);
  const requests=mine.length?mine.map(r=>`<div class="data-row"><div class="grow"><strong>${e5(r.reason)}</strong><small>${thaiDate5(r.start)} – ${thaiDate5(r.end)}</small><small>${e5(r.note||'')}</small></div><div class="row-trailing">${status5(r.status)}${r.status==='approved'?action5('ดาวน์โหลด','approved-download','download',`data-id="${r.id}"`):''}</div></div>`).join(''):empty5('ยังไม่มีคำขอส่งออก','เลือกช่วงข้อมูลและระบุวัตถุประสงค์ก่อนส่งคำขอ');
  return heading('','ส่งออกข้อมูล','เลือกขอบเขต แล้วตรวจข้อมูลก่อนดาวน์โหลด',state.role!=='staff'?linkButton('คำขอรอตรวจ','export-requests','shield','secondary'):'')+`<div class="grid cols-2">${panel('ขอบเขตข้อมูล',exportForm())}${panel('คำขอของฉัน',requests)}</div><div style="margin-top:18px">${panel('คอลัมน์ในไฟล์',`<div class="filter-summary">${['วันที่','เวลา','ผู้ให้บริการ','ผู้รับบริการ','กลุ่มงาน','หัวข้อหลัก','หัวข้อรอง','รายละเอียด','สถานะ'].map(c=>`<span class="task-chip">${c}</span>`).join('')}</div><p class="caption">CSV · UTF-8 · ขอบเขตข้อมูลสัมพันธ์กับสิทธิ์และคำขอที่อนุมัติ</p>`)}</div>`;
};

function userDetail5(p) {
  if(!p)return empty5('เลือกสมาชิก');
  return `<div class="inspector-heading"><span class="avatar">${p.initial}</span><div><strong>${e5(p.name)}</strong><small>${e5(p.email)}</small></div></div>${facts5([['ชื่อเต็ม',p.fullName],['บทบาท',p.role],['สถานะ',p.active?'ใช้งานอยู่':'ปิดใช้งาน']])}<div class="row-detail-actions">${button('แก้ไขข้อมูลและสิทธิ์','user-detail','edit','primary',`data-id="${p.id}"`)}</div><p class="caption" style="margin-top:16px">มีขั้นตรวจการเปลี่ยนแปลงก่อนยืนยัน</p>`;
}
renderers.users=function(){
  const rows=f4.userMeta.filter(p=>(p.name+' '+p.fullName+' '+p.email).toLowerCase().includes(state.search.toLowerCase()));
  const bar=`<div class="command-bar">${segment('users-tab',[['active','สมาชิก'],['pending','รออนุมัติ'],...(state.role==='superadmin'?[['requests','คำขอเพิ่มสิทธิ์']]:[])],state.usersTab)}${search('ค้นหาชื่อหรือบัญชี')}</div>`;
  if(state.usersTab!=='active'){const list=state.usersTab==='pending'?f4.pendingMembers:f4.roleRequests;return heading('','ผู้ใช้และสิทธิ์','สมาชิกในทีมและคำขอเข้าใช้งาน')+bar+panel('คำขอรอตรวจ',list.filter(r=>r.status==='pending').map(r=>`<div class="data-row"><span class="tile-icon">${icon('person')}</span><div class="grow"><strong>${e5(r.name)}</strong><small>${e5(r.reason)}</small></div>${button('พิจารณา','member-review','shield','primary',`data-id="${r.id}" data-kind="${state.usersTab}"`)}</div>`).join('')||empty5('ไม่มีคำขอรอตรวจ'));}
  const p=f4.userMeta.find(p=>p.id===ui5.userId)||rows[0];
  return heading('','ผู้ใช้และสิทธิ์','สมาชิกในทีมและคำขอเข้าใช้งาน')+bar+split5(rowList5(rows.map(p=>row5(p.id,p.name,p.email,'user-inspect5','person',tag(p.role),p.id===ui5.userId))),userDetail5(p),'รายละเอียดสมาชิก',true);
};
actions['user-inspect5']=b=>{ui5.userId=b.dataset.id;showDetail5('รายละเอียดสมาชิก',userDetail5(f4.userMeta.find(p=>p.id===ui5.userId)));};
const reviewUser5=actions['review-user4'];
actions['review-user4']=b=>{if(!$('#user4').reportValidity())return;const p=f4.userMeta.find(p=>p.id===b.dataset.id),v=new FormData($('#user4'));f4.pendingUser={id:p.id,name:v.get('user-name'),fullName:v.get('user-full'),role:v.get('user-role'),active:v.get('user-active')==='on'};showSheet('ตรวจการเปลี่ยนแปลง','ตรวจสมาชิกและสิทธิ์ก่อนยืนยัน',`<h3>${e5(p.name)}</h3><div class="comparison" style="margin-top:16px"><div><small>ก่อนเปลี่ยน</small><strong>${e5(p.role)}</strong><p class="caption">${p.active?'เปิดใช้งาน':'ปิดใช้งาน'}</p></div><div><small>หลังเปลี่ยน</small><strong>${e5(f4.pendingUser.role)}</strong><p class="caption">${f4.pendingUser.active?'เปิดใช้งาน':'ปิดใช้งาน'}</p></div></div><p class="caption" style="margin-top:16px">ชื่อที่ใช้ลงงาน: ${e5(f4.pendingUser.name)}</p>`,button('ยืนยันการเปลี่ยนแปลง','save-user4','shield','primary'));};

const settingSections5=[['appearance','รูปลักษณ์','โหมดสี ความโปร่ง และการเคลื่อนไหว','sun'],['notifications','การแจ้งเตือน','ช่องทางและเวลาที่ต้องการรับ','bell'],['general','ทั่วไป','ข้อมูลและกติกาของทีม','settings'],['data','ข้อมูลและรายงาน','ส่งออก นำเข้า และดูแลข้อมูล','file'],['security','บัญชีและความปลอดภัย','ค่าการเข้าใช้งานของระบบ','shield']];
const settingsSections5=()=>settingSections5.filter(([id])=>state.role!=='staff'||['appearance','notifications'].includes(id));
function settingsBody5() {
  if(state.settingsTab==='appearance')return `<div class="appearance-tiles">${[['system','ตามอุปกรณ์'],['light','สว่าง'],['dark','มืด']].map(([id,name])=>`<button class="appearance-tile" data-action="appearance5" data-value="${id}" aria-pressed="${state.appearance===id}"><span class="window-sample"><i></i><i></i></span>${name}</button>`).join('')}</div><div class="setting-row"><div><strong>โหมดสี</strong><small>เลือกรูปแบบที่เหมาะกับแสงและความสบายตา</small></div>${select('appearance',[['system','ตามอุปกรณ์'],['light','สว่าง'],['dark','มืด']],state.appearance)}</div><div class="setting-row"><div><strong>ความโปร่งของชั้นควบคุม</strong><small>ใช้กับ navigation และหน้าต่างย่อย</small></div>${select('material',[['regular','โปร่งพอดี'],['tinted','เพิ่มความทึบ'],['solid','พื้นทึบ']],state.material)}</div><div class="setting-row"><div><strong>ลดการเคลื่อนไหว</strong><small>เปลี่ยนสถานะทันทีเมื่อคุณต้องการ</small></div><button class="switch" role="switch" aria-label="ลดการเคลื่อนไหว" aria-checked="${!!state.settingValues.motion}" data-action="toggle-setting" data-key="motion"></button></div>`;
  if(state.settingsTab==='data')return `<div class="category-list">${[['export','ส่งออกข้อมูลงาน','download'],['data-import','นำเข้าจาก Spreadsheet','upload'],['imports','นำเข้าตารางเรียน/สอบ','calendar'],['cleanup','ตรวจข้อมูลซ้ำ','layers']].filter(([id])=>canView(id)).map(([id,label,symbol])=>`<a class="sidebar-link" href="#/${id}">${icon(symbol)}${label}${icon('chevron','row-chevron')}</a>`).join('')}</div>`;
  const blocks={
    general:settingField('บทบาทเริ่มต้น','defaultRole')+settingField('โดเมนอีเมลที่อนุญาต','emailDomain')+settingField('อนุมัติก่อนเข้าใช้งาน','approval','checkbox')+settingField('ล็อกอัตโนมัติ','autoLock','checkbox')+settingField('เวลาล็อก','lockTime','time')+settingField('แก้ย้อนหลังได้ (วัน)','editDays','number'),
    notifications:settingField('แจ้งเตือนบนอุปกรณ์','push','checkbox')+settingField('เวลาแจ้งเตือน','reminderTime','time')+`<div class="field full"><span>วันที่รับการแจ้งเตือน</span><div class="weekday-picker">${['จ','อ','พ','พฤ','ศ','ส','อา'].map(d=>`<button type="button" data-action="pref-day" data-day="${d}" aria-pressed="${f4.settings.days.includes(d)}">${d}</button>`).join('')}</div></div>`+settingField('เตือนก่อนหมดเวลาลงงาน','deadline','checkbox'),
    security:settingField('Session (นาที)','session','number')+settingField('จำนวนครั้งเข้าสู่ระบบผิดสูงสุด','attempts','number')+settingField('2FA สำหรับผู้ดูแล','twoFactor','checkbox')+settingField('เก็บประวัติการเข้าใช้งาน','audit','checkbox'),
  };
  return `<form id="settings4" class="stack"><div class="settings-fields">${blocks[state.settingsTab]}</div>${button('บันทึกค่าตัวอย่าง','save-settings4','check','primary','type="button"')}</form>`;
}
renderers.settings=function(){
  const sections=settingsSections5();if(!sections.some(([id])=>id===state.settingsTab))state.settingsTab='appearance';
  const current=sections.find(([id])=>id===state.settingsTab),nav=`<nav class="category-list" aria-label="หมวดการตั้งค่า">${sections.map(([id,label,detail,symbol])=>`<button data-action="settings-tab" data-tab="${id}" aria-pressed="${id===state.settingsTab}">${icon(symbol)}<span class="grow"><strong>${label}</strong>${narrow5()?`<small>${detail}</small>`:''}</span>${narrow5()?icon('chevron','row-chevron'):''}</button>`).join('')}</nav>`;
  if(narrow5()&&!ui5.settingsDetail)return heading('','ตั้งค่า','ปรับรูปแบบและความชอบในการใช้งาน')+panel('',`<div class="settings-root">${nav}</div>`);
  const detail=panel(current[1],settingsBody5());
  return heading('',narrow5()?current[1]:'ตั้งค่า',current[2])+(narrow5()?`<div class="settings-mobile-back">${action5('ตั้งค่าทั้งหมด','settings-back5','back')}</div>`+detail:`<div class="settings-layout"><aside class="panel settings-nav">${nav}</aside>${detail}</div>`);
};
const settingsTab5=actions['settings-tab'];actions['settings-tab']=b=>{ui5.settingsDetail=true;settingsTab5(b);};
actions['settings-back5']=()=>{ui5.settingsDetail=false;render();};
actions['appearance5']=b=>{applyAppearance(b.dataset.value);render();};

function importSample5(type) {
  if(type==='dl')return initialExams.map((e,i)=>({id:'IMPORT5-'+i,kind:'dl',date:e.date,day:dayNames5[(new Date(e.date+'T12:00:00').getDay()+6)%7],start:e.time.split('–')[0],end:e.time.split('–')[1],room:'406 + 407',subject:'สอบ DL',teacher:'ผู้คุมสอบตัวอย่าง 3 คน',count:75}));
  const placements=[['401',0,'08:00','11:00'],['401',0,'13:00','17:00'],['401',1,'08:00','10:00'],['401',1,'13:00','17:00'],['401',1,'17:00','21:00'],['401',2,'13:00','17:00'],['401',3,'08:00','11:00'],['401',3,'13:00','16:00'],['401',4,'08:00','12:00'],['402',0,'13:00','16:00'],['402',1,'09:00','16:00'],['402',1,'16:00','21:00'],['402',2,'09:00','12:00'],['402',2,'13:00','17:00'],['402',3,'13:00','16:00'],['402',4,'08:00','12:00'],['406',1,'17:00','21:00'],['406',5,'09:00','15:00'],['407',0,'09:00','12:00'],['407',0,'13:00','16:00'],['407',1,'08:00','12:00'],['407',1,'13:00','17:00'],['407',2,'08:00','12:00'],['407',2,'12:00','20:00'],['407',5,'09:00','15:00']];
  return placements.map(([room,day,start,end],i)=>({id:'IMPORT5-'+i,kind:type,room,day:dayNames5[day],start,end,subject:type==='exam'?'สอบรายวิชาตัวอย่าง '+(i+1):'รายวิชาตัวอย่าง '+String(i+1).padStart(2,'0'),teacher:'อาจารย์ตัวอย่าง '+String.fromCharCode(65+i%8),date:'2026-11-'+String(2+day).padStart(2,'0'),checked:true}));
}
function sourcePreview5() {
  return `<div class="schedule-source-preview"><h3>ตัวอย่างโครงสร้างตาราง</h3><p class="caption">4 ห้อง · จันทร์–เสาร์ · 08:00–21:00</p>${['401','402','406','407'].map((room,roomIndex)=>`<div style="margin-top:15px"><strong class="caption">ห้อง ${room}</strong><div class="source-room-grid"><span></span>${['จ','อ','พ','พฤ','ศ','ส'].map(d=>`<span>${d}</span>`).join('')}${['08–12','13–17','17–21'].map((time,row)=>`<span>${time}</span>${Array.from({length:6},(_,day)=>`<span class="${(roomIndex+row+day)%3===0?'class-cell':(day+row)%5===0?'source-muted':''}">${(roomIndex+row+day)%3===0?'คาบเรียน':''}</span>`).join('')}`).join('')}</div></div>`).join('')}<p class="source-note">ภาพโครงสร้างนี้สร้างจากข้อมูลสังเคราะห์ ช่องสีเทาเป็นข้อมูลประกอบและไม่สร้างข้อห้ามเพิ่มตารางเรียน</p></div>`;
}
renderers.imports=function(){
  const step=ui5.importStep,type=ui5.importType,typeName={classroom:'ตารางเรียนรายสัปดาห์',exam:'ตารางสอบรายวิชา',dl:'ตารางสอบ DL'}[type];
  const steps=`<div class="import-steps" aria-label="ขั้นตอนนำเข้า">${['เลือกไฟล์','ช่วงที่มีผล','ตรวจรายการ','ยืนยัน'].map((label,i)=>`<span class="import-step ${step===i?'active':''}" ${step===i?'aria-current="step"':''}>${i+1} · ${label}</span>`).join('')}</div>`;
  let body='';
  if(step===0)body=`<div class="grid cols-2">${panel('เลือกตาราง',`<div class="stack">${field('ประเภทตาราง',select('import-type5',[['classroom','ตารางเรียนรายสัปดาห์'],['exam','ตารางสอบรายวิชา'],['dl','ตารางสอบ DL']],type))}<label class="field"><span>ไฟล์ PDF หรือรูปตาราง</span><input name="schedule-file5" type="file" accept="application/pdf,image/png,image/jpeg"></label>${ui5.importFilename?note(e5(ui5.importFilename),'','file'):''}${note('ต้นแบบรอบออกแบบนี้ยังไม่อ่านตารางจากไฟล์ เลือกใช้ตัวอย่างเพื่อทดลองขั้นตอนโดยไม่บันทึกข้อมูลจริง','','help')}${button('ใช้ตารางตัวอย่าง '+(type==='dl'?'18 รอบ':'25 รายการ'),'load-import5','file','primary')}</div>`)}${panel('รูปแบบที่รองรับในแบบออกแบบ',`<div class="stack">${facts5([['PDF', 'หลายห้องในหน้าเดียว'],['คาบเรียน','รวมช่องที่กินหลายคาบ'],['ข้อมูล','วัน ห้อง เวลา รายวิชา ผู้สอน'],['เพิ่มภายหลัง','ใช้ฟอร์มเพิ่มตารางเดิม']])}<p class="caption">นำเข้าตารางเรียนและตารางสอบแยกประเภทก่อนตรวจวันและช่วงเวลาที่มีผล</p></div>`)}</div>`;
  if(step===1)body=panel('ช่วงที่ตารางมีผล',`<form id="import-period5" class="stack"><div class="form-grid">${field('ประเภท',input('import-kind-label5',typeName,'text','readonly'),true)}${field('ภาคเรียน',select('import-semester5',['2/2569','1/2570','1/2569'],f4.semester),true)}${field('เริ่มใช้',input('import-start5',ui5.validStart,'date','required'))}${field('สิ้นสุด',input('import-end5',ui5.validEnd,'date','required'))}</div><p class="caption">ระบุวันสิ้นสุดจากข้อมูลที่ยืนยันแล้ว ตารางเรียนใช้ซ้ำรายสัปดาห์เฉพาะในช่วงนี้</p><div class="row">${action5('ใช้วันที่ตัวอย่าง','sample-period5','calendar')}${button('ตรวจ '+ui5.importRows.length+' รายการ','review-import5','chevron','primary','type="button"')}</div><div id="import5-error" class="field-error">${e5(ui5.importError)}</div></form>`);
  if(step===2){const selected=ui5.importRows.find(r=>r.id===ui5.importSelected)||ui5.importRows[0];body=`<div class="import-preview-grid">${panel('ต้นฉบับและบริบท',sourcePreview5())}<div class="stack">${panel('รายการที่ตรวจพบในตัวอย่าง',`<div class="row between" style="margin-bottom:13px"><small>${ui5.importRows.length} รายการ · ${typeName}</small>${action5('เปลี่ยนช่วงวันที่','import-period-back5','back')}</div><div class="import-review-list">${ui5.importRows.map(r=>row5(r.id,`${r.room} · ${r.day} ${r.start}–${r.end}`,r.subject,'import-row5','calendar',tag(r.id===selected.id?'กำลังตรวจ':'ตรวจได้'),r.id===selected.id)).join('')}</div>`)}${panel('แก้ไขรายการที่เลือก',`<form id="import-row-form5" class="form-grid">${field('รายวิชา / กิจกรรม',input('import-row-subject5',selected.subject,'text','required'),true)}${field('วัน',select('import-row-day5',dayNames5,selected.day))}${field('ห้อง',input('import-row-room5',selected.room,'text','required'))}${field('เริ่ม',input('import-row-start5',selected.start,'time','required'))}${field('สิ้นสุด',input('import-row-end5',selected.end,'time','required'))}${type!=='classroom'?field('วันที่สอบ',input('import-row-date5',selected.date,'date','required'),true):''}${field('ผู้สอน / ผู้คุมสอบ',input('import-row-teacher5',selected.teacher),true)}<div id="import-row-error5" class="field-error full"></div><div class="full">${action5('ใช้การแก้ไขรายการนี้','save-import-row5','check')}</div></form>`)}${button('ตรวจสรุปก่อนนำเข้า','import-summary5','check','primary')}</div></div>`;}
  if(step===3)body=panel('ตรวจสรุปก่อนยืนยัน',`<div class="stack">${inlineStats5([[ui5.importRows.length,'รายการตัวอย่าง'],[new Set(ui5.importRows.map(r=>r.room)).size,'ห้อง'],[ui5.importRows.filter(importDuplicate5).length,'พบซ้ำกับชุดเดิม']])}${facts5([['ประเภท',typeName],['ภาคเรียน',f4.semester],['เริ่ม',thaiDate5(ui5.validStart)],['สิ้นสุด',thaiDate5(ui5.validEnd)]])}${note('ข้ามข้อมูลซ้ำและคงรายการเดิม การแก้ไขภายหลังยังใช้ฟอร์มเพิ่ม/แก้ไขเดิมได้','','check')}<div class="row">${action5('กลับตรวจรายการ','import-review-back5','back')}${button('ยืนยันนำเข้าตัวอย่าง','confirm-import5','check','primary')}</div></div>`);
  if(step===4)body=panel('',`<div class="empty-state"><span class="tile-icon">${icon('check')}</span><h2>เพิ่มชุดตารางตัวอย่างแล้ว</h2><p>เพิ่ม ${ui5.importAdded} รายการ · ข้ามข้อมูลซ้ำ ${ui5.importRows.length-ui5.importAdded} รายการ</p><p class="caption">ข้อมูลอยู่เฉพาะต้นแบบในเครื่อง การรีโหลดจะเริ่มใหม่</p><div class="row" style="justify-content:center">${type==='classroom'?linkButton('ดูตารางเรียน','classrooms','calendar','primary'):type==='dl'?linkButton('ดูตารางสอบ DL','dl','calendar','primary'):''}${action5('นำเข้าชุดถัดไป','restart-import5','upload')}</div></div>`);
  return heading('','นำเข้าตารางเรียนและสอบ',typeName,step>0&&step<4?action5('เริ่มใหม่','restart-import5','back'):'')+steps+body;
};
function importDuplicate5(r){return ui5.importType==='classroom'?f4.classes.some(c=>c.semester===f4.semester&&c.room===r.room&&c.day===r.day&&c.start===r.start&&c.end===r.end&&c.subject===r.subject):ui5.importType==='dl'?state.exams.some(e=>e.date===r.date&&e.time===r.start+'–'+r.end):(ui5.examImports||[]).some(e=>e.date===r.date&&e.room===r.room&&e.start===r.start&&e.end===r.end);}
Object.assign(actions,{
 'load-import5':()=>{ui5.importRows=importSample5(ui5.importType);ui5.importStep=1;ui5.importSelected=ui5.importRows[0].id;ui5.importError='';render();},
 'sample-period5':()=>{$('[name="import-start5"]').value='2026-11-02';$('[name="import-end5"]').value='2027-03-14';},
 'review-import5':()=>{const form=$('#import-period5');if(!form.reportValidity())return;const v=new FormData(form),start=v.get('import-start5'),end=v.get('import-end5');if(start>end){$('#import5-error').textContent='วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่ม';return;}ui5.validStart=start;ui5.validEnd=end;f4.semester=v.get('import-semester5');ui5.importStep=2;render();},
 'import-row5':b=>{ui5.importSelected=b.dataset.id;render();},
 'save-import-row5':()=>{const form=$('#import-row-form5');if(!form.reportValidity())return;const v=new FormData(form);if(v.get('import-row-start5')>=v.get('import-row-end5')){$('#import-row-error5').textContent='เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม';return;}const r=ui5.importRows.find(r=>r.id===ui5.importSelected);Object.assign(r,{subject:v.get('import-row-subject5'),room:v.get('import-row-room5'),day:v.get('import-row-day5'),start:v.get('import-row-start5'),end:v.get('import-row-end5'),teacher:v.get('import-row-teacher5')});if(v.get('import-row-date5'))r.date=v.get('import-row-date5');notify('ปรับรายการตัวอย่างแล้ว');render();},
 'import-period-back5':()=>{ui5.importStep=1;render();},'import-review-back5':()=>{ui5.importStep=2;render();},
 'import-summary5':()=>{ui5.importStep=3;render();},
 'confirm-import5':()=>{if(!ensureOnline())return;let added=0;for(const r of ui5.importRows){if(importDuplicate5(r))continue;if(ui5.importType==='classroom')f4.classes.push({...r,id:'CLASS-IMPORT5-'+Date.now()+'-'+added,semester:f4.semester,active:true,note:'ชุดตารางตัวอย่าง',validFrom:ui5.validStart,validTo:ui5.validEnd});else if(ui5.importType==='dl')state.exams.push({id:'DL-IMPORT5-'+Date.now()+'-'+added,date:r.date,time:r.start+'–'+r.end,count:r.count,rooms:r.room,proctors:[people[0].name,people[2].name,people[4].name],active:true});else{ui5.examImports||=[];ui5.examImports.push({...r});}added++;}ui5.importAdded=added;ui5.importStep=4;render();},
 'restart-import5':()=>{ui5.importStep=0;ui5.importError='';render();},
});

function toolLinks5(ids) {
  const descriptions={users:'สมาชิกและคำขอเพิ่มสิทธิ์',templates:'เงื่อนไขและชุดงานที่ใช้บ่อย',classrooms:'ตารางรายสัปดาห์และนำเข้า PDF',dl:'รอบสอบ ห้อง และผู้คุมสอบ',staff:'ข้อมูลสำหรับวางแผนกำลังคน',equipment:'ชื่อ สังกัด และรายการใช้งาน',audit:'ตรวจเหตุการณ์และผู้ดำเนินการ',cleanup:'เทียบข้อมูลก่อนจัดการรายการซ้ำ',imports:'ตารางเรียนและตารางสอบ',broadcast:'ช่องทาง กลุ่มผู้รับ และข้อความ',settings:'รูปแบบและกติกาของทีม','data-import':'วางข้อมูลงานจาก Spreadsheet','export-requests':'วัตถุประสงค์และขอบเขตการส่งออก'};
  return `<div class="tool-grid">${ids.filter(canView).map(id=>{const r=routes.find(r=>r[0]===id);return `<a class="tool-link" href="#/${id}"><span class="tile-icon">${icon(r[2])}</span><span class="grow"><strong>${e5(r[1])}</strong><small>${descriptions[id]||'ตรวจและจัดการข้อมูล'}</small></span>${icon('chevron')}</a>`;}).join('')}</div>`;
}
renderers.admin=function(){
  const pending=f4.requests.filter(r=>r.status==='pending'),members=f4.pendingMembers.filter(r=>r.status==='pending'),roles=f4.roleRequests.filter(r=>r.status==='pending');
  return heading('','งานรอจัดการ','รายการที่ต้องพิจารณาและเครื่องมือที่ใช้เป็นประจำ')+metrics([['คำขอส่งออก',pending.length,'รอพิจารณา','file'],['เข้าใช้งานใหม่',members.length,'รอตรวจสมาชิก','users'],['ขอเพิ่มสิทธิ์',roles.length,'รอตรวจบทบาท','shield']])+`<div class="grid cols-2">${panel('คำขอส่งออกรอตรวจ',pending.map(r=>`<div class="data-row"><div class="grow"><strong>${e5(r.person)}</strong><small>${e5(r.reason)}</small></div>${button('พิจารณา','approval-review','shield','primary',`data-id="${r.id}"`)}</div>`).join('')||empty5('ไม่มีคำขอรอตรวจ'))}${panel('สมาชิกและสิทธิ์',`<p class="caption">${members.length} คำขอเข้าใช้งาน · ${roles.length} คำขอเพิ่มสิทธิ์</p>${linkButton('ตรวจคำขอสมาชิก','users','users','secondary')}`)}</div><section class="hub-section"><h2>งานประจำของผู้ดูแล</h2>${toolLinks5(['users','templates','classrooms','dl','staff','equipment'])}</section><section class="hub-section"><h2>ข้อมูลและการสื่อสาร</h2>${toolLinks5(['export-requests','broadcast','data-import','audit'])}</section>`;
};
renderers.system=()=>heading('','เครื่องมือข้อมูล','นำเข้า ตรวจสอบ และดูแลข้อมูลของระบบ')+toolLinks5(['imports','data-import','audit','cleanup','settings']);
renderers.help=function(){return heading('','คู่มือและความช่วยเหลือ','เลือกงานที่ต้องการทำเพื่อดูขั้นตอน')+panel('เริ่มต้นใช้งาน',[['record','บันทึกงานและ Combo','เลือกงาน → ระบุข้อมูล → ตรวจ → ยืนยัน'],['classrooms','จัดตารางเรียน','เลือกภาคเรียนและห้อง → เพิ่มหรือแก้ไขคาบ'],['imports','นำเข้าตาราง','เลือกประเภท → ช่วงที่มีผล → ตรวจรายการ → ยืนยัน'],['resources','ยืม/คืนและดูสถานะอุปกรณ์','เลือกรหัสและสังกัด → ตรวจสถานะ → บันทึกงาน'],['export','ส่งออกข้อมูล','เลือกขอบเขต → ตรวจหรือส่งคำขอ → ดาวน์โหลด']].filter(([id])=>canView(id)).map(([id,title,detail])=>`<a class="help-link" href="#/${id}"><span class="tile-icon">${icon('help')}</span><span class="grow"><strong>${title}</strong><small>${detail}</small></span>${icon('chevron','row-chevron')}</a>`).join(''))+`<div style="margin-top:18px">${linkButton('เกี่ยวกับแอป','about','help','link')}</div>`;};
renderers.about=()=>heading('','เกี่ยวกับ labboy Workload','พื้นที่ทำงานสำหรับบันทึกงาน ตาราง และทรัพยากร')+panel('แบบตรวจ UI รอบ 05',`<div class="stack"><div class="sidebar-brand" style="padding:0"><img src="../../../../frontend/public/labboy-logo.png" alt="labboy"><div><strong>labboy Workload</strong><small>Interface review 05 · 4 พฤศจิกายน 2569</small></div></div><p class="caption">ต้นแบบข้อมูลสังเคราะห์สำหรับตรวจโครงสร้างและประสบการณ์ใช้งาน</p><div class="divider"></div><h3>ปรับในรอบนี้</h3><ul class="caption"><li>โครงนำทางตามกลุ่มงาน และหน้ารายการ/รายละเอียด</li><li>แสดงข้อมูลมือถือเป็นรายการที่อ่านได้</li><li>สีสถานะและชั้นวัสดุสัมพันธ์กับหน้าที่</li><li>ตรวจตารางเรียน/สอบก่อนนำเข้า และคงฟอร์มเพิ่มเอง</li></ul>${linkButton('คู่มือการใช้งาน','help','help','secondary')}</div>`);

renderers.audit=function(){
  const rows=state.logs.filter(l=>l.date==='2026-11-03').slice(0,8).filter(l=>(l.task+' '+l.person+' '+l.detail).toLowerCase().includes(state.search.toLowerCase()));
  return heading('','ประวัติระบบ','ตรวจเหตุการณ์ ผู้ดำเนินการ และรายละเอียดที่เปลี่ยน')+`<div class="command-bar">${search('ค้นหาเหตุการณ์หรือผู้ดำเนินการ')}<span class="spacer"></span><small>${thaiDate5('2026-11-03')}</small></div>`+panel('เหตุการณ์ล่าสุด',rows.map((r,i)=>`<div class="timeline-entry"><span class="time">${r.time}</span><span class="tile-icon">${icon(i%2?'edit':'file')}</span><div class="grow"><strong>${e5(r.task)}</strong><small>${e5(r.person)} · ${e5(r.detail||'ไม่มีรายละเอียดเพิ่มเติม')}</small></div>${action5('รายละเอียด','audit-detail5','chevron',`data-id="${r.id}"`)}</div>`).join('')||empty5('ไม่พบเหตุการณ์'));
};
actions['audit-detail5']=b=>{const l=state.logs.find(l=>l.id===b.dataset.id);showSheet('รายละเอียดเหตุการณ์',l.id,`${facts5([['ผู้ดำเนินการ',l.person],['วันที่',thaiDate5(l.date)],['เวลา',l.time],['เหตุการณ์',l.task]])}<div class="comparison"><div><small>ก่อนดำเนินการ</small><p class="caption">ยังไม่มีบันทึกตัวอย่างรายการนี้</p></div><div><small>หลังดำเนินการ</small><p class="caption">${e5(l.detail||l.task)}</p></div></div>`);};
renderers.cleanup=function(){
  return heading('','ตรวจข้อมูลซ้ำ','เปรียบเทียบรายละเอียดก่อนจัดการรายการที่อาจซ้ำกัน')+note('รายการที่มีงานและเวลาใกล้กันอาจเป็นงานคนละรายการ ตรวจผู้รับบริการและรายละเอียดก่อนเสมอ','amber','help')+`<div style="margin-top:18px">${panel(ui5.cleanupDone?'ผลการจัดการ':'รายการที่ควรตรวจ',ui5.cleanupDone?`<div class="empty-state"><h3>เก็บรายการที่เลือกในตัวอย่างแล้ว</h3><p>ไม่ได้เปลี่ยนข้อมูลในระบบจริง</p>${action5('เลิกทำตัวอย่าง','undo-cleanup5','refresh')}</div>`:`<div class="comparison"><div><small>รายการ A</small><h3>ช่วยเหลือการใช้งานคอมพิวเตอร์</h3>${facts5([['ผู้บันทึก','เจ้าหน้าที่ A'],['วัน / เวลา','3 พ.ย. 2569 · 10:30'],['ผู้รับบริการ','ผู้รับบริการตัวอย่าง'],['รายละเอียด','ให้คำแนะนำการใช้งาน']])}</div><div><small>รายการ B</small><h3>ช่วยเหลือการใช้งานคอมพิวเตอร์</h3>${facts5([['ผู้บันทึก','เจ้าหน้าที่ A'],['วัน / เวลา','3 พ.ย. 2569 · 10:30'],['ผู้รับบริการ','ผู้รับบริการตัวอย่าง'],['รายละเอียด','ให้คำแนะนำการใช้งาน']])}</div></div><div class="row" style="margin-top:19px">${button('เก็บทั้งสองรายการ','keep-both5','check','secondary')}${button('ตรวจการเก็บรายการ A','review-cleanup5','layers','primary')}</div>`)}</div>`;
};
actions['keep-both5']=()=>notify('เก็บทั้งสองรายการไว้ในตัวอย่าง');
actions['review-cleanup5']=()=>showSheet('ตรวจผลก่อนจัดการ','เก็บรายการ A และนำรายการ B ออกจากชุดตัวอย่าง',note('คำสั่งนี้ใช้กับข้อมูลสาธิตของหน้านี้ สามารถเลิกทำตัวอย่างได้','','help'),button('ยืนยันตัวอย่าง','confirm-cleanup5','check','primary'));
actions['confirm-cleanup5']=()=>{if(!ensureOnline())return;ui5.cleanupDone=true;closeSheet();render();};actions['undo-cleanup5']=()=>{ui5.cleanupDone=false;render();};

function notifications5() {
  const unread=f4.notifications.filter(n=>!n.read).length;
  return `<div class="row between" style="margin-bottom:10px"><small>${unread} ยังไม่อ่าน</small>${button('อ่านทั้งหมด','read-notifications','check','link',unread?'':'disabled')}</div>${f4.notifications.length?f4.notifications.map(n=>`<article class="notification-item"><h3>${!n.read?'<i class="unread-dot"></i>':''}${e5(n.title)}</h3><p>${e5(n.body)}</p><div class="row between">${button('เปิดดู','open-notification','','link',`data-id="${n.id}"`)}<button class="icon-btn" data-action="dismiss-notification" data-id="${n.id}" aria-label="นำการแจ้งเตือน ${e5(n.title)} ออก">${icon('close')}</button></div></article>`).join(''):empty5('ไม่มีการแจ้งเตือนใหม่')}<div class="divider"></div>${action5('การแจ้งเตือนบนอุปกรณ์','push-status','bell')}`;
}
renderers.notifications=()=>heading('','การแจ้งเตือน','งานและประกาศที่เกี่ยวข้องกับคุณ')+panel('ศูนย์การแจ้งเตือน',notifications5());
actions.notifications=()=>{showSheet('การแจ้งเตือน','งานและประกาศที่เกี่ยวข้องกับคุณ',notifications5());$('#sheet').classList.add('popover');};
const readNotifications5=actions['read-notifications'],dismissNotification5=actions['dismiss-notification'];
actions['read-notifications']=()=>{readNotifications5();header();};actions['dismiss-notification']=b=>{dismissNotification5(b);header();};

renderers.broadcast=function(){
  return heading('','ประกาศและแจ้งเตือน','ตรวจข้อความ กลุ่มผู้รับ และช่องทางก่อนส่ง')+`<div class="grid cols-2">${panel('ข้อความและผู้รับ',`<form id="broadcast4" class="stack">${field('หัวข้อ',input('broadcast-title',ui5.broadcastTitle,'text','required'))}${field('ข้อความ',`<textarea name="broadcast-message" rows="4" required>${e5(ui5.broadcastMessage)}</textarea>`)}<div class="grid cols-2">${[['inapp','ในแอป','แสดงในศูนย์การแจ้งเตือน'],['push','บนอุปกรณ์','ขึ้นกับสิทธิ์และอุปกรณ์ที่รองรับ']].map(([id,name,detail])=>`<button type="button" class="channel-choice" data-action="broadcast-channel" data-channel="${id}" aria-pressed="${f4.broadcastChannels[id]}">${icon('bell')}<span><strong>${name}</strong><small>${detail}</small></span></button>`).join('')}</div>${field('กลุ่มผู้รับ',select('broadcast-audience',[['all','ทุกคน · 8 คน'],['staff','Staff · 6 คน'],['admin','ผู้ดูแล · 2 คน']],f4.broadcastAudience))}${button('ตรวจประกาศก่อนส่ง','broadcast4-review','send','primary','type="button"')}</form>`)}${panel('ตัวอย่างที่ผู้รับจะเห็น',`<div class="notification-preview"><small>labboy Workload · ตอนนี้</small><h3 id="message-preview-title5">${e5(ui5.broadcastTitle)}</h3><p id="message-preview-body5">${e5(ui5.broadcastMessage)}</p></div><div class="divider"></div><h3>ผลการส่งในต้นแบบ</h3>${f4.broadcastHistory.length?f4.broadcastHistory.map(b=>`<div class="compact-event"><span class="tile-icon">${icon('bell')}</span><div><strong>${e5(b.title)}</strong><small>ในแอป ${b.inapp} คน · บนอุปกรณ์ ${b.push} คน</small></div></div>`).join(''):'<p class="caption" style="margin-top:12px">ยังไม่มีรายการส่งตัวอย่าง</p>'}`)}</div>`;
};

// Utility screens remain reviewable but are excluded from product navigation.
renderers.design=function(){return heading('','ชุด UI และสถานะ','พื้นที่ภายในสำหรับตรวจแบบ · ไม่แสดงในเมนูผู้ใช้งาน')+`<div class="grid cols-2">${panel('ชั้นควบคุม',`<div class="material" style="padding:15px;border-radius:15px;display:flex;align-items:center;gap:9px">${icon('calendar')}<strong class="grow">Toolbar</strong>${button('คำสั่งหลัก','sample-feedback','plus','primary')}</div><p class="caption" style="margin-top:17px">ใช้วัสดุโปร่งใน navigation และส่วนควบคุมชั่วคราว</p>`)}${panel('ชั้นเนื้อหา',`<p class="detail-note">ตาราง รายการ และข้อความใช้พื้นผิวปกติ เพื่อรักษาลำดับข้อมูลและความอ่านง่าย</p><div class="row" style="margin-top:18px">${status5('ready')}${status5('pending')}${status5('rejected')}${status5('inactive')}</div>`)}</div><div style="margin-top:18px">${panel('สถานะข้อมูล',`<div class="row wrap">${['normal','loading','empty','error','offline'].map(s=>button(s,'view-state','','secondary',`data-state="${s}"`)).join('')}</div>`)}</div>`;};

radar=function(){
  const top=aggregate5(scopedRows5(people[0].name),'task').slice(0,8);
  if(!top.length)return empty5('ยังไม่มีงานสำหรับแสดงรูปแบบ');
  const labels=top.map(([t])=>t),n=labels.length,cx=210,cy=165,r=86,point=(i,s)=>[cx+Math.cos(i*2*Math.PI/n-Math.PI/2)*r*s,cy+Math.sin(i*2*Math.PI/n-Math.PI/2)*r*s];
  return `<svg class="radar" viewBox="0 0 420 340" role="img" aria-label="ความถี่งาน ${n} หัวข้อรอง"><title>หัวข้อรองที่มีความถี่สูงสุดของฉัน</title>${[.25,.5,.75,1].map(s=>`<polygon points="${labels.map((_,i)=>point(i,s).join(',')).join(' ')}" fill="none" stroke="var(--line)"/>`).join('')}<polygon points="${top.map(([,count],i)=>point(i,count/Math.max(1,top[0][1])).join(',')).join(' ')}" fill="var(--blue)" stroke="var(--accent)" stroke-width="2"/>${labels.map((t,i)=>{const [x,y]=point(i,1.43),short=Array.from(new Intl.Segmenter('th',{granularity:'grapheme'}).segment(t)).map(x=>x.segment).slice(0,12).join('');return `<text x="${x}" y="${y}" text-anchor="middle"><title>${e5(t)}</title>${e5(short)}${short!==t?'…':''}</text>`;}).join('')}</svg><div class="caption">${top.map(([t,count])=>`<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${e5(t)}</span><strong>${count}</strong></div>`).join('')}</div>`;
};

// Preserve user-entered drafts when another control or picker re-renders a page.
const taskPickerAction5=actions['task-picker'];actions['task-picker']=()=>{stashManual5();taskPickerAction5();};
function stashManual5(){const form=$('#manual4');if(form)ui5.manualDraft=Object.fromEntries(new FormData(form));}
const suggestion5=actions['comment-suggestion'];actions['comment-suggestion']=b=>{suggestion5(b);stashManual5();};
const saveComment5=actions['save-comment4'];actions['save-comment4']=b=>{const before=state.logs.length;saveComment5(b);if(state.logs.length>before){ui5.manualDraft={};render();}};
const originalComment5=commentDialog;commentDialog=function(task){originalComment5(task);const t=f4.runningTemplate;if(t){const recipient=$('[name="recipient"]'),detail=$('[name="detail"]');recipient.closest('.field').querySelector('span').textContent='ผู้รับบริการ'+(t.requireRecipient?' *':' (ถ้ามี)');detail.closest('.field').querySelector('span').textContent='รายละเอียด'+(t.requireComment?' *':' (ถ้ามี)');}};
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.closest('#manual4'))stashManual5();
  if(el.name==='broadcast-title'){ui5.broadcastTitle=el.value;$('#message-preview-title5').textContent=el.value;}
  if(el.name==='broadcast-message'){ui5.broadcastMessage=el.value;$('#message-preview-body5').textContent=el.value;}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.name==='import-type5'){ui5.importType=el.value;ui5.importRows=[];render();}
  if(el.name==='schedule-file5'){ui5.importFilename=el.files?.[0]?.name||'';render();}
  if(el.name==='condition5'){f4.healthCondition=el.value;render();}
  if(el.name==='analytics-person'){f4.person=el.value;render();}
  if(el.name==='material')render();
});
const segment5=actions.segment;
actions.segment=b=>{
  const group=b.dataset.group,value=b.dataset.value;
  if(group==='dl-view5'){ui5.dlView=value;render();return;}
  if(group==='class-view5'){ui5.classView=value;render();return;}
  if(group==='resource-tab'){f4.resourceTab=value;ui5.resourceId=f4.resourceId=value==='rooms'?'303':state.devices[0].id;render();return;}
  segment5(b);
};
// Preserve the original opener through multi-step dialogs and page re-renders.
const showSheetCore5=showSheet;
showSheet=function(...args){
  if(!$('#sheet').open){const el=document.activeElement;ui5.dialogTrigger={el,action:el?.dataset.action,id:el?.dataset.id};}
  showSheetCore5(...args);
};
$('#sheet').addEventListener('close',()=>queueMicrotask(()=>{
  if($('#sheet').open)return;
  const trigger=ui5.dialogTrigger;
  const current=trigger?.action?$$('[data-action="'+CSS.escape(trigger.action)+'"]').find(el=>(el.dataset.id||'')===(trigger.id||'')&&el.getClientRects().length):null;
  const target=trigger?.el?.isConnected&&trigger.el.getClientRects().length?trigger.el:current||$('#content');
  target.focus({preventScroll:true});ui5.dialogTrigger=null;
}));

render=function(options={}){
  header();
  const allowed=canView(state.route),html=renderers[state.route]();
  $('#content').innerHTML=stateView(html);
  document.title=`${currentRoute()[1]} · labboy Workload · Review 05`;
  document.body.dataset.route=state.route;document.body.dataset.role=state.role;
  document.documentElement.dataset.material=state.material;
  if(allowed&&state.route==='data-import'){
    // Existing TSV validation is retained, while matching the new form layouts.
    const old=$('#content .heading-actions');if(old)old.innerHTML=linkButton('นำเข้าตารางเรียน/สอบ','imports','calendar','secondary');
  }
  if(allowed&&state.route==='profile'){
    const form=$('#profile-form');if(form)form.querySelectorAll('input').forEach(el=>el.autocomplete=el.name==='displayName'?'nickname':'name');
  }
  if(options.focus)$('#content').focus({preventScroll:true});
};
window.addEventListener('resize',()=>{clearTimeout(ui5.resizeTimer);ui5.resizeTimer=setTimeout(()=>{if(!$('#sheet').open)render();},120);});
window.addEventListener('hashchange',()=>{if(state.route==='settings'){ui5.settingsDetail=false;render();}});

window.designReview=Object.freeze({
  ...review4,
  revision:5,
  getSummary(){return {...review4.getSummary(),revision:5,settingsDetail:ui5.settingsDetail,importStep:ui5.importStep,importType:ui5.importType,importAdded:ui5.importAdded||0,importRows:ui5.importRows.map(r=>({...r})),templateRows:f4.templateRows.map(t=>({...t,items:[...t.items]}))};},
});
render();
document.documentElement.dataset.reviewReady='5';
