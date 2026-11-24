-- Spazio a pagamento in home ricerca («Saloni sponsorizzati»). Non è una classifica.
-- Idempotente solo se la colonna non esiste già (in sviluppo Hibernate ddl-auto=update la crea dall'entità).
ALTER TABLE locations
	ADD COLUMN sponsored_placement BOOLEAN NOT NULL DEFAULT FALSE;
