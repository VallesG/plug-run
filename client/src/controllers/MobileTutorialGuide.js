// Mobile-only walkthrough. All overlays are decorative: gestures reach the game.
export function createMobileTutorialGuide(scene, stage, { desktop = false } = {}) {
  const W=scene.scale.width,H=scene.scale.height,cam=scene.cameras?.main;
  const hud=scene.add.container(0,0).setDepth(20020).setScrollFactor(0);
  const ink=scene.add.graphics(),ring=scene.add.graphics().setDepth(20019);
  const copy=scene.add.text(W/2,H*0.2,'',{
    fontFamily:'Arial, sans-serif',fontSize:'18px',color:'#e5f3ff',align:'center',
    stroke:'#080e16',strokeThickness:5,wordWrap:{width:Math.min(W-48,340)}
  }).setOrigin(0.5,0.5);
  const gestureLabel=scene.add.text(W/2,H/2,'',{fontFamily:'Arial, sans-serif',fontSize:'13px',fontStyle:'bold',color:'#9bcdfb',stroke:'#080e16',strokeThickness:4}).setOrigin(0.5);
  hud.add([ink,copy,gestureLabel]);
  const keycaps=desktop?[['↑',0,-1],['←',-1,0],['↓',0,0],['→',1,0]].map(([label,dx,dy])=>{
    const key=scene.add.text(W/2+dx*38,H*0.83+dy*38,label,{
      fontFamily:'Arial, sans-serif',fontSize:'21px',fontStyle:'bold',color:'#d8ecff'
    }).setOrigin(0.5).setVisible(false);
    hud.add(key);return key;
  }):[];
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  // Only the opening reveals are on a clock — the player cannot act during a
  // camera move, so there is no action to tie them to. Hold them long enough
  // to actually finish the sentence: roughly 3.3 words a second plus a beat
  // to start and finish reading, floored so even a short line does not blink.
  const readMs=text=>Math.max(2200,Math.min(6000,String(text).trim().split(/\s+/).length*300+1200));
  const original={zoom:cam?.zoom||1,x:cam?.scrollX||0,y:cam?.scrollY||0,bounds:cam?.useBounds};
  if(cam && (stage===1||stage===2)) cam.useBounds=false;
  const guide={stage,phase:stage===1?'intro':stage===2?'bagsIntro':'swipe',elapsed:0,turns:0,lastDirection:null,
    acceptAfter:performance.now()+300,done:false};
  // keepMoving: drop the finger's gesture bookkeeping but leave the runner
  // travelling. Stopping it dead between lesson beats reads as the game
  // seizing up mid-stride, which is not what the beat is teaching.
  const resetTouch=(keepMoving=false)=>{
    scene._activePointerId=null;scene.pointer=null;scene._swipeStart=null;
    scene._lastPointerTapAt=0;scene._dragMoveActive=false;scene._runnerDragSnap=null;
    if(!keepMoving)scene.playerDrift=null;
  };
  resetTouch();
  const restoreCamera=()=>{if(cam)cam.useBounds=original.bounds;cam?.setZoom(original.zoom);cam?.setScroll(original.x,original.y);};
  const syncHud=()=>{
    const z=cam?.zoom||1;
    hud.setScale?.(1/z);hud.setPosition?.(W/2-W/2/z,H/2-H/2/z);
  };
  const screenPoint=t=>({
    x:((t?.x||0)-(cam?.scrollX||0)-W/2)*(cam?.zoom||1)+W/2,
    y:((t?.y||0)-(cam?.scrollY||0)-H/2)*(cam?.zoom||1)+H/2
  });
  // No instruction box. Choose a floating location away from runner/objectives.
  const floatCopy=(text,targets=[])=>{
    const obstacles=[scene.runner,...targets].filter(Boolean).map(screenPoint);
    const choices=[H*0.18,H*0.46,H*0.72];
    const y=choices.reduce((best,v)=>{
      const clearance=a=>Math.min(...obstacles.map(t=>Math.abs(t.y-a)));
      return clearance(v)>clearance(best)?v:best;
    },choices[0]);
    copy.setPosition?.(W/2,y);copy.setText(text);
    return y;
  };
  const arrowStarts=new Map();
  const arrow=target=>{
    if(!target||target.active===false||target.visible===false)return;
    const t=screenPoint(target),z=cam?.zoom||1;
    const offsets=target===scene.car
      ?[{x:5,y:0},{x:-5,y:0},{x:0,y:5},{x:0,y:-5}]
      :[{x:2.8,y:1},{x:-2.8,y:1},{x:0,y:2.8},{x:0,y:-2.8}];
    const candidates=offsets.map(d=>({x:target.x+d.x*scene.cell,y:target.y+d.y*scene.cell}));
    const floor=p=>{
      const screen=screenPoint(p);
      if(screen.x<22||screen.x>W-22||screen.y<24||screen.y>H-24)return false;
      if(!scene.toCell||!scene.isWalkableCell)return true;
      const c=scene.toCell(p.x,p.y);return scene.isWalkableCell(c.x,c.y);
    };
    const world=candidates.find(floor)||{x:Math.max(scene.cell*2,Math.min(W-scene.cell*2,target.x)),y:target.y+scene.cell*2};
    const from=screenPoint(world);
    from.x=Math.max(22,Math.min(W-22,from.x));from.y=Math.max(24,Math.min(H-24,from.y));
    const dx=t.x-from.x,dy=t.y-from.y,len=Math.hypot(dx,dy)||1;
    const ux=dx/len,uy=dy/len;
    const gap=scene.cell*(target===scene.car?2:1.3)*z;
    const end={x:t.x-ux*gap,y:t.y-uy*gap};
    if(!arrowStarts.has(target))arrowStarts.set(target,guide.elapsed);
    const age=Math.max(0,guide.elapsed-arrowStarts.get(target));
    const pop=reduced?1:1+0.12*Math.sin(age/260)+0.25*Math.exp(-age/260);
    const sx=end.x+(from.x-end.x)*pop,sy=end.y+(from.y-end.y)*pop;
    // Dark outline and broad blue arrow stay legible over the floor.
    for(const [width,color] of [[9,0x07101b],[5,0x9bcdfb]]){
      ink.lineStyle(width*pop,color,1);ink.lineBetween(sx,sy,end.x,end.y);
      ink.lineBetween(end.x,end.y,end.x-ux*14*pop-uy*9*pop,end.y-uy*14*pop+ux*9*pop);
      ink.lineBetween(end.x,end.y,end.x-ux*14*pop+uy*9*pop,end.y-uy*14*pop-ux*9*pop);
    }
  };
  Object.defineProperties(guide,{
    waitingSwipe:{get:()=>guide.phase==='swipe'},
    blocksKeys:{get:()=>['intro','reveal','bagsIntro','bagsReveal'].includes(guide.phase)},
    blocksGestures:{get:()=>['intro','reveal','bagsIntro','bagsReveal'].includes(guide.phase)||(desktop&&guide.phase==='swipe')||performance.now()<guide.acceptAfter}
  });
  guide.move=(direction,distance)=>{
    if(guide.phase!=='swipe')return true;
    if(distance<32||Math.abs(direction.x)+Math.abs(direction.y)!==1)return false;
    if(desktop&&guide.lastDirection&&direction.x===guide.lastDirection.x&&direction.y===guide.lastDirection.y)return false;
    guide.lastDirection={...direction};
    guide.turns++;guide.elapsed=0;
    // Each beat hands straight to the next prompt, which waits on the player.
    // resetTouch keeps the runner travelling so the handoff is not a lurch.
    resetTouch(true);
    guide.phase=stage===1?(guide.turns>=2?'free':'swipe'):stage===2?'stash':stage===3?'power':'free';
    return true;
  };
  guide.swipe=guide.move;
  guide.key=direction=>guide.move(direction,32);
  guide.tick=(delta)=>{
    if(guide.done)return false;
    if(scene._transitioning||scene._carDeparting){ink.clear();ring.clear();copy.setText('');gestureLabel.setText('');restoreCamera();return false;}
    guide.elapsed+=Math.min(100,Math.max(0,delta));
    ink.clear();ring.clear();gestureLabel.setText('');
    for(const key of keycaps)key.setVisible(guide.phase==='swipe');
    if(guide.phase==='intro'||guide.phase==='reveal'){
      const revealing=guide.phase==='reveal';
      const p=revealing?Math.min(1,guide.elapsed/(reduced?1:700)):0;
      const z=1+(reduced?0:0.65)*(1-p);
      cam?.setZoom(z);
      cam?.setScroll((W/(2*1.65)-W/2)*(reduced?0:1-p),(-H/4)*(reduced?0:1-p));
      syncHud();
      const line='This is you.\nThe runner.';
      floatCopy(line,[scene.runner]);
      arrow(scene.runner);
      if(!revealing&&guide.elapsed>=readMs(line)){guide.phase='reveal';guide.elapsed=0;}
      if(revealing&&p===1){restoreCamera();syncHud();guide.phase='swipe';guide.elapsed=0;resetTouch();}
      return true;
    }
    syncHud();
    let targets=[];
    if(guide.phase==='bagsIntro'||guide.phase==='bagsReveal'){
      scene.playerDrift=null;
      const bags=[scene.stash,scene.bunkStash].filter(Boolean);
      const focus={x:bags.reduce((v,t)=>v+t.x,0)/(bags.length||1),y:bags.reduce((v,t)=>v+t.y,0)/(bags.length||1)};
      const spanX=Math.abs((bags[0]?.x||0)-(bags[1]?.x||0))+scene.cell*6;
      const spanY=Math.abs((bags[0]?.y||0)-(bags[1]?.y||0))+scene.cell*6;
      const zoom=reduced?1:Math.max(1,Math.min(1.4,W/spanX,H/spanY));
      const revealing=guide.phase==='bagsReveal';
      const p=revealing?Math.min(1,guide.elapsed/(reduced?1:700)):0;
      cam?.setZoom(1+(zoom-1)*(1-p));
      cam?.setScroll((focus.x-W/2)*(1-p),(focus.y-H/2)*(1-p));syncHud();
      const line='These are the bags. One is real; one is bunk.';
      floatCopy(line,bags);
      for(const bag of bags)arrow(bag);
      if(!revealing&&guide.elapsed>=readMs(line)){guide.phase='bagsReveal';guide.elapsed=0;}
      if(revealing&&p===1){restoreCamera();syncHud();guide.phase='swipe';guide.elapsed=0;resetTouch();}
      return true;
    }
    if(guide.phase==='swipe'){
      const moving=guide.turns>0;
      // First prompt: the runner has not moved yet and there is nothing to
      // preserve, so it waits. Later prompts arrive mid-run — keep the runner
      // travelling and let the scene's own update drive movement and
      // objectives, so the direction hint never stops the player mid-stride.
      if(!moving)scene.playerDrift=null;
      floatCopy(desktop?(moving?'Press a different arrow key to turn.':'Use the arrow keys or WASD to move.'):
        (moving?'Swipe again to change direction.':'Swipe anywhere, in any direction.'));
      if(desktop){
        const cx=W/2,cy=H*0.83,step=38,size=32;
        const keys=[[0,-1],[-1,0],[0,0],[1,0]];
        for(const [dx,dy] of keys){
          const x=cx+dx*step,y=cy+dy*step;
          ink.fillStyle(0x101d2b,0.94);ink.fillRoundedRect(x-size/2,y-size/2,size,size,5);
          ink.lineStyle(2,0x9bcdfb,0.9);ink.strokeRoundedRect(x-size/2,y-size/2,size,size,5);
        }
      }else{
        const p=reduced?0.5:(guide.elapsed%1200)/1200;
        const x=W/2,y=H*0.85;
        const d=moving?{x:0,y:1}:{x:1,y:0};
        ink.lineStyle(3,0x9bcdfb,0.8);ink.lineBetween(x-d.x*28,y-d.y*28,x+d.x*28,y+d.y*28);
        ink.fillStyle(0x9bcdfb,0.9);ink.fillCircle(x+d.x*(-28+p*56),y+d.y*(-28+p*56),6);
      }
      return !moving;
    }
    if(stage===4){copy.setText('');return false;}
    if(stage===1){
      targets=[scene.car];floatCopy(desktop?'Reach the lit getaway car.\nUse the arrow keys to turn.':'Reach the lit getaway car.\nSwipe anywhere to turn.',targets);
    }else if(stage===2){
      targets=scene.hasPackage?[scene.car]:scene.bunkStash?[scene.stash,scene.bunkStash]:[scene.stash];
      floatCopy(scene.hasPackage?'That is the real stash. Bring it to the car.':
        (!scene.bunkStash||scene.bunkStash.active===false)?'Bunk bags disappear. Pick up the other bag.':
        'Pick up a bag. One is real; one is bunk.',targets);
    }else if(stage===3){
      const used=(scene.runnerPowersConsumed||[]).filter(Boolean).length;
      if(used<2){
        scene.playerDrift=null;
        const powers=scene.runnerPowersSelected||[];
        const y=floatCopy((desktop?'Click to use ':'Double-tap anywhere to use ')+(powers[used]||'a power')+'.'+(used?'\nNow try your second power.':''));
        const beat=guide.elapsed%1400;
        const press=!reduced&&((beat>120&&beat<240)||(beat>380&&beat<500));
        const cy=Math.min(H-105,y+70),scale=press?0.88:1;
        const obstacles=[scene.runner,scene.stash,scene.bunkStash,scene.car].filter(Boolean).map(screenPoint);
        const clearance=x=>Math.min(...obstacles.map(t=>Math.hypot(x-t.x,cy-t.y)));
        const cx=[W*0.22,W*0.5,W*0.78].reduce((best,x)=>clearance(x)>clearance(best)?x:best,W*0.22);
        const outline=[[-12,18],[-19,3],[-14,-2],[-6,5],[-6,-25],[0,-29],[6,-25],[6,-3],[12,-8],[19,-6],[23,0],[24,16],[16,26],[-4,26],[-12,18]];
        ink.lineStyle(3,0x9bcdfb,1);
        for(let i=1;i<outline.length;i++){
          const a=outline[i-1],b=outline[i];
          ink.lineBetween(cx+a[0]*scale,cy+a[1]*scale,cx+b[0]*scale,cy+b[1]*scale);
        }
        gestureLabel.setPosition?.(cx,cy+45);gestureLabel.setText(desktop?'CLICK':'TAP · TAP');
      }else{
        targets=[scene.hasPackage?scene.car:scene.stash];
        floatCopy(scene.hasPackage?'Both powers used. Bring the stash to the car.':'Both powers used. Find the real stash, then escape.',targets);
      }
    }
    for(const t of targets){
      if(!t||t.active===false||t.visible===false)continue;
      arrow(t);
      ring.lineStyle(3,0x9bcdfb,0.9);ring.strokeCircle(t.x,t.y,scene.cell*0.8);
    }
    return false;
  };
  guide.destroy=()=>{
    if(guide.done)return;guide.done=true;restoreCamera();
    hud.destroy(true);ring.destroy();resetTouch();
  };
  return guide;
}
