-- Registro server-side scelte cookie (ePrivacy / prova consenso).
-- MariaDB / MySQL — idempotente.

CREATE TABLE IF NOT EXISTS cookie_consent_events (
    id CHAR(36) NOT NULL PRIMARY KEY,
    visitor_id CHAR(36) NOT NULL,
    profile_id CHAR(36) NULL,
    consent_version INT NOT NULL,
    policy_version VARCHAR(32) NULL,
    action VARCHAR(32) NOT NULL,
    maps_allowed TINYINT(1) NOT NULL,
    editorial_allowed TINYINT(1) NOT NULL,
    decided_at TIMESTAMP NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(512) NULL,
    INDEX idx_cookie_consent_events_visitor_id (visitor_id),
    INDEX idx_cookie_consent_events_profile_id (profile_id),
    INDEX idx_cookie_consent_events_recorded_at (recorded_at)
);
