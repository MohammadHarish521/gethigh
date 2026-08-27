import crypto from "node:crypto";
import {
  db,
  nowIso,
  type BidKind,
  type BidRow,
  type PaymentRow,
  type ProductRow,
} from "./db.js";
import { HttpError } from "./http.js";
import { createDodoCheckout, getAppUrl, isDodoConfigured } from "./dodo.js";
import {
  MIN_BID,
  bidCharge,
  dumpPrice,
  listingKey,
  minimumNextBid,
  parseBidAmount,
} from "./ranking.js";
import {
  fetchListingMeta,
  isPlaceholderDescription,
} from "./listingMeta.js";

export type ConfirmResult = {
  alreadyProcessed: boolean;
  becameNumberOne: boolean;
  product: ProductRow;
  claimProduct?: ProductRow | null;
  bid: BidRow;
  payment: PaymentRow;
};

function getProduct(id: string) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id) as
    | ProductRow
    | undefined;
}

function getBid(id: string) {
  return db.prepare("SELECT * FROM bids WHERE id = ?").get(id) as
    | BidRow
    | undefined;
}

function getPayment(id: string) {
  return db.prepare("SELECT * FROM payments WHERE id = ?").get(id) as
    | PaymentRow
    | undefined;
}

function bidKind(bid: BidRow): BidKind {
  if (bid.kind === "dump") return "dump";
  if (bid.kind === "sponsor") return "sponsor";
  if (bid.kind === "bike") return "bike";
  return "bid";
}

/**
 * Highest live price anywhere on the board. Every paid bid has to clear this,
 * otherwise a brand-new listing could enter at the $5 floor forever and sit
 * tied with the listings already at that price.
 */
function boardTopBid() {
  const row = db
    .prepare("SELECT MAX(current_bid) AS top FROM products WHERE bid_count > 0")
    .get() as { top: number | null } | undefined;
  return row?.top ?? 0;
}

/** Cheapest bid the board will accept right now, from any entry point. */
export function boardEntryBid() {
  return minimumNextBid(boardTopBid());
}

export function getProductRank(productId: string) {
  const ranked = db
    .prepare(
      `SELECT id FROM products
       WHERE bid_count > 0
       ORDER BY current_bid DESC, current_bid_at DESC, created_at DESC`,
    )
    .all() as Array<{ id: string }>;

  const index = ranked.findIndex((row) => row.id === productId);
  return index === -1 ? null : index + 1;
}

function findProductByUrl(url: string) {
  let key: string;
  try {
    key = listingKey(url);
  } catch {
    return undefined;
  }

  const rows = db.prepare("SELECT * FROM products").all() as ProductRow[];
  return rows.find((row) => {
    try {
      return listingKey(row.url) === key;
    } catch {
      return false;
    }
  });
}

function findLiveProductByUrl(url: string) {
  const row = findProductByUrl(url);
  return row && row.bid_count > 0 ? row : undefined;
}

function normalizeClaimUrl(raw: string) {
  let url = raw.trim();
  if (!url) {
    throw new HttpError(400, "Paste the URL you want in that spot.");
  }
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

export function letterLogo(name: string) {
  const letter = name.trim().charAt(0).toUpperCase() || "G";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="48" fill="#508200"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, system-ui, sans-serif" font-size="38" font-weight="600" fill="white">${letter}</text>
    </svg>`,
  )}`;
}

export function insertCheckoutRows(input: {
  bidId: string;
  paymentId: string;
  productId: string;
  userId: string;
  amount: number;
  paymentAmount?: number;
  kind: BidKind;
  createdAt: string;
  provider: "dodo" | "mock";
  dumpClaimProductId?: string | null;
}) {
  const paymentAmount = input.paymentAmount ?? input.amount;

  db.prepare(
    `INSERT INTO bids (
       id, product_id, user_id, amount, status, payment_id, created_at, kind, dump_claim_product_id
     ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
  ).run(
    input.bidId,
    input.productId,
    input.userId,
    input.amount,
    input.paymentId,
    input.createdAt,
    input.kind,
    input.dumpClaimProductId ?? null,
  );

  db.prepare(
    `INSERT INTO payments (id, bid_id, user_id, amount, status, provider, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(
    input.paymentId,
    input.bidId,
    input.userId,
    paymentAmount,
    input.provider,
    input.createdAt,
  );
}

export async function createBidCheckout(input: {
  productId: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: unknown;
}) {
  const amount = parseBidAmount(input.amount);
  if (amount === null) {
    throw new HttpError(
      400,
      `Bid amount must be a whole dollar amount of at least $${MIN_BID}.`,
    );
  }

  const product = getProduct(input.productId);
  if (!product || product.bid_count <= 0) {
    throw new HttpError(404, "Product not found.");
  }

  // A bid has to clear both the listing it lands on and the top of the board,
  // so prices only ever move up and no two listings can tie.
  const benchmark = Math.max(product.current_bid, boardTopBid());
  const charge = bidCharge(benchmark, amount);
  if (charge === null) {
    throw new HttpError(
      400,
      `Bid must be at least $${minimumNextBid(benchmark)}. The top of the board is $${benchmark}.`,
    );
  }

  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isDodoConfigured() ? "dodo" : "mock";

  db.transaction(() => {
    insertCheckoutRows({
      bidId,
      paymentId,
      productId: product.id,
      userId: input.userId,
      amount,
      paymentAmount: charge,
      kind: "bid",
      createdAt,
      provider,
    });
  })();

  return finalizeCheckout({
    paymentId,
    bidId,
    product,
    amount: charge,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    provider,
    kind: "bid",
  });
}

export async function createDumpCheckout(input: {
  productId: string;
  userId: string;
  userEmail: string;
  userName: string;
  claimUrl: string;
}) {
  const product = getProduct(input.productId);
  if (!product || product.bid_count <= 0) {
    throw new HttpError(404, "Product not found.");
  }
  const amount = dumpPrice(product.current_bid);
  if (amount === null) {
    throw new HttpError(400, "They’re already on the floor.");
  }

  const claimUrl = normalizeClaimUrl(input.claimUrl);
  const existingClaim = findProductByUrl(claimUrl);
  const meta = existingClaim ? null : await fetchListingMeta(claimUrl);
  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isDodoConfigured() ? "dodo" : "mock";

  db.transaction(() => {
    let claimProductId = existingClaim?.id;
    if (!claimProductId) {
      const host = (() => {
        try {
          return new URL(claimUrl).hostname.replace(/^www\./i, "");
        } catch {
          return "site";
        }
      })();
      const name = (meta?.title || host).slice(0, 80);
      const description = (
        meta?.description || `Listed from ${host}.`
      ).slice(0, 500);
      claimProductId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO products (
           id, name, description, url, logo_url, creator_name, creator_id,
           current_bid, current_bid_at, decayed_at, decay_anchor, bid_count, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, 0, 0, ?)`,
      ).run(
        claimProductId,
        name,
        description,
        claimUrl,
        letterLogo(name),
        input.userName || name,
        input.userId,
        createdAt,
        createdAt,
      );
    }

    insertCheckoutRows({
      bidId,
      paymentId,
      productId: product.id,
      userId: input.userId,
      amount,
      kind: "dump",
      createdAt,
      provider,
      dumpClaimProductId: claimProductId,
    });
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
    kind: "dump",
  });
}

export async function createProductWithStartingBid(input: {
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  creatorName: string;
  startingBid: unknown;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  const amount = parseBidAmount(input.startingBid);
  if (amount === null) {
    throw new HttpError(
      400,
      `Starting bid must be a whole dollar amount of at least $${MIN_BID}.`,
    );
  }

  const entry = boardEntryBid();
  if (amount < entry) {
    throw new HttpError(
      400,
      `A bid has to clear the whole board, which costs at least $${entry} right now. To take a cheaper spot, dump the listing sitting in it.`,
    );
  }

  const name = input.name.trim();
  const description = input.description.trim();
  const creatorName = input.creatorName.trim() || input.userName;
  const logoUrl = input.logoUrl.trim();
  let url = input.url.trim();

  if (!name || name.length > 80) {
    throw new HttpError(400, "Product name is required (max 80 characters).");
  }
  if (!description || description.length > 500) {
    throw new HttpError(400, "Description is required (max 500 characters).");
  }
  if (!logoUrl || logoUrl.length > 500_000) {
    throw new HttpError(400, "A product logo is required.");
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    new URL(url);
  } catch {
    throw new HttpError(400, "Enter a valid website URL.");
  }

  const meta = await fetchListingMeta(url);
  const resolvedName = (meta.title || name).slice(0, 80);
  const resolvedDescription = (meta.description || description).slice(0, 500);

  const existing = findLiveProductByUrl(url);
  if (existing) {
    const checkout = await createBidCheckout({
      productId: existing.id,
      userId: input.userId,
      userEmail: input.userEmail,
      userName: input.userName,
      amount,
    });
    return { ...checkout, productId: existing.id };
  }

  const productId = crypto.randomUUID();
  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isDodoConfigured() ? "dodo" : "mock";

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO products (
         id, name, description, url, logo_url, creator_name, creator_id,
         current_bid, current_bid_at, decayed_at, decay_anchor, bid_count, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, 0, 0, ?)`,
    ).run(
      productId,
      resolvedName,
      resolvedDescription,
      url,
      logoUrl,
      creatorName,
      input.userId,
      createdAt,
      createdAt,
    );

    insertCheckoutRows({
      bidId,
      paymentId,
      productId,
      userId: input.userId,
      amount,
      kind: "bid",
      createdAt,
      provider,
    });
  });

  insert();

  const product = getProduct(productId);
  if (!product) throw new HttpError(500, "Could not create product.");

  const checkout = await finalizeCheckout({
    paymentId,
    bidId,
    product,
    amount,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    provider,
    kind: "bid",
  });

  return { ...checkout, productId };
}

export async function hydrateListingCopy(product: ProductRow) {
  if (!isPlaceholderDescription(product.description)) return product;

  const meta = await fetchListingMeta(product.url);
  const name = (meta.title || product.name).slice(0, 80);
  const description = (meta.description || product.description).slice(0, 500);
  if (name === product.name && description === product.description) return product;

  db.prepare("UPDATE products SET name = ?, description = ? WHERE id = ?").run(
    name,
    description,
    product.id,
  );
  return { ...product, name, description };
}

export async function finalizeCheckout(input: {
  paymentId: string;
  bidId: string;
  product: ProductRow;
  amount: number;
  userId: string;
  userEmail: string;
  userName: string;
  provider: "dodo" | "mock";
  kind: BidKind;
}) {
  const productName =
    input.kind === "dump" ? `Dump ${input.product.name}` : input.product.name;

  if (input.provider === "dodo") {
    try {
      const checkout = await createDodoCheckout({
        paymentId: input.paymentId,
        bidId: input.bidId,
        productId: input.product.id,
        productName,
        amountDollars: input.amount,
        userEmail: input.userEmail,
        userName: input.userName,
        kind: input.kind,
      });

      db.prepare(
        "UPDATE payments SET dodo_session_id = ?, checkout_url = ? WHERE id = ?",
      ).run(checkout.id, checkout.url, input.paymentId);

      return {
        paymentId: input.paymentId,
        bidId: input.bidId,
        checkoutUrl: checkout.url,
        mock: false,
        kind: input.kind,
      };
    } catch (error) {
      db.transaction(() => {
        db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(
          input.paymentId,
        );
        db.prepare("UPDATE bids SET status = 'failed' WHERE id = ?").run(
          input.bidId,
        );
      })();
      console.error("Dodo checkout failed", error);
      throw new HttpError(502, "Could not start checkout. Try again.");
    }
  }

  const checkoutUrl = `${getAppUrl()}/payment/mock/${input.paymentId}`;
  db.prepare("UPDATE payments SET checkout_url = ? WHERE id = ?").run(
    checkoutUrl,
    input.paymentId,
  );

  return {
    paymentId: input.paymentId,
    bidId: input.bidId,
    checkoutUrl,
    mock: true,
    kind: input.kind,
  };
}

export function confirmPayment(
  paymentId: string,
  extras: { dodoPaymentId?: string | null; dodoSessionId?: string | null } = {},
): ConfirmResult {
  const apply = db.transaction((): ConfirmResult => {
    const payment = getPayment(paymentId);
    if (!payment) throw new HttpError(404, "Payment not found.");

    if (payment.status === "succeeded") {
      const bid = getBid(payment.bid_id);
      const product = bid ? getProduct(bid.product_id) : undefined;
      if (!bid || !product) throw new HttpError(404, "Bid not found.");
      const claimProduct = bid.dump_claim_product_id
        ? getProduct(bid.dump_claim_product_id) ?? null
        : null;
      const rankedId =
        bidKind(bid) === "dump" && claimProduct ? claimProduct.id : product.id;
      return {
        alreadyProcessed: true,
        becameNumberOne: getProductRank(rankedId) === 1,
        product,
        claimProduct,
        bid,
        payment,
      };
    }

    if (payment.status === "failed") {
      throw new HttpError(409, "This payment can no longer be confirmed.");
    }

    const bid = getBid(payment.bid_id);
    if (!bid) throw new HttpError(404, "Bid not found.");
    const product = getProduct(bid.product_id);
    if (!product) throw new HttpError(404, "Product not found.");

    const processedAt = nowIso();

    db.prepare(
      `UPDATE payments
       SET status = 'succeeded',
           processed_at = ?,
           dodo_payment_id = COALESCE(?, dodo_payment_id),
           dodo_session_id = COALESCE(?, dodo_session_id)
       WHERE id = ?`,
    ).run(
      processedAt,
      extras.dodoPaymentId ?? null,
      extras.dodoSessionId ?? null,
      payment.id,
    );

    if (bidKind(bid) === "sponsor") {
      db.prepare(
        `UPDATE bids SET status = 'succeeded', confirmed_at = ? WHERE id = ?`,
      ).run(processedAt, bid.id);

      const claim = db
        .prepare("SELECT slot, name, url, logo_url FROM sponsor_claims WHERE bid_id = ?")
        .get(bid.id) as
        | { slot: string; name: string; url: string; logo_url: string }
        | undefined;

      if (claim) {
        db.prepare(
          `UPDATE sponsor_seats
           SET name = ?, url = ?, logo_url = ?, user_id = ?, payment_id = ?,
               claimed_at = ?, pending_payment_id = NULL, pending_at = NULL
           WHERE slot = ? AND claimed_at IS NULL`,
        ).run(
          claim.name,
          claim.url,
          claim.logo_url,
          bid.user_id,
          payment.id,
          processedAt,
          claim.slot,
        );
      }
    } else if (bidKind(bid) === "bike") {
      db.prepare(
        `UPDATE bids SET status = 'succeeded', confirmed_at = ? WHERE id = ?`,
      ).run(processedAt, bid.id);

      const claim = db
        .prepare("SELECT slot, name, url, logo_url FROM bike_claims WHERE bid_id = ?")
        .get(bid.id) as
        | { slot: string; name: string; url: string; logo_url: string }
        | undefined;

      if (claim) {
        const spot = db
          .prepare(
            `SELECT claimed_at, url, current_bid FROM bike_spots WHERE slot = ?`,
          )
          .get(claim.slot) as
          | { claimed_at: string | null; url: string | null; current_bid: number }
          | undefined;
        const taken = Boolean(spot?.claimed_at && spot.url);
        const currentBid = taken ? Number(spot?.current_bid) || 0 : 0;
        if (!taken || bid.amount > currentBid) {
          const heldUntil = new Date(
            Date.now() + 30 * 86_400_000,
          ).toISOString();
          db.prepare(
            `UPDATE bike_spots
             SET name = ?, url = ?, logo_url = ?, user_id = ?, payment_id = ?,
                 current_bid = ?, claimed_at = ?, held_until = ?,
                 pending_payment_id = NULL, pending_at = NULL
             WHERE slot = ?`,
          ).run(
            claim.name,
            claim.url,
            claim.logo_url,
            bid.user_id,
            payment.id,
            bid.amount,
            processedAt,
            heldUntil,
            claim.slot,
          );
        } else {
          db.prepare(
            `UPDATE bike_spots
             SET pending_payment_id = NULL, pending_at = NULL
             WHERE slot = ? AND pending_payment_id = ?`,
          ).run(claim.slot, payment.id);
        }
      }
    } else if (bidKind(bid) === "dump") {
      const canDump =
        product.current_bid >= 1 && product.current_bid <= bid.amount;

      const rankBefore = canDump ? getProductRank(product.id) : null;
      const heldSeconds =
        canDump && product.current_bid_at
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(product.current_bid_at).getTime()) / 1000,
              ),
            )
          : null;

      db.prepare(
        `UPDATE bids
         SET status = 'succeeded', confirmed_at = ?, dump_rank = ?, dump_held_seconds = ?
         WHERE id = ?`,
      ).run(processedAt, rankBefore, heldSeconds, bid.id);

      if (canDump) {
        db.prepare(
          `UPDATE products
           SET current_bid = 0, current_bid_at = ?, decayed_at = ?, decay_anchor = 0
           WHERE id = ?`,
        ).run(processedAt, processedAt, product.id);
      }

      // The claim is placed even when the target moved out of reach mid-checkout,
      // so a paid dump always buys a position rather than nothing.
      const claimId = bid.dump_claim_product_id;
      if (claimId) {
        const claim = getProduct(claimId);
        if (claim) {
          if (claim.id === product.id) {
            const owner = db
              .prepare("SELECT name FROM users WHERE id = ?")
              .get(bid.user_id) as { name: string } | undefined;
            db.prepare(
              `UPDATE products
               SET current_bid = ?, current_bid_at = ?, decayed_at = ?, decay_anchor = ?,
                   bid_count = MAX(bid_count, 1),
                   creator_id = ?, creator_name = ?
               WHERE id = ?`,
            ).run(
              bid.amount,
              processedAt,
              processedAt,
              bid.amount,
              bid.user_id,
              owner?.name || claim.creator_name,
              claim.id,
            );
          } else {
            db.prepare(
              `UPDATE products
               SET current_bid_at = CASE
                     WHEN current_bid >= ? THEN current_bid_at
                     ELSE ?
                   END,
                   decayed_at = CASE
                     WHEN current_bid >= ? THEN decayed_at
                     ELSE ?
                   END,
                   decay_anchor = MAX(COALESCE(decay_anchor, current_bid), ?),
                   current_bid = MAX(current_bid, ?),
                   bid_count = bid_count + 1
               WHERE id = ?`,
            ).run(
              bid.amount,
              processedAt,
              bid.amount,
              processedAt,
              bid.amount,
              bid.amount,
              claim.id,
            );
          }
        }
      }
    } else {
      db.prepare(
        `UPDATE bids
         SET status = 'succeeded', confirmed_at = ?
         WHERE id = ?`,
      ).run(processedAt, bid.id);

      if (bid.amount > product.current_bid) {
        db.prepare(
          `UPDATE products
           SET current_bid = ?, current_bid_at = ?, decayed_at = ?, decay_anchor = ?,
               bid_count = bid_count + 1
           WHERE id = ?`,
        ).run(bid.amount, processedAt, processedAt, bid.amount, product.id);
      } else {
        db.prepare(
          `UPDATE products SET bid_count = bid_count + 1 WHERE id = ?`,
        ).run(product.id);
      }
    }

    const updatedProduct = getProduct(product.id)!;
    const updatedBid = getBid(bid.id)!;
    const updatedPayment = getPayment(payment.id)!;
    const claimProduct = updatedBid.dump_claim_product_id
      ? getProduct(updatedBid.dump_claim_product_id) ?? null
      : null;
    const rankedId =
      bidKind(updatedBid) === "dump" && claimProduct
        ? claimProduct.id
        : updatedProduct.id;

    return {
      alreadyProcessed: false,
      becameNumberOne:
        bidKind(updatedBid) === "sponsor" || bidKind(updatedBid) === "bike"
          ? false
          : getProductRank(rankedId) === 1,
      product: updatedProduct,
      claimProduct,
      bid: updatedBid,
      payment: updatedPayment,
    };
  });

  return apply();
}

export function failPayment(paymentId: string) {
  const apply = db.transaction(() => {
    const payment = getPayment(paymentId);
    if (!payment || payment.status !== "pending") return;
    const processedAt = nowIso();
    db.prepare(
      "UPDATE payments SET status = 'failed', processed_at = ? WHERE id = ?",
    ).run(processedAt, payment.id);
    db.prepare("UPDATE bids SET status = 'failed' WHERE id = ?").run(
      payment.bid_id,
    );
    db.prepare(
      `UPDATE sponsor_seats
       SET pending_payment_id = NULL, pending_at = NULL
       WHERE pending_payment_id = ?`,
    ).run(payment.id);
    db.prepare(
      `UPDATE bike_spots
       SET pending_payment_id = NULL, pending_at = NULL
       WHERE pending_payment_id = ?`,
    ).run(payment.id);
  });
  apply();
}

export function findPaymentForWebhook(input: {
  paymentId?: string | null;
  sessionId?: string | null;
  dodoPaymentId?: string | null;
}) {
  if (input.sessionId) {
    const bySession = db
      .prepare("SELECT * FROM payments WHERE dodo_session_id = ?")
      .get(input.sessionId) as PaymentRow | undefined;
    if (bySession) return bySession;
  }

  if (input.paymentId) {
    const byId = getPayment(input.paymentId);
    if (byId) return byId;
  }

  if (input.dodoPaymentId) {
    const byDodo = db
      .prepare("SELECT * FROM payments WHERE dodo_payment_id = ?")
      .get(input.dodoPaymentId) as PaymentRow | undefined;
    if (byDodo) return byDodo;
  }

  return null;
}

export function markWebhookProcessed(eventId: string) {
  const result = db
    .prepare(
      "INSERT OR IGNORE INTO processed_webhooks (event_id, processed_at) VALUES (?, ?)",
    )
    .run(eventId, nowIso());
  return result.changes > 0;
}

export function listRecentActivity(limit = 12) {
  return db
    .prepare(
      `SELECT
         b.id, b.amount, b.kind, b.confirmed_at, b.created_at, b.dump_rank,
         p.id AS product_id, p.name AS product_name, p.logo_url, p.url,
         u.name AS user_name
       FROM bids b
       JOIN products p ON p.id = b.product_id
       JOIN users u ON u.id = b.user_id
       WHERE b.status = 'succeeded'
         AND IFNULL(b.kind, 'bid') IN ('bid', 'dump')
       ORDER BY COALESCE(b.confirmed_at, b.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    amount: number;
    kind: BidKind;
    confirmed_at: string | null;
    created_at: string;
    dump_rank: number | null;
    product_id: string;
    product_name: string;
    logo_url: string;
    url: string;
    user_name: string;
  }>;
}

export function listRecentDumps(limit = 8) {
  return db
    .prepare(
      `SELECT
         b.id, b.amount, b.dump_rank, b.dump_held_seconds, b.confirmed_at,
         p.id AS product_id, p.name AS product_name, p.logo_url, p.url
       FROM bids b
       JOIN products p ON p.id = b.product_id
       WHERE b.kind = 'dump' AND b.status = 'succeeded' AND b.dump_rank IS NOT NULL
       ORDER BY b.confirmed_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    amount: number;
    dump_rank: number | null;
    dump_held_seconds: number | null;
    confirmed_at: string | null;
    product_id: string;
    product_name: string;
    logo_url: string;
    url: string;
  }>;
}
