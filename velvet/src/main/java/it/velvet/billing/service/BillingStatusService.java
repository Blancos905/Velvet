package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.dto.BillingStatusDto;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.StudioGroupOwnerResolver;
import org.springframework.stereotype.Service;

@Service
public class BillingStatusService {

	private final VelvetStripeProperties stripeProperties;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StripeSubscriptionSyncService subscriptionSyncService;

	public BillingStatusService(
			VelvetStripeProperties stripeProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			org.springframework.beans.factory.ObjectProvider<StripeSubscriptionSyncService> subscriptionSyncService) {
		this.stripeProperties = stripeProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.subscriptionSyncService = subscriptionSyncService.getIfAvailable();
	}

	public BillingStatusDto resolve(VelvetUserPrincipal principal) {
		boolean enabled = stripeProperties.enabled();
		boolean configured = stripeProperties.configured();
		if (principal == null) {
			return new BillingStatusDto(enabled, configured, null, null, false, false);
		}
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(this::toDto)
				.orElseGet(() -> new BillingStatusDto(enabled, configured, null, null, false, false));
	}

	private BillingStatusDto toDto(StudioGroup group) {
		boolean premiumFromPlan = "PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()));
		if (subscriptionSyncService == null) {
			return new BillingStatusDto(
					stripeProperties.enabled(),
					stripeProperties.configured(),
					null,
					null,
					false,
					premiumFromPlan);
		}
		return subscriptionSyncService.findByStudioGroupId(group.getId())
				.map(account -> new BillingStatusDto(
						stripeProperties.enabled(),
						stripeProperties.configured(),
						account.getSubscriptionStatus(),
						account.getCurrentPeriodEnd(),
						account.isCancelAtPeriodEnd(),
						premiumFromPlan))
				.orElseGet(() -> new BillingStatusDto(
						stripeProperties.enabled(),
						stripeProperties.configured(),
						null,
						null,
						false,
						premiumFromPlan));
	}
}
