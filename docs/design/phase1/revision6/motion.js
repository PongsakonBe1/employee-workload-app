/* Browser-native motion and rounded lens optics. No runtime dependency or network calls. */
'use strict';
const motion6={animations:new Set(),pills:new Map(),frame:0,dialogFrame:0,pending:null,route:null,first:true,lastPointer:null,maps:new Map(),sequence:0};
const motionPreference6=matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion6=()=>motionPreference6.matches||!!state.settingValues.motion;
const easing6={standard:'cubic-bezier(.2,.8,.2,1)',spring:'cubic-bezier(.18,.82,.22,1.08)'};
function animate6(element,frames,options={}){
 if(!element||reduceMotion6())return null;
 const animation=element.animate(frames,{duration:220,easing:easing6.standard,...options});
 motion6.animations.add(animation);animation.finished.catch(()=>{}).finally(()=>motion6.animations.delete(animation));return animation;
}
function stopMotion6(){for(const animation of motion6.animations)animation.cancel();motion6.animations.clear();$$('.closing-dialog6,.closing-backdrop6,.press-glow6').forEach(el=>el.remove());}

// A small signed-distance field bends only a rounded control's rim. The map is
// cached by geometry; live backdrop filtering is used only where implemented.
function opticalMap6(width,height,radius){
 const w=Math.max(2,Math.round(width)),h=Math.max(2,Math.round(height)),r=Math.min(radius,w/2,h/2),key=[w,h,Math.round(r)].join(':');
 if(motion6.maps.has(key))return motion6.maps.get(key);
 const sample=Math.min(1,620/w,900/h),cw=Math.max(2,Math.round(w*sample)),ch=Math.max(2,Math.round(h*sample));
 const canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d'),data=ctx.createImageData(cw,ch),rim=Math.min(18,r*.7);
 const distance=(x,y)=>{const dx=Math.abs(x-w/2)-(w/2-r),dy=Math.abs(y-h/2)-(h/2-r);return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)-r;};
 for(let py=0;py<ch;py++)for(let px=0;px<cw;px++){
  const x=(px+.5)/sample,y=(py+.5)/sample,d=distance(x,y),t=Math.min(1,Math.max(0,-d/rim)),wave=d<=0&&-d<rim?Math.sin(t*Math.PI)**1.35:0;
  let nx=distance(x+.6,y)-distance(x-.6,y),ny=distance(x,y+.6)-distance(x,y-.6);const length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;
  const at=(py*cw+px)*4;data.data[at]=128+nx*wave*102;data.data[at+1]=128+ny*wave*102;data.data[at+2]=128;data.data[at+3]=255;
 }
 ctx.putImageData(data,0,0);
 const ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el;};
 let svg=$('#optics6');if(!svg){svg=make('svg',{id:'optics6','aria-hidden':'true',width:0,height:0});svg.style.cssText='position:fixed;width:0;height:0;pointer-events:none';svg.append(make('defs',{}));document.body.append(svg);}
 const id='rim-lens6-'+motion6.sequence++,filter=make('filter',{id,x:0,y:0,width:w,height:h,filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'});
 filter.append(make('feImage',{href:canvas.toDataURL(),x:0,y:0,width:w,height:h,preserveAspectRatio:'none',result:'rim'}));
 const strength=Math.min(17,Math.max(8,r*.48));
 filter.append(make('feDisplacementMap',{in:'SourceGraphic',in2:'rim',scale:strength,xChannelSelector:'R',yChannelSelector:'G'}));svg.firstChild.append(filter);
 const value=`url("#${id}")`;motion6.maps.set(key,value);
 // Size caches stay bounded during viewport tests and resize. Old definitions
 // are retained only while in use; a subsequent refresh assigns fresh maps.
 if(motion6.maps.size>40){const used=new Set($$('[style]').map(el=>el.style.getPropertyValue('--optical-filter')));for(const [oldKey,oldValue]of motion6.maps){if(oldKey!==key&&!used.has(oldValue)){motion6.maps.delete(oldKey);$('#'+oldValue.slice(6,-2))?.remove();if(motion6.maps.size<=32)break;}}}
 return value;
}
function attachOptics6(element){
 if(!element||state.material==='solid'||matchMedia('(prefers-reduced-transparency: reduce)').matches)return;
 const live=/Chrom(?:e|ium)\//.test(navigator.userAgent);if(!live){element.dataset.optics='frosted';return;}
 const rect=element.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
 const radius=parseFloat(getComputedStyle(element).borderTopLeftRadius)||16;
 element.style.setProperty('--optical-filter',opticalMap6(rect.width,rect.height,radius));element.dataset.optics='rim-refraction';
}
function pillRect6(element){const r=element.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};}
function positionPill6(group,key){
 const active=group.matches('#mobile-nav')?$('.nav-item.active',group):$('button[aria-pressed=true]',group);if(!active)return;
 const parent=group.getBoundingClientRect(),rect=active.getBoundingClientRect();if(!parent.width||!rect.width)return;
 const old=motion6.pills.get(key),lens=document.createElement('span');lens.className='selection-lens';lens.setAttribute('aria-hidden','true');group.prepend(lens);
 lens.style.width=rect.width+'px';lens.style.height=rect.height+'px';lens.style.left=(rect.left-parent.left-group.clientLeft)+'px';lens.style.top=(rect.top-parent.top-group.clientTop)+'px';
 attachOptics6(lens);
 if(old&&Math.abs(old.left-rect.left)+Math.abs(old.top-rect.top)>1){
  animate6(lens,[{transform:`translate(${old.left-rect.left}px,${old.top-rect.top}px) scale(${old.width/rect.width},${old.height/rect.height})`},{transform:'translate(0,0) scale(1.035,1.025)',offset:.72},{transform:'translate(0,0) scale(1,1)'}],{duration:310,easing:easing6.standard});
 }
 motion6.pills.set(key,pillRect6(active));
}
function decorateMotion6(){
 $$('.selection-lens').forEach(e=>e.remove());
 $$('.segment').forEach((group,i)=>positionPill6(group,'segment:'+($('button[data-group]',group)?.dataset.group||i)));
 const groupLabels={'record-mode':'วิธีบันทึกงาน','schedule-mode6':'มุมมองตาราง','dl-view5':'มุมมองตารางสอบ','log-view':'มุมมองประวัติงาน','resource-tab':'ประเภททรัพยากร','import-filter6':'รายการตรวจทาน','approval-tab':'สถานะคำขอ'};
 $$('.segment').forEach(group=>{const key=$('button[data-group]',group)?.dataset.group;if(groupLabels[key])group.setAttribute('aria-label',groupLabels[key]);});
 positionPill6($('#mobile-nav'),'mobile-nav');
 [$('#app-header'),$('#app-sidebar'),$('#mobile-nav')].forEach(attachOptics6);
 document.documentElement.dataset.reduceMotion=String(reduceMotion6());
 document.documentElement.dataset.motionReady='true';
}
const renderCore6=render;
render=function(options={}){
 const oldRoute=motion6.route,routeChanged=oldRoute!==null&&oldRoute!==state.route;
 const focused=document.activeElement,focusInfo=focused&&focused!==document.body?{name:focused.name,action:focused.dataset?.action,id:focused.dataset?.id,group:focused.dataset?.group,value:focused.dataset?.value,start:focused.selectionStart,end:focused.selectionEnd,scope:focused.closest('.import-queue6')?'queue':focused.classList.contains('source-block6')?'source':''}:null;
 if(routeChanged){stashManual5();stopMotion6();}
 renderCore6(options);motion6.route=state.route;
 const sourceScroll=$('.source-dl-scroll6'),sourceSelected=$('.source-dl-row6.active');if(sourceScroll&&sourceSelected)sourceScroll.scrollTop=Math.max(0,sourceSelected.offsetTop-100);
 $$('.tag').forEach(el=>{if(['กำลังยืม','ใช้งาน'].includes(el.textContent.trim())){el.classList.remove('amber');el.classList.add('blue');}});
 $$('.row-target[data-id]').forEach(el=>{const d=state.devices.find(d=>d.id===el.dataset.id),target=el.closest('.data-row')?.querySelector('.row-trailing .tag');if(d&&target)target.outerHTML=status6(deviceStatus6(d));});
 if(!options.focus&&!$('#sheet').open&&focusInfo){
  const candidates=focusInfo.name?$$('[name="'+CSS.escape(focusInfo.name)+'"]'):focusInfo.action?$$('[data-action="'+CSS.escape(focusInfo.action)+'"]').filter(el=>(el.dataset.id||'')===(focusInfo.id||'')&&(focusInfo.group===undefined||el.dataset.group===focusInfo.group)&&(focusInfo.value===undefined||el.dataset.value===focusInfo.value)):[];
  const inScope=el=>focusInfo.scope==='queue'?el.closest('.import-queue6'):focusInfo.scope==='source'?el.classList.contains('source-block6'):true;
  const replacement=candidates.find(el=>el.getClientRects().length&&inScope(el));if(replacement){replacement.focus({preventScroll:true});if(typeof focusInfo.start==='number'&&['text','search'].includes(replacement.type))replacement.setSelectionRange(focusInfo.start,focusInfo.end);}
 }
 document.title=`${currentRoute()[1]} · labboy Workload · Review 06`;
 const shouldAnimate=routeChanged||options.focus||motion6.pending?.routeChanged;
 motion6.pending={routeChanged:shouldAnimate,first:motion6.first};motion6.first=false;
 cancelAnimationFrame(motion6.frame);motion6.frame=requestAnimationFrame(()=>{
  const pending=motion6.pending;motion6.pending=null;decorateMotion6();
  if(pending?.routeChanged||pending?.first){
   const title=$('#content>.page-heading');animate6(title,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:210});
   const body=$('#content>.workspace-split,#content>.import-layout6,#content>.import-summary6,#content>.panel,#content>.command-bar,#content>.scope-bar');
   animate6(body,[{opacity:.3,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:260});
  }
 });
};

function cleanupClosing6(){$$('.closing-dialog6,.closing-backdrop6').forEach(el=>el.remove());}
function modalOrigin6(rect){const source=motion6.lastPointer?.rect;return source?`${Math.max(0,Math.min(rect.width,source.left+source.width/2-rect.left))}px ${Math.max(0,Math.min(rect.height,source.top+source.height/2-rect.top))}px`:'50% 40%';}
showSheet=function(title,description,body,footer=''){
 const dialog=$('#sheet'),replacing=dialog.open;
 cancelAnimationFrame(motion6.dialogFrame);dialog.getAnimations().forEach(a=>a.cancel());cleanupClosing6();
 if(!replacing){const el=document.activeElement;ui5.dialogTrigger={el,action:el?.dataset.action,id:el?.dataset.id};}
 const rootAction=ui5.dialogTrigger?.action||motion6.lastPointer?.action;
 const menu=!narrow5()&&['routes','appearance','notifications'].includes(rootAction)&&!footer;
 dialog.classList.remove('menu6','popover','sheet-wide');for(const prop of ['top','left','right','bottom','max-height','transform-origin'])dialog.style.removeProperty(prop);
 $('#sheet-content').innerHTML=`<header class="sheet-header"><span class="sheet-grabber6" aria-hidden="true"></span><div class="grow"><h2 id="sheet-title">${e5(title)}</h2><p>${e5(description)}</p></div><button class="icon-btn" data-action="close-sheet" aria-label="ปิดหน้าต่าง">${icon('close')}</button></header><div class="sheet-body">${body}</div>${footer?`<footer class="sheet-actions">${button('ยกเลิก','close-sheet')}${footer}</footer>`:''}`;
 if(menu){
  dialog.classList.add('menu6');const source=motion6.lastPointer?.rect,top=Math.max(78,Math.min(source?source.top+source.height+10:78,innerHeight-220)),right=Math.max(14,source?innerWidth-source.left-source.width:20);
  dialog.style.top=top+'px';dialog.style.right=right+'px';dialog.style.maxHeight=(innerHeight-top-14)+'px';$('.sheet-body',dialog).style.maxHeight=Math.max(120,innerHeight-top-125)+'px';
 }
 if(!replacing)dialog.showModal();document.body.style.overflow='hidden';
 motion6.dialogFrame=requestAnimationFrame(()=>{
  if(!dialog.open)return;
  const rect=dialog.getBoundingClientRect();dialog.style.transformOrigin=modalOrigin6(rect);
  if(replacing)animate6($('#sheet-content'),[{opacity:.45,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:170});
  else if(narrow5())animate6(dialog,[{opacity:.2,transform:'translateY(34px) scale(.985)'},{opacity:1,transform:'translateY(-1px) scale(1)',offset:.82},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:350,easing:easing6.standard});
  else animate6(dialog,[{opacity:.1,transform:menu?'translateY(-5px) scale(.9)':'translateY(9px) scale(.955)'},{opacity:1,transform:'translateY(0) scale(1.008)',offset:.8},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:menu?240:300,easing:easing6.standard});
  attachOptics6(menu?dialog:$('.sheet-header',dialog));
  dialog.dataset.motion=reduceMotion6()?'reduced':menu?'anchored-menu':narrow5()?'bottom-sheet':'dialog';
 });
};
const closeCore6=closeSheet;
closeSheet=function(){
 const dialog=$('#sheet');if(!dialog.open)return;cancelAnimationFrame(motion6.dialogFrame);dialog.getAnimations().forEach(a=>a.cancel());
 if(!reduceMotion6()){
  cleanupClosing6();const rect=dialog.getBoundingClientRect(),ghost=document.createElement('div'),backdrop=document.createElement('div');
  ghost.className='closing-dialog6';ghost.innerHTML=dialog.innerHTML;ghost.setAttribute('aria-hidden','true');ghost.inert=true;
  ghost.querySelectorAll('[id],[name],[data-action]').forEach(el=>{el.removeAttribute('id');el.removeAttribute('name');el.removeAttribute('data-action');});
  ghost.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:200;pointer-events:none;overflow:hidden;border-radius:${getComputedStyle(dialog).borderRadius};background:var(--surface);box-shadow:0 24px 80px #0003;transform-origin:${modalOrigin6(rect)}`;
  backdrop.className='closing-backdrop6';backdrop.setAttribute('aria-hidden','true');document.body.append(backdrop,ghost);
  const exit=animate6(ghost,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:narrow5()?'translateY(24px) scale(.985)':'translateY(3px) scale(.975)'}],{duration:160});
  animate6(backdrop,[{opacity:1},{opacity:0}],{duration:160});exit?.finished.catch(()=>{}).finally(()=>{ghost.remove();backdrop.remove();});
 }
 closeCore6();
};
actions['close-sheet']=()=>closeSheet();
$('#sheet').addEventListener('cancel',event=>{event.preventDefault();closeSheet();});
$('#sheet').addEventListener('click',event=>{if(event.target!==$('#sheet'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeSheet();});
const toastCore6=toast;
toast=function(text){const el=$('#toast');el.getAnimations().forEach(a=>a.cancel());toastCore6(text);animate6(el,[{opacity:0,transform:'translate(-50%,10px) scale(.975)'},{opacity:1,transform:'translate(-50%,0) scale(1.006)',offset:.8},{opacity:1,transform:'translate(-50%,0) scale(1)'}],{duration:270});};

document.addEventListener('pointerdown',event=>{
 const target=event.target.closest('button,a');if(!target||target.disabled)return;
 motion6.lastPointer={action:target.dataset.action,rect:pillRect6(target)};
 if(reduceMotion6()||!target.matches('.btn,.icon-btn,.quick-card,.nav-item,.segment>button'))return;
 const group=target.closest('.segment,#mobile-nav'),lens=group&&$('.selection-lens',group);
 if(lens){lens.classList.add('pressed');animate6(lens,[{transform:'scale(1)'},{transform:'scale(1.045,1.035)'}],{duration:115});}
 if(!target.matches('a')){const glow=document.createElement('span');glow.className='press-glow6';glow.setAttribute('aria-hidden','true');const rect=target.getBoundingClientRect();glow.style.setProperty('--press-x',(event.clientX-rect.left)+'px');glow.style.setProperty('--press-y',(event.clientY-rect.top)+'px');target.append(glow);const a=animate6(glow,[{opacity:0},{opacity:.65,offset:.28},{opacity:0}],{duration:400});a?.finished.catch(()=>{}).finally(()=>glow.remove());}
},true);
document.addEventListener('pointerup',()=>$$('.selection-lens.pressed').forEach(el=>el.classList.remove('pressed')),true);
document.addEventListener('pointercancel',()=>$$('.selection-lens.pressed').forEach(el=>el.classList.remove('pressed')),true);
document.addEventListener('click',event=>{const b=event.target.closest('button[data-group]'),group=b?.closest('.segment');if(!group)return;requestAnimationFrame(()=>{if(!group.isConnected)return;$('.selection-lens',group)?.remove();positionPill6(group,'segment:'+b.dataset.group);});});
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const current=event.target.closest('button[data-group]'),group=current?.closest('.segment');if(!group)return;
 const buttons=$$('button:not(:disabled)',group),index=buttons.indexOf(current);if(index<0)return;event.preventDefault();
 const next=buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];
 next.click();document.querySelector('button[data-group="'+CSS.escape(next.dataset.group)+'"][data-value="'+CSS.escape(next.dataset.value)+'"]')?.focus({preventScroll:true});
});
let lightFrame6=0;
document.addEventListener('pointermove',event=>{const target=event.target.closest('.material,.glass');if(!target||event.pointerType==='touch'||reduceMotion6())return;cancelAnimationFrame(lightFrame6);lightFrame6=requestAnimationFrame(()=>{if(!target.isConnected)return;const r=target.getBoundingClientRect();target.style.setProperty('--glass-x',((event.clientX-r.left)/r.width*100).toFixed(1)+'%');target.style.setProperty('--glass-y',((event.clientY-r.top)/r.height*100).toFixed(1)+'%');});},{passive:true});
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button?.dataset.action==='toggle-setting'&&button.dataset.key==='motion')requestAnimationFrame(()=>{if(reduceMotion6())stopMotion6();decorateMotion6();});},true);
window.addEventListener('scroll',()=>{document.body.dataset.scrolled=String(scrollY>15);},{passive:true});
motionPreference6.addEventListener('change',()=>{if(reduceMotion6())stopMotion6();decorateMotion6();});
let materialKey6=[document.documentElement.dataset.theme,document.documentElement.dataset.material].join(':');
new MutationObserver(()=>{const key=[document.documentElement.dataset.theme,document.documentElement.dataset.material].join(':');if(key===materialKey6)return;materialKey6=key;if(reduceMotion6())stopMotion6();requestAnimationFrame(decorateMotion6);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-material']});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotion6();});
window.motionReview=Object.freeze({durations:{press:115,selection:310,route:260,menu:240,dialog:300,sheet:350,exit:160},get reduced(){return reduceMotion6();},get active(){return [...motion6.animations].filter(a=>a.playState==='running').length;},get opticalMaps(){return motion6.maps.size;}});
render();document.documentElement.dataset.reviewReady='6';
