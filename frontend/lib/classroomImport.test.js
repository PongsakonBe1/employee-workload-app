import { describe, expect, it } from "vitest";
import { classroomTermDefaults, importDate, importTermIssues, parseClassroomPages, planClassroomImport } from "./classroomImport";
const empty={events:[],rules:[]};
const terms={vocational:{start:"2569-11-02",end:"2570-03-14"},higher:{start:"2026-11-23",end:"2027-03-14"}};
const row={id:"a",title:"วิชาตัวอย่าง",room:"401",weekday:0,start:"08:00",end:"10:00",group:"higher",selected:true};
const item=(str,x,y,width=10)=>({str,x,y,width,height:10});
function page() {return {height:842,items:[item("401 ห้องเรียน",30,60),item("08.00-09.00",75,90,30),item("09.00-10.00",115,90,30),item("10.00-11.00",155,90,30),item("จันทร์",30,120),item("ปวช. 00000000",80,120,45),item("/ ผู้สอนตัวอย่าง",125,120,25),item("อังคาร",30,145),item("งดให้บริการ",80,145,20)],lines:[70,150,190].flatMap(x=>[{x1:x,y1:105,x2:x,y2:135},{x1:x,y1:135,x2:x,y2:160}])};}
describe("classroom PDF geometry",()=>{
  it("reads a merged two-period cell and joins split text without using fill colors",()=>{
    const result=parseClassroomPages([page()]);expect(result.rows).toHaveLength(1);expect(result.rows[0]).toMatchObject({room:"401",weekday:0,start:"08:00",end:"10:00",group:"vocational",title:"ปวช. 00000000 / ผู้สอนตัวอย่าง"});expect(result.ignored).toBe(1);
  });
  it("rejects scans, empty documents, oversized batches and broken axes",()=>{
    expect(()=>parseClassroomPages([])).toThrow();expect(()=>parseClassroomPages(Array(6).fill(page()))).toThrow();expect(()=>parseClassroomPages([{items:[],lines:[]}])).toThrow();
    const broken=page();broken.items[2].str="10.00-11.00";expect(()=>parseClassroomPages([broken])).toThrow();
  });
  it("reports unreadable sections rather than inventing rows",()=>{
    const first=page(),second={...page(),items:page().items.filter(x=>!x.str.includes(".00"))};expect(parseClassroomPages([first,second]).warnings).toHaveLength(1);
  });
  it("uses weekday labels only in the day column, preserving weekday words in course text",()=>{
    const fixture=page();fixture.items.push(item("อาทิตย์",95,120,20));const result=parseClassroomPages([fixture]);expect(result.rows).toHaveLength(1);expect(result.rows[0].title).toContain("อาทิตย์");
  });
  it("reads adjacent header times concatenated into one PDF text item",()=>{
    const fixture=page();fixture.items=fixture.items.filter(x=>!x.str.includes(".00"));fixture.items.push(item("08.00-09.0009.00-10.0010.00-11.00",70,90,120));expect(parseClassroomPages([fixture]).rows[0]).toMatchObject({start:"08:00",end:"10:00"});
  });
});
describe("classroom import planning",()=>{
  it("uses the confirmed semester dates for both levels and leaves other semesters blank",()=>{
    expect(classroomTermDefaults("2/2569")).toEqual({vocational:{start:"2026-11-02",end:"2027-03-14"},higher:{start:"2026-11-23",end:"2027-03-14"}});
    expect(classroomTermDefaults("1/2570").higher.end).toBe("");
    const edited=classroomTermDefaults("2/2569");edited.higher.end="2027-01-01";expect(classroomTermDefaults("2/2569").higher.end).toBe("2027-03-14");
  });
  it("allows two levels in the same room at separate hours but detects an actual overlapping occurrence",()=>{
    const vocational={...row,id:"v",group:"vocational"};
    const higher={...row,id:"h",start:"10:00",end:"12:00"};
    const defaults=classroomTermDefaults("2/2569");
    expect(planClassroomImport([vocational,higher],defaults,"2/2569",empty).rules).toHaveLength(2);
    const overlap=planClassroomImport([vocational,{...higher,start:"09:00"}],defaults,"2/2569",empty);
    expect(overlap.issues[0]).toMatchObject({code:"overlap",conflict:{origin:"batch",date:"2026-11-23",sourceLabel:"รายการอื่นในไฟล์ที่เลือก"}});
  });
  it("names the existing conflicting course and separates duplicate records from time overlaps",()=>{
    const defaults=classroomTermDefaults("2/2569"), existing=planClassroomImport([row],defaults,"2/2569",empty).rules;
    const duplicate=planClassroomImport([row],defaults,"2/2569",{events:[],rules:existing},"ชุดตัวอย่าง");
    expect(duplicate.issues[0]).toMatchObject({code:"duplicate",conflict:{origin:"existing",title:row.title,sourceLabel:"ชุดตัวอย่าง"}});
    expect(duplicate.issues[0].message).toContain(row.title);
    const overlap=planClassroomImport([{...row,title:"อีกวิชา"}],defaults,"2/2569",{events:[],rules:existing});expect(overlap.issues[0].code).toBe("overlap");
  });
  it("identifies each missing term field once for multiple selected courses",()=>{
    const rows=[row,{...row,id:"b"},{...row,id:"c",group:"vocational"}];
    const issues=importTermIssues(rows,{higher:{start:"2026-11-23"},vocational:{}});
    expect(issues.map(({group,field})=>({group,field}))).toEqual([{group:"higher",field:"end"},{group:"vocational",field:"start"},{group:"vocational",field:"end"}]);
    expect(issues[0].message).toContain("วันสิ้นสุดของ ป.ตรี");
    expect(planClassroomImport(rows,{higher:{start:"2026-11-23"}},"2/2569",empty).rules).toEqual([]);
  });
  it("does not require term dates for deselected groups or invent a higher end date",()=>{
    expect(importTermIssues([{...row,selected:false},{...row,id:"v",group:"vocational"}],terms)).toEqual([]);
    expect(importTermIssues([row],{higher:{start:"2026-11-23"}})).toMatchObject([{field:"end"}]);
  });
  it("points to the end field for reversed/oversized ranges and the invalid field for rollover",()=>{
    for(const end of ["2026-11-01","2028-03-14"]) expect(importTermIssues([row],{higher:{start:"2026-11-23",end}})).toMatchObject([{field:"end"}]);
    expect(importTermIssues([row],{higher:{start:"2027-02-29",end:"2027-03-14"}})).toMatchObject([{field:"start"}]);
  });
  it("converts Buddhist dates and rejects rollover",()=>{expect(importDate("2569-11-02")).toBe("2026-11-02");expect(importDate("2570-02-29")).toBe("");});
  it("aligns weekly occurrences to the first weekday after term start",()=>{
    const result=planClassroomImport([{...row,weekday:1}],terms,"2/2569",empty);expect(result.issues).toEqual([]);expect(result.rules[0].validFrom).toBe("2026-11-24");expect(result.occurrences).toBe(16);
  });
  it("requires an explicit higher education end date and a selected row",()=>{
    expect(planClassroomImport([row],{higher:{start:"2026-11-23"}},"2/2569",empty).rules).toEqual([]);
    expect(planClassroomImport([{...row,selected:false}],terms,"2/2569",empty).issues).toHaveLength(1);
  });
  it("blocks duplicate rows and rolls back the entire batch",()=>{
    const result=planClassroomImport([row,{...row,id:"b"}],terms,"2/2569",empty);expect(result.rules).toEqual([]);expect(result.issues[0].id).toBe("b");expect(result.occurrences).toBe(0);
  });
  it("checks all dates including a dated exam late in the semester",()=>{
    const data={rules:[],events:[{id:"exam",date:"2027-03-08",start:"09:00",end:"09:30",rooms:["401"],title:"สอบตัวอย่าง"}]};const issue=planClassroomImport([row],terms,"2/2569",data).issues[0];expect(issue.conflict.date).toBe("2027-03-08");expect(issue.message).toContain("2570");expect(data.events).toHaveLength(1);
  });
  it("allows touching periods and different rooms; ignores unchecked invalid rows",()=>{
    const result=planClassroomImport([row,{...row,id:"b",start:"10:00",end:"11:00"},{...row,id:"c",room:"402"},{...row,id:"d",start:"bad",selected:false}],terms,"2/2569",empty);expect(result.rules).toHaveLength(3);
  });
  it("rejects invalid rooms, times, weekdays, terms and titles",()=>{
    for(const patch of [{room:"403"},{start:"25:00"},{end:"07:00"},{weekday:7},{weekday:1.5},{title:""}]) expect(planClassroomImport([{...row,...patch}],terms,"2/2569",empty).rules).toEqual([]);
    expect(planClassroomImport([row],terms,"invalid",empty).rules).toEqual([]);
    expect(planClassroomImport([row],{higher:{start:"2026-01-01",end:"2028-01-01"}},"2/2569",empty).rules).toEqual([]);
  });
  it("detects an already imported rule with a different ID",()=>{
    const first=planClassroomImport([row],terms,"2/2569",empty);expect(planClassroomImport([{...row,id:"new"}],terms,"2/2569",{events:[],rules:first.rules}).rules).toEqual([]);
  });
});
