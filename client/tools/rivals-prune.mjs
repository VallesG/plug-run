#!/usr/bin/env node
// Dry-run by default. Archive redundant bundles outside public before pruning.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruneRivalBank } from '../src/logic/rivalBankPrune.js';
import { recordBenchmark, recordHouseTimes, measuredBands, bandOf } from '../src/logic/rivalSkill.js';
import { RIVAL_COURSE_POOL, RIVAL_RULES_VERSION, rivalPoolCourse } from '../src/logic/rivals.js';
import { validateRivalRunRecord, rivalRecordMatchesCourse, validateRivalReplayBundle } from '../src/logic/rivalRecords.js';
import { validateReplaySegment } from '../src/logic/rivalReplay.js';
const arg=(name,fallback=null)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const root=resolve(fileURLToPath(new URL('../public/rivals/v2/',import.meta.url)));
const archiveBase=resolve(fileURLToPath(new URL('../rivals-bank-archive/',import.meta.url)));
const minimum=Number(arg('minimum',20)),write=process.argv.includes('--write');
const archiveKey=arg('archive-key',new Date().toISOString().replace(/[^0-9]/g,''));
if(!/^[a-zA-Z0-9_-]+$/.test(archiveKey))throw Error('invalid archive key');
const archive=resolve(archiveBase,archiveKey);
if(!archive.startsWith(archiveBase+sep))throw Error('archive escaped intended directory');
const checkedReplay=relative=>{
 if(!/^replays\/[a-zA-Z0-9_-]+\.json$/.test(relative))throw Error('unsafe replay path');
 const path=resolve(root,relative);
 if(!path.startsWith(root+sep))throw Error('replay escaped bank');
 return path;
};
const manifestText=readFileSync(join(root,'manifest.json'),'utf8'),manifest=JSON.parse(manifestText);
const files=[],entries=[],ids=new Set();
for(const pinned of RIVAL_COURSE_POOL){
 const course={...pinned,...rivalPoolCourse(pinned.slot)};
 const relative='courses/'+course.courseID+'/opponents.json',text=readFileSync(join(root,relative),'utf8'),data=JSON.parse(text);
 if(data.courseID!==course.courseID||data.rulesVersion!==RIVAL_RULES_VERSION)throw Error('course metadata mismatch');
 files.push({relative,text,data});
 for(const entry of data.opponents){
  const record=entry.record,replayText=readFileSync(checkedReplay(entry.replay),'utf8');
  if(ids.has(record.recordingID)||!validateRivalRunRecord(record).ok
   ||!rivalRecordMatchesCourse(record,course,RIVAL_RULES_VERSION)
   ||!validateRivalReplayBundle(JSON.parse(replayText),record,{validateSegment:validateReplaySegment}).ok)
   throw Error('invalid or duplicate race: '+record.recordingID);
  ids.add(record.recordingID);entries.push({entry,course,bytes:Buffer.byteLength(replayText)});
 }
}
const originalBands=measuredBands(entries.map(({entry,course})=>recordBenchmark(entry.record,course.scales)));
const rows=entries.map(({entry,course,bytes})=>{
 const r=entry.record,b=recordBenchmark(r,course.scales);
 return {id:r.recordingID,slot:r.courseSlot,style:r.opponent.skillPreset,mix:r.orderedPowers.join('+'),
  opening:r.driverConfig?.openingDecoy===true,pace:b.clearMs,elapsed:r.elapsedMs,retries:r.retries,
  bytes,band:bandOf(originalBands,b.clearMs).label,byScale:recordHouseTimes(r,course.scales)};
});
const plan=pruneRivalBank(rows,{minimum}),retained=new Set(plan.retainedIDs),removed=new Set(plan.removedIDs);
const kept=entries.filter(({entry})=>retained.has(entry.record.recordingID));
const newBands=measuredBands(kept.map(({entry,course})=>recordBenchmark(entry.record,course.scales)));
const summary={...plan,sourceCommit:arg('source-commit'),originalBands,newBands,rows,
 mode:write?'write':'dry',archive:write&&removed.size?'../rivals-bank-archive/'+archiveKey:null};
console.log(JSON.stringify({...summary,rows:undefined},null,2));
if(!write||!removed.size)process.exit(0);
// All records/bundles validated before mutation. Backup must finish before writes.
if(existsSync(archive))throw Error('archive already exists; choose a fresh key');
mkdirSync(join(archive,'replays'),{recursive:true});
for(const file of files){
 const destination=join(archive,file.relative);mkdirSync(resolve(destination,'..'),{recursive:true});
 writeFileSync(destination,file.text);
}
writeFileSync(join(archive,'manifest.json'),manifestText);
writeFileSync(join(archive,'selection-report.json'),JSON.stringify(summary,null,2));
for(const {entry} of entries.filter(({entry})=>removed.has(entry.record.recordingID)))
 copyFileSync(checkedReplay(entry.replay),join(archive,entry.replay));
writeFileSync(join(archive,'README.md'),`# Archived Rivals bank depth
These redundant bundles were moved out of public by a conservative curation pass.
No frames, records, hashes or race times were edited. Metadata is the full
pre-prune snapshot; only removed replay bundles are here. Retained bundles
remain in public/rivals/v2/replays/. selection-report.json lists exact IDs,
measured coverage, endpoints and byte savings.
Do not put this archive in public. To reconstruct the original bank, use its
sourceCommit from Git, or combine these metadata/replays with the retained
public bundles. This archive is not a standalone playable bank.
`);
const atomic=(path,text)=>{writeFileSync(path+'.prune-tmp',text);renameSync(path+'.prune-tmp',path);};
const updated={...manifest,generatedAt:new Date().toISOString(),courses:[]};
for(const file of files){
 const opponents=file.data.opponents.filter(o=>retained.has(o.record.recordingID));
 // Payloads/provenance remain untouched; only eligibility list is smaller.
 atomic(join(root,file.relative),JSON.stringify({...file.data,opponents}));
 const prior=manifest.courses.find(c=>c.courseID===file.data.courseID),course=rivalPoolCourse(file.data.courseSlot);
 const bands={},styles={};
 for(const {record} of opponents){
  const label=bandOf(newBands,recordBenchmark(record,course.scales).clearMs).label;
  bands[label]=(bands[label]||0)+1;styles[record.opponent.skillPreset]=(styles[record.opponent.skillPreset]||0)+1;
 }
 updated.courses.push({...prior,opponents:opponents.length,bands,styles,elapsedMs:opponents.map(o=>o.record.elapsedMs)});
}
atomic(join(root,'manifest.json'),JSON.stringify(updated,null,1));
for(const {entry} of entries.filter(({entry})=>removed.has(entry.record.recordingID)))rmSync(checkedReplay(entry.replay));
// If interrupted after backup, recover from the archive before assembling again.
