-- Rinomina tabelle chat B2C: brand Saloni Luxury (ex salon_velvet_chat_*).
-- Eseguire una sola volta su DB già in produzione con le tabelle legacy.

RENAME TABLE salon_velvet_chat_messages TO salon_luxury_chat_messages;
RENAME TABLE salon_velvet_chat_read_state TO salon_luxury_chat_read_state;
