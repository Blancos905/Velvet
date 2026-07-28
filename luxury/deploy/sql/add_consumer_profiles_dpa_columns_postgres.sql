-- Accettazione DPA Art. 28 (salone partner) su consumer_profiles.
-- PostgreSQL — idempotente.

ALTER TABLE consumer_profiles
    ADD COLUMN IF NOT EXISTS dpa_accepted_at TIMESTAMPTZ NULL;

ALTER TABLE consumer_profiles
    ADD COLUMN IF NOT EXISTS dpa_document_version VARCHAR(40) NULL;
