const {test}=require('node:test'),assert=require('node:assert/strict'),cal=require('./calendar-data.js');
test('Date-only navigation handles leap days, month ends and a Sunday across a year boundary',()=>{
 assert.equal(cal.valid('2026-02-29'),false);assert.equal(cal.valid('2028-02-29'),true);
 assert.equal(cal.addMonths('2026-01-31',1),'2026-02-28');assert.equal(cal.addMonths('2028-01-31',1),'2028-02-29');
 assert.deepEqual(cal.range('2027-01-03','week'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(cal.range('2026-12-31','month'),{start:'2026-12-01',end:'2026-12-31'});
 assert.equal(cal.dates('2026-12-31','2027-01-02').length,3);
 assert.equal(cal.todayBangkok(new Date('2026-11-05T16:59:00Z')),'2026-11-05');assert.equal(cal.todayBangkok(new Date('2026-11-05T17:00:00Z')),'2026-11-06');assert.equal(cal.todayBangkok(new Date('2026-12-31T17:00:00Z')),'2027-01-01');
});
test('ICS unfolds lines, decodes escaped text, keeps exclusive end and separates holidays from observances',()=>{
 const text='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:a\r\nDTSTART;VALUE=DATE:20261205\r\nDTEND;VALUE=DATE:20261207\r\nSUMMARY:วันตัวอย่าง\\,\r\n ต่อเนื่อง\r\nDESCRIPTION:วันหยุดนักขัตฤกษ์\\nรายละเอียด\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:b\r\nDTSTART;VALUE=DATE:20261205\r\nSUMMARY:วันสำคัญตัวอย่าง\r\nDESCRIPTION:วันสำคัญ\\nรายละเอียด\r\nEND:VEVENT\r\nEND:VCALENDAR';
 const {events,unsupported}=cal.parseICS(text);assert.equal(unsupported,0);assert.equal(events.length,2);
 assert.equal(events.find(e=>e.id==='a').title,'วันตัวอย่าง,ต่อเนื่อง');
 assert.equal(cal.holidaysOn(events,'2026-12-05').length,1);assert.equal(cal.holidaysOn(events,'2026-12-06').length,1);assert.equal(cal.holidaysOn(events,'2026-12-07').length,0);
 assert.equal(cal.holidaysOn(events,'2026-12-05',{public:true,observance:true}).length,2);
});
test('Cancelled, invalid and timed events never become all-day holidays; duplicates use the latest revision',()=>{
 const event=(id,start,extra='')=>`BEGIN:VEVENT\nUID:${id}\nDTSTART:${start}\nSUMMARY:ตัวอย่าง\n${extra}\nEND:VEVENT\n`;
 const text='BEGIN:VCALENDAR\n'+event('a','20260230')+event('b','20261205T090000Z')+event('c','20261205','STATUS:CANCELLED')+event('d','20261205','SEQUENCE:1')+event('d','20261206','SEQUENCE:2')+event('e','20261205','RRULE:FREQ=YEARLY')+'END:VCALENDAR';
 const parsed=cal.parseICS(text);assert.equal(parsed.events.length,1);assert.equal(parsed.events[0].start,'2026-12-06');assert.equal(parsed.events[0].kind,'unknown');assert.equal(parsed.unsupported,1);
 assert.equal(cal.holidaysOn(parsed.events,'2026-12-06',{public:true,observance:true}).length,0);
});
