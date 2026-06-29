package it.velvet.billing.job;

import it.velvet.billing.service.CancelledSalonSubscriptionExpiryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class CancelledSalonSubscriptionExpiryJob {

	private static final Logger log = LoggerFactory.getLogger(CancelledSalonSubscriptionExpiryJob.class);

	private final CancelledSalonSubscriptionExpiryService expiryService;

	@Value("${velvet.billing.cancelled-subscription-deletion-days:30}")
	private int deletionGraceDays;

	public CancelledSalonSubscriptionExpiryJob(CancelledSalonSubscriptionExpiryService expiryService) {
		this.expiryService = expiryService;
	}

	@Scheduled(cron = "${velvet.billing.cancelled-subscription-expiry-cron:0 20 5 * * *}")
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
