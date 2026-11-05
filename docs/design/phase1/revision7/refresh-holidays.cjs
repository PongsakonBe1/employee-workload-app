/* Fetch only a public, fixed Google regional calendar. No account or credentials. */
const fs=require('node:fs'),path=require('node:path'),{parseICS}=require('./calendar-data.js');
const sourceUrl='https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics';
(async()=>{
 const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Holiday source returned '+response.status);
 const parsed=parseICS(await response.text());if(!parsed.events.length||parsed.unsupported)throw Error('Incomplete or unsupported holiday source');
 const data={source:'Google Calendar · ประเทศไทย',sourceUrl,fetchedAt:new Date().toISOString(),coverageYears:[...new Set(parsed.events.map(event=>event.start.slice(0,4)))].sort(),events:parsed.events};
 const output=path.resolve(__dirname,'data/th-holidays.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({events:data.events.length,years:data.coverageYears,public:data.events.filter(e=>e.kind==='public').length,observances:data.events.filter(e=>e.kind==='observance').length,unknown:data.events.filter(e=>e.kind==='unknown').length}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
