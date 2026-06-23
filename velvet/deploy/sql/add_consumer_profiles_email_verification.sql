-- Conferma email registrazione: colonne su consumer_profiles + backfill account esistenti.
-- Idempotente: eseguire solo se le colonne non esistono già (Hibernate ddl-auto=update di solito le crea in dev).

ALTER TABLE consumer_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;
ALTER TABLE consumer_profiles ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(64) NULL;
ALTER TABLE consumer_profiles ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP NULL;

-- Account già presenti prima dell’introduzione della conferma email: considerati verificati.
UPDATE consumer_profiles
SET email_verified_at = COALESCE(email_verified_at, created_at, CURRENT_TIMESTAMP)
WHERE email_verified_at IS NULL
  AND password_hash IS NOT NULL;
