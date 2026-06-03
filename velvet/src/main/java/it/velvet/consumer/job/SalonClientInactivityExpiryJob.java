package it.velvet.consumer.job;

import it.velvet.consumer.service.SalonClientMembershipService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SalonClientInactivityExpiryJob {

	private static final Logger log = LoggerFactory.getLogger(SalonClientInactivityExpiryJob.class);

	private final SalonClientMembershipService salonClientMembershipService;

	@Value("${velvet.salon-clients.inactivity-expiry-days:90}")
	private int inactivityExpiryDays;

	public SalonClientInactivityExpiryJob(SalonClientMembershipService salonClientMembershipService) {
		this.salonClientMembershipService = salonClientMembershipService;
	}

	@Scheduled(cron = "${velvet.salon-clients.inactivity-expiry-cron:0 15 5 * * *}")
	public void expireInactiveSalonClients() {
		if (inactivityExpiryDays <= 0) {
			return;
		}
		int removed = salonClientMembershipService.expireLinkedClientsWithoutRecentActivity(inactivityExpiryDays);
		if (removed > 0) {
			log.info("Scadenza automatica cliente salone: rimossi {} legami (soglia {} giorni).", removed, inactivityExpiryDays);
		}
	}
}
