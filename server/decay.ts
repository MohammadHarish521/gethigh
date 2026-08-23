import { db } from "./db.js";
import { decayedBid } from "./ranking.js";

const READ_THROTTLE_MS = 60_000;
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

let lastSweepAt = 0;

type DecayRow = {
  id: string;
  current_bid: number;
  decay_anchor: number | null;
  decayed_at: string | null;
};

/**
 * Drains every live position by the decay elapsed since its anchor — the price
 * and time of the last payment on that listing. The anchor is never rewritten
 * here, only by a new bid, so sweeping more often can never drain faster.
 */
export function applyDecay(options: { force?: boolean } = {}) {
  const now = Date.now();
  if (!options.force && now - lastSweepAt < READ_THROTTLE_MS) return 0;
  lastSweepAt = now;

  const rows = db
    .prepare(
      `SELECT id, current_bid, decay_anchor, decayed_at
       FROM products WHERE current_bid > 0`,
    )
    .all() as DecayRow[];
  if (rows.length === 0) return 0;

  const update = db.prepare("UPDATE products SET current_bid = ? WHERE id = ?");
  let drained = 0;

  db.transaction(() => {
    for (const row of rows) {
      const since = row.decayed_at ? Date.parse(row.decayed_at) : now;
      if (!Number.isFinite(since)) continue;

      const anchor = row.decay_anchor ?? row.current_bid;
      const next = decayedBid(anchor, now - since);
      if (next < row.current_bid) {
        update.run(next, row.id);
        drained += 1;
      }
    }
  })();

  return drained;
}

export function startDecayScheduler(intervalMs = SWEEP_INTERVAL_MS) {
  applyDecay({ force: true });
  const timer = setInterval(() => {
    try {
      applyDecay({ force: true });
    } catch (error) {
      console.error("Decay sweep failed", error);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}
