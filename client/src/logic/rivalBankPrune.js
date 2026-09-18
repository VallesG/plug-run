// Import-free, conservative size curation. Input rows contain measured values.
// Never edits a record, frame, clock, mix or provenance. Never filters for wins.
const compareID=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
const sum=rows=>rows.reduce((n,r)=>n+r.bytes,0);
export function pruneRivalBank(rows,{minimum=20}={}) {
 if(!Array.isArray(rows)||!Number.isSafeInteger(minimum)||minimum<20)throw Error('minimum must be at least 20');
 const ids=new Set();
 for(const r of rows){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!Number.isInteger(r.slot)||r.slot<1||r.slot>7
   ||!Number.isSafeInteger(r.bytes)||r.bytes<1||!Number.isFinite(r.pace)||r.pace<=0
   ||!Number.isFinite(r.elapsed)||r.elapsed<=0||!Number.isSafeInteger(r.retries)||r.retries<0
   ||typeof r.style!=='string'||!r.style||typeof r.mix!=='string'||!r.mix
   ||typeof r.opening!=='boolean'||!['fast','middle','steady','measured'].includes(r.band)
   ||![.6,.75,.9,.95,1].every(scale=>Number.isFinite(r.byScale?.[scale]?.clearMs)&&r.byScale[scale].clearMs>0))
   throw Error('invalid or duplicate measured curation row');
  ids.add(r.id);
 }
 const retained=[],courses=[];
 for(let slot=1;slot<=7;slot++){
  const original=rows.filter(r=>r.slot===slot);if(!original.length)continue;
  let keep=original.slice();const protectedIDs=new Set();
  const protect=(value)=>{for(const direction of [-1,1]){
   const ordered=original.slice().sort((a,b)=>direction*(value(a)-value(b))||compareID(a,b));
   protectedIDs.add(ordered[0].id);
  }};
  // Keep pace, race-time, retry AND each scale's matching endpoints.
  for(const field of ['pace','elapsed','retries'])protect(r=>r[field]);
  for(const scale of [.6,.75,.9,.95,1])protect(r=>r.byScale[scale].clearMs);
  const qualifies=candidate=>['style','mix','opening'].every(key=>
    new Set(candidate.map(r=>String(r[key]))).size===new Set(original.map(r=>String(r[key]))).size)
   &&['fast','middle','steady','measured'].every(band=>
    candidate.filter(r=>r.band===band).length>=Math.min(3,original.filter(r=>r.band===band).length))
   &&[...protectedIDs].every(id=>candidate.some(r=>r.id===id));
  // Only remove redundant larger bundles. Constraints outrank size/target.
  for(const row of original.slice().sort((a,b)=>b.bytes-a.bytes||compareID(a,b))){
   if(keep.length<=minimum)break;
   const candidate=keep.filter(r=>r.id!==row.id);
   if(qualifies(candidate))keep=candidate;
  }
  retained.push(...keep);
  courses.push({slot,before:original.length,after:keep.length,
   beforeBytes:sum(original),afterBytes:sum(keep),protectedIDs:[...protectedIDs].sort(),
   bands:keep.reduce((out,r)=>(out[r.band]=(out[r.band]||0)+1,out),{})});
 }
 const chosen=new Set(retained.map(r=>r.id));
 return {retainedIDs:rows.filter(r=>chosen.has(r.id)).map(r=>r.id),
  removedIDs:rows.filter(r=>!chosen.has(r.id)).map(r=>r.id),courses,
  beforeBytes:sum(rows),afterBytes:sum(retained)};
}
