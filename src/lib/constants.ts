/**
 * Mirrors server/ranking.ts for display and input stepping only. The server
 * recomputes every charge and is the authority on price.
 */
export const MIN_BID = 5;
export const MIN_RAISE = 5;
export const MIN_RAISE_PCT = 0.1;
export const DUMP_PREMIUM = 1.25;
export const DECAY_PER_DAY = 0.05;

export function minimumNextBid(currentBid: number) {
  if (!Number.isFinite(currentBid) || currentBid < MIN_BID) return MIN_BID;
  const floor = Math.floor(currentBid);
  return floor + Math.max(MIN_RAISE, Math.ceil(floor * MIN_RAISE_PCT));
}
