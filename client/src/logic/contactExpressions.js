// Presentation only. No dialogue selection, telemetry, RNG, storage or rewards.
export const CONTACT_EXPRESSIONS=Object.freeze(['neutral','amused','hyped','concerned','unimpressed']);
export const EXPRESSION_ART=Object.freeze({frameWidth:320,frameHeight:400,frames:5});
const ids=Object.freeze(['switch','mags','brick','rook','vee','sol','ro']);
export function expressionArt(id) {
 if(!ids.includes(id))return null;
 return {key:'expression_'+id,source:'/art/the-window/expressions/'+id+'.webp',...EXPRESSION_ART};
}
export function expressionIndex(name) {
 const index=CONTACT_EXPRESSIONS.indexOf(name);
 return index<0?0:index;
}
export function contactExpression(cue={},page={},sourcePage=0) {
 if(CONTACT_EXPRESSIONS.includes(page.expression))return page.expression;
 if(cue.celebration)return 'hyped';
 // Mandatory instruction/tease pages stay focused, even when preceded by jokes.
 if(cue.beat?.kind==='brief')return 'neutral';
 if(cue.banterID&&sourcePage<2)return sourcePage===0?'unimpressed':'amused';
 if(cue.beat?.kind==='banter')return 'amused';
 // Praise is already selected by the measured-data contract, never re-derived here.
 if(sourcePage===0&&cue.praiseKey){
  if(cue.praiseKey==='comeback')return 'concerned';
  if(cue.praiseKey==='bunk')return 'unimpressed';
  return 'hyped';
 }
 return 'neutral';
}
