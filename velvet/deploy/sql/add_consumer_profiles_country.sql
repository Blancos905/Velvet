-- Paese consumatore (ISO 3166-1 alpha-2) — registrazione cliente /registrati
ALTER TABLE consumer_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(2) NULL;
