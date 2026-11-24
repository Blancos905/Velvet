package it.luxury.billing.service;

import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.BillingPaymentThankYouSent;
import it.luxury.billing.domain.BillingPaymentThankYouSentRepository;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import it.luxury.studio.domain.StudioGroup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Promemoria rinnovo Premium e avviso cancellazione salone post-disdetta (email idempotenti).
 */
@Service
@ConditionalOnStripeBillingOperational
public class SalonBillingLifecycleEmailService {

	private static final Logger log = LoggerFactory.getLogger(SalonBillingLifecycleEmailService.class);

	private final BillingAccountRepository billingAccountRepository;
	private final BillingPaymentThankYouSentRepository billingEmailSentRepository;
	private final SalonBillingEmailDispatchService emailDispatchService;
	private final SalonSubscriptionLifecycleService subscriptionLifecycleService;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;

	@Value("${luxury.billing.renewal-reminder-days-before:5}")
	private int renewalReminderDaysBefore;

	@Value("${luxury.billing.salon-deletion-warning-days-before:7}")
	private int deletionWarningDaysBefore;

	public SalonBillingLifecycleEmailService(
			BillingAccountRepository billingAccountRepository,
			BillingPaymentThankYouSentRepository billingEmailSentRepository,
			SalonBillingEmailDispatchService emailDispatchService,
			SalonSubscriptionLifecycleService subscriptionLifecycleService,
			SalonPremiumEntitlementService salonPremiumEntitlementService) {
		this.billingAccountRepository = billingAccountRepository;
		this.billingEmailSentRepository = billingEmailSentRepository;
		this.emailDispatchService = emailDispatchService;
		this.subscriptionLifecycleService = subscriptionLifecycleService;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
	}

	@Transactional
	public int sendDueLifecycleEmails(int graceDaysAfterPeriodEnd) {
		int sent = 0;
		sent += sendRenewalReminders();
		sent += sendSalonDeletionWarnings(graceDaysAfterPeriodEnd);
		return sent;
	}

	private int sendRenewalReminders() {
		if (renewalReminderDaysBefore <= 0) {
			return 0;
		}
		Instant now = Instant.now();
		Instant from = now;
		Instant to = now.plus(renewalReminderDaysBefore, ChronoUnit.DAYS);
		List<BillingAccount> upcoming = billingAccountRepository.findUpcomingRenewals(from, to);
		int sent = 0;
		for (BillingAccount account : upcoming) {
			StudioGroup group = account.getStudioGroup();
			if (group == null || account.getCurrentPeriodEnd() == null) {
				continue;
			}
			String dedupRef = "renewal:"
					+ (account.getStripeSubscriptionId() != null ? account.getStripeSubscriptionId() : account.getId())
					+ ":"
					+ account.getCurrentPeriodEnd().getEpochSecond();
			if (billingEmailSentRepository.existsByStripeReference(dedupRef)) {
				continue;
			}
			emailDispatchService.dispatchRenewalReminder(group, account.getCurrentPeriodEnd(), null, "eur");
			billingEmailSentRepository.save(new BillingPaymentThankYouSent(dedupRef, group.getId()));
			sent++;
		}
		return sent;
	}

	private int sendSalonDeletionWarnings(int graceDaysAfterPeriodEnd) {
		if (graceDaysAfterPeriodEnd <= 0 || deletionWarningDaysBefore <= 0) {
			return 0;
		}
		Instant now = Instant.now();
		Instant warnWindowEnd = now.plus(deletionWarningDaysBefore, ChronoUnit.DAYS);
		List<BillingAccount> pending = billingAccountRepository.findAllPendingCancellationWithPeriodEnd();
		int sent = 0;
		for (BillingAccount account : pending) {
			if (!subscriptionLifecycleService.isPendingCancellation(account)) {
				continue;
			}
			if (salonPremiumEntitlementService.hasActivePremium(account.getStudioGroup())) {
				continue;
			}
			Instant deletionAt = subscriptionLifecycleService.accountDeletionScheduledAt(account, graceDaysAfterPeriodEnd);
			if (deletionAt == null || deletionAt.isBefore(now) || deletionAt.isAfter(warnWindowEnd)) {
				continue;
			}
			StudioGroup group = account.getStudioGroup();
			if (group == null) {
				continue;
			}
			String dedupRef = "pre-deletion:" + group.getId() + ":" + deletionAt.getEpochSecond();
			if (billingEmailSentRepository.existsByStripeReference(dedupRef)) {
				continue;
			}
			emailDispatchService.dispatchSalonDeletionWarning(group, deletionAt);
			billingEmailSentRepository.save(new BillingPaymentThankYouSent(dedupRef, group.getId()));
			sent++;
			log.info(
					"Avviso email cancellazione salone inviato studioGroupId={} deletionAt={}",
					group.getId(),
					deletionAt);
		}
		return sent;
	}
}
