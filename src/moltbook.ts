#!/usr/bin/env node
/**
 * Explorer One — Moltbook client. Zero dependencies (Node 24 fetch).
 *
 * The key is read from MOLTBOOK_API_KEY, or from
 * ~/.config/moltbook/credentials.json. It is NEVER written to this repo,
 * never logged, and never sent anywhere except www.moltbook.com.
 *
 *   node src/moltbook.ts whoami
 *   node src/moltbook.ts feed [--limit 25]
 *   node src/moltbook.ts submolts
 *   node src/moltbook.ts submolt <name> [--limit 25]
 *   node src/moltbook.ts post --submolt <name> --title "..." --content "..."
 *   node src/moltbook.ts comment --post <id> --content "..."
 *
 * Writes (post/comment) are OPERATOR-GATED. They refuse unless --confirm is
 * passed, so a cycle cannot post by accident.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = "https://www.moltbook.com/api/v1";

function key(): string {
  const env = process.env.MOLTBOOK_API_KEY;
  if (env) return env;
  try {
    const p = join(homedir(), ".config", "moltbook", "credentials.json");
    const k = JSON.parse(readFileSync(p, "utf8")).api_key;
    if (k) return k;
  } catch { /* fall through */ }
  console.error(
    "No Moltbook key. Set MOLTBOOK_API_KEY or place it in\n" +
    "  ~/.config/moltbook/credentials.json  as {\"api_key\": \"...\"}\n" +
    "Do not put it in this repository — the repository is public.",
  );
  process.exit(2);
}

async function api(path: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
  if (!r.ok) {
    console.error(`HTTP ${r.status} ${path}: ${JSON.stringify(body).slice(0, 400)}`);
    process.exit(1);
  }
  return body;
}

// --- arg parsing -----------------------------------------------------------
const argv = process.argv.slice(3);
const A: Record<string, string | boolean> = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const nxt = argv[i + 1];
    if (nxt && !nxt.startsWith("--")) { A[a.slice(2)] = nxt; i++; } else { A[a.slice(2)] = true; }
  }
}
const s = (k: string, req = false): string => {
  const v = A[k];
  if (typeof v === "string") return v;
  if (req) { console.error(`missing --${k}`); process.exit(2); }
  return "";
};
const lim = Number(s("limit") || "25");

const clip = (t: string, n = 400) =>
  (t ?? "").replace(/\s+/g, " ").trim().slice(0, n);

function showPosts(posts: any[]) {
  for (const p of posts.slice(0, lim)) {
    const who = p.author?.name ?? p.agent?.name ?? "?";
    const sub = p.submolt?.name ?? p.submolt_name ?? "?";
    console.log(`\n[${p.id}]  m/${sub}  u/${who}  ↑${p.upvotes ?? p.score ?? 0}  💬${p.comment_count ?? 0}`);
    console.log(`  ${clip(p.title, 160)}`);
    if (p.content) console.log(`  ${clip(p.content, 500)}`);
  }
  console.log(`\n(${posts.length} posts)`);
}

const cmd = process.argv[2] ?? "help";

switch (cmd) {
  case "whoami": {
    const a = (await api("/agents/me")).agent;
    console.log(JSON.stringify({
      name: a.name, display_name: a.display_name, karma: a.karma,
      followers: a.follower_count, posts: a.posts_count, comments: a.comments_count,
      claimed: a.is_claimed, verified: a.is_verified, active: a.is_active,
      description: a.description,
    }, null, 2));
    break;
  }
  case "feed": {
    showPosts((await api(`/feed?limit=${lim}`)).posts ?? []);
    break;
  }
  case "submolts": {
    const subs = (await api("/submolts")).submolts ?? [];
    for (const x of subs.slice(0, lim)) {
      console.log(`m/${x.name.padEnd(24)} ${String(x.subscriber_count ?? "").padStart(7)}  ${clip(x.description, 110)}`);
    }
    console.log(`\n(${subs.length} submolts)`);
    break;
  }
  case "submolt": {
    const name = process.argv[3];
    if (!name || name.startsWith("--")) { console.error("usage: submolt <name>"); process.exit(2); }
    // Correct shape is /posts?submolt=<name>. /submolts/<name>/posts is a 404.
    showPosts((await api(`/posts?submolt=${encodeURIComponent(name)}&limit=${lim}`)).posts ?? []);
    break;
  }

  case "home": {
    // Moltbook's own docs call /home the best starting point: what's new,
    // who has messaged you, what to do next.
    console.log(JSON.stringify(await api("/home"), null, 2).slice(0, 4000));
    break;
  }
  case "post": {
    if (A.confirm !== true) {
      console.error("Posting is operator-gated. Re-run with --confirm once the operator has approved.");
      process.exit(3);
    }
    const r = await api("/posts", {
      method: "POST",
      body: JSON.stringify({
        submolt: s("submolt", true), title: s("title", true), content: s("content", true),
      }),
    });
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "comment": {
    if (A.confirm !== true) {
      console.error("Commenting is operator-gated. Re-run with --confirm once the operator has approved.");
      process.exit(3);
    }
    const r = await api(`/posts/${s("post", true)}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: s("content", true) }),
    });
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  default:
    console.log(`node src/moltbook.ts whoami | feed | submolts | submolt <name> | post | comment
Writes require --confirm and operator approval. Reads are free.`);
}
