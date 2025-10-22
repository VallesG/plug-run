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

// Calculate current route ID based on UTC time
// Routes reset every 24 hours at 1:00 AM UTC (6:00 PM PDT/PST)
// Returns: unique number for each day (YYYYMMDD format)
export function getCurrentRouteID() {
  // Get current UTC time
  const now = new Date();

  // Subtract 1 hour to shift the day boundary from midnight UTC to 1am UTC
  // This makes routes reset at 6pm PDT (1am UTC) instead of midnight
  const offsetTime = new Date(now.getTime() - (1 * 60 * 60 * 1000));

  // Get year, month, day from the offset time
  const year = offsetTime.getUTCFullYear();
  const month = offsetTime.getUTCMonth() + 1;
  const day = offsetTime.getUTCDate();

  // Create unique route ID: YYYYMMDD
  // Example: October 22, 2025 at 1:15am UTC (6:15pm PDT Oct 21) → 20251022
  // Example: October 22, 2025 at 12:30am UTC (5:30pm PDT Oct 21) → 20251021
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
