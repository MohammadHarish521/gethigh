export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatHeld(seconds: number | null | undefined) {
  if (seconds == null || seconds < 1) return "moments";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 1) return `${seconds}s`;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatTimeAgo(value: string) {
  const then = new Date(value).getTime();
  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function outboundPath(productId: string) {
  return `/api/products/${productId}/go`;
}

export function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type ListingInput = {
  url: string;
  name: string;
  hostname: string;
};

export function parseListingInput(raw: string): ListingInput {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Paste a product URL or @handle.");
  }

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    if (!handle) throw new Error("Enter a valid @handle.");
    return {
      url: `https://x.com/${handle}`,
      name: `@${handle}`,
      hostname: `x.com/${handle}`,
    };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid URL or @handle.");
  }

  if (!parsed.hostname.includes(".")) {
    throw new Error("Enter a valid URL or @handle.");
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  const label = hostname.split(".")[0] ?? hostname;
  const name = label.charAt(0).toUpperCase() + label.slice(1);

  return {
    url: parsed.toString().replace(/\/$/, ""),
    name,
    hostname,
  };
}

export function listingsMatch(product: { url: string; hostname: string; name: string }, listing: ListingInput) {
  return (
    product.hostname === listing.hostname ||
    product.url.replace(/\/$/, "") === listing.url ||
    product.name.toLowerCase() === listing.name.toLowerCase()
  );
}
