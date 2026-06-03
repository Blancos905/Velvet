-- Associazione servizi ↔ operatori (prenotazione pubblica filtrata per servizio).
-- Idempotente: Hibernate ddl-auto=update di solito crea già salon_service_operators.

CREATE TABLE IF NOT EXISTS salon_service_operators (
    service_id UUID NOT NULL,
    operator_id UUID NOT NULL,
    PRIMARY KEY (service_id, operator_id)
);
