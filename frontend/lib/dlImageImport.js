import { addCalendarDays, calendarConflicts, expandCalendar, timeMinutes, validCalendarDate } from "./calendarView.js";

export const DL_IMAGE_LIMITS = { bytes:10*1024*1024, pixels:12_000_000, dimension:6000, tableRows:31, rounds:100 };
export const dlNameKey = value => String(value||"").normalize("NFC").replace(/[\s\u200b-\u200d\ufeff]+/g,"").trim();
const digits = value => String(value||"").replace(/[๐-๙]/g, digit=>String("๐๑๒๓๔๕๖๗๘๙".indexOf(digit)));
export function dlDate(value){
 const match=/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(digits(value).trim());if(!match)return "";
 let year=Number(match[3]);if(match[3].length===2)year+=2500;if(year>2400)year-=543;
 const result=`${year}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;return validCalendarDate(result)?result:"";
}
export function parseDlTimeCell(text,fallbackText=""){
 const raw=digits(text).replace(/[—–−]/g,"-");
 // Normalize explicit HHMM pairs around a time-range dash, preserving every digit.
 const source=raw.replace(/(?<![\d/])(\d{2})[ \t]*(\d{2})(?=\s*-)/g,"$1:$2").replace(/(-\s*)(\d{2})[ \t]*(\d{2})(?!\d)/g,"$1$2:$3");
 const dates=[...source.matchAll(/\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*(?:\d{4}|\d{2})(?!\d)/g)];
 const ranges = dates.length ? dates.map((date,index)=>({date:dlDate(date[0]),text:source.slice(date.index+date[0].length,dates[index+1]?.index??source.length)})) : [{date:"",text:source}];
 const rows=ranges.flatMap(range=>{
  const times=[...range.text.matchAll(/(?<!\d)(\d{1,2})\s*[.:]\s*(\d{2})\s*-\s*(\d{1,2})\s*[.:]\s*(\d{2})(?!\d)/g)];
  return (times.length?times:[null]).map(time=>({date:range.date,start:time?`${time[1].padStart(2,"0")}:${time[2]}`:"",end:time?`${time[3].padStart(2,"0")}:${time[4]}`:"",timeRecovered:source!==raw}));
 });
 if(!fallbackText)return rows;
 const alternate=parseDlTimeCell(fallbackText);
 if(alternate.length!==rows.length)return rows;
 const valid=row=>row.date&&Number.isFinite(timeMinutes(row.start))&&Number.isFinite(timeMinutes(row.end))&&timeMinutes(row.end)>timeMinutes(row.start);
 return rows.map((row,index)=>!valid(row)&&valid(alternate[index])&&(!row.date||row.date===alternate[index].date)?{...alternate[index],timeRecovered:true}:row);
}

// Find a ruled table, rather than inferring assignments from OCR reading order.
export function dlTableGeometry({width,height,data}){
 if(!width||!height||width*height>DL_IMAGE_LIMITS.pixels||data.length<width*height*4)throw new Error("ขนาดภาพไม่ถูกต้องหรือใหญ่เกิน 12 ล้านพิกเซล");
 const dark=(x,y)=>{const i=(y*width+x)*4;return data[i+3]>100&&(data[i]*.299+data[i+1]*.587+data[i+2]*.114)<145;};
 const horizontal=[];
 for(let y=0;y<height;y++){
  let start=0,best={start:0,end:0};
  for(let x=0;x<=width;x++)if(x===width||!dark(x,y)){if(x-start>best.end-best.start)best={start,end:x};start=x+1;}
  if(best.end-best.start>width*.43)horizontal.push({y,...best});
 }
 const lines=[];for(const line of horizontal){const previous=lines.at(-1);if(previous&&line.y-previous.y<=3&&Math.abs(line.start-previous.start)<8&&Math.abs(line.end-previous.end)<8)continue;lines.push(line);}
 const groups=[];for(const line of lines){let group=groups.find(group=>Math.abs(group[0].start-line.start)<10&&Math.abs(group[0].end-line.end)<10);if(!group){group=[];groups.push(group);}group.push(line);}
 const table=groups.filter(group=>group.length>=3).sort((a,b)=>b.length-a.length)[0];
 if(!table)throw new Error("ไม่พบเส้นตารางแบบตัวอย่าง ใช้ภาพที่ตรงและชัด หรือเพิ่มรายการตรวจแก้เอง");
 const left=table[0].start,right=table[0].end-1,top=table[1].y,bottom=table.at(-1).y;
 const vertical=[];
 for(let x=left;x<=right;x++){let count=0;for(let y=top;y<=bottom;y++)if(dark(x,y))count++;if(count/(bottom-top+1)>.85&&(!vertical.length||x-vertical.at(-1)>3))vertical.push(x);}
 if(vertical.length!==5||table.length-2>DL_IMAGE_LIMITS.tableRows)throw new Error("ตารางนี้ไม่ตรงรูปแบบวัน/เวลาและผู้คุม 3 ช่อง หรือมีแถวมากเกินไป กรุณาตรวจภาพ");
 const rows=table.slice(1,-1).map((line,index)=>({top:line.y,bottom:table[index+2].y})).filter(row=>row.bottom-row.top>=12);
 if(!rows.length)throw new Error("ไม่พบแถวรายการในตาราง");
 return {left,right,top:table[0].y,bottom,columns:vertical,rows};
}

export function planDlImport(rows,{participants=75,semester="2/2569",mapping={},people=[]},data){
 const issues=[],events=[],eventRowIds=[],selected=rows.filter(row=>row.selected);
 if(!selected.length)issues.push({field:"selection",message:"เลือกอย่างน้อย 1 รอบสอบ"});
 if(selected.length>DL_IMAGE_LIMITS.rounds)issues.push({field:"selection",message:"นำเข้าได้ไม่เกิน 100 รอบต่อครั้ง"});
 const rawCount=String(participants).trim(),count=/^\d+$/.test(rawCount)?Number(rawCount):NaN;if(!Number.isInteger(count)||count<1||count>10000)issues.push({field:"participants",message:"ระบุจำนวนคนต่อรอบเป็นจำนวนเต็ม 1–10,000"});
 if(!/^\d\/(25|26)\d{2}$/.test(semester))issues.push({field:"semester",message:"ระบุภาคเรียน เช่น 2/2569"});
 const validPeople=new Set(people.map(person=>person.id));
 for(const row of selected){
  if(!validCalendarDate(row.date)){issues.push({id:row.id,field:"date",message:"ตรวจวันที่ให้ถูกต้อง"});continue;}
  if(!Number.isFinite(timeMinutes(row.start))){issues.push({id:row.id,field:"start",message:"ตรวจเวลาเริ่มให้ถูกต้อง"});continue;}
  if(!Number.isFinite(timeMinutes(row.end))||timeMinutes(row.end)<=timeMinutes(row.start)){issues.push({id:row.id,field:"end",message:"ตรวจเวลาสิ้นสุดให้อยู่หลังเวลาเริ่มในวันเดียวกัน"});continue;}
  const assignments=row.manualProctors||row.proctorKeys.map(key=>mapping[key]);
  const proctors=[...new Set(assignments.filter(id=>validPeople.has(id)))];
  if(!assignments.length||!proctors.length||assignments.some(id=>!validPeople.has(id)&&id!=="none")){issues.push({id:row.id,field:"proctors",message:"จับคู่ผู้คุมสอบให้ครบตามภาพ"});continue;}
  if(proctors.length!==assignments.filter(id=>id!=="none").length){issues.push({id:row.id,field:"proctors",message:"ชื่อผู้คุมซ้ำในรอบเดียวกัน ตรวจการจับคู่"});continue;}
  events.push({title:"สอบ Digital Literacy",kind:"dl",date:row.date,start:row.start,end:row.end,rooms:count>40?["406","407"]:["406"],participants:count,proctors,semester,repeat:"none"});
  eventRowIds.push(row.id);
 }
 if(events.length){
  const dates=events.map(row=>row.date).sort();
  if(dates.at(-1)>addCalendarDays(dates[0],369))issues.push({field:"date",message:"ช่วงวันเกิน 1 ปี กรุณาตรวจปีและวันที่จากภาพ"});
  else {const existing=expandCalendar(data,{start:dates[0],end:dates.at(-1)});
   for(let i=0;i<events.length;i++){const event=events[i],clash=calendarConflicts(event,[...existing,...events.slice(0,i)]);if(clash.length)issues.push({id:eventRowIds[i],field:"conflict",message:`วันที่ ${event.date} ${event.start}–${event.end} ห้อง ${event.rooms.join(" + ")} ซ้ำหรือชนกับตารางที่มีอยู่`,existing:existing.includes(clash[0])});}
  }
 }
 return {events:issues.length?[]:events,issues,selected:selected.length};
}
