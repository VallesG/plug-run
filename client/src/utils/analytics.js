// GA4 event contract. Never send account IDs, handles, recovery codes or replay IDs.
const FIELDS=new Set(['game_mode','player_role','crew','block_number','house_number',
 'starting_round','round_number','success','final_round','stash_collected','rep_earned',
 'stage','action','leaderboard_tab','destination','result','reason','course_slot',
 'elapsed_seconds','retries','power_1','power_2','analytics_version',
 // Where the game runs (src/platform): web, or Telegram with its client and launch kind.
 'platform','client','source','tg_platform','tg_version','start_kind','page_location','page_title']);
// Merged into every event. Set once at boot by src/platform/index.js.
let context={};
export function setAnalyticsContext(ctx={}){
 context={};
 for(const [key,value] of Object.entries(ctx||{}))if(FIELDS.has(key)&&typeof value==='string')context[key]=value;
 try{
  if(typeof window!=='undefined'&&typeof window.gtag==='function'&&context.platform)
   window.gtag('set','user_properties',{platform:context.platform,client:context.client});
 }catch{}
 return {...context};
}
export function trackPageView(){
 if(typeof window==='undefined')return false;
 return trackEvent('page_view',{page_location:window.location?.href,page_title:window.document?.title});
}
export function trackEvent(eventName,params={}){
 try{
  if(typeof window==='undefined'||typeof window.gtag!=='function')return false;
  const host=window.location?.hostname||'';
  const local=import.meta.env?.DEV||host==='localhost'||host==='127.0.0.1'||host.startsWith('192.168.');
  if(local&&window.PLUG_RUN_ANALYTICS_DEBUG!==true)return false;
  const safe={analytics_version:'2'};
  for(const [key,value] of Object.entries({...context,...params})){
   if(FIELDS.has(key)&&(typeof value==='string'||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value))))safe[key]=value;
  }
  if(window.PLUG_RUN_ANALYTICS_DEBUG===true)safe.debug_mode=true;
  window.gtag('event',eventName,safe);return true;
 }catch{return false;}
}
export function gameContext(scene={}){
 return {game_mode:scene.runKind==='rivals'?'rivals':scene.runKind==='journey'?'campaign':scene.stageIdx?'tutorial':'daily',
  player_role:scene.role||'runner',crew:scene.blockGangID||scene.analyticsCrew||undefined,
  block_number:scene.blockIndex,house_number:scene.stageIdx||scene.pveRound};
}
export function trackScene(scene,name,params={}){
 if(scene?.rivalRace?.recording)return false;
 return trackEvent(name,{...gameContext(scene),...params});
}
export function trackGameStart(mode,role,round=1,scene){
 return trackEvent('game_start',{...(scene?gameContext(scene):{game_mode:mode}),player_role:role,starting_round:round});
}
export function trackRoundComplete(role,round,success,scene){
 return trackEvent('round_complete',{...(scene?gameContext(scene):{}),player_role:role,round_number:round,success});
}
export function trackGameOver(role,finalRound,stashCollected,repEarned,scene){
 return trackEvent('game_over',{...(scene?gameContext(scene):{}),player_role:role,final_round:finalRound,stash_collected:stashCollected,rep_earned:repEarned});
}
export function trackTutorial(stage,action){return trackEvent('tutorial_progress',{game_mode:'tutorial',stage,action});}
export function trackLeaderboardView(tab,role){return trackEvent('leaderboard_view',{leaderboard_tab:tab,player_role:role});}
export function trackNavigation(destination){return trackEvent('navigation',{destination});}
