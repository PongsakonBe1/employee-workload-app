/* Check the actual CSS semantic colors on their opaque paired surfaces. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const css=fs.readFileSync(path.join(__dirname,'hig.css'),'utf8');
const vars=body=>Object.fromEntries([...body.matchAll(/--([\w-]+):([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const light=vars(css.match(/:root\s*\{([^}]+)\}/)[1]),dark={...light,...vars(css.match(/\[data-theme=dark\]\s*\{([^}]+)\}/)[1])};
const luminance=hex=>{assert.match(hex,/^#[0-9a-f]{6}$/i);const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
// Expand CSS short hex values without changing their meaning.
for(const values of [light,dark])for(const [k,v]of Object.entries(values))if(/^#[0-9a-f]{3}$/i.test(v))values[k]='#'+[...v.slice(1)].map(c=>c+c).join('');
const pairs=[['ink','surface'],['sub','surface'],['muted','surface'],['ink','bg'],['sub','bg'],['muted','bg'],['on-accent','accent'],['blue-ink','blue'],['green-ink','green'],['amber-ink','amber'],['red-ink','red'],['purple-ink','purple'],['calendar-class','calendar-class-bg'],['calendar-dl','calendar-dl-bg'],['calendar-exam','calendar-exam-bg']];
const results=[];
for(const [mode,values]of Object.entries({light,dark}))for(const [foreground,background]of pairs){const a=luminance(values[foreground]),b=luminance(values[background]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);results.push({mode,foreground,background,ratio:Number(ratio.toFixed(2)),target:4.5,passed:ratio>=4.5});assert.ok(ratio>=4.5,`${mode} ${foreground}/${background}: ${ratio}`);}
const output=path.resolve(__dirname,'../../../../output/playwright/ux-phase1/revision5');
fs.writeFileSync(path.join(output,'contrast.json'),JSON.stringify({date:'2026-11-04',results,limitation:'Opaque semantic pairs only; translucent backdrops, all states and screen-reader behavior require further UAT.'},null,2));
fs.writeFileSync(path.join(__dirname,'design-tokens.json'),JSON.stringify({source:'hig.css',revision:5,themes:{light,dark},notes:['CSS is the source of truth.','Glass uses backdrop blur; no native refraction engine.','Status labels and activity names accompany color.']},null,2));
console.log(`PASS ${results.length} semantic contrast pairs >= 4.5:1; minimum ${Math.min(...results.map(r=>r.ratio))}:1`);
