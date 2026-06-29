-- Registrazioni in attesa di conferma email (nessun consumer_profiles finché non confermate).
CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(120) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    payload_json TEXT NOT NULL,
    display_name VARCHAR(200) NULL,
    verification_token_hash VARCHAR(64) NULL,
    verification_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    CONSTRAINT uq_pending_registrations_email UNIQUE (email)
);
