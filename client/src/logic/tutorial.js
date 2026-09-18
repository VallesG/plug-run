// Runner-only tutorial sequencing and copy. No Phaser or imports.
export const TUTORIAL_STAGE_COUNT = 4;
export function tutorialStage(index) {
  return Number.isInteger(index) ? Math.max(1, Math.min(TUTORIAL_STAGE_COUNT, index)) : 1;
}
export function nextTutorialStage(index) {
  const current = tutorialStage(index);
  return current < TUTORIAL_STAGE_COUNT ? current + 1 : null;
}
export function tutorialLesson(index, desktop = false) {
  const stage = tutorialStage(index);
  const lessons = [
    {title:'Learn movement', lines:[
      desktop ? 'Move with arrow keys or WASD.' : 'Swipe to move. Hold and drag to steer.',
      'You are the runner. Reach the getaway car.',
      'Take your time. This first house is safe.'
    ]},
    {title:'Find the real stash', lines:[
      'Grab the stash, then reach the getaway car.',
      'Both bags look alike. One is bunk.',
      'Only the real stash starts the car.'
    ]},
    {title:'Use your powers', lines:[
      'Choose two powers: Phase, Dash or Decoy.',
      desktop ? 'Click to use the next power.' : 'Double-tap to use the next power.',
      'For this lesson, collect the real stash and use both powers before escaping. Powers are optional in Run the Block.'
    ]},
    {title:'Escape the defender', lines:[
      'The Plug guards this house. Grab the real stash and get to the car.',
      'Use corners and powers to break the firing line.',
      'Survive the escape to finish your runner training.'
    ]}
  ];
  return {...lessons[stage-1], stage, choosePowers:stage>=3};
}
