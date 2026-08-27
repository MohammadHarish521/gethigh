import "./loadEnv.js";
import crypto from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { db, type BidRow, type PaymentRow, type ProductRow, type UserRow } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { HttpError, asyncHandler, errorHandler } from "./http.js";
import {
  clearSession,
  ensureGuestUser,
  getUserFromRequest,
  hashPassword,
  normalizeEmail,
  requireUser,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from "./auth.js";
import {
  boardEntryBid,
  confirmPayment,
  createBidCheckout,
  createDumpCheckout,
  createProductWithStartingBid,
  failPayment,
  findPaymentForWebhook,
  getProductRank,
  hydrateListingCopy,
  listRecentActivity,
  listRecentDumps,
  markWebhookProcessed,
} from "./bidding.js";
import {
  createSponsorCheckout,
  listSponsorSeats,
  sponsorDestination,
} from "./sponsors.js";
import {
  createBikeCheckout,
  listBikeSpots,
  bikeClaimForBid,
  bikeDestination,
} from "./bike.js";
import { assertProductionPayments, getDodoEnvironment, isDodoConfigured, unwrapDodoWebhook } from "./dodo.js";
import { applyDecay, startDecayScheduler } from "./decay.js";
import {
  DECAY_PER_DAY,
  DUMP_PREMIUM,
  MIN_BID,
  MIN_RAISE,
  MIN_RAISE_PCT,
  decayPerDay,
  dumpPrice,
  hostnameFromUrl,
  minimumNextBid,
} from "./ranking.js";
import { isPlaceholderDescription } from "./listingMeta.js";
import { fetchSiteIcon } from "./favicon.js";
import { recordPresence } from "./presence.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

seedIfEmpty();

const app = express();

app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());

app.post(
  "/api/webhooks/dodo",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
    if (!secret) {
      res.status(503).json({ error: "Dodo webhook secret is not configured." });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});

    const headers: Record<string, string> = {};
    for (const key of ["webhook-id", "webhook-signature", "webhook-timestamp"]) {
      const value = req.headers[key];
      if (typeof value === "string") headers[key] = value;
      else if (Array.isArray(value) && value[0]) headers[key] = value[0];
    }

    let event;
    try {
      event = unwrapDodoWebhook(rawBody, headers);
    } catch (error) {
      console.error("Dodo webhook signature failed", error);
      res.status(403).json({ error: "Invalid webhook signature." });
      return;
    }

    const eventId =
      headers["webhook-id"] || `${event.type}:${event.timestamp}:${Date.now()}`;
    if (!markWebhookProcessed(eventId)) {
      res.status(202).send("");
      return;
    }

    try {
      const data = "data" in event ? event.data : null;
      const paymentMeta =
        data && typeof data === "object" && "metadata" in data
          ? (data.metadata as Record<string, unknown> | undefined)
          : undefined;
      const dodoPaymentId =
        data && typeof data === "object" && "payment_id" in data
          ? String((data as { payment_id?: unknown }).payment_id ?? "")
          : "";

      const payment = findPaymentForWebhook({
        paymentId: metadataString(paymentMeta, "paymentId"),
        dodoPaymentId: dodoPaymentId || null,
      });

      if (event.type === "payment.succeeded" && payment) {
        confirmPayment(payment.id, {
          dodoPaymentId: dodoPaymentId || null,
        });
      }

      if (
        (event.type === "payment.failed" || event.type === "payment.cancelled") &&
        payment
      ) {
        failPayment(payment.id);
      }
    } catch (error) {
      db.prepare("DELETE FROM processed_webhooks WHERE event_id = ?").run(eventId);
      throw error;
    }

    res.status(202).send("");
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get(
  "/api/favicon",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.u || "").trim();
    if (!raw) {
      res.status(400).json({ error: "Missing url." });
      return;
    }
    const icon = await fetchSiteIcon(raw);
    if (!icon) {
      res.status(404).json({ error: "No icon." });
      return;
    }
    const type =
      icon.type === "image/svg+xml" ? "image/svg+xml; charset=utf-8" : icon.type;
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(icon.body);
  }),
);

app.get("/api/config", (_req, res) => {
  const revenue = boardRevenue();
  res.json({
    mockPayments: !isDodoConfigured(),
    minBid: MIN_BID,
    minRaise: MIN_RAISE,
    minRaisePct: MIN_RAISE_PCT,
    dumpPremium: DUMP_PREMIUM,
    decayPerDay: DECAY_PER_DAY,
    revenue,
    clicks: boardClicks(),
  });
});

app.post("/api/presence", (req, res) => {
  res.json(recordPresence(req, res));
});

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(String(req.body.email || ""));
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");

    if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email.");
    if (name.length < 2 || name.length > 60) {
      throw new HttpError(400, "Name must be between 2 and 60 characters.");
    }
    if (password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters.");
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) throw new HttpError(409, "An account with that email already exists.");

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, email, name, hashPassword(password), new Date().toISOString());

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
    setSessionCookie(res, user.id);
    res.status(201).json({ user: toPublicUser(user) });
  }),
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(String(req.body.email || ""));
    const password = String(req.body.password || "");

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, "Invalid email or password.");
    }

    setSessionCookie(res, user.id);
    res.json({ user: toPublicUser(user) });
  }),
);

app.post("/api/auth/logout", (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserFromRequest(req);
  res.json({ user: user ? toPublicUser(user) : null });
});

app.get(
  "/api/products",
  asyncHandler(async (_req, res) => {
    applyDecay();

    let rows = db
      .prepare(
        `SELECT * FROM products
         WHERE bid_count > 0
         ORDER BY current_bid DESC, current_bid_at DESC, created_at DESC`,
      )
      .all() as ProductRow[];

    const stale = rows
      .filter((row) => isPlaceholderDescription(row.description))
      .slice(0, 4);
    if (stale.length > 0) {
      await Promise.all(stale.map((row) => hydrateListingCopy(row)));
      rows = db
        .prepare(
          `SELECT * FROM products
           WHERE bid_count > 0
           ORDER BY current_bid DESC, current_bid_at DESC, created_at DESC`,
        )
        .all() as ProductRow[];
    }

    res.json({ products: rows.map((row, index) => toProductDto(row, index + 1)) });
  }),
);

app.get("/api/products/:id", (req, res, next) => {
  try {
  applyDecay();

  const product = findProduct(String(req.params.id || ""));

  if (!product || product.bid_count <= 0) {
    throw new HttpError(404, "Product not found.");
  }

  const history = db
    .prepare(
      `SELECT b.id, b.amount, b.confirmed_at, b.created_at, b.kind, u.name AS user_name
       FROM bids b
       JOIN users u ON u.id = b.user_id
       WHERE b.product_id = ? AND b.status = 'succeeded'
       ORDER BY b.confirmed_at DESC`,
    )
    .all(product.id) as Array<{
    id: string;
    amount: number;
    confirmed_at: string | null;
    created_at: string;
    kind: string | null;
    user_name: string;
  }>;

  res.json({
    product: toProductDto(product, getProductRank(product.id)),
    bids: history.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      userName: bid.user_name,
      createdAt: bid.confirmed_at || bid.created_at,
      kind: bid.kind === "dump" ? "dump" : "bid",
    })),
  });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id/go", (req, res, next) => {
  try {
    const product = findProduct(String(req.params.id || ""));
    if (!product || product.bid_count <= 0) {
      throw new HttpError(404, "Product not found.");
    }

    let dest = product.url.trim();
    if (!/^https?:\/\//i.test(dest)) dest = `https://${dest}`;
    const parsed = new URL(dest);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new HttpError(400, "Invalid listing URL.");
    }

    db.prepare(
      "UPDATE products SET click_count = COALESCE(click_count, 0) + 1 WHERE id = ?",
    ).run(product.id);

    res.redirect(302, parsed.toString());
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/products",
  asyncHandler(async (req, res) => {
    const user = ensureGuestUser(req, res);
    const result = await createProductWithStartingBid({
      name: String(req.body.name || ""),
      description: String(req.body.description || ""),
      url: String(req.body.url || ""),
      logoUrl: String(req.body.logoUrl || ""),
      creatorName: String(req.body.creatorName || user.name),
      startingBid: req.body.startingBid,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
    res.status(201).json(result);
  }),
);

app.post(
  "/api/bids",
  asyncHandler(async (req, res) => {
    const user = ensureGuestUser(req, res);
    const result = await createBidCheckout({
      productId: String(req.body.productId || ""),
      amount: req.body.amount,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
    res.status(201).json(result);
  }),
);

app.post(
  "/api/dumps",
  asyncHandler(async (req, res) => {
    const user = ensureGuestUser(req, res);
    const result = await createDumpCheckout({
      productId: String(req.body.productId || ""),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      claimUrl: String(req.body.url || ""),
    });
    res.status(201).json(result);
  }),
);

app.get("/api/dumps", (_req, res) => {
  res.json({
    dumps: listRecentDumps().map((row) => ({
      id: row.id,
      amount: row.amount,
      rankBefore: row.dump_rank,
      heldSeconds: row.dump_held_seconds,
      createdAt: row.confirmed_at,
      product: {
        id: row.product_id,
        name: row.product_name,
        logoUrl: row.logo_url,
        url: row.url,
      },
    })),
  });
});

app.get("/api/activity", (_req, res) => {
  res.json({
    activity: listRecentActivity().map((row) => ({
      id: row.id,
      kind: row.kind === "dump" ? "dump" : "bid",
      amount: row.amount,
      rankBefore: row.dump_rank,
      createdAt: row.confirmed_at ?? row.created_at,
      userName: row.user_name,
      product: {
        id: row.product_id,
        name: row.product_name,
        logoUrl: row.logo_url,
        url: row.url,
      },
    })),
  });
});

app.get("/api/sponsors", (_req, res) => {
  res.json(listSponsorSeats());
});

app.post(
  "/api/sponsors",
  asyncHandler(async (req, res) => {
    const user = ensureGuestUser(req, res);
    const result = await createSponsorCheckout({
      slot: String(req.body.slot || ""),
      url: String(req.body.url || ""),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
    res.status(201).json(result);
  }),
);

app.get("/api/sponsors/:slot/go", (req, res, next) => {
  try {
    const dest = sponsorDestination(String(req.params.slot || ""));
    res.redirect(302, dest);
  } catch (error) {
    next(error);
  }
});

app.get("/api/bike", (_req, res) => {
  res.json(listBikeSpots());
});

app.post(
  "/api/bike",
  asyncHandler(async (req, res) => {
    const user = ensureGuestUser(req, res);
    const result = await createBikeCheckout({
      slot: String(req.body.slot || ""),
      url: String(req.body.url || ""),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
    res.status(201).json(result);
  }),
);

app.get("/api/bike/:slot/go", (req, res, next) => {
  try {
    const dest = bikeDestination(String(req.params.slot || ""));
    res.redirect(302, dest);
  } catch (error) {
    next(error);
  }
});

app.get("/api/me/bids", (req, res, next) => {
  try {
  const user = requireUser(req);
  const rows = db
    .prepare(
      `SELECT
         b.id, b.amount, b.status, b.created_at, b.confirmed_at, b.payment_id,
         p.id AS product_id, p.name AS product_name, p.logo_url, p.url AS product_url, p.current_bid
       FROM bids b
       JOIN products p ON p.id = b.product_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
    )
    .all(user.id) as Array<{
    id: string;
    amount: number;
    status: BidRow["status"];
    created_at: string;
    confirmed_at: string | null;
    payment_id: string | null;
    product_id: string;
    product_name: string;
    logo_url: string;
    product_url: string;
    current_bid: number;
  }>;

  res.json({
    bids: rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
      paymentId: row.payment_id,
      product: {
        id: row.product_id,
        name: row.product_name,
        logoUrl: row.logo_url,
        url: row.product_url,
        currentBid: row.current_bid,
        rank: getProductRank(row.product_id),
      },
    })),
  });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/:id", (req, res, next) => {
  try {
  const payment = db
    .prepare("SELECT * FROM payments WHERE id = ?")
    .get(req.params.id) as PaymentRow | undefined;

  if (!payment) {
    throw new HttpError(404, "Payment not found.");
  }

  const bid = db
    .prepare("SELECT * FROM bids WHERE id = ?")
    .get(payment.bid_id) as BidRow | undefined;
  const product = bid
    ? (db.prepare("SELECT * FROM products WHERE id = ?").get(bid.product_id) as
        | ProductRow
        | undefined)
    : undefined;
  const claimProduct =
    bid?.dump_claim_product_id
      ? (db
          .prepare("SELECT * FROM products WHERE id = ?")
          .get(bid.dump_claim_product_id) as ProductRow | undefined)
      : undefined;
  const rankedProduct =
    bid?.kind === "dump" && claimProduct ? claimProduct : product;

  res.json({
    payment: {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      provider: payment.provider,
      createdAt: payment.created_at,
      processedAt: payment.processed_at,
    },
    bid: bid
      ? {
          id: bid.id,
          amount: bid.amount,
          status: bid.status,
          kind:
            bid.kind === "dump"
              ? "dump"
              : bid.kind === "sponsor"
                ? "sponsor"
                : bid.kind === "bike"
                  ? "bike"
                  : "bid",
          dumpRank: bid.dump_rank,
          dumpHeldSeconds: bid.dump_held_seconds,
        }
      : null,
    product: product ? toProductDto(product, getProductRank(product.id)) : null,
    claimProduct: claimProduct
      ? toProductDto(claimProduct, getProductRank(claimProduct.id))
      : null,
    becameNumberOne:
      payment.status === "succeeded" &&
      rankedProduct &&
      bid?.kind !== "sponsor" && bid?.kind !== "bike"
        ? getProductRank(rankedProduct.id) === 1
        : false,
    bikeSlot: bid ? (bikeClaimForBid(bid.id)?.slot ?? null) : null,
  });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/payments/:id/mock-confirm",
  asyncHandler(async (req, res) => {
    if (isDodoConfigured()) {
      throw new HttpError(403, "Mock payments are disabled when Dodo is configured.");
    }

    const payment = db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .get(req.params.id) as PaymentRow | undefined;

    if (!payment) {
      throw new HttpError(404, "Payment not found.");
    }
    if (payment.provider !== "mock") {
      throw new HttpError(400, "This payment is not a mock checkout.");
    }

    const result = confirmPayment(payment.id);
    res.json({
      paymentId: result.payment.id,
      status: result.payment.status,
      becameNumberOne: result.becameNumberOne,
      product: toProductDto(result.product, getProductRank(result.product.id)),
      alreadyProcessed: result.alreadyProcessed,
    });
  }),
);

app.post(
  "/api/payments/:id/mock-fail",
  asyncHandler(async (req, res) => {
    if (isDodoConfigured()) {
      throw new HttpError(403, "Mock payments are disabled when Dodo is configured.");
    }

    const payment = db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .get(req.params.id) as PaymentRow | undefined;

    if (!payment) {
      throw new HttpError(404, "Payment not found.");
    }

    failPayment(payment.id);
    res.json({ ok: true });
  }),
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use(errorHandler);

const distDir = path.resolve(__dirname, "../dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

startDecayScheduler();

try {
  assertProductionPayments();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`gethigh API on http://localhost:${PORT}`);
  console.log(
    isDodoConfigured()
      ? `Dodo payments: enabled (${getDodoEnvironment()})`
      : "Dodo payments: not configured — using mock checkout",
  );
  console.log(
    `Board economics: $${MIN_BID} floor · +${Math.round(MIN_RAISE_PCT * 100)}% min raise · ` +
      `${DUMP_PREMIUM}x dump · ${Math.round(DECAY_PER_DAY * 100)}%/day decay`,
  );
});

function findProduct(id: string) {
  const needle = id.trim();
  if (!needle) return undefined;

  const byId = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(needle) as ProductRow | undefined;
  if (byId) return byId;

  const prefixed = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(`prod-${needle}`) as ProductRow | undefined;
  if (prefixed) return prefixed;

  return db
    .prepare("SELECT * FROM products WHERE lower(name) = lower(?)")
    .get(needle) as ProductRow | undefined;
}

function boardRevenue() {
  if (getDodoEnvironment() !== "live_mode") return 0;

  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE status = 'succeeded'
         AND provider = 'dodo'
         AND dodo_payment_id IS NOT NULL`,
    )
    .get() as { total: number };
  return Number(row.total) || 0;
}

function boardClicks() {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(click_count), 0) AS total
       FROM products
       WHERE bid_count > 0`,
    )
    .get() as { total: number };
  return Number(row.total) || 0;
}

function toProductDto(product: ProductRow, rank: number | null) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    url: product.url,
    hostname: hostnameFromUrl(product.url),
    logoUrl: product.logo_url,
    creatorName: product.creator_name,
    creatorId: product.creator_id,
    currentBid: product.current_bid,
    currentBidAt: product.current_bid_at,
    bidCount: product.bid_count,
    clickCount: product.click_count ?? 0,
    // A bid always takes #1, so the price to bid on any listing is the price
    // to clear the whole board — never just this listing's own next step.
    minNextBid: Math.max(minimumNextBid(product.current_bid), boardEntryBid()),
    dumpCost: dumpPrice(product.current_bid),
    decayPerDay: decayPerDay(product.current_bid),
    rank,
    createdAt: product.created_at,
  };
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}
