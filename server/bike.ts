import crypto from "node:crypto";
import { db, nowIso, type ProductRow } from "./db.js";
import { HttpError } from "./http.js";
import {
  finalizeCheckout,
  insertCheckoutRows,
  letterLogo,
} from "./bidding.js";
import { isDodoConfigured } from "./dodo.js";
import { fetchListingMeta } from "./listingMeta.js";
import { hostnameFromUrl, minimumNextBid } from "./ranking.js";

export const BIKE_PRODUCT_ID = "bike-ns400z";
export const BIKE_TERM_DAYS = 30;
const PENDING_MS = 20 * 60 * 1000;

export type BikeFace = "left" | "right" | "top";
export type BikeSize = "small" | "medium" | "large";
export type BikePoint = [number, number];

type SpotDef = {
  slot: string;
  face: BikeFace;
  size: BikeSize;
  floor: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  points: BikePoint[];
};

function boxOf(points: BikePoint[]) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const x = round1(Math.min(...xs));
  const y = round1(Math.min(...ys));
  return {
    x,
    y,
    w: round1(Math.max(...xs) - x),
    h: round1(Math.max(...ys) - y),
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function defineSpot(
  input: Omit<SpotDef, "x" | "y" | "w" | "h">,
): SpotDef {
  return { ...input, ...boxOf(input.points) };
}

function ring(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count = 12,
): BikePoint[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    return [round1(cx + rx * Math.cos(angle)), round1(cy + ry * Math.sin(angle))];
  });
}

const LEFT_SPOTS: SpotDef[] = [
  defineSpot({
    slot: "left-shroud",
    face: "left",
    size: "small",
    floor: 80,
    label: "Left shroud",
    points: ring(13.5, 64, 9.5, 11, 10),
  }),
  defineSpot({
    slot: "left-upper",
    face: "left",
    size: "medium",
    floor: 150,
    label: "Left upper",
    points: ring(54, 19, 16, 6.2, 12),
  }),
  defineSpot({
    slot: "left-mid",
    face: "left",
    size: "medium",
    floor: 150,
    label: "Left mid",
    points: ring(62, 34, 15, 6.8, 12),
  }),
  defineSpot({
    slot: "left-hero",
    face: "left",
    size: "large",
    floor: 250,
    label: "Left hero",
    points: [
      [20, 24],
      [46, 22],
      [48, 30],
      [42, 46],
      [24, 51],
      [9, 48],
      [7, 36],
      [12, 28],
    ],
  }),
  defineSpot({
    slot: "left-knee",
    face: "left",
    size: "small",
    floor: 80,
    label: "Left knee",
    points: [
      [64, 66],
      [80, 64],
      [88, 70],
      [87, 84],
      [74, 87],
      [62, 78],
    ],
  }),
];

const RIGHT_SPOTS: SpotDef[] = LEFT_SPOTS.map((spot) =>
  defineSpot({
    slot: spot.slot.replace("left-", "right-"),
    face: "right",
    size: spot.size,
    floor: spot.floor,
    label: spot.label.replace("Left", "Right"),
    points: spot.points.map(([x, y]) => [round1(100 - x), y]),
  }),
);

const TOP_SPOTS: SpotDef[] = [
  defineSpot({
    slot: "top-hero",
    face: "top",
    size: "large",
    floor: 300,
    label: "Top, toward the bars",
    points: [
      [34, 9],
      [50, 7],
      [66, 9],
      [72, 16],
      [66, 24],
      [50, 26],
      [34, 24],
      [28, 16],
    ],
  }),
  defineSpot({
    slot: "top-aft",
    face: "top",
    size: "medium",
    floor: 120,
    label: "Top, toward the seat",
    points: ring(50, 74, 20, 20.5, 14),
  }),
];

export const BIKE_SPOTS: SpotDef[] = [...LEFT_SPOTS, ...RIGHT_SPOTS, ...TOP_SPOTS];

const SLOT_BY_ID = new Map(BIKE_SPOTS.map((spot) => [spot.slot, spot]));

type SpotRow = {
  slot: string;
  name: string | null;
  url: string | null;
  logo_url: string | null;
  claimed_at: string | null;
  held_until: string | null;
  current_bid: number | null;
  pending_payment_id: string | null;
  pending_at: string | null;
  click_count: number | null;
};

function parseSlot(raw: string) {
  const spot = SLOT_BY_ID.get(raw);
  if (!spot) throw new HttpError(400, "That tank spot does not exist.");
  return spot;
}

function pendingOpen(row: SpotRow | undefined, now = Date.now()) {
  if (!row?.pending_payment_id || !row.pending_at) return true;
  const held = new Date(row.pending_at).getTime();
  return !Number.isFinite(held) || now - held > PENDING_MS;
}

export function bikeNextPrice(floor: number, currentBid: number) {
  if (!Number.isFinite(currentBid) || currentBid < floor) return floor;
  return Math.max(floor, minimumNextBid(currentBid));
}

export function bikeGoal() {
  return BIKE_SPOTS.reduce((sum, spot) => sum + spot.floor, 0);
}

function ensureBikeProduct() {
  const existing = db
    .prepare("SELECT id FROM products WHERE id = ?")
    .get(BIKE_PRODUCT_ID) as { id: string } | undefined;
  if (existing) return;

  const createdAt = nowIso();
  db.prepare(
    `INSERT INTO products (
       id, name, description, url, logo_url, creator_name, creator_id,
       current_bid, current_bid_at, decayed_at, decay_anchor, bid_count, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, 0, 0, ?)`,
  ).run(
    BIKE_PRODUCT_ID,
    "NS400Z tank",
    "Physical vinyl on a Pulsar NS400Z. 30 days, outbid anytime.",
    "https://www.gethigh.today/bike",
    letterLogo("N"),
    "gethigh",
    createdAt,
    createdAt,
  );
}

function normalizeBikeUrl(raw: string) {
  let url = raw.trim();
  if (!url) throw new HttpError(400, "Paste the URL you want on that spot.");
  if (url.startsWith("@")) {
    const handle = url.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    if (!handle) throw new HttpError(400, "Enter a valid @handle.");
    url = `https://x.com/${handle}`;
  }
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    new URL(url);
  } catch {
    throw new HttpError(400, "Enter a valid website URL.");
  }
  return url;
}

export function listBikeSpots() {
  ensureBikeProduct();
  const rows = db
    .prepare(
      `SELECT slot, name, url, logo_url, claimed_at, held_until, current_bid,
              pending_payment_id, pending_at, click_count
       FROM bike_spots`,
    )
    .all() as SpotRow[];
  const bySlot = new Map(rows.map((row) => [row.slot, row]));

  const spots = BIKE_SPOTS.map((def) => {
    const row = bySlot.get(def.slot);
    const currentBid = Number(row?.current_bid) || 0;
    const taken = Boolean(row?.claimed_at && row.url);
    const locked = !pendingOpen(row);
    return {
      slot: def.slot,
      face: def.face,
      size: def.size,
      floor: def.floor,
      label: def.label,
      x: def.x,
      y: def.y,
      w: def.w,
      h: def.h,
      points: def.points,
      currentBid: taken ? currentBid : 0,
      minNextBid: bikeNextPrice(def.floor, taken ? currentBid : 0),
      locked,
      occupant: taken
        ? {
            name: row!.name || hostnameFromUrl(row!.url || ""),
            url: row!.url as string,
            logoUrl: row!.logo_url || letterLogo(row!.name || "N"),
            clickCount: Number(row!.click_count) || 0,
            heldUntil: row!.held_until,
          }
        : null,
    };
  });

  const taken = spots.filter((spot) => spot.occupant).length;
  const raised = spots.reduce(
    (sum, spot) => sum + (spot.occupant ? spot.currentBid : 0),
    0,
  );

  return {
    bike: "NS400Z",
    termDays: BIKE_TERM_DAYS,
    raised,
    goal: bikeGoal(),
    taken,
    total: BIKE_SPOTS.length,
    spots,
  };
}

export async function createBikeCheckout(input: {
  slot: string;
  url: string;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  ensureBikeProduct();
  const def = parseSlot(input.slot);
  const url = normalizeBikeUrl(input.url);
  const meta = await fetchListingMeta(url);
  const host = hostnameFromUrl(url);
  const name = (meta.title || host).slice(0, 80) || "Sponsor";
  const logoUrl = letterLogo(name);
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(BIKE_PRODUCT_ID) as ProductRow | undefined;
  if (!product) throw new HttpError(500, "Tank auction is not ready.");

  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isDodoConfigured() ? "dodo" : "mock";
  let amount = def.floor;

  db.transaction(() => {
    const row = db
      .prepare(
        `SELECT slot, name, url, logo_url, claimed_at, held_until, current_bid,
                pending_payment_id, pending_at, click_count
         FROM bike_spots WHERE slot = ?`,
      )
      .get(def.slot) as SpotRow | undefined;
    if (!row) throw new HttpError(404, "That tank spot does not exist.");
    if (!pendingOpen(row)) {
      throw new HttpError(409, "Someone’s already checking out on that spot.");
    }

    const taken = Boolean(row.claimed_at && row.url);
    const currentBid = taken ? Number(row.current_bid) || 0 : 0;
    amount = bikeNextPrice(def.floor, currentBid);

    insertCheckoutRows({
      bidId,
      paymentId,
      productId: product.id,
      userId: input.userId,
      amount,
      kind: "bike",
      createdAt,
      provider,
    });

    db.prepare(
      `INSERT INTO bike_claims (bid_id, slot, url, name, logo_url)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(bidId, def.slot, url, name, logoUrl);

    db.prepare(
      `UPDATE bike_spots
       SET pending_payment_id = ?, pending_at = ?
       WHERE slot = ?`,
    ).run(paymentId, createdAt, def.slot);
  })();

  return finalizeCheckout({
    paymentId,
    bidId,
    product,
    amount,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    provider,
    kind: "bike",
  });
}

export function bikeClaimForBid(bidId: string) {
  return db
    .prepare("SELECT slot FROM bike_claims WHERE bid_id = ?")
    .get(bidId) as { slot: string } | undefined;
}

export function bikeDestination(slotRaw: string) {
  const def = parseSlot(slotRaw);
  const seat = db
    .prepare("SELECT url, claimed_at FROM bike_spots WHERE slot = ?")
    .get(def.slot) as { url: string | null; claimed_at: string | null } | undefined;
  if (!seat?.claimed_at || !seat.url) {
    throw new HttpError(404, "That tank spot is empty.");
  }
  let dest = seat.url.trim();
  if (!/^https?:\/\//i.test(dest)) dest = `https://${dest}`;
  const parsed = new URL(dest);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Invalid sponsor URL.");
  }
  db.prepare(
    "UPDATE bike_spots SET click_count = COALESCE(click_count, 0) + 1 WHERE slot = ?",
  ).run(def.slot);
  return parsed.toString();
}
