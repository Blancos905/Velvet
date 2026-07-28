ALTER TABLE scheduled_notifications
  ADD COLUMN IF NOT EXISTS previous_appointment_start TIMESTAMP NULL;
