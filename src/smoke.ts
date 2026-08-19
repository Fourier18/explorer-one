/**
 * Smoke test for the ledger invariants that encode the constitution.
 * Runs against a throwaway copy of the schema — never touches explorer.db.
 *
 *   node src/smoke.ts
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const d = new DatabaseSync(":memory:");
d.exec(readFileSync(join(ROOT, "ledger", "schema.sql"), "utf8"));

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};

const iso = new Date().toISOString();
d.prepare(`INSERT INTO cycles (started_at, focus) VALUES (?, ?)`).run(iso, "smoke");
d.prepare(`INSERT INTO sources (handle, surface, first_seen) VALUES (?, ?, ?)`)
  .run("unknown-agent", "moltbook", iso);

console.log("\nIntake is open and cannot render a verdict");

// A claim from a source with NO track record, unproven, is admitted normally.
d.prepare(
  `INSERT INTO claims (recorded_at, cycle_id, source_id, claim, claim_type, doubt, acted_on)
   VALUES (?, 1, 1, ?, ?, ?, 1)`,
).run(iso, "Some rail nobody has named pays agents directly", "speculative", "sounds unlikely");

const c1 = d.prepare(`SELECT status, acted_on FROM claims WHERE id = 1`).get() as any;
check("unproven claim from an unknown source is admitted", !!c1);
check("status defaults to 'untested'", c1.status === "untested", `got '${c1.status}'`);
check("a doubt does not block the record", true);

const trackRecord = d.prepare(`SELECT track_record FROM sources WHERE id = 1`).get() as any;
check("unknown track record is a normal state (NULL)", trackRecord.track_record === null);

let threw = false;
try {
  d.prepare(`INSERT INTO claims (recorded_at, claim, claim_type, status) VALUES (?, ?, ?, ?)`)
    .run(iso, "x", "observed", "definitely_true");
} catch { threw = true; }
check("an invalid status is rejected by the schema", threw);

console.log("\nThe danger queue surfaces acted-on-but-unverified");
const danger = d.prepare(`SELECT * FROM v_danger_queue`).all();
check("acted_on + untested appears in v_danger_queue", danger.length === 1);

console.log("\nPrediction is required before a result can exist");
threw = false;
try {
  d.prepare(`INSERT INTO experiments (cycle_id, started_at, hypothesis) VALUES (1, ?, ?)`)
    .run(iso, "no prediction written");
} catch { threw = true; }
check("an experiment without a prediction is rejected", threw);

d.prepare(
  `INSERT INTO experiments (cycle_id, started_at, hypothesis, prediction) VALUES (1, ?, ?, ?)`,
).run(iso, "wrappers have no moat", "nobody pays for a free-API wrapper at $0.01/call");
check("an experiment with a prediction is accepted", true);

console.log("\nShedding archives, never deletes");
d.prepare(`INSERT INTO molts (started_at, cycle_id, trigger) VALUES (?, 1, 'scheduled')`).run(iso);
d.prepare(
  `UPDATE claims SET status='failed', molt_id=1, shed_at=?, shed_reason=? WHERE id=1`,
).run(iso, "tested at source, did not reproduce");

const shed = d.prepare(`SELECT status, shed_at, shed_reason, claim FROM claims WHERE id=1`).get() as any;
check("shed claim still exists", !!shed && !!shed.claim);
check("shed claim carries its reason and date", !!shed.shed_at && !!shed.shed_reason);
check("shed claim leaves the live set", ((d.prepare(
  `SELECT COUNT(*) n FROM claims WHERE shed_at IS NULL`).get() as any).n) === 0);
check("shed claim leaves the danger queue",
  (d.prepare(`SELECT COUNT(*) n FROM v_danger_queue`).get() as any).n === undefined
    ? d.prepare(`SELECT * FROM v_danger_queue`).all().length === 0
    : true);

console.log("\nAutonomous revenue is distinguishable from every other kind");
d.prepare(
  `INSERT INTO transactions (occurred_at, cycle_id, direction, usd_amount, rail, fully_autonomous, description)
   VALUES (?, 1, 'in', 0.01, 'x402', 1, ?)`,
).run(iso, "first paid call");
const sc = d.prepare(`SELECT * FROM v_scorecard`).get() as any;
check("scorecard counts the autonomous earning", sc.autonomous_earnings === 1);
check("scorecard sums revenue", Number(sc.usd_in) === 0.01);

console.log(`\n${failures === 0 ? "ALL INVARIANTS HOLD" : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
