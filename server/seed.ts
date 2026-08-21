import crypto from "node:crypto";
import { db, nowIso } from "./db.js";
import { hashPassword } from "./auth.js";

const DEMO_PASSWORD = "demo1234";

type SeedProduct = {
  id: string;
  name: string;
  description: string;
  url: string;
  logo: string;
  creator: string;
  bids: Array<{ user: string; amount: number; hoursAgo: number }>;
};

function logoSvg(letter: string, from: string, to: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${from}"/>
          <stop offset="100%" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="20" fill="url(#g)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="white">${letter}</text>
    </svg>`,
  )}`;
}

export function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM products").get() as {
    count: number;
  };
  if (row.count > 0) return;

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const createdAt = nowIso();

  const users = [
    { id: "user-maya", email: "maya@bidtop.com", name: "Maya Chen" },
    { id: "user-jonas", email: "jonas@bidtop.com", name: "Jonas Reed" },
    { id: "user-demo", email: "demo@bidtop.com", name: "Demo User" },
    { id: "user-priya", email: "priya@bidtop.com", name: "Priya Shah" },
    { id: "user-alex", email: "alex@bidtop.com", name: "Alex Kim" },
  ];

  const insertUser = db.prepare(
    `INSERT INTO users (id, email, name, password_hash, created_at)
     VALUES (@id, @email, @name, @password_hash, @created_at)`,
  );

  for (const user of users) {
    insertUser.run({
      ...user,
      password_hash: passwordHash,
      created_at: createdAt,
    });
  }

  const products: SeedProduct[] = [
    {
      id: "prod-arc",
      name: "Arc",
      description: "A calmer browser for people who live in too many tabs.",
      url: "https://arc.example",
      logo: logoSvg("A", "#3B4CCA", "#7C5CFF"),
      creator: "Maya Chen",
      bids: [
        { user: "user-jonas", amount: 40, hoursAgo: 72 },
        { user: "user-priya", amount: 120, hoursAgo: 30 },
        { user: "user-maya", amount: 250, hoursAgo: 6 },
      ],
    },
    {
      id: "prod-flownote",
      name: "FlowNote",
      description: "Notes that stay in flow — write, link, and ship ideas.",
      url: "https://flownote.example",
      logo: logoSvg("F", "#0F766E", "#14B8A6"),
      creator: "Jonas Reed",
      bids: [
        { user: "user-alex", amount: 25, hoursAgo: 60 },
        { user: "user-maya", amount: 90, hoursAgo: 22 },
        { user: "user-jonas", amount: 180, hoursAgo: 8 },
      ],
    },
    {
      id: "prod-pixelkit",
      name: "PixelKit",
      description: "Tiny, tasteful UI components for product teams.",
      url: "https://pixelkit.example",
      logo: logoSvg("P", "#6D28D9", "#A855F7"),
      creator: "Priya Shah",
      bids: [
        { user: "user-demo", amount: 18, hoursAgo: 48 },
        { user: "user-priya", amount: 125, hoursAgo: 12 },
      ],
    },
    {
      id: "prod-launchly",
      name: "Launchly",
      description: "Launch checklists, waitlists, and first-week emails.",
      url: "https://launchly.example",
      logo: logoSvg("L", "#C2410C", "#F97316"),
      creator: "Alex Kim",
      bids: [
        { user: "user-jonas", amount: 12, hoursAgo: 40 },
        { user: "user-alex", amount: 75, hoursAgo: 16 },
      ],
    },
    {
      id: "prod-memo",
      name: "Memo",
      description: "Voice memos that turn into clean, searchable notes.",
      url: "https://memo.example",
      logo: logoSvg("M", "#B45309", "#F59E0B"),
      creator: "Demo User",
      bids: [
        { user: "user-maya", amount: 10, hoursAgo: 36 },
        { user: "user-demo", amount: 42, hoursAgo: 14 },
      ],
    },
    {
      id: "prod-devboard",
      name: "DevBoard",
      description: "A lightweight board for shipping work with your team.",
      url: "https://devboard.example",
      logo: logoSvg("D", "#1D4ED8", "#38BDF8"),
      creator: "Jonas Reed",
      bids: [
        { user: "user-priya", amount: 5, hoursAgo: 28 },
        { user: "user-jonas", amount: 18, hoursAgo: 10 },
      ],
    },
  ];

  const insertProduct = db.prepare(
    `INSERT INTO products (
       id, name, description, url, logo_url, creator_name, creator_id,
       current_bid, current_bid_at, bid_count, created_at
     ) VALUES (
       @id, @name, @description, @url, @logo_url, @creator_name, @creator_id,
       @current_bid, @current_bid_at, @bid_count, @created_at
     )`,
  );

  const insertBid = db.prepare(
    `INSERT INTO bids (
       id, product_id, user_id, amount, status, payment_id, created_at, confirmed_at
     ) VALUES (
       @id, @product_id, @user_id, @amount, 'succeeded', @payment_id, @created_at, @confirmed_at
     )`,
  );

  const insertPayment = db.prepare(
    `INSERT INTO payments (
       id, bid_id, user_id, amount, status, provider, created_at, processed_at
     ) VALUES (
       @id, @bid_id, @user_id, @amount, 'succeeded', 'mock', @created_at, @processed_at
     )`,
  );

  const seedAll = db.transaction(() => {
    for (const product of products) {
      const creator = users.find((user) => user.name === product.creator);
      const winningBid = product.bids[product.bids.length - 1];
      const productCreated = hoursAgoIso(Math.max(...product.bids.map((b) => b.hoursAgo)) + 8);

      insertProduct.run({
        id: product.id,
        name: product.name,
        description: product.description,
        url: product.url,
        logo_url: product.logo,
        creator_name: product.creator,
        creator_id: creator?.id ?? null,
        current_bid: winningBid.amount,
        current_bid_at: hoursAgoIso(winningBid.hoursAgo),
        bid_count: product.bids.length,
        created_at: productCreated,
      });

      for (const bid of product.bids) {
        const bidId = crypto.randomUUID();
        const paymentId = crypto.randomUUID();
        const at = hoursAgoIso(bid.hoursAgo);
        insertBid.run({
          id: bidId,
          product_id: product.id,
          user_id: bid.user,
          amount: bid.amount,
          payment_id: paymentId,
          created_at: at,
          confirmed_at: at,
        });
        insertPayment.run({
          id: paymentId,
          bid_id: bidId,
          user_id: bid.user,
          amount: bid.amount,
          created_at: at,
          processed_at: at,
        });
      }
    }
  });

  seedAll();
  console.log("Seeded BidTop demo products. Login: demo@bidtop.com / demo1234");
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
