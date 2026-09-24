import { fullBlockReveal } from '../logic/blockComplete.js';
import { drawCrewSigil } from './CrewSigil.js';
// An overhead night map. Streets, yards and houses share one continuous world.
// Opaque pixel-stepped fog hides all unexplored geography. A clear removes
// only its new patch of fog, revealing the road and warm lights beneath it.
import { layoutBlock, buildFog, blockNoise, distanceToStreet } from '../logic/blockMap.js';
import { PALETTE } from '../logic/palette.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';

const BLACK = 0x07090b;
const LAND = [0x424735,0x454a37,0x484d39,0x4a4e3b,0x464b38];
const WARM = 0xffd78a;
const ROOFS = [0x675e4e,0x505e60,0x736557,0x5c6150,0x685758];

// A finished layer never changes, but as a Graphics object WebGL re-triangulates
// every command (tens of thousands here) on every frame it is shown. Copy it
// into a same-sized render texture once, in the layer's place, and drop the
// Graphics. The picture is identical because it is drawn at on-screen scale.
// Not used where the map is later zoomed (the city intro), which would enlarge it.
const BAKE_MARGIN = 16; // local units around the 200x220 block (lamp glow, marker pin)
function bakeLayer(scene, modal, gfx) {
  try {
    if (!scene?.add?.renderTexture || !gfx?.commandBuffer?.length) return gfx;
    const s = gfx.scaleX || 1, m = BAKE_MARGIN * s;
    const w = Math.ceil((200 + BAKE_MARGIN * 2) * s), h = Math.ceil((220 + BAKE_MARGIN * 2) * s);
    // Whole-pixel texture position; the layer keeps its exact subpixel offset inside it.
    const rx = Math.floor(gfx.x - m), ry = Math.floor(gfx.y - m);
    const rt = scene.add.renderTexture(rx, ry, w + 1, h + 1).setOrigin(0, 0)
      .setScrollFactor(gfx.scrollFactorX, gfx.scrollFactorY).setDepth(gfx.depth).setAlpha(gfx.alpha);
    rt.draw(gfx, gfx.x - rx, gfx.y - ry);
    const parent = gfx.parentContainer, at = parent ? parent.getIndex(gfx) : -1;
    modal.registerExtra(rt);
    if (parent && at >= 0 && rt.parentContainer === parent) parent.moveTo(rt, at);
    gfx.destroy();
    return rt;
  } catch { return gfx; }
}

export function drawBlockMap(scene, modal, { cleared, maps, entering = false, animate = true, caption = true, labels = true, overview = false, fog = true, marker = true, celebration = false, gangID = null, bake = true }) {
  if (!modal?.contentBounds || !modal.registerExtra) return null;
  const area = modal.contentBounds;
  const complete = fullBlockReveal({cleared,maps,celebration});
  // Reserve a caption outside the cartography, with no card around the map.
  const block = layoutBlock({
    maps, cleared, entering, layoutSeed: scene.worldBlock?.seed ?? 0, width:area.width, height:Math.max(0,area.height-(caption ? 24 : 0)),
    x0:area.x, y0:area.y
  });
  if (!block.scale) return null;
  const routeID = scene.worldBlock?.seed ?? scene.currentRouteID ?? getCurrentRouteID();
  const layers = [];
  const layer = depth => {
    const g = scene.add.graphics().setPosition(block.x,block.y)
      .setScale(block.scale).setScrollFactor(0).setDepth(depth);
    modal.registerExtra(g); layers.push(g); return g;
  };
  const g = layer(20001);
  const rect = (color,x,y,w,h,alpha=1) => {
    g.fillStyle(color,alpha); g.fillRect(x,y,w,h);
  };
  const line = (color,width,a,b,alpha=1) => {
    g.lineStyle(width,color,alpha); g.lineBetween(a.x,a.y,b.x,b.y);
  };
  // Streets are one ordered route. Stroke each road layer as one path, then
  // cap every interior turn with a matching circle so no seams can open at
  // right-angle bends on small/mobile canvases.
  const routePoints = [block.streets[0].a,...block.streets.map(street=>street.b)];
  const strokeRoute = (color,width,alpha=1) => {
    g.lineStyle(width,color,alpha);
    g.beginPath();g.moveTo(routePoints[0].x,routePoints[0].y);
    for(const point of routePoints.slice(1))g.lineTo(point.x,point.y);
    g.strokePath();
    g.fillStyle(color,alpha);
    for(const point of routePoints.slice(1,-1))g.fillCircle(point.x,point.y,width/2);
  };

  rect(BLACK,0,0,200,220);
  // Muted, deterministic ground variation; no texture downloads or world RNG.
  const groundStep = overview ? 6 : 2;
  for (let y=0;y<220;y+=groundStep) for (let x=0;x<200;x+=groundStep) {
    rect(LAND[Math.floor(blockNoise(x,y,routeID)*LAND.length)],x,y,Math.min(groundStep,200-x),Math.min(groundStep,220-y));
  }
  if(complete) {
    // Previously black courtyards now read as a whole lit neighborhood.
    // Low-cost park paths, paving and garden beds occupy the negative space.
    for(let y=14;y<208;y+=24)for(let x=12;x<192;x+=24){
      if(block.streets.some(s=>distanceToStreet(x+6,y+6,s.a,s.b)<14))continue;
      if(block.houses.some(h=>Math.abs(x+6-h.x)<h.w/2+11&&Math.abs(y+6-h.y)<h.h/2+11))continue;
      rect(0x343d31,x,y,16,16);
      rect(0x73745c,x,y+7,16,2,0.48);
      rect(0x596149,x+7,y,2,16,0.6);
      rect(0x71815d,x+2,y+2,3,3,0.6);
      rect(WARM,x+13,y+12,1,1,0.55);
    }
    // A faded crew mural ON the land, beneath streets/roofs: readable without
    // obscuring labels. This is decoration, not a server territory claim.
    drawCrewSigil(g,gangID,{x:31,y:41,size:138,alpha:0.19});
  }
  strokeRoute(PALETTE.ink,11,0.55);
  strokeRoute(0x797765,9);
  strokeRoute(0x303638,6);
  for (const street of block.streets) {
    const length = Math.hypot(street.b.x-street.a.x,street.b.y-street.a.y);
    for (let d=3;d<length-2;d+=6) {
      const t=d/length, end=Math.min(1,(d+2)/length);
      line(0x9b9477,0.55,
        {x:street.a.x+(street.b.x-street.a.x)*t,y:street.a.y+(street.b.y-street.a.y)*t},
        {x:street.a.x+(street.b.x-street.a.x)*end,y:street.a.y+(street.b.y-street.a.y)*end},
        street.index<=block.visibleThrough ? 0.8 : 0.28);
    }
    // A parked car on the curb, drawn from directly above.
    const vertical=street.a.x===street.b.x;
    const cx=(street.a.x+street.b.x)/2+(vertical?3.8:0);
    const cy=(street.a.y+street.b.y)/2+(vertical?0:3.8);
    rect(PALETTE.ink,cx-1,cy-1,vertical?2.6:5,vertical?5:2.6);
    rect(street.index%3 ? 0x697477 : 0x837457,cx-1.4,cy-1.4,vertical?2.6:5,vertical?5:2.6);
    rect(0x242e32,cx-0.8,cy-0.7,vertical?1.4:2,vertical?1.2:1.3);
  }

  // Trees and shrubs stop at streets and properties; empty parcels remain
  // hidden parcels during progression; the celebration reveals all of them.
  for (let y=4;y<217;y+=4) for (let x=4;x<197;x+=4) {
    const n=blockNoise(x,y,routeID^0x7123);
    if (n<0.68) continue;
    if (block.streets.some(s=>distanceToStreet(x,y,s.a,s.b)<7)) continue;
    if (block.houses.some(h=>Math.abs(x-h.x)<h.w/2+3 && Math.abs(y-h.y)<h.h/2+3)) continue;
    rect(0x1a231d,x+1,y+1,3,3,0.6);
    rect(n>0.87?0x29392a:0x354330,x,y,n>0.87?4:2,3);
    rect(0x526044,x,y,2,1,0.7);
  }

  for (const house of block.houses) {
    const lit=house.index<=block.visibleThrough;
    const left=house.x-house.w/2, top=house.y-house.h/2;
    line(0x7b7764,2,house.road,{x:house.x,y:house.road.y});
    // Yard fence, roof silhouette and one hard shadow.
    g.lineStyle(0.5,0x92917b,0.6);
    g.strokeRect(left-2,top-2,house.w+4,house.h+4);
    rect(PALETTE.ink,left+1.4,top+1.4,house.w,house.h,0.8);
    // Exterior only: pitched roofs, an attached garage, chimney and porch.
    // Interior layouts belong to gameplay and are never revealed here.
    const roof=ROOFS[(house.index-1)%ROOFS.length];
    rect(roof,left,top,house.w,house.h);
    rect(0x1a211e,house.x,top,house.w/2,house.h,0.27);
    line(0x9a9380,0.6,{x:house.x,y:top},{x:house.x,y:top+house.h},0.75);
    line(0x938a74,0.5,{x:left,y:top},{x:house.x,y:top+3},0.6);
    line(0x938a74,0.5,{x:left+house.w,y:top},{x:house.x,y:top+3},0.6);
    // Roof courses are quiet enough to read as material at thumbnail size.
    for(let dy=4;dy<house.h-1;dy+=3) {
      line(0x252e29,0.35,{x:left+0.5,y:top+dy},{x:left+house.w-0.5,y:top+dy},0.45);
    }
    const garageX=house.side<0?left+house.w-1:left-3;
    rect(PALETTE.ink,garageX+0.7,top+house.h-6+0.7,4.5,7,0.7);
    rect(0x777461,garageX,top+house.h-6,4.5,7);
    rect(0x3e473d,garageX,top+house.h-6,2,7,0.45);
    const chimneyX=house.index%2 ? left+2 : left+house.w-3;
    rect(PALETTE.ink,chimneyX+0.8,top+4,2,3,0.65);
    rect(0x9a8770,chimneyX,top+3,1.8,2.6);
    rect(0x252820,chimneyX+0.4,top+3.4,1,1);
    if(lit) {
      // Light spills through exterior windows onto the yard, never the roof.
      const faceX=house.side<0?left+house.w:left;
      for(const dy of [4,10]) {
        rect(WARM,faceX-(house.side>0?4:0),top+dy-1,4,4,0.06);
        rect(WARM,faceX-0.5,top+dy,1,1.8,0.95);
      }
      rect(WARM,faceX-house.side*1.8,house.road.y-1.5,2,3,0.2);
      rect(0xffe3a4,faceX-0.5,house.road.y-0.7,1,1.4);
    }
    g.lineStyle(house.finale?1:0.5,house.finale?0xc37b68:PALETTE.ink,1);
    g.strokeRect(left,top,house.w,house.h);
    if(house.finale) {
      // Twin guard lights at the last property.
      for(const dx of [-2,2]) rect(0xff866e,house.x+dx-0.7,top+house.h+1,1.4,1.4);
    }

    const lamp=house.lamp;
    if(lit) {
      // Several broad, faint rings read as light on asphalt, not neon halos.
      for(const [radius,alpha] of [[13,0.025],[9,0.045],[5,0.07],[2.5,0.13]]) {
        g.fillStyle(WARM,alpha);g.fillCircle(lamp.x,lamp.y,radius);
      }
    }
    rect(PALETTE.ink,lamp.x+0.4,lamp.y,1,3);
    rect(0x77725c,lamp.x-0.5,lamp.y-0.5,1,1);
    if(lit) rect(0xffe5a2,lamp.x-0.7,lamp.y-0.7,1.4,1.4);

    if(lit && labels) {
      const label=scene.add.text(
        block.x+(left+house.w/2)*block.scale,
        block.y+(top-4)*block.scale,
        String(house.index).padStart(2,'0'), {
          fontFamily:'monospace',fontSize:Math.max(8,Math.min(11,6*block.scale))+'px',
          color:house.finale?'#ffc1a0':'#d5d0b7',stroke:'#141b15',strokeThickness:2
        }).setOrigin(0.5).setDepth(20002).setScrollFactor(0);
      modal.registerExtra(label);
    }
  }

  const base = bake ? bakeLayer(scene, modal, g) : g;
  // Two disjoint opaque masks. Existing exploration never dims again.
  // The newly cleared road and property emerge together over 900ms.
  if(fog && !complete) {
    let fog=layer(20003), reveal=layer(20003);
    fog.fillStyle(BLACK,1);reveal.fillStyle(BLACK,1);
    const tiles=buildFog(block,routeID);
    // Merge adjacent tiles on each row to keep the mask inexpensive.
    for(let row=0;row<110;row++) {
      let start=0;
      const kind=i=>tiles[i].unlock>block.visibleThrough?1
        :animate && tiles[i].unlock===block.visibleThrough?2:0;
      for(let col=0;col<100;) {
        start=col;
        const type=kind(row*100+col);
        while(col<100 && kind(row*100+col)===type) col++;
        if(type) (type===1?fog:reveal).fillRect(start*2,row*2,(col-start)*2,2);
      }
    }
    if(bake) { fog=bakeLayer(scene, modal, fog); reveal=bakeLayer(scene, modal, reveal); }
    if(animate) {
      scene.tweens.add({targets:reveal,alpha:0,duration:900,ease:'Sine.easeOut'});
      reveal.once('destroy',()=>scene.tweens.killTweensOf(reveal));
    }

  }

  // Marker stays at the end of the lit road. Future streets and houses remain
  // hidden; the button explains the next destination.
  if(marker && !complete) {
    const pin=layer(20004);
    const {x,y}=block.marker;
    pin.fillStyle(PALETTE.ink,1);pin.fillTriangle(x-3.6,y-7,x+3.6,y-7,x,y);
    pin.fillRect(x-3.6,y-11,7.2,5);
    pin.fillStyle(WARM,1);pin.fillTriangle(x-2.5,y-7,x+2.5,y-7,x,y-1.5);
    pin.fillRect(x-2.5,y-10,5,4);
    pin.fillStyle(PALETTE.ink,1);pin.fillRect(x-0.7,y-9,1.4,2);
    if(bake) bakeLayer(scene, modal, pin);
  }
  if(caption) {
    const caption=scene.add.text(area.x+area.width/2,area.y+area.height-7,
      block.cleared>=block.maps?'THE WHOLE BLOCK IS AWAKE'
        :block.cleared+' / '+block.maps+' CLEARED  ·  FOLLOW THE LIGHT', {
        color:'#afa991',fontFamily:'monospace',fontSize:'10px'
      }).setOrigin(0.5).setDepth(20004).setScrollFactor(0);
    modal.registerExtra(caption);
  }
  return base;
}
