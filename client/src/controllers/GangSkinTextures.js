import { gangSkin, skinTextureKeys, skinPixel } from '../logic/gangSkins.js';
import { getWindowState } from '../utils/windowProgress.js';

export function selectedGangSkin(){
  // Review-only override; never changes account identity or simulation seeds.
  try{
    const override=new URLSearchParams(globalThis.location?.search||'').get('skin');
    if(gangSkin(override))return override;
  }catch{}
  return getWindowState().gangID;
}
function recolor(scene,sourceKey,targetKey,skin,kind){
  if(scene.textures.exists(targetKey))return targetKey;
  if(!scene.textures.exists(sourceKey))return sourceKey;
  let texture;
  try{
    const source=scene.textures.get(sourceKey).getSourceImage();
    const width=source.width,height=source.height;
    texture=scene.textures.createCanvas(targetKey,width,height);
    const ctx=texture.context;
    ctx.drawImage(source,0,0);
    const pixels=ctx.getImageData(0,0,width,height);
    for(let i=0;i<pixels.data.length;i+=4){
      const n=i/4;
      const out=skinPixel(pixels.data[i],pixels.data[i+1],pixels.data[i+2],pixels.data[i+3],
        skin,kind,(n%width)/Math.max(1,width-1),Math.floor(n/width)/Math.max(1,height-1));
      for(let c=0;c<4;c++)pixels.data[i+c]=out[c];
    }
    ctx.putImageData(pixels,0,0);
    texture.refresh();
    return targetKey;
  }catch(error){
    if(texture)scene.textures.remove(targetKey);
    console.warn('[Gang skins] Original art retained',error);
    return sourceKey;
  }
}
export function ensureGangSkin(scene,id=selectedGangSkin()){
  const skin=gangSkin(id),keys=skinTextureKeys(id);
  if(!skin)return keys;
  return {
    runner:recolor(scene,'td_runner',keys.runner,skin,'runner'),
    step:recolor(scene,'td_runner_step',keys.step,skin,'runner'),
    car:recolor(scene,'car_blue',keys.car,skin,'car')
  };
}
