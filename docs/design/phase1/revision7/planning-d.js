/* Approved analytics/calendar design phase. All data and settings are local synthetic fixtures. */
'use strict';
const uiD={today:CalendarB.todayBangkok(),anchor:CalendarB.todayBangkok(),mode:'week',person:'all',limit:1000,cache:new Map(),loads:0,calendarSide:true,jdYear:PlanningD.fiscalYear(CalendarB.todayBangkok())};
uiD.range=PlanningD.period('week',uiD.anchor);
const jdCategoriesD=[['rooms','ห้องบริการและห้องปฏิบัติการ',20],['dl','การทดสอบ Digital Literacy',10],['planning','วางแผนและตารางปฏิบัติงาน',5],['coordination','ประสานงานระบบและเครือข่าย',5],['support','สนับสนุนระบบสารสนเทศ',15],['repair','ซ่อมและแก้ปัญหาคอมพิวเตอร์',20],['software','ติดตั้งซอฟต์แวร์ลิขสิทธิ์',20],['electrical','ซ่อมบำรุงระบบไฟฟ้าพื้นฐาน',5]];
const jdMappingD={};
for(const task of ['ยืมหูฟัง','คืนหูฟัง','ยืมปลั๊กไฟ','คืนปลั๊กไฟ','ยืม USB','คืน USB','ดูแลความสะอาด','เช็คอินห้องแลกเปลี่ยนความรู้','ปิดห้องแลกเปลี่ยนความรู้','เปิดห้องเรียนชั้น 4','ปิดห้องเรียนชั้น 4','เปิดห้องบริการ','ปิดห้องบริการ'])jdMappingD[task]='rooms';
for(const task of ['ICIT account','Microsoft Authenticator','Gmail','Microsoft Email','Wifi','การเติมเงินงานพิมพ์','รับแจ้งและแก้ปัญหาทางโทรศัพท์'])jdMappingD[task]='support';
for(const task of ['ช่วยเหลือการใช้งานคอมพิวเตอร์','แก้ไขปัญหาเครื่องพิมพ์,คอมพิวเตอร์','แก้ไขปัญหาการใช้งานคอมพิวเตอร์','แก้ไขปัญหาการปริ้น','ติดตั้ง windows'])jdMappingD[task]='repair';
for(const task of ['Software ลิขสิทธิ์','Microsoft365','ติดตั้ง Software'])jdMappingD[task]='software';
Object.assign(jdMappingD,{'คุมสอบ DL':'dl','แก้ไขปัญหาการเชื่อมต่อ':'coordination','วางแผนตารางปฏิบัติงาน':'planning','ซ่อมบำรุงระบบไฟฟ้าพื้นฐาน':'electrical'});
const jdProfilesD={2569:{weights:Object.fromEntries(jdCategoriesD.map(([id,,weight])=>[id,weight])),mapping:{...jdMappingD}}};

// A deterministic six-month sample, with no copied employee/student records.
// Append, rather than replace, the inherited fixtures so existing flows retain their records.
const sampleTasksD=['เช็คอินห้องแลกเปลี่ยนความรู้','คุมสอบ DL','วางแผนตารางปฏิบัติงาน','แก้ไขปัญหาการเชื่อมต่อ','ICIT account','ช่วยเหลือการใช้งานคอมพิวเตอร์','ติดตั้ง Software','ซ่อมบำรุงระบบไฟฟ้าพื้นฐาน'];

for(let date='2026-05-01';date<='2026-11-06';date=CalendarB.addDays(date,4))if(CalendarB.weekday(date)<5)people.forEach((person,index)=>{
 const task=sampleTasksD[(index+Number(date.slice(-2)))%sampleTasksD.length],group='DEMO-D-GROUP-'+date+'-'+person.id;
 for(let item=0;item<(index%3===0?2:1);item++)state.logs.push({id:'DEMO-D-'+date+'-'+person.id+'-'+item,date,time:String(8+(index*2+item)%11).padStart(2,'0')+':'+(item?'30':'00'),person:person.name,employeeId:person.id,task,detail:'กิจกรรมสังเคราะห์สำหรับตรวจกราฟ',status:'บันทึกแล้ว',...(index%3===0?{comboGroupId:group}:{} )});

});
// Exact asset IDs permit usage counts without guessing from similar names.
state.devices.forEach((device,index)=>{for(let n=0;n<index%4+1;n++){
 const date='2026-11-0'+(2+n),id='DEMO-D-ASSET-'+device.id+'-'+n;
 state.logs.push({id,date,time:'09:00',person:people[index%people.length].name,employeeId:people[index%people.length].id,task:device.type==='headphones'?'ยืมหูฟัง':device.type==='usb'?'ยืม USB':'ยืมปลั๊กไฟ',equipmentId:device.id,detail:device.id});
 if(n%2===0)state.logs.push({id:id+'-RETURN',date,time:'11:30',person:people[(index+1)%people.length].name,employeeId:people[(index+1)%people.length].id,task:device.type==='headphones'?'คืนหูฟัง':device.type==='usb'?'คืน USB':'คืนปลั๊กไฟ',equipmentId:device.id,equipmentCondition:n===0?(['damaged','lost'].includes(device.condition)?device.condition:'normal'):null,detail:device.id});
}});
function planningRowsD(){
 const employee=state.role==='staff'?people[0].id:uiD.person==='all'?null:uiD.person;
 const key=JSON.stringify([state.role,employee,uiD.range,uiD.limit,state.logs]);
 if(!uiD.cache.has(key)){
  const normalized=PlanningD.normalize(state.logs,people),all=PlanningD.inRange(normalized,uiD.range).filter(row=>!employee||row.employeeId===employee).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),rows=all.slice(0,uiD.limit);
  uiD.cache.set(key,{rows,partial:all.length>rows.length,plan:PlanningD.queryPlan(uiD.range,employee,uiD.limit>1000?rows[Math.max(0,uiD.limit-1001)]?.id:null),invalid:normalized.filter(row=>(!employee||row.employeeId===employee)&&!row.date).length});uiD.loads++;
 }
 return uiD.cache.get(key);
}
const rangeLabelD=range=>thaiDate5(range.start)+' – '+thaiDate5(range.end);
const modeNamesD={day:'รายวัน',week:'รายสัปดาห์',month:'รายเดือน',quarter:'ไตรมาส',fiscal:'ปีงบประมาณ',custom:'กำหนดช่วงเอง'};
function planningToolbarD(){
 const data=planningRowsD();return `<div class="planning-toolbar-d"><div class="planning-period-d">${button(modeNamesD[uiD.mode],'planning-range-d','calendar','secondary')}${button('','planning-step-d','back','icon-btn','data-dir="-1" aria-label="ช่วงข้อมูลก่อนหน้า"')}${button('','planning-step-d','chevron','icon-btn','data-dir="1" aria-label="ช่วงข้อมูลถัดไป"')}<strong>${rangeLabelD(uiD.range)}</strong></div>${state.role!=='staff'?field('ผู้ปฏิบัติงาน',select('planning-person-d',[['all','ทุกคน'],...people.map(p=>[p.id,personLabelC(p)])],uiD.person)):''}</div><div class="data-status-d">${icon('file')}<span>ข้อมูลตัวอย่าง · ${data.rows.length.toLocaleString('th-TH')} กิจกรรม${data.partial?' · ยังโหลดไม่ครบช่วงที่เลือก':''}</span>${data.partial?button('โหลดเพิ่ม 1,000 รายการ','planning-more-d','plus','link'):''}<button class="link" data-action="planning-source-d">วิธีนับและขอบเขตข้อมูล</button></div>${data.partial?'<p class="data-warning-d" role="status">กราฟและยอดรวมคำนวณจากรายการที่โหลดแล้ว ยังใช้เป็นยอดครบทั้งช่วงไม่ได้</p>':''}`;
}
function planningRangeSheetD(){
 showSheet('ช่วงข้อมูล','เลือกแล้วกดใช้ช่วงนี้ เพื่อเปลี่ยนข้อมูลพร้อมกันทุกกราฟ',`<form id="planning-range-d" class="stack">${field('ช่วงเวลา',select('planning-mode-d',Object.entries(modeNamesD),uiD.mode))}${field('ปีงบประมาณ',input('planning-fy-d',PlanningD.fiscalYear(uiD.anchor),'number','min="2444" max="3543" required'))}<div class="form-grid">${field('เริ่มวันที่',input('planning-start-d',uiD.range.start,'date','required'))}${field('สิ้นสุดวันที่',input('planning-end-d',uiD.range.end,'date','required'))}</div><p class="caption">สัปดาห์จันทร์–อาทิตย์ · ไตรมาส ต.ค.–ธ.ค. เป็น Q1 ของปีงบ · โหลดครั้งละไม่เกิน 1,000 รายการ</p><p class="caption">กดใช้ช่วงนี้เพื่ออัปเดตกราฟและตารางพร้อมกัน</p><p id="planning-error-d" class="field-error" role="alert"></p></form>`,button('ใช้ช่วงนี้','planning-apply-d','check','primary'));
 updateRangeFormD(false);
}
function updateRangeFormD(recalculate=true){
 const mode=$('[name="planning-mode-d"]').value,fy=$('[name="planning-fy-d"]');fy.closest('.field').hidden=mode!=='fiscal';
 for(const name of ['planning-start-d','planning-end-d'])$('[name="'+name+'"]').readOnly=mode!=='custom';
 if(recalculate&&mode!=='custom')try{const range=PlanningD.period(mode,uiD.anchor,Number(fy.value));$('[name="planning-start-d"]').value=range.start;$('[name="planning-end-d"]').value=range.end;$('#planning-error-d').textContent='';}catch(error){$('#planning-error-d').textContent=error.message;}
}
function applyPlanningRangeD(){
 const form=$('#planning-range-d');if(!form.reportValidity())return;
 try{const mode=$('[name="planning-mode-d"]').value,range=PlanningD.period('custom',uiD.anchor,null,{start:$('[name="planning-start-d"]').value,end:$('[name="planning-end-d"]').value});uiD.mode=mode;uiD.range=range;uiD.jdYear=PlanningD.fiscalYear(range.end);uiD.anchor=mode==='fiscal'?range.end:range.start;uiD.limit=1000;closeSheet();render();}catch(error){$('#planning-error-d').textContent=error.message;$('[name="planning-start-d"]').focus();}
}
function sourceSheetD(){const data=planningRowsD(),s=PlanningD.summary(data.rows);showSheet('วิธีนับข้อมูล','จำนวนกิจกรรมใช้วางแผนร่วมกับบริบทงาน',`<div class="stack">${facts5([['กิจกรรมย่อย',s.activities+' รายการ'],['ชุด Combo ที่มีรหัสกลุ่ม',s.comboGroups+' ชุด'],['กิจกรรมในกลุ่มที่ยืนยันได้',s.groupedActivities+' รายการ'],['ยังระบุเจ้าหน้าที่ไม่ได้',s.unresolved+' รายการ'],['แถววันที่ไม่ถูกต้องที่ไม่รวมในช่วง',data.invalid+' รายการ']])}<p>หนึ่งชุด Combo อาจมีหลายกิจกรรม งานเก่าที่ไม่มีรหัสกลุ่มจะไม่นำมาคาดเดาจำนวนครั้งบริการ ไม่มีคะแนนคุณภาพจากความถี่ ความยาวข้อความ หรือการใช้ Quick Log</p><p class="caption">จำนวนเอกสารไม่เท่ากับยอด reads ที่คิดจริง ต้นแบบนี้ไม่มีการอ่าน cloud</p><p class="caption">แสดงข้อมูลครั้งละไม่เกิน 1,000 รายการ หากยังมีข้อมูลในช่วงนี้ สามารถเลือกโหลดเพิ่มได้ กราฟและตารางใช้ข้อมูลชุดเดียวกัน</p></div>`);}
function barChartD(title,pairs,kind='task'){
 if(!pairs.length)return empty5('ยังไม่มีบันทึกในช่วงนี้');const max=Math.max(...pairs.map(pair=>pair[1]),1);
 return `<div class="chart-bars-d" aria-label="${e5(title)}">${pairs.map(([label,count])=>`<button class="chart-bar-d" data-action="planning-drill-d" data-kind="${kind}" data-key="${e5(label)}"><span>${e5(kind==='person'?personLabelC(people.find(p=>p.id===label)||{name:'ระบุเจ้าหน้าที่ไม่ได้'}):label)}</span><i aria-hidden="true"><b style="width:${count/max*100}%"></b></i><strong>${count.toLocaleString('th-TH')}</strong></button>`).join('')}</div>`;
}
function trendChartD(rows){
 const trend=PlanningD.trend(rows,uiD.range),max=Math.max(...trend.values.map(row=>row.count),1);
 const bars=trend.values.map(row=>{
  const bucketDate=row.date.length===4?row.date+'-01-01':row.date.length===7?row.date+'-01':row.date,future=bucketDate>uiD.today&&!row.count;
  const label=trend.unit==='day'?row.date.slice(8)+'/'+Number(row.date.slice(5,7)):trend.unit==='month'?Number(row.date.slice(5,7))+'/'+(Number(row.date.slice(0,4))+543):Number(row.date)+543;
  return `<button data-action="planning-drill-d" data-kind="date" data-key="${row.date}" aria-label="${row.date} ${future?'ยังไม่ถึงช่วงนี้':row.count+' กิจกรรม'}" ${future?'disabled':''}><strong>${future?'—':row.count}</strong><span aria-hidden="true" style="height:${Math.max(2,row.count/max*130)}px"></span><small>${label}</small></button>`;
 }).join('');
 return `<div class="trend-columns-d" aria-label="แนวโน้มจำนวนกิจกรรม หน่วยรายการ">${bars}</div><p class="chart-caption">หน่วย: กิจกรรมที่บันทึก${trend.unit==='day'?'ต่อวัน':trend.unit==='month'?'ต่อเดือน':'ต่อปี'} · แตะแท่งเพื่อดูรายการ${uiD.range.end>=uiD.today?' · ช่วงปัจจุบันยังไม่สิ้นสุด และ — หมายถึงยังไม่ถึงช่วงนั้น':''}</p>`;
}
function recordsTableD(rows,title='รายการต้นทาง'){
 return rows.length?tablePanel(['วันที่ / เวลา','ผู้ปฏิบัติงาน','หัวข้อรอง','รายละเอียด'],rows.slice(0,200).map(row=>[thaiDate5(row.date)+'<small>'+e5(row.time||'ไม่ระบุเวลา')+'</small>',e5(row.employeeId?personLabelC(people.find(p=>p.id===row.employeeId)||{name:row.person}):'ระบุเจ้าหน้าที่ไม่ได้'),e5(row.task),e5(row.detail||row.comment||'—')]),title)+(rows.length>200?'<p class="caption">แสดง 200 รายการแรกจาก '+rows.length+' รายการในกลุ่มนี้</p>':''):empty5('ไม่มีบันทึกตรงกับกลุ่มนี้');
}
function planningDrillD(button){const kind=button.dataset.kind,key=button.dataset.key,rows=planningRowsD().rows.filter(row=>kind==='person'?(key==='unresolved'?!row.employeeId:row.employeeId===key):kind==='date'?row.date.startsWith(key):kind==='hour'?(row.time||'').slice(0,2)+':00'===key:kind==='jd'?PlanningD.fiscalYear(row.date)===Number(uiD.jdYear)&&(jdProfilesD[uiD.jdYear]?.mapping[row.task]||'unmapped')===key:row.task===key);showSheet('รายการต้นทาง',`${rows.length} กิจกรรม · ${rangeLabelD(uiD.range)}`,recordsTableD(rows));$('#sheet').classList.add('sheet-wide');}
function dashboardSummaryE(rows){
 const s=PlanningD.summary(rows);
 return `<section class="dashboard-summary-e" aria-label="สรุปข้อมูลในช่วงที่เลือก"><div class="summary-primary-e"><span>กิจกรรมที่บันทึก</span><strong>${s.activities.toLocaleString('th-TH')}<small>รายการ</small></strong><span>นับจากรายการที่โหลดแล้ว</span></div><dl><div><dt>ผู้มีบันทึก</dt><dd>${s.people} <small>คนที่ระบุได้</small></dd></div><div><dt>วันที่มีบันทึก</dt><dd>${s.days} <small>วัน</small></dd></div><div><dt>หัวข้อรอง</dt><dd>${s.tasks} <small>ประเภท</small></dd></div></dl></section>`;
}
function dashboardTakeawayE(rows){
 const days=PlanningD.countBy(rows,'date');if(!days.length)return '<p class="dashboard-takeaway-e">ยังไม่มีบันทึกในข้อมูลที่โหลดสำหรับช่วงนี้</p>';
 const [date,count]=days[0],ties=days.filter(([,value])=>value===count).length;
 return `<p class="dashboard-takeaway-e">จากข้อมูลที่โหลด <strong>${thaiDate5(date)}</strong>${ties>1?' และอีก '+(ties-1)+' วัน':''} มีบันทึกมากที่สุด <strong>${count} รายการ</strong></p>`;
}
function dashboardTeamE(rows){
 const selected=state.role==='staff'?people[0].id:uiD.person;
 const roster=people.filter(person=>selected==='all'||person.id===selected);
 const item=(id,label,initial,records)=>{const s=PlanningD.summary(records);return `<button class="team-person-e" data-action="planning-drill-d" data-kind="person" data-key="${e5(id)}"><span class="avatar" aria-hidden="true">${e5(initial)}</span><span class="team-person-label-e"><strong>${e5(label)}</strong><small>${s.tasks} หัวข้อ · ${s.days} วันที่มีบันทึก</small></span><span class="team-person-count-e"><strong>${s.activities}</strong><small>รายการ</small></span>${icon('chevron')}</button>`;};
 const unresolved=rows.filter(row=>!row.employeeId);
 return `<p class="caption">เรียงตามรายชื่อทีม ไม่จัดอันดับตามจำนวนบันทึก</p><div class="team-list-e">${roster.map(person=>item(person.id,personLabelC(person),person.initial,rows.filter(row=>row.employeeId===person.id))).join('')}${unresolved.length?item('unresolved','ระบุเจ้าหน้าที่ไม่ได้','?',unresolved):''}</div><p class="chart-caption">จำนวนบันทึกไม่ใช่คะแนนผลงาน และการไม่มีบันทึกไม่ได้หมายถึงไม่ได้ทำงาน · แตะชื่อเพื่อดูรายการต้นทาง</p>`;
}
renderers.dashboard=function(){
 const data=planningRowsD(),rows=data.rows,s=PlanningD.summary(rows),tasks=PlanningD.countBy(rows,'task');
 return heading('','ภาพรวมงาน','อ่านแนวโน้มและกิจกรรมที่บันทึก เพื่อวางแผนงาน',linkButton('บันทึกงาน','record','plus','primary'))+planningToolbarD()+dashboardSummaryE(rows)+
 `<section class="panel dashboard-trend-e"><div class="panel-head"><h2>แนวโน้มกิจกรรม</h2><span class="caption">${modeNamesD[uiD.mode]}</span></div>${dashboardTakeawayE(rows)}${trendChartD(rows)}</section><div class="planning-charts-d dashboard-detail-e">${panel('หัวข้อรองที่มีบันทึกบ่อย',barChartD('หัวข้อรองที่มีบันทึกบ่อย',tasks.slice(0,5))+(tasks.length>5?button('ดูหัวข้อรองทั้งหมด ('+tasks.length+')','planning-all-tasks-e','chevron','link'):'')+'<p class="chart-caption">หน่วย: รายการที่บันทึก · แตะแถบเพื่อดูรายละเอียด</p>')}${panel('บันทึกของทีม',dashboardTeamE(rows))}</div><details class="dashboard-context-e"><summary>${icon('help')}บริบทและวิธีอ่านข้อมูล${s.unresolved?' · ยังระบุเจ้าหน้าที่ไม่ได้ '+s.unresolved+' รายการ':''}${icon('down')}</summary><div><div class="context-metrics-d"><div><strong>${s.comboGroups}</strong><span>ชุด Combo ที่มีรหัสกลุ่ม</span></div><div><strong>${s.unresolved}</strong><span>กิจกรรมที่ยังระบุเจ้าหน้าที่ไม่ได้</span></div></div><p class="caption">กิจกรรมย่อยหลายรายการอาจเกิดจากการบันทึกครั้งเดียว จำนวนรายการไม่ได้บอกระยะเวลาหรือความยากของงาน และวันที่มีบันทึกไม่ใช่วันมาปฏิบัติงาน</p>${button('รูปแบบช่วงเวลา','planning-hours-d','clock','secondary')}${button('ดูบริบท JD','planning-jd-d','file','link')}</div></details>`;
};
actions['planning-all-tasks-e']=()=>showSheet('หัวข้อรองทั้งหมด',rangeLabelD(uiD.range)+' · หน่วย: รายการที่บันทึก',barChartD('หัวข้อรองทั้งหมด',PlanningD.countBy(planningRowsD().rows,'task')));
function jdPanelD(rows){
 const year=uiD.jdYear,profile=jdProfilesD[year],yearRows=rows.filter(row=>PlanningD.fiscalYear(row.date)===Number(year));
 if(!profile)return panel('JD กลางของทีม',`<p>ยังไม่ได้กำหนดชุดกลางสำหรับปีงบ ${year}</p><p class="caption">มีตัวอย่างอ้างอิงปีงบ 2569 ให้ตรวจและตั้งค่าปีที่ต้องการ น้ำหนักไม่ถูกนำไปใช้ข้ามปีอัตโนมัติ</p>${button('กำหนด JD กลาง','planning-jd-d','plus','secondary')}`);
 const counts=new Map(PlanningD.countBy(yearRows,row=>profile.mapping[row.task]||'unmapped'));
 return panel('บริบท JD กลาง · ปีงบ '+year,`<p class="caption">น้ำหนักความรับผิดชอบและจำนวนกิจกรรมเป็นคนละความหมาย ไม่ใช้ส่วนต่างเป็นคะแนนประเมิน</p><div class="jd-table-d"><div class="jd-table-head-d"><span>ความรับผิดชอบ</span><span>น้ำหนัก JD</span><span>กิจกรรม</span></div>${jdCategoriesD.map(([id,label])=>`<button data-action="planning-drill-d" data-kind="jd" data-key="${id}"><span>${label}</span><strong>${profile.weights[id]}%</strong><span>${counts.get(id)||0}</span></button>`).join('')}<div class="jd-unmapped-d"><span>ยังไม่จับคู่หมวด</span><span>—</span><span>${counts.get('unmapped')||0}</span></div></div><p class="caption">นับเฉพาะกิจกรรมของปีงบ ${year} ที่อยู่ในช่วงเลือก · ผังจับคู่เป็นตัวอย่างที่ตรวจแก้ได้</p>${button('ตั้งค่า JD และผังจับคู่','planning-jd-d','settings','secondary')}`);
}
function planningPeopleD(){const query=state.search.toLowerCase();return people.filter(p=>(uiD.person==='all'||p.id===uiD.person)&&(personLabelC(p)+' '+personDetailC(p)).toLowerCase().includes(query));}
renderers.staff=function(){const rows=planningRowsD().rows,list=planningPeopleD();return heading('','การกระจายงานของทีม','จำนวนและประเภทกิจกรรม ใช้ประกอบการวางแผนกำลังคน',button('ส่งออกข้อมูลที่แสดง','planning-staff-csv-d','download','secondary'))+planningToolbarD()+`<div class="planning-search-d">${search('ค้นหาเจ้าหน้าที่')}</div>`+tablePanel(['ผู้ปฏิบัติงาน','กิจกรรม','หัวข้อรอง','วันที่มีบันทึก',''],list.map(p=>{const s=PlanningD.summary(rows.filter(row=>row.employeeId===p.id));return[e5(personLabelC(p)),s.activities,s.tasks,s.days,button('รายละเอียด','planning-person-d','chevron','link',`data-id="${p.id}"`)];}),'กิจกรรมรายเจ้าหน้าที่')+`<p class="caption planning-note-d">ไม่มีการจัดอันดับคุณภาพบุคลากร วันที่มีบันทึกไม่ใช่ข้อมูลการมาทำงาน</p>`+jdPanelD(rows);};
function jdSheetD(){
 const profile=jdProfilesD[uiD.jdYear]||jdProfilesD[2569];showSheet('JD กลางของทีม','หนึ่งชุดต่อปีงบประมาณ ใช้ร่วมกันทุกคนในต้นแบบ',`<form id="jd-form-d" class="stack">${field('ปีงบประมาณ',input('jd-year-d',uiD.jdYear,'number','min="2444" max="3543" required'))}<p class="caption">${jdProfilesD[uiD.jdYear]?'แก้ชุดกลางของปีนี้':'ค่าตั้งต้นอ้างอิงตัวอย่างปี 2569 ตรวจแล้วบันทึกเพื่อกำหนดปีนี้'}</p>${jdCategoriesD.map(([id,label])=>field(label+' (%)',input('jd-weight-'+id,profile.weights[id],'number','min="0" max="100" step="1" required'))).join('')}<p id="jd-error-d" class="field-error" role="alert"></p><details><summary>ตรวจผังหัวข้อรอง → หมวด JD</summary><p class="caption">หนึ่งหัวข้อรองอยู่ได้หนึ่งหมวด รายการที่ยังไม่ชัดเจนให้คงเป็นยังไม่จับคู่</p>${[...new Set([...sourceMinorTasks,...planningRowsD().rows.map(row=>row.task)])].map((task,index)=>`<label class="field"><span>${e5(task)}</span>${select('jd-map-'+index,[['unmapped','ยังไม่จับคู่'],...jdCategoriesD.map(([id,label])=>[id,label])],profile.mapping[task]||'unmapped',`data-jd-task="${e5(task)}"`)}</label>`).join('')}</details></form>`,button('ใช้ชุดกลางนี้ในต้นแบบ','planning-jd-save-d','check','primary'));
}
function equipmentDataD(){const data=planningRowsD(),events=PlanningD.equipmentEvents(data.rows,state.devices),type=f4.healthType||'all',taskTypes={'ยืมหูฟัง':'headphones','คืนหูฟัง':'headphones','ยืมปลั๊กไฟ':'plug','คืนปลั๊กไฟ':'plug','ยืม USB':'usb','คืน USB':'usb'};return{...data,events:events.filter(row=>type==='all'||(state.devices.find(device=>device.id===row.asset)?.type||taskTypes[row.task])===type)};}
renderers.usage=function(){const data=equipmentDataD(),events=data.events,borrows=events.filter(row=>row.action==='borrow'),returns=events.filter(row=>row.action==='return'),devices=state.devices.filter(device=>(f4.healthType==='all'||device.type===f4.healthType)&&(state.location==='ทั้งหมด'||device.location===state.location)).map(device=>({...device,count:borrows.filter(row=>row.asset===device.id).length})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));return heading('','การใช้งานอุปกรณ์','ชิ้นไหนถูกยืมบ่อย และมีอะไรที่ต้องดูแลต่อ',linkButton('สภาพและประวัติคืน','condition','shield','secondary'))+planningToolbarD()+`<div class="command-bar">${field('ประเภท',select('planning-device-type-d',[['all','ทุกประเภท'],['headphones','หูฟัง'],['plug','ปลั๊กไฟ'],['usb','USB']],f4.healthType))}${field('สังกัดปัจจุบัน',select('planning-location-d',['ทั้งหมด','ชั้น 3','Finn Space'],state.location))}</div>`+metrics([['ครั้งยืมที่บันทึก',devices.reduce((n,d)=>n+d.count,0),'เฉพาะชิ้นที่จับคู่ทะเบียนได้','headphones'],['ครั้งคืนที่บันทึก',returns.filter(row=>devices.some(d=>d.id===row.asset)).length,'ไม่หักออกจากจำนวนครั้งยืม','check'],['กำลังยืมตอนนี้',devices.filter(d=>d.borrowed).length,'สถานะปัจจุบัน ไม่ใช่ยอดในช่วง','clock'],['จับคู่ชิ้นไม่ได้',events.filter(row=>!row.asset).length,'แยกไว้ ไม่เดาจากชื่อคล้ายกัน','alert']])+panel('อุปกรณ์ที่มีการยืมมาก',barChartD('อุปกรณ์ที่มีการยืมมาก',devices.filter(d=>d.count).slice(0,5).map(d=>[d.id,d.count]),'asset'))+tablePanel(['อุปกรณ์ / รหัส','สังกัดปัจจุบัน','ครั้งยืม','สถานะตอนนี้',''],devices.map(device=>[e5(device.name)+'<small>'+e5(device.id)+'</small>',e5(device.location),device.count,status5(deviceStatus6(device)),button('ประวัติในช่วงนี้','planning-asset-d','chevron','link',`data-id="${device.id}"`)]),'การใช้งานรายชิ้น')+`<p class="caption planning-note-d">สังกัดเป็นข้อมูลทะเบียนปัจจุบัน ประวัติเก่าไม่ได้ระบุสังกัด ณ เวลายืมทุกแถว จึงไม่สรุปว่าการยืมเก่าเกิดที่สังกัดปัจจุบันทั้งหมด</p>`;};
renderers.condition=function(){const data=equipmentDataD(),returns=data.events.filter(row=>row.action==='return'),known=returns.filter(row=>row.condition),rows=returns.filter(row=>f4.healthCondition==='all'||(f4.healthCondition==='unknown'?!row.condition:row.condition===f4.healthCondition));return heading('','สภาพและประวัติคืน','ติดตามเหตุที่ต้องดูแล โดยไม่ถือว่าข้อมูลว่างหมายถึงสมบูรณ์',linkButton('การใช้งานอุปกรณ์','usage','chart','secondary'))+planningToolbarD()+metrics([['คืนสมบูรณ์',known.filter(row=>row.condition==='normal').length,'ระบุสภาพชัดเจน','check'],['คืนชำรุด/สูญหาย',known.filter(row=>row.condition!=='normal').length,'เหตุการณ์คืน ไม่ใช่จำนวนชิ้นที่เสียตอนนี้','alert'],['ยังไม่ระบุสภาพ',returns.length-known.length,'ไม่รวมเป็นคืนสมบูรณ์','help']])+field('สภาพตอนคืน',select('planning-condition-d',[['all','ทั้งหมด'],['normal','สมบูรณ์'],['damaged','ชำรุด'],['lost','สูญหาย'],['unknown','ยังไม่ระบุ']],f4.healthCondition))+tablePanel(['วันที่','อุปกรณ์','สภาพตอนคืน'],rows.map(row=>[thaiDate5(row.date),e5(row.asset||'จับคู่ทะเบียนไม่ได้'),row.condition?status5(row.condition):tag('ยังไม่ระบุ')]),'เหตุการณ์คืนอุปกรณ์');};
Object.assign(actions,{
 'planning-range-d':planningRangeSheetD,'planning-apply-d':applyPlanningRangeD,'planning-source-d':sourceSheetD,
 'planning-more-d':()=>{uiD.limit+=1000;render();},
 'planning-step-d':button=>{const step=Number(button.dataset.dir),days=(Date.parse(uiD.range.end)-Date.parse(uiD.range.start))/86400000+1;uiD.anchor=['month','quarter','fiscal'].includes(uiD.mode)?CalendarB.addMonths(uiD.anchor,step*(uiD.mode==='month'?1:uiD.mode==='quarter'?3:12)):CalendarB.addDays(uiD.anchor,step*(uiD.mode==='week'?7:uiD.mode==='custom'?days:1));uiD.range=uiD.mode==='custom'?{start:CalendarB.addDays(uiD.range.start,step*days),end:CalendarB.addDays(uiD.range.end,step*days)}:PlanningD.period(uiD.mode,uiD.anchor);uiD.limit=1000;render();},
 'planning-drill-d':button=>{if(button.dataset.kind==='asset')actions['planning-asset-d']({dataset:{id:button.dataset.key}});else planningDrillD(button);},
 'planning-person-d':button=>{const p=people.find(p=>p.id===button.dataset.id),rows=planningRowsD().rows.filter(row=>row.employeeId===p.id),s=PlanningD.summary(rows);showSheet(personLabelC(p),rangeLabelD(uiD.range),metrics([['กิจกรรม',s.activities,'รายการ','file'],['หัวข้อรอง',s.tasks,'ประเภท','layers'],['วันที่มีบันทึก',s.days,'วัน','calendar']])+barChartD('หัวข้อรอง',PlanningD.countBy(rows,'task'))+recordsTableD(rows));$('#sheet').classList.add('sheet-wide');},
 'planning-hours-d':()=>showSheet('กิจกรรมตามชั่วโมงที่บันทึก','หน่วย: รายการ ไม่ใช่ชั่วโมงทำงาน',barChartD('กิจกรรมตามชั่วโมง',PlanningD.countBy(planningRowsD().rows.filter(row=>/^\d{2}:\d{2}$/.test(row.time||'')),row=>row.time.slice(0,2)+':00'),'hour')),
 'planning-jd-d':jdSheetD,
 'planning-jd-save-d':()=>{const form=$('#jd-form-d');if(!form.reportValidity())return;const values=new FormData(form),year=Number(values.get('jd-year-d')),weights=Object.fromEntries(jdCategoriesD.map(([id])=>[id,Number(values.get('jd-weight-'+id))]));if(Object.values(weights).reduce((n,v)=>n+v,0)!==100){$('#jd-error-d').textContent='น้ำหนักทั้ง 8 หมวดต้องรวม 100%';return;}const mapping={};form.querySelectorAll('[data-jd-task]').forEach(select=>{if(select.value!=='unmapped')mapping[select.dataset.jdTask]=select.value;});jdProfilesD[year]={weights,mapping};uiD.jdYear=year;closeSheet();render();toast('ใช้ JD กลางสำหรับทีมในต้นแบบแล้ว');},
 'planning-asset-d':button=>{const rows=equipmentDataD().events.filter(row=>row.asset===button.dataset.id);showSheet('ประวัติ '+button.dataset.id,rangeLabelD(uiD.range),recordsTableD(rows));$('#sheet').classList.add('sheet-wide');},
 'planning-staff-csv-d':()=>localCSV('staff-planning',['ปีงบ','เริ่ม','สิ้นสุด','ผู้ปฏิบัติงาน','กิจกรรม','หัวข้อรอง','วันที่มีบันทึก'],planningPeopleD().map(p=>{const s=PlanningD.summary(planningRowsD().rows.filter(row=>row.employeeId===p.id));return[PlanningD.fiscalYear(uiD.range.end),uiD.range.start,uiD.range.end,personLabelC(p),s.activities,s.tasks,s.days];})),
});
document.addEventListener('change',event=>{
 const name=event.target.name;
 if(['planning-mode-d','planning-fy-d'].includes(name))updateRangeFormD();
 if(name==='planning-person-d'){uiD.person=event.target.value;uiD.limit=1000;render();}
 if(name==='planning-device-type-d'){f4.healthType=event.target.value;render();}
 if(name==='planning-location-d'){state.location=event.target.value;render();}
 if(name==='planning-condition-d'){f4.healthCondition=event.target.value;render();}
});
document.addEventListener('submit',event=>{if(event.target.id==='planning-range-d'){event.preventDefault();applyPlanningRangeD();}if(event.target.id==='jd-form-d'){event.preventDefault();actions['planning-jd-save-d']();}});

// Calendar navigation keeps the existing four views, filters, holidays and edit actions.
function calendarMiniD(){const range=CalendarB.range(ui6.scheduleDate,'month');return `<div class="calendar-mini-d"><strong>${thaiMonth5(ui6.scheduleDate.slice(0,7))}</strong><div>${['จ','อ','พ','พฤ','ศ','ส','อา'].map(day=>`<small>${day}</small>`).join('')}${Array.from({length:CalendarB.weekday(range.start)},()=>'<span></span>').join('')}${CalendarB.dates(range.start,range.end).map(date=>`<button data-action="calendar-select-d" data-date="${date}" aria-label="เลือก ${thaiDate5(date)}" aria-pressed="${date===ui6.scheduleDate}" ${date===uiB.today?'aria-current="date"':''}>${Number(date.slice(-2))}</button>`).join('')}</div></div>`;}
function calendarStripD(){const range=CalendarB.range(ui6.scheduleDate,'week');return `<nav class="calendar-strip-d" aria-label="เลือกวันในสัปดาห์">${CalendarB.dates(range.start,range.end).map(date=>`<button data-action="calendar-select-d" data-date="${date}" aria-label="เลือก ${thaiDate5(date)}" aria-pressed="${date===ui6.scheduleDate}"><small>${calendarDayB(date).slice(0,2)}</small><strong>${Number(date.slice(-2))}</strong>${holidaysB(date).length?'<i aria-label="มีวันหยุด"></i>':''}</button>`).join('')}</nav>`;}
const calendarBeforeD=renderers.classrooms;
renderers.classrooms=function(){let html=calendarBeforeD();html=html.replace('<div class="calendar-content-b"',calendarStripD()+'<div class="calendar-content-b"');return `<div class="calendar-layout-d ${uiD.calendarSide?'':'hide-calendar-side-d'}"><aside class="calendar-sidebar-d" aria-label="ปฏิทินและห้อง">${calendarMiniD()}<h2>ประเภทกิจกรรม</h2>${Object.entries(calKindB).map(([kind,label])=>`<button class="calendar-kind-d" data-kind="${kind}" data-action="calendar-kind-d" aria-pressed="${ui6.scheduleKind===kind}"><i></i>${label}</button>`).join('')}${button('แสดงทุกประเภท','calendar-all-d','layers','link')}<h2>ห้องและภาคเรียน</h2><p class="caption">${state.room==='ทั้งหมด'?'ทุกห้อง':'ห้อง '+state.room} · ${f4.semester}</p>${button('เลือกปฏิทินและห้อง','calendar-filters-b','filter','secondary')}</aside><div class="calendar-main-d">${html}</div></div>`;};
actions['calendar-select-d']=button=>{ui6.scheduleDate=button.dataset.date;render();};
actions['calendar-kind-d']=button=>{ui6.scheduleKind=ui6.scheduleKind===button.dataset.kind?'all':button.dataset.kind;render();};
actions['calendar-all-d']=()=>{ui6.scheduleKind='all';render();};
const titleActionsBeforeD=renderers.classrooms;
renderers.classrooms=()=>titleActionsBeforeD().replace('<div class="cal-title-row-b">','<div class="cal-title-row-b">'+button('','calendar-sidebar-d','sidebar','icon-btn calendar-sidebar-toggle-d','aria-label="แสดงหรือซ่อนปฏิทินด้านข้าง" aria-pressed="'+uiD.calendarSide+'"'));
actions['calendar-sidebar-d']=()=>{uiD.calendarSide=!uiD.calendarSide;render();};
function buttonRolesD(scope=document){scope.querySelectorAll('.btn.primary').forEach(button=>{const review=/^(ตรวจ|ถัดไป)/.test(button.textContent.trim());button.classList.toggle('review-action-d',review);if(review)button.querySelector('.icon path')?.setAttribute('d',paths.chevron);});}
function railLabelsD(){document.querySelectorAll('#app-sidebar .sidebar-link').forEach(link=>{const label=link.querySelector('span:not(.nav-symbol-b)')?.textContent;if(label){link.setAttribute('aria-label',label);link.dataset.tooltipE=label;link.removeAttribute('title');}});for(const [selector,label]of [['.disclosure7','เครื่องมือและการจัดการ'],['.workspace-person','บัญชีและพื้นที่ทำงาน']]){const control=$('#app-sidebar '+selector);if(control){control.setAttribute('aria-label',label);control.dataset.tooltipE=label;control.removeAttribute('title');}}}
const sheetBeforeD=showSheet;
showSheet=function(...args){sheetBeforeD(...args);buttonRolesD($('#sheet'));};
const renderBeforeD=render;
render=function(...args){renderBeforeD(...args);document.body.dataset.routeD=state.route;buttonRolesD();railLabelsD();document.documentElement.dataset.planningDReady='true';document.title=currentRoute()[1]+' · labboy · Review 10';};
const headerBeforeD=header;
header=function(...args){headerBeforeD(...args);railLabelsD();};
window.planningReviewD={get range(){return{...uiD.range};},get data(){return planningRowsD();},get loads(){return uiD.loads;},get jd(){return jdProfilesD;}};
render();
