-- Timestamp disdetta abbonamento Premium (Hibernate ddl-auto=update di solito crea già la colonna).
-- Idempotente: eseguire solo se la colonna non esiste.
ALTER TABLE billing_accounts ADD COLUMN subscription_cancel_requested_at TIMESTAMP NULL;
