// netlify/functions/telegram.mjs
//
// Plug Run's Telegram endpoint.
//
//   GET ?action=ping   Asks Telegram which bot TELEGRAM_BOT_TOKEN belongs to and
//                      answers { ok, bot: '@name', mainMiniApp }. A way to check
//                      the setup from a browser. The token itself never leaves
//                      this function: not in a response, not in a log line.
//
// Sign-in (initData) and challenges are added here as they are built.

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export function createTelegramHandler({
  token = () => process.env.TELEGRAM_BOT_TOKEN,
  fetchImpl = (...args) => globalThis.fetch(...args)
} = {}) {
  async function ping() {
    const botToken = token();
    if (!botToken) return json(500, { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set for this site' });
    let data = null;
    try {
      const res = await fetchImpl('https://api.telegram.org/bot' + botToken + '/getMe');
      data = await res.json();
    } catch {
      // The request URL contains the token, so the error is never echoed.
      return json(502, { ok: false, error: 'could not reach Telegram' });
    }
    if (!data?.ok || typeof data.result?.username !== 'string') {
      return json(502, { ok: false, error: 'Telegram did not accept the token' });
    }
    return json(200, { ok: true, bot: '@' + data.result.username, mainMiniApp: data.result.has_main_web_app === true });
  }

  return async (req) => {
    let action = null;
    try { action = new URL(req.url).searchParams.get('action'); } catch {}
    if (req.method === 'GET' && action === 'ping') return ping();
    return json(404, { ok: false, error: 'unknown action' });
  };
}

export default createTelegramHandler();
