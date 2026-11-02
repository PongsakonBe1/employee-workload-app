/* Prepared for use_figma against the existing review file. NOT executed yet.
 * The export task replaces __SCENE_PAYLOAD__ with computed editable geometry.
 * Creates new named frames only; refuses to overwrite an existing review.
 * Visual import fidelity must be checked in Figma before claiming completion. */
const payload=__SCENE_PAYLOAD__;
const page=await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
if(payload.some(scene=>page.children.some(n=>n.name===`Glass 04 / ${scene.route} / ${scene.device} / ${scene.theme}`)))throw new Error('This Glass 04 batch already exists. Inspect before resuming; do not duplicate or overwrite.');
const fonts=await figma.listAvailableFontsAsync();
const available=new Set(fonts.filter(f=>f.fontName.family==='IBM Plex Sans Thai').map(f=>f.fontName.style));
for(const style of ['Regular','Medium','SemiBold'])if(!available.has(style))throw new Error(`Required font is unavailable: IBM Plex Sans Thai ${style}`);
await Promise.all(['Regular','Medium','SemiBold'].map(style=>figma.loadFontAsync({family:'IBM Plex Sans Thai',style})));
const created=[],variables={},textStyles={},effects={},frames=[],reactions=[];
const track=n=>{created.push(n.id);return n;};
const localCollections=await figma.variables.getLocalVariableCollectionsAsync();
const localVariables=await figma.variables.getLocalVariablesAsync();
function rgba(value){
  if(value?.startsWith('#')){const hex=value.slice(1);if(hex.length===6)return{r:parseInt(hex.slice(0,2),16)/255,g:parseInt(hex.slice(2,4),16)/255,b:parseInt(hex.slice(4,6),16)/255,a:1};}
  const parts=value?.match(/[\d.]+/g)?.map(Number);
  if(!parts||parts.length<3)return null;
  return{r:parts[0]/255,g:parts[1]/255,b:parts[2]/255,a:parts[3]??1};
}
function rawPaint(value){const c=rgba(value);return c&&c.a>0?{type:'SOLID',color:{r:c.r,g:c.g,b:c.b},opacity:c.a}:null;}
const keyOf=value=>{const c=rgba(value);return c?[c.r,c.g,c.b,c.a].map(v=>v.toFixed(4)).join(','):null;};
for(const theme of ['light','dark']){
  const example=payload.find(s=>s.theme===theme);
  const collectionName=`labboy / Glass 04 / ${theme}`,primitiveName=`labboy / Glass 04 / ${theme} primitives`;
  const collection=localCollections.find(c=>c.name===collectionName)||figma.variables.createVariableCollection(collectionName);if(!localCollections.includes(collection))created.push(collection.id);
  const primitives=localCollections.find(c=>c.name===primitiveName)||figma.variables.createVariableCollection(primitiveName);if(!localCollections.includes(primitives))created.push(primitives.id);
  variables[theme]=new Map();
  for(const [name,value]of Object.entries(example.tokens)){
    const color=rgba(value);if(!color)continue;
    let primitive=localVariables.find(v=>v.variableCollectionId===primitives.id&&v.name===`color/${name}`);
    if(!primitive){primitive=figma.variables.createVariable(`color/${name}`,primitives,'COLOR');primitive.scopes=[];primitive.setValueForMode(primitives.modes[0].modeId,color);primitive.setVariableCodeSyntax('WEB',`var(--${name})`);created.push(primitive.id);}
    let semantic=localVariables.find(v=>v.variableCollectionId===collection.id&&v.name===name);
    if(!semantic){semantic=figma.variables.createVariable(name,collection,'COLOR');semantic.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];semantic.setValueForMode(collection.modes[0].modeId,{type:'VARIABLE_ALIAS',id:primitive.id});semantic.setVariableCodeSyntax('WEB',`var(--${name})`);created.push(semantic.id);}
    variables[theme].set(keyOf(value),semantic);
  }
}
function paint(value,theme){const p=rawPaint(value);if(!p)return null;const v=variables[theme].get(keyOf(value));return v?figma.variables.setBoundVariableForPaint(p,'color',v):p;}
for(const [name,radius,opacity,y]of [['Surface',16,.07,3],['Glass',24,.14,8]]){
  const e=figma.createEffectStyle();e.name=`labboy / Glass 04 / ${name}`;e.effects=[{type:'DROP_SHADOW',color:{r:.06,g:.15,b:.3,a:opacity},offset:{x:0,y},radius,spread:0,visible:true,blendMode:'NORMAL'}];effects[name]=e;created.push(e.id);
}
async function make(spec,parent,origin,theme){
  let node;
  if(spec.type==='TEXT'){
    node=track(figma.createText());node.name=spec.name;node.fontName={family:'IBM Plex Sans Thai',style:spec.weight>=600?'SemiBold':spec.weight>=500?'Medium':'Regular'};node.fontSize=spec.size;node.lineHeight={unit:'PIXELS',value:spec.lineHeight};node.characters=spec.text;node.textAutoResize='HEIGHT';node.resize(Math.max(1,spec.w+1),Math.max(1,spec.h));
    const p=paint(spec.color,theme);node.fills=p?[p]:[];
    const key=`${spec.size}/${spec.weight}`;
    if(!textStyles[key]){const style=figma.createTextStyle();style.name=`labboy / Glass 04 / ${key}`;style.fontName=node.fontName;style.fontSize=spec.size;style.lineHeight=node.lineHeight;textStyles[key]=style;created.push(style.id);}node.textStyleId=textStyles[key].id;
  }else{
    node=track(figma.createFrame());node.name=String(spec.name).slice(0,100);node.resize(Math.max(1,spec.w),Math.max(1,spec.h));node.clipsContent=false;
    const p=paint(spec.fill,theme);node.fills=p?[p]:[];node.cornerRadius=Math.min(spec.radius||0,spec.w/2,spec.h/2);
    if(spec.borderWidth){const stroke=paint(spec.border,theme);node.strokes=stroke?[stroke]:[];node.strokeWeight=spec.borderWidth;}
    if(spec.shadow)node.effectStyleId=effects[spec.glass?'Glass':'Surface'].id;
    if(spec.glass)node.effects=[...node.effects,{type:'BACKGROUND_BLUR',radius:28,visible:true}];
    if(spec.image){node.fills=[{type:'IMAGE',imageHash:'83e30e1169f386a9163169013467c240a973e6c6',scaleMode:'FIT'}];}
    if(spec.svg){const vector=track(figma.createNodeFromSvg(spec.svg));node.appendChild(vector);vector.x=0;vector.y=0;vector.name='Editable vector';for(const child of vector.findAll(()=>true))created.push(child.id);}
    if(spec.checkbox){const check=track(figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#165bcc"/><path d="m6 12 4 4 8-9" fill="none" stroke="white" stroke-width="2"/></svg>'));node.appendChild(check);for(const c of check.findAll(()=>true))created.push(c.id);}
  }
  parent.appendChild(node);node.x=spec.x-origin.x;node.y=spec.y-origin.y;
  if(spec.link)reactions.push({node,theme,device:parent.name,target:spec.link});
  for(const child of spec.children||[])await make(child,node,{x:spec.x,y:spec.y},theme);
  // Keep CSS-derived absolute geometry for the prepared import. Reconcile
  // related groups into Auto Layout during the required Figma visual review.
  return node;
}
for(const [index,scene]of payload.entries()){
  const frame=track(figma.createFrame());frame.name=`Glass 04 / ${scene.route} / ${scene.device} / ${scene.theme}`;frame.resize(scene.width,scene.height);frame.x=8000+(index%4)*1600;frame.y=scene.canvasY;frame.clipsContent=true;frame.fills=[{type:'SOLID',color:scene.theme==='dark'?{r:.065,g:.11,b:.16}:{r:.93,g:.96,b:.98}}];
  for(const child of scene.children)await make(child,frame,{x:0,y:0},scene.theme);
  frames.push({id:frame.id,route:scene.route,device:scene.device,theme:scene.theme});
}
return{createdNodeIds:[...new Set(created)],frames,pending:['Reconcile related groups to Auto Layout','Add reusable component properties and instance bindings','Wire and inspect navigation reactions','Review glass rendering and all imported text bounds','Remove only exact obsolete reference IDs after review']};
