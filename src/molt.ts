#!/usr/bin/env node
/**
 * Explorer One — the molt, audited by a separate context.
 *
 * Explorer One cannot audit itself: the thing that formed a belief still holds
 * the reasoning that produced it. So the verdicts come from a fresh context
 * that gets the claims table and nothing else — no journal, no map, no
 * narrative. Handing it those would hand it the bias.
 *
 * Judgment there. Adaptation here.
 *
 *   node src/molt.ts packet --trigger surprise --detail "..."
 *       Opens a molt and prints the audit packet: the auditor's charter plus
 *       the evidence fields of every live claim. Give this to a subagent with
 *       a clean context and nothing else.
 *
 *   node src/molt.ts apply --molt <id> --file verdicts.json
 *       Applies the auditor's verdicts. Explorer One then absorbs them —
 *       rewriting the map and the backlog is its job, not the auditor's.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, insert, run, all, one, now, cycleId, setCycleId, ROOT } from "./db.ts";
import { existsSync } from "node:fs";

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

db();
const cf = join(ROOT, "ledger", ".current-cycle");
if (existsSync(cf)) {
  const n = Number(readFileSync(cf, "utf8").trim());
  if (Number.isFinite(n)) setCycleId(n);
}

/** Evidence only. Deliberately excludes journal, map, backlog, and outcomes. */
function auditTable() {
  return all(
    `SELECT c.id                AS claim_id,
            c.claim,
            c.claim_type,
            c.status,
            c.acted_on,
            c.recorded_at,
            c.last_checked_at,
            c.testability,
            c.doubt             AS doubt_recorded_at_intake,
            s.handle            AS source,
            s.surface           AS source_surface,
            s.track_record      AS source_track_record
       FROM claims c LEFT JOIN sources s ON s.id = c.source_id
      WHERE c.shed_at IS NULL
      ORDER BY (c.status = 'untested' AND c.acted_on = 1) DESC, c.id`,
  );
}

const cmd = process.argv[2] ?? "help";

switch (cmd) {

case "packet": {
  const trigger = s("trigger", true);
  const id = insert(
    `INSERT INTO molts (started_at, cycle_id, trigger, trigger_detail) VALUES (?,?,?,?)`,
    now(), cycleId(), trigger, s("detail") || null,
  );
  const rows = auditTable();
  const danger = rows.filter((r: any) => r.status === "untested" && r.acted_on === 1);

  console.log(readFileSync(join(ROOT, "identity", "AUDITOR.md"), "utf8"));
  console.log(`\n---\n`);
  console.log(`# Audit packet — molt #${id}`);
  console.log(`Trigger: ${trigger}${s("detail") ? ` — ${s("detail")}` : ""}`);
  console.log(`${rows.length} live claims. ${danger.length} are acted-on but never verified — rule on those first.\n`);
  console.log("```json");
  console.log(JSON.stringify(rows, null, 2));
  console.log("```");
  console.log(`\nReturn JSON only, per the output contract above. molt_id is ${id}.`);
  console.error(`\n[molt #${id} opened — pass the packet above to a CLEAN context]`);
  break;
}

case "apply": {
  const moltId = Number(s("molt", true));
  const raw = readFileSync(s("file", true), "utf8");
  // Tolerate a fenced block; the auditor is told JSON only but models add fences.
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const parsed = JSON.parse(m ? m[1] : raw);
  const verdicts = parsed.verdicts ?? [];
  if (!verdicts.length) { console.error("no verdicts in file"); process.exit(2); }

  const legal = new Set(["held", "failed", "superseded", "untested"]);
  let applied = 0;
  for (const v of verdicts) {
    if (!legal.has(v.verdict)) {
      console.error(`skipped claim ${v.claim_id}: illegal verdict '${v.verdict}'`);
      continue;
    }
    const shed = v.verdict === "failed" || v.verdict === "superseded";
    run(
      `UPDATE claims SET status=?, last_checked_at=?, molt_id=?,
         shed_at = CASE WHEN ? THEN ? ELSE shed_at END,
         shed_reason = CASE WHEN ? THEN ? ELSE shed_reason END,
         superseded_by = COALESCE(?, superseded_by)
       WHERE id=?`,
      v.verdict, now(), moltId,
      shed ? 1 : 0, now(), shed ? 1 : 0, v.reason ?? "(no reason given)",
      v.superseded_by ?? null, v.claim_id,
    );
    applied++;
    console.log(`claim #${v.claim_id} → ${v.verdict}${shed ? " (shed, archived)" : ""}  ${v.reason ?? ""}`);
  }

  const c = one<any>(
    `SELECT SUM(status='held') held, SUM(status='failed') failed,
            SUM(status='superseded') superseded, SUM(status='untested') untested
       FROM claims WHERE molt_id=?`, moltId,
  );
  run(
    `UPDATE molts SET claims_reviewed=?, n_held=?, n_failed=?, n_superseded=?,
       n_still_untested=?, what_changed=? WHERE id=?`,
    applied, c?.held ?? 0, c?.failed ?? 0, c?.superseded ?? 0, c?.untested ?? 0,
    parsed.what_changed ?? "(auditor gave no summary)", moltId,
  );
  console.log(`\nmolt #${moltId} closed by auditor. held=${c?.held ?? 0} failed=${c?.failed ?? 0} superseded=${c?.superseded ?? 0} still-untested=${c?.untested ?? 0}`);
  console.log(`\nNow YOUR job: revise memory/MAP.md and rewrite memory/BACKLOG.md in light of these verdicts. Anything still untested and acted-on goes to the top of the backlog as a test.`);
  break;
}

default:
  console.log(`node src/molt.ts packet --trigger <scheduled|contradiction|surprise|drift|money> [--detail "..."]
node src/molt.ts apply --molt <id> --file <verdicts.json>

The packet goes to a CLEAN context. It cannot defend a belief it was never
persuaded of — that is the whole point.`);
}
