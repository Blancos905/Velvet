-- PostgreSQL: rinomina tabelle chat B2C (ex salon_velvet_chat_*).

ALTER TABLE salon_velvet_chat_messages RENAME TO salon_luxury_chat_messages;
ALTER TABLE salon_velvet_chat_read_state RENAME TO salon_luxury_chat_read_state;
