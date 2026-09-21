import { jevState, JEV_DIRECTIONS } from '../logic/jevState.js';

// Ask Jev what the runner should do, without ever stalling a frame.
//
// WHY THIS IS ASYNCHRONOUS AND NOT A FUNCTION CALL
// Jev answers in 70-500ms. The bot re-decides every 180ms and the game runs at
// 60fps, so awaiting an answer inside the update loop would freeze the picture
// for up to half a second every tick. Instead a request is fired off, the
// runner keeps moving on the previous answer, and the new one is adopted when
// it lands. Steering therefore acts on a decision up to ~500ms old -- at 7
// cells/sec that is a few cells of drift, which is why Jev is asked for
// INTENT ("which way", "spend a power") and the existing pathfinder keeps
// doing the frame-by-frame steering.
//
// It follows that this cannot be the only driver: a spike measures whether
// Jev's intent beats the pathfinder's own, so the pathfinder stays underneath
// as the fallback whenever an answer is late, missing or unusable.

export const DEFAULTS = {
  // Don't fire faster than the model can answer; overlapping requests would
  // just bill twice for a decision that arrives in the same window.
  minIntervalMs: 200,
  // Past this, stop waiting and let the fallback steer. A wedged request must
  // never strand the runner.
  timeoutMs: 900,
  // An answer older than this is not worth steering on any more.
  staleMs: 1200,

  // SAFETY CEILINGS. Past either one the driver stops making paid requests
  // for the rest of the session and the pathfinder underneath keeps playing,
  // so a runaway loop costs a worse recording rather than a bill.
  //
  // Two of them, because neither is sufficient alone. The token ceiling is
  // the one that tracks actual spend, but it can only count what came back:
  // if every request fails, nothing is ever billed to count and it never
  // trips. The request ceiling cannot be fooled that way, so it is the
  // backstop. Callers that know their budget should set both explicitly;
  // these defaults exist so a forgotten session still has a floor under it.
  maxRequests: 5000,
  maxInputTokens: 4_000_000      // ~$0.17 at $0.042/Mtok
};

export default class JevDriver {
  /**
   * @param decide  async ({state, questions}) => ({ move, power?, confidence? })
   * @param opts    see DEFAULTS; `now` is injectable for tests
   */
  constructor(decide, opts = {}) {
    this.decide = decide;
    this.cfg = { ...DEFAULTS, ...opts };
    this.now = opts.now || (() => performance.now());
    this.last = null;          // { move, power, at }
    this.inFlight = null;      // { startedAt }
    this.model = null;         // the version the API actually answered with
    this.stats = { requests: 0, answers: 0, errors: 0, timeouts: 0, reused: 0,
      tokensApprox: 0, tokensBilled: 0 };
    // What the caller did with the answers. These live here and not on
    // BotDriver because a BotDriver is rebuilt on every scene restart: kept
    // there, steerShare would describe the current house rather than the run,
    // which for a seven-house race is the wrong number by a factor of seven.
    this.drive = { steps: 0, illegal: 0, lowConfidence: 0, fallbacks: 0, powers: 0 };
    this.budgetStopped = null; // 'requests' | 'tokens' once a ceiling trips
  }

  /** Input tokens spent so far — the API's count once it has given one. */
  get spentTokens() {
    return this.stats.tokensBilled || this.stats.tokensApprox;
  }

  /**
   * Has a ceiling been reached? Latched: once stopped, stopped for good, so
   * a later answer carrying usage cannot quietly reopen the tap.
   */
  overBudget() {
    if (this.budgetStopped) return true;
    let why = null;
    if (this.stats.requests >= this.cfg.maxRequests) why = 'requests';
    else if (this.spentTokens >= this.cfg.maxInputTokens) why = 'tokens';
    if (!why) return false;
    this.budgetStopped = why;
    console.warn(`[JEV] ${why} ceiling reached — no further paid requests this session;` +
      ' the pathfinder continues.');
    return true;
  }

  /**
   * Called every tick. Returns the intent to steer by, or null when there is
   * nothing usable and the caller should fall back.
   *
   * Never awaits. Never throws.
   */
  tick(scene) {
    const now = this.now();

    if (this.inFlight && now - this.inFlight.startedAt > this.cfg.timeoutMs) {
      this.inFlight = null;
      this.stats.timeouts++;
    }

    if (!this.inFlight && !this.overBudget() &&
        now - (this.last?.at ?? -Infinity) >= this.cfg.minIntervalMs) {
      const payload = jevState(scene);
      if (payload) this._ask(payload, now);
    }

    if (!this.last || now - this.last.at > this.cfg.staleMs) return null;
    if (this.last.consumedAt === this.last.at) this.stats.reused++;
    this.last.consumedAt = this.last.at;
    return this.last;
  }

  _ask(payload, startedAt) {
    this.inFlight = { startedAt };
    this.stats.requests++;
    // A character-count guess, only used until the API reports real usage.
    this.stats.tokensApprox += Math.ceil(JSON.stringify(payload).length / 4);

    let settled = false;
    const finish = (fn) => (value) => {
      if (settled) return;
      settled = true;
      // A late answer to a request already timed out is discarded: adopting it
      // would steer on something older than the staleness bound allows.
      if (this.inFlight?.startedAt !== startedAt) return;
      this.inFlight = null;
      fn(value);
    };

    // Called synchronously so the request leaves on this tick rather than a
    // microtask later; a decide() that throws outright is caught here.
    let promise;
    try { promise = this.decide(payload); }
    catch { this.inFlight = null; this.stats.errors++; return; }

    Promise.resolve(promise)
      .then(finish((answer) => {
        const move = answer && answer.move;
        if (!JEV_DIRECTIONS[move]) { this.stats.errors++; return; }
        this.stats.answers++;
        // Which version actually answered. An alias can move under you, and a
        // recording that does not say what produced it cannot be compared
        // with one made a month later.
        if (typeof answer.model === 'string') this.model = answer.model;
        // Jev returns usage.input_tokens; prefer it over the guess above.
        if (Number.isFinite(answer.usage?.input_tokens)) {
          this.stats.tokensBilled += answer.usage.input_tokens;
        }
        this.last = {
          move,
          dir: JEV_DIRECTIONS[move],
          power: answer.power && answer.power !== 'none' ? answer.power : null,
          confidence: Number.isFinite(answer.confidence) ? answer.confidence : null,
          at: this.now(),
          latencyMs: this.now() - startedAt
        };
      }))
      .catch(finish(() => { this.stats.errors++; }));
  }

  /**
   * Forget the current round.
   *
   * A restart reuses the same Scene instance, so an answer about the last
   * house would otherwise still be inside the staleness window when the next
   * one starts. Stats survive on purpose: they are the spike's measurement.
   */
  reset() {
    this.last = null;
    // Dropping the handle is what discards the in-flight answer: _ask checks
    // inFlight.startedAt before adopting, and it will no longer match.
    this.inFlight = null;
  }

  /** Cost and health, for deciding whether the spike was worth it. */
  report() {
    const { requests, answers, errors, timeouts, tokensBilled, tokensApprox } = this.stats;
    // Real token counts once any answer has carried usage; the estimate is a
    // stand-in and is marked as such so a spike never quotes a guess as spend.
    const tokens = tokensBilled || tokensApprox;
    const d = this.drive;
    const decisions = d.steps + d.illegal + d.lowConfidence + d.fallbacks;
    return {
      ...this.stats,
      ...d,
      model: this.model,
      decisions,
      tokenSource: tokensBilled ? 'api' : 'estimated',
      answerRate: requests ? +(answers / requests).toFixed(3) : 0,
      failureRate: requests ? +((errors + timeouts) / requests).toFixed(3) : 0,
      // Answers arriving and then being rejected is a different diagnosis
      // from answers not arriving, and answerRate alone cannot tell them
      // apart.
      steerShare: decisions ? +(d.steps / decisions).toFixed(3) : 0,
      requestLimit: this.cfg.maxRequests,
      tokenLimit: this.cfg.maxInputTokens,
      budgetStopped: this.budgetStopped,
      costUsd: +(tokens / 1e6 * 0.042).toFixed(4)
    };
  }
}
