import { GANG_SKINS, gangSkin, skinTextureKeys, skinPixel } from '../src/logic/gangSkins.js';
import { windowGang } from '../src/logic/window.js';
import { CONTACTS } from '../src/logic/contacts.js';
let passed=0;
function check(name,ok){if(!ok)throw new Error(name);passed++;}
check('three starters',Object.keys(GANG_SKINS).length===3);
check('unknown falls back',gangSkin('missing')===null&&skinTextureKeys(null).runner==='td_runner');
check('texture keys distinct',new Set(Object.keys(GANG_SKINS).map(id=>skinTextureKeys(id).runner)).size===3);
for(const [id,skin] of Object.entries(GANG_SKINS)){
 const plain=skinPixel(40,90,180,255,skin,'runner',0.5,0.6);
 const trim=skinPixel(40,90,180,255,skin,'runner',0.1,0.6);
 const car=skinPixel(40,90,180,255,skin,'car',0.2,0.6);
 const stripe=skinPixel(40,90,180,255,skin,'car',0.5,0.6);
 check('body differs from trim '+id,plain.join()!==trim.join());
 check('paint differs from stripe '+id,car.join()!==stripe.join());
 check('alpha unchanged '+id,skinPixel(40,90,180,92,skin,'runner')[3]===92);
 check('skin preserved '+id,skinPixel(180,125,82,255,skin,'runner').join()==='180,125,82,255');
 check('ink preserved '+id,skinPixel(8,12,20,255,skin,'runner').join()==='8,12,20,255');
 check('glass preserved '+id,skinPixel(150,160,165,255,skin,'car').join()==='150,160,165,255');
 check('transparent preserved '+id,skinPixel(40,90,180,0,skin,'runner').join()==='40,90,180,0');
 check('shading retained '+id,skinPixel(20,45,90,255,skin,'runner',.5,.6)[0]<plain[0]);
 check('bounded channels '+id,[plain,trim,car,stripe].every(p=>p.every(n=>n>=0&&n<=255)));
}
const iron=gangSkin('iron-row');
check('Iron Row olive outfit',iron.body===0x67734c&&iron.car===0x596744);
check('Iron Row safety yellow trim',iron.trim===0xd2c66a&&iron.stripe===0xeee3c5);
check('Iron Row UI follows trim',windowGang('iron-row').color===iron.trim&&windowGang('iron-row').css==='#d2c66a');
check('Brick follows crew accent',CONTACTS.find(c=>c.id==='brick').accent===iron.trim&&CONTACTS.find(c=>c.id==='brick').css===windowGang('iron-row').css);
check('Rook uses pale olive accent',CONTACTS.find(c=>c.id==='rook').accent===0xa7b58a&&CONTACTS.find(c=>c.id==='rook').css==='#a7b58a');
check('Iron Row cache revision',Object.values(skinTextureKeys('iron-row')).every(key=>key.endsWith('_v2')));
check('other crew caches unchanged',Object.values(skinTextureKeys('crossline')).every(key=>key.endsWith('_v1'))&&Object.values(skinTextureKeys('afterlight')).every(key=>key.endsWith('_v1')));
for(const kind of ['runner','car'])for(const brightness of [60,90,120,180,210]){
 const pixel=skinPixel(brightness*2/9,brightness/2,brightness,177,iron,kind,.5,.6);
 check('olive/yellow never danger red '+kind+' '+brightness,pixel[1]>pixel[2]&&(pixel[1]>=pixel[0]||pixel[2]/pixel[0]>.75));
 check('alpha on new palette '+kind+' '+brightness,pixel[3]===177);
}
console.log('gang skins: '+passed+' assertions passed');
