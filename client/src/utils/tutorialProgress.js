import { getUserID } from './userManager.js';
const key=userID=>'pr_tutorial_v1_'+userID;
const completed=new Set();
export function hasCompletedTutorial() {
  const userID=getUserID();
  if(completed.has(userID))return true;
  try { const value=JSON.parse(localStorage.getItem(key(userID))||'null');
    return value?.version===1&&value.complete===true;
  } catch { return false; }
}
export function markTutorialComplete(userID=getUserID()) {
  if(userID!==getUserID())return false;
  completed.add(userID);
  try { localStorage.setItem(key(userID),JSON.stringify({version:1,complete:true}));return true; }
  catch(error){console.warn('[Tutorial] Completion remains session-local',error);return false;}
}
