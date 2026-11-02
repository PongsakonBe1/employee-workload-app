/* Runs in the isolated prototype browser to prepare editable Figma geometry.
 * Exports text, hierarchy, SVG vectors, and computed paints; never screenshots. */
function exportDesignScene(){
  const themes=['bg','ink','sub','muted','surface','surface-solid','soft','line','glass','glass-edge','accent','accent-end','on-accent','blue','blue-ink','green','green-ink','purple','purple-ink','amber','amber-ink','red','red-ink'];
  const css=getComputedStyle(document.documentElement),tokens=Object.fromEntries(themes.map(k=>[k,css.getPropertyValue('--'+k).trim()]));
  let counter=0;
  const bounds=node=>{const r=node.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height};};
  function textSpec(value,rect,style,name='Text'){
    return{key:'layer-'+(++counter),type:'TEXT',name:name+': '+value.slice(0,35),text:value,x:rect.x,y:rect.y,w:rect.width||rect.w,h:rect.height||rect.h,color:style.color,size:parseFloat(style.fontSize),weight:Number(style.fontWeight)||400,lineHeight:parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.6};
  }
  function walk(el){
    const style=getComputedStyle(el),b=bounds(el);
    if(!b.w||!b.h||style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||['SCRIPT','STYLE','LINK'].includes(el.tagName))return null;
    const node={key:'layer-'+(++counter),type:'FRAME',name:el.getAttribute('aria-label')||el.id||el.className?.baseVal||el.className||el.tagName.toLowerCase(),...b,fill:style.backgroundColor,border:style.borderTopColor,borderWidth:parseFloat(style.borderTopWidth)||0,radius:parseFloat(style.borderTopLeftRadius)||0,shadow:style.boxShadow!=='none',glass:el.classList.contains('glass'),layout:style.display.includes('flex')?{direction:style.flexDirection,gap:parseFloat(style.gap)||0,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft].map(parseFloat),justify:style.justifyContent,align:style.alignItems}:null,link:el.getAttribute('href')?.startsWith('#/')?el.getAttribute('href').slice(2):null,children:[]};
    if(el.tagName.toLowerCase()==='svg'){
      const copy=el.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width',String(b.w));copy.setAttribute('height',String(b.h));
      const originals=[el,...el.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
      originals.forEach((original,i)=>{const clone=clones[i],s=getComputedStyle(original);if(original.tagName.toLowerCase()==='text'){const r=original.getBoundingClientRect();node.children.push(textSpec(original.textContent,{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height},s,'Chart label'));clone.remove();}else{for(const p of ['stroke','fill','stroke-width','stroke-linecap','stroke-linejoin','stop-color','stop-opacity','fill-opacity']){const v=s.getPropertyValue(p);if(v)clone.setAttribute(p,v==='currentcolor'?s.color:v);}clone.removeAttribute('class');}});
      node.svg=new XMLSerializer().serializeToString(copy);return node;
    }
    if(el.tagName==='IMG'){node.image='labboy-logo';return node;}
    if(['INPUT','SELECT','TEXTAREA'].includes(el.tagName)){
      const value=el.tagName==='SELECT'?el.selectedOptions[0]?.textContent:el.value||el.placeholder||'';
      if(el.type==='checkbox'){node.checkbox=el.checked;return node;}
      if(value){const line=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.6;const x=b.x+parseFloat(style.paddingLeft),y=b.y+(b.h-line)/2;node.children.push(textSpec(value,{x,y,w:Math.max(1,b.w-25),h:line},style,'Field value'));}return node;
    }
    for(const child of el.childNodes){
      if(child.nodeType===Node.ELEMENT_NODE){const spec=walk(child);if(spec)node.children.push(spec);}
      else if(child.nodeType===Node.TEXT_NODE&&child.textContent.trim()){
        const range=document.createRange();range.selectNodeContents(child);const r=range.getBoundingClientRect();if(r.width&&r.height)node.children.push(textSpec(child.textContent.trim(),{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height},style));
      }
    }
    return node;
  }
  const mobile=innerWidth<761;
  const roots=[document.querySelector('#app-header'),document.querySelector('#content'),...(mobile?[document.querySelector('#mobile-nav')]:[])].map(walk).filter(Boolean);
  return{route:document.body.dataset.route,title:document.querySelector('h1').innerText,theme:document.documentElement.dataset.theme,device:mobile?'Mobile':'Desktop',width:innerWidth,height:mobile?innerHeight:Math.max(innerHeight,document.documentElement.scrollHeight),tokens,children:roots};
}
