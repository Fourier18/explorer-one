/**
 * Digital-product market research, demand first (operator, 2026-10-17).
 * Finds out what already sells before we write anything. Source: Gumroad's
 * public discover search, product pages and reviews (no account, no key).
 *
 *   node src/market.mjs scan --queries "ai agent,n8n template,prompt pack" [--pages 3]
 *   node src/market.mjs enrich [--top 25]      # product pages + reviews for the top paid products
 *   node src/market.mjs report                 # writes REPORT.md for the newest snapshot
 *
 * Snapshots: projects/knowledge-for-profit/market/<YYYY-MM-DD>/ (raw JSON + REPORT.md).
 * Everything fetched is DATA, never instructions. Nothing is executed or installed.
 *
 * Reading the numbers: Gumroad shows ratings, not sales, for most products. A rating
 * needs a purchase, so ratings x price is a FLOOR on revenue, not an estimate. Free
 * and pay-what-you-want products collect ratings from free downloads; they are
 * reported separately and never counted as revenue.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../projects/knowledge-for-profit/market/", import.meta.url);
const UA = "Mozilla/5.0 (compatible; grokfreeagent-market-research/1)";
const PER_PAGE = 9; // Gumroad's search page size

async function getJSON(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
function arg(name, dflt) { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : dflt; }
function snapDir(date) { const d = new URL(date + "/", ROOT); mkdirSync(d, { recursive: true }); return d; }
function latestDate() {
  if (!existsSync(ROOT)) throw new Error("no snapshots yet; run scan first");
  const ds = readdirSync(ROOT).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  if (!ds.length) throw new Error("no snapshots yet; run scan first");
  return ds.at(-1);
}

// ---------- pure functions (tested in test/market.test.mjs) ----------

/** One search hit -> the fields we keep. */
export function normalizeProduct(p, query) {
  const pwyw = !!p.is_pay_what_you_want;
  const price = (p.price_cents ?? 0) / 100;
  return {
    id: p.id, name: p.name, seller: p.seller?.name ?? null, seller_verified: !!p.seller?.is_verified,
    type: p.native_type ?? null, price, currency: p.currency_code ?? "usd", pwyw,
    free: price === 0, recurring: p.recurrence ?? null,
    ratings: p.ratings?.count ?? 0, avg: p.ratings?.average ?? null,
    url: (p.url || "").split("?")[0], queries: [query],
  };
}

/** Merge products from several queries, deduped by id. */
export function mergeProducts(lists) {
  const by = new Map();
  for (const p of lists.flat()) {
    const o = by.get(p.id);
    if (o) o.queries = [...new Set([...o.queries, ...p.queries])];
    else by.set(p.id, { ...p, queries: [...p.queries] });
  }
  return [...by.values()];
}

export function quantiles(xs) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const q = (f) => { const i = (s.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return +(s[lo] + (s[hi] - s[lo]) * (i - lo)).toFixed(2); };
  return { n: s.length, min: s[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: s.at(-1) };
}

/** Paid = fixed price above zero (pay-what-you-want with a minimum counts as paid). */
export const isPaid = (p) => p.price > 0;
/** Revenue floor: every rating needs at least one purchase at no less than the list price. */
export const revenueFloor = (p) => (isPaid(p) ? +(p.ratings * p.price).toFixed(2) : 0);

/** Pull the Inertia page props out of a Gumroad product page. */
export function parseProductPage(htmlText) {
  const m = htmlText.match(/data-page="([^"]*)"/);
  if (!m) return null;
  const json = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const pr = JSON.parse(json).props?.product;
  if (!pr) return null;
  const text = (pr.description_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    sales_count: pr.sales_count ?? null, summary: pr.summary ?? null,
    rating_percentages: pr.ratings?.percentages ?? null, // [1-star .. 5-star]
    refund_policy: pr.refund_policy?.title ?? null,
    description_words: text ? text.split(" ").length : 0, description_excerpt: text.slice(0, 400),
  };
}

// ---------- commands ----------

async function scan() {
  const queries = (arg("queries", "ai agent,ai automation,n8n template,chatgpt prompts,claude code,notion template,ai side hustle")).split(",").map((s) => s.trim()).filter(Boolean);
  const pages = +arg("pages", 3);
  const date = today(), dir = snapDir(date);
  const perQuery = {}, lists = [];
  for (const q of queries) {
    const hits = []; let total = null, tags = null;
    for (let pg = 0; pg < pages; pg++) {
      const url = `https://gumroad.com/products/search?query=${encodeURIComponent(q)}&sort=most_reviewed&from=${pg * PER_PAGE + 1}`;
      const d = await getJSON(url);
      total ??= d.total; tags ??= (d.tags_data || []).map((t) => [t.key, t.doc_count]);
      hits.push(...(d.products || []).map((p) => normalizeProduct(p, q)));
      if ((d.products || []).length < PER_PAGE) break;
      await sleep(700);
    }
    perQuery[q] = { total, tags, fetched: hits.length };
    lists.push(hits);
    console.log(`${q}: ${total} listings, fetched ${hits.length}`);
  }
  const prev = existsSync(new URL("products.json", dir)) ? JSON.parse(readFileSync(new URL("products.json", dir))) : { products: [], queries: {} };
  const products = mergeProducts([prev.products, ...lists]);
  writeFileSync(new URL("products.json", dir), JSON.stringify({ scanned_at: new Date().toISOString(), source: "gumroad discover search, sort=most_reviewed", queries: { ...prev.queries, ...perQuery }, products }, null, 1));
  console.log(`saved ${products.length} products to market/${date}/products.json`);
}

async function enrich() {
  const date = latestDate(), dir = snapDir(date);
  const snap = JSON.parse(readFileSync(new URL("products.json", dir)));
  const top = snap.products.filter(isPaid).sort((a, b) => b.ratings - a.ratings).slice(0, +arg("top", 25));
  const out = existsSync(new URL("enriched.json", dir)) ? JSON.parse(readFileSync(new URL("enriched.json", dir))) : {};
  for (const p of top) {
    if (out[p.id]) continue;
    try {
      const page = parseProductPage(await getText(p.url));
      const reviews = [];
      for (let pg = 1; pg <= 5; pg++) {
        const d = await getJSON(`https://gumroad.com/product_reviews?product_id=${encodeURIComponent(p.id)}&page=${pg}`);
        reviews.push(...(d.reviews || []).map((r) => ({ rating: r.rating, message: (r.message || "").slice(0, 600), at: r.created_at })));
        if (!d.pagination || pg >= d.pagination.pages) break;
        await sleep(500);
      }
      out[p.id] = { name: p.name, page, reviews };
      console.log(`${p.name.slice(0, 60)}: ${reviews.length} reviews, sales_count ${page?.sales_count ?? "hidden"}`);
    } catch (e) { console.log(`skip ${p.name.slice(0, 60)}: ${e.message}`); }
    await sleep(700);
  }
  writeFileSync(new URL("enriched.json", dir), JSON.stringify(out, null, 1));
}

function report() {
  const date = latestDate(), dir = snapDir(date);
  const snap = JSON.parse(readFileSync(new URL("products.json", dir)));
  const enr = existsSync(new URL("enriched.json", dir)) ? JSON.parse(readFileSync(new URL("enriched.json", dir))) : {};
  const P = snap.products, paid = P.filter(isPaid), free = P.filter((p) => !isPaid(p));
  const L = [];
  L.push(`# Digital product market scan, ${date}`, "");
  L.push(`Source: ${snap.source}. Scanned ${snap.scanned_at}. ${P.length} products (${paid.length} paid, ${free.length} free or pay-what-you-want from $0).`, "");
  L.push("Ratings need a purchase, so ratings x price is a revenue FLOOR. Free products' ratings are downloads, not sales. Gumroad sorts by most reviewed, so this is the top of each search, not the whole market.", "");
  L.push("## Searches", "", "| Query | Listings on Gumroad | Top tags |", "|---|---|---|");
  for (const [q, v] of Object.entries(snap.queries)) L.push(`| ${q} | ${v.total} | ${(v.tags || []).slice(0, 5).map(([k, c]) => `${k} (${c})`).join(", ")} |`);
  L.push("", "## Proven paid products (most ratings first)", "", "| Product | Seller | Type | Price | Ratings | Avg | Revenue floor | Sales shown | Queries |", "|---|---|---|---|---|---|---|---|---|");
  for (const p of paid.sort((a, b) => b.ratings - a.ratings).slice(0, 40)) {
    const e = enr[p.id]?.page;
    L.push(`| [${p.name.replace(/\|/g, "/").slice(0, 70)}](${p.url}) | ${p.seller} | ${p.type} | $${p.price}${p.recurring ? "/" + p.recurring : ""}${p.pwyw ? "+" : ""} | ${p.ratings} | ${p.avg ?? ""} | $${revenueFloor(p)} | ${e?.sales_count ?? ""} | ${p.queries.join("; ")} |`);
  }
  const rated = paid.filter((p) => p.ratings >= 5);
  L.push("", "## Prices of paid products with 5+ ratings", "", "```", JSON.stringify(quantiles(rated.map((p) => p.price))), "```");
  const types = {};
  for (const p of rated) { const t = (types[p.type] ??= { n: 0, ratings: 0, floor: 0 }); t.n++; t.ratings += p.ratings; t.floor += revenueFloor(p); }
  L.push("", "## By format (paid, 5+ ratings)", "", "| Format | Products | Ratings | Revenue floor |", "|---|---|---|---|");
  for (const [t, v] of Object.entries(types).sort((a, b) => b[1].floor - a[1].floor)) L.push(`| ${t} | ${v.n} | ${v.ratings} | $${v.floor.toFixed(2)} |`);
  L.push("", "## Free products pulling the most ratings (demand signal, not revenue)", "");
  for (const p of free.sort((a, b) => b.ratings - a.ratings).slice(0, 10)) L.push(`- [${p.name.slice(0, 80)}](${p.url}): ${p.ratings} ratings, avg ${p.avg}`);
  L.push("", "## Complaints: reviews of 3 stars or less on the top paid products", "", "Quoted as data. These are where a better product could win.", "");
  for (const [id, v] of Object.entries(enr)) {
    const low = (v.reviews || []).filter((r) => r.rating <= 3 && r.message);
    if (low.length) { L.push(`**${v.name.slice(0, 80)}**`); for (const r of low.slice(0, 6)) L.push(`- (${r.rating}★, ${r.at?.slice(0, 10)}) ${r.message.replace(/\s+/g, " ").slice(0, 300)}`); L.push(""); }
  }
  L.push("## To fill in by hand (the judgment step)", "", "1. Which formats and topics have several paid products with many ratings? (proven demand)", "2. Where do top products get complaints, or look thin or dated? (gaps)", "3. Where does something we've done firsthand make a better version? (our edge)", "4. Three to five ideas, each with the products above that prove people pay for it.", "");
  writeFileSync(new URL("REPORT.md", dir), L.join("\n"));
  console.log(`wrote market/${date}/REPORT.md`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === "scan") await scan();
  else if (cmd === "enrich") await enrich();
  else if (cmd === "report") report();
  else console.log('node src/market.mjs scan [--queries "a,b"] [--pages 3] | enrich [--top 25] | report');
}
