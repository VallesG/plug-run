// Art contracts, not gameplay: atlas identity and PNG/crop metadata must stay honest.
import { readFileSync } from 'node:fs';
import { WINDOW_ART, WINDOW_GANGS } from '../src/logic/window.js';
const manifest=JSON.parse(readFileSync(new URL('../public/art/the-window/contacts/manifest.json',import.meta.url),'utf8'));
const preview=readFileSync(new URL('../public/contact-art-preview.html',import.meta.url),'utf8');
let passed=0;
function check(name,ok){if(!ok)throw new Error(name);passed++;}
function checkPNG(source,size){
 const png=readFileSync(new URL('../public'+source,import.meta.url));
 check('PNG signature '+source,png.subarray(0,8).toString('hex')==='89504e470d0a1a0a');
 check('PNG dimensions '+source,png.readUInt32BE(16)===size.width && png.readUInt32BE(20)===size.height);
 check('PNG bytes '+source,png.length===size.bytes);
 check('PNG channels '+source,png.readUInt8(25)===size.colorType);
}
check('review-only contract',manifest.schemaVersion===1 && manifest.status==='art-review-not-gameplay');
check('six unique contact identities',manifest.contacts.length===6 && new Set(manifest.contacts.map(c=>c.id)).size===6);
check('six distinct settings',new Set(manifest.contacts.map(c=>c.background)).size===6);
for(const gang of WINDOW_GANGS){
 const pair=manifest.contacts.filter(c=>c.gang===gang.name);
 check('correct pair '+gang.id,pair.length===2 && pair.some(c=>c.id===gang.primary.toLowerCase()) && pair.some(c=>c.id===gang.jobs.toLowerCase()));
}
for(const c of manifest.contacts){
 checkPNG(c.background,c.backgroundSize);
 const f=c.portrait.frame;
 const expected=c.id==='switch'?{x:0,width:WINDOW_ART.switch.frameWidth}:WINDOW_ART.cast.frames[c.id];
 check('canonical atlas frame '+c.id,f.x===expected.x && f.width===expected.width && f.height===(c.id==='switch'?WINDOW_ART.switch.frameHeight:WINDOW_ART.cast.height));
 check('canonical source sheet '+c.id,c.portrait.source==='/art/the-window/'+(c.id==='switch'?'switch.png':'cast.png') && f.sheetWidth===(c.id==='switch'?WINDOW_ART.switch.frameWidth*WINDOW_ART.switch.frames:WINDOW_ART.cast.width));
 check('portrait fractions bounded '+c.id,c.portrait.heightFraction>0 && c.portrait.heightFraction<=1 && c.portrait.baseFraction>=c.portrait.heightFraction && c.portrait.baseFraction<=1 && c.portrait.centerXFraction===0.5);
 check('foreground fractions bounded '+c.id,c.foregroundStartFraction===null || (c.foregroundStartFraction>0 && c.foregroundStartFraction<1));
 check('preview uses real assets '+c.id,preview.includes(c.background) && preview.includes(c.portrait.source));
 check('sample dialogue is short '+c.id,c.sampleDialogue.length>0 && c.sampleDialogue.length<=140);
}
const objects=manifest.objects;
checkPNG(objects.source,objects);
check('object sheet has six proposed items',objects.cells.length===6 && new Set(objects.cells.map(c=>c.id)).size===6);
check('alpha-channel claim follows PNG header',objects.hasAlphaChannel===true && objects.colorType===6 && objects.alphaEdgesUnverified===true);
for(const cell of objects.cells)check('object cell contained '+cell.id,cell.x>=0 && cell.y>=0 && cell.width===512 && cell.height===512 && cell.x+cell.width<=objects.width && cell.y+cell.height<=objects.height);
check('object cells do not overlap',objects.cells.every((a,i)=>objects.cells.every((b,j)=>i===j || a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y)));
check('preview explicitly not gameplay',preview.includes('No missions or Cash rewards are active') && preview.includes('visual mockup'));
console.log(passed+' contact art assertions passed');
