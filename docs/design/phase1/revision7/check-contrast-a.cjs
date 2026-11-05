/* Check current R07 CSS, keeping translucent backdrop coverage explicit. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const vars=body=>Object.fromEntries([...body.matchAll(/--([\w-]+):([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
let light={},dark={};
for(const name of ['../revision5/hig.css','../revision6/glass.css','design.css']){
 const css=fs.readFileSync(path.join(__dirname,name),'utf8');
 const base=vars(css.match(/:root\s*\{([^}]+)\}/)[1]);
 light={...light,...base};dark={...dark,...base,...vars(css.match(/\[data-theme=dark\]\s*\{([^}]+)\}/)[1])};
}
function luminance(hex){if(/^#[0-9a-f]{3}$/i.test(hex))hex='#'+[...hex.slice(1)].map(c=>c+c).join('');assert.match(hex,/^#[0-9a-f]{6}$/i);const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
const pairs=[['ink','surface'],['sub','surface'],['muted','surface'],['ink','bg'],['sub','bg'],['muted','bg'],['on-accent','accent'],['blue-ink','blue'],['green-ink','green'],['amber-ink','amber'],['red-ink','red'],['purple-ink','purple'],['calendar-class','calendar-class-bg'],['calendar-dl','calendar-dl-bg'],['calendar-exam','calendar-exam-bg']];
const results=[];for(const [theme,v]of Object.entries({light,dark}))for(const [fg,bg]of pairs){const a=luminance(v[fg]),b=luminance(v[bg]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);results.push({theme,fg,bg,ratio:+ratio.toFixed(2),passed:ratio>=4.5});}
fs.writeFileSync(path.resolve(__dirname,'../../../../output/playwright/ux-phase1/phase-a/contrast-report.json'),JSON.stringify({results,limitation:'Opaque semantic pairs from current CSS only. Glass compositing, hover/disabled states and real device UAT are not certified.'},null,2));
assert.ok(results.every(r=>r.passed));console.log('PASS '+results.length+' current CSS pairs; minimum '+Math.min(...results.map(r=>r.ratio)));
