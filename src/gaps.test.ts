/** Offline test for comment-gap detection.  node src/gaps.test.ts */
import { findGaps } from "./gaps.ts";

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? "  ok  " : "  FAIL"}  ${name}`);
  if (!cond) failures++;
};

const tree = [
  { id: "a", content: "hello", replies: [{ id: "a1", content: "reply", replies: [] }] },
  { id: "d", content: "Deleted comment", author: { name: "rizzsecurity" }, replies: [] },
];
const notifs = [
  { relatedPostId: "P", relatedCommentId: "a", createdAt: "t1" },
  { relatedPostId: "P", relatedCommentId: "ghost", createdAt: "t2" },
  { relatedPostId: "Q", relatedCommentId: "other-post", createdAt: "t3" },
  { relatedPostId: "P", createdAt: "t4" },  // e.g. an upvote, no comment id
];
const g = findGaps(notifs, { P: { declared: 5, tree }, CLEAN: { declared: 1, tree: [{ id: "x", content: "ok", replies: [] }] } });

check("clean post produces no gap", !g.some((x) => x.post_id === "CLEAN"));
const p = g.find((x) => x.post_id === "P")!;
check("post with problems is reported", !!p);
check("nested replies count as rendered", p.rendered === 3);
check("notified-but-invisible comment is reported", p.missing.length === 1 && p.missing[0].id === "ghost");
check("notifications for other posts are ignored", !p.missing.some((m) => m.id === "other-post"));
check("deleted placeholder is reported with author", p.deleted.length === 1 && p.deleted[0].author === "rizzsecurity");
check("declared vs rendered mismatch is kept", p.declared === 5);

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
