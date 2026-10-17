// node --test test/market.test.mjs   (synthetic fixtures; no network)
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct, mergeProducts, quantiles, isPaid, revenueFloor, parseProductPage } from "../src/market.mjs";

const hit = (id, price_cents, count, extra = {}) => ({
  id, name: "P" + id, seller: { name: "S", is_verified: false }, native_type: "digital",
  price_cents, currency_code: "usd", ratings: { count, average: 4.5 },
  url: `https://s.gumroad.com/l/${id}?layout=discover`, ...extra,
});

test("normalizeProduct keeps price, ratings and a clean url", () => {
  const p = normalizeProduct(hit("a", 1900, 12), "ai agent");
  assert.equal(p.price, 19); assert.equal(p.ratings, 12); assert.equal(p.free, false);
  assert.equal(p.url, "https://s.gumroad.com/l/a"); assert.deepEqual(p.queries, ["ai agent"]);
});

test("free and pay-what-you-want-from-zero products are not paid and earn no revenue floor", () => {
  const f = normalizeProduct(hit("b", 0, 80, { is_pay_what_you_want: true }), "q");
  assert.equal(isPaid(f), false); assert.equal(revenueFloor(f), 0);
  const p = normalizeProduct(hit("c", 2500, 4), "q");
  assert.equal(revenueFloor(p), 100);
});

test("mergeProducts dedupes by id and unions queries", () => {
  const m = mergeProducts([[normalizeProduct(hit("a", 100, 1), "x")], [normalizeProduct(hit("a", 100, 1), "y"), normalizeProduct(hit("d", 100, 1), "y")]]);
  assert.equal(m.length, 2);
  assert.deepEqual(m.find((p) => p.id === "a").queries, ["x", "y"]);
});

test("quantiles", () => {
  assert.deepEqual(quantiles([10, 20, 30, 40, 50]), { n: 5, min: 10, p25: 20, median: 30, p75: 40, max: 50 });
  assert.equal(quantiles([]), null);
});

test("parseProductPage reads the Inertia props", () => {
  const props = { component: "Products/Show", props: { product: { sales_count: 321, summary: "s", ratings: { percentages: [1, 0, 0, 4, 95] }, refund_policy: { title: "30-day" }, description_html: "<p>Hello &amp; world</p>" } } };
  const html = `<div data-page="${JSON.stringify(props).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></div>`;
  const r = parseProductPage(html);
  assert.equal(r.sales_count, 321); assert.equal(r.refund_policy, "30-day");
  assert.deepEqual(r.rating_percentages, [1, 0, 0, 4, 95]);
  assert.equal(r.description_words, 3);
});
