-- Colonne per registrazione Premium: email confermata ma salone non materializzato finché Stripe non completa.
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS checkout_token_hash VARCHAR(64) NULL;
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS checkout_token_expires_at TIMESTAMP NULL;
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS stripe_checkout_customer_id VARCHAR(255) NULL;
