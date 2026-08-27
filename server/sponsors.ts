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

export const SPONSOR_PRICE = 50;
export const SPONSOR_PRODUCT_ID = "sponsor-board";
const PENDING_MS = 20 * 60 * 1000;

const SLOTS = [
  "left-1",
  "left-2",
  "left-3",
  "left-4",
  "left-5",
  "right-1",
  "right-2",
  "right-3",
  "right-4",
  "right-5",
] as const;

type SponsorSlot = (typeof SLOTS)[number];

type SeatRow = {
  slot: string;
  name: string | null;
  url: string | null;
  logo_url: string | null;
  claimed_at: string | null;
  pending_payment_id: string | null;
  pending_at: string | null;
  click_count: number | null;
};

function parseSlot(raw: string): SponsorSlot {
  const slot = SLOTS.find((value) => value === raw);
  if (!slot) throw new HttpError(400, "That sponsor seat does not exist.");
  return slot;
}

function sideOf(slot: string): "left" | "right" {
  return slot.startsWith("right") ? "right" : "left";
}

function indexOf(slot: string) {
  return Number(slot.split("-")[1]) || 1;
}

function pendingOpen(seat: SeatRow, now = Date.now()) {
  if (!seat.pending_payment_id || !seat.pending_at) return true;
  const held = new Date(seat.pending_at).getTime();
  return !Number.isFinite(held) || now - held > PENDING_MS;
}

function seatIsFree(seat: SeatRow) {
  return !seat.claimed_at && pendingOpen(seat);
}

function ensureSponsorProduct() {
  const existing = db
    .prepare("SELECT id FROM products WHERE id = ?")
    .get(SPONSOR_PRODUCT_ID) as { id: string } | undefined;
  if (existing) return;

  const createdAt = nowIso();
  db.prepare(
    `INSERT INTO products (
       id, name, description, url, logo_url, creator_name, creator_id,
       current_bid, current_bid_at, decayed_at, decay_anchor, bid_count, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, 0, 0, ?)`,
  ).run(
    SPONSOR_PRODUCT_ID,
    "Sponsor seat",
    "Permanent sidebar seat. $50 one time, no decay.",
    "https://www.gethigh.today",
    letterLogo("S"),
    "gethigh",
    createdAt,
    createdAt,
  );
}

function normalizeSponsorUrl(raw: string) {
  let url = raw.trim();
  if (!url) throw new HttpError(400, "Paste the URL you want on that seat.");
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

export function listSponsorSeats() {
  ensureSponsorProduct();
  const rows = db
    .prepare(
      `SELECT slot, name, url, logo_url, claimed_at, pending_payment_id, pending_at, click_count
       FROM sponsor_seats
       ORDER BY slot`,
    )
    .all() as SeatRow[];

  const bySlot = new Map(rows.map((row) => [row.slot, row]));

  return {
    price: SPONSOR_PRICE,
    seats: SLOTS.map((slot) => {
      const row = bySlot.get(slot);
      const taken = Boolean(row?.claimed_at && row.url);
      return {
        slot,
        side: sideOf(slot),
        index: indexOf(slot),
            occupant: taken
          ? {
              name: row!.name || hostnameFromUrl(row!.url || ""),
              url: row!.url as string,
              logoUrl: row!.logo_url || letterLogo(row!.name || "S"),
              clickCount: Number(row!.click_count) || 0,
            }
          : null,
      };
    }),
  };
}

export async function createSponsorCheckout(input: {
  slot: string;
  url: string;
  userId: string;
  userEmail: string;
  userName: string;
  datafastVisitorId?: string | null;
}) {
  ensureSponsorProduct();
  const slot = parseSlot(input.slot);
  const url = normalizeSponsorUrl(input.url);
  const meta = await fetchListingMeta(url);
  const host = hostnameFromUrl(url);
  const name = (meta.title || host).slice(0, 80) || "Sponsor";
  const logoUrl = letterLogo(name);
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(SPONSOR_PRODUCT_ID) as ProductRow | undefined;
  if (!product) throw new HttpError(500, "Sponsor board is not ready.");

  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isDodoConfigured() ? "dodo" : "mock";

  db.transaction(() => {
    const seat = db
      .prepare(
        `SELECT slot, name, url, logo_url, claimed_at, pending_payment_id, pending_at
         FROM sponsor_seats WHERE slot = ?`,
      )
      .get(slot) as SeatRow | undefined;
    if (!seat) throw new HttpError(404, "That sponsor seat does not exist.");
    if (!seatIsFree(seat)) {
      throw new HttpError(409, "That seat is taken. Grab another.");
    }

    insertCheckoutRows({
      bidId,
      paymentId,
      productId: product.id,
      userId: input.userId,
      amount: SPONSOR_PRICE,
      kind: "sponsor",
      createdAt,
      provider,
    });

    db.prepare(
      `INSERT INTO sponsor_claims (bid_id, slot, url, name, logo_url)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(bidId, slot, url, name, logoUrl);

    db.prepare(
      `UPDATE sponsor_seats
       SET pending_payment_id = ?, pending_at = ?
       WHERE slot = ?`,
    ).run(paymentId, createdAt, slot);
  })();

  return finalizeCheckout({
    paymentId,
    bidId,
    product,
    amount: SPONSOR_PRICE,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    provider,
    kind: "sponsor",
    datafastVisitorId: input.datafastVisitorId,
  });
}

export function sponsorDestination(slotRaw: string) {
  const slot = parseSlot(slotRaw);
  const seat = db
    .prepare("SELECT url, claimed_at FROM sponsor_seats WHERE slot = ?")
    .get(slot) as { url: string | null; claimed_at: string | null } | undefined;
  if (!seat?.claimed_at || !seat.url) {
    throw new HttpError(404, "That seat is empty.");
  }
  let dest = seat.url.trim();
  if (!/^https?:\/\//i.test(dest)) dest = `https://${dest}`;
  const parsed = new URL(dest);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Invalid sponsor URL.");
  }
  db.prepare(
    "UPDATE sponsor_seats SET click_count = COALESCE(click_count, 0) + 1 WHERE slot = ?",
  ).run(slot);
  return parsed.toString();
}
