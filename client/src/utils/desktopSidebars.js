// Desktop sidebar panels REMOVED — stubbed with the same export surface
// so MenuScene / BaseGameScene / LeaderboardScene / TutorialMiniScene
// short-circuit their sidebar paths without any code changes.
// isDesktop() => false disables every sidebar branch; the mobile UI
// (incl. the leaderboard button) is now used on all platforms.

export function isDesktop() { return false; }
export function areSidebarsActive() { return false; }
export function getExistingSidebars() { return { left: null, right: null }; }
export function createSidebarContainer() { return null; }
export function createSocialFeed() {}
export function createPersonalStats() {}
export function cleanupSidebars() {}
export function updateStats() {}
export function updateLeaderboard() {}
export function updateSocialFeed() {}
export function setGlobalTimers() {}
export function setCurrentMode() {}
export function getCurrentMode() { return null; }
export function clearGlobalTimers() {}
