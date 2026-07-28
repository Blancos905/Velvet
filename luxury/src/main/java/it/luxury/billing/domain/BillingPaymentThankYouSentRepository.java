package it.luxury.billing.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingPaymentThankYouSentRepository extends JpaRepository<BillingPaymentThankYouSent, UUID> {

	boolean existsByStripeReference(String stripeReference);
}
