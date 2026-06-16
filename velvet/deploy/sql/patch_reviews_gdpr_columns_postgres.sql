-- Colonne recensioni: moderazione (hidden_at) e distacco identità GDPR (reviewer_identity_detached).
-- PostgreSQL / schema c1velvet — idempotente.

ALTER TABLE c1velvet.reviews
    ADD COLUMN IF NOT EXISTS reviewer_identity_detached BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE c1velvet.reviews
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ NULL;
