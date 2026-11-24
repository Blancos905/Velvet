package it.luxury.billing.service;

import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.BillingPaymentThankYouSent;
import it.luxury.billing.domain.BillingPaymentThankYouSentRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@ConditionalOnStripeBillingOperational
public class SalonBillingNotificationService {

	private final BillingAccountRepository billingAccountRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final BillingPaymentThankYouSentRepository paymentThankYouSentRepository;
	private final SalonBillingEmailDispatchService emailDispatchService;

	public SalonBillingNotificationService(
			BillingAccountRepository billingAccountRepository,
			StudioGroupRepository studioGroupRepository,
			BillingPaymentThankYouSentRepository paymentThankYouSentRepository,
			SalonBillingEmailDispatchService emailDispatchService) {
		this.billingAccountRepository = billingAccountRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.paymentThankYouSentRepository = paymentThankYouSentRepository;
		this.emailDispatchService = emailDispatchService;
	}

	@Transactional
	public void onInvoicePaid(Invoice invoice, String subscriptionId) {
		if (invoice == null || subscriptionId == null || subscriptionId.isBlank()) {
			return;
		}
		if (!"paid".equalsIgnoreCase(invoice.getStatus())) {
			return;
		}
		UUID studioGroupId = billingAccountRepository.findByStripeSubscriptionId(subscriptionId)
				.map(BillingAccount::getStudioGroupId)
				.orElse(null);
		if (studioGroupId == null) {
			return;
		}
		StudioGroup group = studioGroupRepository.findById(studioGroupId).orElse(null);
		if (group == null) {
			return;
		}
		Long amountPaid = invoice.getAmountPaid();
		if (amountPaid == null || amountPaid <= 0) {
			return;
		}
		Instant periodEnd = billingAccountRepository.findByStudioGroup_Id(studioGroupId)
				.map(BillingAccount::getCurrentPeriodEnd)
				.orElse(null);
		String dedupRef = invoice.getId() != null && !invoice.getId().isBlank()
				? "invoice:" + invoice.getId().trim()
				: "invoice-sub:" + subscriptionId;
		dispatchPaymentThankYouOnce(dedupRef, group, amountPaid, invoice.getCurrency(), periodEnd);
		Instant paidAt = resolvePaidAt(invoice);
		dispatchBillingEmailOnce(
				"receipt:" + dedupRef,
				group,
				() -> emailDispatchService.dispatchPaymentReceiptPdf(
						group, amountPaid, invoice.getCurrency(), paidAt, invoice.getId()));
	}

	private static Instant resolvePaidAt(Invoice invoice) {
		if (invoice.getStatusTransitions() != null && invoice.getStatusTransitions().getPaidAt() != null) {
			return Instant.ofEpochSecond(invoice.getStatusTransitions().getPaidAt());
		}
		if (invoice.getCreated() != null) {
			return Instant.ofEpochSecond(invoice.getCreated());
		}
		return Instant.now();
	}

	@Transactional
	public void onInvoicePaymentFailed(Invoice invoice, String subscriptionId) {
		if (invoice == null || subscriptionId == null || subscriptionId.isBlank()) {
			return;
		}
		UUID studioGroupId = billingAccountRepository.findByStripeSubscriptionId(subscriptionId)
				.map(BillingAccount::getStudioGroupId)
				.orElse(null);
		if (studioGroupId == null) {
			return;
		}
		StudioGroup group = studioGroupRepository.findById(studioGroupId).orElse(null);
		if (group == null) {
			return;
		}
		Long amountDue = invoice.getAmountDue();
		if (amountDue == null) {
			amountDue = invoice.getAmountRemaining();
		}
		long cents = amountDue != null ? amountDue : 0L;
		String dedupRef = invoice.getId() != null && !invoice.getId().isBlank()
				? "payment-failed:" + invoice.getId().trim()
				: "payment-failed-sub:" + subscriptionId;
		dispatchBillingEmailOnce(dedupRef, group, () ->
				emailDispatchService.dispatchPaymentFailed(group, cents, invoice.getCurrency()));
	}

	@Transactional
	public void onCheckoutSessionCompleted(Session session, UUID studioGroupIdHint) {
		if (session == null || session.getSubscription() == null || session.getSubscription().isBlank()) {
			return;
		}
		Long amountTotal = session.getAmountTotal();
		if (amountTotal != null && amountTotal > 0) {
			return;
		}
		UUID studioGroupId = studioGroupIdHint;
		if (studioGroupId == null) {
			studioGroupId = billingAccountRepository.findByStripeSubscriptionId(session.getSubscription())
					.map(BillingAccount::getStudioGroupId)
					.orElse(null);
		}
		if (studioGroupId == null) {
			return;
		}
		StudioGroup group = studioGroupRepository.findById(studioGroupId).orElse(null);
		if (group == null) {
			return;
		}
		Instant periodEnd = billingAccountRepository.findByStudioGroup_Id(studioGroupId)
				.map(BillingAccount::getCurrentPeriodEnd)
				.orElse(null);
		String dedupRef = session.getId() != null && !session.getId().isBlank()
				? "checkout:" + session.getId().trim()
				: "checkout-sub:" + session.getSubscription().trim();
		dispatchPaymentThankYouOnce(dedupRef, group, 0L, "eur", periodEnd);
	}

	public void onSubscriptionEvent(Subscription subscription, UUID studioGroupIdHint) {
		if (subscription == null) {
			return;
		}
		UUID studioGroupId = studioGroupIdHint;
		if (studioGroupId == null) {
			studioGroupId = billingAccountRepository.findByStripeSubscriptionId(subscription.getId())
					.map(BillingAccount::getStudioGroupId)
					.orElse(null);
		}
		if (studioGroupId == null) {
			return;
		}
		StudioGroup group = studioGroupRepository.findById(studioGroupId).orElse(null);
		if (group == null) {
			return;
		}
		BillingAccount account = billingAccountRepository.findByStudioGroup_Id(studioGroupId).orElse(null);
		boolean wasCancelAtPeriodEnd = account != null && account.isCancelAtPeriodEnd();
		boolean nowCancelAtPeriodEnd = Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd());
		String status = subscription.getStatus() != null ? subscription.getStatus().trim().toLowerCase(Locale.ROOT) : null;

		if (!wasCancelAtPeriodEnd && nowCancelAtPeriodEnd) {
			Long periodEnd = StripeSubscriptionSupport.currentPeriodEnd(subscription);
			Instant accessUntil = periodEnd != null
					? Instant.ofEpochSecond(periodEnd)
					: account != null ? account.getCurrentPeriodEnd() : null;
			emailDispatchService.dispatchSubscriptionCancellationConfirmed(group, accessUntil);
			return;
		}
		if ("canceled".equals(status) && !wasCancelAtPeriodEnd && !nowCancelAtPeriodEnd) {
			emailDispatchService.dispatchSubscriptionCancellationConfirmed(group, null);
		}
	}

	public Optional<UUID> findStudioGroupIdForSubscription(String stripeSubscriptionId) {
		if (stripeSubscriptionId == null || stripeSubscriptionId.isBlank()) {
			return Optional.empty();
		}
		return billingAccountRepository.findByStripeSubscriptionId(stripeSubscriptionId)
				.map(BillingAccount::getStudioGroupId);
	}

	void dispatchPaymentThankYouOnce(
			String stripeReference,
			StudioGroup group,
			long amountPaidCents,
			String currencyCode,
			Instant periodEnd) {
		dispatchBillingEmailOnce(
				stripeReference,
				group,
				() -> emailDispatchService.dispatchPaymentThankYou(group, amountPaidCents, currencyCode, periodEnd));
	}

	void dispatchBillingEmailOnce(String stripeReference, StudioGroup group, Runnable send) {
		if (stripeReference == null || stripeReference.isBlank() || group == null || send == null) {
			return;
		}
		if (paymentThankYouSentRepository.existsByStripeReference(stripeReference)) {
			return;
		}
		send.run();
		paymentThankYouSentRepository.save(new BillingPaymentThankYouSent(stripeReference, group.getId()));
	}
}
