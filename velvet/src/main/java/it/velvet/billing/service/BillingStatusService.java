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
	private final SalonBillingProfileService salonBillingProfileService;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;
	private final StripeSubscriptionSyncService subscriptionSyncService;

	public BillingStatusService(
			VelvetStripeProperties stripeProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			SalonBillingProfileService salonBillingProfileService,
			SalonPremiumEntitlementService salonPremiumEntitlementService,
			org.springframework.beans.factory.ObjectProvider<StripeSubscriptionSyncService> subscriptionSyncService) {
		this.stripeProperties = stripeProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.salonBillingProfileService = salonBillingProfileService;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
		this.subscriptionSyncService = subscriptionSyncService.getIfAvailable();
	}

	public BillingStatusDto resolve(VelvetUserPrincipal principal) {
		boolean enabled = stripeProperties.enabled();
		boolean configured = stripeProperties.configured();
		if (principal == null) {
			return new BillingStatusDto(enabled, configured, null, null, false, false, false);
		}
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(group -> toDto(group, principal))
				.orElseGet(() -> new BillingStatusDto(enabled, configured, null, null, false, false, false));
	}

	private BillingStatusDto toDto(StudioGroup group, VelvetUserPrincipal principal) {
		boolean premiumAccess = salonPremiumEntitlementService.hasActivePremium(group);
		boolean profileComplete = salonBillingProfileService.isProfileComplete(principal);
		if (subscriptionSyncService == null) {
			return new BillingStatusDto(
					stripeProperties.enabled(),
					stripeProperties.configured(),
					null,
					null,
					false,
					premiumAccess,
					profileComplete);
		}
		return subscriptionSyncService.findByStudioGroupId(group.getId())
				.map(account -> new BillingStatusDto(
						stripeProperties.enabled(),
						stripeProperties.configured(),
						account.getSubscriptionStatus(),
						account.getCurrentPeriodEnd(),
						account.isCancelAtPeriodEnd(),
						premiumAccess,
						profileComplete))
				.orElseGet(() -> new BillingStatusDto(
						stripeProperties.enabled(),
						stripeProperties.configured(),
						null,
						null,
						false,
						premiumAccess,
						profileComplete));
	}
}
