// Health of a paid recording, not a claim that the provider billed an account.
export function jevHealth(relay, report, now, started) {
  if (relay.mock) return { label: 'MOCK', fatal: null };
  let fatal = null;
  if (report?.budgetStopped) fatal = `strategist stopped: ${report.budgetStopped}`;
  else if (now - (relay.lastAnswerAt || started) > 45000)
    fatal = relay.lastAnswerAt ? 'no live API answer for 45s' : 'no live API answer within 45s';
  return { fatal, label: fatal ? `STOPPED: ${fatal}` : relay.lastAnswerAt
    ? `API ${relay.ok} replies | ${Math.floor((now-relay.lastAnswerAt)/1000)}s ago | ${relay.inputTokens || 0} input tokens`
    : 'WAITING FOR LIVE API — not verified' };
}
