-- Velvet: crea `consumer_profiles` per il super admin (keycloak_sub canonico) se manca,
-- copiando email e password_hash da `platform_super_admin_credential` (riga singleton).
--
-- Prerequisito: tabella `platform_super_admin_credential` con id = c0000000-0000-4000-8000-000000000001
-- e nessun altro consumer con la stessa email del super admin.
--
-- Verifica tipi colonna id (BINARY vs CHAR) prima di eseguire:
--   SHOW COLUMNS FROM consumer_profiles;
--   SHOW COLUMNS FROM platform_super_admin_credential;
--   SELECT id, username FROM platform_super_admin_credential;
--
-- Esecuzione esempio:
--   mysql -h127.0.0.1 -uUSER -p DBNAME < deploy/sql/ensure_superadmin_consumer_profile_mariadb.sql

INSERT INTO consumer_profiles (
  id,
  keycloak_sub,
  email,
  display_name,
  password_hash,
  security_roles,
  created_at
)
SELECT
  UUID(),
  'b0000000-0000-4000-8000-000000000001',
  LOWER(TRIM(c.username)),
  'Super admin',
  c.password_hash,
  'ADMIN,CLIENT',
  UTC_TIMESTAMP()
FROM platform_super_admin_credential c
WHERE c.id = 'c0000000-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1
    FROM consumer_profiles p
    WHERE p.keycloak_sub = 'b0000000-0000-4000-8000-000000000001'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM consumer_profiles p2
    WHERE LOWER(TRIM(p2.email)) = LOWER(TRIM(c.username))
  );
