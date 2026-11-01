// Run once through use_figma after figma-refine.js. Keeps token bindings and
// synchronizes fallback paint values for consistent preview/export rendering.
const page=await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
await Promise.all(['Regular','Medium','SemiBold'].map(style=>figma.loadFontAsync({family:'IBM Plex Sans Thai',style})));
const variables=await figma.variables.getLocalVariablesAsync();
const byId=new Map(variables.map(v=>[v.id,v]));
function colorValue(id,seen=new Set()) {
  if(seen.has(id))throw new Error('Circular variable alias');
  seen.add(id);
  const variable=byId.get(id);
  if(!variable)throw new Error(`Missing local variable: ${id}`);
  const value=Object.values(variable.valuesByMode)[0];
  return value.type==='VARIABLE_ALIAS'?colorValue(value.id,seen):value;
}
const roots=page.children.filter(n=>n.id!=='3:2');
const changed=new Set();
for(const root of roots)for(const node of [root,...root.findAll(()=>true)]) {
  for(const property of ['fills','strokes']) {
    if(!Array.isArray(node[property]))continue;
    let updated=false;
    const paints=node[property].map(paint=>{
      const id=paint.type==='SOLID'&&paint.boundVariables?.color?.id;
      if(!id)return paint;
      const value=colorValue(id);
      updated=true;
      return {...paint,color:{r:value.r,g:value.g,b:value.b}};
    });
    if(updated){node[property]=paints;changed.add(node.id);}
  }
  if(node.name==='Time grid'){node.resize(node.width,574);changed.add(node.id);}
  if(node.type==='TEXT'&&node.characters.startsWith('อังคาร 3 พฤศจิกายน')) {
    node.characters='อังคาร 3 พฤศจิกายน · 3 กิจกรรม';changed.add(node.id);
  }
}
return {mutatedNodeIds:[...changed],screens:roots.map(n=>({id:n.id,name:n.name}))};
