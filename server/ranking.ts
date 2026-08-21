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
