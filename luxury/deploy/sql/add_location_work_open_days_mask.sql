-- Giorni di apertura sede: bitmask lun=bit0 … dom=bit6 (127 = tutti i giorni).
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS work_open_days_mask INT NOT NULL DEFAULT 127;
