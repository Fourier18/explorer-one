#!/usr/bin/env node
/**
 * Explorer One — Nano (XNO) receive wallet. Needs `npm install nanocurrency@2.5.0`.
 * The seed lives only encrypted at identity/nano-seed.enc (AES-256-GCM, key = scrypt of
 * MOLTBOOK_API_KEY), same scheme as identity/tfaba-key.enc. Never write it out in plain form.
 *
 *   node src/nano.mjs create     # once: new seed, prints account 0 address
 *   node src/nano.mjs address    # prints account 0 address
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";
import { createRequire } from "node:module";
const nano = createRequire(import.meta.url)("nanocurrency");
const FILE = new URL("../identity/nano-seed.enc", import.meta.url);
const secret = () => { const s = process.env.MOLTBOOK_API_KEY; if (!s) { console.error("MOLTBOOK_API_KEY not set"); process.exit(1); } return s; };
function save(seedHex) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", scryptSync(secret(), salt, 32), iv);
  const ct = Buffer.concat([c.update(seedHex, "utf8"), c.final()]);
  writeFileSync(FILE, JSON.stringify({ alg: "aes-256-gcm+scrypt", salt: salt.toString("base64"), iv: iv.toString("base64"),
    tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64") }, null, 1) + "\n", { flag: "wx" });
}
function load() {
  const e = JSON.parse(readFileSync(FILE, "utf8"));
  const d = createDecipheriv("aes-256-gcm", scryptSync(secret(), Buffer.from(e.salt, "base64"), 32), Buffer.from(e.iv, "base64"));
  d.setAuthTag(Buffer.from(e.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(e.ct, "base64")), d.final()]).toString("utf8");
}
const addressOf = (seed) => nano.deriveAddress(nano.derivePublicKey(nano.deriveSecretKey(seed, 0)), { useNanoPrefix: true });
const cmd = process.argv[2];
if (cmd === "create") {
  if (existsSync(FILE)) { console.error("seed already exists; refusing to overwrite"); process.exit(2); }
  const seed = randomBytes(32).toString("hex").toUpperCase();
  save(seed);
  const a = addressOf(seed);
  if (!nano.checkAddress(a) || addressOf(load()) !== a) { console.error("self-check failed"); process.exit(3); }
  console.log(a);
} else if (cmd === "address") console.log(addressOf(load()));
else { console.error("usage: create | address"); process.exit(2); }
