import { readFileSync, existsSync, statSync } from 'node:fs';
import { pruneRivalBank } from '../src/logic/rivalBankPrune.js';
import { RIVAL_COURSE_POOL } from '../src/logic/rivals.js';
import { validateRivalReplayBundle } from '../src/logic/rivalRecords.js';
import { validateReplaySegment } from '../src/logic/rivalReplay.js';
let passed=0;const check=(name,ok)=>{if(!ok)throw Error(name);passed++;};
const archive=new URL('../rivals-bank-archive/2026-09-17-c4af9127/',import.meta.url);
const root=new URL('../public/rivals/v2/',import.meta.url);
const report=JSON.parse(readFileSync(new URL('selection-report.json',archive),'utf8'));
const before=JSON.stringify(report.rows),plan=pruneRivalBank(report.rows);
check('actual selection deterministic',JSON.stringify(plan.retainedIDs)===JSON.stringify(report.retainedIDs));
check('input rows immutable',JSON.stringify(report.rows)===before);
check('192 become 140; 52 archived',report.rows.length===192&&plan.retainedIDs.length===140&&plan.removedIDs.length===52);
check('exact replay bytes saved',plan.beforeBytes-plan.afterBytes===17962603);
check('idempotent on curated bank',pruneRivalBank(report.rows.filter(r=>plan.retainedIDs.includes(r.id))).removedIDs.length===0);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
let savedBytes=0,liveBytes=0;
for(const course of RIVAL_COURSE_POOL){
 const path='courses/'+course.courseID+'/opponents.json';
 const old=JSON.parse(readFileSync(new URL(path,archive),'utf8')).opponents;
 const live=JSON.parse(readFileSync(new URL(path,root),'utf8')).opponents;
 const oldRows=report.rows.filter(r=>r.slot===course.slot),rows=oldRows.filter(r=>plan.retainedIDs.includes(r.id));
 check('20 per course '+course.slot,live.length===20&&manifest.courses.find(c=>c.slot===course.slot).opponents===20);
 for(const key of ['style','mix','opening'])check('all '+key+' diversity '+course.slot,new Set(rows.map(r=>r[key])).size===new Set(oldRows.map(r=>r[key])).size);
 for(const id of plan.courses.find(c=>c.slot===course.slot).protectedIDs)check('matching/time/retry endpoint retained '+id,rows.some(r=>r.id===id));
 for(const band of ['fast','middle','steady'])check('band depth retained '+band,rows.filter(r=>r.band===band).length>=Math.min(3,oldRows.filter(r=>r.band===band).length));
 for(const entry of old){
  const id=entry.record.recordingID,kept=plan.retainedIDs.includes(id);
  if(kept){
   check('entry payload unchanged '+id,JSON.stringify(live.find(e=>e.record.recordingID===id))===JSON.stringify(entry));
   const bytes=statSync(new URL(entry.replay,root)).size;liveBytes+=bytes;
   check('live replay byte length unchanged '+id,bytes===report.rows.find(r=>r.id===id).bytes);
  }else{
   check('not served '+id,!existsSync(new URL(entry.replay,root))&&!live.some(e=>e.record.recordingID===id));
   const file=new URL(entry.replay,archive),text=readFileSync(file,'utf8'),bytes=statSync(file).size;savedBytes+=bytes;
   check('archive byte length unchanged '+id,bytes===report.rows.find(r=>r.id===id).bytes);
   check('archive still validates '+id,validateRivalReplayBundle(JSON.parse(text),entry.record,{validateSegment:validateReplaySegment}).ok);
  }
 }
}
check('all bytes accounted for',liveBytes===plan.afterBytes&&savedBytes+liveBytes===plan.beforeBytes);
const fixture=report.rows.find(r=>r.slot===1);
const scarce=Array.from({length:21},(_,i)=>({...fixture,id:'fixture-'+i,style:'unique-'+i,bytes:100+i}));
check('diversity outranks 20 target',pruneRivalBank(scarce).retainedIDs.length===21);
check('thin bank never padded or trimmed',pruneRivalBank(scarce.slice(0,10)).retainedIDs.length===10);
for(const input of [
 [{...fixture,bytes:0}],[{...fixture,pace:NaN}],[{...fixture,byScale:{}}],
 [{...fixture,opening:undefined}],[fixture,fixture]
]){let failed=false;try{pruneRivalBank(input);}catch{failed=true;}check('invalid telemetry rejects pruning',failed);}
let failed=false;try{pruneRivalBank(report.rows,{minimum:19});}catch{failed=true;}check('minimum 20 enforced',failed);
console.log('rival bank pruning: '+passed+' assertions passed');

