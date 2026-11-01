// Executed with Figma use_figma, not Node. Creates editable review screens.
const page = await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
if (page.children.some(n => n.name === 'Desktop / Light')) throw new Error('Review screens already exist; inspect before rebuilding.');
page.name = '01 · Recording UI';
await Promise.all(['Regular','Medium','SemiBold'].map(style => figma.loadFontAsync({family:'IBM Plex Sans Thai',style})));
const made = [];
const track = n => { made.push(n.id); return n; };
const rgb = hex => { const h=hex.replace('#',''); return {r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}; };
// Adapted from the skill's createVariableCollection helper.
async function createVariableCollection(name,modeNames) {
  const collection=figma.variables.createVariableCollection(name), modeIds={};
  collection.renameMode(collection.modes[0].modeId,modeNames[0]); modeIds[modeNames[0]]=collection.modes[0].modeId;
  for(const name of modeNames.slice(1)) modeIds[name]=collection.addMode(name);
  return {collection,modeIds};
}
const primitive=await createVariableCollection('labboy / Primitives',['Value']);
const colors=await createVariableCollection('labboy / Light',['Light']);
const darkColors=await createVariableCollection('labboy / Dark',['Dark']);
const metrics=await createVariableCollection('labboy / Layout',['Value']);
const palette={bg:['#f3f6fa','#121922'],paper:['#ffffff','#202a37'],ink:['#202734','#eef3fa'],sub:['#566479','#b1bfd1'],line:['#dce3ec','#3b495c'],soft:['#eef2f7','#2b3747'],accent:['#175ecb','#9bc2ff'],on:['#ffffff','#142b4d'],blue:['#e9f1fe','#283e5d'],blueInk:['#174e9b','#b3d1ff'],green:['#e7f5ed','#233f35'],greenInk:['#206047','#a5dec0'],purple:['#f1ecfc','#3b3050'],purpleInk:['#6442a3','#d3b9ff'],amber:['#fff2dc','#4b3c29'],amberInk:['#805211','#f3ce96']};
const vars={}, varsDark={}, variableIds={};
for(const [key,values] of Object.entries(palette)) {
  const sem=figma.variables.createVariable(key,colors.collection,'COLOR'),darkSem=figma.variables.createVariable(key,darkColors.collection,'COLOR');for(const v of [sem,darkSem]){v.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];v.setVariableCodeSyntax('WEB',`var(--${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())})`);}
  for(const [i,mode] of ['Light','Dark'].entries()) {
    const p=figma.variables.createVariable(`${mode}/${key}`,primitive.collection,'COLOR'); p.scopes=[];p.setValueForMode(primitive.modeIds.Value,{...rgb(values[i]),a:1});p.setVariableCodeSyntax('WEB',`var(--${mode.toLowerCase()}-${key})`);
    (i===0?sem:darkSem).setValueForMode(i===0?colors.modeIds.Light:darkColors.modeIds.Dark,{type:'VARIABLE_ALIAS',id:p.id}); variableIds[`${mode}/${key}`]=p.id;
  }
  vars[key]=sem;varsDark[key]=darkSem;variableIds[key]=sem.id;variableIds[`dark/${key}`]=darkSem.id;
}
const gaps={},radii={};
for(const value of [4,6,8,10,12,14,16,18,20,22,24,28,32]) { const v=figma.variables.createVariable(`space/${value}`,metrics.collection,'FLOAT');v.scopes=['GAP'];v.setValueForMode(metrics.modeIds.Value,value);v.setVariableCodeSyntax('WEB',`var(--space-${value})`);gaps[value]=v;variableIds[`space/${value}`]=v.id; }
for(const value of [6,8,10,12,14,16,20,23,24]) { const v=figma.variables.createVariable(`radius/${value}`,metrics.collection,'FLOAT');v.scopes=['CORNER_RADIUS'];v.setValueForMode(metrics.modeIds.Value,value);v.setVariableCodeSyntax('WEB',`var(--radius-${value})`);radii[value]=v;variableIds[`radius/${value}`]=v.id; }
const styles={};
for(const [name,size,style]of [['Title',30,'SemiBold'],['Heading',18,'SemiBold'],['Body',14,'Regular'],['Body Emphasis',14,'Medium'],['Label',12,'Medium'],['Caption',11,'Regular'],['Micro',10,'Regular']]) { const s=figma.createTextStyle();s.name=`labboy / ${name}`;s.fontName={family:'IBM Plex Sans Thai',style};s.fontSize=size;s.lineHeight={unit:'PERCENT',value:155};styles[name]=s; }
const paint=(key,opacity=1)=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(palette[key][0]),opacity},'color',vars[key]);
function round(n,value){n.cornerRadius=value;const v=radii[value];if(v)for(const key of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])n.setBoundVariable(key,v);}
function fill(n,key,opacity=1){n.fills=key?[paint(key,opacity)]:[];}
function border(n){n.strokes=[paint('line')];n.strokeWeight=1;}
function box(parent,name,w,h,key=null,radius=0,dir='VERTICAL',gap=0,pad=0){
  const n=track(figma.createAutoLayout(dir));n.name=name;n.resize(w,h);n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;n.clipsContent=false;fill(n,key);if(radius)round(n,radius);if(gaps[gap])n.setBoundVariable('itemSpacing',gaps[gap]);if(gaps[pad])for(const p of ['paddingTop','paddingBottom','paddingLeft','paddingRight'])n.setBoundVariable(p,gaps[pad]);parent.appendChild(n);return n;
}
function text(parent,value,style='Body',key='ink',width=null){const n=track(figma.createText());n.name=value.slice(0,40);n.fontName=styles[style].fontName;n.textStyleId=styles[style].id;n.characters=value;n.fills=[paint(key)];parent.appendChild(n);if(width){n.textAutoResize='HEIGHT';n.resize(width,n.height);n.layoutSizingHorizontal='FIXED';}else n.textAutoResize='WIDTH_AND_HEIGHT';return n;}
function row(parent,name,w,h,gap=10,key=null,pad=0){const n=box(parent,name,w,h,key,0,'HORIZONTAL',gap,pad);n.counterAxisAlignItems='CENTER';return n;}
function spacer(parent,w=10){const n=box(parent,'Spacer',w,1);n.layoutSizingHorizontal='FILL';return n;}
const svgPaths={headphones:'M4 14v-3a8 8 0 0 1 16 0v3M4 12h4v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2m16 0h-4v8h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2',plug:'M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-6 6v4m0-4a6 6 0 0 1-6-6',usb:'M6 9h12v12H6zM9 9V3h6v6m-4-4v1m2-1v1',calendar:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2',record:'M12 3v6m-3-3h6M5 8H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M14 16l6-6 2 2-6 6-3 1z',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',appearance:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3v18',chevron:'m9 5 7 7-7 7',person:'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3',check:'m5 12 4 4 10-10',monitor:'M3 3h18v13H3zM8 21h8m-4-5v5',door:'M5 21V3h14v18M2 21h20M14 12h1',bolt:'m13 2-9 12h7l-1 8 10-12h-7z',close:'m6 6 12 12M6 18 18 6'};
function icon(parent,name,size=19,key='sub'){const n=track(figma.createNodeFromSvg(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="${svgPaths[name]||svgPaths.grid}" stroke="${palette[key][0]}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`));n.name=`Icon / ${name}`;parent.appendChild(n);for(const v of n.findAllWithCriteria({types:['VECTOR']})){made.push(v.id);v.strokes=v.strokes.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',vars[key]):p);}return n;}
const foundations=box(page,'Local components · labboy',1440,820,'bg',20,'VERTICAL',20,24);foundations.x=2200;foundations.y=1500;
text(foundations,'labboy / Components','Title');text(foundations,'Local components from approved code · IBM Plex Sans Thai · appearance variables','Body','sub');
const componentRow=row(foundations,'Quick Log components',1390,240,20);
const mains={};
const componentNodes=new Map();
function asComponent(frame,name,description){const n=track(figma.createComponentFromNode(frame));n.name=name;n.description=description;componentNodes.set(n.id,n);return n;}
function property(comp,node,name){const key=comp.addComponentProperty(name,'TEXT',node.characters);node.componentPropertyReferences={characters:key};return key;}
for(const mobile of [false,true]){
 const tile=box(componentRow,`Quick tile ${mobile?'mobile':'desktop'}`,mobile?157:238,mobile?112:82,'paper',14,mobile?'VERTICAL':'HORIZONTAL',10,14);border(tile);tile.counterAxisAlignItems=mobile?'MIN':'CENTER';
 const slot=box(tile,'Icon slot',35,35,'soft',10,'HORIZONTAL');slot.primaryAxisAlignItems='CENTER';slot.counterAxisAlignItems='CENTER';icon(slot,'headphones');
 const labels=box(tile,'Labels',mobile?128:160,47,null,0,'VERTICAL',3);const a=text(labels,'หูฟัง ชั้น 3','Label'),b=text(labels,'พร้อมใช้ 2 จาก 3','Micro','sub');
 const comp=asComponent(tile,`QuickLogTile / ${mobile?'Mobile':'Desktop'}`,'Select an equipment group; opens editable equipment picker.');mains[mobile?'tileMobile':'tile']={id:comp.id,label:property(comp,a,'Label'),subtitle:property(comp,b,'Subtitle')};
}
const service=box(componentRow,'Service row',488,50,'paper',10,'HORIZONTAL',10,14);border(service);icon(service,'person',18);const serviceText=text(service,'ผูกบัญชีครบชุด','Label');spacer(service);text(service,'3 รายการ','Micro','sub');const serviceComp=asComponent(service,'ServiceRow','Quick service entry; preview before confirmation.');mains.service={id:serviceComp.id,label:property(serviceComp,serviceText,'Label')};
const btn=box(componentRow,'Button',145,44,'accent',12,'HORIZONTAL',8,12);btn.primaryAxisAlignItems='CENTER';btn.counterAxisAlignItems='CENTER';const btnText=text(btn,'ยืนยันบันทึก','Label','on');const btnComp=asComponent(btn,'Button / Primary','Explicit confirmation action; touch and keyboard target.');mains.button={id:btnComp.id,label:property(btnComp,btnText,'Label')};
const eventMain=box(foundations,'Calendar event',560,74,'green',8,'VERTICAL',2,10);text(eventMain,'09:00–10:30  ·  ห้อง 406 + 407','Micro','greenInk');text(eventMain,'สอบ Digital Literacy','Label','greenInk');text(eventMain,'75 คน · ผู้คุมสอบตัวอย่าง 3 คน','Micro','greenInk');mains.event={id:asComponent(eventMain,'CalendarEvent','Scheduled event. Times and capacity are editable text.').id};
function instance(parent,entry,w,h,props={}){const comp=componentNodes.get(entry.id);const n=track(comp.createInstance());parent.appendChild(n);n.resize(w,h);if(Object.keys(props).length)n.setProperties(props);for(const c of n.findAll(()=>true))made.push(c.id);return n;}
const screens=[],hotspots={};
function viewport(name,w,h,mode,x,y){const n=track(figma.createFrame());n.name=name;n.resize(w,h);n.x=x;n.y=y;n.clipsContent=true;fill(n,'bg');page.appendChild(n);screens.push(n);return n;}
function brand(parent,w){const r=row(parent,'Brand',w,40,10);const logo=track(figma.createRectangle());logo.name='labboy logo';logo.resize(35,35);round(logo,10);logo.fills=[{type:'IMAGE',imageHash:'83e30e1169f386a9163169013467c240a973e6c6',scaleMode:'FIT'}];r.appendChild(logo);const t=box(r,'Product name',150,36,null,0,'VERTICAL',0);text(t,'labboy Workload','Body Emphasis');text(t,'พื้นที่ทำงานของทีม ICIT','Micro','sub');return r;}
function panel(parent,name,w,h){const p=box(parent,name,w,h,'paper',23,'VERTICAL',16,22);border(p);return p;}
function quick(parent,w,mobile,key){
 const p=panel(parent,'Record work',w,mobile?802:744),inside=w-44;p.setBoundVariable('itemSpacing',gaps[10]);
 const title=row(p,'Record heading',inside,29);text(title,'บันทึกงานของทีม','Heading');spacer(title);text(title,'Admin','Micro','sub');
 const staff=box(p,'Staff selector',inside,69,'paper',14,'HORIZONTAL',12,12);border(staff);const av=box(staff,'Avatar',34,34,'blue',16,'HORIZONTAL');av.primaryAxisAlignItems='CENTER';av.counterAxisAlignItems='CENTER';text(av,'01','Caption','blueInk');const lab=box(staff,'Staff label',inside-90,45,null,0,'VERTICAL',0);text(lab,'บันทึกให้','Micro','sub');text(lab,'ช่างตัวอย่าง 1','Label');icon(staff,'chevron',15);
 const tabs=box(p,'Record mode',inside,44,'soft',12,'HORIZONTAL',4,4);for(const [i,t]of ['บันทึกด่วน','กรอกเอง'].entries()){const b=box(tabs,`Mode / ${t}`,(inside-12)/2,36,i===0?'paper':null,10,'HORIZONTAL',7);b.primaryAxisAlignItems='CENTER';b.counterAxisAlignItems='CENTER';icon(b,i===0?'bolt':'record',17);text(b,t,'Label',i===0?'ink':'sub');}
 text(p,'ห้องและอุปกรณ์','Caption','sub');
 const grid=box(p,'Equipment groups',inside,mobile?236:178,null,0,'VERTICAL',10);const labels=[['หูฟัง ชั้น 3','พร้อมใช้ 2 จาก 3'],['หูฟัง Finn Space','พร้อมใช้ 2 จาก 3'],['ปลั๊กพ่วง','ชั้น 3 และ Finn Space'],['USB','ห้องบริการ ชั้น 3']];
 for(let i=0;i<2;i++){const r=row(grid,'Equipment row',inside,mobile?112:84,10);for(let j=0;j<2;j++){const k=i*2+j,e=mobile?mains.tileMobile:mains.tile;const n=instance(r,e,(inside-10)/2,mobile?112:84,{[e.label]:labels[k][0],[e.subtitle]:labels[k][1]});if(k===0)hotspots[`${key}/equipment`]=n;}}
 text(p,'บริการที่ใช้บ่อย','Caption','sub');
 const list=box(p,'Frequent services',inside,153,null,0,'VERTICAL',1);for(const [i,t]of ['ผูกบัญชีครบชุด','ช่วยเหลือการใช้งาน','เปิดห้องบริการ'].entries()){const n=instance(list,mains.service,inside,50,{[mains.service.label]:t});if(i===0)hotspots[`${key}/combo`]=n;}
 text(p,'✓ แสดงสรุปให้ตรวจก่อนยืนยันทุกครั้ง','Micro','sub');return p;
}
function recent(parent,w){const p=panel(parent,'Recent work',w,181);text(p,'บันทึกล่าสุด','Body Emphasis');for(const [t,s]of [['ช่วยเหลือการใช้งานคอมพิวเตอร์','ช่างตัวอย่าง 1 · 10:45'],['คืนหูฟัง 03 · ชั้น 3','ช่างตัวอย่าง 2 · 10:32']]){const r=row(p,'Recent row',w-44,43,10);icon(r,'check',17,'greenInk');const c=box(r,'Recent text',w-80,42,null,0,'VERTICAL');text(c,t,'Caption');text(c,s,'Micro','sub');}return p;}
function calendar(parent,w){const p=panel(parent,'Calendar',w,790);p.setBoundVariable('itemSpacing',gaps[8]);const h=row(p,'Calendar toolbar',w-44,31);icon(h,'calendar');text(h,'ตารางงาน','Heading');spacer(h);text(h,'‹     3 พ.ย.     ›','Caption','sub');
 const week=row(p,'Week strip',w-44,65,6);for(const [i,d]of ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'].entries()){const b=box(week,`Day ${i+2}`,(w-80)/7,62,i===1?'accent':null,12,'VERTICAL',2,6);b.counterAxisAlignItems='CENTER';text(b,d,'Micro',i===1?'on':'sub');text(b,String(i+2),'Heading',i===1?'on':'ink');}
 text(p,'อังคาร 3 พฤศจิกายน                                      3 กิจกรรม','Micro','sub');
 const grid=track(figma.createFrame());grid.name='Time grid';grid.resize(w-44,557);grid.fills=[];p.appendChild(grid);grid.clipsContent=true;
 for(let i=0;i<12;i++){const r=row(grid,`${i+8}:00`,w-44,18,10);r.x=0;r.y=i*50;text(r,`${String(i+8).padStart(2,'0')}:00`,'Micro','sub');const line=track(figma.createRectangle());line.resize(w-98,1);fill(line,'line');r.appendChild(line);}
 for(const [i,time]of ['09:00–10:30','13:30–15:00','17:00–18:30'].entries()){const n=instance(grid,mains.event,w-100,74);n.x=56;n.y=[50,275,450][i];const texts=n.findAllWithCriteria({types:['TEXT']});texts[0].characters=`${time}  ·  ห้อง 406 + 407`;if(i===2){fill(n,'purple');for(const t of texts)t.fills=[paint('purpleInk')];texts[1].characters='สอบ DL · รอบเย็นตัวอย่าง';texts[2].characters='ตัวอย่างการรองรับช่วงเวลาใหม่';}}
 text(p,'● สอบ DL     ● รอบเย็นตัวอย่าง','Micro','sub');return p;
}
function buildScreen(mobile,mode,x,y){const w=mobile?390:1440,h=mobile?844:1240,key=`${mobile?'Mobile':'Desktop'}/${mode}`;const v=viewport(`${mobile?'Mobile':'Desktop'} / ${mode}`,w,h,mode,x,y);v.overflowDirection=mobile?'VERTICAL':'NONE';const content=box(v,'App content',mobile?390:1240,mobile?2250:1216,null,0,'VERTICAL',22,mobile?16:0);content.x=mobile?0:100;content.y=24;
 const nav=box(content,'Navigation',mobile?358:1240,64,'paper',24,'HORIZONTAL',12,14);border(nav);brand(nav,mobile?225:410);if(!mobile){const nr=row(nav,'Main navigation',575,40,10);for(const [i,t]of ['บันทึกงาน','ตารางงาน','อุปกรณ์','เพิ่มเติม'].entries()){const b=box(nr,`Navigation / ${t}`,130,40,i===0?'soft':null,12,'HORIZONTAL',6,8);b.counterAxisAlignItems='CENTER';icon(b,['record','calendar','headphones','grid'][i],18,i===0?'accent':'sub');text(b,t,'Label',i===0?'ink':'sub');}}spacer(nav);const theme=row(nav,'Appearance toggle',28,32,0);icon(theme,'appearance');hotspots[`${key}/theme`]=theme;
 const intro=box(content,'Page title',mobile?358:1240,76,null,0,'VERTICAL',5);text(intro,'บันทึกงาน','Title');text(intro,'งานประจำวันของทีม ในพื้นที่เดียว','Caption','sub');
 const strip=box(content,'Resource status',mobile?358:1240,mobile?91:60,'paper',16,mobile?'VERTICAL':'HORIZONTAL',mobile?10:28,14);border(strip);text(strip,'พร้อมให้บริการ','Label');text(strip,'● ห้อง 8/8    ● หูฟัง 4/6    ● ปลั๊ก 2/2    ● USB 2/2','Micro','sub');
 const main=box(content,'Work area',mobile?358:1240,mobile?1821:945,null,0,mobile?'VERTICAL':'HORIZONTAL',24);
 if(mobile){quick(main,358,true,key);recent(main,358);calendar(main,358);}else{calendar(main,682);const r=box(main,'Work column',534,945,null,0,'VERTICAL',20);quick(r,534,false,key);recent(r,534);}
 if(mobile){const bottom=box(v,'Mobile navigation',358,70,'paper',24,'HORIZONTAL',3,6);border(bottom);bottom.x=16;bottom.y=758;for(const [i,t]of ['บันทึกงาน','ตารางงาน','อุปกรณ์','เพิ่มเติม'].entries()){const b=box(bottom,`Tab / ${t}`,84,56,i===0?'soft':null,16,'VERTICAL',2,4);b.counterAxisAlignItems='CENTER';icon(b,['record','calendar','headphones','grid'][i],20,i===0?'accent':'sub');text(b,t,'Micro',i===0?'accent':'sub');}}
 return {node:v,key};}
const desktopLight=buildScreen(false,'Light',2200,100),desktopDark=buildScreen(false,'Dark',3740,100),mobileLight=buildScreen(true,'Light',5280,100),mobileDark=buildScreen(true,'Dark',5770,100);
const sheetInfo=[];
function sheetScreen(base,mode,x,y,combo=false){const v=track(base.node.clone());page.appendChild(v);v.name=`${combo?'Confirmation':'Equipment picker'} / ${mode}`;v.x=x;v.y=y;for(const n of v.findAll(()=>true))made.push(n.id);screens.push(v);
 const dim=track(figma.createRectangle());dim.name='Modal scrim';dim.resize(390,844);dim.fills=[{type:'SOLID',color:{r:0.06,g:0.12,b:0.2},opacity:.44}];v.appendChild(dim);
 const p=panel(v,combo?'Confirmation sheet':'Equipment picker sheet',358,combo?430:506);p.x=16;p.y=combo?200:157;
 const heading=row(p,'Sheet heading',314,52);const titles=box(heading,'Sheet title',270,52,null,0,'VERTICAL',2);text(titles,combo?'ตรวจรายการก่อนบันทึก':'หูฟัง · ชั้น 3','Heading');text(titles,combo?'บันทึกให้ ช่างตัวอย่าง 1':'เลือกอุปกรณ์เพื่อยืมหรือคืน','Caption','sub');const close=row(heading,'Close',24,32);icon(close,'close');
 if(combo){const tasks=box(p,'Combo tasks',314,152,'soft',12,'VERTICAL',16,14);for(const t of ['Microsoft Authenticator','เปิดใช้งาน Google Account','เปิดใช้งาน KMUTNB SSO']){const r=row(tasks,'Task',285,26,9);icon(r,'check',17,'accent');text(r,t,'Label');}}
 else{const devices=row(p,'Equipment selection',314,145,8);for(let i=0;i<3;i++){const d=box(devices,`Device DEMO-0${i+1}`,99,145,i===0?'blue':'paper',12,'VERTICAL',9,10);d.counterAxisAlignItems='CENTER';border(d);icon(d,'headphones',30,i===0?'accent':'sub');text(d,`DEMO-0${i+1}`,'Label');text(d,i===2?'กำลังยืม':'พร้อมใช้','Micro',i===2?'amberInk':'greenInk');text(d,'ชั้น 3','Micro','sub');}const detail=box(p,'Selected device',314,42,'soft',12,'HORIZONTAL',6,10);text(detail,'หูฟัง 01 · ชั้น 3     ยืมอุปกรณ์','Caption');}
 text(p,'ผู้รับบริการ (ถ้ามี)','Caption','sub');const input=box(p,'Recipient input',314,44,'paper',12,'HORIZONTAL',0,12);border(input);text(input,'ระบุผู้รับบริการ','Caption','sub');
 const actions=row(p,'Sheet actions',314,44,9);const cancel=box(actions,'Cancel',112,44,'soft',12,'HORIZONTAL');cancel.primaryAxisAlignItems='CENTER';cancel.counterAxisAlignItems='CENTER';text(cancel,'ยกเลิก','Label');const confirm=instance(actions,mains.button,193,44,{[mains.button.label]:combo?'ยืนยันบันทึก':'ยืนยันยืม'});sheetInfo.push({node:v,close,cancel,confirm,base:base.node,combo});return v;}
const pickerLight=sheetScreen(mobileLight,'Light',5280,1100),pickerDark=sheetScreen(mobileDark,'Dark',5770,1100),confirmLight=sheetScreen(mobileLight,'Light',6260,100,true);
async function navigate(node,target){await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:target.id,navigation:'NAVIGATE',transition:{type:'DISSOLVE',easing:{type:'EASE_OUT'},duration:.15},resetScrollPosition:true}]}]);}
await navigate(hotspots['Mobile/Light/equipment'],pickerLight);await navigate(hotspots['Mobile/Dark/equipment'],pickerDark);await navigate(hotspots['Mobile/Light/combo'],confirmLight);await navigate(hotspots['Mobile/Light/theme'],mobileDark.node);await navigate(hotspots['Mobile/Dark/theme'],mobileLight.node);await navigate(hotspots['Desktop/Light/theme'],desktopDark.node);await navigate(hotspots['Desktop/Dark/theme'],desktopLight.node);
for(const s of sheetInfo){await navigate(s.close,s.base);await navigate(s.cancel,s.base);await navigate(s.confirm,s.base);}
const darkMap=new Map(Object.keys(vars).map(key=>[vars[key].id,varsDark[key]]));
for(const frame of screens.filter(n=>n.name.endsWith('/ Dark')))for(const n of [frame,...frame.findAll(()=>true)])for(const prop of ['fills','strokes'])if(Array.isArray(n[prop]))n[prop]=n[prop].map(p=>{const v=p.type==='SOLID'&&p.boundVariables?.color?.id?darkMap.get(p.boundVariables.color.id):null;return v?figma.variables.setBoundVariableForPaint(p,'color',v):p;});
figma.viewport.scrollAndZoomIntoView([desktopLight.node,desktopDark.node,mobileLight.node,mobileDark.node]);
const summary=screens.map(n=>{const all=n.findAll(()=>true),types=all.reduce((o,c)=>(o[c.type]=(o[c.type]||0)+1,o),{});return {id:n.id,name:n.name,w:n.width,h:n.height,types,images:all.filter(c=>Array.isArray(c.fills)&&c.fills.some(f=>f.type==='IMAGE')).map(c=>({id:c.id,name:c.name,w:c.width,h:c.height})),fonts:[...new Set(all.filter(c=>c.type==='TEXT').map(t=>typeof t.fontName==='object'?t.fontName.family:'mixed'))]};});
return {createdNodeIds:[...new Set(made)],mutatedNodeIds:[page.id],collectionIds:{primitives:primitive.collection.id,light:colors.collection.id,dark:darkColors.collection.id,layout:metrics.collection.id},modeIds:{...colors.modeIds,...darkColors.modeIds},variableIds,componentIds:mains,foundationId:foundations.id,frames:summary,hotspots:Object.fromEntries(Object.entries(hotspots).map(([k,v])=>[k,v.id])),logoHash:'83e30e1169f386a9163169013467c240a973e6c6',captureId:'3:2',pageId:page.id};
