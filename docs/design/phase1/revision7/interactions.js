/* Meaningful, finite symbol feedback; inherited dialogs/lenses retain R06 focus handling. */
'use strict';
let previousRoute7=null;
const renderBase7=render;
function enhance7(){
 document.title=currentRoute()[1]+' · labboy · Review 07';
 document.documentElement.dataset.reviewReady='7';
 document.body.dataset.area=activeArea7();
 const active=$('#app-sidebar .sidebar-link.active');
 if(state.route!==previousRoute7){
  animate6(active?.querySelector('.icon'),[{transform:'scale(.84)',opacity:.6},{transform:'scale(1.08)',offset:.65},{transform:'scale(1)',opacity:1}],{duration:250});
  previousRoute7=state.route;
 }
 $$('.quick-card .icon').forEach(el=>{el.dataset.symbolMotion='feedback';});
 applyAccessA();
}
// Adapt the inherited prototype's typography and geometry without changing its data.
function applyAccessA(){
 const rootSize=parseFloat(getComputedStyle(document.documentElement).fontSize);
 for(const el of document.querySelectorAll('#content *,#app-sidebar *,#app-header *,#mobile-nav *,#sheet *,#toast *, .review-label *')){
  if(!(el instanceof HTMLElement)||!el.checkVisibility())continue;
  if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<rootSize*.75-.1)el.style.fontSize='var(--text-caption)';
 }
 // A native checkbox stays visually small while its associated label receives touch.
 document.querySelectorAll('input[type=checkbox],input[type=radio]').forEach(input=>{
  if(input.closest('label'))return;
  const label=document.createElement('label');label.className='check-hit-a';
  input.before(label);label.append(input);
 });
 // SVG viewBox units scale with the viewport; compensate labels for that scale.
 document.querySelectorAll('svg.chart,svg.radar').forEach(svg=>{
  const scale=svg.getScreenCTM();if(!scale)return;
  const factor=Math.hypot(scale.a,scale.b)||1;
  svg.querySelectorAll('text').forEach(text=>text.style.fontSize=(rootSize*.75/factor)+'px');
 });
 const coarse=matchMedia('(any-pointer:coarse)').matches;
 document.querySelectorAll('.source-plan6').forEach(plan=>{
  const scale=narrow5()?24:30,unit=coarse?100:80,ratio=unit/scale;
  plan.querySelectorAll('.source-block6,.source-plan-hours6 span').forEach(el=>{
   if(!el.dataset.baseTopA)el.dataset.baseTopA=el.style.top;
   el.style.top=parseFloat(el.dataset.baseTopA)*ratio+'px';
   if(el.matches('.source-block6')){
    if(!el.dataset.baseHeightA)el.dataset.baseHeightA=el.style.height;
    el.style.height=(parseFloat(el.dataset.baseHeightA)+2)*ratio-2+'px';
   }
  });
  plan.querySelectorAll('.source-plan-day6,.source-plan-hours6').forEach(el=>{
   el.style.height=13*unit+'px';
   if(el.matches('.source-plan-day6'))el.style.backgroundImage=`repeating-linear-gradient(to bottom,transparent 0,transparent ${unit-1}px,var(--line) ${unit-1}px,var(--line) ${unit}px)`;
  });
 });
 document.querySelectorAll('.week-grid').forEach(grid=>{
  const ratio=coarse?2:1.5;
  grid.querySelectorAll('.week-event').forEach(el=>{
   if(!el.dataset.baseTopA){el.dataset.baseTopA=el.style.top;el.dataset.baseHeightA=el.style.height;}
   el.style.top=parseFloat(el.dataset.baseTopA)*ratio+'px';
   el.style.height=(parseFloat(el.dataset.baseHeightA)+3)*ratio-3+'px';
  });
  grid.querySelectorAll('.week-hours span').forEach(el=>{
   if(!el.dataset.baseTopA)el.dataset.baseTopA=el.style.top;
   el.style.top=parseFloat(el.dataset.baseTopA)*ratio+'px';
  });
  grid.querySelectorAll('.week-hours,.week-day').forEach(el=>{
   el.style.height=650*ratio+'px';
   if(el.matches('.week-day'))el.style.backgroundImage=`repeating-linear-gradient(to bottom,transparent 0,transparent ${50*ratio-1}px,var(--line) ${50*ratio-1}px,var(--line) ${50*ratio}px)`;
  });
 });
}
const showSheetBaseA=showSheet;
showSheet=function(...args){showSheetBaseA(...args);applyAccessA();};
let accessFrameA=0;
addEventListener('resize',()=>{cancelAnimationFrame(accessFrameA);accessFrameA=requestAnimationFrame(applyAccessA);});
render=function(options={}){renderBase7(options);enhance7();};
document.addEventListener('pointerover',event=>{
 if(document.documentElement.dataset.designBatch==='B')return;
 if(event.pointerType==='touch'||reduceMotion6())return;
 const control=event.target.closest('.quick-card,.room-actions7 button');
 if(!control||control.contains(event.relatedTarget))return;
 const symbol=$('.icon',control);symbol?.getAnimations().forEach(a=>a.cancel());
 animate6(symbol,[{transform:'translateY(0)'},{transform:'translateY(-2px)',offset:.4},{transform:'translateY(0)'}],{duration:240});
});
document.addEventListener('click',event=>{
 if(document.documentElement.dataset.designBatch==='B')return;
 const b=event.target.closest('[data-action="notifications"]');
 if(b)animate6($('.icon',b),[{transform:'rotate(0)'},{transform:'rotate(-10deg)',offset:.3},{transform:'rotate(7deg)',offset:.65},{transform:'rotate(0)'}],{duration:280});
});
document.addEventListener('scroll',()=>document.body.classList.toggle('content-scrolled7',scrollY>12),{passive:true});
const reviewCore7=window.designReview;
window.designReview={...reviewCore7,revision:7,getSummary:()=>({...reviewCore7.getSummary(),revision:7,roomRows:f4.rooms.map(r=>({...r})),undoEntries:ui7.undo.map(r=>({...r}))})};
render();
