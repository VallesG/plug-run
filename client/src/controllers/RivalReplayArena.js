// Reuse live floor/wall/furniture/perimeter art without touching the live scene.
import { drawArenaArt, drawArenaPerimeter } from './ArenaArt.js';
export function drawRivalReplayArena(scene,{cell,pad,cols,rows,grid,seed,theme,floorKeySingle,egress,depth=30000,register}){
  const add={};
  for(const kind of ['rectangle','image','graphics','group']){
    add[kind]=(...args)=>{
      const o=scene.add[kind](...args);
      o._isReplayGhost=true;o.setScrollFactor?.(0);
      if(o.setDepth){const set=o.setDepth.bind(o);o.setDepth=n=>set(depth+n);o.setDepth(0);}
      register?.(o);return o;
    };
  }
  const facade={add,cell,pad,cols,rows,grid,seed,theme,floorKeySingle,egress,
    _wallFillKey:scene._wallFillKey,_wallEdgeKey:scene._wallEdgeKey,
    drawNeonPerimeter(){return drawArenaPerimeter.call(this);}};
  drawArenaArt.call(facade,{maskWalls:false});
  return facade;
}
