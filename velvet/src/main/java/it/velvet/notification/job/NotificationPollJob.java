package it.velvet.notification.job;

import it.velvet.notification.service.ScheduledNotificationProcessor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationPollJob {

	private final ScheduledNotificationProcessor scheduledNotificationProcessor;

	public NotificationPollJob(ScheduledNotificationProcessor scheduledNotificationProcessor) {
		this.scheduledNotificationProcessor = scheduledNotificationProcessor;
	}

	@Scheduled(fixedDelayString = "${velvet.notifications.poll-interval-ms:15000}")
	public void poll() {
		scheduledNotificationProcessor.processDue();
	}
}
