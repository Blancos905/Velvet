package it.velvet.billing.dto;

import java.time.Instant;

public record BillingStatusDto(
		boolean billingEnabled,
		boolean configured,
		String subscriptionStatus,
		Instant currentPeriodEnd,
		boolean cancelAtPeriodEnd,
		boolean premiumAccess,
		boolean billingProfileComplete,
		Instant subscriptionCancelRequestedAt,
		Instant accountDeletionScheduledAt,
		Instant promotionalTrialEndsAt,
		boolean promotionalTrialActive,
		boolean subscriptionActivationRequired) {
}
