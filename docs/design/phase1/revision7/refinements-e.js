/* Accessible, viewport-bound tooltips for the compact calendar navigation rail. */
'use strict';
(()=>{
 const rail=document.querySelector('#app-sidebar');
 const tooltip=document.createElement('div');tooltip.id='nav-tooltip-e';tooltip.className='nav-tooltip-e';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;document.body.append(tooltip);
 let active=null,pending=null,showTimer=0,hideTimer=0,sequence=0;
 const compact=()=>document.body.dataset.routeD==='classrooms'&&matchMedia('(min-width:1241px)').matches&&getComputedStyle(rail).display!=='none'&&!document.querySelector('dialog[open]');
 const clearDescription=()=>{if(!active)return;const ids=(active.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==tooltip.id);if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');};
 function dismiss(immediate=false){
  clearTimeout(showTimer);clearTimeout(hideTimer);pending=null;sequence++;clearDescription();active=null;tooltip.dataset.visible='false';
  if(immediate)tooltip.hidden=true;else hideTimer=setTimeout(()=>{tooltip.hidden=true;},140);
 }
 function show(control){
  if(!control.isConnected||!compact())return;
  clearTimeout(hideTimer);clearDescription();active=control;pending=null;tooltip.textContent=control.dataset.tooltipE;tooltip.hidden=false;tooltip.dataset.visible='false';
  const box=control.getBoundingClientRect(),rect=tooltip.getBoundingClientRect();
  tooltip.style.left=Math.max(8,Math.min(box.right+12,innerWidth-rect.width-8))+'px';tooltip.style.top=Math.max(8,Math.min(box.top+(box.height-rect.height)/2,innerHeight-rect.height-8))+'px';
  control.setAttribute('aria-describedby',[(control.getAttribute('aria-describedby')||''),tooltip.id].filter(Boolean).join(' '));
  const current=++sequence;requestAnimationFrame(()=>{if(current===sequence&&active===control)tooltip.dataset.visible='true';});
 }
 function schedule(control,keyboard=false){
  if(!compact()||!control)return;if(active===control){clearTimeout(hideTimer);return;}
  dismiss(true);pending=control;showTimer=setTimeout(()=>show(control),keyboard?0:320);
 }
 const controlFor=target=>target instanceof Element?target.closest('#app-sidebar [data-tooltip-e]'):null;
 rail.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const control=controlFor(event.target);if(control&&!control.contains(event.relatedTarget))schedule(control);});
 rail.addEventListener('pointerout',event=>{const control=controlFor(event.target);if(!control||control.contains(event.relatedTarget)||tooltip.contains(event.relatedTarget))return;if(control===active){clearTimeout(hideTimer);hideTimer=setTimeout(()=>dismiss(),140);}else if(control===pending)dismiss(true);});
 rail.addEventListener('focusin',event=>{const control=controlFor(event.target);if(control)schedule(control,true);});
 rail.addEventListener('focusout',()=>dismiss());
 tooltip.addEventListener('pointerenter',()=>{clearTimeout(hideTimer);});
 tooltip.addEventListener('pointerleave',()=>dismiss());
 document.addEventListener('keydown',event=>{if(['Escape','Enter',' '].includes(event.key))dismiss(true);});
 document.addEventListener('pointerdown',()=>dismiss(true));
 document.addEventListener('scroll',()=>dismiss(true),true);
 window.addEventListener('resize',()=>dismiss(true));window.addEventListener('hashchange',()=>dismiss(true));
 new MutationObserver(()=>dismiss(true)).observe(rail,{childList:true,subtree:true});
 document.querySelector('#sheet').addEventListener('toggle',()=>dismiss(true));
 document.documentElement.dataset.refinementsEReady='true';
})();
