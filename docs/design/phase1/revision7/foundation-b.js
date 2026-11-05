/* Shared web symbols and motion; no Apple font or SF Symbols assets distributed. */
'use strict';
document.documentElement.dataset.designBatch='B';
Object.assign(paths,{
 more:'M5 12h.01M12 12h.01M19 12h.01',
 filter:'M4 7h16M7 12h10M10 17h4',
 calendar:'M5 5h14v15H5zM5 10h14M8 3v4M16 3v4M8 13h2M14 13h2M8 16h2M14 16h2',
 chart:'M4 4v16h16M8 16v-4M12 16V8M16 16v-6M20 16V5',
 phone:'M7 3H3v3c0 8.3 6.7 15 15 15h3v-4l-5-2-2 3a14 14 0 0 1-8-8l3-2z',
});
for(const template of f4.templateRows){if(template.action==='phone-log')template.symbol='phone';if(template.action==='smart-room')template.symbol='door';}
const tonesB={record:'blue','new-log':'blue',worklogs:'blue',classrooms:'purple',dl:'blue',imports:'purple',resources:'green',equipment:'purple',usage:'amber',condition:'red',dashboard:'blue',staff:'purple',profile:'purple',templates:'purple',admin:'red',users:'blue',audit:'amber',settings:'blue',help:'green'};
const glyphsB={record:'record',worklogs:'file',classrooms:'calendar',dl:'calendar',imports:'upload',resources:'headphones',equipment:'box',usage:'chart',condition:'shield',dashboard:'chart',staff:'users',profile:'person',templates:'bolt',admin:'shield',users:'users',audit:'clock',system:'settings',settings:'settings',broadcast:'send',cleanup:'filter','data-import':'upload',notifications:'bell',help:'help',about:'help',export:'download','export-requests':'file'};
function addSymbolLayerB(svg,shape){
 if(!svg||svg.dataset.layeredB)return;svg.dataset.layeredB='true';
 if(!['calendar','file','headphones'].includes(shape))return;
 const layer=document.createElementNS('http://www.w3.org/2000/svg','path');
 layer.setAttribute('d',shape==='calendar'?'M5 5h14v5H5z':shape==='file'?'M5 3h9v5h5v13H5z':'M3 13h4v7H3zM17 13h4v7h-4z');
 layer.setAttribute('fill','currentColor');layer.setAttribute('fill-opacity','.16');layer.setAttribute('stroke','none');svg.prepend(layer);
}
function enhanceSymbolsB(scope=document){
 scope.querySelectorAll('.tag').forEach(tag=>{if(['กำลังยืม','ใช้งาน'].includes(tag.textContent.trim())){tag.classList.remove('amber');tag.classList.add('blue');}});
 scope.querySelectorAll('.sidebar-link[href]').forEach(link=>{
  const route=link.getAttribute('href').replace('#/',''),svg=link.querySelector('.icon');if(!svg||svg.parentElement.classList.contains('nav-symbol-b'))return;
  if(glyphsB[route])svg.querySelector('path')?.setAttribute('d',paths[glyphsB[route]]);
  const holder=document.createElement('span');holder.className='nav-symbol-b';holder.dataset.tone=tonesB[route]||'blue';holder.setAttribute('aria-hidden','true');svg.before(holder);holder.append(svg);
  addSymbolLayerB(svg,['classrooms','dl'].includes(route)?'calendar':route==='worklogs'?'file':route==='resources'?'headphones':'');
 });
 scope.querySelectorAll('.quick-card').forEach(card=>{
  const template=f4.templateRows.find(row=>row.id===card.dataset.id),tile=card.querySelector('.tile-icon');if(!tile||!template)return;
  tile.dataset.tone=template.kind==='combo'?(template.action==='combo-software'?'purple':'blue'):template.minorTask.includes('ห้อง')?'purple':template.kind==='smart'?'green':'amber';
  addSymbolLayerB(tile.querySelector('.icon'),template.minorTask.includes('หูฟัง')?'headphones':'');
 });
}
const headerBeforeB=header;
header=function(...args){headerBeforeB(...args);enhanceSymbolsB();};
const animateBeforeB=animate6;
animate6=function(element,frames,options={}){
 const duration=options.duration;
 if(duration>220&&duration<=350)options={...options,duration:element?.id==='sheet'?(narrow5()?320:240):220};
 return animateBeforeB(element,frames,options);
};
const sheetSymbolsBeforeB=showSheet;
showSheet=function(...args){sheetSymbolsBeforeB(...args);enhanceSymbolsB($('#sheet'));};
let lastLogCountB=state.logs.length,lastRouteB=null,lastCalendarB=null;
const renderBeforeB=render;
render=function(...args){
 uiB.today=CalendarB.todayBangkok();
 const saved=state.logs.length>lastLogCountB;lastLogCountB=state.logs.length;
 renderBeforeB(...args);enhanceSymbolsB();
 document.title=currentRoute()[1]+' · labboy · Review 08 — ชุดสอง';
 document.documentElement.dataset.batchBReady='true';
 const signature=ui6.scheduleDate+'|'+scheduleModeB()+'|'+state.room+'|'+ui6.scheduleKind;
 if(state.route==='classrooms'){
  if(lastRouteB!==state.route)animate6($('.calendar-workspace-b'),[{opacity:.45,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});
  else if(lastCalendarB!==signature)animate6($('.calendar-content-b'),[{opacity:.6},{opacity:1}],{duration:150});
  lastCalendarB=signature;
 }
 lastRouteB=state.route;
 if(saved){const symbol=$('.recent-list .icon');animate6(symbol,[{opacity:.4,transform:'scale(.75)'},{opacity:1,transform:'scale(1)'}],{duration:180});}
};
let narrowBeforeB=narrow5(),resizeFrameB=0;
addEventListener('resize',()=>{cancelAnimationFrame(resizeFrameB);resizeFrameB=requestAnimationFrame(()=>{if(narrowBeforeB!==narrow5()){narrowBeforeB=narrow5();stashManual5();render();}});});
document.addEventListener('submit',event=>{if(event.target.id==='calendar-jump-b'){event.preventDefault();actions['calendar-jump-save-b']();}else if(event.target.id==='calendar-filters-b')event.preventDefault();});
window.batchBReview={get mode(){return scheduleModeB();},get range(){return scheduleRangeB();},get rows(){return scheduleRowsB();},get holidayCount(){return uiB.holidays?.events.length||0;},get layers(){return holidayOptionsB();},motion:{press:115,selection:220,dialog:240,sheet:320,save:180}};
render();
