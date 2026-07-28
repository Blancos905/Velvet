package it.luxury.consumer.service;

import it.luxury.admin.service.LuxurySuperAdminAuthService;
import it.luxury.bootstrap.SuperAdminConsumerBootstrap;
import it.luxury.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.QueuedNotificationStatus;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.dto.MeSalonNotificationInboxDto;
import it.luxury.studio.dto.MeSalonNotificationMessageDto;
import it.luxury.studio.dto.MeSalonNotificationTypeStatDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class MeNotificationInboxService {

	/**
	 * Promemoria e invito recensione: compaiono in inbox solo a invio effettivo (come la conferma),
	 * non in «In coda» mentre sono programmati.
	 */
	private static final Set<NotificationType> CONSUMER_SCHEDULED_ONLY_WHEN_SENT = EnumSet.of(
			NotificationType.REMINDER_24H,
			NotificationType.REMINDER_1H,
			NotificationType.REVIEW_INVITE);

	private static final int MESSAGE_PAGE_SIZE = 80;
	private static final DateTimeFormatter IT_DATE = DateTimeFormatter.ofPattern("d MMMM uuuu", Locale.ITALIAN);
	private static final DateTimeFormatter IT_TIME = DateTimeFormatter.ofPattern("HH:mm");

	private final ConsumerProfileService consumerProfileService;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	public MeNotificationInboxService(
			ConsumerProfileService consumerProfileService,
			ConsumerProfileRepository consumerProfileRepository,
			ScheduledNotificationRepository scheduledNotificationRepository,
			SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService) {
		this.consumerProfileService = consumerProfileService;
		this.consumerProfileRepository = consumerProfileRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
	}

	public MeSalonNotificationInboxDto resolve(LuxuryUserPrincipal principal) {
		if (isSalonStaffAccount(principal)) {
			return emptyConsumerStyleInbox();
		}
		ensureSuperAdminBootstrapProfileIfCaller(principal);
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		return buildForConsumer(profile);
	}

	public MeSalonNotificationInboxDto acknowledgeBucketInbox(LuxuryUserPrincipal principal, String bucketParam) {
		if (isSalonStaffAccount(principal)) {
			return emptyConsumerStyleInbox();
		}
		ensureSuperAdminBootstrapProfileIfCaller(principal);
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		NotificationBucket bucket = parseBucket(bucketParam);
		if (bucket == NotificationBucket.SUPPORT_REQUEST && !isLuxurySuperAdminInboxProfile(profile)) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Non autorizzato.");
		}
		setBucketAckAt(profile, bucket, Instant.now());
		consumerProfileRepository.save(profile);
		return buildForConsumer(profile);
	}

	public List<MeSalonNotificationMessageDto> listMessagesForBucket(LuxuryUserPrincipal principal, String bucketParam) {
		if (isSalonStaffAccount(principal)) {
			return List.of();
		}
		ensureSuperAdminBootstrapProfileIfCaller(principal);
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		NotificationBucket bucket = parseBucket(bucketParam);
		if (bucket == NotificationBucket.SUPPORT_REQUEST) {
			if (!isLuxurySuperAdminInboxProfile(profile)) {
				return List.of();
			}
			Instant ack = effectiveAck(profile, bucket);
			List<ScheduledNotification> rows = scheduledNotificationRepository.findRecentSupportToLuxuryAck(
					profile.getId(),
					NotificationType.SUPPORT_REQUEST_TO_LUXURY,
					QueuedNotificationStatus.SENT,
					ack,
					PageRequest.of(0, MESSAGE_PAGE_SIZE));
			return rows.stream().map(this::toMessageDto).toList();
		}
		if (bucket == NotificationBucket.SYSTEM) {
			Instant ack = effectiveAck(profile, bucket);
			List<ScheduledNotification> rows = scheduledNotificationRepository.findRecentPlatformByConsumerAck(
					profile.getId(),
					NotificationType.ADMIN_PLATFORM_MESSAGE,
					QueuedNotificationStatus.SENT,
					ack,
					PageRequest.of(0, MESSAGE_PAGE_SIZE));
			return rows.stream().map(this::toMessageDto).toList();
		}
		List<NotificationType> types = typesForBucket(bucket);
		if (types.isEmpty()) {
			return List.of();
		}
		return loadMessages(profile.getId(), types, null);
	}

	@Transactional
	public void deleteMessage(LuxuryUserPrincipal principal, UUID messageId) {
		if (isSalonStaffAccount(principal)) {
			return;
		}
		ensureSuperAdminBootstrapProfileIfCaller(principal);
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		if (messageId == null) {
			return;
		}
		if (isLuxurySuperAdminInboxProfile(profile)) {
			int support = scheduledNotificationRepository.markDeletedSupportToLuxuryRecipient(
					messageId,
					profile.getId(),
					NotificationType.SUPPORT_REQUEST_TO_LUXURY,
					Instant.now());
			if (support > 0) {
				return;
			}
		}
		int platform = scheduledNotificationRepository.markDeletedPlatformForConsumer(
				messageId,
				profile.getId(),
				NotificationType.ADMIN_PLATFORM_MESSAGE,
				Instant.now());
		if (platform > 0) {
			return;
		}
		int updated = scheduledNotificationRepository.markDeletedForConsumer(messageId, profile.getId(), Instant.now());
		if (updated == 0) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Notifica non trovata.");
		}
	}

	/** Account operatore salone: usa {@code /me/salon/notifications}, qui nessun contenuto (evita 403 su prefetch). */
	private static boolean isSalonStaffAccount(LuxuryUserPrincipal principal) {
		return principal != null
				&& principal.hasAppRole("STAFF")
				&& !principal.hasAppRole("OWNER");
	}

	private MeSalonNotificationInboxDto emptyConsumerStyleInbox() {
		List<MeSalonNotificationTypeStatDto> rows = new ArrayList<>();
		for (NotificationBucket bucket : NotificationBucket.values()) {
			if (bucket == NotificationBucket.SUPPORT_REQUEST) {
				continue;
			}
			rows.add(new MeSalonNotificationTypeStatDto(bucket.name(), italianLabel(bucket), 0, 0));
		}
		return new MeSalonNotificationInboxDto(rows);
	}

	private static boolean isLuxurySuperAdminInboxProfile(ConsumerProfile profile) {
		return profile != null
				&& SuperAdminConsumerBootstrap.SUPER_ADMIN_AUTH_SUB.equals(profile.getAuthSub());
	}

	private void ensureSuperAdminBootstrapProfileIfCaller(LuxuryUserPrincipal principal) {
		if (principal != null && LuxurySuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(principal.getSubject())) {
			superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		}
	}

	private MeSalonNotificationInboxDto buildForConsumer(ConsumerProfile profile) {
		List<MeSalonNotificationTypeStatDto> rows = new java.util.ArrayList<>();
		for (NotificationBucket bucket : NotificationBucket.values()) {
			if (bucket == NotificationBucket.SUPPORT_REQUEST && !isLuxurySuperAdminInboxProfile(profile)) {
				continue;
			}
			if (bucket == NotificationBucket.SUPPORT_REQUEST) {
				Instant cutoff = effectiveAck(profile, bucket);
				long sent = scheduledNotificationRepository.countSentSupportToLuxuryAfter(
						profile.getId(),
						NotificationType.SUPPORT_REQUEST_TO_LUXURY,
						QueuedNotificationStatus.SENT,
						cutoff);
				rows.add(new MeSalonNotificationTypeStatDto(bucket.name(), italianLabel(bucket), sent, 0));
				continue;
			}
			if (bucket == NotificationBucket.SYSTEM) {
				Instant cutoff = effectiveAck(profile, bucket);
				long sent = scheduledNotificationRepository.countSentPlatformByConsumerAfter(
						profile.getId(),
						NotificationType.ADMIN_PLATFORM_MESSAGE,
						QueuedNotificationStatus.SENT,
						cutoff);
				rows.add(new MeSalonNotificationTypeStatDto(bucket.name(), italianLabel(bucket), sent, 0));
				continue;
			}
			List<NotificationType> types = typesForBucket(bucket);
			if (types.isEmpty()) {
				rows.add(new MeSalonNotificationTypeStatDto(bucket.name(), italianLabel(bucket), 0, 0));
				continue;
			}
			Instant cutoff = effectiveAck(profile, bucket);
			long sent = scheduledNotificationRepository.countSentByConsumerAndTypesAfter(
					profile.getId(), types, QueuedNotificationStatus.SENT, cutoff);
			List<NotificationType> pendingTypes = typesForPendingInboxCount(bucket);
			long pending = pendingTypes.isEmpty()
					? 0
					: scheduledNotificationRepository.countPendingByConsumerAndTypesAfter(
							profile.getId(), pendingTypes, QueuedNotificationStatus.PENDING, cutoff);
			rows.add(new MeSalonNotificationTypeStatDto(bucket.name(), italianLabel(bucket), sent, pending));
		}
		return new MeSalonNotificationInboxDto(rows);
	}

	private List<MeSalonNotificationMessageDto> loadMessages(UUID consumerProfileId, List<NotificationType> types, Instant sentAckAt) {
		List<ScheduledNotification> rows = scheduledNotificationRepository.findRecentByConsumerAndTypesAck(
				consumerProfileId,
				types,
				QueuedNotificationStatus.PENDING,
				QueuedNotificationStatus.SENT,
				sentAckAt,
				PageRequest.of(0, MESSAGE_PAGE_SIZE));
		return rows.stream()
				.filter(MeNotificationInboxService::includeInConsumerMessageList)
				.map(this::toMessageDto)
				.toList();
	}

	private static boolean includeInConsumerMessageList(ScheduledNotification n) {
		if (n.getStatus() == QueuedNotificationStatus.PENDING
				&& CONSUMER_SCHEDULED_ONLY_WHEN_SENT.contains(n.getType())) {
			return false;
		}
		return true;
	}

	private MeSalonNotificationMessageDto toMessageDto(ScheduledNotification n) {
		if (n.getType() == NotificationType.SUPPORT_REQUEST_TO_LUXURY) {
			String title = n.getPlatformMessageSubject() != null && !n.getPlatformMessageSubject().isBlank()
					? n.getPlatformMessageSubject().trim()
					: "Assistenza";
			String body = n.getPlatformMessageBody() != null ? n.getPlatformMessageBody().trim() : "";
			String preview = body.length() > 280 ? body.substring(0, 277) + "…" : body;
			return new MeSalonNotificationMessageDto(
					n.getId(),
					n.getType().name(),
					n.getStatus().name(),
					n.getScheduledAt(),
					n.getSentAt(),
					null,
					title,
					preview.isEmpty() ? "Richiesta assistenza dall'area account." : preview,
					null,
					null,
					null,
					null,
					null);
		}
		if (n.getType() == NotificationType.ADMIN_PLATFORM_MESSAGE && n.getAppointment() == null) {
			String title = n.getPlatformMessageSubject() != null && !n.getPlatformMessageSubject().isBlank()
					? n.getPlatformMessageSubject().trim()
					: "Saloni Luxury";
			String body = n.getPlatformMessageBody() != null ? n.getPlatformMessageBody().trim() : "";
			String preview = body.length() > 280 ? body.substring(0, 277) + "…" : body;
			return new MeSalonNotificationMessageDto(
					n.getId(),
					n.getType().name(),
					n.getStatus().name(),
					n.getScheduledAt(),
					n.getSentAt(),
					null,
					title,
					preview.isEmpty() ? "Messaggio da Saloni Luxury." : preview,
					null,
					null,
					null,
					null,
					null);
		}
		var a = n.getAppointment();
		if (a == null) {
			return new MeSalonNotificationMessageDto(
					n.getId(),
					n.getType().name(),
					n.getStatus().name(),
					n.getScheduledAt(),
					n.getSentAt(),
					null,
					"Salone",
					"Notifica.",
					null,
					null,
					null,
					null,
					null);
		}
		ZoneId zone = safeZone(a.getLocation() != null ? a.getLocation().getTimeZone() : null);
		ZonedDateTime startLocal = a.getStart() != null ? ZonedDateTime.ofInstant(a.getStart(), zone) : null;
		String dateStr = startLocal != null ? IT_DATE.format(startLocal) : "data non disponibile";
		String timeStr = startLocal != null ? IT_TIME.format(startLocal) : "ora non disponibile";
		String location = a.getLocation() != null && a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		String operatorName = resolveOperatorDisplayName(a);
		String preview = buildPreviewLine(n.getType(), location, operatorName, dateStr, timeStr);
		return new MeSalonNotificationMessageDto(
				n.getId(),
				n.getType().name(),
				n.getStatus().name(),
				n.getScheduledAt(),
				n.getSentAt(),
				a.getId(),
				location,
				preview,
				null,
				null,
				a.getStart(),
				null,
				a.getStatus().name());
	}

	private static String buildPreviewLine(
			NotificationType type, String location, String operatorName, String dateStr, String timeStr) {
		return switch (type) {
			case BOOKING_CONFIRMATION ->
					operatorName != null
							? operatorName
									+ " ha accettato il tuo appuntamento presso "
									+ location
									+ " per il "
									+ dateStr
									+ " alle "
									+ timeStr
									+ "."
							: location + " ha confermato il tuo appuntamento per il " + dateStr + " alle " + timeStr + ".";
			case BOOKING_UPDATED -> location + " ha aggiornato la prenotazione al " + dateStr + " alle " + timeStr + ".";
			case BOOKING_CANCELLED_BY_CONSUMER ->
					"Hai disdetto l'appuntamento del " + dateStr + " alle " + timeStr + ".";
			case BOOKING_CANCELLED_BY_SALON ->
					location + " ha annullato il tuo appuntamento del " + dateStr + " alle " + timeStr + ".";
			case BOOKING_REQUEST_REJECTED ->
					operatorName != null
							? operatorName
									+ " non ha confermato la richiesta per il "
									+ dateStr
									+ " alle "
									+ timeStr
									+ "."
							: location
									+ " non ha confermato la richiesta per il "
									+ dateStr
									+ " alle "
									+ timeStr
									+ ".";
			case BOOKING_CREATED_FOR_SALON -> "Prenotazione registrata presso " + location + ".";
			case BOOKING_RESCHEDULED_BY_CONSUMER -> location + " — cambio orario prenotazione al " + dateStr + " alle " + timeStr + ".";
			case BOOKING_REJECTED_BY_OPERATOR ->
					location + " non ha confermato la richiesta per il " + dateStr + " alle " + timeStr + ".";
			case REMINDER_24H -> "Promemoria appuntamento presso " + location + " il " + dateStr + " alle " + timeStr + ".";
			case REMINDER_1H ->
					"Promemoria (circa 2 ore prima) presso " + location + " il " + dateStr + " alle " + timeStr + ".";
			case REVIEW_INVITE -> "Invito recensione per " + location + " (" + dateStr + ", " + timeStr + ").";
			case REVIEW_RECEIVED_FOR_SALON, ADMIN_PLATFORM_MESSAGE, SUPPORT_REQUEST_TO_LUXURY -> "Messaggio da Saloni Luxury.";
		};
	}

	private static String resolveOperatorDisplayName(it.luxury.appointment.domain.Appointment a) {
		if (a.getOperator() == null
				|| a.getOperator().getDisplayName() == null
				|| a.getOperator().getDisplayName().isBlank()) {
			return null;
		}
		return a.getOperator().getDisplayName().trim();
	}

	private static ZoneId safeZone(String tz) {
		if (tz == null || tz.isBlank()) return ZoneId.of("Europe/Rome");
		try {
			return ZoneId.of(tz.trim());
		}
		catch (RuntimeException ignored) {
			return ZoneId.of("Europe/Rome");
		}
	}

	private static NotificationBucket parseBucket(String raw) {
		if (raw == null || raw.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Parametro bucket obbligatorio.");
		}
		try {
			return NotificationBucket.valueOf(raw.trim());
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Tipo notifica non valido.");
		}
	}

	private static List<NotificationType> typesForBucket(NotificationBucket bucket) {
		return switch (bucket) {
			case BOOKING_CONFIRMATION -> List.of(
					NotificationType.BOOKING_CONFIRMATION,
					NotificationType.REMINDER_24H,
					NotificationType.REMINDER_1H,
					NotificationType.REVIEW_INVITE);
			case BOOKING_UPDATED -> List.of(NotificationType.BOOKING_UPDATED);
			case BOOKING_CANCELLED -> List.of(
					NotificationType.BOOKING_CANCELLED_BY_CONSUMER,
					NotificationType.BOOKING_CANCELLED_BY_SALON,
					NotificationType.BOOKING_REQUEST_REJECTED);
			case SYSTEM -> List.of(NotificationType.ADMIN_PLATFORM_MESSAGE);
			case SUPPORT_REQUEST -> List.of();
		};
	}

	/** Tipi che possono comparire come «In coda» nel centro notifiche cliente (esclude promemoria/recensione programmati). */
	private static List<NotificationType> typesForPendingInboxCount(NotificationBucket bucket) {
		return switch (bucket) {
			case BOOKING_CONFIRMATION -> List.of(NotificationType.BOOKING_CONFIRMATION);
			case BOOKING_UPDATED -> List.of(NotificationType.BOOKING_UPDATED);
			case BOOKING_CANCELLED -> List.of(
					NotificationType.BOOKING_CANCELLED_BY_CONSUMER,
					NotificationType.BOOKING_CANCELLED_BY_SALON,
					NotificationType.BOOKING_REQUEST_REJECTED);
			case SYSTEM, SUPPORT_REQUEST -> List.of();
		};
	}

	private static String italianLabel(NotificationBucket bucket) {
		return switch (bucket) {
			case BOOKING_CONFIRMATION -> "Email — conferme, promemoria e recensioni";
			case BOOKING_UPDATED -> "Email — prenotazione aggiornata";
			case BOOKING_CANCELLED -> "Email — annullamento prenotazione";
			case SYSTEM -> "Messaggi Luxury";
			case SUPPORT_REQUEST -> "Richieste assistenza (area account)";
		};
	}

	private static void setBucketAckAt(ConsumerProfile profile, NotificationBucket bucket, Instant ackAt) {
		switch (bucket) {
			case BOOKING_CONFIRMATION -> profile.setNotificationInboxAckBookingConfirmationAt(ackAt);
			case BOOKING_UPDATED -> profile.setNotificationInboxAckBookingUpdatedAt(ackAt);
			case BOOKING_CANCELLED -> profile.setNotificationInboxAckBookingCancelledAt(ackAt);
			case SYSTEM -> profile.setNotificationInboxAckSystemAt(ackAt);
			case SUPPORT_REQUEST -> profile.setNotificationInboxAckSupportRequestAt(ackAt);
			default -> throw new IllegalArgumentException("Bucket notifica non gestito: " + bucket);
		}
	}

	private static Instant bucketAckAt(ConsumerProfile profile, NotificationBucket bucket) {
		return switch (bucket) {
			case BOOKING_CONFIRMATION -> profile.getNotificationInboxAckBookingConfirmationAt();
			case BOOKING_UPDATED -> profile.getNotificationInboxAckBookingUpdatedAt();
			case BOOKING_CANCELLED -> profile.getNotificationInboxAckBookingCancelledAt();
			case SYSTEM -> profile.getNotificationInboxAckSystemAt();
			case SUPPORT_REQUEST -> profile.getNotificationInboxAckSupportRequestAt();
		};
	}

	private static Instant effectiveAck(ConsumerProfile profile, NotificationBucket bucket) {
		return maxInstant(profile.getNotificationInboxSentAckAt(), bucketAckAt(profile, bucket));
	}

	private static Instant maxInstant(Instant a, Instant b) {
		if (a == null) return b;
		if (b == null) return a;
		return a.isAfter(b) ? a : b;
	}

	private enum NotificationBucket {
		BOOKING_CONFIRMATION,
		BOOKING_UPDATED,
		BOOKING_CANCELLED,
		SYSTEM,
		SUPPORT_REQUEST,
	}
}
