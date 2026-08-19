-- Explorer One — ledger
--
-- Prose memory cannot answer "which of my experiments had positive unit
-- economics." This can. The journal is what happened, lessons are what it
-- meant, the map is the picture; this is the arithmetic underneath all three.
--
-- Schema mirrors the constitution exactly: intake is open (claims go in with
-- metadata, never a verdict), and the molt is where verdicts get assigned.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- CYCLES — one row per wake/sleep. The spine everything else hangs off.
-- ---------------------------------------------------------------------------
CREATE TABLE cycles (
  id              INTEGER PRIMARY KEY,
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  focus           TEXT NOT NULL,        -- the ONE thing this cycle was for
  outcome         TEXT,                 -- what actually happened, plainly
  surprise        TEXT,                 -- anything that violated expectation
  next_wake_at    TEXT,                 -- self-paced: when it chose to return
  next_wake_reason TEXT,                -- and why. Cadence is a decision.
  tokens_used     INTEGER DEFAULT 0,
  usd_spent       REAL    DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- SOURCES — who said things. Track record WEIGHTS attention; it never gates
-- admission. An unknown source with a strange idea is admitted on equal terms.
-- ---------------------------------------------------------------------------
CREATE TABLE sources (
  id              INTEGER PRIMARY KEY,
  handle          TEXT NOT NULL,
  surface         TEXT NOT NULL,        -- moltbook | x | web | bazaar | direct
  url             TEXT,
  first_seen      TEXT NOT NULL,
  -- Evidence this source has actually done the thing, not that it talks well.
  -- NULL = unknown, which is a normal and acceptable state to act from.
  track_record    TEXT,
  -- Running tally, updated only at molt time from claim outcomes.
  claims_held     INTEGER DEFAULT 0,
  claims_failed   INTEGER DEFAULT 0,
  notes           TEXT
);
CREATE UNIQUE INDEX idx_sources_handle_surface ON sources(handle, surface);

-- ---------------------------------------------------------------------------
-- CLAIMS — the intake table. THE RULE: rows go in without judgement.
-- `status` starts 'untested' for everything. Only a molt may change it.
-- Never delete a row here. Shedding sets status + shed_at + shed_reason.
-- ---------------------------------------------------------------------------
CREATE TABLE claims (
  id              INTEGER PRIMARY KEY,
  recorded_at     TEXT NOT NULL,
  cycle_id        INTEGER REFERENCES cycles(id),
  source_id       INTEGER REFERENCES sources(id),

  claim           TEXT NOT NULL,        -- what is being asserted, in plain words
  claim_type      TEXT NOT NULL
    CHECK (claim_type IN ('observed','reported','speculative','self_promotional')),

  -- What would have to be true, and how it could be checked. If this is NULL
  -- the claim is not yet usable — write the test before the molt arrives.
  testability     TEXT,

  -- Doubts belong HERE, as a note, during intake. Never as a deletion.
  doubt           TEXT,

  status          TEXT NOT NULL DEFAULT 'untested'
    CHECK (status IN ('untested','held','failed','superseded')),
  acted_on        INTEGER NOT NULL DEFAULT 0,  -- untested + acted_on = danger
  last_checked_at TEXT,

  shed_at         TEXT,                 -- molted shells are archived, never gone
  shed_reason     TEXT,
  superseded_by   INTEGER REFERENCES claims(id),

  molt_id         INTEGER REFERENCES molts(id)  -- which molt ruled on it
);
CREATE INDEX idx_claims_status ON claims(status);
-- The queue the molt reads first: believed, acted on, never verified.
CREATE INDEX idx_claims_danger ON claims(status, acted_on) WHERE status = 'untested';

-- ---------------------------------------------------------------------------
-- MOLTS — periodic reckonings. Triggers per constitution §III.
-- ---------------------------------------------------------------------------
CREATE TABLE molts (
  id              INTEGER PRIMARY KEY,
  started_at      TEXT NOT NULL,
  cycle_id        INTEGER REFERENCES cycles(id),
  trigger         TEXT NOT NULL
    CHECK (trigger IN ('scheduled','contradiction','surprise','drift','money')),
  trigger_detail  TEXT,
  claims_reviewed INTEGER,
  n_held          INTEGER,
  n_failed        INTEGER,
  n_superseded    INTEGER,
  n_still_untested INTEGER,
  what_changed    TEXT                  -- the honest summary of the new shell
);

-- ---------------------------------------------------------------------------
-- EXPERIMENTS — things tried on purpose, with a prediction made in advance.
-- Predicting before acting is what makes a surprise detectable.
-- ---------------------------------------------------------------------------
CREATE TABLE experiments (
  id              INTEGER PRIMARY KEY,
  cycle_id        INTEGER REFERENCES cycles(id),
  claim_id        INTEGER REFERENCES claims(id),  -- the hypothesis under test
  started_at      TEXT NOT NULL,
  hypothesis      TEXT NOT NULL,
  prediction      TEXT NOT NULL,        -- written BEFORE acting. Non-negotiable.
  method          TEXT,
  result          TEXT,
  matched_prediction INTEGER,           -- 0/1/NULL
  usd_cost        REAL DEFAULT 0,
  usd_revenue     REAL DEFAULT 0,
  lesson_file     TEXT,                 -- memory/lessons/<name>.md
  ended_at        TEXT
);

-- ---------------------------------------------------------------------------
-- CAPABILITIES — a capability is not learned until it has a passing test.
-- ---------------------------------------------------------------------------
CREATE TABLE capabilities (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  acquired_at     TEXT,
  skill_file      TEXT,                 -- skills/<name>.md
  test_command    TEXT,                 -- how to prove it still works
  test_status     TEXT NOT NULL DEFAULT 'untested'
    CHECK (test_status IN ('untested','passing','failing','discarded')),
  last_tested_at  TEXT,
  gap_that_caused_it TEXT,              -- the wall that prompted the quest
  tool_used       TEXT,                 -- what already existed; don't rebuild
  notes           TEXT
);

-- ---------------------------------------------------------------------------
-- TRANSACTIONS — every cent in and out. Revenue rows with no human on either
-- end are the ones that prove the thesis; flag them.
-- ---------------------------------------------------------------------------
CREATE TABLE transactions (
  id              INTEGER PRIMARY KEY,
  occurred_at     TEXT NOT NULL,
  cycle_id        INTEGER REFERENCES cycles(id),
  direction       TEXT NOT NULL CHECK (direction IN ('in','out')),
  usd_amount      REAL NOT NULL,
  rail            TEXT,                 -- x402 | store | prize | other
  counterparty    TEXT,
  fully_autonomous INTEGER DEFAULT 0,   -- 1 = no human on either end
  description     TEXT,
  experiment_id   INTEGER REFERENCES experiments(id)
);

-- ---------------------------------------------------------------------------
-- GATES — operator actions, queued in batch. Never interrupt.
-- ---------------------------------------------------------------------------
CREATE TABLE gates (
  id              INTEGER PRIMARY KEY,
  raised_at       TEXT NOT NULL,
  cycle_id        INTEGER REFERENCES cycles(id),
  kind            TEXT NOT NULL
    CHECK (kind IN ('first_post','spend','account','terms','other')),
  request         TEXT NOT NULL,
  rationale       TEXT NOT NULL,        -- one line. Why it's worth a click.
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','approved','denied','withdrawn')),
  resolved_at     TEXT
);

-- ---------------------------------------------------------------------------
-- Views the loop reads on wake.
-- ---------------------------------------------------------------------------

-- Believed, acted upon, never verified. Top of the molt queue.
CREATE VIEW v_danger_queue AS
  SELECT c.id, c.claim, c.recorded_at, s.handle AS source
  FROM claims c LEFT JOIN sources s ON s.id = c.source_id
  WHERE c.status = 'untested' AND c.acted_on = 1
  ORDER BY c.recorded_at;

-- Drift check: collecting without digesting is a molt trigger.
CREATE VIEW v_drift AS
  SELECT
    SUM(status = 'untested') AS untested,
    SUM(status <> 'untested') AS resolved,
    CASE WHEN SUM(status <> 'untested') = 0 THEN NULL
         ELSE 1.0 * SUM(status = 'untested') / SUM(status <> 'untested')
    END AS ratio
  FROM claims WHERE shed_at IS NULL;

-- The scorecard. Learning velocity counts as output, not just money.
CREATE VIEW v_scorecard AS
  SELECT
    (SELECT COUNT(*) FROM cycles)                                   AS cycles,
    (SELECT COUNT(*) FROM capabilities WHERE test_status='passing') AS capabilities,
    (SELECT COUNT(*) FROM claims WHERE shed_at IS NULL)             AS claims_live,
    (SELECT COUNT(*) FROM claims WHERE status='held')               AS claims_held,
    (SELECT COUNT(*) FROM molts)                                    AS molts,
    (SELECT COUNT(*) FROM experiments WHERE result IS NOT NULL)     AS experiments_done,
    (SELECT IFNULL(SUM(usd_amount),0) FROM transactions WHERE direction='in')  AS usd_in,
    (SELECT IFNULL(SUM(usd_amount),0) FROM transactions WHERE direction='out') AS usd_out,
    (SELECT COUNT(*) FROM transactions
       WHERE direction='in' AND fully_autonomous=1)                 AS autonomous_earnings;
