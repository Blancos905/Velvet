package it.luxury.billing.job;

import it.luxury.billing.service.CancelledSalonSubscriptionExpiryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnStripeBillingOperational
public class CancelledSalonSubscriptionExpiryJob {

	private static final Logger log = LoggerFactory.getLogger(CancelledSalonSubscriptionExpiryJob.class);

	private final CancelledSalonSubscriptionExpiryService expiryService;

	@Value("${luxury.billing.cancelled-subscription-deletion-days:30}")
	private int deletionGraceDays;

	public CancelledSalonSubscriptionExpiryJob(CancelledSalonSubscriptionExpiryService expiryService) {
		this.expiryService = expiryService;
	}

	@Scheduled(cron = "${luxury.billing.cancelled-subscription-expiry-cron:0 20 5 * * *}")
	public void deleteExpiredCancelledSalonAccounts() {
		if (deletionGraceDays <= 0) {
			return;
		}
		int deleted = expiryService.deleteExpiredCancelledSalonAccounts(deletionGraceDays);
		if (deleted > 0) {
			log.info(
					"Cancellazione automatica profili salone post-disdetta: eliminati {} saloni (grazia {} giorni dopo scadenza abbonamento).",
					deleted,
					deletionGraceDays);
		}
	}
}
