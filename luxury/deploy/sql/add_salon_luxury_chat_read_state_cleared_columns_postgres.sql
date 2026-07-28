-- Eliminazione chat lato utente (svuotamento «solo per me», stile app di messaggistica).
-- I messaggi precedenti restano visibili all'altra parte; nuovi messaggi ricompaiono normalmente.
-- PostgreSQL — idempotente (il runner Spring SalonLuxuryChatSchemaAlignmentRunner fa lo stesso all'avvio).

ALTER TABLE salon_luxury_chat_read_state
    ADD COLUMN IF NOT EXISTS cleared_at_client TIMESTAMPTZ NULL;

ALTER TABLE salon_luxury_chat_read_state
    ADD COLUMN IF NOT EXISTS cleared_at_owner TIMESTAMPTZ NULL;
