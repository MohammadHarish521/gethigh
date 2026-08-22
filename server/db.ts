import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "bidtop.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    creator_id TEXT,
    current_bid INTEGER NOT NULL DEFAULT 0,
    current_bid_at TEXT,
    bid_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    payment_id TEXT,
    created_at TEXT NOT NULL,
    confirmed_at TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    bid_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    polar_checkout_id TEXT,
    polar_order_id TEXT,
    checkout_url TEXT,
    created_at TEXT NOT NULL,
    processed_at TEXT,
    FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS processed_webhooks (
    event_id TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_rank
    ON products(current_bid DESC, current_bid_at ASC);

  CREATE INDEX IF NOT EXISTS idx_bids_product
    ON bids(product_id, status, amount DESC);

  CREATE INDEX IF NOT EXISTS idx_bids_user
    ON bids(user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions(user_id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_polar_checkout
    ON payments(polar_checkout_id)
    WHERE polar_checkout_id IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_polar_order
    ON payments(polar_order_id)
    WHERE polar_order_id IS NOT NULL;
`);

function addColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((col) => col.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

addColumn("bids", "kind", "TEXT NOT NULL DEFAULT 'bid'");
addColumn("bids", "dump_rank", "INTEGER");
addColumn("bids", "dump_held_seconds", "INTEGER");
addColumn("products", "click_count", "INTEGER NOT NULL DEFAULT 0");

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  url: string;
  logo_url: string;
  creator_name: string;
  creator_id: string | null;
  current_bid: number;
  current_bid_at: string | null;
  bid_count: number;
  click_count: number;
  created_at: string;
};

export type BidKind = "bid" | "dump";

export type BidRow = {
  id: string;
  product_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  payment_id: string | null;
  created_at: string;
  confirmed_at: string | null;
  kind: BidKind;
  dump_rank: number | null;
  dump_held_seconds: number | null;
};

export type PaymentRow = {
  id: string;
  bid_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  provider: "polar" | "mock";
  polar_checkout_id: string | null;
  polar_order_id: string | null;
  checkout_url: string | null;
  created_at: string;
  processed_at: string | null;
};

export function nowIso() {
  return new Date().toISOString();
}
