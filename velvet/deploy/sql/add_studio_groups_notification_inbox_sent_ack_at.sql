-- Centro notifiche titolare: istante fino al quale le email inviate sono considerate "già consultate" in UI.
-- Idempotente: eseguire solo se la colonna non esiste (Hibernate ddl-auto=update di solito la crea già).

ALTER TABLE studio_groups ADD COLUMN notification_inbox_sent_ack_at TIMESTAMP NULL;
