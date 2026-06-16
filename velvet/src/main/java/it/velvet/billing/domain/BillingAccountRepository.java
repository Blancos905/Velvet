package it.velvet.billing.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BillingAccountRepository extends JpaRepository<BillingAccount, UUID> {

	Optional<BillingAccount> findByStudioGroup_Id(UUID studioGroupId);

	Optional<BillingAccount> findByStripeCustomerId(String stripeCustomerId);

	Optional<BillingAccount> findByStripeSubscriptionId(String stripeSubscriptionId);
}
