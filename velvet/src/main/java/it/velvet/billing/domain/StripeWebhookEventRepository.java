package it.velvet.billing.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StripeWebhookEventRepository extends JpaRepository<StripeWebhookEvent, UUID> {

	boolean existsByStripeEventId(String stripeEventId);

	Optional<StripeWebhookEvent> findByStripeEventId(String stripeEventId);
}
