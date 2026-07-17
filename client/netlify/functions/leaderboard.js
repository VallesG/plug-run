// netlify/functions/leaderboard.js
//
// Plug Run leaderboard backend. Serverless function talking to Upstash
// Redis via its REST API. Uses sorted sets — perfect data structure for
// leaderboards (ZADD to submit, ZREVRANK for rank, ZREVRANGE for top-N).
//
// Anti-cheat v1: token-per-userID + plausibility caps + rate limiting.
// Real anti-cheat (replay verification via deterministic maze simulation)
// is designed into the submission payload but not yet enforced —
// `inputLog` field will be used later without breaking changes.
//
// Two metrics per board: STASH (grind) and REP (clean play). Stored as
// separate sorted sets, both submitted from a single API call.

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const OK      = (body)   => ({ statusCode: 200, headers: cors(), body: JSON.stringify(body) });
const BAD     = (msg)    => ({ statusCode: 400, headers: cors(), body: JSON.stringify({ error: msg }) });
const FORBID  = (msg)    => ({ statusCode: 403, headers: cors(), body: JSON.stringify({ error: msg }) });
const OOPS    = (msg)    => ({ statusCode: 500, headers: cors(), body: JSON.stringify({ error: msg }) });

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// -----------------------------------------------------------------------
// Upstash REST helpers — one-shot and pipelined
// -----------------------------------------------------------------------

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

async function pipeline(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.map(entry => entry.result);
}

// -----------------------------------------------------------------------
// Validation — plausibility caps + rate limit + token
// -----------------------------------------------------------------------

// Very generous ceilings — this exists to stop `stash: 999999` devtools
// injections, not to enforce a skill ceiling. Tune down after real data.
const MAX_ROUND        = 100;
const MAX_STASH_PER_ROUND = 500;
const MAX_REP          = 2000;
const MIN_SUBMIT_INTERVAL_MS = 800; // human reaction floor between rounds
const USERNAME_MAX_LEN = 24;
const USERID_MAX_LEN   = 40;

function badPayload(payload) {
  if (!payload || typeof payload !== 'object')                    return 'payload missing';
  const { userId, username, role, round, stash, rep } = payload;
  if (typeof userId !== 'string' || !userId || userId.length > USERID_MAX_LEN)     return 'userId';
  if (typeof username !== 'string' || !username || username.length > USERNAME_MAX_LEN) return 'username';
  if (role !== 'runner' && role !== 'plug')                        return 'role';
  if (!Number.isInteger(round) || round < 1 || round > MAX_ROUND)  return 'round';
  if (!Number.isFinite(stash) || stash < 0 || stash > round * MAX_STASH_PER_ROUND) return 'stash';
  if (!Number.isFinite(rep) || rep < -MAX_REP || rep > MAX_REP)    return 'rep';
  return null;
}

// -----------------------------------------------------------------------
// Redis key layout
// -----------------------------------------------------------------------

const kDailyStash  = (route, role) => `lb:daily:${route}:${role}:stash`;
const kDailyRep    = (route, role) => `lb:daily:${route}:${role}:rep`;
const kAllStash    = (role)        => `lb:all:${role}:stash`;
const kAllRep      = (role)        => `lb:all:${role}:rep`;
const kUserMeta    = (userId)      => `user:${userId}`;         // { username, token, lastSubmitAt }
const kUserPayload = (userId)      => `user:${userId}:payload`; // hash of route:role -> JSON blob (round breakdown)

const DAILY_EXPIRE_SEC = 60 * 60 * 24 * 8; // keep daily boards ~a week for late-cutoff queries

// -----------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------

async function handleSubmit(body) {
  const err = badPayload(body);
  if (err) return BAD(`invalid ${err}`);

  const { userId, username, role, round, stash, rep, routeID, token, inputLog, runId } = body;
  if (!Number.isInteger(routeID))    return BAD('routeID');

  // Token check: first submission issues one, subsequent submissions must match
  const metaRaw = await redis(['GET', kUserMeta(userId)]);
  let meta = metaRaw ? JSON.parse(metaRaw) : null;

  if (meta) {
    if (!token || meta.token !== token) return FORBID('bad token');
    if (Date.now() - (meta.lastSubmitAt || 0) < MIN_SUBMIT_INTERVAL_MS) {
      return FORBID('rate limited');
    }
  } else {
    // First time for this userId — mint a token, associate the username
    meta = {
      username,
      token: crypto.randomUUID(),
      lastSubmitAt: 0
    };
  }
  meta.username = username; // allow rename
  meta.lastSubmitAt = Date.now();

  // Combined sortable member for BEST-ROUND tiebreak on stash boards:
  // store userId as ZSET member (unique per player), score = the metric.
  // Round breakdown is stored separately in a hash for display.
  const dailyStashKey = kDailyStash(routeID, role);
  const dailyRepKey   = kDailyRep(routeID, role);
  const allStashKey   = kAllStash(role);
  const allRepKey     = kAllRep(role);

  // "Only submit improvements" — check existing to avoid clobbering with
  // a worse run. Redis ZSCORE returns null if not present.
  const [
    existingDailyStash, existingDailyRep,
    existingAllStash,   existingAllRep
  ] = await pipeline([
    ['ZSCORE', dailyStashKey, userId],
    ['ZSCORE', dailyRepKey,   userId],
    ['ZSCORE', allStashKey,   userId],
    ['ZSCORE', allRepKey,     userId]
  ]);

  const shouldWrite = (existing, incoming) =>
    existing === null || existing === undefined || Number(existing) < incoming;

  // RUN-SCOPED WRITE SEMANTICS: within one run, the latest submission wins
  // (session penalties like death/swap must stick on the board); across
  // runs, only a better total dethrones the standing best. Old clients
  // without runId fall back to pure best-only writes.
  meta.boardRuns = meta.boardRuns || {};
  const decide = (boardKey, existing, incoming) => {
    if (runId && meta.boardRuns[boardKey] === runId) return true; // same run: overwrite
    if (shouldWrite(existing, incoming)) {
      if (runId) meta.boardRuns[boardKey] = runId;
      return true;
    }
    return false;
  };
  const writeDailyStash = decide(dailyStashKey, existingDailyStash, stash);
  const writeDailyRep   = decide(dailyRepKey,   existingDailyRep,   rep);
  const writeAllStash   = decide(allStashKey,   existingAllStash,   stash);
  const writeAllRep     = decide(allRepKey,     existingAllRep,     rep);
  // prune boardRuns to live board keys so rolled-over daily keys don't pile up
  {
    const keep = {};
    for (const k of [dailyStashKey, dailyRepKey, allStashKey, allRepKey]) {
      if (meta.boardRuns[k]) keep[k] = meta.boardRuns[k];
    }
    meta.boardRuns = keep;
  }

  const writeOps = [
    ['SET', kUserMeta(userId), JSON.stringify(meta)]
  ];

  // Payload snapshot (round + optional inputLog) keyed for later lookup
  const payload = {
    round,
    stash,
    rep,
    ts: Date.now(),
    ...(inputLog ? { inputLog } : {})
  };
  writeOps.push(['HSET', kUserPayload(userId), `${routeID}:${role}`, JSON.stringify(payload)]);

  if (writeDailyStash) writeOps.push(['ZADD', dailyStashKey, stash, userId]);
  if (writeDailyRep)   writeOps.push(['ZADD', dailyRepKey,   rep,   userId]);
  if (writeAllStash)   writeOps.push(['ZADD', allStashKey,   stash, userId]);
  if (writeAllRep)     writeOps.push(['ZADD', allRepKey,     rep,   userId]);

  // Age out daily boards to conserve free-tier storage
  writeOps.push(['EXPIRE', dailyStashKey, DAILY_EXPIRE_SEC]);
  writeOps.push(['EXPIRE', dailyRepKey,   DAILY_EXPIRE_SEC]);

  await pipeline(writeOps);

  return OK({
    ok: true,
    token: meta.token,  // client stores this on first submit
    improved: {
      dailyStash: writeDailyStash,
      dailyRep:   writeDailyRep,
      allStash:   writeAllStash,
      allRep:     writeAllRep
    }
  });
}

async function handleTop(qs) {
  const scope = qs.get('scope');      // 'daily' | 'all'
  const role  = qs.get('role');       // 'runner' | 'plug'
  const sort  = qs.get('sort') || 'stash'; // 'stash' | 'rep'
  const routeID = Number(qs.get('routeID') || 0);
  const limit = Math.min(Number(qs.get('limit') || 50), 200);

  if (scope !== 'daily' && scope !== 'all')      return BAD('scope');
  if (role !== 'runner' && role !== 'plug')      return BAD('role');
  if (sort !== 'stash' && sort !== 'rep')        return BAD('sort');
  if (scope === 'daily' && !Number.isInteger(routeID)) return BAD('routeID');

  const key =
    scope === 'daily'
      ? (sort === 'stash' ? kDailyStash(routeID, role) : kDailyRep(routeID, role))
      : (sort === 'stash' ? kAllStash(role)             : kAllRep(role));

  // ZREVRANGE returns [userId, score, userId, score, ...] with WITHSCORES
  const flat = await redis(['ZREVRANGE', key, 0, limit - 1, 'WITHSCORES']);
  if (!flat || flat.length === 0) return OK({ entries: [] });

  // Fetch usernames + payload snapshots for the returned users
  const userIds = [];
  for (let i = 0; i < flat.length; i += 2) userIds.push(flat[i]);

  const metaKey = (u) => kUserMeta(u);
  const payloadKey = (u) => kUserPayload(u);
  const routeRoleField = scope === 'daily' ? `${routeID}:${role}` : null;

  // Fetch the OTHER metric's score so the UI can display both columns
  // regardless of which one is being sorted on. The unsorted metric will
  // just render as a muted secondary value client-side.
  const otherSort = sort === 'stash' ? 'rep' : 'stash';
  const otherKey =
    scope === 'daily'
      ? (otherSort === 'stash' ? kDailyStash(routeID, role) : kDailyRep(routeID, role))
      : (otherSort === 'stash' ? kAllStash(role)             : kAllRep(role));

  const metaFetches  = userIds.map(u => ['GET', metaKey(u)]);
  const payloadFetches = scope === 'daily'
    ? userIds.map(u => ['HGET', payloadKey(u), routeRoleField])
    : [];
  const otherFetches = userIds.map(u => ['ZSCORE', otherKey, u]);

  const metas    = metaFetches.length  ? await pipeline(metaFetches)  : [];
  const payloads = payloadFetches.length ? await pipeline(payloadFetches) : [];
  const others   = otherFetches.length ? await pipeline(otherFetches) : [];

  const entries = [];
  for (let i = 0; i < userIds.length; i++) {
    const uid = userIds[i];
    const score = Number(flat[i * 2 + 1]);
    let username = uid;
    try { const m = metas[i] ? JSON.parse(metas[i]) : null; if (m?.username) username = m.username; } catch {}
    let round = null;
    if (scope === 'daily' && payloads[i]) {
      try { round = JSON.parse(payloads[i]).round ?? null; } catch {}
    }
    const otherRaw = others[i];
    const otherScore = otherRaw === null || otherRaw === undefined ? null : Number(otherRaw);
    entries.push({
      userId: uid,
      username,
      [sort]: score,
      [otherSort]: otherScore,
      round
    });
  }
  return OK({ entries });
}

async function handleRank(qs) {
  const scope = qs.get('scope');
  const role  = qs.get('role');
  const sort  = qs.get('sort') || 'stash';
  const routeID = Number(qs.get('routeID') || 0);
  const userId = qs.get('userId');

  if (!userId) return BAD('userId');
  if (scope !== 'daily' && scope !== 'all') return BAD('scope');
  if (role !== 'runner' && role !== 'plug') return BAD('role');

  const key =
    scope === 'daily'
      ? (sort === 'stash' ? kDailyStash(routeID, role) : kDailyRep(routeID, role))
      : (sort === 'stash' ? kAllStash(role)             : kAllRep(role));

  const [rank, score, total] = await pipeline([
    ['ZREVRANK', key, userId],
    ['ZSCORE',   key, userId],
    ['ZCARD',    key]
  ]);

  return OK({
    rank:  rank === null || rank === undefined ? null : Number(rank) + 1, // 1-indexed
    score: score === null || score === undefined ? null : Number(score),
    total: total === null || total === undefined ? 0 : Number(total)
  });
}

// -----------------------------------------------------------------------
// Identity — server-issued CamelCase names + recovery codes
// -----------------------------------------------------------------------

// Two 4-letter word banks that combine to snappy CamelCase handles.
// ~44*44*100 = ~194k combos; collisions are rare and re-rolled server-side.
const ADJ = [
  'Swft','Slnt','Neon','Shdw','Rogu','Vice','Crms','Sabl','Loos','Cln0',
  'Bold','Cool','Dark','Deep','Dusk','Edgy','Feir','Grim','Halo','Iron',
  'Jinx','Keen','Lush','Mint','Nova','Oynx','Pale','Rare','Slek','Tuff',
  'Ubon','Vine','Wild','Zest','Amps','Blur','Cusp','Drip','Ecko','Flux',
  'Glow','Hush'
];
const NOUN = [
  'Runr','Plug','Foxi','Wire','Rout','Ghos','Pilo','Prwl','Vect','Ciph',
  'Wolf','Bear','Hawk','Cobr','Otr0','Jagr','Puma','Lynx','Cryp','Rift',
  'Line','Curb','Neon','Dime','Mint','Chip','Kilo','Zone','Kush','Vibe',
  'Duke','Kingg','Boss','Chef','Rook','Star','Pyro','Bolt','Coin','Fyre',
  'Jade','Onyx'
];

function newHandle() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  const num = 10 + Math.floor(Math.random() * 90); // 2 digits, 10-99
  return `${a}${n}${num}`;
}

function newRecoveryCode() {
  // 12 hex chars, dashed for readability: e.g. 8XK2-Q7VJ-4ML9
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}`;
}

// POST { seedUserId? } → { userId, username, recoveryCode }
// Provisions a new identity. If seedUserId is provided (existing local
// player upgrading), we reuse their userId so their leaderboard entries
// carry over — the userId is the anti-cheat anchor; only the display
// name changes.
async function handleProvision(body) {
  const seedUserId = typeof body?.seedUserId === 'string' && body.seedUserId.length <= USERID_MAX_LEN
    ? body.seedUserId : null;

  // Reuse userId if it looks like a valid guest id; else mint fresh.
  const userId = seedUserId || `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

  // Already-provisioned? Return existing (idempotent — safe to re-call).
  const existingRaw = await redis(['GET', kUserMeta(userId)]);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw);
      if (existing.username && existing.recoveryCode) {
        return OK({ userId, username: existing.username, recoveryCode: existing.recoveryCode, token: existing.token, existed: true });
      }
    } catch {}
  }

  // Find a free handle (retry up to 8x — 194k combos, collisions are rare)
  let username = '';
  for (let i = 0; i < 8; i++) {
    const candidate = newHandle();
    const taken = await redis(['SISMEMBER', 'usernames:taken', candidate]);
    if (!taken) { username = candidate; break; }
  }
  if (!username) return OOPS('handle pool exhausted');

  const recoveryCode = newRecoveryCode();
  const token = crypto.randomUUID();

  await pipeline([
    ['SET', kUserMeta(userId), JSON.stringify({ username, token, recoveryCode, lastSubmitAt: 0 })],
    ['SADD', 'usernames:taken', username],
    ['SET', `recovery:${recoveryCode}`, userId],
    ['SET', `username:${username}`, userId] // reverse lookup (future-proofing)
  ]);

  // Return the token so the client can save it BEFORE the first submit —
  // otherwise submit hits the "meta exists but token missing" 403 path.
  return OK({ userId, username, recoveryCode, token, existed: false });
}

// POST { recoveryCode } → { userId, username, token }
// Cross-device restore: paste the code, get back your identity.
async function handleRestore(body) {
  const code = typeof body?.recoveryCode === 'string' ? body.recoveryCode.trim().toUpperCase() : '';
  if (!/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(code)) return BAD('recoveryCode format');

  const userId = await redis(['GET', `recovery:${code}`]);
  if (!userId) return BAD('recovery code not found');

  const metaRaw = await redis(['GET', kUserMeta(userId)]);
  if (!metaRaw) return BAD('identity missing');
  const meta = JSON.parse(metaRaw);

  return OK({ userId, username: meta.username, token: meta.token });
}

// -----------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };

  if (!REDIS_URL || !REDIS_TOKEN) {
    return OOPS('Server not configured (missing UPSTASH env vars)');
  }

  try {
    const url = new URL(event.rawUrl || `https://x${event.path}?${event.rawQuery || ''}`);
    const action = url.searchParams.get('action') || (event.httpMethod === 'POST' ? 'submit' : 'top');

    if (event.httpMethod === 'POST' && action === 'submit') {
      const body = event.body ? JSON.parse(event.body) : null;
      return await handleSubmit(body);
    }
    if (event.httpMethod === 'GET' && action === 'top')  return await handleTop(url.searchParams);
    if (event.httpMethod === 'GET' && action === 'rank') return await handleRank(url.searchParams);
    if (event.httpMethod === 'POST' && action === 'provision') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await handleProvision(body);
    }
    if (event.httpMethod === 'POST' && action === 'restore') {
      const body = event.body ? JSON.parse(event.body) : {};
      return await handleRestore(body);
    }

    return BAD('unknown action');
  } catch (e) {
    console.error('[leaderboard]', e);
    return OOPS(e.message || 'unknown error');
  }
};