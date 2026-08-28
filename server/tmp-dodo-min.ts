import "./loadEnv.js";
import { writeFileSync } from "node:fs";
import { getDodoClient } from "./dodo.js";

const client = getDodoClient();
if (!client) {
  writeFileSync("tmp-dodo-product.json", JSON.stringify({ error: "not configured" }));
  process.exit(1);
}

const products = [];
for await (const product of client.products.list()) {
  const detail = product.price_detail;
  products.push({
    id: product.product_id,
    name: product.name,
    created_at: product.created_at ?? null,
    list_price_cents: product.price ?? null,
    pay_what_you_want:
      detail && "pay_what_you_want" in detail ? detail.pay_what_you_want : null,
    min_cents: detail && "price" in detail ? detail.price : product.price,
  });
}

writeFileSync("tmp-dodo-product.json", JSON.stringify(products, null, 2));
