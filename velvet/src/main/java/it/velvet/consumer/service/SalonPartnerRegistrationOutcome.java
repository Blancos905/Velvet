package it.velvet.consumer.service;

/** Esito registrazione titolare da `/piani`: email di conferma inviata oppure account già verificato. */
public record SalonPartnerRegistrationOutcome(boolean emailVerificationRequired) {
}
