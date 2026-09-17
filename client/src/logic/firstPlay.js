// Pure front-door policy. A crew choice is not proof of completed training.
export function firstPlayDestination({ tutorialComplete=false, campaignStashes=0, joinedCrew=false }={}) {
  const experienced=Number.isFinite(campaignStashes)&&campaignStashes>=1;
  if(tutorialComplete!==true&&!experienced)return 'TUTORIAL_MINI';
  return joinedCrew===true?'RUNNER':'WINDOW';
}
