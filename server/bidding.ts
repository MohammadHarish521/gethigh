import crypto from "node:crypto";
import {
  db,
  nowIso,
  type BidRow,
  type PaymentRow,
  type ProductRow,
} from "./db.js";
import { HttpError } from "./http.js";
import { createPolarCheckout, getAppUrl, isPolarConfigured } from "./polar.js";
import {
  listingKey,
  minimumNextBid,
  parseBidAmount,
  raiseCharge,
} from "./ranking.js";
import {
  fetchListingMeta,
  isPlaceholderDescription,
} from "./listingMeta.js";

export type ConfirmResult = {
  alreadyProcessed: boolean;
  becameNumberOne: boolean;
  product: ProductRow;
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

function bidKind(bid: BidRow) {
  return bid.kind === "dump" ? "dump" : "bid";
}

export function getProductRank(productId: string) {
  const ranked = db
    .prepare(
      `SELECT id FROM products
       WHERE bid_count > 0
       ORDER BY current_bid DESC, current_bid_at ASC, created_at ASC`,
    )
    .all() as Array<{ id: string }>;

  const index = ranked.findIndex((row) => row.id === productId);
  return index === -1 ? null : index + 1;
}

function findLiveProductByUrl(url: string) {
  let key: string;
  try {
    key = listingKey(url);
  } catch {
    return undefined;
  }

  const rows = db
    .prepare("SELECT * FROM products WHERE bid_count > 0")
    .all() as ProductRow[];

  return rows.find((row) => {
    try {
      return listingKey(row.url) === key;
    } catch {
      return false;
    }
  });
}

function insertCheckoutRows(input: {
  bidId: string;
  paymentId: string;
  productId: string;
  userId: string;
  amount: number;
  paymentAmount?: number;
  kind: "bid" | "dump";
  createdAt: string;
  provider: "polar" | "mock";
}) {
  const paymentAmount = input.paymentAmount ?? input.amount;

  db.prepare(
    `INSERT INTO bids (id, product_id, user_id, amount, status, payment_id, created_at, kind)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(
    input.bidId,
    input.productId,
    input.userId,
    input.amount,
    input.paymentId,
    input.createdAt,
    input.kind,
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
    throw new HttpError(400, "Bid amount must be a whole dollar amount of at least $1.");
  }

  const product = getProduct(input.productId);
  if (!product || product.bid_count <= 0) {
    throw new HttpError(404, "Product not found.");
  }

  const charge = raiseCharge(product.current_bid, amount);
  if (charge === null) {
    const minBid = minimumNextBid(product.current_bid);
    throw new HttpError(
      400,
      `Bid must be at least $${minBid}. Current highest bid is $${product.current_bid}.`,
    );
  }

  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isPolarConfigured() ? "polar" : "mock";

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
}) {
  const product = getProduct(input.productId);
  if (!product || product.bid_count <= 0) {
    throw new HttpError(404, "Product not found.");
  }
  if (product.current_bid < 1) {
    throw new HttpError(400, "They’re already on the floor.");
  }

  const amount = product.current_bid;
  const bidId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const createdAt = nowIso();
  const provider = isPolarConfigured() ? "polar" : "mock";

  db.transaction(() => {
    insertCheckoutRows({
      bidId,
      paymentId,
      productId: product.id,
      userId: input.userId,
      amount,
      kind: "dump",
      createdAt,
      provider,
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
    throw new HttpError(400, "Starting bid must be a whole dollar amount of at least $1.");
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
  const provider = isPolarConfigured() ? "polar" : "mock";

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO products (
         id, name, description, url, logo_url, creator_name, creator_id,
         current_bid, current_bid_at, bid_count, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?)`,
    ).run(
      productId,
      resolvedName,
      resolvedDescription,
      url,
      logoUrl,
      creatorName,
      input.userId,
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

async function finalizeCheckout(input: {
  paymentId: string;
  bidId: string;
  product: ProductRow;
  amount: number;
  userId: string;
  userEmail: string;
  userName: string;
  provider: "polar" | "mock";
  kind: "bid" | "dump";
}) {
  const productName =
    input.kind === "dump" ? `Dump ${input.product.name}` : input.product.name;

  if (input.provider === "polar") {
    try {
      const checkout = await createPolarCheckout({
        paymentId: input.paymentId,
        bidId: input.bidId,
        productId: input.product.id,
        productName,
        amountDollars: input.amount,
        userId: input.userId,
        userEmail: input.userEmail,
        userName: input.userName,
        kind: input.kind,
      });

      db.prepare(
        "UPDATE payments SET polar_checkout_id = ?, checkout_url = ? WHERE id = ?",
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
      console.error("Polar checkout failed", error);
      throw new HttpError(502, "Could not start Polar checkout. Try again.");
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
  extras: { polarOrderId?: string | null; polarCheckoutId?: string | null } = {},
): ConfirmResult {
  const apply = db.transaction((): ConfirmResult => {
    const payment = getPayment(paymentId);
    if (!payment) throw new HttpError(404, "Payment not found.");

    if (payment.status === "succeeded") {
      const bid = getBid(payment.bid_id);
      const product = bid ? getProduct(bid.product_id) : undefined;
      if (!bid || !product) throw new HttpError(404, "Bid not found.");
      return {
        alreadyProcessed: true,
        becameNumberOne:
          bidKind(bid) === "bid" && getProductRank(product.id) === 1,
        product,
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
           polar_order_id = COALESCE(?, polar_order_id),
           polar_checkout_id = COALESCE(?, polar_checkout_id)
       WHERE id = ?`,
    ).run(
      processedAt,
      extras.polarOrderId ?? null,
      extras.polarCheckoutId ?? null,
      payment.id,
    );

    if (bidKind(bid) === "dump") {
      const canDump =
        product.current_bid >= 1 && product.current_bid <= bid.amount;

      if (canDump) {
        const rankBefore = getProductRank(product.id);
        const heldSeconds = product.current_bid_at
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(product.current_bid_at).getTime()) / 1000,
              ),
            )
          : 0;

        db.prepare(
          `UPDATE bids
           SET status = 'succeeded', confirmed_at = ?, dump_rank = ?, dump_held_seconds = ?
           WHERE id = ?`,
        ).run(processedAt, rankBefore, heldSeconds, bid.id);

        db.prepare(
          `UPDATE products
           SET current_bid = 0, current_bid_at = ?
           WHERE id = ?`,
        ).run(processedAt, product.id);
      } else {
        db.prepare(
          `UPDATE bids SET status = 'succeeded', confirmed_at = ? WHERE id = ?`,
        ).run(processedAt, bid.id);
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
           SET current_bid = ?, current_bid_at = ?, bid_count = bid_count + 1
           WHERE id = ?`,
        ).run(bid.amount, processedAt, product.id);
      } else {
        db.prepare(
          `UPDATE products SET bid_count = bid_count + 1 WHERE id = ?`,
        ).run(product.id);
      }
    }

    const updatedProduct = getProduct(product.id)!;
    const updatedBid = getBid(bid.id)!;
    const updatedPayment = getPayment(payment.id)!;

    return {
      alreadyProcessed: false,
      becameNumberOne:
        bidKind(updatedBid) === "bid" && getProductRank(updatedProduct.id) === 1,
      product: updatedProduct,
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
  });
  apply();
}

export function findPaymentForWebhook(input: {
  paymentId?: string | null;
  checkoutId?: string | null;
  orderId?: string | null;
}) {
  if (input.checkoutId) {
    const byCheckout = db
      .prepare("SELECT * FROM payments WHERE polar_checkout_id = ?")
      .get(input.checkoutId) as PaymentRow | undefined;
    if (byCheckout) return byCheckout;
  }

  if (input.paymentId) {
    const byId = getPayment(input.paymentId);
    if (byId) return byId;
  }

  if (input.orderId) {
    const byOrder = db
      .prepare("SELECT * FROM payments WHERE polar_order_id = ?")
      .get(input.orderId) as PaymentRow | undefined;
    if (byOrder) return byOrder;
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
