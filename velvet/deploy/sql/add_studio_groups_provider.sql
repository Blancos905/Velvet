-- Saloni provider: flag impostato dal super admin in creazione.
ALTER TABLE studio_groups ADD COLUMN provider TINYINT(1) NOT NULL DEFAULT 0;

-- Se esiste già la colonna legacy beta_tester:
-- UPDATE studio_groups SET provider = 1 WHERE beta_tester = 1;
