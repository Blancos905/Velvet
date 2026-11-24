-- Immagine profilo cliente (data URL compresso). PostgreSQL — idempotente.
ALTER TABLE consumer_profiles
    ADD COLUMN IF NOT EXISTS photo_data_url TEXT NULL;
