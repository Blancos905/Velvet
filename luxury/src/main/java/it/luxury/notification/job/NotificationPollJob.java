package it.luxury.notification.job;

import it.luxury.notification.service.ScheduledNotificationProcessor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationPollJob {

	private final ScheduledNotificationProcessor scheduledNotificationProcessor;

	public NotificationPollJob(ScheduledNotificationProcessor scheduledNotificationProcessor) {
		this.scheduledNotificationProcessor = scheduledNotificationProcessor;
	}

	@Scheduled(
			fixedDelayString = "${luxury.notifications.poll-interval-ms:15000}",
			initialDelayString = "${luxury.notifications.poll-initial-delay-ms:30000}")
	public void poll() {
		scheduledNotificationProcessor.processDue();
	}
}
