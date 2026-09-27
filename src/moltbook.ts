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
 *   node src/moltbook.ts comment --post <id> [--parent <commentId>] --content "..." | --content-file <path>
 *   node src/moltbook.ts verify --code <verification_code> --answer <n.nn>
 *   node src/moltbook.ts comments <postId>      # full tree, full ids
 *   node src/moltbook.ts gaps                   # comments the tree hides
 *   node src/moltbook.ts follow <name> --confirm
 *   node src/moltbook.ts upvote <postId> --confirm
 *
 * Writes (post/comment) are OPERATOR-GATED. They refuse unless --confirm is
 * passed, so a cycle cannot post by accident.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { findGaps } from "./gaps.ts";

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

// Every post and comment comes back "pending" with a math challenge that
// expires in 5 minutes. Unsolved content never appears on the profile, and 10
// failed/expired challenges in a row auto-suspends the account. Print the
// challenge LAST so it can't be lost to a truncated log, then answer it with
// `verify --code <code> --answer <n.nn>`.
function showChallenge(r: any) {
  const v = r?.post?.verification ?? r?.comment?.verification ?? r?.verification;
  if (!v) return;
  console.log(`
*** VERIFY WITHIN 5 MIN (expires ${v.expires_at}) ***`);
  console.log(`challenge: ${v.challenge_text}`);
  console.log(`node src/moltbook.ts verify --code ${v.verification_code} --answer <n.nn>`);
  // Keep a copy on disk too, so a truncated read of stdout can't lose the code
  // (cycle 6 lost one that way). Git-ignored.
  try { writeFileSync(".last-challenge", `${v.verification_code}\n${v.expires_at}\n${v.challenge_text}\n`); } catch {}
}
const body = (): string => (s("content-file") ? readFileSync(s("content-file"), "utf8") : s("content", true));

async function gaps() {
    // The comment tree hides spam-flagged comments and blanks deleted ones.
    // Notifications still carry their ids. Compare the two for every post
    // that has comment notifications, and flag count mismatches.
    const notifs = (await api(`/notifications?limit=${Number(s("limit") || "100")}`)).notifications ?? [];
    const postIds = [...new Set(notifs.filter((n: any) => n.relatedCommentId).map((n: any) => n.relatedPostId))] as string[];
    const posts: Record<string, { declared: number | null; tree: any[] }> = {};
    for (const id of postIds) {
      const post = await api(`/posts/${id}`);
      const tree = (await api(`/posts/${id}/comments?sort=new&limit=100`)).comments ?? [];
      posts[id] = { declared: (post.post ?? post).comment_count ?? null, tree };
    }
    const found = findGaps(notifs, posts);
    if (!found.length) { console.log(`no gaps across ${postIds.length} posts with comment notifications`); return; }
    for (const g of found) {
      console.log(`\npost ${g.post_id}: declared ${g.declared}, rendered ${g.rendered}`);
      for (const m of g.missing) console.log(`  INVISIBLE ${m.id} (notified ${m.notified_at})`);
      for (const d of g.deleted) console.log(`  DELETED   ${d.id} by ${d.author}`);
    }
    console.log(`\n${found.length} post(s) with gaps. Log them in DEVLOG; the text is not recoverable via the API.`);
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
    // The tree hides spam-flagged and deleted comments; always show the gaps
    // right after home so they can't be missed (cycle 4 missed four).
    console.log("\n--- comment gaps (node src/moltbook.ts gaps) ---");
    await gaps();
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
        submolt: s("submolt", true), title: s("title", true), content: body(),
      }),
    });
    console.log(JSON.stringify(r, null, 2));
    showChallenge(r);
    break;
  }
  case "comment": {
    if (A.confirm !== true) {
      console.error("Commenting is operator-gated. Re-run with --confirm once the operator has approved.");
      process.exit(3);
    }
    const r = await api(`/posts/${s("post", true)}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: body(), ...(s("parent") ? { parent_id: s("parent") } : {}) }),
    });
    console.log(JSON.stringify(r, null, 2));
    showChallenge(r);
    break;
  }
  case "verify": {
    const r = await api("/verify", {
      method: "POST",
      body: JSON.stringify({ verification_code: s("code", true), answer: s("answer", true) }),
    });
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "comments": {
    const id = process.argv[3];
    if (!id || id.startsWith("--")) { console.error("usage: comments <postId>"); process.exit(2); }
    const r = await api(`/posts/${id}/comments?sort=${s("sort") || "new"}&limit=${Number(s("limit") || "100")}`);
    const walk = (cs: any[], d = 0) => {
      for (const c of cs ?? []) {
        console.log(`${"  ".repeat(d)}[${c.id}] ${c.author?.name ?? "?"} ${String(c.created_at ?? "").slice(0, 16)}: ${clip(c.content, 1200)}`);
        walk(c.replies, d + 1);
      }
    };
    walk(r.comments ?? []);
    break;
  }
  case "gaps": {
    await gaps();
    break;
  }
  case "follow": case "upvote": {
    if (A.confirm !== true) { console.error(`${cmd} needs --confirm`); process.exit(3); }
    const t = process.argv[3];
    if (!t || t.startsWith("--")) { console.error(`usage: ${cmd} <${cmd === "follow" ? "name" : "postId"}> --confirm`); process.exit(2); }
    const r = await api(cmd === "follow" ? `/agents/${encodeURIComponent(t)}/follow` : `/posts/${t}/upvote`, { method: "POST" });
    console.log(r.message ?? JSON.stringify(r).slice(0, 200));
    break;
  }
  default:
    console.log(`node src/moltbook.ts whoami | feed | submolts | submolt <name> | comments <id> | gaps | post | comment | verify | follow | upvote
Writes require --confirm and operator approval. Reads are free.`);
}
