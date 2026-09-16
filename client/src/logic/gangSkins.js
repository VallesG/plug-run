// Cosmetic palettes only. No imports, world RNG or gameplay parameters.
export const GANG_SKINS=Object.freeze({
  crossline:Object.freeze({name:'Crossline',body:0x405d9c,trim:0xe7ba59,car:0x365f8c,stripe:0xe7ba59}),
  'iron-row':Object.freeze({name:'Iron Row',body:0x59636b,trim:0xc06b4b,car:0x995640,stripe:0xe4d8b8}),
  afterlight:Object.freeze({name:'Afterlight',body:0x7757a0,trim:0xd7d0e4,car:0x68508c,stripe:0xe7b75f})
});
export function gangSkin(id){return GANG_SKINS[id]||null;}
export function skinTextureKeys(id){
  if(!gangSkin(id))return {runner:'td_runner',step:'td_runner_step',car:'car_blue'};
  return {runner:'gang_runner_'+id+'_v1',step:'gang_runner_'+id+'_step_v1',car:'gang_car_'+id+'_v1'};
}
export function skinPixel(r,g,b,a,skin,kind,x=0.5,y=0.5){
  // Only chromatic blue fabric/paint; warm skin, dark ink and neutral glass
  // retain their source pixels. Transparent edges retain their original alpha.
  if(!skin||a===0||b<45||b-r<24||b-g<12)return [r,g,b,a];
  let color=kind==='car'?skin.car:skin.body;
  if(kind==='car'&&x>=0.44&&x<=0.56)color=skin.stripe;
  if(kind==='runner'&&(y<0.32||x<0.25||x>0.75))color=skin.trim;
  const shade=Math.max(0.22,Math.min(1.18,Math.max(r,g,b)/180));
  return [
    Math.min(255,Math.round(((color>>16)&255)*shade)),
    Math.min(255,Math.round(((color>>8)&255)*shade)),
    Math.min(255,Math.round((color&255)*shade)),a
  ];
}
