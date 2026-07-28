package it.luxury.admin.service;

import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.studio.domain.StudioGroup;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminProfileAccessNotificationService {

	private static final ZoneId ITALY = ZoneId.of("Europe/Rome");
	private static final DateTimeFormatter IT_TIMESTAMP =
			DateTimeFormatter.ofPattern("d MMMM uuuu 'alle' HH:mm", Locale.ITALIAN);
	private static final String SUBJECT = "Accesso al profilo da Saloni Luxury";

	private final ScheduledNotificationRepository scheduledNotificationRepository;

	public SuperAdminProfileAccessNotificationService(ScheduledNotificationRepository scheduledNotificationRepository) {
		this.scheduledNotificationRepository = scheduledNotificationRepository;
	}

	@Transactional
	public void notifySalonProfileAccess(StudioGroup group) {
		if (group == null) {
			return;
		}
		String salonName = group.getName() != null && !group.getName().isBlank() ? group.getName().trim() : "Il tuo salone";
		String body =
				"""
				Il team Saloni Luxury ha aperto il profilo del salone «%s» per assistenza o verifica.

				Data e ora: %s
				"""
						.formatted(salonName, formatNow())
						.trim();
		scheduledNotificationRepository.save(ScheduledNotification.adminPlatformInbox(group, SUBJECT, body, Instant.now()));
	}

	@Transactional
	public void notifyConsumerProfileAccess(ConsumerProfile profile) {
		if (profile == null || profile.getDeletedAt() != null) {
			return;
		}
		String display = profile.getDisplayName() != null && !profile.getDisplayName().isBlank()
				? profile.getDisplayName().trim()
				: "Il tuo account";
		String body =
				"""
				Il team Saloni Luxury ha aperto il profilo account «%s» per assistenza o verifica.

				Data e ora: %s
				"""
						.formatted(display, formatNow())
						.trim();
		scheduledNotificationRepository.save(
				ScheduledNotification.adminPlatformInboxForConsumer(profile, SUBJECT, body, Instant.now()));
	}

	private static String formatNow() {
		return IT_TIMESTAMP.format(Instant.now().atZone(ITALY));
	}
}
