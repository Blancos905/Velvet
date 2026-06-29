-- Orari lavoro operatori e pausa pranzo sede (Hibernate ddl-auto=update di solito le crea già).
-- Idempotente: eseguire solo se le colonne non esistono.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS work_morning_end_minute_of_day INT NULL;

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS work_afternoon_start_minute_of_day INT NULL;

ALTER TABLE staff_operators
  ADD COLUMN IF NOT EXISTS work_morning_start_minute_of_day INT NULL;

ALTER TABLE staff_operators
  ADD COLUMN IF NOT EXISTS work_morning_end_minute_of_day INT NULL;

ALTER TABLE staff_operators
  ADD COLUMN IF NOT EXISTS work_afternoon_start_minute_of_day INT NULL;

ALTER TABLE staff_operators
  ADD COLUMN IF NOT EXISTS work_afternoon_end_minute_of_day INT NULL;
