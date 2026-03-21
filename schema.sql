-- ════════════════════════════════════════════════════════════════
-- NioSports Pro — Supabase PostgreSQL Schema
-- Fase 1: Base de datos relacional completa
-- ════════════════════════════════════════════════════════════════
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════════

-- ── TEAMS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,        -- 'Lakers', 'Celtics'
  full_name     TEXT NOT NULL,               -- 'Los Angeles Lakers'
  abbreviation  TEXT NOT NULL UNIQUE,        -- 'LAL'
  conference    TEXT NOT NULL DEFAULT '',     -- 'West', 'East'
  division      TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAMES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id              TEXT PRIMARY KEY,            -- external API id or 'YYYY-MM-DD-HOME-AWAY'
  date            DATE NOT NULL,
  home_team_id    INT REFERENCES teams(id),
  away_team_id    INT REFERENCES teams(id),
  status          TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, live, final
  home_score      INT,
  away_score      INT,
  q1_home         INT,
  q1_away         INT,
  q2_home         INT,
  q2_away         INT,
  q3_home         INT,
  q3_away         INT,
  q4_home         INT,
  q4_away         INT,
  q1_total        INT GENERATED ALWAYS AS (COALESCE(q1_home,0) + COALESCE(q1_away,0)) STORED,
  half_total      INT GENERATED ALWAYS AS (COALESCE(q1_home,0) + COALESCE(q1_away,0) + COALESCE(q2_home,0) + COALESCE(q2_away,0)) STORED,
  full_total      INT GENERATED ALWAYS AS (COALESCE(home_score,0) + COALESCE(away_score,0)) STORED,
  start_time      TEXT,                       -- '19:30 ET'
  arena           TEXT,
  external_id     TEXT,                       -- BallDontLie game id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_home ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away ON games(away_team_id);

-- ── TEAM STATS (rolling, pre-computed) ────────────────────────
CREATE TABLE IF NOT EXISTS team_stats (
  id              SERIAL PRIMARY KEY,
  team_id         INT NOT NULL REFERENCES teams(id),
  date            DATE NOT NULL,               -- stats as-of this date (pre-game)
  pace            REAL,
  ortg            REAL,                        -- offensive rating per 100 poss
  drtg            REAL,                        -- defensive rating per 100 poss
  efg_pct         REAL,
  tov_rate        REAL,
  orb_rate        REAL,
  ft_rate         REAL,
  pts_per_game    REAL,
  opp_pts_per_game REAL,
  q1_avg          REAL,
  half_avg        REAL,
  full_avg        REAL,
  q1_home_avg     REAL,
  q1_away_avg     REAL,
  half_home_avg   REAL,
  half_away_avg   REAL,
  full_home_avg   REAL,
  full_away_avg   REAL,
  last5_total     REAL,
  last10_total    REAL,
  season_total    REAL,
  games_played    INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, date)
);

CREATE INDEX IF NOT EXISTS idx_team_stats_team_date ON team_stats(team_id, date DESC);

-- ── ODDS SNAPSHOTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odds_snapshots (
  id              SERIAL PRIMARY KEY,
  game_id         TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,               -- 'Q1', 'HALF', 'FULL'
  line            REAL NOT NULL,
  bookmaker       TEXT NOT NULL DEFAULT 'consensus',
  over_odds       INT,                         -- american odds e.g. -110
  under_odds      INT,
  snapshot_type   TEXT NOT NULL DEFAULT 'current', -- 'opening', 'current', 'closing'
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odds_game_period ON odds_snapshots(game_id, period, snapshot_type);

-- ── PREDICTIONS (model output) ────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id              SERIAL PRIMARY KEY,
  game_id         TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,               -- 'Q1', 'HALF', 'FULL'
  projection      REAL NOT NULL,
  line            REAL,
  direction       TEXT NOT NULL,               -- 'OVER', 'UNDER'
  probability     REAL NOT NULL,               -- 0-1 calibrated
  probability_pct REAL NOT NULL,               -- 0-100
  confidence      TEXT NOT NULL,               -- 'HIGH', 'MEDIUM', 'LOW'
  edge            REAL,
  ev              REAL,
  ev_percent      REAL,
  is_value_bet    BOOLEAN DEFAULT FALSE,
  z_score         REAL,
  total_adjustment REAL DEFAULT 0,
  top_factors     JSONB DEFAULT '[]'::jsonb,
  model_version   TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'live', -- 'live', 'backtest'
  result          TEXT,                        -- 'win', 'loss', 'push', null
  actual_total    INT,
  model_error     REAL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pred_game ON predictions(game_id, period);
CREATE INDEX IF NOT EXISTS idx_pred_result ON predictions(result, source);
CREATE INDEX IF NOT EXISTS idx_pred_created ON predictions(created_at DESC);

-- ── USER PICKS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS picks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,               -- Firebase UID
  prediction_id   INT REFERENCES predictions(id),
  game_id         TEXT REFERENCES games(id),
  home_team       TEXT NOT NULL,
  away_team       TEXT NOT NULL,
  period          TEXT NOT NULL,
  bet_type        TEXT NOT NULL,               -- 'OVER', 'UNDER'
  line            REAL NOT NULL,
  projection      REAL,
  probability     REAL,
  probability_pct REAL,
  confidence      TEXT,
  edge            REAL,
  ev_percent      REAL,
  odds            INT DEFAULT -110,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, win, loss, push
  closing_line    REAL,
  clv             REAL,
  actual_total    REAL,
  model_error     REAL,
  did_bet         BOOLEAN DEFAULT FALSE,
  bet_amount      REAL,
  is_combo        BOOLEAN DEFAULT FALSE,
  combo_line      TEXT,
  note            TEXT,
  model_version   TEXT,
  source          TEXT DEFAULT 'manual',        -- 'manual', 'ai', 'backtest'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_picks_user ON picks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_picks_status ON picks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_picks_game ON picks(game_id);

-- ── BANKROLL ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bankroll_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  type            TEXT NOT NULL,               -- deposit, withdraw, bet_win, bet_loss, bet_push
  amount          REAL NOT NULL,
  balance         REAL NOT NULL,
  pick_id         UUID REFERENCES picks(id),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bankroll_user ON bankroll_transactions(user_id, created_at DESC);

-- ── USER PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id              TEXT PRIMARY KEY,             -- Firebase UID
  email           TEXT,
  display_name    TEXT,
  plan            TEXT NOT NULL DEFAULT 'free', -- free, pro, elite
  stripe_customer_id TEXT,
  plan_expires_at TIMESTAMPTZ,
  experience_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, expert
  default_odds    INT DEFAULT -110,
  initial_bankroll REAL DEFAULT 0,
  current_bankroll REAL DEFAULT 0,
  onboarding_done BOOLEAN DEFAULT FALSE,
  theme           TEXT DEFAULT 'dark',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MODEL VERSIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_versions (
  id              SERIAL PRIMARY KEY,
  version         TEXT NOT NULL UNIQUE,
  description     TEXT,
  trained_at      TIMESTAMPTZ,
  metrics         JSONB DEFAULT '{}'::jsonb,    -- {mae, win_rate, calibration_ece, ...}
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert current heuristic model version
INSERT INTO model_versions (version, description, is_active)
VALUES ('2.0.0', 'Motor heurístico: promedios ponderados + ajustes contextuales + distribución normal', TRUE)
ON CONFLICT (version) DO NOTHING;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Picks: users only see their own
CREATE POLICY picks_user_select ON picks FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY picks_user_insert ON picks FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY picks_user_update ON picks FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY picks_user_delete ON picks FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Bankroll: users only see their own
CREATE POLICY bankroll_user_select ON bankroll_transactions FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY bankroll_user_insert ON bankroll_transactions FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Profiles: users only see their own
CREATE POLICY profile_user_select ON user_profiles FOR SELECT USING (id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY profile_user_all ON user_profiles FOR ALL USING (id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Public read for: teams, games, predictions (track record), model_versions
-- These don't need RLS - they're public data

-- ── HELPER FUNCTIONS ──────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════
-- SEED: NBA Teams
-- ════════════════════════════════════════════════════════════════
INSERT INTO teams (name, full_name, abbreviation, conference, division) VALUES
('Celtics', 'Boston Celtics', 'BOS', 'East', 'Atlantic'),
('Nets', 'Brooklyn Nets', 'BKN', 'East', 'Atlantic'),
('Knicks', 'New York Knicks', 'NYK', 'East', 'Atlantic'),
('76ers', 'Philadelphia 76ers', 'PHI', 'East', 'Atlantic'),
('Raptors', 'Toronto Raptors', 'TOR', 'East', 'Atlantic'),
('Bulls', 'Chicago Bulls', 'CHI', 'East', 'Central'),
('Cavaliers', 'Cleveland Cavaliers', 'CLE', 'East', 'Central'),
('Pistons', 'Detroit Pistons', 'DET', 'East', 'Central'),
('Pacers', 'Indiana Pacers', 'IND', 'East', 'Central'),
('Bucks', 'Milwaukee Bucks', 'MIL', 'East', 'Central'),
('Hawks', 'Atlanta Hawks', 'ATL', 'East', 'Southeast'),
('Hornets', 'Charlotte Hornets', 'CHA', 'East', 'Southeast'),
('Heat', 'Miami Heat', 'MIA', 'East', 'Southeast'),
('Magic', 'Orlando Magic', 'ORL', 'East', 'Southeast'),
('Wizards', 'Washington Wizards', 'WAS', 'East', 'Southeast'),
('Nuggets', 'Denver Nuggets', 'DEN', 'West', 'Northwest'),
('Timberwolves', 'Minnesota Timberwolves', 'MIN', 'West', 'Northwest'),
('Thunder', 'Oklahoma City Thunder', 'OKC', 'West', 'Northwest'),
('Trail Blazers', 'Portland Trail Blazers', 'POR', 'West', 'Northwest'),
('Jazz', 'Utah Jazz', 'UTA', 'West', 'Northwest'),
('Warriors', 'Golden State Warriors', 'GSW', 'West', 'Pacific'),
('Clippers', 'Los Angeles Clippers', 'LAC', 'West', 'Pacific'),
('Lakers', 'Los Angeles Lakers', 'LAL', 'West', 'Pacific'),
('Suns', 'Phoenix Suns', 'PHX', 'West', 'Pacific'),
('Kings', 'Sacramento Kings', 'SAC', 'West', 'Pacific'),
('Mavericks', 'Dallas Mavericks', 'DAL', 'West', 'Southwest'),
('Rockets', 'Houston Rockets', 'HOU', 'West', 'Southwest'),
('Grizzlies', 'Memphis Grizzlies', 'MEM', 'West', 'Southwest'),
('Pelicans', 'New Orleans Pelicans', 'NOP', 'West', 'Southwest'),
('Spurs', 'San Antonio Spurs', 'SAS', 'West', 'Southwest')
ON CONFLICT (name) DO NOTHING;
