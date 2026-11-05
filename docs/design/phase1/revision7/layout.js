/* R07: task-first composition over the isolated, synthetic R06 data model. */
'use strict';
const ui7 = { collapsed:false, management:false, undo:[], sequence:0 };
// Original 24-unit vectors, with a single optical weight. No SF Symbols assets.
Object.assign(paths, {
 record:'M5 4h9l5 5v11H5zM14 4v5h5M9 13h6M9 16h4',
 calendar:'M5 5h14v15H5zM5 10h14M8 3v4M16 3v4M8 13h2M14 13h2M8 16h2',
 grid:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
 headphones:'M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2M20 12h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2',
 users:'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 20v-2a6 6 0 0 1 12 0v2M17 4a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3 4v2',
 chart:'M4 4v16h16M8 15l4-5 4 2 4-6',
 sidebar:'M3 5h18v14H3zM9 5v14M5.5 8h1M5.5 11h1M5.5 14h1',
 door:'M6 21V4l12-2v19M6 21h14M14 12h.01',
 bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4',
 file:'M5 3h9l5 5v13H5zM14 3v5h5M9 12h6M9 16h6',
});
const primary7=[['record','งาน','record'],['classrooms','ตาราง','calendar'],['resources','ทรัพยากร','headphones'],['dashboard','ภาพรวม','chart']];
function activeArea7(){
 if(['record','new-log','worklogs','templates'].includes(state.route))return 'record';
 if(['classrooms','dl','imports'].includes(state.route))return 'classrooms';
 if(['resources','equipment','usage','condition'].includes(state.route))return 'resources';
 if(['dashboard','staff','profile'].includes(state.route))return 'dashboard';
 return '';
}
function navLink7(id,label,symbol){return `<a class="sidebar-link ${state.route===id?'active':''}" href="#/${id}" ${state.route===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span></a>`;}
header=function(){
 document.body.dataset.auth=String(['login','pending'].includes(state.route));
 document.body.dataset.sidebarCollapsed=String(ui7.collapsed);
 const area=activeArea7(), person=currentPerson(), unread=f4.notifications.filter(n=>!n.read).length;
 const groups=[['งานของฉัน',[['record','บันทึกงาน','record'],['worklogs','ประวัติงาน','file']]],['พื้นที่ทำงาน',[['classrooms','ตาราง','calendar'],['resources','ทรัพยากร','headphones'],['dashboard','ภาพรวม','chart']]]];
 const secondary=groupItems6().flatMap(g=>g[1]).filter(([id])=>!groups.flatMap(g=>g[1]).some(r=>r[0]===id));
 $('#app-sidebar').innerHTML=`<a class="sidebar-brand" href="#/record"><img src="/frontend/public/labboy-logo.png" alt=""><span><strong>labboy</strong><small>ICIT Workspace</small></span></a><nav class="sidebar-menu" aria-label="เมนูงาน">${groups.map(([title,rows])=>`<section class="sidebar-group"><h2>${title}</h2>${rows.map(r=>navLink7(...r)).join('')}</section>`).join('')}<section class="sidebar-group"><button class="disclosure7" data-action="management7" aria-expanded="${ui7.management}">${icon('chevron')}<span>เครื่องมือและการจัดการ</span></button>${ui7.management?secondary.map(r=>navLink7(...r)).join(''):''}</section></nav><div class="sidebar-footer">${navLink7('settings','ตั้งค่า','settings')}<button class="workspace-person" data-action="account7"><span class="avatar">${person.initial}</span><span><strong>${e5(person.name)}</strong><small>${state.role==='superadmin'?'Superadmin':state.role==='admin'?'Admin':'Staff'}</small></span>${icon('down')}</button></div>`;
 $('#app-header').innerHTML=`<div class="toolbar-leading7"><button class="icon-btn" data-action="sidebar7" aria-label="${ui7.collapsed?'แสดง':'ซ่อน'}แถบด้านข้าง" aria-expanded="${!ui7.collapsed}">${icon('sidebar')}</button><a class="mobile-workspace7" href="#/record">labboy</a><span class="toolbar-location7">${e5(currentRoute()[1])}</span></div><div class="header-actions"><button class="icon-btn" data-action="routes" aria-label="ค้นหาหน้าและเครื่องมือ">${icon('search')}</button><button class="icon-btn" data-action="notifications" aria-label="การแจ้งเตือน ${unread} ยังไม่อ่าน">${icon('bell')}${unread?'<span class="unread-dot" aria-hidden="true"></span>':''}</button><button class="icon-btn" data-action="account7" aria-label="บัญชีและเครื่องมือ"><span class="avatar">${person.initial}</span></button></div>`;
 $('#mobile-nav').innerHTML=primary7.map(([id,label,sym])=>`<a class="nav-item ${area===id?'active':''}" href="#/${id}" ${area===id?'aria-current="page"':''}>${icon(sym)}<span>${label}</span></a>`).join('');
};
actions['sidebar7']=()=>{ui7.collapsed=!ui7.collapsed;render();};
actions['management7']=()=>{ui7.management=!ui7.management;render();};
actions['account7']=()=>showSheet('บัญชีและพื้นที่ทำงาน',currentPerson().name,`<nav class="category-list">${[['worklogs','ประวัติงาน','file'],['profile','โปรไฟล์','person'],['settings','ตั้งค่า','settings'],['help','คู่มือ','help']].map(r=>navLink7(...r)).join('')}<button class="sidebar-link" data-action="routes">${icon('grid')}เครื่องมือทั้งหมด</button><button class="sidebar-link" data-action="appearance">${icon('sun')}รูปแบบการแสดงผล</button></nav>`);
const quickCore7=quickLogPanel;
quickLogPanel=function(){return quickCore7().replace('quick-grid','quick-grid quick-grid7');};
function undoPanel7(){
 const pending=ui7.undo.filter(u=>!u.used);
 return pending.length?`<section class="undo-history7" aria-label="ย้อนกลับการบันทึก">${pending.map(u=>`<div><span>${icon('check')}<span>${e5(u.message)}</span></span><button class="btn link" data-action="undo-room7" data-id="${u.id}">เลิกทำ</button></div>`).join('')}</section>`:'';
}
renderers.record=function(){
 return heading('','บันทึกงาน','เลือกงานที่ทำ แล้วกลับไปทำงานต่อได้ทันที')+`<div class="record-workspace workspace-split"><div class="stack"><section class="record-main"><div class="record-panel-title"><div><h2>งานของ${state.role==='staff'?'ฉัน':'ทีม'}</h2><p>บันทึกสำหรับ ${thaiDate5(f4.date)}</p></div><button class="staff-picker" data-action="${state.role==='staff'?'own-account':'staff-picker'}"><span class="avatar">${currentPerson().initial}</span><span><small>ผู้ปฏิบัติงาน</small><strong>${e5(currentPerson().name)}</strong></span>${icon('down')}</button></div><div class="record-meta">${segment('record-mode',[['quick','บันทึกด่วน','bolt'],['manual','กรอกเอง','edit']],state.recordMode)}<button class="btn date-summary" data-action="date-time">${icon('clock')}${f4.time}${icon('down')}</button></div>${state.recordMode==='manual'?manualPanel():quickLogPanel()}<details class="inline-today"><summary>${icon('calendar')}ตารางวันที่เลือก<small>${thaiDate5(f4.date)}</small></summary>${dailyEvents6()}${linkButton('เปิดตาราง','classrooms','chevron','link')}</details></section>${undoPanel7()}<section class="recent-list"><div class="panel-head"><h2>บันทึกล่าสุด</h2>${linkButton('ดูประวัติ','worklogs','chevron','link')}</div>${recentRows(3)}</section></div><aside class="stack daily-context">${dailyContext6()}</aside></div>`;
};
// Record a complete room action once; keep Undo available beyond a timed toast.
smartRoom=function(floor){
 f4.roomFloor=floor;
 showSheet(floor==='3'?'ห้องแลกเปลี่ยนความรู้':'ห้องเรียน ชั้น 4','แตะคำสั่งเพื่อบันทึกทันที สามารถเลิกทำได้',`<div class="room-actions7">${f4.rooms.filter(r=>r.floor===floor).map(r=>`<button data-action="room-instant7" data-room="${r.id}" data-expected="${r.inUse}"><span class="room-glyph7">${icon('door')}</span><span class="grow"><strong>ห้อง ${e5(r.id)}</strong><small>${e5(r.os)} · ${r.inUse?'กำลังใช้งาน':'พร้อมให้บริการ'}</small></span><span class="room-intent7">${r.inUse?'ปิดห้อง':'เปิดห้อง'}</span>${icon('chevron')}</button>`).join('')}</div>`);
};
actions['room-instant7']=b=>{
 if(!ensureOnline())return;
 const room=f4.rooms.find(r=>r.id===b.dataset.room);
 if(!room||String(room.inUse)!==b.dataset.expected){toast('สถานะห้องเปลี่ยนแล้ว กรุณาเปิดรายการใหม่');return;}
 const before=room.inUse,version=(room.reviewVersion7||0)+1,id='UNDO7-'+(++ui7.sequence);
 room.inUse=!before;room.reviewVersion7=version;f4.recipient='';
 const message=`${room.inUse?'เปิด':'ปิด'}ห้อง ${room.id} แล้ว`;
 addLog(room.inUse?'เปิดห้องบริการ':'ปิดห้องบริการ',`${room.id}/${room.os}`,{roomId:room.id,operation7:id});
 const log=state.logs.find(l=>l.operation7===id);
 ui7.undo.push({id,room:room.id,before,after:room.inUse,version,logId:log.id,message,used:false});
 render();toast(message+' · เลิกทำได้ที่บันทึกล่าสุด');
};
actions['undo-room7']=b=>{
 if(!ensureOnline())return;
 const entry=ui7.undo.find(u=>u.id===b.dataset.id&&!u.used);if(!entry)return;
 const room=f4.rooms.find(r=>r.id===entry.room);
 if(!room||room.reviewVersion7!==entry.version||room.inUse!==entry.after||!state.logs.some(l=>l.id===entry.logId)){
  toast('มีการเปลี่ยนแปลงต่อแล้ว จึงเลิกทำรายการนี้ไม่ได้');return;
 }
 room.inUse=entry.before;room.reviewVersion7++;state.logs=state.logs.filter(l=>l.id!==entry.logId);entry.used=true;render();toast('เลิกทำแล้ว คืนสถานะห้องเดิม');
};
actions['schedule-today7']=()=>{ui6.scheduleDate=ui6.today;render();};
const scheduleCore7=renderers.classrooms;
renderers.classrooms=()=>scheduleCore7().replace('<div class="calendar-title">','<div class="calendar-title">'+button('วันนี้','schedule-today7','','secondary'));
