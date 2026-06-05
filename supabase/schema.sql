-- ============================================================
-- MDAs Casino — Schema completo
-- Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================


-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE machines (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  photo_url   TEXT DEFAULT '',
  photo_urls  TEXT DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE machine_notes (
  id          SERIAL PRIMARY KEY,
  machine_id  INTEGER REFERENCES machines(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  author      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id                   SERIAL PRIMARY KEY,
  type                 TEXT NOT NULL DEFAULT 'falla',
  image_url            TEXT DEFAULT '',
  question_text        TEXT NOT NULL,
  correct_answer       TEXT NOT NULL,
  option_b             TEXT NOT NULL,
  option_c             TEXT NOT NULL,
  option_d             TEXT NOT NULL,
  submitted_by_display TEXT DEFAULT '',
  submitted_by_real    TEXT DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'pending',
  machine_id           INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scores (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  pts        INTEGER NOT NULL DEFAULT 0,
  correct    INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 0,
  timer_sec  INTEGER NOT NULL DEFAULT 8,
  accuracy   INTEGER NOT NULL DEFAULT 0,
  completed  BOOLEAN NOT NULL DEFAULT TRUE,
  season     TEXT NOT NULL DEFAULT 'global',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_answers (
  id           SERIAL PRIMARY KEY,
  player_name  TEXT NOT NULL,
  machine_name TEXT NOT NULL,
  correct      BOOLEAN NOT NULL DEFAULT FALSE,
  time_ms      INTEGER NOT NULL DEFAULT 0,
  pts          INTEGER NOT NULL DEFAULT 0,
  timer_sec    INTEGER NOT NULL DEFAULT 8,
  season       TEXT NOT NULL DEFAULT 'global',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE winners_history (
  id           SERIAL PRIMARY KEY,
  period_label TEXT NOT NULL DEFAULT '',
  reset_date   TEXT NOT NULL DEFAULT '',
  rank         INTEGER NOT NULL DEFAULT 1,
  player_name  TEXT NOT NULL DEFAULT '',
  pts          INTEGER NOT NULL DEFAULT 0,
  accuracy     NUMERIC(5,2) NOT NULL DEFAULT 0,
  timer_sec    INTEGER NOT NULL DEFAULT 8,
  prize        TEXT NOT NULL DEFAULT '',
  season_ref   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_scores_season_completed_pts ON scores (season, completed, pts DESC);
CREATE INDEX idx_scores_name ON scores (name);
CREATE INDEX idx_quiz_questions_status ON quiz_questions (status);
CREATE INDEX idx_quiz_questions_machine ON quiz_questions (machine_id);
CREATE INDEX idx_machine_notes_machine ON machine_notes (machine_id);
CREATE INDEX idx_quiz_answers_season ON quiz_answers (season);
CREATE INDEX idx_winners_history_rank ON winners_history (rank, id DESC);


-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('competition_active',    'false'),
  ('competition_end',       ''),
  ('prize',                 ''),
  ('current_comp_id',       ''),
  ('max_pts_5',             '1000'),
  ('max_pts_10',            '1200'),
  ('max_pts_20',            '1300'),
  ('quiz_type_mix',         '{"machine":100,"comm":0}'),
  ('question_instructions', '')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STORAGE: bucket mda-photos
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mda-photos', 'mda-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Política: lectura pública
CREATE POLICY "mda_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mda-photos');

-- Política: subida anónima
CREATE POLICY "mda_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mda-photos');

-- Política: actualización anónima
CREATE POLICY "mda_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'mda-photos');

-- Política: borrado anónimo
CREATE POLICY "mda_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'mda-photos');
