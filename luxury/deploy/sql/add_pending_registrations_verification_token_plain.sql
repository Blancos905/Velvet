-- Token conferma email in chiaro (solo pending, per reinvio senza invalidare link attivo).
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS verification_token_plain VARCHAR(64) NULL;
-- Token checkout Premium in chiaro (reinvio / conferma idempotente).
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS checkout_token_plain VARCHAR(64) NULL;
