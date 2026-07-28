-- Thread chat titolare + operatore: rimuove vincolo legacy su solo salon_client_id.
-- Senza questa migrazione, il cliente non può aprire chat con un operatore dopo aver chattato col salone
-- (duplicate key idx_*_uk_salon_luxury_chat_read_salon_client).
-- Idempotente: eseguire una volta su DB già in produzione (il runner Spring fa lo stesso all'avvio).

ALTER TABLE salon_luxury_chat_read_state
  DROP CONSTRAINT IF EXISTS idx_49450_uk_salon_luxury_chat_read_salon_client;

DROP INDEX IF EXISTS idx_49450_uk_salon_luxury_chat_read_salon_client;

CREATE UNIQUE INDEX IF NOT EXISTS uq_salon_luxury_chat_read_owner_thread
  ON salon_luxury_chat_read_state (salon_client_id)
  WHERE staff_operator_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_salon_luxury_chat_read_staff_thread
  ON salon_luxury_chat_read_state (salon_client_id, staff_operator_id)
  WHERE staff_operator_id IS NOT NULL;
