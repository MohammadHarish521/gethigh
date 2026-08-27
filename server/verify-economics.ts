import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scratch = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "gethigh-verify-")),
  "bidtop.db",
);
process.env.DB_PATH = scratch;
process.env.NODE_ENV = "test";

const { db } = await import("./db.js");
const { applyDecay } = await import("./decay.js");
const {
  boardEntryBid,
  confirmPayment,
  createBidCheckout,
  createDumpCheckout,
  createProductWithStartingBid,
} = await import("./bidding.js");
const { DECAY_PER_DAY, dumpPrice, minimumNextBid } = await import("./ranking.js");

const user = {
  userId: "u1",
  userEmail: "tester@example.com",
  userName: "Tester",
};

db.prepare(
  "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
).run(user.userId, user.userEmail, user.userName, "x", new Date().toISOString());
db.prepare(
  "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
).run("u2", "rival@example.com", "Rival", "x", new Date().toISOString());

function revenue() {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'succeeded'")
    .get() as { total: number };
  return row.total;
}

function priceOf(id: string) {
  return (db.prepare("SELECT current_bid FROM products WHERE id = ?").get(id) as {
    current_bid: number;
  }).current_bid;
}

const checks: Array<[string, boolean, string]> = [];
function check(label: string, pass: boolean, detail: string) {
  checks.push([label, pass, detail]);
}

// --- Minimum increment ladder -------------------------------------------
check(
  "min bid floor is $5",
  minimumNextBid(0) === 5,
  `minimumNextBid(0) = ${minimumNextBid(0)}`,
);
check(
  "raise over $100 must clear 10%",
  minimumNextBid(100) === 110,
  `minimumNextBid(100) = ${minimumNextBid(100)}`,
);
check(
  "small prices use the $5 floor, not 10%",
  minimumNextBid(20) === 25,
  `minimumNextBid(20) = ${minimumNextBid(20)}`,
);

// --- All-pay revenue on a real bidding ladder ---------------------------
const created = await createProductWithStartingBid({
  ...user,
  name: "Arc",
  description: "A calmer browser.",
  url: "https://arc-verify.example",
  logoUrl: "data:image/svg+xml;utf8,<svg/>",
  creatorName: "Tester",
  startingBid: 40,
});
confirmPayment(created.paymentId);
const productId = created.productId!;

for (const amount of [120, 250]) {
  const checkout = await createBidCheckout({ ...user, productId, amount });
  confirmPayment(checkout.paymentId);
}

const ladderRevenue = revenue();
check(
  "40 -> 120 -> 250 ladder collects the sum, not the top price",
  ladderRevenue === 410,
  `collected $${ladderRevenue} (delta model would collect $250)`,
);
check(
  "headline price is still the winning bid",
  priceOf(productId) === 250,
  `current_bid = $${priceOf(productId)}`,
);

// --- Dump premium ratchets the ceiling ----------------------------------
const beforeDump = revenue();
const expectedDump = dumpPrice(250);
const dump = await createDumpCheckout({
  userId: "u2",
  userEmail: "rival@example.com",
  userName: "Rival",
  productId,
  claimUrl: "https://rival-verify.example",
});
confirmPayment(dump.paymentId);
const dumpCharge = revenue() - beforeDump;

check(
  "dump costs a 25% premium over the victim's price",
  dumpCharge === expectedDump && dumpCharge === 313,
  `charged $${dumpCharge}, expected $${expectedDump}`,
);
check(
  "victim is knocked to $0",
  priceOf(productId) === 0,
  `victim price = $${priceOf(productId)}`,
);

const claim = db
  .prepare("SELECT id, current_bid FROM products WHERE url = ?")
  .get("https://rival-verify.example") as { id: string; current_bid: number };
check(
  "dumper lands on the premium price, so the ceiling ratchets up",
  claim.current_bid === 313,
  `new leader sits at $${claim.current_bid} (was $250)`,
);

// --- Decay drains positions over time -----------------------------------
const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
db.prepare("UPDATE products SET decayed_at = ? WHERE id = ?").run(dayAgo, claim.id);
applyDecay({ force: true });

const afterOneDay = priceOf(claim.id);
const expectedAfterDay = Math.round(313 * (1 - DECAY_PER_DAY));
check(
  "a day of decay drains 5%",
  afterOneDay === expectedAfterDay,
  `$313 -> $${afterOneDay} (expected $${expectedAfterDay})`,
);

// Sweeping repeatedly without time passing must not drain anything extra.
applyDecay({ force: true });
applyDecay({ force: true });
check(
  "repeat sweeps with no elapsed time do not over-drain",
  priceOf(claim.id) === afterOneDay,
  `still $${priceOf(claim.id)}`,
);

// A brief hold must not cost a whole dollar off a small listing.
db.prepare(
  "UPDATE products SET current_bid = 10, decay_anchor = 10, decayed_at = ? WHERE id = ?",
).run(new Date(Date.now() - 60_000).toISOString(), claim.id);
for (let i = 0; i < 20; i += 1) applyDecay({ force: true });
check(
  "a minute of decay on $10 does not cost a dollar",
  priceOf(claim.id) === 10,
  `$10 held at $${priceOf(claim.id)} after 20 sweeps`,
);

// Decay must track the anchor, not compound off its own rounded output.
db.prepare(
  "UPDATE products SET current_bid = 313, decay_anchor = 313, decayed_at = ? WHERE id = ?",
).run(new Date(Date.now() - 10 * 86_400_000).toISOString(), claim.id);
applyDecay({ force: true });
const tenDays = Math.round(313 * Math.pow(1 - DECAY_PER_DAY, 10));
check(
  "ten days of decay matches the anchor curve exactly",
  priceOf(claim.id) === tenDays,
  `$313 -> $${priceOf(claim.id)} (expected $${tenDays})`,
);

// --- No two listings can hold the same price ----------------------------
const boardTop = (
  db
    .prepare("SELECT MAX(current_bid) AS top FROM products WHERE bid_count > 0")
    .get() as { top: number }
).top;
const entry = boardEntryBid();

async function listingRejected(startingBid: number, url: string) {
  try {
    await createProductWithStartingBid({
      ...user,
      name: "Gatecrasher",
      description: "Tries to slip onto the board below the top.",
      url,
      logoUrl: "data:image/svg+xml;utf8,<svg/>",
      creatorName: "Tester",
      startingBid,
    });
    return false;
  } catch {
    return true;
  }
}

check(
  "a new listing cannot enter at the $5 floor once the board is above it",
  await listingRejected(5, "https://floor-verify.example"),
  `board top is $${boardTop}, so entry costs $${entry}`,
);
check(
  "a new listing cannot tie the current top",
  await listingRejected(boardTop, "https://tie-verify.example"),
  `$${boardTop} rejected against a $${boardTop} board`,
);

const entrant = await createProductWithStartingBid({
  ...user,
  name: "Entrant",
  description: "Pays the entry price.",
  url: "https://entry-verify.example",
  logoUrl: "data:image/svg+xml;utf8,<svg/>",
  creatorName: "Tester",
  startingBid: entry,
});
confirmPayment(entrant.paymentId);
const prices = (
  db
    .prepare(
      "SELECT current_bid FROM products WHERE bid_count > 0 AND current_bid > 0",
    )
    .all() as Array<{ current_bid: number }>
).map((row) => row.current_bid);

check(
  "clearing the board is accepted and lands at #1",
  priceOf(entrant.productId!) === entry && entry > boardTop,
  `entered at $${entry} over a $${boardTop} board`,
);
check(
  "every live listing holds a distinct price",
  new Set(prices).size === prices.length,
  `prices on the board: ${prices.join(", ")}`,
);

// --- NS400Z tank auction ------------------------------------------------
const {
  BIKE_SPOTS,
  BIKE_LOCATION_FLOOR,
  bikeSizeFloor,
  bikeNextPrice,
  createBikeCheckout,
  listBikeSpots,
} = await import("./bike.js");

const emptyTank = listBikeSpots();
const hero = emptyTank.spots.find((spot) => spot.slot === "left-hero");
const mid = emptyTank.spots.find((spot) => spot.slot === "left-mid");
const knee = emptyTank.spots.find((spot) => spot.slot === "left-knee");
check(
  "small spots start at $10, mid at $15, large at $20",
  knee?.floor === 10 && mid?.floor === 15 && hero?.floor === 20,
  `knee $${knee?.floor} · mid $${mid?.floor} · hero $${hero?.floor}`,
);
check(
  "empty large spots sell at the large location floor",
  Boolean(hero && hero.minNextBid === 20 && hero.occupant === null),
  `left-hero minNext = $${hero?.minNextBid}`,
);
check(
  "each location has its own 1.2× vinyl ladder",
  bikeSizeFloor("small", "large") === 15 &&
    bikeSizeFloor("medium", "large") === 22 &&
    bikeSizeFloor("large", "large") === 29,
  `S $${bikeSizeFloor("small", "small")}-${bikeSizeFloor("small", "large")} · M $${bikeSizeFloor("medium", "small")}-${bikeSizeFloor("medium", "large")} · L $${bikeSizeFloor("large", "small")}-${bikeSizeFloor("large", "large")}`,
);

const tankClaim = await createBikeCheckout({
  ...user,
  slot: "left-hero",
  url: "https://127.0.0.1/tank-brand",
  size: "small",
});
confirmPayment(tankClaim.paymentId);
const afterClaim = listBikeSpots();
const claimedHero = afterClaim.spots.find((spot) => spot.slot === "left-hero");
check(
  "a paid tank claim occupies the spot at that location’s start",
  claimedHero?.occupant?.vinylSize === "small" && claimedHero.currentBid === 20,
  `hero is ${claimedHero?.occupant?.name} at $${claimedHero?.currentBid} ${claimedHero?.size}`,
);

const nextHero = bikeNextPrice(20, "small", "large");
check(
  "same-size dump is 1.2× the bid on the tank",
  nextHero === 24,
  `1.2× $20 = $${nextHero}`,
);
const tankOutbid = await createBikeCheckout({
  userId: "u2",
  userEmail: "rival@example.com",
  userName: "Rival",
  slot: "left-hero",
  url: "https://127.0.0.1/tank-rival",
  size: "small",
});
confirmPayment(tankOutbid.paymentId);
const afterOutbid = listBikeSpots();
const outbidHero = afterOutbid.spots.find((spot) => spot.slot === "left-hero");
check(
  "outbidding replaces the vinyl and ratchets the price",
  outbidHero?.currentBid === nextHero &&
    Boolean(outbidHero?.occupant?.url?.includes("tank-rival")),
  `hero now $${outbidHero?.currentBid} (expected $${nextHero})`,
);

const tankUpgrade = await createBikeCheckout({
  ...user,
  slot: "left-hero",
  url: "https://127.0.0.1/tank-large",
  size: "large",
});
confirmPayment(tankUpgrade.paymentId);
const afterUpgrade = listBikeSpots();
const largeHero = afterUpgrade.spots.find((spot) => spot.slot === "left-hero");
const largeLadder = bikeSizeFloor("large", "large");
check(
  "upgrading vinyl size charges this location’s large rung when it beats 1.2×",
  largeHero?.size === "large" && largeHero.currentBid === largeLadder,
  `hero ${largeHero?.size} at $${largeHero?.currentBid} (expected $${largeLadder})`,
);

let shrinkBlocked = false;
try {
  await createBikeCheckout({
    ...user,
    slot: "left-hero",
    url: "https://127.0.0.1/tank-shrink",
    size: "small",
  });
} catch {
  shrinkBlocked = true;
}
check(
  "vinyl on the tank cannot shrink",
  shrinkBlocked,
  shrinkBlocked ? "small rejected over large" : "shrink was allowed",
);
check(
  "tank spots are not a dump — the previous logo is gone",
  afterUpgrade.taken === 1,
  `${afterUpgrade.taken} occupied after the upgrade`,
);

const boardAfterBike = (
  db
    .prepare("SELECT MAX(current_bid) AS top FROM products WHERE bid_count > 0")
    .get() as { top: number }
).top;
check(
  "the tank auction does not sit on the dump board",
  boardAfterBike === priceOf(entrant.productId!),
  `board top still $${boardAfterBike}`,
);
const expectedGoal = Object.values(
  Object.fromEntries(
    BIKE_SPOTS.map((spot) => [spot.slot, BIKE_LOCATION_FLOOR[spot.size]]),
  ),
).reduce((sum, floor) => sum + floor, 0);
check(
  "twelve tank spots and a goal equal to the location floors",
  BIKE_SPOTS.length === 12 && emptyTank.goal === expectedGoal,
  `${BIKE_SPOTS.length} spots, goal $${emptyTank.goal}`,
);

// --- Recurring revenue on the real board --------------------------------
const boardValue = 943;
const monthly = Math.round(30 * DECAY_PER_DAY * boardValue);

console.log("");
for (const [label, pass, detail] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}\n      ${detail}`);
}

const failed = checks.filter(([, pass]) => !pass).length;
console.log("");
console.log(
  `Top-up demand implied by decay on a $${boardValue} board: ~$${monthly}/month recurring.`,
);
console.log(`${checks.length - failed}/${checks.length} checks passed.`);

db.close();
try {
  fs.rmSync(path.dirname(scratch), { recursive: true, force: true });
} catch {
  // Scratch db lives in the OS temp dir; leaving it behind is harmless.
}
process.exit(failed === 0 ? 0 : 1);
