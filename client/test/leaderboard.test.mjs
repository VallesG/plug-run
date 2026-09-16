import { boardLayout, boardPage } from '../src/logic/leaderboard.js';
let passed=0;
function check(name,ok){if(!ok)throw new Error(name);passed++;}
for(const [w,h] of [[280,480],[320,568],[390,844],[430,932],[768,1024],[1440,900]]){
 const a=boardLayout(w,h);
 check('finite '+w,Object.values(a).every(Number.isFinite));
 check('panel fits '+w,a.left>=0&&a.right<=a.w&&a.panelW<=520);
 check('columns ordered '+w,a.rankX<a.nameX&&a.nameX<a.stashX&&a.stashX<a.repX);
 check('table clears title '+w,a.tableTop>a.summaryY);
 check('table clears back '+w,a.tableBottom<a.backY);
 check('at least three rows '+w,a.pageSize>=3);
 check('rows fit body '+w,a.pageSize*a.rowH<=a.bodyBottom-a.bodyTop);
 check('one more row does not fit '+w,(a.pageSize+1)*a.rowH>a.bodyBottom-a.bodyTop);
}
const twenty=Array.from({length:20},(_,i)=>i+1);
let page=boardPage(twenty,0,4);
check('first page',page.page===0&&page.pages===5&&page.entries.join(',')==='1,2,3,4');
page=boardPage(twenty,99,4);
check('high page clamps',page.page===4&&page.entries.join(',')==='17,18,19,20');
page=boardPage(twenty,-4,6);
check('low page clamps',page.page===0&&page.pages===4);
check('empty list still one page',boardPage([],2,4).pages===1&&boardPage([],2,4).page===0);
check('invalid page size repairs',boardPage([1,2],0,0).entries.length===1);
console.log('leaderboard layout: '+passed+' assertions passed');
