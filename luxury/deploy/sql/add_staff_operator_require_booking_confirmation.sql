-- Preferenza operatore: conferma obbligatoria prenotazioni cliente (default TRUE = alert Accetta/Rifiuta).
-- Idempotente via SchemaAlignmentRunner; questo script è per ambienti gestiti a mano.

ALTER TABLE staff_operators
  ADD COLUMN IF NOT EXISTS require_booking_confirmation BOOLEAN NOT NULL DEFAULT TRUE;
