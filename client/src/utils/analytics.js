// GA4 event contract. Never send account IDs, handles, recovery codes or replay IDs.
const FIELDS=new Set(['game_mode','player_role','crew','block_number','house_number',
 'starting_round','round_number','success','final_round','stash_collected','rep_earned',
 'stage','action','leaderboard_tab','destination','result','reason','course_slot',
 'elapsed_seconds','retries','power_1','power_2','analytics_version',
 // Where the game runs (src/platform): web, or Telegram with its client and launch kind.
 'platform','client','source','tg_platform','tg_version','start_kind','player_status','page_location','page_title',
 'houses','milestone','days_since_first']);
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
// Telegram's WebView can drop GA's cookie, which would count a returning
// player as new each visit. There the game keeps its own random id (never the
// Telegram or Plug Run account id) and hands it to GA.
export const GA_MEASUREMENT_ID='G-M68K7J4ZZ2';
export function setAnalyticsClientId(id){
 try{
  if(typeof window==='undefined'||typeof window.gtag!=='function'||typeof id!=='string'||!/^[0-9]+\.[0-9]+$/.test(id))return false;
  window.gtag('config',GA_MEASUREMENT_ID,{client_id:id,send_page_view:false,anonymize_ip:true,cookie_flags:'SameSite=None;Secure'});
  return true;
 }catch{return false;}
}
export function trackPageView(){
 if(typeof window==='undefined')return false;
 return trackEvent('page_view',{page_location:window.location?.href,page_title:window.document?.title});
}
function canSend(){
 if(typeof window==='undefined'||typeof window.gtag!=='function')return false;
 const host=window.location?.hostname||'';
 const local=import.meta.env?.DEV||host==='localhost'||host==='127.0.0.1'||host.startsWith('192.168.');
 return !local||window.PLUG_RUN_ANALYTICS_DEBUG===true;
}
export function trackEvent(eventName,params={}){
 try{
  if(!canSend())return false;
  const safe={analytics_version:'2'};
  for(const [key,value] of Object.entries({...context,...params})){
   if(FIELDS.has(key)&&(typeof value==='string'||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value))))safe[key]=value;
  }
  if(window.PLUG_RUN_ANALYTICS_DEBUG===true)safe.debug_mode=true;
  window.gtag('event',eventName,safe);
  const first=milestoneFor(eventName,safe);
  if(first)trackMilestone(first,safe);
  return true;
 }catch{return false;}
}
// Once per player (per device, backed up with progress in Telegram): the steps
// a new player takes, so a GA funnel reads them in order. The three numbers
// that matter: first house cleared, first full seven houses, came back or shared.
const MILESTONE_KEY='pr_milestones_v1';
export function milestoneFor(eventName,p={}){
 if(eventName==='house_started')return 'm_first_house_started';
 if(eventName==='round_complete'&&p.success===true){
  if(p.game_mode==='campaign'&&p.round_number>=7)return 'm_first_seven_houses';
  return p.game_mode==='tutorial'?null:'m_first_house_cleared';
 }
 if(eventName==='rivals_match_completed'&&p.houses===7)return 'm_first_seven_houses';
 if(eventName==='challenge_shared'&&(p.result==='sent'||p.result==='copied'))return 'm_first_challenge_shared';
 if(eventName==='challenge_opened')return 'm_first_challenge_opened';
 if(eventName==='daily_completed')return 'm_first_daily';
 return null;
}
function milestones(){try{return JSON.parse(localStorage.getItem(MILESTONE_KEY)||'{}')||{};}catch{return {};}}
export function trackMilestone(name,params={}){
 if(!canSend())return false;
 const seen=milestones();
 if(seen[name])return false;
 seen[name]=Date.now();
 try{localStorage.setItem(MILESTONE_KEY,JSON.stringify(seen));}catch{}
 try{window.gtag('event',name,{...params,milestone:name});return true;}catch{return false;}
}
/** At boot: the first visit, and coming back on a later day or a week later. */
export function trackVisit(now=Date.now()){
 if(!canSend())return false;
 const seen=milestones();
 if(!seen.first_visit){
  seen.first_visit=now;
  try{localStorage.setItem(MILESTONE_KEY,JSON.stringify(seen));}catch{}
  return trackEvent('m_first_visit',{});
 }
 const days=Math.floor(now/86400000)-Math.floor(seen.first_visit/86400000);
 if(days>=7)trackMilestone('m_returned_week',{...context,days_since_first:days});
 if(days>=1)return trackMilestone('m_returned_day',{...context,days_since_first:days});
 return false;
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
