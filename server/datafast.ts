import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, RequestHandler } from "express";

const VISITOR_COOKIE = "datafast_visitor_id";
const VISITOR_RE = /^[A-Za-z0-9_-]{8,128}$/;

const store = new AsyncLocalStorage<{ visitorId: string | null }>();

export function datafastVisitorIdFromRequest(req: Request) {
  const raw = req.cookies?.[VISITOR_COOKIE];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return VISITOR_RE.test(value) ? value : null;
}

/** Stashes the DataFast visitor cookie for the rest of this request. */
export const datafastRequestContext: RequestHandler = (req, _res, next) => {
  store.run({ visitorId: datafastVisitorIdFromRequest(req) }, next);
};

export function currentDatafastVisitorId() {
  return store.getStore()?.visitorId ?? null;
}
