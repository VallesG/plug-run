// A modal closing on pointerdown must own the eventual pointerup too.
export function consumeModalPointer(pointer, event) {
  event?.stopPropagation?.();
  pointer?.event?.stopPropagation?.();
}
export function guardModalDismissal(scene, pointer, event) {
  consumeModalPointer(pointer,event);
  if(scene._touchSceneClosing||!scene.cameras?.main||!scene.time?.delayedCall)return null;
  scene._modalDismissGuard?.destroy();
  const W=scene.scale.gameSize?.width||scene.scale.width;
  const H=scene.scale.gameSize?.height||scene.scale.height;
  const shield=scene.add.rectangle(W/2,H/2,W,H,0x000000,0.001)
    .setScrollFactor(0).setDepth(1000000).setInteractive();
  let timer=null,closed=false;
  const cleanup=()=>{
    if(closed)return;closed=true;
    timer?.remove?.(false);shield.destroy();
    scene.events?.off?.('shutdown',cleanup);
    if(scene._modalDismissGuard===guard)scene._modalDismissGuard=null;
  };
  const guard={destroy:cleanup};
  scene._modalDismissGuard=guard;
  const release=()=>{
    if(closed)return;
    // Includes other fingers: never uncover the menu under a held gesture.
    const pointers=scene.input?.manager?.pointers||[];
    if(pointer?.isDown||pointers.some(p=>p?.isDown)){
      timer=scene.time.delayedCall(50,release);return;
    }
    cleanup();
  };
  for(const name of ['pointerdown','pointerup','pointermove','wheel'])
    shield.on(name,(p,x,y,ev)=>consumeModalPointer(p,ev));
  scene.events?.once?.('shutdown',cleanup);
  timer=scene.time.delayedCall(250,release);
  return guard;
}
