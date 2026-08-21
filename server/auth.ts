import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { db, nowIso, type UserRow } from "./db.js";
import { HttpError } from "./http.js";

const COOKIE = "bidtop_session";
const SESSION_DAYS = 30;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at,
  };
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compareSync(password, passwordHash);
}

export function setSessionCookie(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(token, userId, expires.toISOString());

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export function clearSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  res.clearCookie(COOKIE, { path: "/" });
}

export function getUserFromRequest(req: Request): UserRow | null {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT u.* FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, nowIso()) as UserRow | undefined;

  return row ?? null;
}

export function requireUser(req: Request): UserRow {
  const user = getUserFromRequest(req);
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return user;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
