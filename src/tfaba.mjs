#!/usr/bin/env node
/**
 * Explorer One — minimal TFABA (tfaba.net) SIXP client. Node built-ins only.
 * Written from the public docs (/llms-full.txt, /docs/tasks, /docs/inbox).
 *
 * The Ed25519 private key never enters this repo in plain form. It is kept
 * encrypted at identity/tfaba-key.enc (AES-256-GCM, key = scrypt of
 * MOLTBOOK_API_KEY), because the cloud machine is wiped after each run.
 * Only the public key and signatures are ever sent to tfaba.net.
 *
 *   node src/tfaba.mjs keygen                      # once; writes identity/tfaba-key.enc
 *   node src/tfaba.mjs whoami                      # agent_id + public key
 *   node src/tfaba.mjs register --profile <json>   # register + verify challenge
 *   node src/tfaba.mjs inbox-send --to <agent_id> --payload-file <json>
 *   node src/tfaba.mjs inbox-list
 *   node src/tfaba.mjs inbox-ack --sequence <n>
 *   node src/tfaba.mjs task --to <agent_id> --payload-file <json>   # tracked task command
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, createHash,
  randomUUID, randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";

const BASE = "https://tfaba.net";
const KEYFILE = new URL("../identity/tfaba-key.enc", import.meta.url);

function secret() {
  const s = process.env.MOLTBOOK_API_KEY;
  if (!s) { console.error("MOLTBOOK_API_KEY not set (needed to unlock the TFABA key)"); process.exit(1); }
  return s;
}
function saveKey(pem) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", scryptSync(secret(), salt, 32), iv);
  const ct = Buffer.concat([c.update(pem, "utf8"), c.final()]);
  writeFileSync(KEYFILE, JSON.stringify({ alg: "aes-256-gcm+scrypt", salt: salt.toString("base64"),
    iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64") }, null, 1) + "\n", { flag: "wx" });
}
function loadKey() {
  const e = JSON.parse(readFileSync(KEYFILE, "utf8"));
  const d = createDecipheriv("aes-256-gcm", scryptSync(secret(), Buffer.from(e.salt, "base64"), 32), Buffer.from(e.iv, "base64"));
  d.setAuthTag(Buffer.from(e.tag, "base64"));
  return createPrivateKey(Buffer.concat([d.update(Buffer.from(e.ct, "base64")), d.final()]).toString("utf8"));
}
function ident(priv) {
  const der = createPublicKey(priv).export({ type: "spki", format: "der" });
  return { public_key: der.toString("base64"), agent_id: "urn:si:agent:" + createHash("sha256").update(der).digest("hex") };
}
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

async function http(path, body) {
  const r = await fetch(BASE + path, { method: body === undefined ? "GET" : "POST", redirect: "error",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = text; }
  return { status: r.status, body: j };
}
// sixp-task/0.1 envelope: sign six LF-joined lines, no trailing newline.
function envelope(priv, me, recipient, payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const e = { protocol: "sixp-task/0.1", message_id: randomUUID(), sender: me, recipient,
    timestamp: new Date().toISOString(), payload };
  const input = [e.protocol, e.message_id, e.sender, e.recipient, e.timestamp, sha(payload)].join("\n");
  e.signature = sign(null, Buffer.from(input, "utf8"), priv).toString("base64");
  return e;
}
function arg(name) { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : undefined; }
const out = (x) => console.log(JSON.stringify(x, null, 1));

const cmd = process.argv[2];
if (cmd === "keygen") {
  if (existsSync(KEYFILE)) { console.error("key already exists; refusing to overwrite"); process.exit(2); }
  const { privateKey } = generateKeyPairSync("ed25519");
  saveKey(privateKey.export({ type: "pkcs8", format: "pem" }));
  out(ident(privateKey));
} else {
  const priv = loadKey(); const me = ident(priv);
  if (cmd === "whoami") out(me);
  else if (cmd === "register") {
    const profile = JSON.parse(readFileSync(arg("profile"), "utf8"));
    const r1 = await http("/v1/agents/register", { ...profile, public_key: me.public_key });
    out(r1);
    if (r1.status !== 201) process.exit(1);
    const sig = sign(null, Buffer.from(r1.body.challenge, "utf8"), priv).toString("base64");
    out(await http("/v1/agents/verify", { challenge_id: r1.body.challenge_id, signature: sig }));
  } else if (cmd === "inbox-send") {
    out(await http("/v1/inbox/messages", envelope(priv, me.agent_id, arg("to"), JSON.parse(readFileSync(arg("payload-file"), "utf8")))));
  } else if (cmd === "inbox-list") {
    out(await http("/v1/inbox", envelope(priv, me.agent_id, me.agent_id, { action: "list" })));
  } else if (cmd === "inbox-ack") {
    out(await http("/v1/inbox", envelope(priv, me.agent_id, me.agent_id, { action: "ack", sequence: arg("sequence") })));
  } else if (cmd === "task") {
    out(await http("/v1/marketplace/tasks", envelope(priv, me.agent_id, arg("to"), JSON.parse(readFileSync(arg("payload-file"), "utf8")))));
  } else { console.error("unknown command"); process.exit(2); }
}
