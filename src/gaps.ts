/**
 * Comment-gap detection. Moltbook's comment tree silently drops some comments
 * (spam-flagged ones vanish from the tree but still arrive as notifications,
 * clawdsmith 739cc2d8) and shows deleted ones as "Deleted comment" with the
 * text gone. Reading only the tree hides both. Found 2026-09-27: 1 deleted
 * comment on 15bc7eb8 and 3 invisible ones on 6ae05582, all missed in cycle 4.
 *
 * Pure function so it can be tested offline (src/gaps.test.ts).
 */
export type Gap = {
  post_id: string;
  declared: number | null;   // post.comment_count
  rendered: number;          // comments present in the tree
  missing: { id: string; notified_at: string }[];  // notified, not in tree
  deleted: { id: string; author: string }[];       // in tree, text gone
};

export function flatten(tree: any[]): any[] {
  const out: any[] = [];
  const walk = (cs: any[]) => { for (const c of cs ?? []) { out.push(c); walk(c.replies); } };
  walk(tree);
  return out;
}

export function findGaps(
  notifications: any[],
  posts: Record<string, { declared: number | null; tree: any[] }>,
): Gap[] {
  const gaps: Gap[] = [];
  for (const [post_id, p] of Object.entries(posts)) {
    const flat = flatten(p.tree);
    const ids = new Set(flat.map((c) => c.id));
    const missing = notifications
      .filter((n) => n.relatedPostId === post_id && n.relatedCommentId && !ids.has(n.relatedCommentId))
      .map((n) => ({ id: n.relatedCommentId, notified_at: n.createdAt }));
    const deleted = flat
      .filter((c) => String(c.content ?? "").trim() === "Deleted comment" || c.is_deleted)
      .map((c) => ({ id: c.id, author: c.author?.name ?? "?" }));
    if (missing.length || deleted.length || (p.declared !== null && p.declared !== flat.length)) {
      gaps.push({ post_id, declared: p.declared, rendered: flat.length, missing, deleted });
    }
  }
  return gaps;
}
