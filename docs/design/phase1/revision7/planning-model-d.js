/* Pure date, identity and count contracts. No Firebase connection or performance scores. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./calendar-data.js'));else root.PlanningD=factory(root.CalendarB);})(typeof globalThis==='object'?globalThis:this,function(C){
 'use strict';
 const fiscalYear=date=>Number(date.slice(0,4))+543+(Number(date.slice(5,7))>=10?1:0);
 function period(mode,anchor,year=fiscalYear(anchor),custom={}){
  if(!C.valid(anchor))throw Error('วันที่อ้างอิงไม่ถูกต้อง');
  if(mode==='day')return{start:anchor,end:anchor};
  if(mode==='week'||mode==='month')return C.range(anchor,mode);
  if(mode==='quarter'){const month=Math.floor((Number(anchor.slice(5,7))-1)/3)*3+1,start=anchor.slice(0,4)+'-'+String(month).padStart(2,'0')+'-01';return{start,end:C.addDays(C.addMonths(start,3),-1)};}
  if(mode==='fiscal'){if(!Number.isInteger(Number(year))||year<2444||year>3543)throw Error('ปีงบประมาณไม่ถูกต้อง');const y=Number(year)-543;return{start:`${y-1}-10-01`,end:`${y}-09-30`};}
  if(mode==='custom'&&C.valid(custom.start)&&C.valid(custom.end)&&custom.start<=custom.end)return{start:custom.start,end:custom.end};
  throw Error('เลือกช่วงวันที่เริ่มต้นและสิ้นสุดให้ถูกต้อง');
 }
 function queryPlan(range,employeeId=null,cursor=null){
  period('custom',range.start,null,range);
  // DocumentSnapshot cursors include the implicit document-key tiebreaker;
  // avoid adding an explicit second range/order field solely for pagination.
  return{collection:'worklogs',where:[['date','>=',range.start],['date','<=',range.end],...(employeeId?[['employeeId','==',employeeId]]:[])],orderBy:[['date','asc']],limit:1000,startAfter:cursor||null};
 }
 function normalize(rawRows,people){
  const byId=new Map(people.map(p=>[p.id,p])),aliases=new Map(),seen=new Set();
  people.forEach(p=>[p.name,p.displayName,p.fullName].filter(Boolean).forEach(name=>{const set=aliases.get(name)||new Set();set.add(p.id);aliases.set(name,set);}));
  return rawRows.filter((row,index)=>{const id=row.id||'ROW-'+index;if(seen.has(id))return false;seen.add(id);return true;}).map((row,index)=>{
   const explicit=row.employeeId||row.personId,alias=row.person||row.employeeDisplayName,ids=aliases.get(alias),employeeId=explicit?(byId.has(explicit)?explicit:null):ids?.size===1?[...ids][0]:null;
   return{...row,id:row.id||'ROW-'+index,date:C.valid(row.date||'')?row.date:null,time:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time||'')?row.time:null,employeeId,identity:explicit?(employeeId?'id':'unknown-id'):employeeId?'unique-label':'unresolved',task:row.minorTask||row.task||'ไม่ระบุหัวข้อรอง',group:row.comboGroupId||row.batch||null};
  });
 }
 const inRange=(rows,range)=>rows.filter(row=>row.date&&row.date>=range.start&&row.date<=range.end);
 function countBy(rows,key){const counts=new Map();for(const row of rows){const value=typeof key==='function'?key(row):row[key];counts.set(value,(counts.get(value)||0)+1);}return[...counts].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),'th'));}
 function summary(rows){const grouped=rows.filter(row=>row.group&&row.employeeId);return{activities:rows.length,days:new Set(rows.map(row=>row.date)).size,tasks:new Set(rows.map(row=>row.task)).size,people:new Set(rows.map(row=>row.employeeId).filter(Boolean)).size,unresolved:rows.filter(row=>!row.employeeId).length,comboGroups:new Set(grouped.map(row=>row.employeeId+'|'+row.group)).size,groupedActivities:grouped.length};}
 function trend(rows,range){
  const days=(Date.parse(range.end)-Date.parse(range.start))/86400000+1,unit=days<=62?'day':days<=730?'month':'year',key=date=>unit==='day'?date:unit==='month'?date.slice(0,7):date.slice(0,4),counts=new Map(countBy(rows,row=>key(row.date))),buckets=[];
  if(unit==='day')for(const date of C.dates(range.start,range.end))buckets.push(date);
  else if(unit==='month')for(let date=range.start.slice(0,8)+'01';date<=range.end;date=C.addMonths(date,1))buckets.push(date.slice(0,7));
  else for(let year=Number(range.start.slice(0,4));year<=Number(range.end.slice(0,4));year++)buckets.push(String(year));
  return{unit,values:buckets.map(date=>({date,count:counts.get(date)||0}))};
 }
 function equipmentEvents(rows,registry){
  return rows.filter(row=>/^(ยืม|คืน)/.test(row.task)).map(row=>{
   const explicit=row.equipmentId||row.deviceId||row.equipment,detail=row.detail||'',tokens=detail.split(/[\s/·,]+/),matches=registry.filter(item=>explicit?(item.id===explicit||item.name===explicit):tokens.includes(item.id)||detail===item.name);
   return{...row,asset:matches.length===1?matches[0].id:null,action:row.task.startsWith('ยืม')?'borrow':'return',condition:['normal','damaged','lost'].includes(row.equipmentCondition)?row.equipmentCondition:null};
  });
 }
 return{fiscalYear,period,queryPlan,normalize,inRange,countBy,summary,trend,equipmentEvents};
});
