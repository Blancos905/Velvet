package it.luxury.admin.service;

import it.luxury.bootstrap.SuperAdminConsumerBootstrap;
import it.luxury.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.QueuedNotificationStatus;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.studio.dto.MeSalonNotificationMessageDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SuperAdminSupportInboxService {

	private static final int PAGE_SIZE = 100;

	private final ConsumerProfileRepository consumerProfileRepository;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	public SuperAdminSupportInboxService(
			ConsumerProfileRepository consumerProfileRepository,
			ScheduledNotificationRepository scheduledNotificationRepository,
			SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
	}

	@Transactional(readOnly = true)
	public long countUnreadSalonSupportRequests() {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = requireSuperAdminConsumerProfile();
		Instant seenAt = superAdmin.getAdminLuxurySupportInboxSalonSeenAt();
		return scheduledNotificationRepository.countSentSupportToLuxuryFromSalonsAfterSeen(
				superAdmin.getId(),
				NotificationType.SUPPORT_REQUEST_TO_LUXURY,
				QueuedNotificationStatus.SENT,
				seenAt);
	}

	/** Aggiorna il timestamp «visto» per l'inbox Messaggi dai saloni (azzera il badge). */
	@Transactional
	public void markSalonSupportInboxSeen() {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = requireSuperAdminConsumerProfile();
		superAdmin.setAdminLuxurySupportInboxSalonSeenAt(Instant.now());
		consumerProfileRepository.save(superAdmin);
	}

	@Transactional(readOnly = true)
	public List<MeSalonNotificationMessageDto> listMessages(boolean fromSalonsOnly) {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = requireSuperAdminConsumerProfile();
		List<ScheduledNotification> rows = fromSalonsOnly
				? scheduledNotificationRepository.findRecentSupportToLuxuryAckFromSalonsOnly(
						superAdmin.getId(),
						NotificationType.SUPPORT_REQUEST_TO_LUXURY,
						QueuedNotificationStatus.SENT,
						null,
						PageRequest.of(0, PAGE_SIZE))
				: scheduledNotificationRepository.findRecentSupportToLuxuryAck(
						superAdmin.getId(),
						NotificationType.SUPPORT_REQUEST_TO_LUXURY,
						QueuedNotificationStatus.SENT,
						null,
						PageRequest.of(0, PAGE_SIZE));
		return rows.stream().map(SuperAdminSupportInboxService::toMessageDto).toList();
	}

	@Transactional
	public void deleteMessage(UUID messageId) {
		if (messageId == null) {
			return;
		}
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = requireSuperAdminConsumerProfile();
		int updated = scheduledNotificationRepository.markDeletedSupportToLuxuryRecipient(
				messageId,
				superAdmin.getId(),
				NotificationType.SUPPORT_REQUEST_TO_LUXURY,
				Instant.now());
		if (updated == 0) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Messaggio non trovato.");
		}
	}

	private ConsumerProfile requireSuperAdminConsumerProfile() {
		return consumerProfileRepository
				.findByAuthSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_AUTH_SUB)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.SERVICE_UNAVAILABLE,
						"SUPPORT_INBOX_UNAVAILABLE",
						"Profilo assistenza non configurato: avvia il bootstrap super admin sul database."));
	}

	private static MeSalonNotificationMessageDto toMessageDto(ScheduledNotification n) {
		String title = n.getPlatformMessageSubject() != null && !n.getPlatformMessageSubject().isBlank()
				? n.getPlatformMessageSubject().trim()
				: "Assistenza";
		String body = n.getPlatformMessageBody() != null ? n.getPlatformMessageBody().trim() : "";
		return new MeSalonNotificationMessageDto(
				n.getId(),
				n.getType().name(),
				n.getStatus().name(),
				n.getScheduledAt(),
				n.getSentAt(),
				null,
				title,
				body.isEmpty() ? "Richiesta assistenza dall'area account." : body,
				null,
				null,
				null,
				null,
				null);
	}
}

