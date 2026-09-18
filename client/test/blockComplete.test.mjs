// Pure presentation and canonical vector contract; pixels still require phone review.
import { blockCompleteLayout, fullBlockReveal } from '../src/logic/blockComplete.js';
import { CREW_SIGILS, crewSigil, crewSigilSVG } from '../src/logic/crewSigils.js';
import { drawCrewSigil } from '../src/controllers/CrewSigil.js';
import { readFileSync } from 'node:fs';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
check('normal completion remains explored-only',!fullBlockReveal({cleared:15,maps:15}));
check('celebration cannot expose incomplete block',!fullBlockReveal({cleared:14,maps:15,celebration:true}));
check('explicit completion reveals neighborhood',fullBlockReveal({cleared:15,maps:15,celebration:true}));
check('invalid map count fails closed',!fullBlockReveal({cleared:15,maps:0,celebration:true}));
check('unknown crew has no invented identity',crewSigil('unknown')===null&&crewSigil(null)===null&&crewSigil('__proto__')===null);
for(const [width,height] of [[232,210],[342,580],[852,400],[0,0],[50,4]]){
 const a={x:10,y:20,width,height},l=blockCompleteLayout(a);
 check('map stays within available height '+height,l.map.y>=a.y&&l.map.y+l.map.height<=a.y+height);
 check('badges reserve space above map '+height,l.badges.every(b=>b.y+b.h<=l.map.y));
 check('badges stay within width '+width,l.badges.every(b=>b.x>=a.x&&b.x+b.w<=a.x+width));
}
const assets={
crossline:readFileSync(new URL('../public/art/crews/crossline-sigil.svg',import.meta.url),'utf8'),
'iron-row':readFileSync(new URL('../public/art/crews/iron-row-sigil.svg',import.meta.url),'utf8'),
afterlight:readFileSync(new URL('../public/art/crews/afterlight-sigil.svg',import.meta.url),'utf8')
};
const seen=new Set();
for(const id of Object.keys(CREW_SIGILS)){
 const m=crewSigil(id),svg=crewSigilSVG(id);
 check('distinct crew accent '+id,!seen.has(m.color));seen.add(m.color);
 check('font-free vector '+id,svg.includes('viewBox="0 0 100 100"')&&!/<(?:text|image)\b/.test(svg));
 check('served SVG matches canonical geometry '+id,assets[id]===svg);
 const commands=[],g={lineStyle(...a){commands.push(['line',...a]);return this;},strokeCircle(...a){commands.push(['circle',...a]);return this;},fillStyle(...a){commands.push(['fill',...a]);return this;},fillPoints(...a){commands.push(['polygon',...a]);return this;},lineBetween(...a){commands.push(['edge',...a]);return this;}};
 check('native vector draws '+id,drawCrewSigil(g,id,{x:12,y:15,size:138,alpha:.19})&&commands.length>0);
 check('native vector uses crew palette '+id,commands.filter(c=>c[0]==='line'||c[0]==='fill').every(c=>c[2]===m.color||c[1]===m.color));
}
check('unknown mark draws nothing',drawCrewSigil({},'unknown')===false);
console.log('block completion: '+passed+' assertions passed');
