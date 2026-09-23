// netlify/functions/rivals-run.mjs
//
// A player shares a finished Block Rivals race. POST { userId, token,
// consent: true, record, bundle } to /.netlify/functions/rivals-run.
//
// Every rule lives in src/logic/rivalPlayerRuns.js (shared with the bank tool
// and the tests); this file only wires in:
//   - identity: the leaderboard's own player record in Upstash (the same
//     userId + token check leaderboard.js makes), whose display name is used,
//     never one the client sends;
//   - a daily count per player, also in Upstash;
//   - storage: a Netlify Blobs store holding runs as PENDING. Nothing here
//     publishes a run; tools/rivals-assemble-players.mjs banks them after
//     review, into client/public/rivals/players-v1/.
// The stored run holds the display name and an opaque key hashed from the
// account id, never the id or the token.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { submitPlayerRun } from '../../src/logic/rivalPlayerRuns.js';

export const STORE_NAME = 'rivals-player-runs';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  return (await res.json()).result;
}

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });
  if (!REDIS_URL || !REDIS_TOKEN) return json(500, { ok: false, error: 'not configured' });
  try {
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    const pepper = process.env.RIVALS_PLAYER_KEY_SECRET || REDIS_TOKEN;
    const day = new Date().toISOString().slice(0, 10);
    const result = await submitPlayerRun(await req.text(), {
      userMeta: async (userId) => {
        const raw = await redis(['GET', `user:${userId}`]);
        return raw ? JSON.parse(raw) : null;
      },
      countToday: async (userId) => {
        const key = `rivals:runs:day:${userId}:${day}`;
        const n = Number(await redis(['INCR', key]));
        if (n === 1) await redis(['EXPIRE', key, '172800']);
        return n;
      },
      playerKey: async (userId) => 'player-' + createHash('sha256').update('plug-run/rivals/player/' + pepper + '/' + userId).digest('hex').slice(0, 16),
      store: {
        get: (key) => store.get(key),
        set: (key, value) => store.set(key, value),
        list: async (prefix) => (await store.list({ prefix })).blobs.map((b) => b.key),
        delete: (key) => store.delete(key)
      },
      now: () => Date.now()
    });
    // The reason a run was refused, for the site's function log. No ids or tokens.
    if (result.status !== 200) console.warn('[rivals-run] refused', result.status, result.body.error);
    return json(result.status, result.body);
  } catch (e) {
    console.error('[rivals-run]', e?.message || e);
    return json(500, { ok: false, error: 'server error' });
  }
};
