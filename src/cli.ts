#!/usr/bin/env node
/**
 * Explorer One — ledger CLI.
 *
 * Zero dependencies. Anything that can run bash can drive this: a cloud
 * routine, the Agent SDK, another model's harness, or a person. That is
 * deliberate — the memory and the rules live here, not in any one runtime.
 *
 * The constitution is enforced HERE, not by asking the model to remember it:
 *   - record-claim cannot set a status. Everything enters 'untested'.
 *   - molt-rule is the only path that changes a status.
 *   - open-experiment requires a prediction before a result can exist.
 *   - Nothing is deleted. Shedding writes shed_at + shed_reason.
 */
import {
  db, insert, run, all, one, now, cycleId, setCycleId,
  startCycle, endCycle, resolveSource, scorecard, checkMoltDue, ROOT,
} from "./db.ts";
import { brief } from "./brief.ts";
import { join } from "node:path";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";

// --- tiny arg parser: --key value / --flag ---------------------------------
const argv = process.argv.slice(3);
const A: Record<string, string | boolean> = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const nxt = argv[i + 1];
    if (nxt && !nxt.startsWith("--")) { A[k] = nxt; i++; } else { A[k] = true; }
  }
}
const str = (k: string, req = false): string => {
  const v = A[k];
  if (typeof v === "string") return v;
  if (req) { console.error(`missing required --${k}`); process.exit(2); }
  return "";
};
const num = (k: string, req = false): number | null => {
  const v = str(k, req);
  return v === "" ? null : Number(v);
};
const bool = (k: string): boolean => A[k] === true || A[k] === "true";

// --- the active cycle is stored on disk so every CLI call shares it ---------
const CYCLE_FILE = join(ROOT, "ledger", ".current-cycle");
function loadCycle(): number | null {
  if (!existsSync(CYCLE_FILE)) return null;
  const n = Number(readFileSync(CYCLE_FILE, "utf8").trim());
  if (!Number.isFinite(n)) return null;
  setCycleId(n);
  return n;
}
function saveCycle(id: number | null) {
  mkdirSync(join(ROOT, "ledger"), { recursive: true });
  writeFileSync(CYCLE_FILE, id === null ? "" : String(id));
}

const out = (s: string) => process.stdout.write(s + "\n");

// ---------------------------------------------------------------------------
const cmd = process.argv[2] ?? "help";
db();
loadCycle();

switch (cmd) {

case "brief": {
  // Starts a cycle if one isn't open, then prints everything the agent needs.
  let id = cycleId();
  if (!id) {
    const m = checkMoltDue();
    id = startCycle(m.due ? `MOLT (${m.trigger}): ${m.detail}` : "exploration");
    saveCycle(id);
  }
  out(`# Explorer One — cycle ${id}\n`);
  out(brief());
  break;
}

case "record-claim": {
  const sourceId = resolveSource(
    str("source", true), str("surface", true), str("url") || undefined,
  );
  const id = insert(
    `INSERT INTO claims (recorded_at, cycle_id, source_id, claim, claim_type,
       testability, doubt, acted_on) VALUES (?,?,?,?,?,?,?,?)`,
    now(), cycleId(), sourceId, str("claim", true), str("type", true),
    str("testability") || null, str("doubt") || null, bool("acted-on") ? 1 : 0,
  );
  out(`claim #${id} recorded as untested. Only a molt can rule on it.`);
  break;
}

case "note-source": {
  const id = resolveSource(str("handle", true), str("surface", true));
  run(`UPDATE sources SET track_record = ?, notes = COALESCE(?, notes) WHERE id = ?`,
    str("track-record", true), str("notes") || null, id);
  out(`source #${id} updated. Track record weights attention; it never gates admission.`);
  break;
}

case "open-experiment": {
  const id = insert(
    `INSERT INTO experiments (cycle_id, claim_id, started_at, hypothesis, prediction, method)
     VALUES (?,?,?,?,?,?)`,
    cycleId(), num("claim"), now(),
    str("hypothesis", true), str("prediction", true), str("method") || null,
  );
  out(`experiment #${id} open. Prediction locked before the result exists.`);
  break;
}

case "close-experiment": {
  const matched = bool("matched");
  run(`UPDATE experiments SET result=?, matched_prediction=?, usd_cost=?, usd_revenue=?,
         lesson_file=?, ended_at=? WHERE id=?`,
    str("result", true), matched ? 1 : 0, num("cost") ?? 0, num("revenue") ?? 0,
    str("lesson") || null, now(), num("id", true));
  out(matched
    ? `experiment #${str("id")} closed — prediction held.`
    : `experiment #${str("id")} closed — PREDICTION MISSED. That is a surprise: pass it to next-wake --surprise so it triggers a molt.`);
  break;
}

case "open-molt": {
  const id = insert(
    `INSERT INTO molts (started_at, cycle_id, trigger, trigger_detail) VALUES (?,?,?,?)`,
    now(), cycleId(), str("trigger", true), str("detail") || null,
  );
  out(`molt #${id} open (${str("trigger")}).\n`);
  out(`## Acted on but never verified — rule on these FIRST`);
  out(JSON.stringify(all(`SELECT * FROM v_danger_queue`), null, 2));
  out(`\n## Everything else you are carrying`);
  out(JSON.stringify(all(
    `SELECT c.id, c.claim, c.claim_type, c.status, c.recorded_at, c.testability,
            c.doubt, s.handle AS source, s.track_record
       FROM claims c LEFT JOIN sources s ON s.id=c.source_id
      WHERE c.shed_at IS NULL AND NOT (c.status='untested' AND c.acted_on=1)
      ORDER BY c.status, c.recorded_at`), null, 2));
  break;
}

case "molt-rule": {
  const verdict = str("verdict", true);
  if (!["held", "failed", "superseded", "untested"].includes(verdict)) {
    console.error(`verdict must be held|failed|superseded|untested`); process.exit(2);
  }
  const shed = verdict === "failed" || verdict === "superseded";
  run(`UPDATE claims SET status=?, last_checked_at=?, molt_id=?,
         shed_at = CASE WHEN ? THEN ? ELSE shed_at END,
         shed_reason = CASE WHEN ? THEN ? ELSE shed_reason END,
         superseded_by = COALESCE(?, superseded_by)
       WHERE id=?`,
    verdict, now(), num("molt", true),
    shed ? 1 : 0, now(), shed ? 1 : 0, str("reason", true),
    num("superseded-by"), num("claim", true));
  out(`claim #${str("claim")} → ${verdict}${shed ? " (shed — archived, not deleted)" : ""}`);
  break;
}

case "close-molt": {
  const m = num("molt", true);
  const c = one<any>(`SELECT SUM(status='held') held, SUM(status='failed') failed,
      SUM(status='superseded') superseded, SUM(status='untested') untested
      FROM claims WHERE molt_id=?`, m);
  run(`UPDATE molts SET claims_reviewed=?, n_held=?, n_failed=?, n_superseded=?,
        n_still_untested=?, what_changed=? WHERE id=?`,
    (c?.held ?? 0) + (c?.failed ?? 0) + (c?.superseded ?? 0) + (c?.untested ?? 0),
    c?.held ?? 0, c?.failed ?? 0, c?.superseded ?? 0, c?.untested ?? 0,
    str("changed", true), m);
  out(`molt #${m} closed. held=${c?.held ?? 0} failed=${c?.failed ?? 0} superseded=${c?.superseded ?? 0} still-untested=${c?.untested ?? 0}`);
  break;
}

case "register-capability": {
  insert(`INSERT INTO capabilities (name, acquired_at, skill_file, test_command,
            gap_that_caused_it, tool_used, notes) VALUES (?,?,?,?,?,?,?)
          ON CONFLICT(name) DO UPDATE SET skill_file=excluded.skill_file,
            test_command=excluded.test_command, notes=excluded.notes`,
    str("name", true), now(), str("skill-file", true), str("test", true),
    str("gap", true), str("tool", true), str("notes") || null);
  out(`capability '${str("name")}' registered as UNTESTED. Run the test, then set-capability-test.`);
  break;
}

case "set-capability-test": {
  run(`UPDATE capabilities SET test_status=?, last_tested_at=? WHERE name=?`,
    str("status", true), now(), str("name", true));
  out(`capability '${str("name")}' → ${str("status")}`);
  break;
}

case "record-transaction": {
  const id = insert(
    `INSERT INTO transactions (occurred_at, cycle_id, direction, usd_amount, rail,
       counterparty, fully_autonomous, description, experiment_id) VALUES (?,?,?,?,?,?,?,?,?)`,
    now(), cycleId(), str("direction", true), num("amount", true), str("rail") || null,
    str("counterparty") || null, bool("autonomous") ? 1 : 0,
    str("description", true), num("experiment"));
  out(`transaction #${id}${bool("autonomous") ? " — FULLY AUTONOMOUS" : ""}`);
  break;
}

case "raise-gate": {
  const id = insert(`INSERT INTO gates (raised_at, cycle_id, kind, request, rationale)
                     VALUES (?,?,?,?,?)`,
    now(), cycleId(), str("kind", true), str("request", true), str("rationale", true));
  out(`gate #${id} queued for the operator. Do not wait on it — continue with something else.`);
  break;
}

case "next-wake": {
  const id = cycleId();
  if (!id) { console.error("no open cycle — run `brief` first"); process.exit(2); }
  const at = new Date(Date.now() + (num("hours", true)! * 3600_000)).toISOString();
  run(`UPDATE cycles SET next_wake_at=?, next_wake_reason=?, outcome=?, surprise=? WHERE id=?`,
    at, str("reason", true), str("outcome", true), str("surprise") || null, id);
  endCycle(id, {});
  saveCycle(null);
  out(`cycle ${id} closed. Preferred next wake: ${at} — ${str("reason")}`);
  if (str("surprise")) out(`Surprise recorded. Next cycle will be a MOLT.`);
  out(`\nNow commit. If it is not committed, it did not happen.`);
  break;
}

case "scorecard": case "score": {
  out(JSON.stringify(scorecard(), null, 2));
  break;
}

case "gates": {
  const g = all<any>(`SELECT id,kind,request,rationale,raised_at FROM gates WHERE status='open' ORDER BY id`);
  if (!g.length) { out("No open gates."); break; }
  for (const x of g) out(`#${x.id} [${x.kind}] ${x.request}\n    why: ${x.rationale}\n    raised: ${x.raised_at}\n`);
  break;
}

case "approve": case "deny": {
  run(`UPDATE gates SET status=?, resolved_at=? WHERE id=?`,
    cmd === "approve" ? "approved" : "denied", now(), Number(process.argv[3]));
  out(`gate #${process.argv[3]} → ${cmd}d`);
  break;
}

case "init": {
  out(JSON.stringify(scorecard(), null, 2));
  break;
}

default:
  out(`Explorer One — ledger CLI

  brief                      start/resume a cycle and print everything you need
  record-claim               --claim --type observed|reported|speculative|self_promotional
                             --source --surface moltbook|x|web|bazaar|marketplace|direct
                             [--url --testability --doubt --acted-on]
  note-source                --handle --surface --track-record [--notes]
  open-experiment            --hypothesis --prediction [--method --claim]
  close-experiment           --id --result [--matched --cost --revenue --lesson]
  open-molt                  --trigger scheduled|contradiction|surprise|drift|money [--detail]
  molt-rule                  --molt --claim --verdict held|failed|superseded|untested
                             --reason [--superseded-by]
  close-molt                 --molt --changed
  register-capability        --name --skill-file --test --gap --tool [--notes]
  set-capability-test        --name --status passing|failing|discarded
  record-transaction         --direction in|out --amount --description
                             [--rail --counterparty --autonomous --experiment]
  raise-gate                 --kind first_post|spend|account|terms|other --request --rationale
  next-wake                  --hours --reason --outcome [--surprise]
  scorecard | gates | approve <id> | deny <id>

Intake is open: record-claim never sets a status. Only molt-rule does.`);
}
