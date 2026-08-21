import { Polar } from "@polar-sh/sdk";

export function isPolarConfigured() {
  return Boolean(
    process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID,
  );
}

export function getPolarClient() {
  if (!isPolarConfigured()) return null;

  return new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
}

export function getAppUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:5173";
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
}) {
  const polar = getPolarClient();
  const polarProductId = process.env.POLAR_PRODUCT_ID;

  if (!polar || !polarProductId) {
    throw new Error("Polar is not configured");
  }

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
    successUrl: `${getAppUrl()}/payment/success?payment_id=${input.paymentId}&checkout_id={CHECKOUT_ID}`,
    returnUrl: `${getAppUrl()}/product/${input.productId}`,
    externalCustomerId: input.userId,
    customerEmail: input.userEmail,
    customerName: input.userName,
    metadata: {
      paymentId: input.paymentId,
      bidId: input.bidId,
      productId: input.productId,
      productName: input.productName.slice(0, 500),
      amount: input.amountDollars,
    },
  });

  return checkout;
}
