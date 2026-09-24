// Settles the Daily Race prize every night at 00:30 UTC, once late finishes
// have landed: picks yesterday's winner and messages them and the owner
// (netlify/lib/prizeDesk.mjs). A player opening the game in Telegram also
// settles a closed day, so a missed run of this schedule only delays it.
import { createTelegramHandler } from './telegram.mjs';

const telegram = createTelegramHandler();

export default async () => {
  const settled = await telegram.settle();
  console.log('[daily-prize]', JSON.stringify(settled.filter(Boolean).map((w) => ({ day: w.day, status: w.status }))));
  return new Response('ok');
};

export const config = { schedule: '30 0 * * *' };
