-- Blocchi orario personali operatore (impegni, indisponibilità).
-- Idempotente: eseguire solo se la tabella non esiste.

CREATE TABLE IF NOT EXISTS operator_time_blocks (
  id UUID NOT NULL PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES staff_operators (id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  note VARCHAR(500) NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_time_blocks_operator_range
  ON operator_time_blocks (operator_id, starts_at, ends_at);
