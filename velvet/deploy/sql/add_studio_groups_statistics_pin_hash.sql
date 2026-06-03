-- PIN statistiche (Premium): hash bcrypt scelto in registrazione titolare.
-- Idempotente: eseguire solo se la colonna non esiste (Hibernate ddl-auto=update di solito la crea già).

ALTER TABLE studio_groups ADD COLUMN statistics_pin_hash VARCHAR(120) NULL;
