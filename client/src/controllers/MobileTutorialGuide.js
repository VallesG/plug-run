// Mobile-only walkthrough. All overlays are decorative: gestures reach the game.
export function createMobileTutorialGuide(scene, stage) {
  const W=scene.scale.width,H=scene.scale.height,cam=scene.cameras?.main;
  const hud=scene.add.container(0,0).setDepth(20020).setScrollFactor(0);
  const ink=scene.add.graphics(),ring=scene.add.graphics().setDepth(20019);
  const copy=scene.add.text(W/2,H*0.2,'',{
    fontFamily:'Arial, sans-serif',fontSize:'18px',color:'#e5f3ff',align:'center',
    stroke:'#080e16',strokeThickness:5,wordWrap:{width:Math.min(W-48,340)}
  }).setOrigin(0.5,0.5);
  hud.add([ink,copy]);
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const original={zoom:cam?.zoom||1,x:cam?.scrollX||0,y:cam?.scrollY||0,bounds:cam?.useBounds};
  if(cam && stage===1) cam.useBounds=false;
  const guide={stage,phase:stage===1?'intro':stage===3?'power':'stash',elapsed:0,turns:0,
    acceptAfter:performance.now()+300,done:false};
  const resetTouch=()=>{
    scene._activePointerId=null;scene.pointer=null;scene._swipeStart=null;
    scene._lastPointerTapAt=0;scene._dragMoveActive=false;scene.playerDrift=null;
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
  Object.defineProperties(guide,{
    waitingSwipe:{get:()=>guide.phase==='swipe'},
    blocksGestures:{get:()=>['intro','reveal'].includes(guide.phase)||performance.now()<guide.acceptAfter}
  });
  guide.swipe=(direction,distance)=>{
    if(guide.phase!=='swipe')return true;
    if(distance<32||Math.abs(direction.x)+Math.abs(direction.y)!==1)return false;
    guide.turns++;guide.elapsed=0;guide.phase=guide.turns>=2?'free':'coast';
    return true;
  };
  guide.tick=(delta)=>{
    if(guide.done)return false;
    if(scene._transitioning){ink.clear();ring.clear();copy.setText('');restoreCamera();return false;}
    guide.elapsed+=Math.min(100,Math.max(0,delta));
    ink.clear();ring.clear();
    if(guide.phase==='intro'||guide.phase==='reveal'){
      const revealing=guide.phase==='reveal';
      const p=revealing?Math.min(1,guide.elapsed/(reduced?1:700)):0;
      const z=1+(reduced?0:1.6)*(1-p);
      cam?.setZoom(z);
      cam?.setScroll((scene.runner.x-W/2)*(1-p),(scene.runner.y-H/2)*(1-p));
      syncHud();
      // Scanline spotlight leaves a clear circular window around the runner.
      const t=screenPoint(scene.runner),radius=scene.cell*2.2;
      ink.fillStyle(0x030609,0.96*(1-p));
      for(let y=0;y<H;y+=4){
        const dy=y-t.y,half=Math.abs(dy)<radius?Math.sqrt(radius*radius-dy*dy):0;
        if(!half)ink.fillRect(0,y,W,4);
        else {ink.fillRect(0,y,Math.max(0,t.x-half),4);ink.fillRect(t.x+half,y,W-t.x-half,4);}
      }
      copy.setPosition?.(W/2,Math.min(H-80,H/2+radius+48));
      copy.setText('This is you.\nThe runner.');
      if(!revealing&&guide.elapsed>=1300){guide.phase='reveal';guide.elapsed=0;}
      if(revealing&&p===1){restoreCamera();syncHud();guide.phase='swipe';guide.elapsed=0;resetTouch();}
      return true;
    }
    syncHud();
    let targets=[];
    if(guide.phase==='coast'){
      floatCopy('Lift your finger. You keep moving.');
      scene.handleMovement(Math.min(delta,50)/1000);
      if(guide.elapsed>=650){guide.phase='swipe';guide.elapsed=0;resetTouch();}
      return true;
    }
    if(guide.phase==='swipe'){
      scene.playerDrift=null;
      floatCopy(guide.turns?'Swipe again to change direction.':'Swipe anywhere, in any direction, to move.');
      const p=reduced?0.5:(guide.elapsed%1200)/1200;
      const x=W/2,y=H*0.85;
      ink.lineStyle(3,0x9bcdfb,0.8);ink.lineBetween(x-28,y,x+28,y);
      ink.fillStyle(0x9bcdfb,0.9);ink.fillCircle(x-28+p*56,y,6);
      return true;
    }
    if(stage===1){
      targets=[scene.car];floatCopy('Reach the lit getaway car.\nSwipe anywhere to turn.',targets);
    }else if(stage===2){
      targets=scene.hasPackage?[scene.car]:[scene.stash,scene.bunkStash];
      floatCopy(scene.hasPackage?'That is the real stash. Bring it to the car.':
        scene.bunkStash?.active===false?'Bunk bags disappear. Touch the other bag.':
        'Touch a bag. One is real; one is bunk.',targets);
    }else if(stage===3){
      const used=(scene.runnerPowersConsumed||[]).filter(Boolean).length;
      if(used<2){
        scene.playerDrift=null;
        const powers=scene.runnerPowersSelected||[];
        const y=floatCopy('Double-tap anywhere to use '+(powers[used]||'a power')+'.'+(used?'\nNow try your second power.':''));
        const p=reduced?0.5:(guide.elapsed%1100)/1100;
        ink.lineStyle(3,0x9bcdfb,0.9);ink.strokeCircle(W/2,y+58,10+(p%0.5)*22);
        ink.fillStyle(0x9bcdfb,p%0.5<0.12?1:0.3);ink.fillCircle(W/2,y+58,6);
      }else{
        targets=[scene.hasPackage?scene.car:scene.stash];
        floatCopy(scene.hasPackage?'Both powers used. Bring the stash to the car.':'Both powers used. Find the real stash, then escape.',targets);
      }
    }
    for(const t of targets){
      if(!t||t.active===false||t.visible===false)continue;
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
