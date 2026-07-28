package it.luxury.testsupport;

import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Allinea i saloni PREMIUM degli integration test con {@code SalonPremiumEntitlementService} quando
 * Stripe è configurato nel profilo test ({@code luxury.billing.secret-key} presente).
 */
@Component
public class PremiumEntitlementTestFixture {

	private final BillingAccountRepository billingAccountRepository;

	public PremiumEntitlementTestFixture(BillingAccountRepository billingAccountRepository) {
		this.billingAccountRepository = billingAccountRepository;
	}

	@Transactional
	public void ensureActivePremiumSubscription(StudioGroup group) {
		if (group == null || group.getId() == null) {
			throw new IllegalArgumentException("StudioGroup persistito richiesto");
		}
		String customerId = "cus_test_" + group.getId().toString().replace("-", "");
		String subscriptionId = "sub_test_" + group.getId().toString().replace("-", "");
		billingAccountRepository.findByStudioGroup_Id(group.getId()).ifPresentOrElse(account -> {
			account.setSubscriptionStatus("active");
			account.setStripeSubscriptionId(subscriptionId);
			billingAccountRepository.save(account);
		}, () -> {
			BillingAccount account = new BillingAccount(group, customerId);
			account.setStripeSubscriptionId(subscriptionId);
			account.setSubscriptionStatus("active");
			billingAccountRepository.save(account);
		});
	}
}
