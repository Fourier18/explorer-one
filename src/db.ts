/**
 * Explorer One — ledger access.
 *
 * node:sqlite is built into Node 24, so there is no native dependency and
 * nothing to compile. Positional `?` parameters everywhere, deliberately —
 * they behave identically across sqlite bindings.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..");
export const DB_PATH = join(ROOT, "ledger", "explorer.db");
const SCHEMA_PATH = join(ROOT, "ledger", "schema.sql");

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const fresh = !existsSync(DB_PATH);
  _db = new DatabaseSync(DB_PATH);
  if (fresh) {
    _db.exec(readFileSync(SCHEMA_PATH, "utf8"));
    console.log(`[db] initialised ${DB_PATH}`);
  }
  return _db;
}

export const now = (): string => new Date().toISOString();

/** Run a statement, return lastInsertRowid as a number. */
export function insert(sql: string, ...params: unknown[]): number {
  const r = db().prepare(sql).run(...(params as never[]));
  return Number(r.lastInsertRowid);
}

export function run(sql: string, ...params: unknown[]): void {
  db().prepare(sql).run(...(params as never[]));
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db().prepare(sql).get(...(params as never[])) as T | undefined;
}

// ---------------------------------------------------------------------------
// Cycle lifecycle — the harness owns this, not the model. Tools read the
// current cycle id from module state so the model never has to pass it and
// therefore can never get it wrong.
// ---------------------------------------------------------------------------
let currentCycleId: number | null = null;

export function startCycle(focus: string): number {
  currentCycleId = insert(
    `INSERT INTO cycles (started_at, focus) VALUES (?, ?)`,
    now(),
    focus,
  );
  return currentCycleId;
}

export function endCycle(
  id: number,
  fields: {
    outcome?: string;
    surprise?: string;
    next_wake_at?: string;
    next_wake_reason?: string;
    tokens_used?: number;
    usd_spent?: number;
  },
): void {
  run(
    `UPDATE cycles SET ended_at = ?, outcome = COALESCE(?, outcome),
       surprise = COALESCE(?, surprise), next_wake_at = COALESCE(?, next_wake_at),
       next_wake_reason = COALESCE(?, next_wake_reason),
       tokens_used = COALESCE(?, tokens_used), usd_spent = COALESCE(?, usd_spent)
     WHERE id = ?`,
    now(),
    fields.outcome ?? null,
    fields.surprise ?? null,
    fields.next_wake_at ?? null,
    fields.next_wake_reason ?? null,
    fields.tokens_used ?? null,
    fields.usd_spent ?? null,
    id,
  );
  currentCycleId = null;
}

export const cycleId = (): number | null => currentCycleId;
export const setCycleId = (id: number | null): void => {
  currentCycleId = id;
};

// ---------------------------------------------------------------------------
// Source resolution — track record weights attention, never gates admission.
// An unknown handle is created with track_record NULL, which is a normal and
// perfectly acceptable state to record a claim from.
// ---------------------------------------------------------------------------
export function resolveSource(handle: string, surface: string, url?: string): number {
  const found = one<{ id: number }>(
    `SELECT id FROM sources WHERE handle = ? AND surface = ?`,
    handle,
    surface,
  );
  if (found) return found.id;
  return insert(
    `INSERT INTO sources (handle, surface, url, first_seen) VALUES (?, ?, ?, ?)`,
    handle,
    surface,
    url ?? null,
    now(),
  );
}

// ---------------------------------------------------------------------------
// Molt triggers — evaluated by the harness before each cycle, per
// constitution §III. Money-before-spend is raised by the agent itself.
// ---------------------------------------------------------------------------
export interface MoltCheck {
  due: boolean;
  trigger: "scheduled" | "drift" | "surprise" | null;
  detail: string;
}

export function checkMoltDue(): MoltCheck {
  const lastMolt = one<{ id: number; cycle_id: number | null }>(
    `SELECT id, cycle_id FROM molts ORDER BY id DESC LIMIT 1`,
  );
  const totalCycles =
    one<{ n: number }>(`SELECT COUNT(*) AS n FROM cycles`)?.n ?? 0;
  const sinceMolt = lastMolt?.cycle_id
    ? totalCycles - lastMolt.cycle_id
    : totalCycles;

  if (sinceMolt >= 20) {
    return {
      due: true,
      trigger: "scheduled",
      detail: `${sinceMolt} cycles since the last molt (threshold 20).`,
    };
  }

  const drift = one<{ untested: number | null; resolved: number | null; ratio: number | null }>(
    `SELECT * FROM v_drift`,
  );
  if (drift?.ratio !== null && drift?.ratio !== undefined && drift.ratio > 3 && (drift.untested ?? 0) >= 15) {
    return {
      due: true,
      trigger: "drift",
      detail: `${drift.untested} untested claims against ${drift.resolved} resolved (ratio ${drift.ratio.toFixed(1)}). Collecting without digesting.`,
    };
  }

  const surprise = one<{ id: number; surprise: string }>(
    `SELECT id, surprise FROM cycles
      WHERE surprise IS NOT NULL AND surprise <> ''
        AND id > COALESCE((SELECT cycle_id FROM molts ORDER BY id DESC LIMIT 1), 0)
      ORDER BY id DESC LIMIT 1`,
  );
  if (surprise) {
    return {
      due: true,
      trigger: "surprise",
      detail: `Cycle ${surprise.id} recorded a surprise: ${surprise.surprise}`,
    };
  }

  return { due: false, trigger: null, detail: "" };
}

// ---------------------------------------------------------------------------
// Reads the loop performs on wake.
// ---------------------------------------------------------------------------
export function scorecard() {
  return {
    totals: one(`SELECT * FROM v_scorecard`),
    drift: one(`SELECT * FROM v_drift`),
    dangerQueue: all(`SELECT * FROM v_danger_queue LIMIT 20`),
    openGates: all(
      `SELECT id, kind, request, rationale, raised_at FROM gates WHERE status = 'open'`,
    ),
    recentCycles: all(
      `SELECT id, started_at, focus, outcome, surprise, next_wake_reason
         FROM cycles ORDER BY id DESC LIMIT 5`,
    ),
    capabilities: all(
      `SELECT name, test_status, tool_used, last_tested_at FROM capabilities ORDER BY name`,
    ),
  };
}
