import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONTACT_EXPRESSIONS,expressionArt,expressionIndex,contactExpression} from '../src/logic/contactExpressions.js';
import {campaignContactCue,campaignContactFinish,campaignContactHouses} from '../src/logic/campaignContacts.js';
let passed=0;function check(name,ok){if(!ok)throw Error(name);passed++;}
const manifest=JSON.parse(readFileSync(new URL('../public/art/the-window/expressions/manifest.json',import.meta.url)));
check('five stable expression slots',JSON.stringify(manifest.expressions)===JSON.stringify(CONTACT_EXPRESSIONS)&&CONTACT_EXPRESSIONS.length===5);
check('seven unique character identities',manifest.characters.length===7&&new Set(manifest.characters.map(c=>c.id)).size===7);
let bytes=0;
for(const c of manifest.characters){
 const art=expressionArt(c.id),buf=readFileSync(new URL('../public'+c.source,import.meta.url));bytes+=buf.length;
 check('runtime source '+c.id,art.source===c.source&&art.frames===5);
 check('fixed padded atlas geometry '+c.id,c.width===art.frameWidth*5&&c.height===art.frameHeight);
 check('measured file size '+c.id,buf.length===c.bytes&&c.bytes<180000);
 check('payload fingerprint '+c.id,createHash('sha256').update(buf).digest('hex')===c.sha256);
 check('alpha-capable WebP '+c.id,buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP'
  &&buf.toString('ascii',12,16)==='VP8X'&&(buf[20]&16)!==0);
 const read24=o=>buf[o]|buf[o+1]<<8|buf[o+2]<<16;
 check('actual encoded dimensions '+c.id,read24(24)+1===c.width&&read24(27)+1===c.height);
 check('no served raster originals '+c.id,!existsSync(new URL('../public/art/the-window/expressions/'+c.id+'.png',import.meta.url)));
}
check('all runtime atlases under 1 MB',bytes<1000000);
for(const s of manifest.sources){
 const png=readFileSync(new URL('../'+s.path,import.meta.url));
 check('original archived '+s.name,png.length===s.bytes&&png.readUInt32BE(16)===s.width&&png.readUInt32BE(20)===s.height);
 check('original fingerprint '+s.name,createHash('sha256').update(png).digest('hex')===s.sha256);
 check('actual input transparency '+s.name,s.transparentPixels>s.width*s.height*.05);
}
check('unknown identities fail safely',expressionArt('stranger')===null);
for(const [i,name] of CONTACT_EXPRESSIONS.entries())check('stable frame '+name,expressionIndex(name)===i);
check('unknown emotion neutral',expressionIndex('rage')===0);
check('explicit authored face respected',contactExpression({celebration:true},{expression:'amused'})==='amused');
check('default remains focused',contactExpression() === 'neutral');
check('joke setup deadpan',contactExpression({banterID:'a'}, {},0)==='unimpressed');
check('joke payoff amused',contactExpression({banterID:'a'}, {},1)==='amused');
check('tease following joke focused',contactExpression({banterID:'a'}, {},2)==='neutral');
check('briefing never inherits joke face',contactExpression({banterID:'a',beat:{kind:'brief'}},{},0)==='neutral');
check('retry advice concerned',expressionIndex('concerned')===3);
check('comeback encouraging not celebratory',contactExpression({praiseKey:'comeback'})==='concerned');
check('bunk skeptical',contactExpression({praiseKey:'bunk'})==='unimpressed');
for(const key of ['flawless','noDeaths','noPowers','phase','dash','decoy'])check('praise happy '+key,contactExpression({praiseKey:key})==='hyped');
check('praise not applied to subsequent speaker',contactExpression({praiseKey:'flawless'}, {},1)==='neutral');
check('duo celebration hyped',contactExpression({celebration:true})==='hyped');
// Exercise real authored cues for every chapter and added cadence slot.
for(const gang of ['crossline','iron-row','afterlight'])for(let chapter=0;chapter<10;chapter++){
 for(const house of campaignContactHouses(gang,{chapter,blockIndex:chapter+1})){
  const cue=campaignContactCue(gang,{chapter,house,blockIndex:chapter+1});
  const snapshot=JSON.stringify(cue);
  cue.pages.forEach((p,i)=>{
   check('real page supported '+gang+'/'+chapter+'/'+house+'/'+i,CONTACT_EXPRESSIONS.includes(contactExpression(cue,p,i)));
   if(house===9)check('real job focused '+gang+'/'+chapter+'/'+i,contactExpression(cue,p,i)==='neutral');
  });
  check('expression mapping cannot mutate story',JSON.stringify(cue)===snapshot);
 }
 for(const p of campaignContactFinish(gang,chapter))check('real finish celebratory',contactExpression({celebration:true},p)==='hyped');
}
console.log('contact expressions: '+passed+' assertions passed; '+bytes+' runtime bytes');
