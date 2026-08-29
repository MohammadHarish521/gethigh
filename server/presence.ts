import crypto from "node:crypto";
import type { Request, Response } from "express";
import { db } from "./db.js";

const COOKIE = "gh_visitor";
const COOKIE_MS = 365 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A visitor counts as online this long after their last heartbeat. */
const ONLINE_WINDOW_MS = 90_000;
/** Coming back after this much silence counts as a new view. */
const SESSION_GAP_MS = 30 * 60 * 1000;
/** Past this point a row can no longer affect either count, so drop it. */
const RETENTION_MS = 2 * SESSION_GAP_MS;

const VIEWS_KEY = "page_views";
const LAUNCH_KEY = "presence_launched_at";

export type Presence = { live: number; views: number };

/** Heartbeats and stored views with no cosmetic padding. */
export function readRawPresence(now = Date.now()): Presence {
  const online = db
    .prepare("SELECT COUNT(*) AS n FROM visitors WHERE last_seen_at > ?")
    .get(new Date(now - ONLINE_WINDOW_MS).toISOString()) as { n: number };
  const views = db.prepare("SELECT value FROM counters WHERE key = ?").get(VIEWS_KEY) as
    | { value: number }
    | undefined;

  return {
    live: Number(online.n) || 0,
    views: Number(views?.value) || 0,
  };
}

function envNumber(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/**
 * Cosmetic padding stacked on top of the measured counts, so an empty board
 * doesn't read "1 online · 3 views". It lives here rather than in the browser
 * so every visitor sees the same figure at the same moment, and the stored
 * counters stay honest if the padding is ever dialled back to zero.
 */
const VIEWS_SEED = Math.floor(envNumber("VIEWS_SEED", 1000));
const VIEWS_PER_HOUR = envNumber("VIEWS_PER_HOUR", 60);
const LIVE_PAD_MIN = Math.floor(envNumber("LIVE_PAD_MIN", 6));
const LIVE_PAD_MAX = Math.max(LIVE_PAD_MIN, Math.floor(envNumber("LIVE_PAD_MAX", 24)));
const VIEW_BUCKET_MS = 5 * 60 * 1000;
const LIVE_BUCKET_MS = 45_000;

db.prepare("INSERT OR IGNORE INTO counters (key, value) VALUES (?, 0)").run(VIEWS_KEY);
db.prepare("INSERT OR IGNORE INTO counters (key, value) VALUES (?, ?)").run(
  LAUNCH_KEY,
  Date.now(),
);
const launchedAt = (
  db.prepare("SELECT value FROM counters WHERE key = ?").get(LAUNCH_KEY) as {
    value: number;
  }
).value;

function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 0xffffffff;
}

/** Smooth 0..1 wander, so padded numbers drift instead of teleporting. */
function noise(position: number) {
  const index = Math.floor(position);
  const frac = position - index;
  const from = hash(index);
  const to = hash(index + 1);
  return from + (to - from) * frac * frac * (3 - 2 * frac);
}

/** Never let the headline number tick backwards between polls. */
let viewsFloor = 0;

function padViews(real: number, now: number) {
  const buckets = Math.max(0, (now - launchedAt) / VIEW_BUCKET_MS);
  const perBucket = (VIEWS_PER_HOUR * VIEW_BUCKET_MS) / 3_600_000;
  // Wobble stays under one bucket of drift, which keeps the total rising.
  const wobble = Math.floor(noise(buckets) * perBucket);
  viewsFloor = Math.max(
    viewsFloor,
    VIEWS_SEED + Math.floor(buckets * perBucket) + wobble + real,
  );
  return viewsFloor;
}

function padLive(real: number, now: number) {
  if (LIVE_PAD_MAX <= 0) return real;
  const drift = noise((now - launchedAt) / LIVE_BUCKET_MS);
  return real + LIVE_PAD_MIN + Math.round(drift * (LIVE_PAD_MAX - LIVE_PAD_MIN));
}

function visitorId(req: Request, res: Response) {
  const existing = req.cookies?.[COOKIE];
  if (typeof existing === "string" && UUID_RE.test(existing)) return existing;

  const id = crypto.randomUUID();
  res.cookie(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MS,
    path: "/",
  });
  return id;
}

/** Heartbeat: refresh this visitor, count a view if they've been away, read totals. */
export function recordPresence(req: Request, res: Response): Presence {
  const id = visitorId(req, res);
  const now = Date.now();
  const stamp = new Date(now).toISOString();

  const row = db.prepare("SELECT last_seen_at FROM visitors WHERE id = ?").get(id) as
    | { last_seen_at: string }
    | undefined;
  const last = row ? Date.parse(row.last_seen_at) : Number.NaN;
  const isNewVisit = !Number.isFinite(last) || now - last > SESSION_GAP_MS;

  db.prepare(
    `INSERT INTO visitors (id, first_seen_at, last_seen_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  ).run(id, stamp, stamp);

  if (isNewVisit) {
    db.prepare("UPDATE counters SET value = value + 1 WHERE key = ?").run(VIEWS_KEY);
  }

  db.prepare("DELETE FROM visitors WHERE last_seen_at < ?").run(
    new Date(now - RETENTION_MS).toISOString(),
  );

  return readRawPresence(now);
}

export function readPresence(now = Date.now()): Presence {
  const raw = readRawPresence(now);
  return {
    live: padLive(raw.live, now),
    views: padViews(raw.views, now),
  };
}
