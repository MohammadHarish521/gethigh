export function minimumNextBid(currentBid: number) {
  if (!Number.isFinite(currentBid) || currentBid < 1) return 1;
  return Math.floor(currentBid) + 1;
}

export function parseBidAmount(value: unknown) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1) {
    return null;
  }
  return amount;
}

export function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function listingKey(url: string) {
  const withProtocol = /^https?:\/\//i.test(url.trim())
    ? url.trim()
    : `https://${url.trim()}`;
  const parsed = new URL(withProtocol);
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const path = parsed.pathname.replace(/\/$/, "");
  return `${host}${path}${parsed.search}`.toLowerCase();
}

export function raiseCharge(currentBid: number, target: number) {
  const floor = Math.max(0, currentBid);
  if (!Number.isInteger(target) || target < minimumNextBid(floor)) return null;
  return target - floor;
}
