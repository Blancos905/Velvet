package it.luxury.publicapi.dto;

/** Espone al frontend se la registrazione Premium richiede checkout Stripe. */
public record SalonBillingRegistrationPolicyDto(boolean premiumCheckoutRequired) {
}
