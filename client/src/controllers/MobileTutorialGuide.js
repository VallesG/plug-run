// Mobile-only tutorial coaching. Decorative overlays never capture touches.
export function createMobileTutorialGuide(scene, stage) {
  const W=scene.scale.width,H=scene.scale.height;
  const hud=scene.add.container(0,0).setDepth(20020).setScrollFactor(0);
  const ink=scene.add.graphics(),ring=scene.add.graphics().setDepth(20019);
  const panel=scene.add.rectangle(W/2,H-76,Math.min(W-24,420),116,0x101a23,0.94);
  const copy=scene.add.text(W/2,H-120,'',{fontFamily:'Arial, sans-serif',fontSize:'17px',color:'#dceefa',
    align:'center',wordWrap:{width:Math.min(W-44,390)}}).setOrigin(0.5,0);
  hud.add([panel,ink,copy]);
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const guide={stage,phase:stage===1?'demo':stage===3?'power':'stash',elapsed:0,turns:0,
    direction:scene.pickSafeInitialDirection(),acceptAfter:performance.now()+300,done:false};
  const resetTouch=()=>{
    scene._activePointerId=null;scene.pointer=null;scene._swipeStart=null;
    scene._lastPointerTapAt=0;scene._dragMoveActive=false;scene.playerDrift=null;
  };
  resetTouch();
  const safeDirection=()=>{
    const options=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];
    const candidates=options.filter(d=>scene.canMoveTo(scene.runner,scene.runner.x+d.x*scene.cell*0.6,
      scene.runner.y+d.y*scene.cell*0.6));
    return candidates.find(d=>d.x!==guide.direction.x||d.y!==guide.direction.y)||candidates[0]||guide.direction;
  };
  const name=d=>d.x>0?'right':d.x<0?'left':d.y>0?'down':'up';
  Object.defineProperties(guide,{
    waitingSwipe:{get:()=>guide.phase==='swipe'},
    blocksGestures:{get:()=>guide.phase==='demo'||performance.now()<guide.acceptAfter}
  });
  guide.swipe=(direction,distance)=>{
    if(guide.phase!=='swipe')return true;
    if(distance<32||direction.x!==guide.direction.x||direction.y!==guide.direction.y)return false;
    guide.turns++;guide.elapsed=0;
    guide.phase=guide.turns>=2?'free':'coast';
    return true;
  };
  guide.tick=(delta)=>{
    if(guide.done)return false;
    guide.elapsed+=Math.min(100,Math.max(0,delta));
    ink.clear();ring.clear();
    if(guide.phase==='demo'){
      copy.setText('Watch: a swipe keeps you moving.');
      scene.playerDrift=guide.direction;scene.handleMovement(Math.min(delta,50)/1000);
      if(guide.elapsed>=750){guide.phase='swipe';guide.direction=safeDirection();guide.elapsed=0;resetTouch();}
    } else if(guide.phase==='coast'){
      copy.setText('Nice. Lift your finger—you keep moving.');
      scene.handleMovement(Math.min(delta,50)/1000);
      if(guide.elapsed>=450){guide.phase='swipe';guide.direction=safeDirection();guide.elapsed=0;resetTouch();}
    } else if(guide.phase==='swipe'){
      scene.playerDrift=null;
      copy.setText('Quick swipe '+name(guide.direction)+' near the bottom.');
    } else if(stage===1){
      copy.setText('Now reach the car. Swipes work anywhere.');
    } else if(stage===2){
      copy.setText(scene.hasPackage?'Real stash! Swipe to the lit car.':
        (!scene.bunkStash||scene.bunkStash.active===false)?'Bunk disappears. Find the other bag.':'Touch a bag. One is real; one is bunk.');
    } else if(stage===3){
      const used=(scene.runnerPowersConsumed||[]).filter(Boolean).length;
      if(used<2){
        scene.playerDrift=null;
        const powers=scene.runnerPowersSelected||[];
        copy.setText('Double-tap open space below.\n'+(used?'One more: ':'Try: ')+(powers[used]||'your power'));
      } else {
        copy.setText(scene.hasPackage?'Both used. Bring the stash to the car.':'Both used! Find the real stash, then escape.');
      }
    }
    const animated=guide.phase==='swipe'||guide.phase==='demo'||(stage===3&&(scene.runnerPowersConsumed||[]).filter(Boolean).length<2);
    if(animated){
      const p=reduced?0.5:(guide.elapsed%1200)/1200;
      const x=W/2,y=H-52;
      ink.lineStyle(3,0x9bcdfb,0.8);
      if(stage===3){
        ink.strokeCircle(x,y,12+(p%0.5)*20);ink.fillStyle(0x9bcdfb,p%0.5<0.15?1:0.35);ink.fillCircle(x,y,7);
      }else{
        const d=guide.direction,startX=x-d.x*32,startY=y-d.y*20;
        ink.lineBetween(startX,startY,x+d.x*32,y+d.y*20);
        ink.fillStyle(0x9bcdfb,1);ink.fillCircle(startX+d.x*64*p,startY+d.y*40*p,7);
      }
    }
    const targets=stage===1&&guide.phase==='free'?[scene.car]:
      stage===2?(scene.hasPackage?[scene.car]:[scene.stash,scene.bunkStash]):
      stage===3&&(scene.runnerPowersConsumed||[]).every(Boolean)?[scene.hasPackage?scene.car:scene.stash]:[];
    for(const target of targets){
      if(!target||target.active===false||target.visible===false)continue;
      ring.lineStyle(3,0x9bcdfb,0.9);ring.strokeCircle(target.x,target.y,scene.cell*0.8);
    }
    return stage===1&&['demo','swipe','coast'].includes(guide.phase);
  };
  guide.destroy=()=>{
    if(guide.done)return;guide.done=true;
    hud.destroy(true);ring.destroy();resetTouch();
  };
  return guide;
}
