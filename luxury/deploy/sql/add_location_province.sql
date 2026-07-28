-- Provincia sede (sigla, es. MI) da registrazione /piani.
-- Idempotente: eseguire solo se la colonna non esiste (Hibernate ddl-auto=update di solito la crea già).
ALTER TABLE locations
	ADD COLUMN province VARCHAR(5) NULL;
