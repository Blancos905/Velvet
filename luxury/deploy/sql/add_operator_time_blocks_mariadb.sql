-- Blocchi orario personali operatore (impegni, indisponibilità).
-- Idempotente: eseguire solo se la tabella non esiste.

CREATE TABLE IF NOT EXISTS operator_time_blocks (
  id BINARY(16) NOT NULL PRIMARY KEY,
  operator_id BINARY(16) NOT NULL,
  starts_at TIMESTAMP(6) NOT NULL,
  ends_at TIMESTAMP(6) NOT NULL,
  note VARCHAR(500) NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_operator_time_blocks_operator FOREIGN KEY (operator_id) REFERENCES staff_operators (id)
);

CREATE INDEX IF NOT EXISTS idx_operator_time_blocks_operator_range
  ON operator_time_blocks (operator_id, starts_at, ends_at);
