// Mulberry32 seeded RNG - fast, deterministic, good distribution
// Same seed always produces same sequence of random numbers
export function createSeededRNG(seed) {
  let state = seed >>> 0; // ensure unsigned 32-bit integer

  return function seededRandom() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Calculate current route ID based on PST time
// Routes reset every 24 hours at 12:00 AM PST (midnight)
// Returns: unique number for each day (YYYYMMDD format)
export function getCurrentRouteID() {
  // Get current UTC time
  const now = new Date();

  // Convert to PST (UTC-8, or UTC-7 during daylight saving)
  // For simplicity, we'll use a fixed UTC-8 offset (can adjust for DST if needed)
  const PST_OFFSET = -8 * 60; // PST is UTC-8
  const localOffset = now.getTimezoneOffset(); // minutes from UTC
  const pstTime = new Date(now.getTime() + (localOffset + PST_OFFSET) * 60000);

  // Get year, month, day in PST
  const year = pstTime.getUTCFullYear();
  const month = pstTime.getUTCMonth() + 1;
  const day = pstTime.getUTCDate();

  // Create unique route ID: YYYYMMDD
  // Example: October 16, 2025 → 20251016
  const routeID = year * 10000 + month * 100 + day;

  return routeID;
}

// Get seed for a specific round in current route
// routeID + roundNumber + role ensures same round always gets same seed globally
// Runner and plug modes get different seeds for the same day/round
export function getRouteSeed(routeID, roundNumber, role = 'runner') {
  // Combine route ID, round number, and role into a unique seed
  // Use different offsets for runner vs plug to ensure different maps
  const roleOffset = role === 'plug' ? 500000 : 0;
  const combined = routeID * 1000 + roundNumber + roleOffset;

  // Simple hash function for better distribution
  let hash = combined;
  hash = ((hash >>> 16) ^ hash) * 0x45d9f3b;
  hash = ((hash >>> 16) ^ hash) * 0x45d9f3b;
  hash = (hash >>> 16) ^ hash;

  return hash >>> 0; // ensure unsigned 32-bit
}

// Convenience: Get RNG for current round
export function getRNGForRound(roundNumber) {
  const routeID = getCurrentRouteID();
  const seed = getRouteSeed(routeID, roundNumber);
  return createSeededRNG(seed);
}
