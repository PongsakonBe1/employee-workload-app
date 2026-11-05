/* Date-only calendar logic shared by the browser prototype and Node verification. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CalendarB=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const iso=date=>date.toISOString().slice(0,10);
 function valid(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&iso(new Date(date+'T12:00:00Z'))===date;}
 function dateUTC(date){if(!valid(date))throw Error('Invalid calendar date');return new Date(date+'T12:00:00Z');}
 function addDays(date,days){const d=dateUTC(date);d.setUTCDate(d.getUTCDate()+days);return iso(d);}
 function addMonths(date,months){const d=dateUTC(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0,12)).getUTCDate();d.setUTCDate(Math.min(day,last));return iso(d);}
 const weekday=date=>(dateUTC(date).getUTCDay()+6)%7;
 function todayBangkok(now=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');}
 function range(date,mode){
  dateUTC(date);
  if(mode==='day')return {start:date,end:date};
  if(mode==='month'){const first=date.slice(0,8)+'01';return {start:first,end:addDays(addMonths(first,1),-1)};}
  const start=addDays(date,-weekday(date));return {start,end:addDays(start,6)};
 }
 function dates(start,end){if(!valid(start)||!valid(end)||end<start)throw Error('Invalid date range');const result=[];for(let date=start;date<=end;date=addDays(date,1)){if(result.length>=400)throw Error('Calendar range too large');result.push(date);}return result;}
 const unescapeText=value=>value.replace(/\\([nN,;\\])/g,(_,char)=>/[nN]/.test(char)?'\n':char);
 const compactDate=value=>/^\d{8}$/.test(value)?value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6):'';
 function parseICS(text){
  if(!text.includes('BEGIN:VCALENDAR'))throw Error('Not an iCalendar document');
  const lines=text.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n'),events=new Map();let current=null,unsupported=0;
  for(const line of lines){
   if(line==='BEGIN:VEVENT'){current={};continue;}
   if(line==='END:VEVENT'){
    if(!current)continue;
    if(current.RRULE){unsupported++;current=null;continue;}
    const start=compactDate(current.DTSTART||''),end=compactDate(current.DTEND||'')|| (valid(start)?addDays(start,1):'');
    if(current.STATUS!=='CANCELLED'&&valid(start)&&valid(end)&&end>start&&current.SUMMARY){
     const description=unescapeText(current.DESCRIPTION||''),kind=description.startsWith('วันหยุดนักขัตฤกษ์')?'public':description.startsWith('วันสำคัญ')?'observance':'unknown';
     const id=current.UID||start+'|'+current.SUMMARY,previous=events.get(id),version=(current['LAST-MODIFIED']||'')+'|'+(current.SEQUENCE||'0').padStart(8,'0');
     if(!previous||version>=previous.version)events.set(id,{id,start,endExclusive:end,title:unescapeText(current.SUMMARY),kind,version});
    }
    current=null;continue;
   }
   if(!current)continue;
   const colon=line.indexOf(':');if(colon<0)continue;const property=line.slice(0,colon),name=property.split(';')[0];
   if(['UID','DTSTART','DTEND','SUMMARY','DESCRIPTION','STATUS','RRULE','LAST-MODIFIED','SEQUENCE'].includes(name))current[name]=line.slice(colon+1);
  }
  const rows=[...events.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title));
  return {events:rows.map(({version,...event})=>event),unsupported};
 }
 function holidaysOn(events,date,options={public:true,observance:false}){
  return events.filter(event=>event.start<=date&&date<event.endExclusive&&((event.kind==='public'&&options.public)||(event.kind==='observance'&&options.observance)));
 }
 return {valid,addDays,addMonths,weekday,todayBangkok,range,dates,parseICS,holidaysOn};
});
