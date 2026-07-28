-- Idempotenza email conferma pagamento abbonamento (Hibernate ddl-auto=update di solito crea già la tabella).
CREATE TABLE IF NOT EXISTS billing_payment_thank_you_sent (
    id UUID PRIMARY KEY,
    stripe_reference VARCHAR(128) NOT NULL,
    studio_group_id UUID NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_billing_payment_thank_you_stripe_ref UNIQUE (stripe_reference)
);
