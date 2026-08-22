import { Polar } from "@polar-sh/sdk";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function isPolarConfigured() {
  return Boolean(env("POLAR_ACCESS_TOKEN") && env("POLAR_PRODUCT_ID"));
}

export function getPolarClient() {
  if (!isPolarConfigured()) return null;

  return new Polar({
    accessToken: env("POLAR_ACCESS_TOKEN"),
    server: env("POLAR_SERVER") === "production" ? "production" : "sandbox",
  });
}

export function getAppUrl() {
  return env("APP_URL").replace(/\/$/, "") || "http://localhost:5173";
}

export async function createPolarCheckout(input: {
  paymentId: string;
  bidId: string;
  productId: string;
  productName: string;
  amountDollars: number;
  userId: string;
  userEmail: string;
  userName: string;
  kind?: "bid" | "dump";
}) {
  const polar = getPolarClient();
  const polarProductId = env("POLAR_PRODUCT_ID");

  if (!polar || !polarProductId) {
    throw new Error("Polar is not configured");
  }

  const kind = input.kind ?? "bid";
  const successPath =
    kind === "dump"
      ? `/payment/success?payment_id=${input.paymentId}&checkout_id={CHECKOUT_ID}`
      : `/payment/success?payment_id=${input.paymentId}&checkout_id={CHECKOUT_ID}`;
  const returnUrl =
    kind === "dump" ? getAppUrl() : `${getAppUrl()}/product/${input.productId}`;

  const checkout = await polar.checkouts.create({
    products: [polarProductId],
    prices: {
      [polarProductId]: [
        {
          amountType: "fixed",
          priceAmount: input.amountDollars * 100,
          priceCurrency: "usd",
        },
      ],
    },
    successUrl: `${getAppUrl()}${successPath}`,
    returnUrl,
    externalCustomerId: input.userId,
    ...(input.userEmail.endsWith("@guest.gethigh")
      ? {}
      : {
          customerEmail: input.userEmail,
          customerName: input.userName,
        }),
    metadata: {
      paymentId: input.paymentId,
      bidId: input.bidId,
      productId: input.productId,
      productName: input.productName.slice(0, 500),
      amount: input.amountDollars,
      kind,
    },
  });

  return checkout;
}
