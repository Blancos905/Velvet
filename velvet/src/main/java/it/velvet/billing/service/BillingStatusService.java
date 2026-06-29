package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.dto.BillingStatusDto;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.StudioGroupOwnerResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class BillingStatusService {

	private final VelvetStripeProperties stripeProperties;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final SalonBillingProfileService salonBillingProfileService;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;
	private final SalonSubscriptionLifecycleService subscriptionLifecycleService;
	private final SalonPromotionalTrialService promotionalTrialService;
	private final StripeSubscriptionSyncService subscriptionSyncService;

	@Value("${velvet.billing.cancelled-subscription-deletion-days:30}")
	private int cancelledSubscriptionDeletionDays;

	public BillingStatusService(
			VelvetStripeProperties stripeProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			SalonBillingProfileService salonBillingProfileService,
			SalonPremiumEntitlementService salonPremiumEntitlementService,
			SalonSubscriptionLifecycleService subscriptionLifecycleService,
			SalonPromotionalTrialService promotionalTrialService,
			org.springframework.beans.factory.ObjectProvider<StripeSubscriptionSyncService> subscriptionSyncService) {
		this.stripeProperties = stripeProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.salonBillingProfileService = salonBillingProfileService;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
		this.subscriptionLifecycleService = subscriptionLifecycleService;
		this.promotionalTrialService = promotionalTrialService;
		this.subscriptionSyncService = subscriptionSyncService.getIfAvailable();
	}

	public BillingStatusDto resolve(VelvetUserPrincipal principal) {
		boolean enabled = stripeProperties.enabled();
		boolean configured = stripeProperties.configured();
		if (principal == null) {
			return emptyDto(enabled, configured);
		}
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(group -> toDto(group, principal))
				.orElseGet(() -> emptyDto(enabled, configured));
	}

	private BillingStatusDto emptyDto(boolean enabled, boolean configured) {
		return new BillingStatusDto(enabled, configured, null, null, false, false, false, null, null, null, false, false);
	}

	private BillingStatusDto toDto(StudioGroup group, VelvetUserPrincipal principal) {
		boolean premiumAccess = salonPremiumEntitlementService.hasActivePremium(group);
		boolean profileComplete = salonBillingProfileService.isProfileComplete(principal);
		Instant promotionalTrialEndsAt = promotionalTrialService.promotionalTrialEndsAt(group);
		boolean promotionalTrialActive = promotionalTrialService.isWithinPromotionalTrial(group, Instant.now());
		boolean subscriptionActivationRequired = isSubscriptionActivationRequired(group, premiumAccess);
		if (subscriptionSyncService == null) {
			return new BillingStatusDto(
					stripeProperties.enabled(),
					stripeProperties.configured(),
					null,
					null,
					false,
					premiumAccess,
					profileComplete,
					null,
					null,
					promotionalTrialEndsAt,
					promotionalTrialActive,
					subscriptionActivationRequired);
		}
		return subscriptionSyncService.findByStudioGroupId(group.getId())
				.map(account -> fromAccount(
						account,
						group,
						premiumAccess,
						profileComplete,
						promotionalTrialEndsAt,
						promotionalTrialActive,
						subscriptionActivationRequired))
				.orElseGet(() -> new BillingStatusDto(
						stripeProperties.enabled(),
						stripeProperties.configured(),
						null,
						null,
						false,
						premiumAccess,
						profileComplete,
						null,
						null,
						promotionalTrialEndsAt,
						promotionalTrialActive,
						subscriptionActivationRequired));
	}

	private boolean isSubscriptionActivationRequired(StudioGroup group, boolean premiumAccess) {
		if (premiumAccess) {
			return false;
		}
		return "PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()));
	}

	private BillingStatusDto fromAccount(
			BillingAccount account,
			StudioGroup group,
			boolean premiumAccess,
			boolean profileComplete,
			Instant promotionalTrialEndsAt,
			boolean promotionalTrialActive,
			boolean subscriptionActivationRequired) {
		Instant cancelRequestedAt = account.getSubscriptionCancelRequestedAt();
		Instant deletionScheduledAt = subscriptionLifecycleService.accountDeletionScheduledAt(
				account,
				cancelledSubscriptionDeletionDays);
		return new BillingStatusDto(
				stripeProperties.enabled(),
				stripeProperties.configured(),
				account.getSubscriptionStatus(),
				account.getCurrentPeriodEnd(),
				account.isCancelAtPeriodEnd(),
				premiumAccess,
				profileComplete,
				cancelRequestedAt,
				deletionScheduledAt,
				promotionalTrialEndsAt,
				promotionalTrialActive,
				subscriptionActivationRequired);
	}
}
