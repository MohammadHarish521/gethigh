/**
 * Economics of the board. Server is the only authority on price — the client
 * mirrors these numbers for display but every charge is recomputed here.
 */

/** Floor price to enter the board. Below ~$5 the payment processor's fixed
 *  fee eats most of the transaction, so small bids are not worth accepting. */
export const MIN_BID = 5;

/** A raise must clear the current price by at least MIN_RAISE dollars or
 *  MIN_RAISE_PCT of it, whichever is larger. */
export const MIN_RAISE = 5;
export const MIN_RAISE_PCT = 0.1;

/** Daily board: cheaper, resets at midnight, $1 to climb. */
export const DAILY_MIN_BID = 2;
export const DAILY_MIN_RAISE = 1;

export type BoardKind = "alltime" | "today";

export function parseBoard(raw: unknown): BoardKind {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "today" || value === "daily") return "today";
  return "alltime";
}

export function boardDayStamp(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.DATAFAST_TIMEZONE?.trim() || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function minBidFor(board: BoardKind = "alltime") {
  return board === "today" ? DAILY_MIN_BID : MIN_BID;
}

export function minRaiseFor(board: BoardKind = "alltime") {
  return board === "today" ? DAILY_MIN_RAISE : MIN_RAISE;
}

export function productBoard(row: { board?: string | null } | null | undefined): BoardKind {
  return row?.board === "today" ? "today" : "alltime";
}

/** Dumping costs a premium over the victim's price, and the dumper lands on
 *  that premium price. This is what makes the board ratchet upward instead of
 *  flipping back and forth at a fixed number forever. */
export const DUMP_PREMIUM = 1.25;

/** Positions bleed value every day, so holding a spot is a recurring cost
 *  rather than a one-time purchase. Decay is proportional, so it never
 *  reshuffles the leaderboard on its own — it just melts everyone's shield. */
export const DECAY_PER_DAY = 0.05;

const MS_PER_DAY = 86_400_000;

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

export function parseBidAmount(
  value: unknown,
  board: BoardKind = "alltime",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < minBidFor(board)
  ) {
    return null;
  }
  return amount;
}

/**
 * All-pay: the bidder is charged the full amount they typed, not the gap to
 * the current leader. Charging only the difference makes the collected total
 * telescope down to the final headline price no matter how many people bid.
 */
export function bidCharge(
  currentBid: number,
  target: number,
  board: BoardKind = "alltime",
) {
  if (!Number.isInteger(target) || target < minimumNextBid(currentBid, board)) {
    return null;
  }
  return target;
}

export function dumpPrice(currentBid: number, board: BoardKind = "alltime") {
  if (!Number.isFinite(currentBid) || currentBid < 1) return null;
  return Math.max(
    minBidFor(board),
    Math.ceil(Math.floor(currentBid) * DUMP_PREMIUM),
  );
}

/**
 * Price after `elapsedMs` of decay, measured from the anchor price the holder
 * last paid. Always compute from that anchor rather than from the previously
 * stored price, otherwise repeated sweeps compound their own rounding error.
 * Rounding (not flooring) keeps a listing at its price until decay genuinely
 * crosses the next dollar down.
 */
export function decayedBid(anchorBid: number, elapsedMs: number) {
  if (!Number.isFinite(anchorBid) || anchorBid <= 0) return 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return Math.round(anchorBid);
  const days = elapsedMs / MS_PER_DAY;
  const decayed = anchorBid * Math.pow(1 - DECAY_PER_DAY, days);
  return Math.max(0, Math.round(decayed));
}

/** Dollars a holder loses per day at their current price. */
export function decayPerDay(currentBid: number) {
  if (!Number.isFinite(currentBid) || currentBid <= 0) return 0;
  return Math.max(0, Math.round(currentBid) - decayedBid(currentBid, MS_PER_DAY));
}

export function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function listingKey(url: string) {
  const withProtocol = /^https?:\/\//i.test(url.trim())
    ? url.trim()
    : `https://${url.trim()}`;
  const parsed = new URL(withProtocol);
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const path = parsed.pathname.replace(/\/$/, "");
  return `${host}${path}${parsed.search}`.toLowerCase();
}
