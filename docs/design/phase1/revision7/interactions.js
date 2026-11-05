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
}
render=function(options={}){renderBase7(options);enhance7();};
document.addEventListener('pointerover',event=>{
 if(event.pointerType==='touch'||reduceMotion6())return;
 const control=event.target.closest('.quick-card,.room-actions7 button');
 if(!control||control.contains(event.relatedTarget))return;
 const symbol=$('.icon',control);symbol?.getAnimations().forEach(a=>a.cancel());
 animate6(symbol,[{transform:'translateY(0)'},{transform:'translateY(-2px)',offset:.4},{transform:'translateY(0)'}],{duration:240});
});
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action="notifications"]');
 if(b)animate6($('.icon',b),[{transform:'rotate(0)'},{transform:'rotate(-10deg)',offset:.3},{transform:'rotate(7deg)',offset:.65},{transform:'rotate(0)'}],{duration:280});
});
document.addEventListener('scroll',()=>document.body.classList.toggle('content-scrolled7',scrollY>12),{passive:true});
const reviewCore7=window.designReview;
window.designReview={...reviewCore7,revision:7,getSummary:()=>({...reviewCore7.getSummary(),revision:7,roomRows:f4.rooms.map(r=>({...r})),undoEntries:ui7.undo.map(r=>({...r}))})};
render();
