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
import { hostnameFromUrl } from "./ranking.js";

export const BIKE_PRODUCT_ID = "bike-ns400z";
export const BIKE_TERM_DAYS = 30;
export const BIKE_OUTBID_MULT = 1.2;
/** Starting price for an empty spot, by location class. */
export const BIKE_LOCATION_FLOOR: Record<BikeSize, number> = {
  small: 10,
  medium: 15,
  large: 20,
};
const SIZE_RANK: Record<BikeSize, number> = {
  small: 0,
  medium: 1,
  large: 2,
};
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
    floor: BIKE_LOCATION_FLOOR.small,
    label: "Left shroud",
    points: ring(13.5, 64, 9.5, 11, 10),
  }),
  defineSpot({
    slot: "left-upper",
    face: "left",
    size: "medium",
    floor: BIKE_LOCATION_FLOOR.medium,
    label: "Left upper",
    points: ring(54, 19, 16, 6.2, 12),
  }),
  defineSpot({
    slot: "left-mid",
    face: "left",
    size: "medium",
    floor: BIKE_LOCATION_FLOOR.medium,
    label: "Left mid",
    points: ring(62, 34, 15, 6.8, 12),
  }),
  defineSpot({
    slot: "left-hero",
    face: "left",
    size: "large",
    floor: BIKE_LOCATION_FLOOR.large,
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
    floor: BIKE_LOCATION_FLOOR.small,
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
    floor: BIKE_LOCATION_FLOOR.large,
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
    floor: BIKE_LOCATION_FLOOR.medium,
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
  vinyl_size: string | null;
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

export function parseBikeSize(raw: unknown, fallback: BikeSize = "small"): BikeSize {
  if (raw === "small" || raw === "medium" || raw === "large") return raw;
  return fallback;
}

/** Price for a vinyl size on a given location. Each step up the ladder is 1.2×. */
export function bikeSizeFloor(locationSize: BikeSize, vinylSize: BikeSize) {
  let price = BIKE_LOCATION_FLOOR[locationSize];
  const steps = SIZE_RANK[vinylSize];
  for (let i = 0; i < steps; i++) {
    price = Math.ceil(price * BIKE_OUTBID_MULT);
  }
  return price;
}

export function bikeOutbid(currentBid: number) {
  if (!Number.isFinite(currentBid) || currentBid < 1) return 0;
  const price = Math.floor(currentBid);
  return Math.max(price + 1, Math.ceil(price * BIKE_OUTBID_MULT));
}

export function bikePrice(input: {
  locationSize: BikeSize;
  taken: boolean;
  currentBid: number;
  currentSize: BikeSize;
  nextSize: BikeSize;
}) {
  if (
    input.taken &&
    SIZE_RANK[input.nextSize] < SIZE_RANK[input.currentSize]
  ) {
    return null;
  }
  const floor = bikeSizeFloor(input.locationSize, input.nextSize);
  if (!input.taken) return floor;
  return Math.max(floor, bikeOutbid(input.currentBid));
}

/** Same-size dump price, used by tank hover and board Dump buttons. */
export function bikeNextPrice(
  currentBid: number,
  currentSize: BikeSize,
  locationSize: BikeSize,
) {
  return (
    bikePrice({
      locationSize,
      taken: currentBid > 0,
      currentBid,
      currentSize,
      nextSize: currentSize,
    }) ?? bikeSizeFloor(locationSize, currentSize)
  );
}

export function bikeGoal() {
  return BIKE_SPOTS.reduce(
    (sum, spot) => sum + BIKE_LOCATION_FLOOR[spot.size],
    0,
  );
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
              pending_payment_id, pending_at, click_count, vinyl_size
       FROM bike_spots`,
    )
    .all() as SpotRow[];
  const bySlot = new Map(rows.map((row) => [row.slot, row]));

  const spots = BIKE_SPOTS.map((def) => {
    const row = bySlot.get(def.slot);
    const currentBid = Number(row?.current_bid) || 0;
    const taken = Boolean(row?.claimed_at && row.url);
    const locked = !pendingOpen(row);
    const vinylSize = taken
      ? parseBikeSize(row?.vinyl_size, def.size)
      : "small";
    const sizeOptions = (["small", "medium", "large"] as BikeSize[]).map(
      (size) => {
        const minNextBid = bikePrice({
          locationSize: def.size,
          taken,
          currentBid: taken ? currentBid : 0,
          currentSize: vinylSize,
          nextSize: size,
        });
        const floor = bikeSizeFloor(def.size, size);
        return {
          size,
          floor,
          minNextBid: minNextBid ?? floor,
          allowed: minNextBid != null,
        };
      },
    );
    return {
      slot: def.slot,
      face: def.face,
      locationSize: def.size,
      size: vinylSize,
      floor: BIKE_LOCATION_FLOOR[def.size],
      label: def.label,
      x: def.x,
      y: def.y,
      w: def.w,
      h: def.h,
      points: def.points,
      currentBid: taken ? currentBid : 0,
      minNextBid: bikeNextPrice(
        taken ? currentBid : 0,
        vinylSize,
        def.size,
      ),
      sizeOptions,
      locked,
      occupant: taken
        ? {
            name: row!.name || hostnameFromUrl(row!.url || ""),
            url: row!.url as string,
            logoUrl: row!.logo_url || letterLogo(row!.name || "N"),
            clickCount: Number(row!.click_count) || 0,
            heldUntil: row!.held_until,
            vinylSize,
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
    outbidMult: BIKE_OUTBID_MULT,
    sizes: BIKE_LOCATION_FLOOR,
    spots,
  };
}

export async function createBikeCheckout(input: {
  slot: string;
  url: string;
  userId: string;
  userEmail: string;
  userName: string;
  size?: unknown;
  datafastVisitorId?: string | null;
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
  let amount = BIKE_LOCATION_FLOOR[def.size];
  let vinylSize: BikeSize = "small";

  db.transaction(() => {
    const row = db
      .prepare(
        `SELECT slot, name, url, logo_url, claimed_at, held_until, current_bid,
                pending_payment_id, pending_at, click_count, vinyl_size
         FROM bike_spots WHERE slot = ?`,
      )
      .get(def.slot) as SpotRow | undefined;
    if (!row) throw new HttpError(404, "That tank spot does not exist.");
    if (!pendingOpen(row)) {
      throw new HttpError(409, "Someone’s already checking out on that spot.");
    }

    const taken = Boolean(row.claimed_at && row.url);
    const currentBid = taken ? Number(row.current_bid) || 0 : 0;
    const currentSize = taken
      ? parseBikeSize(row.vinyl_size, def.size)
      : "small";
    vinylSize = parseBikeSize(input.size, taken ? currentSize : "small");
    const price = bikePrice({
      locationSize: def.size,
      taken,
      currentBid,
      currentSize,
      nextSize: vinylSize,
    });
    if (price == null) {
      throw new HttpError(
        400,
        "Vinyl on the tank can get bigger, not smaller. Pick the same size or larger.",
      );
    }
    amount = price;

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
      `INSERT INTO bike_claims (bid_id, slot, url, name, logo_url, vinyl_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(bidId, def.slot, url, name, logoUrl, vinylSize);

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
    datafastVisitorId: input.datafastVisitorId,
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
