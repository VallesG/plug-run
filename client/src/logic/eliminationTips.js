// Loading-screen style advice, never a claim about measured player behavior.
export const RUNNER_TIPS = Object.freeze([
  'Let the Plug chase one lane, then turn a corner and change your route.',
  'Break line of sight around a wall before choosing your next move.',
  'Try Decoy as the house opens, then move. Don’t wait beside your double.',
  'Use Phase to cross a wall instead of taking the long way around.',
  'Save Dash for a gap or an exit. Pick your direction before you fire it.',
  'You can pick the same power twice. Try a different mix when a route stalls.',
  'Bunk bags vanish on touch. Keep looking until you find the stash.',
  'On special jobs, bring both the stash and the violet case to the car.',
  'After the pickup, plan a route to the car—not another lap of the house.',
  'A spawn swap costs REP. Use it when a different starting angle could help.'
]);
export const PLUG_TIPS = Object.freeze([
  'Use a wall to cover one side while you watch the runner’s next lane.',
  'Guard an exit angle, but leave yourself room to move.',
  'Aim where the runner is heading, not only where they are standing.',
  'A corner can break your shot. Reposition before firing again.',
  'Keep track of your ammo. An empty gun needs a different plan.',
  'A spawn swap costs REP. Try a new angle when this one keeps failing.'
]);
const CREWS = Object.freeze({
  crossline:['switch','mags'], 'iron-row':['brick','rook'], afterlight:['vee','sol']
});
export function eliminationTip({gangID,role='runner',seed=0,house=1,turn=0}={}) {
  const count=Number.isInteger(turn)&&turn>=0?turn:0;
  const bank=role==='plug'?PLUG_TIPS:RUNNER_TIPS;
  const index=(((seed>>>0)^Math.imul(Math.max(1,house|0),97))>>>0)%bank.length;
  return { contactID:CREWS[gangID]?.[count%2] || 'ro', text:bank[(index+count)%bank.length] };
}
export function eliminationTipLayout(bounds) {
  const w=Math.max(0,bounds.width),h=Math.max(0,bounds.height);
  const gap=12,portraitW=Math.min(140,w*0.3),portraitH=Math.min(180,h-8);
  return { x:bounds.x,y:bounds.y,width:w,height:h,
    portraitX:bounds.x+portraitW/2,portraitBottom:bounds.y+h,
    portraitW,portraitH:Math.max(0,portraitH),
    textX:bounds.x+portraitW+gap,textY:bounds.y+8,textW:Math.max(0,w-portraitW-gap),
    fontSize:w<330?13:16 };
}
