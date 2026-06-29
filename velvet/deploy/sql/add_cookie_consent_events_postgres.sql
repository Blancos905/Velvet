-- Registro server-side scelte cookie (ePrivacy / prova consenso).
-- PostgreSQL — idempotente.

CREATE TABLE IF NOT EXISTS cookie_consent_events (
    id UUID PRIMARY KEY,
    visitor_id UUID NOT NULL,
    profile_id UUID NULL,
    consent_version INT NOT NULL,
    policy_version VARCHAR(32) NULL,
    action VARCHAR(32) NOT NULL,
    maps_allowed BOOLEAN NOT NULL,
    editorial_allowed BOOLEAN NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(512) NULL
);

CREATE INDEX IF NOT EXISTS idx_cookie_consent_events_visitor_id
    ON cookie_consent_events (visitor_id);

CREATE INDEX IF NOT EXISTS idx_cookie_consent_events_profile_id
    ON cookie_consent_events (profile_id);

CREATE INDEX IF NOT EXISTS idx_cookie_consent_events_recorded_at
    ON cookie_consent_events (recorded_at);
