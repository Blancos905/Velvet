package it.luxury.billing.job;

import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import it.luxury.billing.service.SalonBillingLifecycleEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnStripeBillingOperational
public class SalonBillingLifecycleEmailJob {

	private static final Logger log = LoggerFactory.getLogger(SalonBillingLifecycleEmailJob.class);

	private final SalonBillingLifecycleEmailService lifecycleEmailService;

	@Value("${luxury.billing.cancelled-subscription-deletion-days:30}")
	private int deletionGraceDays;

	public SalonBillingLifecycleEmailJob(SalonBillingLifecycleEmailService lifecycleEmailService) {
		this.lifecycleEmailService = lifecycleEmailService;
	}

	@Scheduled(cron = "${luxury.billing.lifecycle-email-cron:0 40 5 * * *}")
	public void sendLifecycleEmails() {
		int sent = lifecycleEmailService.sendDueLifecycleEmails(deletionGraceDays);
		if (sent > 0) {
			log.info("Email lifecycle billing inviate: {}", sent);
		}
	}
}
