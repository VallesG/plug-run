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
  staleMs: 1200
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
    this.stats = { requests: 0, answers: 0, errors: 0, timeouts: 0, reused: 0,
      tokensApprox: 0, tokensBilled: 0 };
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

    if (!this.inFlight && now - (this.last?.at ?? -Infinity) >= this.cfg.minIntervalMs) {
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
    return {
      ...this.stats,
      tokenSource: tokensBilled ? 'api' : 'estimated',
      answerRate: requests ? +(answers / requests).toFixed(3) : 0,
      failureRate: requests ? +((errors + timeouts) / requests).toFixed(3) : 0,
      costUsd: +(tokens / 1e6 * 0.042).toFixed(4)
    };
  }
}
