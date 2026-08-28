/**
 * Mirrors server/ranking.ts for display and input stepping only. The server
 * recomputes every charge and is the authority on price.
 */
export const MIN_BID = 5;
export const MIN_RAISE = 5;
export const MIN_RAISE_PCT = 0.1;
export const DAILY_MIN_BID = 2;
export const DAILY_MIN_RAISE = 1;
export const DUMP_PREMIUM = 1.25;
export const DECAY_PER_DAY = 0.05;
export const SPONSOR_PRICE = 50;

export type BoardKind = "alltime" | "today";

export function minBidFor(board: BoardKind = "alltime") {
  return board === "today" ? DAILY_MIN_BID : MIN_BID;
}

export function minRaiseFor(board: BoardKind = "alltime") {
  return board === "today" ? DAILY_MIN_RAISE : MIN_RAISE;
}

export function boardHomePath(board?: BoardKind | string | null) {
  return board === "today" ? "/?board=today" : "/";
}

export function minimumNextBid(
  currentBid: number,
  board: BoardKind = "alltime",
) {
  const floorBid = minBidFor(board);
  if (!Number.isFinite(currentBid) || currentBid < floorBid) return floorBid;
  const floor = Math.floor(currentBid);
  if (board === "today") return floor + DAILY_MIN_RAISE;
  return floor + Math.max(MIN_RAISE, Math.ceil(floor * MIN_RAISE_PCT));
}
