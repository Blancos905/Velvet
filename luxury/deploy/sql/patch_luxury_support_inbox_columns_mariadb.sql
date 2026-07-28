-- Allinea colonne per inbox assistenza / richieste dai saloni (Spring 2026).
-- Esegui su MariaDB/MySQL se vedi errori tipo «Unknown column …» su /api/v1/me/notifications o /api/v1/me/support/requests.
-- Se la colonna esiste già, MariaDB segnala errore 1060: ignora quella riga o controlla prima INFORMATION_SCHEMA.

ALTER TABLE consumer_profiles
	ADD COLUMN notification_inbox_ack_support_request_at TIMESTAMP NULL;

ALTER TABLE scheduled_notifications
	ADD COLUMN support_request_from_salon TINYINT(1) NULL;
