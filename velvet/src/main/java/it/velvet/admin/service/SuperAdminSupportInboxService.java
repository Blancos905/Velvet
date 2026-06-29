package it.velvet.admin.service;

import it.velvet.bootstrap.SuperAdminConsumerBootstrap;
import it.velvet.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.QueuedNotificationStatus;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.studio.dto.MeSalonNotificationMessageDto;
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
		Instant seenAt = superAdmin.getAdminVelvetSupportInboxSalonSeenAt();
		return scheduledNotificationRepository.countSentSupportToVelvetFromSalonsAfterSeen(
				superAdmin.getId(),
				NotificationType.SUPPORT_REQUEST_TO_VELVET,
				QueuedNotificationStatus.SENT,
				seenAt);
	}

	/** Aggiorna il timestamp «visto» per l'inbox Messaggi dai saloni (azzera il badge). */
	@Transactional
	public void markSalonSupportInboxSeen() {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = requireSuperAdminConsumerProfile();
		superAdmin.setAdminVelvetSupportInboxSalonSeenAt(Instant.now());
		consumerProfileRepository.save(superAdmin);
	}

	@Transactional(readOnly = true)
	public List<MeSalonNotificationMessageDto> listMessages(boolean fromSalonsOnly) {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = requireSuperAdminConsumerProfile();
		List<ScheduledNotification> rows = fromSalonsOnly
				? scheduledNotificationRepository.findRecentSupportToVelvetAckFromSalonsOnly(
						superAdmin.getId(),
						NotificationType.SUPPORT_REQUEST_TO_VELVET,
						QueuedNotificationStatus.SENT,
						null,
						PageRequest.of(0, PAGE_SIZE))
				: scheduledNotificationRepository.findRecentSupportToVelvetAck(
						superAdmin.getId(),
						NotificationType.SUPPORT_REQUEST_TO_VELVET,
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
		int updated = scheduledNotificationRepository.markDeletedSupportToVelvetRecipient(
				messageId,
				superAdmin.getId(),
				NotificationType.SUPPORT_REQUEST_TO_VELVET,
				Instant.now());
		if (updated == 0) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Messaggio non trovato.");
		}
	}

	private ConsumerProfile requireSuperAdminConsumerProfile() {
		return consumerProfileRepository
				.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB)
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
				body.isEmpty() ? "Richiesta assistenza dall'area account." : body);
	}
}

