-- Luxury: rimuove tutti i dati applicativi legati a clienti, titolari e saloni (tabelle JPA).
-- Ordine rispetta i vincoli di chiave esterna (MySQL/MariaDB/H2 con FK attive).
--
-- NON tocca eventuali account esterni: qui si azzerano solo righe DB Luxury (profili, saloni, prenotazioni, …).
--
-- Esecuzione esempio (MariaDB):
--   mysql -h127.0.0.1 -uroot -p luxury < deploy/sql/reset_luxury_users_and_salons.sql
--
-- (Opzionale MySQL/MariaDB prima della transazione: SET NAMES utf8mb4;)

START TRANSACTION;

DELETE FROM scheduled_notifications;
DELETE FROM platform_reviews;
DELETE FROM reviews;
DELETE FROM appointments;
DELETE FROM salon_services;
DELETE FROM staff_operators;
DELETE FROM salon_luxury_chat_messages;
DELETE FROM salon_luxury_chat_read_state;
DELETE FROM salon_clients;
DELETE FROM favorite_locations;
DELETE FROM locations;
DELETE FROM studio_groups;
DELETE FROM consumer_profiles;

COMMIT;
