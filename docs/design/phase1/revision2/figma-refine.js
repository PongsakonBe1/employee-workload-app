// Targeted visual refinement after composition review. Run with use_figma.
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
await Promise.all(['Regular','Medium','SemiBold'].map(style=>figma.loadFontAsync({family:'IBM Plex Sans Thai',style})));
const created=[],mutated=[];
const allVars=await figma.variables.getLocalVariablesAsync();
const light=new Map(allVars.filter(v=>v.variableCollectionId==='VariableCollectionId:8:3').map(v=>[v.name,v]));
const dark=new Map(allVars.filter(v=>v.variableCollectionId==='VariableCollectionId:8:4').map(v=>[v.name,v]));
const bind=(key,opacity=1)=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0},opacity},'color',light.get(key));
const foundation=await figma.getNodeByIdAsync('8:99');
const rootComponents=await Promise.all(['8:110','8:118','8:125'].map(id=>figma.getNodeByIdAsync(id)));
const paths={headphones:'M4 14v-3a8 8 0 0 1 16 0v3M4 12h4v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2m16 0h-4v8h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2',plug:'M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-6 6v4m0-4a6 6 0 0 1-6-6',usb:'M6 9h12v12H6zM9 9V3h6v6m-4-4v1m2-1v1',person:'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3',monitor:'M3 3h18v13H3zM8 21h8m-4-5v5',door:'M5 21V3h14v18M2 21h20M14 12h1'};
const iconMains={};
const iconRow=figma.createAutoLayout('HORIZONTAL');iconRow.name='Reusable icon assets';iconRow.itemSpacing=20;iconRow.fills=[];iconRow.resize(1300,50);(foundation||page).appendChild(iconRow);created.push(iconRow.id);
for(const [name,d]of Object.entries(paths)){
 const frame=figma.createNodeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="${d}" stroke="#566479" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
 iconRow.appendChild(frame);const component=figma.createComponentFromNode(frame);component.name=`Icon / ${name}`;component.description='Editable vector imported from approved prototype SVG.';iconMains[name]=component;created.push(component.id,...component.findAll(()=>true).map(n=>n.id));for(const n of component.findAllWithCriteria({types:['VECTOR']}))n.strokes=n.strokes.map(p=>p.type==='SOLID'?bind('sub'):p);
}
const swapKeys={};
for(const comp of rootComponents){
 const slot=comp.id==='8:125'?comp:comp.children.find(n=>n.name==='Icon slot');const old=slot.children.find(n=>n.name.startsWith('Icon /'));
 const iconMain=iconMains[comp.id==='8:125'?'person':'headphones'];const instance=iconMain.createInstance();slot.insertChild(0,instance);if(old)old.remove();const key=comp.addComponentProperty('Icon','INSTANCE_SWAP',iconMain.id);instance.componentPropertyReferences={mainComponent:key};swapKeys[comp.id]=key;created.push(instance.id,...instance.findAll(()=>true).map(n=>n.id));mutated.push(comp.id,slot.id);
}
const service=rootComponents[2];const badgeText=service.findAllWithCriteria({types:['TEXT']}).find(t=>t.characters==='3 รายการ');const badgeKey=service.addComponentProperty('Badge','TEXT','3 รายการ');badgeText.componentPropertyReferences={characters:badgeKey};mutated.push(badgeText.id);
const frames=await Promise.all(['8:134','8:340','8:546','8:751','8:956','8:1199','8:1442'].map(id=>figma.getNodeByIdAsync(id)));
for(const frame of frames){
 const isDark=frame.name.endsWith('/ Dark');
 for(const n of frame.findAllWithCriteria({types:['INSTANCE']})){
  if(!['QuickLogTile / Desktop','QuickLogTile / Mobile','ServiceRow'].includes(n.name))continue;
  const texts=n.findAllWithCriteria({types:['TEXT']});const label=texts.map(t=>t.characters).find(t=>['หูฟัง ชั้น 3','หูฟัง Finn Space','ปลั๊กพ่วง','USB','ผูกบัญชีครบชุด','ช่วยเหลือการใช้งาน','เปิดห้องบริการ'].includes(t));
  if(n.name==='ServiceRow'){const mainId='8:125';n.setProperties({[swapKeys[mainId]]:iconMains[label==='ช่วยเหลือการใช้งาน'?'monitor':label==='เปิดห้องบริการ'?'door':'person'].id,[badgeKey]:label==='ผูกบัญชีครบชุด'?'3 รายการ':'›'});}
  else {const mainId=n.name.endsWith('Mobile')?'8:118':'8:110';n.setProperties({[swapKeys[mainId]]:iconMains[label==='ปลั๊กพ่วง'?'plug':label==='USB'?'usb':'headphones'].id});const slot=n.children.find(c=>c.name==='Icon slot');if(label==='หูฟัง Finn Space'||label==='ปลั๊กพ่วง'||label==='USB'){const key=label==='หูฟัง Finn Space'?'purple':label==='ปลั๊กพ่วง'?'green':'blue';slot.fills=[bind(key)];for(const v of slot.findAllWithCriteria({types:['VECTOR']}))v.strokes=v.strokes.map(p=>p.type==='SOLID'?bind(`${key}Ink`):p);mutated.push(slot.id);}}
  mutated.push(n.id,...n.findAll(()=>true).map(c=>c.id));
 }
 for(const card of frame.findAllWithCriteria({types:['FRAME']}))if(card.name==='Record work'){
   const bottom=Math.max(...card.children.map(c=>c.y+c.height));card.resize(card.width,Math.ceil(bottom+22));mutated.push(card.id);
 }
 frame.fills=[{type:'GRADIENT_LINEAR',gradientTransform:[[1,0,0],[0,1,0]],gradientStops:(isDark?['#152731','#121922','#182b29']:['#e7f4fa','#f3f6fa','#edf7f2']).map((hex,i)=>({position:i/2,color:{r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255,a:1}}))}];
 for(const nav of frame.findAllWithCriteria({types:['FRAME']}))if(nav.name==='Navigation')nav.fills=[bind('paper',.82)];mutated.push(frame.id);
}
const confirmation=await figma.getNodeByIdAsync('8:1442');const confirmationDark=confirmation.clone();page.appendChild(confirmationDark);confirmationDark.name='Confirmation / Dark';confirmationDark.x=6260;confirmationDark.y=1100;created.push(confirmationDark.id,...confirmationDark.findAll(()=>true).map(n=>n.id));frames.push(confirmationDark);
const darkMap=new Map([...light].map(([key,value])=>[value.id,dark.get(key)]));
for(const frame of frames.filter(n=>n.name.endsWith('/ Dark')))for(const n of [frame,...frame.findAll(()=>true)])for(const prop of ['fills','strokes'])if(Array.isArray(n[prop]))n[prop]=n[prop].map(p=>{const v=p.type==='SOLID'&&p.boundVariables?.color?.id?darkMap.get(p.boundVariables.color.id):null;return v?figma.variables.setBoundVariableForPaint(p,'color',v):p;});
const mobileDark=await figma.getNodeByIdAsync('8:751');
confirmationDark.fills=JSON.parse(JSON.stringify(mobileDark.fills));
const combo=mobileDark.findAllWithCriteria({types:['INSTANCE']}).find(n=>n.name==='ServiceRow'&&n.findAllWithCriteria({types:['TEXT']}).some(t=>t.characters==='ผูกบัญชีครบชุด'));
const navigate=async(n,to)=>{await n.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:to.id,navigation:'NAVIGATE',transition:null,resetScrollPosition:true}]}]);mutated.push(n.id);};
await navigate(combo,confirmationDark);
for(const row of confirmationDark.findAllWithCriteria({types:['FRAME']}))if(['Close','Cancel'].includes(row.name))await navigate(row,mobileDark);
const confirmButton=confirmationDark.findAllWithCriteria({types:['INSTANCE']}).find(n=>n.name==='Button / Primary');await navigate(confirmButton,mobileDark);
return {createdNodeIds:[...new Set(created)],mutatedNodeIds:[...new Set(mutated)],darkConfirmation:{id:confirmationDark.id,name:confirmationDark.name},iconComponents:Object.fromEntries(Object.entries(iconMains).map(([k,n])=>[k,n.id])),swapKeys,badgeKey,frames:frames.map(n=>({id:n.id,name:n.name,w:n.width,h:n.height}))};
