import DodoPayments from "dodopayments";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function isDodoConfigured() {
  return Boolean(env("DODO_PAYMENTS_API_KEY") && env("DODO_PRODUCT_ID"));
}

export function getDodoEnvironment(): "test_mode" | "live_mode" {
  return env("DODO_PAYMENTS_ENV") === "live_mode" ? "live_mode" : "test_mode";
}

export function getAppUrl() {
  return env("APP_URL").replace(/\/$/, "") || "http://localhost:5173";
}

export function getDodoClient() {
  if (!isDodoConfigured()) return null;

  return new DodoPayments({
    bearerToken: env("DODO_PAYMENTS_API_KEY"),
    webhookKey: env("DODO_PAYMENTS_WEBHOOK_KEY") || null,
    environment: getDodoEnvironment(),
  });
}

export async function createDodoCheckout(input: {
  paymentId: string;
  bidId: string;
  productId: string;
  productName: string;
  amountDollars: number;
  userEmail: string;
  userName: string;
  kind?: "bid" | "dump";
}) {
  const client = getDodoClient();
  const productId = env("DODO_PRODUCT_ID");
  if (!client || !productId) {
    throw new Error("Dodo Payments is not configured");
  }

  const kind = input.kind ?? "bid";
  const amountCents = input.amountDollars * 100;
  const guest = input.userEmail.endsWith("@guest.gethigh");

  const session = await client.checkoutSessions.create({
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        amount: amountCents,
      },
    ],
    billing_currency: "USD",
    return_url: `${getAppUrl()}/payment/success?gethigh_payment_id=${input.paymentId}`,
    cancel_url: kind === "dump" ? getAppUrl() : `${getAppUrl()}/product/${input.productId}`,
    ...(guest
      ? {}
      : {
          customer: {
            email: input.userEmail,
            name: input.userName,
          },
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

  if (!session.checkout_url) {
    throw new Error("Dodo did not return a checkout URL");
  }

  return {
    id: session.session_id,
    url: session.checkout_url,
  };
}

export function unwrapDodoWebhook(rawBody: string, headers: Record<string, string>) {
  const client = getDodoClient();
  const key = env("DODO_PAYMENTS_WEBHOOK_KEY");
  if (!client || !key) {
    throw new Error("Dodo webhook key is not configured");
  }
  return client.webhooks.unwrap(rawBody, { headers, key });
}
