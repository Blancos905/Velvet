package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccount;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Set;

/** Traccia disdetta abbonamento e calcola scadenze per cancellazione profilo salone. */
@Service
public class SalonSubscriptionLifecycleService {

	private static final Set<String> ACTIVE_PREMIUM_STATUSES = Set.of("active", "trialing", "past_due");

	/**
	 * Aggiorna timestamp disdetta in base al delta di {@code cancelAtPeriodEnd} e allo stato abbonamento.
	 *
	 * @param wasCancelAtPeriodEnd valore prima della sync Stripe
	 */
	public void onSubscriptionSynced(BillingAccount account, boolean wasCancelAtPeriodEnd) {
		if (account == null) {
			return;
		}
		boolean nowCancelAtPeriodEnd = account.isCancelAtPeriodEnd();
		String status = normalizeStatus(account.getSubscriptionStatus());

		if (!wasCancelAtPeriodEnd && nowCancelAtPeriodEnd) {
			if (account.getSubscriptionCancelRequestedAt() == null) {
				account.setSubscriptionCancelRequestedAt(Instant.now());
			}
			return;
		}

		if (isReactivated(wasCancelAtPeriodEnd, nowCancelAtPeriodEnd, status)) {
			account.setSubscriptionCancelRequestedAt(null);
		}
	}

	public boolean isPendingCancellation(BillingAccount account) {
		return account != null && account.getSubscriptionCancelRequestedAt() != null;
	}

	/** Data prevista cancellazione profilo se la disdetta non viene revocata. */
	public Instant accountDeletionScheduledAt(BillingAccount account, int graceDaysAfterPeriodEnd) {
		if (account == null || account.getSubscriptionCancelRequestedAt() == null) {
			return null;
		}
		Instant periodEnd = account.getCurrentPeriodEnd();
		if (periodEnd == null || graceDaysAfterPeriodEnd <= 0) {
			return null;
		}
		return periodEnd.plus(graceDaysAfterPeriodEnd, ChronoUnit.DAYS);
	}

	public boolean isEligibleForAutomaticDeletion(BillingAccount account, int graceDaysAfterPeriodEnd, Instant now) {
		if (account == null || account.getSubscriptionCancelRequestedAt() == null) {
			return false;
		}
		Instant deletionAt = accountDeletionScheduledAt(account, graceDaysAfterPeriodEnd);
		return deletionAt != null && !deletionAt.isAfter(now);
	}

	private static boolean isReactivated(boolean wasCancelAtPeriodEnd, boolean nowCancelAtPeriodEnd, String status) {
		if (wasCancelAtPeriodEnd && !nowCancelAtPeriodEnd) {
			return true;
		}
		return status != null && ACTIVE_PREMIUM_STATUSES.contains(status) && !nowCancelAtPeriodEnd;
	}

	private static String normalizeStatus(String status) {
		return status != null ? status.trim().toLowerCase(Locale.ROOT) : null;
	}
}
