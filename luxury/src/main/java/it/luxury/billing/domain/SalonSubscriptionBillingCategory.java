package it.luxury.billing.domain;

import java.util.Locale;
import java.util.Set;

/**
 * Segmentazione abbonamento Stripe per il pannello super admin (saloni non provider).
 */
public enum SalonSubscriptionBillingCategory {
	PAYING,
	TRIAL,
	CANCELLED;

	private static final Set<String> PAYING_STATUSES = Set.of("active", "past_due");
	private static final Set<String> TERMINAL_STATUSES = Set.of("canceled", "unpaid", "incomplete_expired");

	public static SalonSubscriptionBillingCategory fromBillingAccount(BillingAccount account) {
		if (account == null) {
			return null;
		}
		return fromFields(account.getSubscriptionStatus(), account.isCancelAtPeriodEnd());
	}

	public static SalonSubscriptionBillingCategory fromFields(String subscriptionStatus, boolean cancelAtPeriodEnd) {
		if (cancelAtPeriodEnd) {
			return CANCELLED;
		}
		String status = normalizeStatus(subscriptionStatus);
		if (status == null) {
			return null;
		}
		if (TERMINAL_STATUSES.contains(status)) {
			return CANCELLED;
		}
		if ("trialing".equals(status)) {
			return TRIAL;
		}
		if (PAYING_STATUSES.contains(status)) {
			return PAYING;
		}
		return null;
	}

	public static SalonSubscriptionBillingCategory parseFilter(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			return valueOf(raw.trim().toUpperCase(Locale.ROOT));
		}
		catch (IllegalArgumentException ex) {
			return null;
		}
	}

	private static String normalizeStatus(String status) {
		return status != null ? status.trim().toLowerCase(Locale.ROOT) : null;
	}
}
