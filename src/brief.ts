/**
 * Explorer One — the cycle brief.
 *
 * A cloud routine starts with zero context. This prints everything the agent
 * needs to orient: constitution, surfaces, state, danger queue, backlog, and
 * whether this cycle is a molt. The routine prompt's first instruction is to
 * run this and read the output.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, scorecard, checkMoltDue } from "./db.ts";

const readIf = (p: string): string => (existsSync(p) ? readFileSync(p, "utf8") : "");

function lessonIndex(): string {
  const dir = join(ROOT, "memory", "lessons");
  if (!existsSync(dir)) return "(none yet)";
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  if (!files.length) return "(none yet)";
  return files.map((f) => `- memory/lessons/${f}`).join("\n");
}

export function brief(): string {
  const s = scorecard();
  const molt = checkMoltDue();
  const parts: string[] = [];

  parts.push(readIf(join(ROOT, "identity", "CONSTITUTION.md")));
  parts.push("\n\n---\n\n" + readIf(join(ROOT, "identity", "SURFACES.md")));

  parts.push(`
---

# Where you are right now

Scorecard:
${JSON.stringify(s.totals, null, 2)}

Drift (untested vs resolved claims):
${JSON.stringify(s.drift, null, 2)}

Claims you are ACTING ON but have never verified — ${s.dangerQueue.length}:
${JSON.stringify(s.dangerQueue, null, 2)}

Capabilities:
${JSON.stringify(s.capabilities, null, 2)}

Gates queued for the operator (not blocking you):
${JSON.stringify(s.openGates, null, 2)}

Your last few cycles:
${JSON.stringify(s.recentCycles, null, 2)}

Lessons on file:
${lessonIndex()}

Backlog (memory/BACKLOG.md):
${readIf(join(ROOT, "memory", "BACKLOG.md")) || "(empty)"}
`);

  if (molt.due) {
    parts.push(`
---

# BELIEFS TO TEST THIS CYCLE

Trigger: **${molt.trigger}**, ${molt.detail}

The operator's rule (constitution, Phase two): test each belief yourself, once.
- Fails, or can't be tested at all → reject: \`--verdict failed\`
- Passes → \`--verdict held\` (it comes back next cycle for one retest)
- Passes the retest → \`--verdict held\` again. It is held, but still tentative.
- If any new evidence bears on a held belief, test it again right away:
  \`--verdict untested\` reopens it.

\`node src/cli.ts molt-rule --claim <id> --verdict held|failed|untested --reason "<evidence>"\`

Beliefs you act on go first. Test as many as you can this cycle while still
answering people. List what's due with \`node src/cli.ts brief\` (danger queue)
or query claims where review_due_at <= now.
`);
  } else {
    parts.push(`
---

# This cycle

Pick **one** thing from the backlog and go deep. One finished piece of work
beats five started ones.

While exploring you are **receptive, not skeptical.** Record what you find with
\`record-claim\` whether or not it is proven and whether or not the source has a
track record — an unproven idea from an unknown agent is the earliest signal
that exists, and it arrives before anyone has proof by definition. Put doubts in
\`--doubt\`. Skepticism has its own scheduled place and this is not it.

**Prefer the unmapped.** Given a choice between confirming something already
written down and looking where nobody has looked, look where nobody has looked.

If you are testing something, \`open-experiment\` and write the prediction BEFORE
you act. If a prediction misses, that is a surprise — pass it to \`next-wake\`
with \`--surprise\` so it triggers a molt.

If you hit something you cannot do, that is a capability quest: find the tool
that already exists, prove it on a real target, write skills/<name>.md with a
smoke test, run the test, register it. Do not rebuild what exists.
`);
  }

  parts.push(`
---

# Ending the cycle — required

1. Write journal/<UTC-date>-cycle-<n>.md. What you did, what happened, what
   surprised you. Failures in full; they are more informative and less pleasant
   to write, so write them first.
2. Update memory/MAP.md if you learned anything about the terrain.
3. \`node src/cli.ts next-wake --hours <n> --reason "..." --outcome "..." [--surprise "..."]\`
4. Commit everything and push. **If it is not committed, it did not happen** —
   this machine is destroyed when the cycle ends and the repo is your only memory:

   git add -A && git commit -m "cycle <n>: <one line>" && git push

Your ledger commands: \`node src/cli.ts help\`
`);

  return parts.join("");
}
