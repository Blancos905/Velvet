-- Accettazione DPA Art. 28 (salone partner) su consumer_profiles.
-- MariaDB — idempotente.

ALTER TABLE consumer_profiles
    ADD COLUMN IF NOT EXISTS dpa_accepted_at TIMESTAMP NULL;

ALTER TABLE consumer_profiles
    ADD COLUMN IF NOT EXISTS dpa_document_version VARCHAR(40) NULL;
